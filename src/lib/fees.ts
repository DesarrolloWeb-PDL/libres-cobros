import { prisma } from '@/lib/db';
import type { GenerateFeesResult } from '@/types/fee';

export function buildDueDate(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 10));
}

/**
 * Generates monthly fees for a single institution: one Fee per ACTIVE or INACTIVE member of that
 * institution that has a plan assigned, using that institution's active Plans. The generated fee
 * snapshots the plan amount and carries both the clubId and the member's current planId.
 *
 * Idempotent per institution: members who already have a Fee for [month, year] are
 * skipped and createMany uses skipDuplicates. The `@@unique([memberId, month, year])`
 * constraint enforces it — a member belongs to exactly one institution, so it is
 * institution-safe for the [clubId, memberId, month, year] space.
 */
export async function generateMonthlyFees(
  clubId: string,
  month: number,
  year: number
): Promise<GenerateFeesResult> {
  const [members, plans, existingFees] = await Promise.all([
    prisma.member.findMany({
      where: { clubId, status: { in: ['ACTIVE', 'INACTIVE'] }, planId: { not: null } },
      select: { id: true, planId: true },
    }),
    prisma.plan.findMany({
      where: { clubId, isActive: true },
      select: { id: true, amount: true },
    }),
    prisma.fee.findMany({
      where: { clubId, month, year },
      select: { memberId: true },
    }),
  ]);

  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const existingMemberIds = new Set(existingFees.map((fee) => fee.memberId));

  const membersToCreate = members.filter(
    (member) => !!member.planId && planById.has(member.planId) && !existingMemberIds.has(member.id)
  );

  if (membersToCreate.length > 0) {
    const dueDate = buildDueDate(year, month);
    await prisma.fee.createMany({
      data: membersToCreate.map((member) => {
        const plan = planById.get(member.planId!)!;
        return {
          clubId,
          memberId: member.id,
          planId: member.planId!,
          month,
          year,
          amount: plan.amount,
          dueDate,
          status: 'PENDING',
        };
      }),
      skipDuplicates: true,
    });
  }

  return {
    created: membersToCreate.length,
    skipped: members.length - membersToCreate.length,
    month,
    year,
  };
}

/**
 * Marks a single institution's PENDING fees that fell due before `today` as OVERDUE.
 * Scoped by clubId so one institution's overdue pass never touches another institution's
 * fees. Returns the number of fees updated.
 */
export async function markOverdueFees(clubId: string, today: Date): Promise<number> {
  const result = await prisma.fee.updateMany({
    where: {
      clubId,
      status: 'PENDING',
      dueDate: { lt: today },
    },
    data: { status: 'OVERDUE' },
  });

  return result.count;
}
