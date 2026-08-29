import { prisma } from '@/lib/db';
import type { GenerateFeesResult } from '@/types/fee';

export function buildDueDate(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 10));
}

/**
 * Generates monthly fees for a single club: one Fee per ACTIVE or INACTIVE member of that
 * club, using that club's own FeeConfigs ([clubId, category] composite, never
 * another club's configs) and carrying the clubId on every created row.
 *
 * Idempotent per club: members who already have a Fee for [month, year] are
 * skipped and createMany uses skipDuplicates. The `@@unique([memberId, month,
 * year])` constraint enforces it — a member belongs to exactly one club, so it
 * is club-safe for the [clubId, memberId, month, year] space.
 */
export async function generateMonthlyFees(
  clubId: string,
  month: number,
  year: number
): Promise<GenerateFeesResult> {
  const [members, feeConfigs, existingFees] = await Promise.all([
    prisma.member.findMany({
      where: { clubId, status: { in: ['ACTIVE', 'INACTIVE'] } },
      select: { id: true, category: true },
    }),
    prisma.feeConfig.findMany({
      where: { clubId, isActive: true },
      select: { id: true, category: true, amount: true },
    }),
    prisma.fee.findMany({
      where: { clubId, month, year },
      select: { memberId: true },
    }),
  ]);

  const configByCategory = new Map(feeConfigs.map((config) => [config.category, config]));
  const existingMemberIds = new Set(existingFees.map((fee) => fee.memberId));

  const membersToCreate = members.filter(
    (member) => configByCategory.has(member.category) && !existingMemberIds.has(member.id)
  );

  if (membersToCreate.length > 0) {
    const dueDate = buildDueDate(year, month);
    await prisma.fee.createMany({
      data: membersToCreate.map((member) => {
        const config = configByCategory.get(member.category)!;
        return {
          clubId,
          memberId: member.id,
          feeConfigId: config.id,
          month,
          year,
          amount: config.amount,
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
 * Marks a single club's PENDING fees that fell due before `today` as OVERDUE.
 * Scoped by clubId so one club's overdue pass never touches another club's
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
