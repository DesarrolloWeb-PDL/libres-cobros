# Migration and Backfill Specification

## Purpose

Convert the current single-club production data into the multi-tenant model without data loss: create the default club "Club Libres", assign every existing row to it, switch global uniques to per-club composites, and promote the existing administrator to SUPER_ADMIN.

## Requirements

### Requirement: Default club creation

The migration SHALL create a default club named "Club Libres" whose billing config is derived from the current global `commission_rate` SiteConfig value.

#### Scenario: Rate-based default config

- GIVEN a global commission_rate of `5`
- WHEN migration step 1 runs
- THEN the system SHALL create club "Club Libres" with commissionType `PERCENTAGE`, commissionValue `5`, status ACTIVE, and a slug derived from the name.

### Requirement: Backfill to default club

The migration SHALL assign the default club's clubId to every existing Member, FeeConfig, Fee, Payment, Commission, MonthlyClosing, WhatsAppLog, and SiteConfig row; no row SHALL be left with a null clubId.

#### Scenario: Backfill completes with no nulls

- GIVEN production rows across all affected tables
- WHEN the backfill script runs
- THEN every backfilled row SHALL have the default club's id and the pre-migration row counts SHALL be unchanged.

### Requirement: Constraint switch

After backfill, the migration SHALL set clubId NOT NULL and SHALL replace global uniques with composite uniques (`[clubId,dni]`, `[clubId,email]`, `[clubId,category]`, `[clubId,month,year]`, `[clubId,key]`).

#### Scenario: Composite unique enforced

- GIVEN two members with the same DNI in different clubs after migration
- WHEN the schema constraint is applied
- THEN the constraint SHALL accept them, and SHALL reject a duplicate DNI within the same club.

### Requirement: Existing admin promotion

The migration SHALL promote the existing administrator to SUPER_ADMIN so the provider can manage all clubs.

#### Scenario: Admin becomes SUPER_ADMIN

- GIVEN an existing AdminUser admin@libres.com with role ADMIN
- WHEN the migration runs
- THEN the user SHALL have role SUPER_ADMIN and no clubId restriction.

### Requirement: Rollback

The migration SHALL provide a reverse migration restoring the global-unique schema and nullable clubId, and demoting SUPER_ADMIN to ADMIN.

#### Scenario: Rollback restores prior state

- GIVEN a database backed up before migration
- WHEN the reverse migration runs
- THEN global uniques SHALL be restored, clubId SHALL be nullable, and the admin SHALL be ADMIN again.

### Requirement: Verification parity

The migration SHALL verify row-count parity per table before and after backfill.

#### Scenario: Parity check passes

- GIVEN the pre-migration row counts recorded per table
- WHEN the migration completes
- THEN the post-migration counts SHALL match exactly, and the script SHALL fail loudly on any mismatch.
