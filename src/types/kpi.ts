export interface InstitutionKpis {
  activeMembers: number;
  upToDateMembers: number;
  sociosAlDiaPercent: number;
  collectionsCurrentMonth: number;
  collectionsPreviousMonth: number;
  collectionsChangePercent: number | null;
  overdueFeesCount: number;
  overdueFeesAmount: number;
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