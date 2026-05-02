# HealthUp Multi-Agent Orchestration

## Scope
This document defines the parallel execution model for role-based frontend and supporting backend updates.

## Baseline
- Baseline commit: `c81a133`
- Orchestration branch: `feature/role-based-hms-orchestration`

## Workstreams
1. `feat/wt-shell-nav`
   - Worktree: `/Users/arhamkhurram/Coding/HealthUp-wt-shell-nav`
   - Ownership: shared shell, role navigation, route guards, unauthorized/not-found pages
2. `feat/wt-admin`
   - Worktree: `/Users/arhamkhurram/Coding/HealthUp-wt-admin`
   - Ownership: admin pages and CRUD views
3. `feat/wt-patient`
   - Worktree: `/Users/arhamkhurram/Coding/HealthUp-wt-patient`
   - Ownership: patient pages and patient journey flows
4. `feat/wt-doctor-nurse-reception`
   - Worktree: `/Users/arhamkhurram/Coding/HealthUp-wt-doctor-nurse-reception`
   - Ownership: doctor, nurse, receptionist pages and workflows
5. `feat/wt-qa-hardening`
   - Worktree: `/Users/arhamkhurram/Coding/HealthUp-wt-qa-hardening`
   - Ownership: smoke tests, cross-role validation, UX consistency fixes, release hardening

## Shared Contracts
1. Route map
   - Shared: `login`, `profile`, `unauthorized`, `not-found`
   - Admin: `admin-dashboard`, `manage-users`, `manage-doctors`, `manage-nurses`, `manage-patients`, `departments`, `wards-beds`, `opd-rooms`, `medications`, `inventory`, `medical-tests`, `duty-roster`, `equipment`, `reports`
   - Patient: `patient-dashboard`, `book-appointment`, `my-appointments`, `my-prescriptions`, `my-test-orders`, `my-payments`, `my-admissions`, `submit-review`
   - Doctor: `doctor-dashboard`, `doctor-opd-appointments`, `appointment-details`, `add-opd-prescription`, `order-opd-tests`, `doctor-ipd-patients`, `doctor-ipd-patient-details`, `add-progress-notes`, `add-ipd-prescription`, `order-ipd-tests`, `surgery-bookings`, `view-reviews`
   - Nurse: `nurse-dashboard`, `assigned-ward`, `nurse-ipd-patients`, `add-vitals`, `nurse-duty-roster`, `update-bed-status`
   - Receptionist: `reception-dashboard`, `register-patient`, `reception-book-opd`, `admit-patient`, `assign-bed`, `record-payment`
2. Permission matrix
   - Access is role-allowlist only. No implicit fallback access.
   - Unauthorized route must be rendered for blocked roles.
3. API payload expectations
   - Auth user payload should carry role and profile IDs where applicable: `patientId`, `doctorId`, `nurseId`
   - List endpoints used by role screens should include foreign keys needed for client-side filtering when role-scoped routes are loaded

## Merge Policy
1. Integration order
   - `feat/wt-shell-nav`
   - `feat/wt-admin`
   - `feat/wt-patient`
   - `feat/wt-doctor-nurse-reception`
   - `feat/wt-qa-hardening`
2. Gate checks after each merge
   - `frontend`: `npm run build`
   - `backend`: syntax checks
   - API smoke for role login and one core flow affected by that merge

## Risk Controls
1. Keep write scope separated by workstream ownership.
2. Do not refactor shared files outside stream scope unless required by contract.
3. Resolve conflicts on orchestration branch only, then sync downstream branches.
4. Track infra blockers (SQL container readiness) independently from app changes.

## Current Infra Note
SQL Server container is intermittently failing readiness in this environment. App integration can proceed, but final auth/data-endpoint verification remains blocked until DB readiness stabilizes.
