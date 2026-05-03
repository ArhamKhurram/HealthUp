# Flow 1 User Management - Sequence Diagrams

This document defines sequence diagrams for:
- Flow 1A: Patient Self Sign-up
- Flow 1B: Admin Create User (Unified, Role-based)
- Flow 1C: Admin Manage/Edit User (Unified)

## Flow 1A - Patient Self Sign-up

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as Frontend (Sign-up Form)
    participant API as Backend API
    participant VAL as Validation Layer
    participant DB as Database

    Patient->>UI: Open sign-up page
    UI-->>Patient: Render form fields (full name, email, DOB, gender dropdown, blood group dropdown, phone, password + confirm, address, etc.)
    
    Patient->>UI: Enter details
    Patient->>UI: Toggle password/cfm visibility
    Patient->>UI: Submit sign-up form
    
    UI->>UI: Client validation (required fields, phone regex ^03\\d{9}$, password>=8, confirm-password match)
    
    alt Client validation fails
        UI-->>Patient: Show inline validation errors
    else Client validation passes
        UI->>API: POST /auth/register/patient
        API->>VAL: Validate payload again (server-side)
        
        alt Server validation fails
            VAL-->>API: Validation errors
            API-->>UI: 400 Bad Request + error list
            UI-->>Patient: Show errors
        else Validation passes
            API->>DB: Check unique email / phone / MRNumber
            alt Duplicate found
                DB-->>API: Duplicate exists
                API-->>UI: 409 Conflict
                UI-->>Patient: Show duplicate error
            else No duplicate
                API->>API: Hash password
                API->>DB: Insert User(role=Patient) + Patient profile
                DB-->>API: Created (UserId, PatientId, MRNumber)
                API-->>UI: 201 Created + JWT token
                UI-->>Patient: Account created (redirect to dashboard)
            end
        end
    end
```

## Flow 1B - Admin Create User (Unified, Role-based)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Frontend (Create User)
    participant API as Backend API
    participant VAL as Validation Layer
    participant DB as Database

    Admin->>UI: Open Create User page
    UI-->>Admin: Show base fields + Role dropdown
    
    Admin->>UI: Select role (Patient/Doctor/Nurse/...)
    UI-->>Admin: Render role-specific dynamic fields
    
    Note over UI,Admin: Example: Doctor role shows specialization + schedule defaults
    
    Admin->>UI: Fill details + password + confirm password
    Admin->>UI: Toggle password visibility
    Admin->>UI: Submit form
    UI->>UI: Client validation (common + role-specific)
    
    alt Client validation fails
        UI-->>Admin: Show inline errors
    else Client validation passes
        UI->>API: POST /api/users
        API->>VAL: Server-side common + role-specific validation
        
        alt Validation fails
            VAL-->>API: Errors
            API-->>UI: 400 Bad Request
            UI-->>Admin: Show errors
        else Validation passes
            API->>DB: Check uniqueness (email/phone/identifier)
            alt Duplicate found
                DB-->>API: Duplicate exists
                API-->>UI: 409 Conflict
                UI-->>Admin: Show duplicate error
            else No duplicate
                API->>API: Hash password
                API->>DB: Create User + role profile tables
                
                alt Role = Doctor
                    API->>DB: Create default doctor schedule
                end
                
                DB-->>API: Created
                API-->>UI: 201 Created
                UI-->>Admin: Success + navigate to Manage Users / user detail
            end
        end
    end
```

## Flow 1C - Admin Manage/Edit User (Unified)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Frontend (Manage Users)
    participant API as Backend API
    participant VAL as Validation Layer
    participant DB as Database

    Admin->>UI: Open Manage Users
    UI->>API: GET /api/users?role=&status=&search=
    API->>DB: Fetch users across all roles
    DB-->>API: User list
    API-->>UI: 200 OK + data
    UI-->>Admin: Render unified users table
    
    Admin->>UI: Click Edit on user
    UI->>API: GET /api/users/:id
    API->>DB: Fetch base + role-specific profile
    DB-->>API: User detail
    API-->>UI: 200 OK
    UI-->>Admin: Open edit form with prefilled fields
    
    Admin->>UI: Update editable fields (status, profile data, role-specific fields)
    Admin->>UI: Submit changes
    UI->>UI: Client validation
    
    alt Validation fails
        UI-->>Admin: Show inline errors
    else Validation passes
        UI->>API: PUT /api/users/:id
        API->>VAL: Server-side validation + authorization
        
        alt Unauthorized or invalid change
            API-->>UI: 403/400
            UI-->>Admin: Show error
        else Valid request
            API->>DB: Update base user + role-specific tables
            DB-->>API: Updated
            API-->>UI: 200 OK
            UI-->>Admin: Show success and refresh row/detail
        end
    end
```

## Notes
- Keep validation rules identical between create and edit where applicable.
- Treat dropdown-backed values as controlled enums in both frontend and backend.
- Password fields should support show/hide toggle in both patient and admin-create flows.
- Phone format validation: `^03\\d{9}$` for Pakistani mobile format.
- Patient signup and admin-create both enforce password confirmation and minimum 8-character policy.
- Gender dropdown: M/F/Other; BloodGroup dropdown: O+/O-/A+/A-/B+/B-/AB+/AB-.

