import { DateTime } from 'luxon';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type { PrismaClient, Prisma, AdminRole, SaasPlan } from '@prisma/client';

export interface SaasBillingResult {
  enabled: boolean;
  billingDay: number;
  isBillingDay: boolean;
  period: { month: number; year: number } | null;
  created: number;
  skippedZero: number;
  existing: number;
  overdue: number;
  remindersSent: number;
  reminderErrors: number;
  whatsappRemindersSent: number;
  whatsappReminderErrors: number;
}

export interface TierAlertResult {
  alert: boolean;
  planId?: string;
  planName?: string;
  maxMembers: number;
  memberCount: number;
  message: string;
  emailsSent: number;
  error?: string;
}

type SaasBillingClient = PrismaClient | Prisma.TransactionClient;

type SaasInvoiceWithDetails = Prisma.SaasInvoiceGetPayload<{
  select: {
    id: true;
    institutionId: true;
    amount: true;
    dueDate: true;
    lastReminderAt: true;
    remindersSent: true;
    status: true;
    institution: {
      select: {
        id: true;
        name: true;
        phone: true;
        adminUsers: { select: { email: true; name: true } };
      };
    };
    saasPlan: true;
  };
}>;

async function getPlatformConfig(
  client: SaasBillingClient,
  key: string,
  defaultValue = ''
): Promise<string> {
  const config = await client.siteConfig.findFirst({
    where: { clubId: null, key },
  });
  return config?.value ?? defaultValue;
}

function buildReminderHtml(invoice: SaasInvoiceWithDetails, daysOverdue: number): string {
  const amount = invoice.amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
  const dueDate = invoice.dueDate.toLocaleDateString('es-AR');

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; background-color: #111827; border-radius: 12px; overflow: hidden; color: #f9fafb;">
      <div style="padding: 32px;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">SaaS invoice reminder</h1>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Institution: ${escapeHtml(invoice.institution.name)}</p>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Plan: ${escapeHtml(invoice.saasPlan.name)}</p>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Amount: ${amount} — Due: ${dueDate}</p>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 24px;">${daysOverdue} day(s) overdue.</p>
      </div>
      <div style="padding: 0 32px 24px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">This is an automated reminder from the platform.</p>
      </div>
    </div>
  `;
}

function buildWhatsAppReminderBody(invoice: SaasInvoiceWithDetails, daysOverdue: number): string {
  const amount = invoice.amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
  const dueDate = invoice.dueDate.toLocaleDateString('es-AR');

  return [
    'Hola, recordatorio de factura SaaS vencida.',
    `Institución: ${invoice.institution.name}`,
    `Plan: ${invoice.saasPlan.name}`,
    `Monto: ${amount} — Vencimiento: ${dueDate}`,
    `${daysOverdue} día(s) de atraso.`,
  ].join('\n');
}

function buildTierAlertHtml(
  institutionName: string,
  planName: string,
  maxMembers: number,
  memberCount: number
): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; background-color: #111827; border-radius: 12px; overflow: hidden; color: #f9fafb;">
      <div style="padding: 32px;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Tier limit alert</h1>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Institution: ${escapeHtml(institutionName)}</p>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 4px;">Current plan: ${escapeHtml(planName)} (limit ${maxMembers} members)</p>
        <p style="color: #d1d5db; font-size: 15px; margin: 0 0 24px;">Registered members: ${memberCount}</p>
      </div>
      <div style="padding: 0 32px 24px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">This is an automated platform alert. Registration was not blocked.</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendDedupedReminders(
  client: SaasBillingClient,
  runDate: Date
): Promise<{ sent: number; errors: number; whatsappSent: number; whatsappErrors: number }> {
  const daysRaw = (await getPlatformConfig(client, 'saas_reminder_days', '1,7,15')).trim();
  if (!daysRaw) {
    return { sent: 0, errors: 0, whatsappSent: 0, whatsappErrors: 0 };
  }

  const reminderDays = Array.from(
    new Set(
      daysRaw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0)
    )
  ).sort((a, b) => a - b);

  if (reminderDays.length === 0) {
    return { sent: 0, errors: 0, whatsappSent: 0, whatsappErrors: 0 };
  }

  const runStart = DateTime.fromJSDate(runDate, { zone: 'utc' }).startOf('day');
  const overdueInvoices = (await client.saasInvoice.findMany({
    where: { status: 'OVERDUE' },
    select: {
      id: true,
      institutionId: true,
      amount: true,
      dueDate: true,
      lastReminderAt: true,
      remindersSent: true,
      status: true,
      institution: {
        select: {
          id: true,
          name: true,
          phone: true,
          adminUsers: { select: { email: true, name: true } },
        },
      },
      saasPlan: true,
    },
  })) as SaasInvoiceWithDetails[];

  const [apiKey, fromEmail, whatsappPhoneId, whatsappToken] = await Promise.all([
    getPlatformConfig(client, 'resend_api_key', ''),
    getPlatformConfig(client, 'resend_from_email', ''),
    getPlatformConfig(client, 'saas_whatsapp_phone_number_id', ''),
    getPlatformConfig(client, 'saas_whatsapp_access_token', ''),
  ]);

  const emailConfigured = !!(apiKey && fromEmail);
  const whatsappConfigured = !!(whatsappPhoneId && whatsappToken);

  if (!emailConfigured && !whatsappConfigured) {
    return { sent: 0, errors: 0, whatsappSent: 0, whatsappErrors: 0 };
  }

  const superAdmins = await client.adminUser.findMany({
    where: { role: 'SUPER_ADMIN' as AdminRole },
    select: { email: true, name: true },
  });

  let sent = 0;
  let errors = 0;
  let whatsappSent = 0;
  let whatsappErrors = 0;

  for (const invoice of overdueInvoices) {
    const dueStart = DateTime.fromJSDate(invoice.dueDate, { zone: 'utc' }).startOf('day');
    const daysOverdue = Math.floor(runStart.diff(dueStart, 'days').days);

    if (!reminderDays.includes(daysOverdue)) {
      continue;
    }

    const lastReminder = invoice.lastReminderAt
      ? DateTime.fromJSDate(invoice.lastReminderAt, { zone: 'utc' }).startOf('day')
      : null;
    if (lastReminder && lastReminder >= runStart) {
      continue;
    }

    let anyReminderSent = false;

    if (emailConfigured) {
      const recipients = new Set<string>();
      for (const user of invoice.institution.adminUsers) {
        if (user.email) recipients.add(user.email);
      }
      for (const user of superAdmins) {
        if (user.email) recipients.add(user.email);
      }

      if (recipients.size > 0) {
        const html = buildReminderHtml(invoice, daysOverdue);
        for (const to of recipients) {
          try {
            await sendEmail(apiKey, fromEmail, to, 'SaaS invoice reminder', html);
            sent++;
            anyReminderSent = true;
          } catch {
            errors++;
          }
        }
      }
    }

    if (whatsappConfigured && invoice.institution.phone) {
      try {
        const body = buildWhatsAppReminderBody(invoice, daysOverdue);
        const { externalId } = await sendWhatsAppMessage(
          whatsappPhoneId,
          whatsappToken,
          invoice.institution.phone,
          body
        );
        await client.smsLog.create({
          data: {
            clubId: invoice.institutionId,
            memberId: null,
            type: 'saas_invoice_reminder_whatsapp',
            message: body,
            status: 'SENT',
            externalId,
            error: null,
          },
        });
        whatsappSent++;
        anyReminderSent = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await client.smsLog
          .create({
            data: {
              clubId: invoice.institutionId,
              memberId: null,
              type: 'saas_invoice_reminder_whatsapp',
              message: '',
              status: 'FAILED',
              externalId: null,
              error: message,
            },
          })
          .catch(() => {
            // Deliberately swallowed: logging failure must never break the cron.
          });
        whatsappErrors++;
      }
    }

    if (anyReminderSent) {
      await client.saasInvoice.update({
        where: { id: invoice.id },
        data: { lastReminderAt: runDate, remindersSent: { increment: 1 } },
      });
    }
  }

  return { sent, errors, whatsappSent, whatsappErrors };
}

async function sendTierAlertEmails(
  client: SaasBillingClient,
  institution: { id: string; name: string; adminUsers: { email: string | null; name: string | null }[] },
  plan: { name: string; maxMembers: number },
  memberCount: number,
  triggerMemberId?: string
): Promise<number> {
  const [apiKey, fromEmail] = await Promise.all([
    getPlatformConfig(client, 'resend_api_key', ''),
    getPlatformConfig(client, 'resend_from_email', ''),
  ]);

  if (!apiKey || !fromEmail) {
    return 0;
  }

  const superAdmins = await client.adminUser.findMany({
    where: { role: 'SUPER_ADMIN' as AdminRole },
    select: { email: true, name: true },
  });

  const recipients = new Set<string>();
  for (const user of institution.adminUsers) {
    if (user.email) recipients.add(user.email);
  }
  for (const user of superAdmins) {
    if (user.email) recipients.add(user.email);
  }
  if (recipients.size === 0) {
    return 0;
  }

  const html = buildTierAlertHtml(institution.name, plan.name, plan.maxMembers, memberCount);
  let sent = 0;
  for (const to of recipients) {
    try {
      await sendEmail(apiKey, fromEmail, to, 'Tier limit alert', html);
      sent++;
    } catch {
      // Deliberately swallowed: alerting must never throw.
    }
  }

  if (triggerMemberId) {
    try {
      await client.smsLog.create({
        data: {
          clubId: institution.id,
          memberId: triggerMemberId,
          type: 'saas_tier_alert',
          message: `Member count ${memberCount} exceeds plan ${plan.name} limit ${plan.maxMembers}`,
          status: sent > 0 ? 'SENT' : 'FAILED',
        },
      });
    } catch {
      // Deliberately swallowed: logging is best-effort.
    }
  }

  return sent;
}

/**
 * Daily SaaS billing run.
 *
 * - Always (when enabled) sweeps PENDING invoices past their due date to OVERDUE
 *   and sends deduplicated reminder emails according to the configured cadence.
 * - Only creates new invoices on the configured billing day (Buenos Aires time).
 */
export async function runSaasBilling(
  client: SaasBillingClient,
  runDate: Date = new Date()
): Promise<SaasBillingResult> {
  const result: SaasBillingResult = {
    enabled: false,
    billingDay: 1,
    isBillingDay: false,
    period: null,
    created: 0,
    skippedZero: 0,
    existing: 0,
    overdue: 0,
    remindersSent: 0,
    reminderErrors: 0,
    whatsappRemindersSent: 0,
    whatsappReminderErrors: 0,
  };

  const enabledRaw = await getPlatformConfig(client, 'saas_billing_enabled', 'false');
  if (enabledRaw !== 'true') {
    return result;
  }
  result.enabled = true;

  const billingDayRaw = await getPlatformConfig(client, 'saas_billing_day', '1');
  const billingDay = Math.min(28, Math.max(1, parseInt(billingDayRaw, 10) || 1));
  result.billingDay = billingDay;

  const art = DateTime.fromJSDate(runDate, {
    zone: 'America/Argentina/Buenos_Aires',
  }).startOf('day');
  const isBillingDay = art.day === billingDay;
  const period = { month: art.month, year: art.year };
  result.period = period;

  // Overdue sweep and reminders run every day the cron is invoked.
  const threshold = DateTime.fromJSDate(runDate, { zone: 'utc' }).startOf('day').toJSDate();
  const overdueUpdate = await client.saasInvoice.updateMany({
    where: { status: 'PENDING', dueDate: { lt: threshold } },
    data: { status: 'OVERDUE' },
  });
  result.overdue = overdueUpdate.count;

  const reminderResult = await sendDedupedReminders(client, runDate);
  result.remindersSent = reminderResult.sent;
  result.reminderErrors = reminderResult.errors;
  result.whatsappRemindersSent = reminderResult.whatsappSent;
  result.whatsappReminderErrors = reminderResult.whatsappErrors;

  if (!isBillingDay) {
    return result;
  }
  result.isBillingDay = true;

  const dueDate = DateTime.fromObject(
    { year: period.year, month: period.month, day: billingDay },
    { zone: 'utc' }
  )
    .plus({ days: 10 })
    .toJSDate();

  const institutions = await client.club.findMany({
    where: { status: 'ACTIVE' },
    include: {
      saasSubscriptions: {
        where: { status: 'ACTIVE' },
        include: { saasPlan: true, pendingSaasPlan: true },
        take: 1,
      },
      adminUsers: { select: { email: true, name: true } },
    },
  });

  for (const institution of institutions) {
    const subscription = institution.saasSubscriptions[0];
    if (!subscription) {
      continue;
    }

    const effectivePlan = subscription.pendingSaasPlan ?? subscription.saasPlan;
    if (!effectivePlan) {
      continue;
    }

    if (subscription.pendingSaasPlanId) {
      await client.saasSubscription.update({
        where: { id: subscription.id },
        data: { saasPlanId: effectivePlan.id, pendingSaasPlanId: null },
      });
    }

    if (effectivePlan.priceArs === 0) {
      result.skippedZero++;
      continue;
    }

    const existing = await client.saasInvoice.findFirst({
      where: {
        institutionId: institution.id,
        month: period.month,
        year: period.year,
      },
    });
    if (existing) {
      result.existing++;
      continue;
    }

    await client.saasInvoice.create({
      data: {
        institutionId: institution.id,
        saasPlanId: effectivePlan.id,
        month: period.month,
        year: period.year,
        amount: effectivePlan.priceArs,
        dueDate,
        status: 'PENDING',
      },
    });
    result.created++;
  }

  return result;
}

/**
 * Evaluates whether an institution's member count exceeds its current plan limit.
 * If there is no active subscription, the free tier (minMembers = 0) is assumed.
 * Never throws.
 */
export async function checkTierAlert(
  institutionId: string,
  memberCount: number,
  triggerMemberId?: string,
  client: SaasBillingClient = prisma
): Promise<TierAlertResult> {
  try {
    const institution = await client.club.findUnique({
      where: { id: institutionId },
      include: {
        saasSubscriptions: {
          where: { status: 'ACTIVE' },
          include: { saasPlan: true },
          take: 1,
        },
        adminUsers: { select: { email: true, name: true } },
      },
    });

    if (!institution) {
      return {
        alert: false,
        maxMembers: 0,
        memberCount,
        message: 'Institution not found',
        emailsSent: 0,
      };
    }

    let plan: SaasPlan | null = institution.saasSubscriptions[0]?.saasPlan ?? null;
    if (!plan) {
      plan = await client.saasPlan.findFirst({
        where: { minMembers: 0, isActive: true },
        orderBy: { maxMembers: 'asc' },
      });
    }

    if (!plan) {
      return {
        alert: false,
        maxMembers: 0,
        memberCount,
        message: 'No active plan found',
        emailsSent: 0,
      };
    }

    const over = memberCount > plan.maxMembers;
    let emailsSent = 0;
    if (over) {
      emailsSent = await sendTierAlertEmails(
        client,
        { id: institution.id, name: institution.name, adminUsers: institution.adminUsers },
        plan,
        memberCount,
        triggerMemberId
      );
    }

    return {
      alert: over,
      planId: plan.id,
      planName: plan.name,
      maxMembers: plan.maxMembers,
      memberCount,
      message: over
        ? `Member count ${memberCount} exceeds plan ${plan.name} limit ${plan.maxMembers}`
        : 'Member count within plan limits',
      emailsSent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      alert: false,
      maxMembers: 0,
      memberCount,
      message,
      emailsSent: 0,
      error: message,
    };
  }
}
