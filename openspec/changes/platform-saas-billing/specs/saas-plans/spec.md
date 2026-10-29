# SaaS Plans Specification

## Purpose

Define the platform's subscription plan catalog for institutions: plans tiered by member count with monthly prices, super-admin management (create / edit / deactivate), catalog-driven landing pricing, institution plan assignment via request→approval, and non-blocking tier limit alerts. Plan pricing is entirely separate from the club commission system (PERCENTAGE/FIXED).

## Requirements

### Requirement: Plan catalog tiered by member count

The system SHALL maintain a plan catalog where each plan defines a member-count range and a monthly price in ARS. The initial catalog SHALL cover: up to 50 members (ARS 0, free), 51–200 (ARS 35,000/month), 201–800 (ARS 85,000/month).

#### Scenario: Tier resolved by member count

- GIVEN the initial catalog
- WHEN an institution with 120 members resolves its plan
- THEN the applicable plan SHALL be the 51–200 tier at ARS 35,000/month.

#### Scenario: Free tier boundary

- GIVEN an institution with exactly 50 members
- WHEN its plan is resolved
- THEN it SHALL be the free plan (ARS 0).

### Requirement: Super-admin plan management

Plans SHALL be created, edited, and deactivated by SUPER_ADMIN only. Hard deletion SHALL NOT be offered; deactivation SHALL be the removal mechanism.

#### Scenario: Plan edit

- GIVEN an authenticated super-admin
- WHEN the 51–200 plan price is edited to ARS 40,000
- THEN the catalog SHALL reflect the new price.

#### Scenario: Deactivation removes plan from selection

- GIVEN a deactivated plan
- WHEN plans are listed on the landing or offered for new assignments
- THEN the deactivated plan SHALL NOT appear, and existing subscriptions and invoices SHALL remain unchanged.

### Requirement: Landing prices render from the catalog

The public landing pricing section SHALL render from the live plan catalog. A plan edit MUST be reflected on the landing without a code deployment.

#### Scenario: Plan edit reflects immediately

- GIVEN the landing renders catalog prices
- WHEN a super-admin edits a plan price
- THEN the landing SHALL display the new price on its next render, with no deployment required.

### Requirement: Separation from the commission system

Plan pricing SHALL NOT read from or write to the club commission configuration (PERCENTAGE/FIXED). The two systems SHALL remain independent.

#### Scenario: No cross-contamination

- GIVEN a club with commission type PERCENTAGE at 5%
- WHEN its plan price is edited
- THEN the club's commission configuration SHALL remain PERCENTAGE 5%.

### Requirement: Institution plan assignment via request and approval

Each institution SHALL have at most one active plan subscription. Plan changes SHALL follow request→approval: the institution requests, the super-admin approves.

#### Scenario: Approved plan change

- GIVEN an institution subscribed to the 51–200 plan
- WHEN the institution requests the 201–800 plan and a super-admin approves
- THEN the subscription SHALL move to the 201–800 plan effective the next billing cycle.

#### Scenario: Unapproved request

- GIVEN a pending plan-change request
- WHEN no super-admin approves it
- THEN the subscription SHALL remain on the current plan.

### Requirement: Non-blocking tier limit alerts

When a member registration pushes an institution above its plan's member limit, the system SHALL alert the club and the super-admin, and SHALL NOT block the registration.

#### Scenario: Registration above limit

- GIVEN a club on the 51–200 plan with 200 members
- WHEN the 201st member registers
- THEN registration SHALL succeed
- AND alerts SHALL be issued to the club and the super-admin.

#### Scenario: Above the highest tier

- GIVEN a club on the 201–800 plan with 800 members
- WHEN the 801st member registers
- THEN registration SHALL succeed and an alert SHALL be issued; no plan migration SHALL be forced.
