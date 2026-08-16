# Tasks: Multi-Tenant Provider Platform

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,250 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Work Units

1. Schema+migrations+backfill (1) | tsc --noEmit | tsx backfill, parity | drop Club, globals.
2. Access helper+roles (2) | tsc --noEmit; lint | N/A session/cookie | revert access/auth/proxy.
3. Checkout+webhooks+commissions (3) | tsc --noEmit | Stripe test/club | revert payments.
4. Fees+crons per club (4) | tsc --noEmit | curl cron/fees | revert fees/cron.
5. Admin API scoping+clubs (5) | tsc --noEmit | curl: A sees 0 of B | revert routes.
6. Admin UI+switcher (6) | npm run build | walkthrough stats=A | revert UI.
7. Portal subroute+redirects (7) | npm run build | /pagos/club-a DNI | revert portal.

## Phase 1: Foundation

- [x] 1.1 schema.prisma: Club, ProviderInvoice, enums, clubId on 8 models, composite uniques, drop globals, AdminUser.role+clubId.
- [x] 1.2 Migration A (nullable clubId, no unique changes).
- [x] 1.3 backfill-multitenant.ts: create Club Libres, assign clubId, merge keys, delete commission_rate, promote SUPER_ADMIN, parity.
- [x] 1.4 Migration B (NOT NULL clubId, composite uniques, role enum).
- [x] 1.5 revert-multitenant.ts (nullable, globals, demote).
- [x] 1.6 seed.ts: Club Libres, club FeeConfigs, canonical keys.

## Phase 2: Access & Roles

- [x] 2.1 access.ts: requireClub (role/clubId, cookie, ?clubId, SUPER_ADMIN bypass), clubWhere, getEffectiveClub.
- [x] 2.2 auth.ts+next-auth.d.ts: JWT/session carry role+clubId.
- [x] 2.3 middleware.ts->proxy.ts: authorized allows ADMIN+SUPER_ADMIN.
- [x] 2.4 admin-fetch.ts: forward active_club_id.

## Phase 3: Core Libs & Commissions

- [x] 3.1 commissions.ts: createCommission PERCENTAGE snapshot/FIXED null; closing upserts ProviderInvoice once.
- [x] 3.2 payments.ts: confirmPayment passes club, commissionId nullable.
- [ ] 3.3 fees.ts: generateMonthlyFees(clubId,month,year), fee.clubId.
- [x] 3.4 stripe/mercadopago.ts: secret params, clubSlug metadata, MP ?club_slug=.
- [ ] 3.5 reports+whatsapp.ts: clubWhere queries, per-club creds/logs/bank.

## Phase 4: API Wiring

- [x] 4.1 checkout: clubSlug, club-scoped member/fee (404/409), club creds, /pagos/[slug]/confirmacion, club bank.
- [x] 4.2 webhooks stripe+mercadopago: ?club_slug->club secret/token, 401, idempotent.
- [ ] 4.3 cron fees+overdue: iterate ACTIVE clubs.
- [x] 4.4 Admin routes (19): requireClub+clubWhere, role ADMIN|SUPER_ADMIN.
- [ ] 4.5 member fees/payments: clubSlug, scoped DNI.
- [x] 4.6 admin/clubs CRUD (slug 409, 0-100, no delete) + admin/users (dup 409, SUPER_ADMIN-only).

## Phase 5: Admin UI

- [ ] 5.1 AdminSidebar: club switcher, "Clubes" nav.
- [ ] 5.2 12 pages: scoped fetches (active_club_id).
- [ ] 5.3 /admin/clubes list+form+[id] detail, ADMIN-user mgmt.
- [ ] 5.4 Provider overview: per-club collected/commissions/status cards.

## Phase 6: Member Portal

- [ ] 6.1 /pagos -> /pagos/clubes; /pagos/confirmacion -> /pagos redirects.
- [ ] 6.2 /pagos/clubes directory (ACTIVE only).
- [ ] 6.3 /pagos/[club-slug]: 404 unknown/inactive, scoped DNI, ?dni prefill, paid disabled.
- [ ] 6.4 /pagos/[slug]/confirmacion club-scoped receipt.

## Phase 7: Verification

- [ ] 7.1 npx tsc --noEmit + npm run lint clean.
- [ ] 7.2 npm run build clean.
- [ ] 7.3 Manual cross-club walkthrough passes (script in sdd-tasks handoff).
