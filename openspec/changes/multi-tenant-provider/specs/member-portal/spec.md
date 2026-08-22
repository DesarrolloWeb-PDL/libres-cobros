# Delta for Member Portal

## MODIFIED Requirements

### Requirement: Club-scoped access by DNI

The system SHALL serve the portal per club at `/pagos/[club-slug]`; DNI lookup SHALL be scoped to that club.
(Previously: "Acceso por DNI" — single `/pagos` with global DNI lookup.)

#### Scenario: Access with valid slug

- GIVEN a member with DNI `12345678` in club A, slug `club-a`
- WHEN the member enters their DNI at `/pagos/club-a`
- THEN the system SHALL show their pending fees and recent history.

#### Scenario: Unknown or inactive club slug

- GIVEN a slug that does not match an ACTIVE club
- WHEN a user opens `/pagos/<slug>`
- THEN the system SHALL return 404 without any DNI lookup.

#### Scenario: DNI not registered in this club

- GIVEN a DNI registered only in club B
- WHEN a user enters that DNI at `/pagos/club-a`
- THEN the system SHALL show "member not found" without revealing the DNI exists in club B.

### Requirement: Legacy /pagos redirect

The legacy `/pagos` route SHALL NOT perform a DNI lookup (ambiguous across clubs); it SHALL redirect to a club directory page listing ACTIVE clubs.

#### Scenario: Redirect to club directory

- GIVEN two ACTIVE clubs
- WHEN a user opens `/pagos`
- THEN the system SHALL redirect to a page where the user selects their club before entering a DNI.

### Requirement: Club-scoped checkout confirmation

Checkout and confirmation URLs SHALL include the club slug so success/failure screens resolve within the club context.
(Previously: "Inicio de pago" / "Pantalla de confirmación" — club-agnostic URLs.)

#### Scenario: Confirmation after Stripe payment

- GIVEN a confirmed payment for a fee of club A
- WHEN the member returns to the portal from Stripe
- THEN the system SHALL show the receipt for club A's fee with the correct amount, date, and method.

#### Scenario: Paid fee cannot be selected

- GIVEN a fee in state PAID in club A
- WHEN the member tries to pay it
- THEN the system SHALL disable payment for that fee and show it as paid.

#### Scenario: WhatsApp link prefills DNI

- GIVEN a WhatsApp link with `?dni=12345678` for club A
- WHEN the member opens `/pagos/club-a`
- THEN the system SHALL prefill the DNI field only if the DNI exists in club A.
