import { prisma } from '@/lib/db';
import type { GenerateFeesResult } from '@/types/fee';

export function buildDueDate(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 10));
}

export async function generateMonthlyFees(
  month: number,
  year: number
): Promise<GenerateFeesResult> {
  const [activeMembers, feeConfigs] = await Promise.all([
    prisma.member.findMany({ where: { status: 'ACTIVE' } }),
    prisma.feeConfig.findMany({ where: { isActive: true } }),
  ]);

  const configByCategory = new Map(feeConfigs.map((config) => [config.category, config]));
  const dueDate = buildDueDate(year, month);

  const existingFees = await prisma.fee.findMany({
    where: { month, year },
    select: { memberId: true },
  });
  const existingMemberIds = new Set(existingFees.map((fee) => fee.memberId));

  const membersToCreate = activeMembers.filter(
    (member) => configByCategory.has(member.category) && !existingMemberIds.has(member.id)
  );

  if (membersToCreate.length > 0) {
    await prisma.fee.createMany({
      data: membersToCreate.map((member) => {
        const config = configByCategory.get(member.category)!;
        return {
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
    skipped: activeMembers.length - membersToCreate.length,
    month,
    year,
  };
}
