# Delta for Reporting and Export

## MODIFIED Requirements

### Requirement: Club-scoped debt report

The debt report SHALL be scoped to the caller's club; SUPER_ADMIN SHALL be able to filter by club.
(Previously: "Reporte de deudas" — global.)

#### Scenario: ADMIN debt report

- GIVEN 50 club A members with pending/overdue fees and 30 club B members with the same
- WHEN an ADMIN of club A requests the debt report
- THEN the system SHALL list only club A members and totals.

#### Scenario: SUPER_ADMIN filters by club

- GIVEN debts in clubs A and B
- WHEN a SUPER_ADMIN requests the report with club filter club-b
- THEN the report SHALL contain only club B rows.

#### Scenario: No debts

- GIVEN all club A members with paid fees
- WHEN the ADMIN requests the debt report
- THEN the system SHALL show an empty list or a "no debts" message.

### Requirement: Club-scoped payment history

The payment report SHALL respect the club scope in addition to date, method, and member filters.
(Previously: "Historial de pagos" — global.)

#### Scenario: Payment report per club

- GIVEN stripe payments in clubs A and B
- WHEN an ADMIN of club A filters by method stripe
- THEN the report SHALL contain only club A stripe payments.

### Requirement: Club-scoped commission report

The commission report SHALL be scoped by club and filterable by period, method, and member.
(Previously: "Reporte de comisiones" — global.)

#### Scenario: Commission report per club

- GIVEN commissions in clubs A and B for 09/2026
- WHEN an ADMIN of club A requests the report for that period
- THEN the system SHALL show only club A's totals and detail.

### Requirement: Club-scoped export

Exports (.xlsx) SHALL respect the club scope and the active filters; the file name SHALL include the report type, club slug (when scoped), and generation date.
(Previously: "Exportación a Excel" — global.)

#### Scenario: Export scoped to club

- GIVEN a debt report for club A with filters applied
- WHEN an ADMIN of club A exports it
- THEN the file SHALL contain only club A rows and totals.

#### Scenario: Empty export

- GIVEN a report with no results
- WHEN the ADMIN exports it
- THEN the system SHALL generate an .xlsx with headers and no data rows.
