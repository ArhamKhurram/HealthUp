# HealthUp ERD Checklist

Source diagram: [ERD_DIAGRAM.md](ERD_DIAGRAM.md)

## Diagram Completeness
- [x] Real ERD relationship diagram exists.
- [x] Entities include attributes, primary keys, and foreign keys.
- [x] Relationships include cardinality.
- [x] Hospital domains are represented: users, patients, doctors, nurses, departments, OPD, IPD, billing, tests, pharmacy, inventory, reviews, OT, roster, and equipment.

## Schema Match
- [x] All ERD entities exist as SQL Server tables in `backend/database/schema.sql`.
- [x] Core foreign key relationships are implemented.
- [x] Lookup/status fields include constraints/defaults where practical.
- [x] Seed data exists for demo users and core records.

## ERD Entities Needing More App Coverage
- [ ] `DoctorQualifications`: table exists; API/UI still needed.
- [ ] `DoctorDepartments`: table exists; API/UI still needed.
- [ ] `OTRooms`: table exists; API/UI still needed.
- [ ] `SurgeryBookings`: table exists; API/UI still needed.
- [ ] `IPDProgressNotes`: table exists; real API/UI persistence still needed.
- [ ] `OPDBillingDetails`: table exists; standalone UI/API management still needed.
- [ ] `IPDBillingDetails`: table exists; standalone UI/API management still needed.

## Bonus DB Artifacts
- [x] Views implemented.
- [x] Stored procedures implemented.
- [x] Triggers implemented.
- [x] Transactions with commit/rollback implemented.

## Evaluation Readiness
- [x] ERD and schema are aligned at table level.
- [~] Backend API is strong for core flows, partial for a few ERD edge tables.
- [~] Frontend covers the required role pages, but several admin/doctor pages still need full implementation.
- [ ] Final QA should verify create/read/update/delete flows through the UI using SQL Server.
