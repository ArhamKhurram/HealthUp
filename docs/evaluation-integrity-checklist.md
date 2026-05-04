# Evaluation Integrity Checklist

## Database Integrity

- Primary keys on all core transactional tables.
- Foreign keys enforced for core relationships:
  - `Users -> Patients/Doctors/Nurses`
  - `Departments -> Wards -> Beds`
  - `Doctors + Patients -> OPDAppointments`
  - `IPDAdmissions -> Patients/Doctors/Wards/Beds`
- CHECK constraints enabled for:
  - role/status enums
  - phone format (`03#########`)
  - non-negative monetary fields
  - time windows (where applicable)

## Referential + Business Integrity

- Doctor schedule validity:
  - day-of-week constraints
  - start < end
  - 30-minute slot booking rule
- OPD booking conflict checks:
  - no overlapping active appointment slots for same doctor
- Payment progression consistency:
  - appointment status transitions tied to payment state
- IPD admission consistency:
  - bed must belong to selected ward
  - bed availability checked before assignment
  - doctor assignment validated for ward compatibility

## Transactions and Atomicity

- Multi-step create/update user flow is transactional (role profile + schedule inserts).
- Admission and related updates are validated and applied safely.
- Stored procedures used for core booking/prescription/payment inserts where defined.

## Bonus Components (Course Requirement)

- Triggers:
  - payment status recalculation triggers
  - bed occupancy trigger for admission lifecycle
- Views:
  - billing summary
  - doctor rating summary
- Stored procedures:
  - OPD booking/prescription/payment procedures
  - IPD payment detail procedure

## Deployment/Evaluation Prep

1. Run `backend/database/schema_simplified.sql`
2. Run `backend/database/seed_simplified.sql`
4. Start backend and frontend
5. Execute `docs/demo-smoke-test.md` end-to-end
