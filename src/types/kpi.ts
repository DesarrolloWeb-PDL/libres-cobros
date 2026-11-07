export interface OverdueAgingBucket {
  key: string;
  bucket: string;
  label: string;
  count: number;
  amount: number;
}

export interface InstitutionKpis {
  activeMembers: number;
  upToDateMembers: number;
  sociosAlDiaPercent: number;
  collectionsCurrentMonth: number;
  collectionsPreviousMonth: number;
  collectionsChangePercent: number | null;
  overdueFeesCount: number;
  overdueFeesAmount: number;
  overdueAging: OverdueAgingBucket[];
  overdueAgingBuckets: Record<string, { count: number; amount: number }>;
  agingBuckets: OverdueAgingBucket[];
  overdueByAging: Record<string, { count: number; amount: number }>;
  overdue0to30Count: number;
  overdue0to30Amount: number;
  overdue31to60Count: number;
  overdue31to60Amount: number;
  overdue61to90Count: number;
  overdue61to90Amount: number;
  overdue90PlusCount: number;
  overdue90PlusAmount: number;
  paymentsThisMonthCount: number;
  paymentsThisMonthAmount: number;
  generatedAt: string;
}

export interface PlatformKpis {
  institutionsCount: number;
  totalCollectionsThisMonth: number;
  totalPaymentsThisMonthCount: number;
  generatedAt: string;
}

export interface KpiResponse {
  institution: InstitutionKpis | null;
  platform: PlatformKpis | null;
}