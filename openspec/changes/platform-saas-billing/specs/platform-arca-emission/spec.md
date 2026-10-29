# Platform ARCA Emission Specification

## Purpose

ARCA fiscal emission for platform subscription invoices under a configurable dual regime — monotributo (Recibo C, tipo 15) and responsable inscripto (Factura A/B) — decoupled from the member payment emission flow (`Comprobante`, Recibo C), which remains unchanged.

## Requirements

### Requirement: Configurable dual regime

The emission regime SHALL be configuration-driven, never hardcoded. Switching regimes SHALL change emission behavior without code changes; later operational changes SHALL only fill credentials or data.

#### Scenario: Monotributo regime emits Recibo C

- GIVEN platform ARCA configuration set to monotributo
- WHEN a paid subscription invoice is emitted
- THEN the fiscal document SHALL be Recibo C, tipo 15.

#### Scenario: Responsable inscripto regime emits Factura A/B

- GIVEN platform ARCA configuration set to responsable inscripto
- WHEN the same invoice is emitted
- THEN the fiscal document SHALL be Factura A or Factura B per the recipient's IVA condition.

### Requirement: Factura type depends on recipient IVA condition

Under responsable inscripto, the recipient institution's IVA condition SHALL determine the document type: Factura A for responsable inscripto recipients; Factura B for final consumers, monotributo, or exempt recipients.

#### Scenario: Factura A for responsable inscripto recipient

- GIVEN a recipient institution with IVA condition responsable inscripto
- WHEN its invoice is emitted under responsable inscripto
- THEN a Factura A SHALL be issued.

#### Scenario: Factura B for non-registered recipient

- GIVEN a recipient institution whose IVA condition is not responsable inscripto
- WHEN its invoice is emitted under responsable inscripto
- THEN a Factura B SHALL be issued.

### Requirement: Institution fiscal data

Each institution SHALL store CUIT and IVA condition, required as recipient data for Factura A/B.

#### Scenario: Missing fiscal data blocks emission

- GIVEN an institution with no CUIT stored
- WHEN emission under responsable inscripto is attempted
- THEN the system SHALL NOT emit and SHALL report the missing fiscal data.

### Requirement: Decoupled from member emission

Platform fiscal documents SHALL be a separate entity from the member `Comprobante`, which is 1:1 with member `Payment`. The member Recibo C flow SHALL remain regression-free.

#### Scenario: Member emission unchanged

- GIVEN a confirmed member payment
- WHEN member emission runs
- THEN behavior SHALL be identical to the pre-change member flow (Recibo C, tipo 15, idempotent per payment).

### Requirement: Emission idempotency and failure handling

Emission SHALL be idempotent per invoice, and emission failures SHALL be recorded without altering the invoice's payment status.

#### Scenario: Idempotent per invoice

- GIVEN a paid invoice already emitted
- WHEN emission is triggered again
- THEN no duplicate fiscal document SHALL be created.

#### Scenario: ARCA rejection recorded

- GIVEN an emission attempt rejected by ARCA
- WHEN the failure is processed
- THEN the attempt SHALL be recorded in error state with the ARCA response
- AND the invoice's paid status SHALL NOT be altered.

### Requirement: Test-environment emission via configuration only

Both regimes SHALL be exercisable against ARCA's test environment using configuration alone.

#### Scenario: Regime switch in test

- GIVEN test credentials configured for both regimes
- WHEN the configuration points to either regime
- THEN emission SHALL succeed in the test environment without code changes.
