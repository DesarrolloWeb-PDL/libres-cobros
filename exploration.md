# Exploration: libres-cobros Architecture Design

## Project Context
**libres-cobros** — Club fee management system for 200+ members
**Location**: C:\Users\Usuario\Documents\PROYECTOS\libres-cobros
**Stack**: Next.js 14+ (App Router) + Prisma + PostgreSQL + TypeScript + Tailwind CSS

---

## Reusable Patterns from Tiempo Bakery

### ✅ Directly Reusable
| Pattern | Source | Adaptation Needed |
|---------|--------|-------------------|
| Checkout flow validation | `src/app/api/checkout/route.ts` | Simplified: single item (fee) vs multiple products |
| Stripe webhook handling | `src/app/api/webhooks/stripe/route.ts` | Direct reuse, change Order → Payment model |
| MercadoPago webhook handling | `src/app/api/webhooks/mercadopago/route.ts` | Direct reuse, same adaptation |
| Payment provider abstraction | `src/lib/payments.ts` | Extend with MercadoPago alias/CBU config |
| Zod validation schemas | `src/types/checkout.ts` | New schemas for member/payment validation |
| API response utilities | `src/lib/api-response.ts` | Direct reuse |
| Prisma client singleton | `src/lib/prisma-client.ts` | Direct reuse |

### 🔄 Adaptation Required
| Pattern | Change for libres-cobros |
|---------|--------------------------|
| Order model → Payment model | Single payment per fee period, not cart items |
| Stock reservation → Fee reservation | No stock logic; fee is pre-defined per category |
| User model → Member model | Add DNI, category, status fields |
| Order items → Fee periods | Monthly fee tracking, not line items |

### ❌ Not Reusable
| Pattern | Reason |
|---------|--------|
| Stock management | Fees are fixed, no inventory |
| Delivery logic | Digital service, no shipping |
| Time gating | Not applicable |

---

## Database Schema Design

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ============ MEMBER MANAGEMENT ============

model Member {
  id            String   @id @default(cuid())
  dni           String   @unique
  firstName     String
  lastName      String
  email         String?  @unique
  phone         String?
  category      String   @default("ACTIVE") // ACTIVE, FAMILY, MINOR
  status        String   @default("ACTIVE") // ACTIVE, INACTIVE
  joinDate      DateTime @default(now())
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  payments      Payment[]
  whatsappLogs  WhatsAppLog[]
  
  @@index([dni])
  @@index([status])
  @@index([category])
}

// ============ FEE CONFIGURATION ============

model FeeConfig {
  id            String   @id @default(cuid())
  category      String   @unique // ACTIVE, FAMILY, MINOR
  amount        Float
  description   String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  fees          Fee[]
  
  @@index([category])
}

model Fee {
  id            String   @id @default(cuid())
  memberId      String
  feeConfigId   String
  month         Int      // 1-12
  year          Int
  amount        Float    // Snapshot of fee at time of generation
  dueDate       DateTime
  status        String   @default("PENDING") // PENDING, PAID, OVERDUE, PARTIAL
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  member        Member     @relation(fields: [memberId], references: [id])
  feeConfig     FeeConfig  @relation(fields: [feeConfigId], references: [id])
  payments      Payment[]
  commissions   Commission[]
  
  @@unique([memberId, month, year])
  @@index([status])
  @@index([dueDate])
  @@index([memberId])
}

// ============ PAYMENT PROCESSING ============

model Payment {
  id                    String   @id @default(cuid())
  feeId                 String
  memberId              String
  amount                Float
  method                String   // stripe, mercadopago, bank_transfer
  status                String   @default("PENDING") // PENDING, PAID, FAILED, REFUNDED
  stripePaymentId       String?
  mercadopagoPaymentId  String?
  bankTransferRef       String?  // Admin confirmation reference
  confirmedAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  fee                   Fee      @relation(fields: [feeId], references: [id])
  member                Member   @relation(fields: [memberId], references: [id])
  commissions           Commission[]
  
  @@index([feeId])
  @@index([memberId])
  @@index([status])
  @@index([stripePaymentId])
  @@index([mercadopagoPaymentId])
}

// ============ COMMISSION SYSTEM ============

model Commission {
  id            String   @id @default(cuid())
  paymentId     String
  feeId         String
  amount        Float    // Calculated: payment.amount * commissionRate
  rate          Float    // Snapshot of rate at time of calculation
  periodId      String?  // Links to monthly closing
  createdAt     DateTime @default(now())
  
  payment       Payment  @relation(fields: [paymentId], references: [id])
  fee           Fee      @relation(fields: [feeId], references: [id])
  
  @@index([periodId])
  @@index([createdAt])
}

model MonthlyClosing {
  id            String   @id @default(cuid())
  month         Int
  year          Int
  status        String   @default("OPEN") // OPEN, CLOSED
  totalPayments Float    @default(0)
  totalCommissions Float @default(0)
  commissionRate Float  // Snapshot of rate used
  closedAt      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  commissions   Commission[]
  
  @@unique([month, year])
  @@index([status])
}

// ============ WHATSAPP NOTIFICATIONS ============

model WhatsAppLog {
  id            String   @id @default(cuid())
  memberId      String
  type          String   // REMINDER, CONFIRMATION, MANUAL
  message       String
  status        String   // SENT, FAILED, PENDING
  externalId    String?  // WhatsApp API message ID
  sentAt        DateTime @default(now())
  
  member        Member   @relation(fields: [memberId], references: [id])
  
  @@index([memberId])
  @@index([sentAt])
  @@index([type])
}

// ============ CONFIGURATION ============

model SiteConfig {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

---

## API Route Structure

### Payment Flow Routes
```
src/app/api/
├── checkout/
│   └── route.ts              # POST: Create payment, redirect to provider
├── payments/
│   ├── route.ts              # GET: List payments (admin)
│   └── [id]/
│       ├── route.ts          # GET: Payment details
│       └── confirm/
│           └── route.ts      # POST: Admin confirm bank transfer
├── webhooks/
│   ├── stripe/
│   │   └── route.ts          # POST: Stripe webhook handler
│   └── mercadopago/
│       └── route.ts          # POST: MercadoPago webhook handler
└── admin/
    ├── members/
    │   ├── route.ts          # GET/POST: List/Create members
    │   └── [id]/
    │       └── route.ts      # GET/PUT/DELETE: Member CRUD
    ├── fees/
    │   ├── route.ts          # GET: List fees, POST: Generate monthly fees
    │   └── generate/
    │       └── route.ts      # POST: Generate fees for month
    ├── dashboard/
    │   └── route.ts          # GET: Dashboard stats
    ├── commissions/
    │   └── route.ts          # GET: Commission reports
    └── closing/
        ├── route.ts          # GET: Monthly closings
        └── [id]/
            └── close/
                └── route.ts  # POST: Close month
```

### Member Portal Routes
```
src/app/
├── pagos/
│   ├── page.tsx              # Member payment portal
│   └── [feeId]/
│       └── page.tsx          # Pay specific fee
├── confirmacion/
│   └── page.tsx              # Payment confirmation
└── admin/
    ├── page.tsx              # Dashboard
    ├── socios/
    │   └── page.tsx          # Member management
    ├── cuotas/
    │   └── page.tsx          # Fee management
    ├── pagos/
    │   └── page.tsx          # Payment management
    └── reportes/
        └── page.tsx          # Commission reports
```

---

## Payment Flow Design

### 1. Member Payment Portal
```
Member receives WhatsApp reminder → Clicks link → /pagos?member={dni}
→ Selects pending fee → Chooses payment method → Checkout
```

### 2. Checkout Flow (Adapted from Tiempo Bakery)
```typescript
// Simplified: single fee payment, not cart
const paymentSchema = z.object({
  feeId: z.string(),
  paymentProvider: z.enum(['STRIPE', 'MERCADO_PAGO', 'BANK_TRANSFER']),
});
```

### 3. Webhook Handling
**Stripe**: Same pattern as Tiempo Bakery
- `checkout.session.completed` → Mark fee as PAID
- `payment_intent.payment_failed` → Mark as FAILED

**MercadoPago**: Same pattern as Tiempo Bakery
- Verify signature → Get payment → Update status
- Use `external_reference` for fee ID

**Bank Transfer**: Manual confirmation
- Admin receives notification
- Confirms receipt → Marks as PAID
- Generates commission record

### 4. Status Transitions
```
FEE: PENDING → PAID (webhook confirms)
    PENDING → OVERDUE (cron job after due date)
    PAID → REFUNDED (admin action)

PAYMENT: PENDING → PAID (webhook confirms)
         PENDING → FAILED (webhook confirms)
         PAID → REFUNDED (admin action)
```

---

## WhatsApp Integration Design

### API Selection
**Recommendation**: WhatsApp Business API via Meta Cloud API

**Why**:
1. Direct API (no third-party fees beyond Meta)
2. Template messages for reminders
3. Bulk messaging support
4. Official documentation and support

**Alternatives considered**:
- Twilio: Higher cost, less control
- MessageBird: Good but extra dependency
- Baileys: Unofficial, risk of ban

### Message Templates
```typescript
const REMINDER_TEMPLATE = {
  name: 'payment_reminder',
  components: [
    {
      type: 'BODY',
      parameters: [
        { type: 'text', text: memberName },
        { type: 'text', text: amount },
        { type: 'text', text: dueDate },
        { type: 'text', text: alias },
        { type: 'text', text: cbu },
      ]
    }
  ]
};
```

### Bulk Send Architecture
```
Admin clicks "Send Reminders" → Selects month/status filter
→ System generates message queue → Process in batches (50/second limit)
→ Log each send in WhatsAppLog → Show progress to admin
```

**Rate limiting**: WhatsApp allows 1000 messages/second for business accounts, but we'll use 50/second to be safe.

---

## Commission Calculation Design

### When/How
1. **Per Payment**: Calculate commission immediately when payment is confirmed
2. **Store snapshot**: Save rate at time of calculation (rate may change)
3. **Monthly closing**: Aggregate commissions for the period

### Commission Logic
```typescript
async function calculateCommission(payment: Payment) {
  const rate = await getCommissionRate(); // From SiteConfig
  const commissionAmount = payment.amount * (rate / 100);
  
  await prisma.commission.create({
    data: {
      paymentId: payment.id,
      feeId: payment.feeId,
      amount: commissionAmount,
      rate: rate,
    }
  });
}
```

### Monthly Closing Flow
```
1. Admin selects month to close
2. System calculates:
   - Total payments received
   - Total commissions earned
3. Creates MonthlyClosing record
4. Links all commissions from that month
5. Marks closing as CLOSED
6. Generates report (PDF/Excel)
```

### Report Structure
```typescript
interface MonthlyReport {
  period: { month: number; year: number };
  totalMembers: number;
  totalFees: number;
  paymentsReceived: {
    count: number;
    total: number;
    byMethod: {
      stripe: { count: number; total: number };
      mercadopago: { count: number; total: number };
      bankTransfer: { count: number; total: number };
    };
  };
  commissions: {
    rate: number;
    total: number;
  };
  pendingPayments: {
    count: number;
    total: number;
  };
}
```

---

## Component Hierarchy

### Admin Dashboard
```
src/components/admin/
├── layout/
│   ├── AdminSidebar.tsx
│   └── AdminHeader.tsx
├── dashboard/
│   ├── StatsCards.tsx
│   ├── PaymentChart.tsx
│   └── RecentPayments.tsx
├── members/
│   ├── MemberList.tsx
│   ├── MemberForm.tsx
│   └── MemberDetails.tsx
├── fees/
│   ├── FeeList.tsx
│   ├── FeeGenerateForm.tsx
│   └── FeeStatusBadge.tsx
├── payments/
│   ├── PaymentList.tsx
│   ├── PaymentDetails.tsx
│   └── BankTransferConfirm.tsx
└── reports/
    ├── CommissionReport.tsx
    └── MonthlyClosing.tsx
```

### Member Portal
```
src/components/member/
├── PaymentPortal.tsx
├── FeeCard.tsx
├── PaymentMethodSelector.tsx
└── PaymentConfirmation.tsx
```

### Shared Components
```
src/components/shared/
├── StatusBadge.tsx
├── DataTable.tsx
├── ExportButton.tsx
└── WhatsAppSendButton.tsx
```

---

## Key Architecture Decisions

### 1. Fee Generation vs Payment Recording
**Decision**: Pre-generate fees monthly, then track payments against them.

**Why**: 
- Easier to show "who owes what" at any time
- Clear separation between obligation (fee) and action (payment)
- Supports partial payments later if needed

**Alternative**: Record payments only → Harder to show debts

### 2. Commission Calculation Timing
**Decision**: Calculate on payment confirmation, not on closing.

**Why**:
- Real-time commission tracking
- No risk of losing commission data if closing is delayed
- Can show commissions before month closes

**Alternative**: Calculate on closing → Simpler but less visibility

### 3. WhatsApp Integration
**Decision**: Direct Meta Cloud API, not third-party.

**Why**:
- Lower cost (no middleman margin)
- Full control over templates
- Official support

**Tradeoff**: More setup complexity, but worth it for 200+ members

### 4. Member Payment Portal
**Decision**: Public portal with DNI authentication (not full auth).

**Why**:
- Members don't need to remember passwords
- DNI is unique and already in system
- Simpler UX for one-time payments

**Tradeoff**: Less secure than full auth, but acceptable for fee payments

---

## Risks and Open Questions

### High Priority
1. **WhatsApp Business API approval**: Meta requires business verification. How long will this take?
2. **Commission rate changes**: What happens to pending payments when rate changes?
3. **Partial payments**: Should we support paying a fee in multiple installments?

### Medium Priority
4. **Payment reconciliation**: How to handle discrepancies between webhook and actual bank transfer?
5. **Member status transitions**: What happens to fees when member becomes inactive?
6. **Export formats**: PDF vs Excel vs both? Which is priority?

### Low Priority
7. **Multi-currency**: Future need for USD payments?
8. **Recurring payments**: Auto-charge each month via Stripe/MercadoPago?

---

## Ready for Proposal

**Yes** — The architecture is well-defined with clear patterns from Tiempo Bakery.

**Next steps for orchestrator**:
1. Present this exploration to user
2. Get confirmation on open questions
3. Proceed to `sdd-propose` with specific change proposals

**Recommended first changes**:
1. Project initialization (Next.js + Prisma setup)
2. Database schema implementation
3. Member CRUD (admin)
4. Payment portal (member-facing)
5. Stripe/MercadoPago integration
6. WhatsApp notifications
7. Commission system
