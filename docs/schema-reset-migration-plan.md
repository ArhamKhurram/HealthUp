# Schema Reset Migration Plan (Large Checklist)

This is the full backlog for moving HealthUp from the current expanded model to the simplified Phase 2 model in `backend/database/schema_simplified.sql`.

## Phase 0 — Ground Rules and Freeze

- [ ] Freeze feature additions on old schema branch.
- [ ] Announce migration window and define owner for each module.
- [x] Confirm canonical DB scripts:
  - [x] `backend/database/schema_simplified.sql`
  - [x] `backend/database/seed_simplified.sql`
- [x] Keep old scripts intact in archive until parity:
  - [x] `backend/database/legacy/schema.sql`
  - [x] `backend/database/legacy/evaluation_hardening.sql`
  - [x] `backend/database/legacy/seed.sql`
- [x] Define “done” criteria for migration:
  - [ ] all demo-core flows pass
  - [x] no placeholder nav entries exposed
  - [ ] no endpoint references to removed tables

## Phase 1 — DB Baseline Completion

- [x] Add `seed_simplified.sql` with minimal demo data.
- [ ] Seed required users:
  - [x] Admin
  - [x] Patient
  - [x] Doctor
  - [x] Nurse
  - [x] Receptionist
- [ ] Seed required masters:
  - [x] Departments
  - [x] MedicalTests
  - [x] Medications
- [ ] Seed one OPD end-to-end sample:
  - [x] appointment
  - [x] prescription
  - [x] payment + billing details
- [ ] Seed one IPD end-to-end sample:
  - [x] admission
  - [x] unified test order
  - [ ] payment + billing details
- [x] Add idempotency guards in seed script.
- [ ] Validate all FK constraints with inserts.
- [ ] Validate all CHECK constraints with negative test inserts.

## Phase 2 — Mapping Old → New Data Model

- [ ] Create mapping document section in this file for each merge:
  - [ ] `OPDPrescriptions + IPDPrescriptions -> Prescriptions`
  - [ ] `OPDTestOrders + IPDTestOrders -> TestOrders`
  - [ ] `OPDPayments + IPDPayments -> Payments`
  - [ ] `OPDBillingDetails + IPDBillingDetails -> BillingDetails`
- [ ] Define source discriminator strategy (appointment vs admission nullable FK).
- [ ] Define allowed nullability and exclusive source checks.
- [ ] Define old status mapping to new statuses.
- [ ] Define token/room/bed logic that remains in app-layer (if not table-level).

## Phase 3 — Backend Route/Controller Migration

### 3.1 Auth and Users
- [ ] Confirm login response still returns `patientId`, `doctorId`, `nurseId` if present.
- [ ] Update auth registration to simplified profile writes.
- [ ] Remove writes to deprecated tables.

### 3.2 Users Management
- [ ] Update `/users` list query for simplified joins.
- [ ] Update `/users/:id` profile fetch per role.
- [ ] Update create user transactional flow:
  - [ ] Patient profile insert
  - [ ] Doctor profile insert
  - [ ] Nurse profile insert
- [ ] Keep validation payload shape stable for frontend.

### 3.3 Doctors
- [ ] Replace old schedule-table dependency with `Doctors.WorkDays + ShiftStartTime + ShiftEndTime`.
- [ ] Update doctor list endpoint to include simplified schedule fields.
- [ ] Ensure OPD availability logic reads from new columns.

### 3.4 OPD Appointments
- [ ] Update appointment column usage:
  - [ ] old `AppointmentDate` -> new `AppointmentDateTime`
- [ ] Keep 30-min slot conflict logic.
- [ ] Slot API:
  - [ ] date + doctor input
  - [ ] output list of free slots
- [ ] Simplify status transitions:
  - [ ] Pending -> Confirmed -> Completed

### 3.5 Prescriptions (Unified)
- [ ] Replace OPD/IPD split controllers with unified prescriptions controller.
- [ ] Keep role-based access boundaries.
- [ ] Verify source-check:
  - [ ] exactly one of appointment/admission required.
- [ ] Update prescription medications handlers to use unified `PrescriptionID`.

### 3.6 Test Orders (Unified)
- [ ] Merge OPD/IPD test-order routes.
- [ ] Keep statuses: Ordered, Completed, Cancelled.
- [ ] Update reports and patient pages to unified source.

### 3.7 Payments + Billing (Unified)
- [ ] Merge OPD/IPD payment routes.
- [ ] Keep manual confirmation model (receptionist/admin path).
- [ ] Keep reference number + method + receiver audit fields.
- [ ] Link to unified billing details.

### 3.8 IPD Admissions
- [ ] Update admissions queries to simplified table fields.
- [ ] Keep doctor assignment checks.
- [ ] Keep discharge status constraints.
- [ ] Remove references to dropped ward/bed structural tables if fully removed.

### 3.9 Reviews
- [ ] Verify review endpoints unaffected by consolidation.
- [ ] Ensure doctor linkage remains intact.

## Phase 4 — Frontend Migration

### 4.1 API Contract Alignment
- [ ] Update `frontend/src/api` consumers for renamed fields.
- [ ] Normalize datetime formatting helpers.
- [ ] Add central mapping for status labels.

### 4.2 Admin Pages
- [ ] Manage Users:
  - [ ] role-specific create/edit
  - [ ] backend validation error rendering
- [ ] Book Appointment:
  - [ ] date picker
  - [ ] available slots dropdown
  - [ ] doctor refresh action
- [ ] Payments:
  - [ ] unified payment records
  - [ ] status + reference display

### 4.3 Doctor Pages
- [ ] Appointments list from unified OPD table.
- [ ] Add prescription writes to unified prescriptions.
- [ ] Order tests to unified test orders.

### 4.4 Patient Pages
- [ ] My Appointments from simplified OPD table.
- [ ] My Prescriptions from unified prescriptions.
- [ ] My Tests from unified test orders.
- [ ] My Payments from unified payments.
- [ ] My Admissions from simplified IPD admissions.

### 4.5 Receptionist Pages
- [ ] Canonical booking flow only.
- [ ] Canonical payment recording flow only.
- [ ] Admission creation tied to simplified admissions model.

## Phase 5 — SQL Cleanup and Removal

- [ ] Remove references to dropped tables from all SQL scripts.
- [ ] Remove old SPs that query non-existent tables.
- [ ] Add new lightweight SPs only if needed for evaluation demo.
- [ ] Remove obsolete triggers/views tied to removed tables.
- [ ] Keep only relevant views/triggers for bonus marks.

## Phase 6 — Testing and Verification

### 6.1 Automated
- [ ] Update backend unit tests for:
  - [ ] create user validation
  - [ ] phone checks
  - [ ] role restrictions
  - [ ] appointment slot conflicts
  - [ ] unified payment rules
- [ ] Add integration tests for core lifecycle:
  - [ ] OPD appointment -> payment -> prescription
  - [ ] IPD admission -> test order -> payment

### 6.2 Manual QA (using docs/demo-smoke-test.md)
- [ ] Admin full flow pass
- [ ] Receptionist flow pass
- [ ] Doctor flow pass
- [ ] Patient flow pass
- [ ] Constraint negative-case pass

## Phase 7 — Documentation and Instructor Readiness

- [x] Update README to mention simplified schema path.
- [x] Update ERD diagram docs to simplified model only.
- [ ] Add “what was removed and why” section.
- [ ] Add “known non-goals for this semester demo” section.
- [ ] Prepare short evaluation narrative:
  - [ ] integrity coverage
  - [ ] actor flow coverage
  - [ ] triggers/views/SP bonus coverage

## Phase 8 — Cutover and Archive

- [ ] Create cutover branch tag before switch.
- [ ] Switch backend to simplified schema by default.
- [x] Archive legacy scripts under `backend/database/legacy/`.
- [ ] Final smoke run on clean DB.
- [ ] Commit and push migration milestone.

---

## Deferred Risks to Track

- [ ] Data migration complexity if preserving old DB rows is required.
- [ ] Hidden dependencies in frontend expecting old field names.
- [ ] Old docs/screenshots becoming stale after schema swap.
- [ ] Instructor expecting full ERD breadth vs stable demo core.
