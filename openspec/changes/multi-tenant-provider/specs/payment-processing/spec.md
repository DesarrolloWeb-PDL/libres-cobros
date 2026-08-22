# Delta for Payment Processing

## MODIFIED Requirements

### Requirement: Per-club payment credentials

Payment credentials SHALL be stored per club (SiteConfig with composite `[clubId, key]`: Stripe keys, MercadoPago tokens, bank info). Checkout SHALL use the credentials of the club that owns the fee.
(Previously: single global credentials in SiteConfig.)

#### Scenario: Checkout uses club credentials

- GIVEN clubs A and B with different Stripe keys
- WHEN a member of club A pays a fee of club A via Stripe
- THEN the system SHALL create the Stripe session with club A's key and SHALL NOT use club B's.

### Requirement: Club-scoped checkout

Checkout SHALL receive the club context (club slug) and SHALL validate that the member DNI exists in that club and that the fee belongs to that club.
(Previously: "Creación de checkout" — global DNI lookup.)

#### Scenario: Fee from another club

- GIVEN a fee of club B
- WHEN a member of club A tries to pay that fee via club A's checkout
- THEN the system SHALL reject the request with 409 and create no payment.

#### Scenario: DNI not in club

- GIVEN a DNI registered only in club B
- WHEN a member submits that DNI at club A's checkout
- THEN the system SHALL return 404, never revealing club B's member.

### Requirement: Webhooks routed per club

Webhook events SHALL identify their club (Stripe via metadata `clubSlug`; MercadoPago via a club parameter) and the system SHALL verify each event against that club's webhook secret / access token before processing.
(Previously: "Webhook de Stripe" / "Webhook de MercadoPago" — single shared credentials.)

#### Scenario: Stripe event for club A

- GIVEN a Stripe `checkout.session.completed` event with metadata clubSlug=club-a and a valid signature for club A's webhook secret
- WHEN the webhook endpoint processes it
- THEN the system SHALL confirm the payment, mark the fee PAID, and run commission logic for club A.

#### Scenario: Unknown club slug

- GIVEN a webhook event with clubSlug=unknown-club
- WHEN the webhook endpoint processes it
- THEN the system SHALL respond 401 and SHALL NOT modify any state.

#### Scenario: Invalid signature

- GIVEN a webhook request without a valid signature for the identified club's secret
- WHEN the system receives it
- THEN the system SHALL respond 401 and SHALL NOT modify any state.

#### Scenario: MercadoPago notification per club

- GIVEN an IPN notification routed with club-slug=club-b
- WHEN the system fetches the payment status with club B's access token and the payment is approved
- THEN the system SHALL mark payment and fee PAID and run commission logic for club B.

#### Scenario: Duplicate webhook

- GIVEN a payment already PAID in club A
- WHEN the same Stripe event arrives again
- THEN the system SHALL respond success without creating duplicate commissions or changing state.

### Requirement: Bank transfer with per-club bank info

The system SHALL return bank transfer information (alias, CBU, CUIT, bank name, account holder) from the club's own SiteConfig.
(Previously: global bank info in SiteConfig.)

#### Scenario: Club-specific bank info

- GIVEN clubs A and B with different CBU values
- WHEN a member of club A selects bank transfer
- THEN the response SHALL contain club A's CBU and alias.
