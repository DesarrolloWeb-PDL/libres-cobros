# Delta for Admin Dashboard

## MODIFIED Requirements

### Requirement: Role-based access

The system SHALL grant access to `/admin` to roles `ADMIN` and `SUPER_ADMIN` only, and SHALL scope every view and API to the caller's clubId (ADMIN) or to any club (SUPER_ADMIN).

#### Scenario: ADMIN scoped to own club

- GIVEN an ADMIN of club A and data in clubs A and B
- WHEN the ADMIN opens the dashboard
- THEN every stat and list SHALL reflect club A data only.

#### Scenario: SUPER_ADMIN full access

- GIVEN a SUPER_ADMIN
- WHEN they open the dashboard
- THEN the system SHALL show the provider overview aggregating all clubs.

#### Scenario: Unauthorized role

- GIVEN a request to `/admin` without a valid ADMIN/SUPER_ADMIN session
- WHEN the middleware evaluates it
- THEN the system SHALL redirect to login and serve no data.

### Requirement: Club-scoped statistics

Dashboard stat cards (members, pending fees, overdue fees, month payments, month commissions) SHALL be computed within the caller's club scope.
(Previously: "Vista de estadísticas" — global stats.)

#### Scenario: Stats per club

- GIVEN club A with 50 members and club B with 200 members
- WHEN an ADMIN of club A opens `/admin`
- THEN the stats SHALL show club A's totals (50 members), not club B's.

### Requirement: Club-scoped member list

The system SHALL list and filter members (name, DNI, category, status) within the caller's club scope.
(Previously: "Listado de socios con filtros" — global list.)

#### Scenario: Filter by category within club

- GIVEN FAMILY members in clubs A and B
- WHEN an ADMIN of club A selects the `FAMILY` filter
- THEN the list SHALL show only club A's FAMILY members.

#### Scenario: Search by DNI within club

- GIVEN a member with DNI `12345678` in club A
- WHEN an ADMIN of club A searches `12345678`
- THEN the list SHALL show only that member.

### Requirement: Club switcher

The admin UI SHALL provide a club switcher. ADMIN SHALL see only their own club; SUPER_ADMIN SHALL switch among all clubs, persisting the selection for scoped views.

#### Scenario: SUPER_ADMIN switches club

- GIVEN a SUPER_ADMIN viewing club A
- WHEN they switch to club B
- THEN all subsequent lists and stats SHALL show club B.

## ADDED Requirements

### Requirement: Provider overview

The system SHALL show SUPER_ADMIN a provider dashboard with per-club cards: collected amounts, commissions owed, and club status.

#### Scenario: Provider overview with two clubs

- GIVEN clubs A and B with different collected amounts and commission types
- WHEN a SUPER_ADMIN opens the provider overview
- THEN the system SHALL show one card per club with its collected amount, commissions owed, and status.

### Requirement: Club management pages

The system SHALL provide club CRUD and club ADMIN user management pages, accessible to SUPER_ADMIN only.

#### Scenario: SUPER_ADMIN opens club list

- GIVEN a SUPER_ADMIN
- WHEN they open `/admin/clubes`
- THEN the system SHALL list all clubs with billing config and status.

#### Scenario: ADMIN blocked from club pages

- GIVEN an ADMIN user
- WHEN they request a club management page
- THEN the system SHALL deny access, never listing clubs.
