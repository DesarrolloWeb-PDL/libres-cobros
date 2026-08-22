# Proposal: Multi-Tenant Provider Platform

## Intent

libres-cobros is a single-club fee management app. The provider (desarrolloweb-pdl) must run N clubs on one platform: manage clubs, see collections and commissions per club, and charge each club a percentage of collected fees or a fixed monthly fee. Today the schema is global (single SiteConfig, global commission rate, unique DNI/email), so N clubs cannot coexist. This change converts the app into a provider-managed multi-tenant platform.

## Scope

### In Scope
- `Club` model: name, slug (unique), `commissionType` enum `PERCENTAGE | FIXED`, `commissionValue`, status.
- `clubId` on Member, FeeConfig, Fee, Payment, Commission, MonthlyClosing, WhatsAppLog, SiteConfig; composite uniques `[clubId,dni]`, `[clubId,email]`, `[clubId,category]`, `[clubId,month,year]`, `[clubId,key]`; drop global uniques.
- Roles: `AdminUser.role` enum `SUPER_ADMIN | ADMIN` + nullable `clubId`; ADMIN scoped to its club, SUPER_ADMIN sees/edits everything (clubs, members, fees, payments, commissions).
- Per-club config: Stripe/MercadoPago credentials, bank info, WhatsApp credentials (SiteConfig per club).
- Billing: `PERCENTAGE` → commission from club rate at payment confirm; `FIXED` → `ProviderInvoice` auto-generated at monthly closing. MonthlyClosing per club.
- Provider dashboard: club CRUD, per-club collections/commissions overview, club switcher for ADMIN.
- Member portal subroute `/pagos/[club-slug]`; DNI search scoped to club.
- Multi-step backfill migration to default club "Club Libres" (existing production data).
- Scoping helper (`requireClub`) + middleware enforcing role/clubId.

### Out of Scope
- In-app payment collection FROM clubs TO the provider (invoice is recorded; collection happens out-of-band).
- Public/self-service club signup — onboarding stays provider-managed (flag: revisit only if user wants self-serve).
- Per-club database separation.
- Member-facing accounts or per-member auth.

## Capabilities

### New Capabilities
- `club-management`: Club CRUD, provider dashboard, club switcher, per-club billing and config management.

### Modified Capabilities
- `member-registry`: clubId scoping, composite unique `[clubId,dni]`.
- `fee-management`: per-club FeeConfig and fee generation (cron iterates clubs).
- `payment-processing`: per-club credentials, webhook routing per club, club-aware checkout.
- `commission-system`: per-club rate, per-club MonthlyClosing, ProviderInvoice for FIXED.
- `member-portal`: `/pagos/[club-slug]` subroute, club-scoped DNI lookup.
- `admin-dashboard`: role-based views, club switcher, provider overview.
- `reporting-export`: per-club filters and exports.
- `whatsapp-notifications`: per-club WhatsApp credentials.

## Approach

Shared single DB + `clubId` column (Option A): one Prisma client, one Neon DB, cheap cross-club aggregation. All tenant queries go through a scoping helper that injects `clubId` from session (ADMIN) or allows all (SUPER_ADMIN). Billing: `Club.commissionType/Value` is source of truth; PERCENTAGE computes commission per confirmed payment; FIXED generates one ProviderInvoice per club/month at closing. Portal uses `/pagos/[club-slug]`. Migration is multi-step on prod: (1) create default club from current `commission_rate`; (2) add nullable clubId; (3) backfill script (`scripts/apply-migration.ts`) assigns default club; (4) set NOT NULL + composite uniques; (5) promote existing admin to SUPER_ADMIN.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Club, roles, clubId, composite uniques, ProviderInvoice |
| `src/lib/auth.ts`, `src/middleware.ts` | Modified | Role + clubId in session/token, role gates |
| `src/lib/{commissions,fees,payments,reports,whatsapp,admin-fetch}.ts` | Modified | clubId scoping |
| `src/app/api/**` (admin, checkout, webhooks, cron) | Modified | Club filters, per-club routing |
| `src/app/admin/**` (12 pages) | Modified | Club switcher, club CRUD, provider dashboard |
| `src/app/pagos/**` | Modified | `[club-slug]` subroute |
| `prisma/seed.ts`, `scripts/apply-migration.ts` | Modified | Club seed, backfill |
| `openspec/specs/**` | Modified | Delta specs for 8 capabilities + new club-management |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data leak between clubs if a clubId filter is missed | High | Central scoping helper, role matrix, cross-club tests, code review checklist |
| Migration/backfill breaks production data | Med | Multi-step with default club, DB backup, staged deploy |
| Cron behavior per club (fees, overdue, FIXED invoices) | Med | Cron iterates clubs via Club list; per-club closing |
| Webhook routing per club (Stripe/MP per club) | Med | Per-club webhook secret mapping; metadata carries clubSlug |
| FIXED invoice period ambiguity (which month, billing date) | Med | Open question; default: close month = invoice month |

## Rollback Plan

Feature-branch revert + reverse migration: `clubId` back to NULL, re-add global uniques, demote SUPER_ADMIN to ADMIN, delete Club/ProviderInvoice rows; restore from DB backup taken pre-migration. Webhook/credential changes revert with config keys.

## Dependencies

- Neon DB backup before migration; `scripts/apply-migration.ts` runner.
- Per-club Stripe/MercadoPago accounts + WhatsApp credentials (provided by clubs, configured by provider).

## Success Criteria

- [ ] Two+ clubs coexist with zero data leakage (test: cross-club query returns empty).
- [ ] PERCENTAGE club: commission computed from club rate; FIXED club: ProviderInvoice generated at close.
- [ ] SUPER_ADMIN manages all clubs; ADMIN sees only its club.
- [ ] `/pagos/[club-slug]` scopes DNI lookup; legacy `/pagos` redirects.
- [ ] Existing production data backfilled to "Club Libres" with history intact.

## Proposal question round

All assumptions resolved by user on 2026-08-15:
1. Club onboarding is provider-managed only (no public signup) — CONFIRMED.
2. Club ADMIN users are created by SUPER_ADMIN from the provider panel (email + password) — CONFIRMED.
3. FIXED invoice is recorded only, not collected in-app; provider collects out-of-band — CONFIRMED.
4. FIXED period: invoice generated for the month being closed at monthly closing — CONFIRMED.
5. New clubs start current period from zero (no historical backfill) — CONFIRMED.
