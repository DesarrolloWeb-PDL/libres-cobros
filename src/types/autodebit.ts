export type AutoDebitStatus = 'PENDING_AUTH' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'FAILED';

export type AutoDebitGateway = 'mercadopago' | 'stripe';

/** Serialized AutoDebit as returned by /api/member/autodebit. */
export interface AutoDebitInfo {
  id: string;
  gateway: string;
  status: string;
  amount: number;
  nextBillingAt: string | null;
}

export interface MemberAutoDebitResponse {
  autoDebit: AutoDebitInfo | null;
}

/** POST /api/member/autodebit response: MP redirects, Stripe manages via portal. */
export interface CreateMemberAutoDebitResponse {
  autoDebit: AutoDebitInfo;
  authorizationUrl?: string;
  managementUrl?: string;
}

export interface AutoDebitListItem {
  id: string;
  member: {
    dni: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  gateway: string;
  status: string;
  amount: number;
  nextBillingAt: string | null;
  createdAt: string;
}

export interface AutoDebitListResponse {
  data: AutoDebitListItem[];
}
