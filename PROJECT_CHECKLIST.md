# HealthUp Project Checklist

Source of truth for ERD alignment: [ERD_DIAGRAM.md](ERD_DIAGRAM.md)

Status key:
- `[x]` Complete enough for demo/evaluation
- `[~]` Partial: exists, but not full CRUD or not fully surfaced in UI
- `[ ]` Missing / needs implementation

## 1) Foundation
- [x] Project is in a proper root directory with `backend/`, `frontend/`, and docs.
- [x] Git repository initialized.
- [x] GitHub remote configured: `https://github.com/ArhamKhurram/HealthUp.git`
- [x] Backend dependencies installed.
- [x] Frontend dependencies installed.
- [x] Docker SQL Server testing path prepared for macOS.
- [x] Frontend build passes.
- [ ] Final full browser QA pass after all page work is complete.

## 2) ERD Diagram
- [x] Real ERD diagram file exists: [ERD_DIAGRAM.md](ERD_DIAGRAM.md)
- [x] Diagram includes entities, PKs, FKs, and relationship cardinality.
- [x] Diagram now includes the complete hospital scope: users, clinical, billing, pharmacy, wards, OT, reviews, roster, equipment.
- [ ] Final visual export/screenshot for presentation if instructor does not accept Mermaid Markdown directly.

## 3) Database Schema vs ERD
- [x] `Users`
- [x] `Patients`
- [x] `Doctors`
- [x] `Nurses`
- [x] `DoctorQualifications`
- [x] `Departments`
- [x] `DoctorDepartments`
- [x] `Wards`
- [x] `Beds`
- [x] `OPDRooms`
- [x] `DutyRoster`
- [x] `HospitalEquipment`
- [x] `OTRooms`
- [x] `SurgeryBookings`
- [x] `OPDAppointments`
- [x] `OPDPrescriptions`
- [x] `OPDTestOrders`
- [x] `OPDPayments`
- [x] `IPDAdmissions`
- [x] `IPDProgressNotes`
- [x] `IPDPrescriptions`
- [x] `IPDTestOrders`
- [x] `IPDPayments`
- [x] `Medications`
- [x] `Inventory`
- [x] `OPDPrescriptionMedications`
- [x] `IPDPrescriptionMedications`
- [x] `MedicalTests`
- [x] `OPDBillingDetails`
- [x] `IPDBillingDetails`
- [x] `Reviews`

## 4) Database Integrity and Bonus Work
- [x] Primary keys defined across ERD tables.
- [x] Foreign keys enforce referential integrity.
- [x] Check constraints/defaults cover core statuses, roles, and numeric integrity.
- [x] Views implemented:
  - `vw_PatientDirectory`
  - `vw_OPDAppointmentDetails`
  - `vw_BillingSummary`
- [x] Stored procedures implemented:
  - `sp_BookOPDAppointment`
  - `sp_RecordOPDPayment`
  - `sp_GetDoctorRating`
  - `sp_AddOPDPrescription`
  - `sp_AddOPDTestOrder`
  - `sp_CreateOPDPaymentWithDetails`
  - `sp_AdmitPatientTransactional`
- [x] Triggers implemented:
  - `trg_OPDPayments_SetStatus`
  - `trg_IPDPayments_SetStatus`
  - `trg_IPDAdmissions_BedOccupancy`
- [x] Transaction examples implemented with `BEGIN TRANSACTION`, `COMMIT`, and `ROLLBACK`.
- [ ] Add stored procedures or API route coverage for `SurgeryBookings` and `IPDProgressNotes` if time permits.

## 5) Backend API Coverage vs ERD
- [x] `Users`: full CRUD API exists.
- [x] `Patients`: full CRUD API exists.
- [x] `Doctors`: full CRUD API exists.
- [~] `Nurses`: list/create API exists; update/delete still needed for full CRUD.
- [~] `Departments`: list/create/update exists; get/delete still needed for full CRUD.
- [ ] `DoctorQualifications`: ERD table exists, but API/UI not implemented yet.
- [ ] `DoctorDepartments`: ERD table exists, but API/UI not implemented yet.
- [~] `Wards`: list/create exists; update/delete still needed for full CRUD.
- [~] `Beds`: list/create/status update exists; full update/delete still needed.
- [~] `OPDRooms`: list/create exists; update/delete still needed.
- [~] `DutyRoster`: list/create exists; update/delete still needed.
- [~] `HospitalEquipment`: list/create exists; update/delete still needed.
- [ ] `OTRooms`: ERD table exists, but API/UI not implemented yet.
- [ ] `SurgeryBookings`: ERD table exists, but API/UI not implemented yet.
- [x] `OPDAppointments`: full CRUD API exists.
- [x] `OPDPrescriptions`: full CRUD API exists.
- [x] `OPDPrescriptionMedications`: full CRUD API exists.
- [x] `OPDTestOrders`: full CRUD API exists.
- [x] `OPDPayments`: full CRUD API exists.
- [~] `OPDBillingDetails`: table exists and transactional create path exists; standalone CRUD API not exposed.
- [x] `IPDAdmissions`: full CRUD API exists.
- [ ] `IPDProgressNotes`: ERD table exists, but frontend currently uses admission diagnosis update as a demo workaround.
- [x] `IPDPrescriptions`: full CRUD API exists.
- [x] `IPDPrescriptionMedications`: full CRUD API exists.
- [x] `IPDTestOrders`: full CRUD API exists.
- [x] `IPDPayments`: full CRUD API exists.
- [~] `IPDBillingDetails`: table exists; standalone CRUD API not exposed.
- [x] `Medications`: full CRUD API exists.
- [~] `Inventory`: handled through medication create/update; standalone inventory CRUD API not exposed.
- [x] `MedicalTests`: full CRUD API exists.
- [x] `Reviews`: full CRUD API exists.
- [x] Reports API exposes DB views and doctor rating procedure.

## 6) Shared Frontend Pages
- [x] Login Page
- [x] Patient Sign Up flow
- [x] Role-based Dashboard shell
- [x] Profile Page
- [x] Unauthorized / Not Found handling

## 7) Admin Frontend Pages
- [x] Admin Dashboard
- [ ] Manage Users: navigation exists, page is still placeholder.
- [x] Manage Patients
- [x] Manage Doctors
- [~] Manage Nurses: currently routed through roster/department flow; dedicated CRUD page still needed.
- [x] Departments Management
- [x] Wards & Beds Management
- [x] OPD Rooms Management
- [ ] Medications Management: navigation exists, page is still placeholder.
- [ ] Inventory Management: navigation exists, page is still placeholder.
- [ ] Medical Tests Management: navigation exists, page is still placeholder.
- [x] Duty Roster Management
- [x] Equipment Management
- [ ] Reports Page: navigation exists, page is still placeholder.
- [ ] OT Rooms Management: ERD-backed page not yet in navigation.
- [ ] Surgery Bookings Management: ERD-backed page not yet in admin navigation.

## 8) Patient Frontend Pages
- [x] Patient Dashboard
- [x] Book Appointment
- [x] My Appointments
- [x] My Prescriptions
- [x] My Test Orders
- [x] My Payments
- [x] My Admissions
- [x] Submit Review

## 9) Doctor Frontend Pages
- [x] Doctor Dashboard
- [x] OPD Appointments List
- [x] Appointment Details
- [x] Add OPD Prescription
- [x] Order OPD Tests
- [x] IPD Patients List
- [x] IPD Patient Details
- [x] Add Progress Notes UI exists
- [~] Add Progress Notes needs real `IPDProgressNotes` API instead of updating admission diagnosis.
- [x] Add IPD Prescription
- [x] Order IPD Tests
- [ ] Surgery Bookings: navigation exists, page is still placeholder.
- [x] View Reviews

## 10) Nurse Frontend Pages
- [x] Nurse Dashboard
- [x] Assigned Ward View
- [x] IPD Patients List
- [x] Add Vitals / Progress Notes UI exists
- [~] Add Vitals / Progress Notes needs real `IPDProgressNotes` API.
- [x] Duty Roster View
- [x] Update Bed Status

## 11) Receptionist Frontend Pages
- [x] Reception Dashboard
- [x] Register Patient
- [x] Book OPD Appointment
- [x] Admit Patient
- [~] Assign Bed: currently reuses admit patient flow; dedicated assign/reassign workflow still needed.
- [x] Record Payment

## 12) Current Highest-Priority Work
1. Implement admin frontend placeholders:
   - `Manage Users`
   - `Medications`
   - `Inventory`
   - `Medical Tests`
   - `Reports`
2. Add real API + UI for ERD-specific gaps:
   - `IPDProgressNotes`
   - `SurgeryBookings`
   - `OTRooms`
3. Improve partial CRUD APIs:
   - nurses
   - wards
   - beds
   - OPD rooms
   - duty roster
   - hospital equipment
4. Run final role-by-role browser QA with SQL Server running.
