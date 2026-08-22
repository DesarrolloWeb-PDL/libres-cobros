# Club Management Specification

## Purpose

Provider-side management of the clubs that run on the platform: create and configure clubs (name, slug, billing terms, status), manage club ADMIN users, switch between clubs, and view per-club collections and commissions owed. Onboarding is provider-managed only — there is no public signup.

## Data Model

See `Club` (name, slug, commissionType, commissionValue, status), `AdminUser` (role, clubId), `SiteConfig` (clubId) and `ProviderInvoice` in the corresponding specifications.

## Requirements

### Requirement: Club CRUD by SUPER_ADMIN

Only SUPER_ADMIN users SHALL create, update, or deactivate clubs. Each club SHALL have a unique slug, a name, a commissionType (`PERCENTAGE` | `FIXED`), a commissionValue, and a status.

#### Scenario: Create club

- GIVEN a SUPER_ADMIN user
- WHEN they create a club with name "Club Atlético", slug "club-atletico", commissionType `PERCENTAGE` and commissionValue `5`
- THEN the system SHALL persist the club with status `ACTIVE` and expose it in the provider dashboard.

#### Scenario: Duplicate slug

- GIVEN an existing club with slug "club-atletico"
- WHEN a SUPER_ADMIN creates a second club with the same slug
- THEN the system SHALL reject the operation with error 409.

#### Scenario: Deactivate club

- GIVEN an ACTIVE club with members and fees
- WHEN a SUPER_ADMIN deactivates it
- THEN the system SHALL set status `INACTIVE`, keep all historical data, and the club SHALL no longer appear in the member portal.

### Requirement: Billing configuration validation

`Club.commissionType` and `Club.commissionValue` SHALL be the source of truth for billing. `PERCENTAGE` SHALL be validated as 0–100; `FIXED` SHALL be a non-negative monthly amount.

#### Scenario: Invalid percentage

- GIVEN a SUPER_ADMIN editing a club with commissionType `PERCENTAGE`
- WHEN they set commissionValue to `120`
- THEN the system SHALL reject the value with a validation error.

### Requirement: ADMIN user creation per club

SUPER_ADMIN SHALL create club ADMIN users with email and password; ADMIN users SHALL NOT create users.

#### Scenario: Create club admin

- GIVEN a SUPER_ADMIN and an ACTIVE club
- WHEN they create an ADMIN user with email "admin@club-atletico.com" and a password
- THEN the system SHALL persist the user with role `ADMIN` and the clubId of that club.

#### Scenario: Duplicate email

- GIVEN an existing AdminUser with email "admin@club-atletico.com"
- WHEN a SUPER_ADMIN creates another user with the same email
- THEN the system SHALL reject the operation with error 409.

#### Scenario: ADMIN cannot create users

- GIVEN an ADMIN user of a club
- WHEN they attempt to create another ADMIN user
- THEN the system SHALL deny the operation with 403.

### Requirement: Club switcher

ADMIN users SHALL see a club switcher listing only their own club; SUPER_ADMIN SHALL switch among all clubs.

#### Scenario: SUPER_ADMIN switches club

- GIVEN a SUPER_ADMIN with access to clubs A and B
- WHEN they switch to club B
- THEN all subsequent scoped views SHALL show club B data only.

#### Scenario: ADMIN sees own club only

- GIVEN an ADMIN of club A
- WHEN they open the club switcher
- THEN the switcher SHALL list only club A.

### Requirement: Provider dashboard

SUPER_ADMIN SHALL see per-club collected amounts, commissions owed, and club status in one overview.

#### Scenario: Club with no data

- GIVEN a newly created club with no payments
- WHEN the provider views the dashboard
- THEN the club SHALL show zero collections and zero commissions.

### Requirement: No hard delete of clubs with data

Clubs with associated records SHALL NOT be hard-deleted; they SHALL only be deactivated.

#### Scenario: Delete attempt

- GIVEN a club with members and payments
- WHEN a SUPER_ADMIN attempts to delete it
- THEN the system SHALL reject the deletion and offer deactivation instead.

### Requirement: New club starts current period from zero

A new club SHALL have no historical fees or payments; fee generation SHALL begin with the current period.

#### Scenario: Generation for new club

- GIVEN a club created in August 2026
- WHEN monthly fee generation runs
- THEN the system SHALL create fees only for the current period and none for prior months.
