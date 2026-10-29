# Proposal: Platform → Institution SaaS Subscription Billing

## Intent

The platform cannot charge institutions: landing tiers are hardcoded placeholders (`src/app/page.tsx`), `ProviderInvoice` is dead data, and ARCA emission only covers member payments (Recibo C, tipo 15). Add SaaS plans and monthly platform→institution subscription billing with fiscal emission, separate from commission.

## Locked Decisions

| # | Decision |
|---|----------|
| 1 | Plans by member count: ≤50 ($0), 51–200 ($35.000/mo), 201–800 ($85.000/mo). Separate from commission. |
| 2 | Auto-debit + MercadoPago + bank transfer (super-admin marks paid manually). |
| 3 | ARCA regime configurable, build both: monotributo (Recibo C, tipo 15); responsable inscripto (Factura A/B). |
| 4 | Tier limit exceeded: alert club + super-admin; never block registration. |
| 5 | Plan change: institution requests, super-admin approves. |
| 6 | Single fixed billing day of month, all institutions. |
| 7 | Non-payment: reminders + overdue status; never cut access. |
| 8 | Auto-debit: super-admin initiates, institution authorizes via link (mirrors member flow). |

## Scope

### In Scope
- Plan catalog with super-admin ABM (create / edit / deactivate); subscription via request→approval.
- Landing prices render from the catalog — plan changes reflect on the landing immediately.
- Fixed-day monthly billing run; skip $0 tier.
- Collection: enrollment link, MercadoPago, manual bank transfer.
- Overdue status + reminders; no cutoff.
- Platform ARCA emission (both regimes), decoupled from member `Payment`.
- Non-blocking tier alert on registration; super-admin/institution screens; catalog-driven landing pricing.

### Out of Scope
- Commission system (`ProviderInvoice`, `MonthlyClosing` untouched); member auto-debit; Stripe marketplace splits; automatic cutoff; self-serve signup.

## Capabilities

### New Capabilities
- `saas-plans`: catalog CRUD (super-admin ABM), landing price reflection, assignment, request→approval changes, member-limit alerts.
- `saas-subscription-billing`: fixed-day run, invoice lifecycle, collection, overdue/reminders.
- `platform-arca-emission`: fiscal emission for subscription invoices; configurable regime.

### Modified Capabilities
- None — no spec-level change to existing capabilities; member emission unchanged.

## Approach

Additive Prisma models (plan, subscription, invoice, platform comprobante). Consume platform `site-config` keys (storable today, `clubId=null`). Generalize `src/lib/arca.ts` beyond tipo 15, keeping `emitirReciboC` intact. Cron billing run; enrollment mirrors member auto-debit; platform webhooks resolve tenancy without `?club_slug=`.

## Affected Areas

| Area | Impact |
|------|--------|
| `prisma/schema.prisma` | New — billing models |
| `src/lib/arca.ts` | Modified — regime/doc-type generalization |
| `src/app/api/admin/*`, webhooks, cron | New — billing endpoints |
| `src/app/admin/*` (super-admin) | New — plan ABM screens |
| `src/app/page.tsx` | Modified — catalog-driven pricing |
| Member registration | Modified — tier alert |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tier change mid-cycle vs fixed day | Med | Bills from next cycle (confirm) |
| First run for live institutions | Med | Bill first run post-approval |
| `Comprobante` 1:1 with `Payment`, `clubId` required | High | Separate platform model; no migration |
| Factura A vs B depends on recipient IVA condition | Med | Store institution CUIT + IVA condition |
| Webhook tenancy without `club_slug` | Med | Platform-specific route/credentials |
| Member auto-debit confusion | Low | Separate models; patterns shared |

## Rollback Plan

Gate behind `saas_billing_enabled` flag: off stops cron, hides UI. Schema additive-only; member emission untouched.

## Dependencies

- Stripe products/prices per plan (not created yet).
- Platform ARCA credentials + punto de venta; institution CUIT/IVA.
- MP preapproval credentials.

## Success Criteria

- [ ] Fixed-day run invoices all subscribed paid institutions; $0 skipped.
- [ ] All three collection methods work, incl. manual bank transfer.
- [ ] Both ARCA regimes emit in test via config only.
- [ ] Tier alerts fire; registration succeeds.
- [ ] Plan change works end-to-end; overdue keeps access.
- [ ] Member Recibo C regression-free.
