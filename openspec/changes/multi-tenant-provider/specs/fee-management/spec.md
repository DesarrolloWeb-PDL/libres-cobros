# Delta for Fee Management

## MODIFIED Requirements

### Requirement: FeeConfig per club

The system SHALL keep one active fee amount per category per club (`[clubId, category]` composite), so the same category MAY have different amounts in different clubs.
(Previously: "Configuración de montos por categoría" — single global amount per category.)

#### Scenario: Update amount in one club only

- GIVEN club A ADULT amount `5000` and club B ADULT amount `7000`
- WHEN an administrator of club A updates ADULT to `5500`
- THEN club A SHALL use `5500` for future fees and club B SHALL keep `7000`.

#### Scenario: FeeConfig isolation

- GIVEN a FeeConfig for ADULT in club A and none in club B
- WHEN club B queries its FeeConfigs
- THEN the system SHALL return an empty list, never club A's config.

### Requirement: Club-scoped monthly fee generation

The system SHALL generate monthly fees per club: the generation cron SHALL iterate over clubs and generate fees for each club's active members using that club's FeeConfigs.
(Previously: "Generación mensual de cuotas" — single global generation.)

#### Scenario: Generation across clubs

- GIVEN clubs A and B with active members and their own FeeConfigs
- WHEN the fee generation cron runs for month 09/2026
- THEN the system SHALL create one Fee per active member per club, each with its club's amount.

#### Scenario: New club starts current period

- GIVEN a club created in month 09/2026
- WHEN generation runs for 09/2026
- THEN the system SHALL create fees for 09/2026 only, with no historical periods.

#### Scenario: Idempotent per club

- GIVEN fees already generated for club A for 09/2026
- WHEN generation runs again for 09/2026
- THEN the system SHALL skip duplicates for club A and report zero new fees.

### Requirement: Fees tied to club

Every Fee SHALL carry the clubId of its member's club, and fee queries SHALL be scoped by clubId.

#### Scenario: Fee of another club not visible

- GIVEN a fee of club B
- WHEN club A queries fees for a period
- THEN the system SHALL return an empty result, not club B's fee.
