erDiagram
    Users ||--|| Patients : has
    Users ||--|| Doctors : has
    Users ||--|| Nurses : has
    Doctors ||--o{ DoctorQualifications : holds

    Departments ||--o{ DoctorDepartments : has
    Doctors ||--o{ DoctorDepartments : assigned_to
    Departments ||--o{ Nurses : staffs
    Departments ||--o{ Wards : contains
    Departments ||--o{ OPDRooms : contains
    Wards ||--o{ Beds : has
    Nurses ||--o{ Wards : in_charge_of

    Users ||--o{ DutyRoster : scheduled
    Departments ||--o{ DutyRoster : location
    Departments ||--o{ HospitalEquipment : stores
    OTRooms ||--o{ SurgeryBookings : hosts
    Doctors ||--o{ SurgeryBookings : performs

    Patients ||--o{ OPDAppointments : books
    Doctors ||--o{ OPDAppointments : consults
    OPDRooms ||--o{ OPDAppointments : used_in
    OPDAppointments ||--o{ OPDPrescriptions : generates
    OPDAppointments ||--o{ OPDTestOrders : requires
    OPDAppointments ||--o{ OPDPayments : billed
    Patients ||--o{ OPDPrescriptions : receives
    Doctors ||--o{ OPDPrescriptions : writes

    Patients ||--o{ IPDAdmissions : admitted
    Doctors ||--o{ IPDAdmissions : attends
    Beds ||--o{ IPDAdmissions : used_in
    Wards ||--o{ IPDAdmissions : houses
    IPDAdmissions ||--o{ SurgeryBookings : requires
    IPDAdmissions ||--o{ IPDProgressNotes : logs
    IPDAdmissions ||--o{ IPDPrescriptions : generates
    IPDAdmissions ||--o{ IPDTestOrders : requires
    IPDAdmissions ||--o{ IPDPayments : billed
    Patients ||--o{ IPDPrescriptions : receives
    Doctors ||--o{ IPDPrescriptions : writes
    Doctors ||--o{ IPDProgressNotes : writes
    Nurses ||--o{ IPDProgressNotes : records

    Medications ||--o{ Inventory : tracked
    OPDPrescriptions ||--o{ OPDPrescriptionMedications : contains
    Medications ||--o{ OPDPrescriptionMedications : used
    IPDPrescriptions ||--o{ IPDPrescriptionMedications : contains
    Medications ||--o{ IPDPrescriptionMedications : used

    MedicalTests ||--o{ OPDTestOrders : used
    MedicalTests ||--o{ IPDTestOrders : used

    OPDPayments ||--o{ OPDBillingDetails : contains
    IPDPayments ||--o{ IPDBillingDetails : contains

    Patients ||--o{ Reviews : writes
    Doctors ||--o{ Reviews : receives

    Users {
        int UserID PK
        string FullName
        string Email
        string Password
        string Role
        string Phone
        string Address
        datetime CreatedAt
        boolean IsActive
    }

    Patients {
        int PatientID PK
        int UserID FK
        string MRNumber
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
        string Specialization
        string Qualification
        string Designation
        string LicenseNumber
        int ExperienceYears
        decimal ConsultationFee
        boolean AvailableForOPD
        boolean AvailableForIPD
    }

    Nurses {
        int NurseID PK
        int UserID FK
        int DepartmentID FK
        string ShiftTime
        string NurseType
        string Certification
    }

    DoctorQualifications {
        int QualificationID PK
        int DoctorID FK
        string DegreeTitle
        string Institution
        int YearObtained
    }

    Departments {
        int DepartmentID PK
        string DepartmentName
        string DepartmentType
        string Location
        string HeadOfDepartment
        string ContactNumber
    }

    DoctorDepartments {
        int DoctorID FK
        int DepartmentID FK
        string Schedule
        datetime AssignedDate
    }

    Wards {
        int WardID PK
        int DepartmentID FK
        string WardName
        string WardType
        int Floor
        int TotalBeds
        decimal DailyCharges
        int NurseInCharge FK
    }

    Beds {
        int BedID PK
        int WardID FK
        string BedNumber
        string BedType
        string Status
        decimal DailyCharges
    }

    OPDRooms {
        int RoomID PK
        int DepartmentID FK
        string RoomNumber
        string RoomType
        string Status
        int Capacity
    }

    DutyRoster {
        int RosterID PK
        int UserID FK
        int DepartmentID FK
        date ShiftDate
        string ShiftType
    }

    HospitalEquipment {
        int EquipmentID PK
        int DepartmentID FK
        string EquipmentName
        string Status
        date LastMaintenanceDate
        date NextMaintenanceDue
    }

    OTRooms {
        int OT_ID PK
        string OT_Name
        boolean IsSterilized
    }

    SurgeryBookings {
        int BookingID PK
        int AdmissionID FK
        int OT_ID FK
        int SurgeonID FK
        datetime StartTime
        datetime EndTime
        string SurgeryType
        string Status
    }

    OPDAppointments {
        int AppointmentID PK
        int PatientID FK
        int DoctorID FK
        int RoomID FK
        datetime AppointmentDate
        string AppointmentType
        string Status
        string ChiefComplaint
        int TokenNumber
    }

    OPDPrescriptions {
        int PrescriptionID PK
        int AppointmentID FK
        int PatientID FK
        int DoctorID FK
        date PrescriptionDate
        string Diagnosis
    }

    OPDTestOrders {
        int TestOrderID PK
        int AppointmentID FK
        int PatientID FK
        int TestID FK
        string Status
        string Results
    }

    OPDPayments {
        int PaymentID PK
        int AppointmentID FK
        int PatientID FK
        decimal TotalAmount
        decimal PaidAmount
        string Status
    }

    IPDAdmissions {
        int AdmissionID PK
        int PatientID FK
        int AttendingDoctorID FK
        int BedID FK
        int WardID FK
        datetime AdmissionDate
        datetime DischargeDate
        string AdmissionType
        string Status
        string ClinicalDiagnosis
    }

    IPDProgressNotes {
        int ProgressNoteID PK
        int AdmissionID FK
        int DoctorID FK
        int NurseID FK
        datetime RecordDate
        string VitalSigns
        string ProgressNotes
    }

    IPDPrescriptions {
        int PrescriptionID PK
        int AdmissionID FK
        int PatientID FK
        int DoctorID FK
        date PrescriptionDate
        string Diagnosis
    }

    IPDTestOrders {
        int TestOrderID PK
        int AdmissionID FK
        int PatientID FK
        int TestID FK
        string Status
        string Results
    }

    IPDPayments {
        int PaymentID PK
        int AdmissionID FK
        int PatientID FK
        decimal TotalAmount
        decimal PaidAmount
        string Status
    }

    Medications {
        int MedicationID PK
        string MedicationName
        string GenericName
        string Category
        decimal UnitPrice
        string Form
    }

    Inventory {
        int InventoryID PK
        int MedicationID FK
        int QuantityInStock
        int MinimumStockLevel
        int ReorderLevel
        date ExpiryDate
    }

    OPDPrescriptionMedications {
        int PrescriptionMedicationID PK
        int PrescriptionID FK
        int MedicationID FK
        string Dosage
        string Frequency
    }

    IPDPrescriptionMedications {
        int PrescriptionMedicationID PK
        int PrescriptionID FK
        int MedicationID FK
        string Dosage
        string Frequency
    }

    MedicalTests {
        int TestID PK
        string TestName
        string TestCode
        string Category
        decimal Cost
    }

    OPDBillingDetails {
        int BillingDetailID PK
        int PaymentID FK
        string ItemType
        decimal Amount
        int Quantity
    }

    IPDBillingDetails {
        int BillingDetailID PK
        int PaymentID FK
        string ItemType
        decimal Amount
        int Quantity
    }

    Reviews {
        int ReviewID PK
        int PatientID FK
        int DoctorID FK
        int Rating
        string Comments
    }