# Delta for Member Registry

## MODIFIED Requirements

### Requirement: Club-scoped DNI uniqueness

The system SHALL guarantee that each DNI is unique within a club (`[clubId, dni]` composite) and SHALL allow the same DNI in different clubs.
(Previously: "Unicidad del DNI" — DNI unique across the whole system.)

#### Scenario: Duplicate DNI in same club

- GIVEN a member with DNI `12345678` in club A
- WHEN an administrator tries to create another member with the same DNI in club A
- THEN the system SHALL reject the operation with error 409.

#### Scenario: Same DNI in another club

- GIVEN a member with DNI `12345678` in club A
- WHEN an administrator of club B creates a member with DNI `12345678`
- THEN the system SHALL accept the creation, because the DNI is unique per club.

#### Scenario: Cross-club lookup returns empty

- GIVEN a club A member with DNI `12345678` and no member with that DNI in club B
- WHEN club B queries members by DNI `12345678`
- THEN the system SHALL return an empty result, never club A's member.

### Requirement: Club-scoped member CRUD

The system SHALL scope all member create/read/update operations to the caller's club. ADMIN users SHALL only access members of their own club; SUPER_ADMIN SHALL access members of any club.
(Previously: "ABM de socios" — global member management.)

#### Scenario: ADMIN reads own club only

- GIVEN an ADMIN of club A and members in clubs A and B
- WHEN the ADMIN lists members
- THEN the system SHALL return only club A members.

#### Scenario: ADMIN accesses foreign member

- GIVEN an ADMIN of club A and the id of a club B member
- WHEN the ADMIN requests that member's detail
- THEN the system SHALL return 404, never club B's data.

#### Scenario: Deletion with history

- GIVEN a member with payments in club A
- WHEN an administrator attempts to delete them
- THEN the system SHALL reject physical deletion and offer status `INACTIVE`.

### Requirement: Club-scoped email uniqueness

The system SHALL enforce email uniqueness per club (`[clubId, email]`); the same email SHALL be allowed in different clubs.
(Previously: email unique across the whole system.)

#### Scenario: Same email in two clubs

- GIVEN a member with email "juan@mail.com" in club A
- WHEN club B creates a member with the same email
- THEN the system SHALL accept the creation.

### Requirement: Club-scoped import

The system SHALL import members (Excel .xlsx) into the caller's club only, validating DNI duplicates within that club.
(Previously: "Importación masiva" — global import.)

#### Scenario: Import into club

- GIVEN a SUPER_ADMIN importing 50 rows for club A
- WHEN the import runs
- THEN the system SHALL create the valid rows in club A, report the total, and return a per-row error summary for invalid rows.

#### Scenario: Import rejects duplicate DNI in same club

- GIVEN an existing member with DNI `12345678` in club A and an import file containing that DNI
- WHEN the import runs for club A
- THEN the system SHALL skip that row and report it as invalid.

### Requirement: Club-scoped export

The system SHALL export members (Excel .xlsx) respecting both the applied filters and the club scope.
(Previously: "Exportación de socios" — global export.)

#### Scenario: Export scoped to club

- GIVEN an ADMIN of club A with members in clubs A and B
- WHEN the ADMIN exports the member list
- THEN the generated file SHALL contain only club A members.
