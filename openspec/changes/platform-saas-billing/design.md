# Design: Platform → Institution SaaS Subscription Billing

## Technical Approach

Additive Prisma models with a `Saas*` prefix (`Plan` is taken by member fee plans), platform-level `SiteConfig` keys (`clubId=null`), a daily `authorizeCron`-style run, enrollment mirroring member auto-debit with platform credentials, and a generalized ARCA payload builder in `src/lib/arca.ts` keeping `emitirReciboC` byte-compatible. Member emission and commission logic untouched; gated by `saas_billing_enabled`.

## Architecture Decisions

### D1 — Data model

**Choice** (additive; uniques are idempotency locks):
- `SaasPlan`: name `@unique`, min/maxMembers, priceArs, highlight, isActive.
- `SaasSubscription`: `@@unique([institutionId])`, saasPlanId, pendingSaasPlanId?, ACTIVE|CANCELLED; re-subscribe upserts (AutoDebit pattern).
- `SaasPlanChangeRequest`: institutionId, requestedSaasPlanId, PENDING|APPROVED|REJECTED.
- `SaasInvoice`: institutionId, saasPlanId, month, year, amount, PENDING|PAID|OVERDUE, dueDate + payment/reminder audit fields; `@@unique([institutionId, month, year])`.
- `SaasAutoDebit`: `@@unique([institutionId])`, gateway, gatewaySubscriptionId (`@@unique([gateway, gatewaySubscriptionId])`), PENDING_AUTH|ACTIVE|CANCELLED|FAILED, amount.
- `SaasComprobante`: mirrors `Comprobante` but `invoiceId @unique`, no paymentId/memberId, `docNro BigInt` (11-digit CUITs overflow Int32).
- `Club` += `cuit String?`, `ivaCondicion @default("CF")`.

**Rejected**: `ProviderInvoice` (commission-era lifecycle); `Comprobante` (`paymentId @unique`, non-null `clubId`). New models mirror proven `Fee`/`AutoDebit`/`Comprobante` shapes.

### D2 — Billing run

**Choice**: `GET /api/cron/saas-billing` (daily vercel.json cron; `authorizeCron`/`CRON_SECRET`), flag-gated. On `saas_billing_day` (1–28, default 1; Buenos Aires tz): per ACTIVE institution + ACTIVE subscription — plan = `pendingSaasPlanId ?? saasPlanId`, swap and clear (changes bill next cycle, no proration), skip `priceArs=0`, create invoice at plan price (dueDate +10 days). Then sweep PENDING→OVERDUE and send reminders (D6). Re-runs are no-ops via the invoice unique.

### D3 — Collection

**Choice**: `POST /api/admin/saas/institutions/[id]/autodebit` (SUPER_ADMIN) uses platform-level MP/Stripe credentials (`clubId=null` SiteConfig). MP preapproval `start_date` = next billing day (anniversary charge lands on the fixed day); Stripe `billing_cycle_anchor`. `notification_url` = `/api/webhooks/platform/mercadopago` (no `club_slug`): verify with platform secret, resolve by `external_reference`/preapproval id → `SaasAutoDebit` → find-or-create period invoice → `confirmSaasInvoice`. One-off MP: preference `external_reference` = invoiceId. Bank transfer: institution sees platform `bank_*` keys; `POST /api/admin/saas/invoices/[id]/pay` (SUPER_ADMIN only, transferRef required) confirms. Authorization URLs in-memory only (AdminAutoDebitSection precedent).
**Rejected**: synthetic slug on existing webhooks (breaks per-club secret verification).

### D4 — ARCA generalization

**Choice** (additive in `arca.ts`): `buildFecaPayload({cbteTipo, ivaRate?})` — tipo 15: `ImpTotConc`=total, Concepto 1 (unchanged); tipos 1/6: Concepto 2, `ImpNetoGravado`=total/(1+rate), `Iva` array; IVA-inclusive prices, `saas_arca_iva_rate` (default 21). `buildReciboCPayload` stays the tipo-15 wrapper (`arca.test.ts` unchanged). `emitirComprobanteSaas(invoiceId)`: `saas_arca_regime` = MONOTRIBUTO → tipo 15; RESPONSABLE_INSCRIPTO → tipo 1 if `Club.ivaCondicion='RI'` else tipo 6. Emitter = env `ARCA_CUIT`/`ARCA_CERT`/`ARCA_KEY` + platform `saas_arca_pto_vta`; recipient = `Club.cuit` (docTipo 80; missing CUIT → recorded ERROR, no emission). Reuses WSAA/WSFE plumbing, `withEmissionLock`, `buildArcaQrUrl`. Triggered post-commit from `confirmSaasInvoice` (`confirmPayment` pattern); idempotent via `invoiceId @unique`.
**Rejected**: separate module (exports private `requestTa`, churns member code); cert in SiteConfig.

### D5 — ABM screens, landing, tier alert

**Choice**: SUPER_ADMIN `/admin/saas/planes` (ABM, no delete) and `/admin/saas/suscripciones` (requests, subscriptions, invoices, enrollment); ADMIN `/admin/suscripcion` (plan, request change, MP pay). Landing `src/app/page.tsx` + `src/app/precios/page.tsx` become `dynamic='force-dynamic'` components querying active `SaasPlan` rows — pre-16 caching model (`cacheComponents` off): static prerender bakes prices at build. Tier alert: after member create (`/api/admin/members` POST + import), `checkTierAlert` resolves plan (active subscription ?? free tier), never throws, alerts via D6 email + `SmsLog`.
**Rejected**: ISR + `revalidatePath` (staleness risk, build-time DB access). Guards/nav follow existing `ctx.role`/`AdminSidebar` patterns.

### D6 — Reminder channel and cadence (spec's open question — closed)

**Choice**: Email via platform-level `resend_api_key`/`resend_from_email` with `sendEmail`, to institution `AdminUser` emails + super-admins. Cadence `saas_reminder_days` (CSV, default "1,7,15", empty=off), deduplicated by `lastReminderAt`/`remindersSent`. Resend is already wired; WhatsApp needs a platform number + template approval.

### D7 — Deactivated plan and default resolution (spec default confirmed)

Deactivated plans vanish from landing/selection; existing subscriptions/invoices unchanged (billing continues at that plan's price). No subscription → free tier: alerts only, never invoices.

## Data Flow

    Billing day: cron→flag gate→[swap pendingPlan→skip 0→create invoice (unique)]
    Auto-debit: MP/Stripe anchored charge→platform webhook→SaasAutoDebit→find-or-create invoice→confirmSaasInvoice→PAID→emitirComprobanteSaas
    One-off MP: institution panel→preference(external_reference=invoiceId)→webhook→confirm
    Bank: platform bank_* data→SUPER_ADMIN marks paid w/ ref→confirm
    Overdue: daily sweep→OVERDUE→reminders per cadence

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma`, `prisma/seed.ts` | Modify | `Saas*` models, fiscal columns, catalog seed |
| `src/lib/saas-billing.ts`, `src/lib/saas-autodebit.ts`, `src/types/saas.ts` | Create | Run/confirm/overdue/reminders/alert; enrollment/settlement; schemas |
| `src/app/api/admin/saas/**` | Create | ABM, request→approval, invoices, enrollment |
| `src/app/api/cron/saas-billing/route.ts`, `src/app/api/webhooks/platform/**` | Create | Daily run; platform webhooks |
| `src/app/admin/saas/**`, `src/app/admin/suscripcion/page.tsx` | Create | Super-admin + institution UI |
| `src/lib/arca.ts`, `src/lib/site-config.ts`, `src/app/api/admin/site-config/route.ts` | Modify | `buildFecaPayload`, `emitirComprobanteSaas`; platform reader; `saas_*` keys |
| `src/app/page.tsx`, `src/app/precios/page.tsx` | Modify | Catalog-driven pricing |
| `src/app/api/admin/members/route.ts`, `members/import/route.ts` | Modify | Tier-alert hook |
| `InstitutionForm.tsx`, `AdminSidebar.tsx`, `src/app/api/admin/institutions/[id]/route.ts`, `vercel.json` | Modify | CUIT/IVA fields, nav, cron |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (pure) | `buildFecaPayload` shapes + IVA math, regime→tipo, tier boundaries (50/51/200/201/800/801), cadence gating | `arca.test.ts` style |
| Unit (mocked Prisma) | Run idempotency, pending-swap timing, confirm/emission ordering, webhook settlement | `fees.test.ts` style |
| Component | `SaasPlanForm/List`, subscription panel | Testing Library |
| Manual | ARCA homolog smoke (both regimes, config-only); MP test preapproval | Spec criteria |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary changed; new routes reuse existing auth/cron/signature patterns.

## Migration / Rollout

One additive `prisma migrate dev` (new tables; nullable/defaulted `Club` columns; `ProviderInvoice` untouched). Ship flag-off; flip after ARCA homolog smoke. Rollback = flag off; no destructive revert.

## Open Questions

- [ ] IVA-inclusive pricing (D4 assumption) — founder confirmation.
- [ ] Latent: `Comprobante.docNro` Int32 overflows for 11-digit CUITs (member flow); `SaasComprobante` uses BigInt.
- [ ] Auto-debit amount locks at enrollment; plan changes need re-enrollment or manual gateway update.
