# Demo Smoke Test (Role-by-Role)

## 0) Preflight

1. DB initialized with:
   - `backend/database/schema_simplified.sql`
   - `backend/database/seed_simplified.sql`
2. Backend running on `:5001`
3. Frontend running on `:5174` (or configured port)

## 1) Admin Flow

1. Login as `admin@healthup.test / password`
2. Go to `Manage Users`
3. Create:
   - one patient
   - one doctor (with schedule days + shift start/end)
4. Confirm both appear in users list.
5. Go to `Book OPD Appointment`:
   - select patient
   - select newly created doctor
   - select date
   - verify available slots dropdown is populated
   - create appointment

Expected:
- No validation bypass
- No duplicate slot booking for same doctor/time

## 2) Receptionist Flow

1. Login as receptionist user.
2. Open reception dashboard.
3. Open `Book OPD Appointment`, create an appointment using available slot.
4. Open payment flow and record OPD payment.

Expected:
- Payment record created
- Appointment status progression follows payment logic

## 3) Doctor Flow

1. Login as doctor user.
2. Open OPD appointments list.
3. Confirm assigned appointment is visible.
4. Add prescription.

Expected:
- Prescription linked to the correct appointment/patient/doctor

## 4) Patient Flow

1. Login as patient user.
2. Open dashboard.
3. Verify:
   - appointment appears in My Appointments
   - payment appears in Payments
   - prescription appears in My Prescriptions after doctor update

## 5) IPD Flow (Core)

1. As receptionist/admin, create IPD admission:
   - patient
   - attending doctor
   - ward and available bed
2. Verify bed status transitions to occupied.
3. Update/discharge and verify release behavior.

Expected:
- Bed must belong to selected ward
- Invalid doctor/ward mapping is blocked

## 6) Constraint Spot Checks

1. Try invalid phone values in create-user and patient signup.
2. Try invalid appointment time (non-30-minute start).
3. Try overlapping slot booking.

Expected:
- All invalid actions return explicit validation errors.
