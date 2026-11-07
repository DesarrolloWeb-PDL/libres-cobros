'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  X,
  Rocket,
  Building2,
  Users,
  CreditCard,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  href?: string;
}

export interface OnboardingStatus {
  institutionId?: string;
  steps?: OnboardingStep[];
  completedCount?: number;
  totalCount?: number;
  allComplete?: boolean;
  counts?: {
    members?: number;
    fees?: number;
    siteConfigs?: number;
    campaigns?: number;
  };
  // Convenience flags/counts accepted from callers.
  clubConfigured?: boolean;
  hasClubData?: boolean;
  hasMembers?: boolean;
  hasPaymentMethods?: boolean;
  hasFees?: boolean;
  hasMessages?: boolean;
  membersCount?: number;
  feesCount?: number;
  paymentMethodsCount?: number;
  campaignsCount?: number;
}

export interface OnboardingChecklistProps {
  initialData?: OnboardingStatus;
  status?: OnboardingStatus;
  data?: OnboardingStatus;
  institutionId?: string;
  // Direct convenience props.
  clubConfigured?: boolean;
  hasClubData?: boolean;
  hasMembers?: boolean;
  hasPaymentMethods?: boolean;
  hasFees?: boolean;
  hasMessages?: boolean;
  membersCount?: number;
  feesCount?: number;
  paymentMethodsCount?: number;
  campaignsCount?: number;
  steps?: OnboardingStep[];
}

const STEP_META: Record<string, { icon: typeof Building2; href: string }> = {
  'club-data': { icon: Building2, href: '/admin/configuracion' },
  members: { icon: Users, href: '/admin/socios/nuevo' },
  'payment-methods': { icon: CreditCard, href: '/admin/configuracion' },
  'first-fees': { icon: Receipt, href: '/admin/cuotas/generar' },
  'first-message': { icon: MessageSquare, href: '/admin/mensajes' },
};

const DEFAULT_STEPS: { id: string; label: string }[] = [
  { id: 'club-data', label: 'Configurar datos del club' },
  { id: 'members', label: 'Agregar socios' },
  { id: 'payment-methods', label: 'Configurar medios de pago' },
  { id: 'first-fees', label: 'Generar primeras cuotas' },
  { id: 'first-message', label: 'Enviar primer mensaje' },
];

function buildStepsFromStatus(status: OnboardingStatus): OnboardingStep[] {
  if (status.steps && status.steps.length > 0) {
    return status.steps.map((step) => ({
      id: step.id,
      label: step.label,
      done: Boolean(step.done),
      href: step.href ?? STEP_META[step.id]?.href,
    }));
  }

  const flags: Record<string, boolean> = {
    'club-data': Boolean(
      status.clubConfigured ??
        status.hasClubData ??
        ((status.membersCount ?? status.counts?.members ?? 0) > 0 ||
          (status.feesCount ?? status.counts?.fees ?? 0) > 0)
    ),
    members: Boolean(status.hasMembers ?? (status.membersCount ?? status.counts?.members ?? 0) > 0),
    'payment-methods': Boolean(
      status.hasPaymentMethods ?? (status.paymentMethodsCount ?? status.counts?.siteConfigs ?? 0) > 0
    ),
    'first-fees': Boolean(status.hasFees ?? (status.feesCount ?? status.counts?.fees ?? 0) > 0),
    'first-message': Boolean(status.hasMessages ?? (status.campaignsCount ?? status.counts?.campaigns ?? 0) > 0),
  };

  return DEFAULT_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    done: flags[step.id] ?? false,
    href: STEP_META[step.id]?.href,
  }));
}

function normalizeStatus(raw: OnboardingStatus | null): OnboardingStatus | null {
  if (!raw) return null;
  const steps = buildStepsFromStatus(raw);
  const completedCount = raw.completedCount ?? steps.filter((s) => s.done).length;
  const totalCount = raw.totalCount ?? steps.length;
  const allComplete = raw.allComplete ?? completedCount === totalCount;
  return {
    ...raw,
    steps,
    completedCount,
    totalCount,
    allComplete,
  };
}

function statusFromProps(props: OnboardingChecklistProps): OnboardingStatus | null {
  const hasAny =
    props.initialData ||
    props.status ||
    props.data ||
    props.steps ||
    props.institutionId !== undefined ||
    props.clubConfigured !== undefined ||
    props.hasClubData !== undefined ||
    props.hasMembers !== undefined ||
    props.hasPaymentMethods !== undefined ||
    props.hasFees !== undefined ||
    props.hasMessages !== undefined ||
    props.membersCount !== undefined ||
    props.feesCount !== undefined ||
    props.paymentMethodsCount !== undefined ||
    props.campaignsCount !== undefined;

  if (!hasAny) return null;

  const base: OnboardingStatus = {
    institutionId: props.institutionId ?? props.initialData?.institutionId ?? props.status?.institutionId ?? props.data?.institutionId,
    ...(props.initialData ?? props.status ?? props.data ?? {}),
  };

  if (props.steps) base.steps = props.steps;
  if (props.clubConfigured !== undefined) base.clubConfigured = props.clubConfigured;
  if (props.hasClubData !== undefined) base.hasClubData = props.hasClubData;
  if (props.hasMembers !== undefined) base.hasMembers = props.hasMembers;
  if (props.hasPaymentMethods !== undefined) base.hasPaymentMethods = props.hasPaymentMethods;
  if (props.hasFees !== undefined) base.hasFees = props.hasFees;
  if (props.hasMessages !== undefined) base.hasMessages = props.hasMessages;
  if (props.membersCount !== undefined) base.membersCount = props.membersCount;
  if (props.feesCount !== undefined) base.feesCount = props.feesCount;
  if (props.paymentMethodsCount !== undefined) base.paymentMethodsCount = props.paymentMethodsCount;
  if (props.campaignsCount !== undefined) base.campaignsCount = props.campaignsCount;

  return base;
}

function storageKey(institutionId?: string): string {
  return `onboarding-dismissed:${institutionId ?? 'default'}`;
}

function isDismissed(institutionId?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(storageKey(institutionId)) === '1';
  } catch {
    return false;
  }
}

export function OnboardingChecklist(props: OnboardingChecklistProps) {
  const provided = statusFromProps(props);
  const [status, setStatus] = useState<OnboardingStatus | null>(() =>
    provided ? normalizeStatus(provided) : null
  );
  const [loading, setLoading] = useState(!provided);
  const [visible, setVisible] = useState(() => !isDismissed(provided?.institutionId));

  const institutionId = status?.institutionId ?? provided?.institutionId ?? props.institutionId;

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/onboarding', { cache: 'no-store' });
      if (!response.ok) throw new Error('Error al cargar onboarding');
      const json = await response.json();
      const data = (json?.data ?? json) as OnboardingStatus;
      const normalized = normalizeStatus(data);
      setStatus(normalized);
      setVisible(!isDismissed(normalized?.institutionId));
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (provided) return;
    const handle = window.setTimeout(() => {
      fetchStatus();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [provided, fetchStatus]);


  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-5 pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const normalized = status ? normalizeStatus(status) : null;
  if (!normalized || normalized.allComplete) return null;
  if (!visible) return null;

  const steps = normalized.steps ?? [];
  const completedCount = normalized.completedCount ?? steps.filter((s) => s.done).length;
  const totalCount = normalized.totalCount ?? steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  function handleDismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(storageKey(institutionId), '1');
    } catch {
      // ignore
    }
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          <CardTitle className="text-base font-semibold">Onboarding de la institución</CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleDismiss}
          aria-label="Cerrar onboarding"
        >
          <X />
        </Button>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        <p className="text-sm text-muted-foreground">
          Completá los pasos para dejar la institución lista para operar.
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>
              {completedCount} de {totalCount}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <ul className="space-y-2">
          {steps.map((step) => {
            const meta = STEP_META[step.id];
            const Icon = meta?.icon ?? Circle;
            const href = step.href ?? meta?.href;
            const content = (
              <div
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                  step.done
                    ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                    : 'border-border bg-card hover:bg-muted/40'
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span
                  className={cn(
                    'flex-1 text-sm',
                    step.done && 'text-muted-foreground line-through'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
            return (
              <li key={step.id}>
                {href && !step.done ? (
                  <Link href={href} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
        {completedCount === totalCount && (
          <EmptyState
            icon={<CheckCircle2 className="size-10 text-emerald-600" />}
            title="Onboarding completo"
            description="La institución está lista para operar."
          />
        )}
      </CardContent>
    </Card>
  );
}

export default OnboardingChecklist;