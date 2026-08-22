# Delta for Commission System

## MODIFIED Requirements

### Requirement: Per-club commission rate

The commission rate SHALL come from the club's billing config (`Club.commissionType` + `Club.commissionValue`), not from a global SiteConfig key. `PERCENTAGE` clubs SHALL use commissionValue as the percentage rate.
(Previously: "Tasa configurable global" — single global rate in SiteConfig.)

#### Scenario: Club rate change

- GIVEN club A with `PERCENTAGE` rate `5` and club B with rate `10`
- WHEN a SUPER_ADMIN updates club A's commissionValue to `6`
- THEN only club A's future confirmed payments SHALL be charged at `6%`; club B SHALL keep `10%`.

### Requirement: Commission calculation at payment confirm

For `PERCENTAGE` clubs the system SHALL compute and persist a Commission at payment confirmation: amount = round(payment.amount × club rate) / 100. For `FIXED` clubs the system SHALL NOT create a per-payment Commission.
(Previously: "Cálculo al confirmar pago" — global rate.)

#### Scenario: Percentage calculation

- GIVEN a payment of `5000` confirmed in a `PERCENTAGE` club with rate `5`
- WHEN the system processes the confirmation
- THEN the system SHALL create a Commission with amount `250` and rate `5`.

#### Scenario: Fixed club generates no commission

- GIVEN a payment confirmed in a `FIXED` club
- WHEN the system processes the confirmation
- THEN the system SHALL mark payment and fee PAID and SHALL NOT create a Commission.

#### Scenario: Rate snapshot

- GIVEN a payment confirmed in club A at rate `5`
- WHEN club A's rate is later changed
- THEN the existing Commission SHALL keep the `5` snapshot.

### Requirement: Monthly closing per club

MonthlyClosing SHALL be unique per club and period (`[clubId, month, year]`). Closing SHALL aggregate only that club's commissions of the period.
(Previously: "Cierre mensual" — one global closing per month/year.)

#### Scenario: Closing per club

- GIVEN club A with 20 commissions and club B with 5 commissions in 09/2026
- WHEN an administrator closes 09/2026 for club A
- THEN the system SHALL create a CLOSED MonthlyClosing for club A with only its 20 commissions and totals.

#### Scenario: Re-closing rejected

- GIVEN a CLOSED MonthlyClosing for club A, 09/2026
- WHEN an administrator tries to close the same period for club A again
- THEN the system SHALL reject with error 409.

#### Scenario: Two clubs, same month

- GIVEN club A closing 09/2026
- WHEN club B closes 09/2026
- THEN the system SHALL allow both closings independently.

### Requirement: ProviderInvoice for FIXED clubs

At monthly closing of a `FIXED` club, the system SHALL auto-generate a ProviderInvoice for the month being closed, with amount equal to the club's commissionValue, recorded only (no in-app collection).

#### Scenario: Invoice at close

- GIVEN a `FIXED` club with commissionValue `10000` and an OPEN MonthlyClosing for 09/2026
- WHEN the closing for 09/2026 is closed
- THEN the system SHALL create a ProviderInvoice for that club, month 09, year 2026, amount `10000`, with status recorded as issued/unpaid.

#### Scenario: Invoice generated once

- GIVEN a ProviderInvoice already exists for club A, 09/2026
- WHEN the closing of 09/2026 is closed again
- THEN the system SHALL NOT create a second invoice.

### Requirement: Per-club commission report

The system SHALL report commissions per club, period, method, and member.
(Previously: "Reporte de comisiones" — global.)

#### Scenario: Report filtered by club

- GIVEN commissions in clubs A and B
- WHEN an administrator requests club A's commission report
- THEN the system SHALL show only club A's totals and detail.
