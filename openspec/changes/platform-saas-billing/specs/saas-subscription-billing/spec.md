# SaaS Subscription Billing Specification

## Purpose

Monthly platform→institution subscription billing on one fixed day of the month, with three collection methods (auto-debit, MercadoPago, manually confirmed bank transfer), an invoice lifecycle with overdue status and reminders, and no automatic access cutoff on non-payment. The ARS 0 plan generates no invoices.

## Requirements

### Requirement: Single fixed billing day

All institutions SHALL be billed on one configurable fixed day of the month, regardless of subscription start date.

#### Scenario: Fixed-day run

- GIVEN institutions with active paid-tier subscriptions
- WHEN the configured billing day arrives
- THEN the run SHALL generate one invoice per institution at its plan's current price.

### Requirement: Free tier skipped

Institutions on the ARS 0 plan SHALL be skipped by billing runs; no invoice SHALL be generated.

#### Scenario: Free tier produces no invoice

- GIVEN an institution on the free plan (up to 50 members)
- WHEN a billing run executes
- THEN no invoice SHALL be created for that institution.

### Requirement: First billing of already-live institutions

Institutions already live when their subscription is approved SHALL be billed on the first fixed-day run after approval, with no grace period.

#### Scenario: First run after approval

- GIVEN a live institution whose subscription was approved mid-month
- WHEN the next fixed billing day arrives
- THEN an invoice SHALL be generated at the current plan price, with no waiting period.

### Requirement: Approved plan change applies next cycle

A plan change approved mid-cycle SHALL take effect on the next billing cycle. The current cycle SHALL NOT be prorated.

#### Scenario: No proration

- GIVEN an institution on the ARS 35,000 plan with an approved change to ARS 85,000 effective mid-cycle
- WHEN the next billing run executes
- THEN the invoice SHALL be ARS 85,000
- AND no proration adjustment SHALL be issued for the current cycle.

### Requirement: Three collection methods

The system SHALL support: (a) auto-debit — the super-admin initiates enrollment and the institution authorizes via a link, mirroring the member preapproval/subscription flow; (b) MercadoPago one-off payment; (c) bank transfer, confirmed manually by the super-admin.

#### Scenario: Auto-debit enrollment

- GIVEN a super-admin who initiates auto-debit enrollment for an institution
- WHEN the institution authorizes via the link
- THEN auto-debit SHALL be active
- AND subsequent billing runs SHALL charge that institution automatically.

#### Scenario: Auto-debit charge failure

- GIVEN an active auto-debit whose charge fails
- WHEN the billing run processes the institution
- THEN the invoice SHALL remain unpaid and SHALL enter the overdue/reminder flow.

#### Scenario: MercadoPago payment

- GIVEN a pending invoice offering MercadoPago
- WHEN the institution pays through MercadoPago
- THEN the invoice SHALL be marked PAID.

#### Scenario: Bank transfer confirmed manually

- GIVEN an institution that transferred payment for a pending invoice
- WHEN the super-admin marks the invoice paid with the transfer reference
- THEN the invoice SHALL be marked PAID
- AND only a super-admin SHALL be able to confirm a bank transfer.

### Requirement: Overdue status and reminders without cutoff

Unpaid invoices past their due date SHALL be marked OVERDUE and SHALL receive reminders. Non-payment SHALL NEVER automatically cut institution access or the club's member-payment portal.

#### Scenario: Overdue keeps access

- GIVEN an institution with an invoice 30 days overdue
- WHEN its status is evaluated
- THEN the invoice SHALL be OVERDUE
- AND the institution's admin screens and member-payment portal SHALL remain fully functional.

#### Scenario: Reminder cadence is configurable

- GIVEN an overdue invoice
- WHEN the reminder schedule runs
- THEN reminders SHALL be issued per a configurable cadence and channel.

## Open Questions for Design

- Reminder channel and cadence (email vs WhatsApp; day 1/7/15) — undecided; this spec intentionally does not fix them.
