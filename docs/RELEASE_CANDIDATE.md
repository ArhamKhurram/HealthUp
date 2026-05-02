# Release Candidate Notes

Branch: `feature/role-based-hms-orchestration`  
Date: 2026-05-02

## 1) Implemented Pages by Role

### Shared
- Login page (role-based auth)
- Role-based shell/navigation
- Profile page
- Unauthorized / Not Found handling

### Admin
- Admin Dashboard
- Manage Patients
- Manage Doctors
- Manage Nurses (via duty roster management flow)
- Departments Management
- Wards & Beds Management
- OPD Rooms Management
- Duty Roster Management
- Equipment Management
- Manage Users / Medications / Medical Tests / Reports are now wired through mapped views (inventory remains a constrained placeholder flow)

### Patient
- Patient Dashboard
- Book Appointment
- My Appointments
- My Prescriptions
- My Test Orders
- Payments
- My Admissions
- Submit Review

### Doctor
- Doctor Dashboard
- OPD Appointments
- Appointment Details (queue + selected detail panel)
- Add OPD Prescription
- Order OPD Tests
- IPD Patients
- IPD Patient Details (list/detail skeleton with real admission data)
- Add Progress Notes UI
- Add IPD Prescription
- Order IPD Tests
- View Reviews
- Surgery Bookings (route exists; still placeholder)

### Nurse
- Nurse Dashboard
- Assigned Ward View
- IPD Patients
- Add Vitals / Progress Notes UI
- Duty Roster View (read-only)
- Update Bed Status

### Receptionist
- Reception Dashboard
- Register Patient (via patient management flow)
- Book OPD Appointment
- Admit Patient
- Assign Bed (dedicated assign flow)
- Record Payment (via payments flow)

## 2) Known Gaps vs Full ERD Scope

Current state is release-candidate ready for role flows, but not full ERD-complete. Main gaps:

1. `IPDProgressNotes` table exists, but frontend still uses admission diagnosis update as a workaround (no dedicated progress-notes API/UI contract yet).
2. `SurgeryBookings` and `OTRooms` are in ERD/schema but still not fully surfaced as complete operational role flows.
3. Some backend resources are partial CRUD only (e.g., nurses, wards, beds, OPD rooms, duty roster, equipment) compared to full ERD CRUD expectations.
4. `DoctorQualifications` and `DoctorDepartments` are in ERD/schema but not fully represented in role-specific frontend workflows.
5. `OPDBillingDetails` / `IPDBillingDetails` are covered transactionally but not exposed as standalone end-user CRUD surfaces.

## 3) Run Instructions (Docker SQL + Backend + Frontend)

## Prerequisites
- Docker Desktop running
- Node.js 18+ and npm

## Start SQL Server (Docker)
```bash
docker rm -f healthup-sql 2>/dev/null || true
docker run -d \
  --name healthup-sql \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=HealthUpPass123!" \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

## Initialize database schema (and optional seed)
Use SSMS/Azure Data Studio against `localhost,1433` and run:
- `backend/database/schema.sql`
- `backend/database/seed.sql` (optional but recommended for demo users/data)

## Backend
```bash
cd /Users/arhamkhurram/Coding/HealthUp/backend
cp .env.example .env
# update .env DB_* values for your SQL setup
npm install
npm run dev
```

## Frontend
```bash
cd /Users/arhamkhurram/Coding/HealthUp/frontend
npm install
npm run dev
```

Frontend default URL: `http://127.0.0.1:5173`  
Backend default URL: `http://127.0.0.1:5001`

## 4) Verification Checklist

- [ ] SQL container is healthy and accepting connections on `1433`.
- [ ] Backend starts without DB connection errors.
- [ ] Frontend loads and login works for demo roles.
- [ ] Role navigation only shows allowed pages for each role.
- [ ] Unauthorized route is shown when forcing forbidden routes.
- [ ] Core OPD flow works: book appointment -> doctor views -> prescription/test order.
- [ ] Core IPD flow works: admit -> assign bed -> doctor/nurse can view IPD patients.
- [ ] Nurse bed status updates reflect in beds list.
- [ ] Receptionist register/book/admit/assign/payment paths save successfully.
- [ ] Frontend production build passes:
  - [ ] `cd frontend && npm run build`

## 5) Final QA Evidence (2026-05-02)

### API-level pass (receptionist gap closed)
- `POST /api/auth/login` as Receptionist: `200`
- `GET /api/patients`: `200`
- `GET /api/opd/appointments`: `200`
- `GET /api/billing/opd-payments`: `200`
- `GET /api/ipd/admissions`: `200`
- `GET /api/departments/beds`: `200`
- `POST /api/opd/appointments` (Receptionist): `201`
- `POST /api/billing/opd-payments` with `details[]` (Receptionist): `201`
- `POST /api/ipd/admissions` (Receptionist): `201`
- `PUT /api/departments/beds/:id/status` (Receptionist): `200`

### Browser-level pass
- Receptionist login succeeds at `http://127.0.0.1:5173`
- Receptionist sidebar + dashboards render without new console errors
- Navigation pass for:
  - Reception Dashboard
  - Register Patient
  - Book OPD Appointment
  - Admit Patient
  - Assign Bed
  - Record Payment

### Browser automation caveat
- In the in-app browser automation runtime, native date/datetime controls can block deterministic submit automation (form-level required prompts persist even with scripted fills on some runs).
- Because of that, final save success for date-driven UI submits was validated at API level and by page-state data refresh, not only by toast text assertions.

## 6) Push / PR Checklist

- [ ] Pull latest target branch and resolve conflicts locally.
- [ ] Re-run frontend build and smoke role flows.
- [ ] Confirm only intended files are changed (`git status`).
- [ ] Commit with clear RC message.
- [ ] Push branch:
  - [ ] `git push origin feature/role-based-hms-orchestration`
- [ ] Open PR with:
  - [ ] Summary of role coverage
  - [ ] Known ERD gaps (from section 2)
  - [ ] Test evidence (build + role smoke results)
- [ ] Request review from stream owners before merge.
