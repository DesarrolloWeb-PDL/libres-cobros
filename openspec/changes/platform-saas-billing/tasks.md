# Tasks: Platform → Institution SaaS Subscription Billing

Read `node_modules/next/dist/docs/` first; conform to D1–D7.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,700 (per unit) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work Units

1. Schema+seed (1, ~200) | `npx tsc --noEmit` | seed re-run idempotent | drop Saas*+columns.
2. Config+types (2, ~120) | `npx tsc --noEmit` | clubId=null curl | revert diffs.
3. Billing+cron (3, ~450) | `npx vitest run saas-billing` | cron ×2 no-op; flag-off inert | remove unit files.
4. Collection (4, ~550) | `npx vitest run saas-autodebit` | MP sandbox preapproval+webhook | remove unit files.
5. ARCA (5, ~350) | `npx vitest run arca` | homolog smoke both regimes | restore arca.ts.
6. Admin API+UI (6, ~750) | build + component tests | role walkthrough | remove screens+routes.
7. Landing+alert (7, ~200) | `npm run build` | price edit reflects; 201st alerts | revert diffs.

## Phase 1: Schema+Seed

- [x] 1.1 schema.prisma per D1: SaasPlan/Subscription/PlanChangeRequest/Invoice/AutoDebit/Comprobante + enums, D1 uniques; Club += cuit?, ivaCondicion.
- [x] 1.2 Additive `prisma migrate dev`; tsc passes.
- [x] 1.3 seed.ts catalog ≤50/ARS 0, 51–200/35.000, 201–800/85.000; idempotent.

## Phase 2: Config+Types

- [x] 2.1 site-config.ts + api/admin/site-config: clubId=null saas_* keys per D2/D4/D6 (flag=false); platform resend_*/bank_*; src/types/saas.ts zod schemas + status enums.

## Phase 3: Billing+Cron

- [x] 3.1 tests/unit/saas-billing.test.ts (mocked Prisma): boundaries 50/51/200/201/800/801, idempotency, pending-swap, $0 skip, cadence.
- [x] 3.2 src/lib/saas-billing.ts per D2/D6: runSaasBilling, OVERDUE sweep, deduped email reminders, checkTierAlert (never throws).
- [x] 3.3 api/cron/saas-billing/route.ts (authorizeCron/CRON_SECRET) + vercel.json daily entry.

## Phase 4: Collection

- [x] 4.1 tests/unit/saas-autodebit.test.ts: webhook settlement, find-or-create invoice, confirm→emission ordering, bank SUPER_ADMIN-only.
- [x] 4.2 src/lib/saas-autodebit.ts per D3: MP preapproval+one-off preference, Stripe anchor, confirmSaasInvoice (PAID → emission).
- [x] 4.3 POST /api/admin/saas/institutions/[id]/autodebit: SUPER_ADMIN, in-memory auth URL.
- [x] 4.4 api/webhooks/platform/mercadopago + /stripe: platform-secret verify, no club_slug, idempotent.
- [x] 4.5 POST /api/admin/saas/invoices/[id]/pay: SUPER_ADMIN, transferRef required.

## Phase 5: ARCA

- [x] 5.1 tests/unit/arca-saas.test.ts: tipo 15/1/6 shapes, IVA total/(1+rate), regime→tipo, missing CUIT → ERROR.
- [x] 5.2 arca.ts per D4: buildFecaPayload({cbteTipo,ivaRate?}), emitirComprobanteSaas (regime→tipo, idempotent, withEmissionLock).
- [x] 5.3 emitirReciboC/buildReciboCPayload byte-compatible: arca.test.ts green unedited.
- [x] 5.4 Emission post-commit from confirmSaasInvoice; failure recorded, PAID unchanged.

## Phase 6: Admin API+UI

- [x] 6.1 api/admin/saas per D5: plans CRUD (deactivate-only), change-request approve/reject → pendingSaasPlanId, invoices list.
- [x] 6.2 /admin/saas/planes + /admin/saas/suscripciones (SUPER_ADMIN); /admin/suscripcion (ADMIN); AdminSidebar flag-gated nav.
- [x] 6.3 InstitutionForm + institutions/[id]: CUIT/IVA fields; component tests SaasPlanForm/List+panel.

## Phase 7: Landing+Alert

- [x] 7.1 page.tsx + precios/page.tsx: force-dynamic, active SaasPlan only (D7); unsubscribed → free tier.
- [x] 7.2 checkTierAlert into members POST + members/import post-create.

## Phase 8: Verification

- [x] 8.1 tsc, lint, `npx vitest run` (baseline+new), build green; ship saas_billing_enabled=false, flip after homolog smoke.
- [ ] 8.2 Manual per Success Criteria: run, collections ×3, regimes ×2 config-only, alerts, plan change E2E, overdue access, Recibo C regression-free.

## Phase 9: ARCA multi-tenant credentials in UI

- [x] 9.1 Encryption at rest: AES-256-GCM for stored private keys; `ARCA_STORAGE_SECRET` with `NEXTAUTH_SECRET` fallback.
- [x] 9.2 Credential resolution (club → platform → env) wired into `emitirReciboC` and `emitirComprobanteSaas`; TA request uses resolved cert/key.
- [x] 9.3 SiteConfig allowlist + descriptions for `arca_cert`/`arca_key` and `saas_arca_cuit`/`saas_arca_cert`/`saas_arca_key`; GET masks secrets; PUT enforces institution-only vs platform-only scope.
- [x] 9.4 ConfigurationForm platform ARCA section (superadmin) and institution ARCA section with cert/key paste, configured indicators, and test-credentials button.
- [x] 9.5 InstitutionForm fiscal CUIT mirrored to club-scoped `arca_cuit`; ticket QR page uses `resolveClubArcaEmitterCuit` for CUIT consistency.
- [x] 9.6 POST `/api/admin/arca/test-credentials` returns `{ok, environment, error?}` without emitting documents.
- [x] 9.7 Automated verification: `npx vitest run` 179 passed (21 files), `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors + 5 warnings, `npm run build` success.

## Phase 10: Subscription status login alerts

- [x] 10.1 Add `saas_due_soon_days` platform SiteConfig key to allowlist, scope and descriptions.
- [x] 10.2 Domain logic in `src/lib/saas-subscription-alert.ts`: current-month invoice lookup via `[institutionId, month, year]`, due-soon window (default 5 days), overdue days, institution scoping, overdue institution grouping.
- [x] 10.3 Institution admin login-time alert: dismissible banner on `/admin` dashboard for ADMIN users when `saas_billing_enabled` is true.
- [x] 10.4 Superadmin visibility: overdue institution alert reused in the existing `/admin/saas/suscripciones` subscription panel.
- [x] 10.5 Unit tests: boundary window, overdue days, institution scoping, config default.
- [x] 10.6 Component tests: dismissible banner, overdue panel indicator.
- [x] 10.7 Automated verification: `npx vitest run` 199 passed (23 files), `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors + 5 warnings, `npm run build` success.
