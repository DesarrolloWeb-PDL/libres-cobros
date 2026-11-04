# Handoff: libres-cobros — platform-saas-billing

Date: 2026-11-02
Project: libres-cobros
Change: platform-saas-billing (Platform → Institution SaaS Subscription Billing)
Status: In progress — Phases 1–7 complete and committed. Phase 8 (Verification) automated checks complete; 8.2 manual smoke pending.

## Where we are

SDD change `platform-saas-billing` is mid-apply. Work units 1–6 are complete. Phase 7 (Tier/Landing) is the next slice. Phase 8 (Verification) remains.

### Completed commits

- `5560842` feat(saas-billing): phase 1 schema + seed (work unit 1)
- `15af4da` feat(saas-billing): phase 2 config + types (work unit 2)
- `f0281b3` feat(saas-billing): phase 3 billing + cron (work unit 3)
- `13e279d` feat(saas-billing): phase 4 collection (work unit 4)
- `d69603a` feat(saas-billing): phase 5 arca emission (work unit 5)
- `b39c843` feat(saas): wire landing pages to active plan catalog and tier alerts on member create/import (work unit 7)

### Phase 6 (Admin API+UI) — COMPLETE, SPLIT into 11 commits

Originally committed as `1b5e516` (+2,851 lines). User asked to split it into reviewable commits ≤400 lines. Reorganized into 11 work-unit commits, final tree byte-identical to the original verified commit.

- `fd10f3a` feat(admin,saas): add SaaS types and admin navigation scaffold — 105 lines
- `224817d` feat(api,saas): add plan CRUD admin routes — 212 lines
- `ffc5ae7` feat(api,saas): add subscription admin routes — 227 lines
- `1a4b2f6` feat(api,saas): add plan change request admin routes — 299 lines
- `915320a` feat(api,saas): add invoice admin routes and institution fiscal fields — 186 lines
- `2799408` feat(admin,saas): add SaaS plan list page and component — 324 lines
- `d2590b4` feat(admin,saas): add SaaS plan create-edit form — 384 lines
- `69628cb` feat(admin,saas): add institution subscription panel and page — 365 lines
- `c66d4d3` feat(admin,saas): add superadmin subscription panel scaffold and data hooks — 239 lines
- `863d846` feat(admin,saas): add superadmin subscription panel actions UI and dialogs — 338 lines
- `880d997` feat(admin,saas): add superadmin subscription page and tests — 172 lines

Verification baseline for phase 6: `npx vitest run` 152 passed (18 files), `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors + 5 pre-existing warnings, `npm run build` success.

## Pushed branches (stacked PRs, based on origin/master)

Clean stacked branches have been pushed to origin. PRs must be created manually (no gh CLI or GITHUB_TOKEN available).

| Branch | Compare URL | Diff |
|---|---|---|
| `feat/saas-billing-phase-01-schema` | https://github.com/DesarrolloWeb-PDL/libres-cobros/compare/master...feat/saas-billing-phase-01-schema?expand=1 | +865 |
| `feat/saas-billing-phase-02-config` | https://github.com/DesarrolloWeb-PDL/libres-cobros/compare/master...feat/saas-billing-phase-02-config?expand=1 | +1,031 |
| `feat/saas-billing-phase-03-billing` | https://github.com/DesarrolloWeb-PDL/libres-cobros/compare/master...feat/saas-billing-phase-03-billing?expand=1 | +1,904 |
| `feat/saas-billing-phase-04-collection` | https://github.com/DesarrolloWeb-PDL/libres-cobros/compare/master...feat/saas-billing-phase-04-collection?expand=1 | +3,399 |
| `feat/saas-billing-phase-05-arca` | https://github.com/DesarrolloWeb-PDL/libres-cobros/compare/master...feat/saas-billing-phase-05-arca?expand=1 | +4,035 |
| `fix/react-hooks-set-state-in-effect` | https://github.com/DesarrolloWeb-PDL/libres-cobros/compare/master...fix/react-hooks-set-state-in-effect?expand=1 | +52/−32 |
| `test/multi-tenant-http-isolation` | https://github.com/DesarrolloWeb-PDL/libres-cobros/compare/master...test/multi-tenant-http-isolation?expand=1 | +198/−1 |

**Note:** Phase 4 and 5 diffs exceed the 400-line review budget; may need `size:exception` if the repo enforces it.

### Still pending

- 8.2 Manual Success Criteria: run, collections ×3, regimes ×2 config-only, alerts, plan change E2E, overdue access, Recibo C regression-free.

### Phase 8 verification evidence (automated)

- Branch: `feat/saas-billing-phase-08-verification` (from `feat/saas-billing-phase-07-landing`).
- `npx vitest run` → 152 passed (18 files).
- `npx tsc --noEmit` → 0 errors.
- `npm run lint` → 0 errors, 5 pre-existing warnings.
- `npm run build` → success.
- `saas_billing_enabled` ships with fallback/seed default `false`; flag was NOT flipped.

## Session preflight (cached — do not re-ask)

- Execution mode: interactive (pause after each phase, show result, wait for OK)
- Artifact store: both (openspec files + engram)
- Delivery strategy: ask-on-risk
- Review budget: 400 lines

## Review workload decision (already resolved)

- Forecast: ~2,700 estimated changed lines, High risk, Chained PRs recommended: Yes.
- User chose: chained PRs.
- Chain strategy: stacked-to-main (each PR merges to main in order).
- `tasks.md` line 15 records `Chain strategy: stacked-to-main`.
- PR boundary per slice: implement ONLY the next work unit as a single work-unit commit; do not start the following phase.

## Apply-progress (engram)

- Topic key: `sdd/platform-saas-billing/apply-progress` (observation #576).
- Slices 1–5 recorded and merged; merge new slice-6 progress into it (do not overwrite).

## Key artifacts

- openspec/changes/platform-saas-billing/proposal.md
- openspec/changes/platform-saas-billing/design.md (D1–D7 decisions)
- openspec/changes/platform-saas-billing/specs/ (saas-plans, saas-subscription-billing, platform-arca-emission)
- openspec/changes/platform-saas-billing/tasks.md
- .atl/skill-registry.md

## Skills to load for next apply

- C:\Users\Usuario\.config\opencode\skills\chained-pr\SKILL.md
- C:\Users\Usuario\.config\opencode\skills\work-unit-commits\SKILL.md

## Repo conventions (mandatory before coding)

- Read `node_modules/next/dist/docs/` first (breaking-change Next.js version; conform to D1–D7).
- API route handlers live under `src/app/api/**/route.ts` (Next.js App Router) — task text names URL paths, not filesystem paths.
- Strict TDD: disabled (`strict_tdd: false` in `openspec/config.yaml`); vitest is the runner.
- Lint baseline: 0 errors, 5 pre-existing unused-var warnings (do not "fix" those 5).

## Verification baseline (last green run, 2026-11-02)

- `npx vitest run arca arca-saas saas-autodebit saas-billing` → 4 files, **58 passed**
- `npx tsc --noEmit` → exit 0
- `npm run lint` → 0 errors, 5 pre-existing warnings

## Open risks / carry-forward constraints

1. **ARCA homolog smoke not run** — real network emission to ARCA is unverified in automation (task 8.2). Ship with `saas_billing_enabled=false` and flip only after the smoke (8.1).
2. `saas-autodebit.ts` fallback due-date uses UTC; may differ by one day from the Buenos-Aires billing-day logic in edge cases.
3. `checkTierAlert` writes `SmsLog` only when `triggerMemberId` is supplied (`SmsLog.memberId` is non-null) — Phase 7 callers must pass the triggering member id.
4. Reminder cadence uses exact day matching (`1,7,15`); a missed cron day skips that slot by design.
5. Review budget is 400 lines and slices 3/4 already landed at 881 and 1,517. The user accepted the chained-PR forecast, but the accumulated unpushed diff is large — worth an explicit review decision before pushing.
6. `gentle-ai` 4.2.0 on this machine has **no `sdd-*` commands** (no `sdd-status`, `sdd-continue`, `sdd-attempt`). Do not attempt them; read `tasks.md` checkboxes + the engram apply-progress topic key for status instead.
7. Receipt-driven development reports `on (decided by default)` for this clone.

## Blocker (RESOLVED)

The 2026-10-30 blocker was `sdd-apply` (model `opencode-go/kimi-k2.7-code`) failing twice with
"Upstream request failed: Insufficient account funds". **Resolved** — the same model completed
work units 3, 4 and 5 on 2026-11-02. No config change was made to `opencode.json`.

## How to resume

1. Confirm funds are still available for `opencode-go/kimi-k2.7-code` (the configured
   `agent.sdd-apply.model`). If not, set `agent.sdd-apply.model` in `~/.config/opencode/opencode.json`.
2. Re-run SDD apply for change `platform-saas-billing`, work unit 6 only, with:
   - artifact_store.mode = both
   - delivery_strategy = ask-on-risk (already resolved to chained PRs)
   - chain_strategy = stacked-to-main
   - PR boundary: work unit 6 only
   - Read existing apply-progress topic key and MERGE.
   - Load chained-pr + work-unit-commits skills.
   - Read `node_modules/next/dist/docs/` before writing app code.
3. After slice 6 passes `npx vitest run`, `npx tsc --noEmit` and `npm run lint`, commit as work
   unit 6, update tasks.md checkboxes 6.1–6.3 to [x], merge apply-progress.
4. Continue with Phase 7 (Tier/Landing) in the next session/slice.
5. Decide whether to push `master` (7 commits ahead) as stacked PRs before proceeding further.

## Phase 9: ARCA multi-tenant credentials in UI

### Goal
Make ARCA fiscal emission work per-tenant with UI-managed credentials, so each institution enters its own ARCA data and the platform owner enters their own data in the superadmin.

### Commits

- `d540f33` feat(arca): encrypt stored keys and resolve credentials per tenant
- `ff4298b` feat(api,config): allowlist and mask ARCA credential keys
- `8bc8205` feat(api): add ARCA test-credentials endpoint
- `73c6b6d` feat(admin,ui): ARCA credential management per tenant

### Verification evidence (automated)

- Branch: `feat/saas-billing-phase-09-arca-credentials` (from `feat/saas-billing-phase-08-verification`).
- `npx vitest run` → 179 passed (21 files). Baseline was 152 passed (18 files); +27 new tests.
- `npx tsc --noEmit` → 0 errors.
- `npm run lint` → 0 errors, 5 pre-existing warnings unchanged.
- `npm run build` → success.
- `saas_billing_enabled` remains `false`; no production flag flip.

### What changed

- `src/lib/arca-crypto.ts`: AES-256-GCM encryption for stored ARCA private keys, HKDF-SHA256 key derivation from `ARCA_STORAGE_SECRET` with fallback to `NEXTAUTH_SECRET`.
- `src/lib/arca.ts`: credential resolution ordering (club stored → platform stored → env) for both `emitirReciboC` and `emitirComprobanteSaas`; exported `requestTa`; `resolveClubArcaEmitterCuit` keeps QR CUIT in sync with emission CUIT.
- `src/app/api/admin/site-config/route.ts`: added `arca_cert`/`arca_key` and `saas_arca_cuit`/`saas_arca_cert`/`saas_arca_key` to allowlist; GET masks keys and certificates; PUT enforces institution-only vs platform-only scope and encrypts private keys.
- `src/app/api/admin/arca/test-credentials/route.ts`: new POST endpoint that requests a WSAA TA with resolved credentials without emitting documents.
- `src/components/admin/ConfigurationForm.tsx`: platform ARCA section for SUPER_ADMIN, institution ARCA section with cert/key paste and test-credentials button.
- `src/app/api/admin/institutions/[id]/route.ts`: mirrors `Club.cuit` to club-scoped `arca_cuit` SiteConfig for single-source fiscal data.
- `src/app/pagos/[slug]/ticket/[paymentId]/page.tsx`: uses `resolveClubArcaEmitterCuit` for QR CUIT.
- `.env.example`: added `ARCA_STORAGE_SECRET` with fallback documentation.
- New tests: `tests/unit/arca-credentials.test.ts` (16 tests), `tests/unit/site-config-arca.test.ts` (6 tests), `tests/unit/arca-test-credentials.test.ts` (5 tests).

### What remains

- Phase 8.2 manual success criteria still pending.
- Real ARCA homolog smoke with stored credentials (platform + one institution) to confirm TA + FECAESolicitar end-to-end.
- Optional: admin UI to clear/replace existing cert/key explicitly (currently replace only by pasting a new value).

## Phase 10: Subscription status login alerts

### Goal
Add visibility (no suspension/cancellation) for institution admins at login and for superadmins in the subscription panel: due-soon and overdue SaaS invoice alerts.

### Commits

- `310ec57` feat(saas): add subscription alert domain, config key and unit tests
- `50da425` feat(admin,ui): add dismissible institution subscription alert banner
- `b6f4c7e` feat(admin,saas): show overdue institutions in subscription panel

### Verification evidence (automated)

- Branch: `feat/saas-billing-phase-10-subscription-alerts` (from `feat/saas-billing-phase-09-arca-credentials`).
- `npx vitest run` → 199 passed (23 files). Baseline was 179 passed (21 files); +20 new tests.
- `npx tsc --noEmit` → 0 errors.
- `npm run lint` → 0 errors, 5 pre-existing warnings unchanged.
- `npm run build` → success.
- `saas_billing_enabled` remains `false`; no production flag flip.

### What changed

- `src/lib/saas-subscription-alert.ts`: cheap queries using the `[institutionId, month, year]` unique index; due-soon window (default 5 days, configurable via `saas_due_soon_days`); overdue days calculation; overdue institution grouping using the indexed `status` column.
- `src/app/api/admin/site-config/route.ts` + `src/types/saas.ts`: allowlisted `saas_due_soon_days` as platform-only with description.
- `src/components/ui/alert.tsx`: reusable Alert/AlertTitle/AlertDescription component in the existing design system.
- `src/components/admin/SubscriptionAlertBanner.tsx`: dismissible banner (localStorage per invoice) rendered on the admin dashboard for institution admins.
- `src/app/admin/page.tsx`: fetches and renders the institution subscription alert when `saas_billing_enabled` is true.
- `src/app/admin/saas/suscripciones/page.tsx` + `src/components/admin/SaasSubscriptionPanel.tsx`: superadmin overdue-institution alert reused in the existing subscription panel.
- New tests: `tests/unit/subscription-alerts.test.ts` (14 tests), `tests/components/SubscriptionAlertBanner.test.tsx` (5 tests), plus 1 additional test in `tests/components/SaasSubscriptionPanel.test.tsx`.

### What remains

- Phase 8.2 manual success criteria still pending.
- Real ARCA homolog smoke with stored credentials.
- Optional: explicit cert/key clear/replace UI.

## Engram references

- #565 SDD Session Preflight
- #566 Proposal
- #567 Spec
- #569 Design
- #570 Tasks
- #571 Repo conventions (Next.js + vitest)
- #576 Apply progress slices 1–5
- #580 Discovery: gentle-ai 4.2.0 ships no sdd-* commands
