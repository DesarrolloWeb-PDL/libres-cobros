import { z } from 'zod';
import { PaymentMethodSchema } from './payment';

export const CheckoutRequestSchema = z.object({
  feeId: z.string().cuid(),
  method: PaymentMethodSchema,
  memberDni: z.string().min(1, 'Member DNI is required'),
  clubSlug: z.string().min(1, 'Club slug is required'),
});

export type CheckoutRequestInput = z.infer<typeof CheckoutRequestSchema>;

export interface CheckoutResponse {
  paymentId: string;
  method: string;
  checkoutUrl?: string;
  bankTransfer?: {
    alias: string;
    cbu: string;
    cuit: string;
    bankName: string;
    accountHolder: string;
    reference: string;
  };
}
