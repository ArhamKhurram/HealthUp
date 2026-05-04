---
config:
  layout: elk
---
# HealthUp ERD (Simplified Phase 2)

## Demo-Core Table Scope

1. `Users`
2. `Patients`
3. `Doctors`
4. `Departments`
5. `Nurses`
6. `Medications`
7. `Inventory`
8. `MedicalTests`
9. `OPDAppointments`
10. `IPDAdmissions`
11. `Prescriptions`
12. `PrescriptionMedications`
13. `TestOrders`
14. `Payments`
15. `BillingDetails`
16. `Reviews`

Unified entities:
- `Prescriptions`, `TestOrders`, `Payments`, `BillingDetails` cover both OPD and IPD.

erDiagram
    Users {
        int UserID PK
        string FullName
        string Email UK
        string Password
        string Role
        string Phone
        string Address
        bool IsActive
        datetime CreatedAt
    }

    Departments {
        int DepartmentID PK
        string DepartmentName UK
        string DepartmentType
        string Location
    }

    Patients {
        int PatientID PK
        int UserID FK
        string MRNumber UK
        date DateOfBirth
        string Gender
        string BloodGroup
        string EmergencyContact
        string Allergies
        string ChronicConditions
    }

    Doctors {
        int DoctorID PK
        int UserID FK
        int DepartmentID FK
        string Specialization
        string Qualification
        string Designation
        decimal ConsultationFee
        time ShiftStartTime
        time ShiftEndTime
        string WorkDays
    }

    Nurses {
        int NurseID PK
        int UserID FK
        int DepartmentID FK
        time ShiftStartTime
        time ShiftEndTime
    }

    MedicalTests {
        int TestID PK
        string TestName
        string Category
        decimal Cost
    }

    Medications {
        int MedicationID PK
        string MedicationName
        string Category
        string Form
        decimal UnitPrice
    }

    Inventory {
        int InventoryID PK
        int MedicationID FK
        int QuantityInStock
        int ReorderLevel
        date ExpiryDate
    }

    OPDAppointments {
        int AppointmentID PK
        int PatientID FK
        int DoctorID FK
        datetime AppointmentDateTime
        string AppointmentType
        string Status
        string ChiefComplaint
    }

    IPDAdmissions {
        int AdmissionID PK
        int PatientID FK
        int DoctorID FK
        int DepartmentID FK
        datetime AdmissionDate
        datetime DischargeDate
        string Status
        string BedNumber
        string Diagnosis
    }

    Prescriptions {
        int PrescriptionID PK
        int PatientID FK
        int DoctorID FK
        int AppointmentID FK
        int AdmissionID FK
        datetime PrescriptionDate
        string Diagnosis
        string Notes
    }

    PrescriptionMedications {
        int PrescriptionMedicationID PK
        int PrescriptionID FK
        int MedicationID FK
        string Dosage
        string Frequency
        int DurationDays
        string Instructions
    }

    TestOrders {
        int TestOrderID PK
        int PatientID FK
        int DoctorID FK
        int TestID FK
        int AppointmentID FK
        int AdmissionID FK
        datetime OrderedAt
        string Status
        string Results
    }

    Payments {
        int PaymentID PK
        int PatientID FK
        int AppointmentID FK
        int AdmissionID FK
        decimal TotalAmount
        decimal PaidAmount
        string Status
        string PaymentMethod
        string ReferenceNo
        int ReceivedByUserID FK
        datetime PaidAt
        datetime CreatedAt
    }

    BillingDetails {
        int BillingDetailID PK
        int PaymentID FK
        string ItemType
        string ItemDescription
        int Quantity
        decimal UnitPrice
        decimal LineTotal
    }

    Reviews {
        int ReviewID PK
        int PatientID FK
        int DoctorID FK
        int Rating
        string Comments
        datetime CreatedAt
    }

    Users ||--o| Patients : "has"
    Users ||--o| Doctors : "has"
    Users ||--o| Nurses : "has"
    Departments ||--o{ Doctors : "employs"
    Departments ||--o{ Nurses : "employs"
    Departments ||--o{ IPDAdmissions : "hosts"
    Patients ||--o{ OPDAppointments : "books"
    Doctors ||--o{ OPDAppointments : "attends"
    Patients ||--o{ IPDAdmissions : "undergoes"
    Doctors ||--o{ IPDAdmissions : "treats"
    Patients ||--o{ Prescriptions : "gets"
    Doctors ||--o{ Prescriptions : "prescribes"
    OPDAppointments ||--o{ Prescriptions : "generates"
    IPDAdmissions ||--o{ Prescriptions : "generates"
    Prescriptions ||--o{ PrescriptionMedications : "includes"
    Medications ||--o{ PrescriptionMedications : "used_in"
    Medications ||--o| Inventory : "tracks"
    Patients ||--o{ TestOrders : "tested"
    Doctors ||--o{ TestOrders : "requests"
    MedicalTests ||--o{ TestOrders : "defines"
    OPDAppointments ||--o{ TestOrders : "triggers"
    IPDAdmissions ||--o{ TestOrders : "triggers"
    Patients ||--o{ Payments : "makes"
    OPDAppointments ||--o{ Payments : "bills"
    IPDAdmissions ||--o{ Payments : "bills"
    Users ||--o{ Payments : "collects"
    Payments ||--o{ BillingDetails : "contains"
    Patients ||--o{ Reviews : "writes"
    Doctors ||--o{ Reviews : "rated_by"
