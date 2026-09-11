# Proposal: Multi-Tenant Provider Platform

## Intent

libres-cobros is a single-institution fee management app. The provider (desarrolloweb-pdl) must run N institutions on one platform: manage institutions, see collections and commissions per institution, and charge each institution a percentage of collected fees or a fixed monthly fee. Today the schema is global (single SiteConfig, global commission rate, unique DNI/email), so N institutions cannot coexist. This change converts the app into a provider-managed multi-tenant platform.

## Scope

### In Scope
- `Club` model: name, slug (unique), `commissionType` enum `PERCENTAGE | FIXED`, `commissionValue`, status.
- `clubId` on Member, FeeConfig, Fee, Payment, Commission, MonthlyClosing, WhatsAppLog, SiteConfig; composite uniques `[clubId,dni]`, `[clubId,email]`, `[clubId,category]`, `[clubId,month,year]`, `[clubId,key]`; drop global uniques.
- Roles: `AdminUser.role` enum `SUPER_ADMIN | ADMIN` + nullable `clubId`; ADMIN scoped to its institution, SUPER_ADMIN sees/edits everything (institutions, members, fees, payments, commissions).
- Per-institution config: Stripe/MercadoPago credentials, bank info, WhatsApp credentials (SiteConfig per institution).
- Billing: `PERCENTAGE` → commission from institution rate at payment confirm; `FIXED` → `ProviderInvoice` auto-generated at monthly closing. MonthlyClosing per institution.
- Provider dashboard: institution CRUD, per-institution collections/commissions overview, institution switcher for ADMIN.
- Member portal subroute `/pagos/[institution-slug]`; DNI search scoped to institution.
- Multi-step backfill migration to default institution "Club Libres" (existing production data).
- Scoping helper (`requireInstitution`) + middleware enforcing role/institutionId.

### Out of Scope
- In-app payment collection FROM institutions TO the provider (invoice is recorded; collection happens out-of-band).
- Public/self-service institution signup — onboarding stays provider-managed (flag: revisit only if user wants self-serve).
- Per-institution database separation.
- Member-facing accounts or per-member auth.

## Capabilities

### New Capabilities
- `institution-management`: Institution CRUD, provider dashboard, institution switcher, per-institution billing and config management.

### Modified Capabilities
- `member-registry`: institutionId scoping, composite unique `[clubId,dni]`.
- `fee-management`: per-institution FeeConfig and fee generation (cron iterates institutions).
- `payment-processing`: per-institution credentials, webhook routing per institution, institution-aware checkout.
- `commission-system`: per-institution rate, per-institution MonthlyClosing, ProviderInvoice for FIXED.
- `member-portal`: `/pagos/[institution-slug]` subroute, institution-scoped DNI lookup.
- `admin-dashboard`: role-based views, institution switcher, provider overview.
- `reporting-export`: per-institution filters and exports.
- `whatsapp-notifications`: per-institution WhatsApp credentials.

## Approach

Shared single DB + `clubId` column (Option A): one Prisma client, one Neon DB, cheap cross-institution aggregation. All tenant queries go through a scoping helper that injects `clubId` from session (ADMIN) or allows all (SUPER_ADMIN). Billing: `Club.commissionType/Value` is source of truth; PERCENTAGE computes commission per confirmed payment; FIXED generates one ProviderInvoice per institution/month at closing. Portal uses `/pagos/[institution-slug]`. Migration is multi-step on prod: (1) create default institution from current `commission_rate`; (2) add nullable clubId; (3) backfill script (`scripts/apply-migration.ts`) assigns default institution; (4) set NOT NULL + composite uniques; (5) promote existing admin to SUPER_ADMIN.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Club, roles, clubId, composite uniques, ProviderInvoice |
| `src/lib/auth.ts`, `src/middleware.ts` | Modified | Role + clubId in session/token, role gates |
| `src/lib/{commissions,fees,payments,reports,whatsapp,admin-fetch}.ts` | Modified | institutionId scoping |
| `src/app/api/**` (admin, checkout, webhooks, cron) | Modified | Institution filters, per-institution routing |
| `src/app/admin/**` (12 pages) | Modified | Institution switcher, institution CRUD, provider dashboard |
| `src/app/pagos/**` | Modified | `[institution-slug]` subroute |
| `prisma/seed.ts`, `scripts/apply-migration.ts` | Modified | Institution seed, backfill |
| `openspec/specs/**` | Modified | Delta specs for 8 capabilities + new institution-management |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data leak between institutions if an institutionId filter is missed | High | Central scoping helper, role matrix, cross-institution tests, code review checklist |
| Migration/backfill breaks production data | Med | Multi-step with default institution, DB backup, staged deploy |
| Cron behavior per institution (fees, overdue, FIXED invoices) | Med | Cron iterates institutions via Club list; per-institution closing |
| Webhook routing per institution (Stripe/MP per institution) | Med | Per-institution webhook secret mapping; metadata carries institutionSlug |
| FIXED invoice period ambiguity (which month, billing date) | Med | Open question; default: close month = invoice month |

## Rollback Plan

Feature-branch revert + reverse migration: `clubId` back to NULL, re-add global uniques, demote SUPER_ADMIN to ADMIN, delete Club/ProviderInvoice rows; restore from DB backup taken pre-migration. Webhook/credential changes revert with config keys.

## Dependencies

- Neon DB backup before migration; `scripts/apply-migration.ts` runner.
- Per-institution Stripe/MercadoPago accounts + WhatsApp credentials (provided by institutions, configured by provider).

## Success Criteria

- [ ] Two+ institutions coexist with zero data leakage (test: cross-institution query returns empty).
- [ ] PERCENTAGE institution: commission computed from institution rate; FIXED institution: ProviderInvoice generated at close.
- [ ] SUPER_ADMIN manages all institutions; ADMIN sees only its institution.
- [ ] `/pagos/[institution-slug]` scopes DNI lookup; legacy `/pagos` redirects.
- [ ] Existing production data backfilled to "Club Libres" with history intact.

## Proposal question round

All assumptions resolved by user on 2026-08-15:
1. Institution onboarding is provider-managed only (no public signup) — CONFIRMED.
2. Institution ADMIN users are created by SUPER_ADMIN from the provider panel (email + password) — CONFIRMED.
3. FIXED invoice is recorded only, not collected in-app; provider collects out-of-band — CONFIRMED.
4. FIXED period: invoice generated for the month being closed at monthly closing — CONFIRMED.
5. New institutions start current period from zero (no historical backfill) — CONFIRMED.
