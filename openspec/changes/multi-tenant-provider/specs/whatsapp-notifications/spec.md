# Delta for WhatsApp Notifications

## MODIFIED Requirements

### Requirement: Per-club WhatsApp credentials

WhatsApp credentials (phone number ID, access token, template name) SHALL be stored per club in SiteConfig (`[clubId, key]`), and each send SHALL use the member's club credentials.
(Previously: "Integración con Meta Cloud API" — single global credentials.)

#### Scenario: Send uses club credentials

- GIVEN clubs A and B with different phone number IDs and tokens
- WHEN the system sends a reminder to a club A member
- THEN the API call SHALL use club A's phone number ID and token, and the log SHALL record club A's context.

#### Scenario: Phone not registered

- GIVEN a club A member without a phone
- WHEN the system tries to send a reminder
- THEN the system SHALL skip the send and log FAILED with "phone missing".

### Requirement: Per-club template rendering

The reminder template SHALL render with the member's club bank info (alias and CBU from that club's SiteConfig).
(Previously: "Plantilla de recordatorio" — global alias/CBU.)

#### Scenario: Club-specific alias and CBU

- GIVEN clubs A and B with different CBU values
- WHEN the system sends a reminder to a club A member
- THEN the message SHALL include club A's alias and CBU.

### Requirement: Club-scoped bulk send

Bulk reminder sends SHALL operate on members of the caller's club only, honoring fee status, category, and period filters within that club.
(Previously: "Envío masivo" — global member set.)

#### Scenario: Bulk send scoped to club

- GIVEN 150 club A members and 100 club B members with pending/overdue fees
- WHEN an ADMIN of club A runs bulk send
- THEN the system SHALL process only club A members, in batches, with a progress counter.

#### Scenario: No recipients

- GIVEN no club A members with phone and pending fees
- WHEN an ADMIN of club A runs bulk send
- THEN the system SHALL warn and make no API calls.

### Requirement: Per-club delivery log

Every send attempt SHALL log the member's clubId, type, status, and error when present.
(Previously: "Registro de entregas" — no club context.)

#### Scenario: API failure logged with club

- GIVEN a Meta API error when sending to a club A member
- WHEN the send attempt completes
- THEN the system SHALL log status FAILED with club A's id and the API error message.
