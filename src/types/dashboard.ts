export interface FeeStatusAggregate {
  count: number;
  amount: number;
}

export interface DashboardFeesSummary {
  generated: FeeStatusAggregate;
  paid: FeeStatusAggregate;
  pending: FeeStatusAggregate;
  overdue: FeeStatusAggregate;
}

export interface DashboardIncomeSummary {
  collected: number;
  pending: number;
  overdue: number;
}

export interface DashboardHistoryItem {
  month: number;
  year: number;
  label: string;
  amount: number;
}

export interface DashboardRecentPayment {
  id: string;
  memberName: string;
  amount: number;
  method: string;
  confirmedAt: string | null;
  createdAt: string;
}

export interface DashboardData {
  activeMembers: number;
  newMembersThisMonth: number;
  fees: DashboardFeesSummary;
  income: DashboardIncomeSummary;
  commissions: number;
  history: DashboardHistoryItem[];
  recentPayments: DashboardRecentPayment[];
}
