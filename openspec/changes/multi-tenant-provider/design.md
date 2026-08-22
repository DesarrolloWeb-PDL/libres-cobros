# Design: Multi-Tenant Provider Platform

## Technical Approach

Shared single DB + `clubId` (Option A). One Prisma client, one Neon DB. Every tenant query flows through a central scoping helper (`requireClub`/`getEffectiveClub` in `src/lib/access.ts`) that injects `clubId` for ADMIN or allows all for SUPER_ADMIN. `Club` is the billing source of truth: `PERCENTAGE` computes a Commission at payment confirm; `FIXED` generates one `ProviderInvoice` at monthly closing. Portal moves under `/pagos/[club-slug]`. Production migration is multi-step: create Club + nullable clubId → backfill to "Club Libres" → NOT NULL + composite uniques. Maps to proposal Approach and all 10 delta specs.

## Architecture Decisions

### Decision: clubId denormalized on Fee/Payment/Commission/WhatsAppLog

**Choice**: Each tenant model carries its own `clubId` column (not only via relations).
**Alternatives**: Derive clubId through `member.clubId` relation joins.
**Rationale**: Direct `where: { clubId }` filters on every query, avoids `member: { is: { clubId } }` relation filters in `updateMany` (cron overdue), and keeps report/count queries single-table. Denormalization risk is bounded: clubId is set at creation from the member/club and never moves (club reassignment is out of scope).

### Decision: Composite uniques replace global uniques

**Choice**: `[clubId,dni]`, `[clubId,email]` (nullable email, multiple NULLs allowed), `[clubId,category]`, `[clubId,month,year]`, `[clubId,key]`, `[clubId,slug]` (Club), `[clubId,month,year]` (ProviderInvoice). Global uniques on `Member.dni/email`, `FeeConfig.category`, `MonthlyClosing[month,year]`, `SiteConfig.key` are dropped. `Fee[memberId,month,year]` and `AdminUser.email` stay globally unique (member belongs to one club; spec requires duplicate admin email → 409).
**Rationale**: Specs require same DNI/email/category across clubs and per-club closing; fee uniqueness per member is already club-safe.

### Decision: Migration is 3 steps (nullable → backfill → NOT NULL)

**Choice**: (1) create `Club`, `ProviderInvoice`, enums, add **nullable** `clubId` + FK on 8 tables (no unique changes); (2) `scripts/backfill-multitenant.ts` assigns default club; (3) set `clubId` NOT NULL, drop global uniques, add composite uniques, switch `AdminUser.role` to enum.
**Alternatives**: Single atomic migration with SQL backfill inline.
**Rationale**: `prisma migrate deploy` runs on Vercel build; a single step with data backfill inside a migration is fragile. Three steps are independently deployable and reviewable; global uniques must survive until backfill completes or duplicate-DNI writes would break.
**Default club slug**: `club-libres` (derived from "Club Libres").

### Decision: Canonical SiteConfig keys

**Choice**: `bank_holder` is canonical (bank account holder); `whatsapp_access_token` is canonical (WhatsApp token); `commission_rate` is REMOVED (superseded by `Club.commissionValue`). Backfill merges legacy variants (`bank_account_holder` → `bank_holder`, `whatsapp_token` → `whatsapp_access_token`).
**Alternatives**: Keep `bank_account_holder` and rename UI.
**Rationale**: The admin site-config UI writes `bank_holder` and checkout/seed read `bank_account_holder` — the editing surface wins. `whatsapp_access_token` is what `src/lib/whatsapp.ts` actually consumes. One canonical key per concept eliminates the dual-key drift found in `checkout/route.ts` vs `site-config/route.ts` vs `seed.ts`.

### Decision: Payment credentials move from env vars to per-club SiteConfig

**Choice**: `stripe_secret_key`, `stripe_webhook_secret`, `mercadopago_access_token`, `mercadopago_client_secret` stored per club in SiteConfig `[clubId,key]`. `stripe.ts`/`mercadopago.ts` accept explicit secret params instead of reading `process.env`.
**Alternatives**: Keep env vars + per-club map.
**Rationale**: Spec requires per-club credentials in SiteConfig; Vercel env vars are provider-level and can't hold N clubs' keys. Env vars become dev-only fallback/legacy.

### Decision: Webhook club resolution — query param primary, iteration fallback

**Choice**: Stripe and MercadoPago webhook URLs carry `?club_slug=<slug>` (set at checkout for MP; configured in each club's Stripe dashboard for Stripe). If absent, Stripe iterates ACTIVE clubs' `stripe_webhook_secret` calling `constructEvent` until one succeeds, then cross-checks `metadata.clubSlug`.
**Alternatives**: Metadata-only resolution.
**Rationale**: `constructEvent` needs the secret BEFORE parsing payload metadata — chicken-and-egg. Query param gives direct lookup; iteration is bounded (N clubs) and only a fallback. Unknown/absent slug → 401, no state change.

### Decision: Legacy `/pagos` redirects to club directory

**Choice**: `/pagos` page becomes a redirect to `/pagos/clubes` (new server page listing ACTIVE clubs). `/pagos/confirmacion` redirects to `/pagos`.
**Alternatives**: Keep `/pagos` as the directory itself.
**Rationale**: Spec: "SHALL redirect to a club directory page listing ACTIVE clubs" — an explicit directory route is unambiguous and leaves `/pagos` as a stable legacy landing.

### Decision: All existing admins promoted to SUPER_ADMIN

**Choice**: Backfill sets `role=SUPER_ADMIN, clubId=null` for every existing AdminUser.
**Alternatives**: Only `admin@libres.com`.
**Rationale**: Pre-migration all admins are global by definition; demoting any of them would silently remove access. Provider can demote later via club admin management.

## Data Flow

```
Member portal:  /pagos/club-a  ──DNI──▶  /api/member/fees?dni=X&clubSlug=club-a
                     │                        │ (member where clubId+a, dni)
                     ▼                        ▼
               /api/checkout {feeId, memberDni, clubSlug}  ──▶ club SiteConfig creds
                     │
      Stripe session (metadata: clubSlug, feeId, paymentId) ──▶ success/cancel URL /pagos/club-a/confirmacion
                     │
   Stripe webhook ?club_slug=club-a ──verify club secret──▶ confirmPayment ──▶ Commission (PERCENTAGE) | skip (FIXED)

Admin scope:   session {role, clubId} ──▶ requireClub() ──▶ where += {clubId} (ADMIN) | {} (SUPER_ADMIN)
Cron fees:     iterate Club ACTIVE ──▶ generateMonthlyFees(clubId, month, year)
Cron close:    closing CLOSED + club FIXED ──▶ upsert ProviderInvoice[clubId, month, year]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Club, ProviderInvoice, enums, clubId on 8 tables, composite uniques |
| `prisma/seed.ts` | Modify | Seed default Club + club-scoped fee configs + canonical config keys |
| `scripts/backfill-multitenant.ts` | Create | Step-2 backfill: default club, clubId assign, key merge, admin promotion, parity check |
| `scripts/revert-multitenant.ts` | Create | Rollback: nullable clubId, restore globals, demote admins |
| `prisma/migrations/*` | Create | 2 generated migrations (nullable; constraints) |
| `src/lib/access.ts` | Create | `requireClub`, `getEffectiveClub`, `clubWhere`, role/clubId from session, SUPER_ADMIN bypass |
| `src/lib/auth.ts` | Modify | authorize/jwt/session carry `clubId`; role typed |
| `src/middleware.ts` | Rename→`src/proxy.ts` | Next 16 rename (default export `withAuth`), authorized accepts ADMIN+SUPER_ADMIN |
| `src/types/next-auth.d.ts` | Modify | `role: 'ADMIN'\|'SUPER_ADMIN'`, `clubId: string\|null` |
| `src/lib/admin-fetch.ts` | Modify | Forward `active_club_id` cookie context |
| `src/lib/{fees,payments,commissions,reports,whatsapp}.ts` | Modify | clubId param + club scope in every query; club-driven commission |
| `src/lib/{stripe,mercadopago}.ts` | Modify | Accept secret params; metadata `clubSlug`; MP notification `?club_slug=` |
| `src/app/api/checkout/route.ts` | Modify | `clubSlug` in body, club-scoped member/fee validation, club creds, `/pagos/[slug]/confirmacion` URLs |
| `src/app/api/webhooks/{stripe,mercadopago}/route.ts` | Modify | club_slug resolution + per-club secret verify |
| `src/app/api/cron/{fees,overdue}/route.ts` | Modify | Iterate clubs |
| `src/app/api/admin/*` (20 routes) | Modify | `requireClub` + `clubWhere` in all; club CRUD routes added under `admin/clubs`; admin users route `admin/users` |
| `src/app/api/member/{fees,payments}/route.ts` | Modify | `clubSlug` query param, club-scoped DNI lookup |
| `src/app/admin/**` (12 pages) | Modify | Club switcher, scoped fetches, provider overview (SUPER_ADMIN) |
| `src/components/admin/AdminSidebar.tsx` | Modify | Club switcher + "Clubes" nav (SUPER_ADMIN) |
| `src/app/pagos/page.tsx` | Modify | Redirect → `/pagos/clubes` |
| `src/app/pagos/[club-slug]/page.tsx` | Create | Portal per club, slug→club resolution, 404 unknown/inactive |
| `src/app/pagos/[club-slug]/confirmacion/page.tsx` | Create | Club-scoped confirmation |
| `src/app/pagos/clubes/page.tsx` | Create | Directory of ACTIVE clubs |
| `src/app/pagos/confirmacion/page.tsx` | Modify | Redirect → `/pagos` |

## Interfaces / Contracts

```ts
// src/lib/access.ts
export type ScopedRole = 'SUPER_ADMIN' | 'ADMIN';
export interface ClubContext { role: ScopedRole; clubId: string | null } // null = all clubs (SUPER_ADMIN)

// Route handlers: 401/403 via apiError; throws AuthError caught by caller
export async function requireClub(request: NextRequest): Promise<ClubContext>;
// SUPER_ADMIN: clubId from 'active_club_id' cookie or ?clubId= param (null = all)
// ADMIN: clubId = session.clubId; ignores/forbids foreign ?clubId=

// Query builder: always injects club scope unless SUPER_ADMIN-without-club
export function clubWhere(clubId: string | null): Record<string, unknown>; // { clubId } | {}

export async function getEffectiveClub(clubSlug: string): Promise<Club | null>; // ACTIVE only, portal

// lib/fees.ts
export async function generateMonthlyFees(clubId: string, month: number, year: number): Promise<GenerateFeesResult>;

// lib/commissions.ts — club-driven
export async function createCommission(tx, payment, club: Club): Promise<Commission | null>;
// PERCENTAGE: rate=club.commissionValue, amount=round(payment.amount*rate)/100, snapshot on Commission
// FIXED: return null (no per-payment commission)

// lib/payments.ts
export type ConfirmPaymentResult = { status: 'already-paid' } | { status: 'paid'; paymentId: string; commissionId: string | null };

// lib/stripe.ts — explicit secret
export async function createStripeCheckoutSession(input: {...; secretKey: string; clubSlug: string }): Promise<...>;

// schema.prisma additions
enum ClubCommissionType { PERCENTAGE FIXED }
enum ClubStatus { ACTIVE INACTIVE }
enum AdminRole { SUPER_ADMIN ADMIN }

model Club {
  id String @id @default(cuid())
  name String
  slug String @unique
  commissionType ClubCommissionType @default(PERCENTAGE)
  commissionValue Float @default(0)
  status ClubStatus @default(ACTIVE)
  createdAt/updatedAt ...
  members Member[]; feeConfigs FeeConfig[]; fees Fee[]; payments Payment[];
  commissions Commission[]; closings MonthlyClosing[]; whatsappLogs WhatsAppLog[];
  siteConfigs SiteConfig[]; adminUsers AdminUser[]; invoices ProviderInvoice[]
}

model ProviderInvoice {
  id String @id @default(cuid())
  clubId String
  month Int; year Int
  amount Float
  status String @default("ISSUED") // ISSUED | PAID
  issuedAt DateTime @default(now()); paidAt DateTime?
  club Club @relation(fields: [clubId], references: [id])
  @@unique([clubId, month, year])
  @@index([status])
}

// Member: + clubId String, club relation; drop @unique dni/email
//   @@unique([clubId, dni]); @@unique([clubId, email])  // NULL email allowed, NULLs distinct in PG
// FeeConfig: + clubId; @@unique([clubId, category])
// Fee: + clubId; keep @@unique([memberId, month, year]); + @@index([clubId, month, year])
// Payment/Commission/WhatsAppLog: + clubId; Commission keeps rate snapshot
// MonthlyClosing: + clubId; @@unique([clubId, month, year])
// SiteConfig: + clubId; @@unique([clubId, key])
// AdminUser: role AdminRole @default(ADMIN), clubId String? (null = SUPER_ADMIN), relation Club
//   email stays @unique
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `clubWhere` scoping (ADMIN/SUPER_ADMIN/null), commission math PERCENTAGE/FIXED, rate snapshot | Pure functions, `npx tsc --noEmit` + `npm run lint`; no test runner installed (config.yaml: none) |
| Integration | Backfill parity, composite unique acceptance/rejection, webhook secret iteration, cron per-club idempotency | Manual `tsx` scripts + SQL checks against local PGlite/embedded PG |
| E2E | Cross-club leak (ADMIN A sees 0 of B), /pagos/club-a DNI lookup, checkout with club A creds, FIXED invoice at close | Manual walkthrough on dev DB + `npm run build` |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary in this change. The routing change is Next.js proxy/matcher auth-gating only (`proxy.ts` matcher `/admin/:path*`), which is covered by the middleware-authorized tests above.

## Migration / Rollout

1. **Pre-flight**: Neon DB backup/snapshot; record per-table row counts to `scripts/backfill-multitenant.ts` constants.
2. **Migration A** (schema: Club/enums/ProviderInvoice/nullable clubId): `npx prisma migrate dev --name add-club-multitenant` → deploy.
3. **Backfill** `npx tsx scripts/backfill-multitenant.ts`: create "Club Libres" (slug `club-libres`, commissionType PERCENTAGE, commissionValue from `commission_rate` key), assign its clubId to all Member/FeeConfig/Fee/Payment/Commission/MonthlyClosing/WhatsAppLog/SiteConfig rows, merge `bank_account_holder`→`bank_holder` and `whatsapp_token`→`whatsapp_access_token`, delete `commission_rate`, promote all admins to SUPER_ADMIN. Parity check: counts must match pre-flight, else exit non-zero.
4. **Migration B** (schema: NOT NULL + composite uniques + role enum): `npx prisma migrate dev --name club-constraints` → deploy.
5. **Verify**: duplicate DNI accepted across clubs/rejected within club; `/pagos` redirect; portal DNI scoped; checkout club creds; FIXED close creates ProviderInvoice once.
6. **Rollback**: restore DB snapshot (primary) or `npx tsx scripts/revert-multitenant.ts`: clubId nullable, re-add global uniques (after dedupe check), demote SUPER_ADMIN→ADMIN, delete Club/ProviderInvoice rows, restore SiteConfig keys. Reverse migrations applied manually.

## Open Questions

None — all ambiguity resolved in Architecture Decisions (webhook resolution, legacy redirect target, canonical bank key, credential storage location, admin promotion policy).
