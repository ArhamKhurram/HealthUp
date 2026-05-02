IF DB_ID('HealthUp') IS NULL
BEGIN
    CREATE DATABASE HealthUp;
END
GO

USE HealthUp;
GO

CREATE SEQUENCE OPDTokenSequence AS INT START WITH 1 INCREMENT BY 1;
GO

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(120) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(30) NOT NULL,
    Phone NVARCHAR(30) NULL,
    Address NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Patient', 'Doctor', 'Nurse'))
);

CREATE TABLE Patients (
    PatientID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    MRNumber NVARCHAR(50) NOT NULL UNIQUE,
    DateOfBirth DATE NOT NULL,
    Gender NVARCHAR(20) NOT NULL,
    BloodGroup NVARCHAR(10) NULL,
    EmergencyContact NVARCHAR(50) NULL,
    Allergies NVARCHAR(MAX) NULL,
    ChronicConditions NVARCHAR(MAX) NULL,
    CONSTRAINT FK_Patients_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Doctors (
    DoctorID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    Specialization NVARCHAR(100) NOT NULL,
    Qualification NVARCHAR(150) NULL,
    Designation NVARCHAR(100) NULL,
    LicenseNumber NVARCHAR(80) NOT NULL UNIQUE,
    ExperienceYears INT NOT NULL DEFAULT 0,
    ConsultationFee DECIMAL(10,2) NOT NULL DEFAULT 0,
    AvailableForOPD BIT NOT NULL DEFAULT 1,
    AvailableForIPD BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Doctors_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT CK_Doctors_Experience CHECK (ExperienceYears >= 0),
    CONSTRAINT CK_Doctors_Fee CHECK (ConsultationFee >= 0)
);

CREATE TABLE Departments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentName NVARCHAR(100) NOT NULL UNIQUE,
    DepartmentType NVARCHAR(50) NOT NULL,
    Location NVARCHAR(120) NULL,
    HeadOfDepartment NVARCHAR(120) NULL,
    ContactNumber NVARCHAR(30) NULL
);

CREATE TABLE Nurses (
    NurseID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    DepartmentID INT NOT NULL,
    ShiftTime NVARCHAR(50) NULL,
    NurseType NVARCHAR(50) NULL,
    Certification NVARCHAR(150) NULL,
    CONSTRAINT FK_Nurses_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Nurses_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE TABLE DoctorQualifications (
    QualificationID INT IDENTITY(1,1) PRIMARY KEY,
    DoctorID INT NOT NULL,
    DegreeTitle NVARCHAR(120) NOT NULL,
    Institution NVARCHAR(150) NOT NULL,
    YearObtained INT NULL,
    CONSTRAINT FK_DoctorQualifications_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

CREATE TABLE DoctorDepartments (
    DoctorID INT NOT NULL,
    DepartmentID INT NOT NULL,
    Schedule NVARCHAR(255) NULL,
    AssignedDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DoctorDepartments PRIMARY KEY (DoctorID, DepartmentID),
    CONSTRAINT FK_DoctorDepartments_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    CONSTRAINT FK_DoctorDepartments_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE TABLE Wards (
    WardID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentID INT NOT NULL,
    WardName NVARCHAR(100) NOT NULL,
    WardType NVARCHAR(50) NOT NULL,
    Floor INT NULL,
    TotalBeds INT NOT NULL,
    DailyCharges DECIMAL(10,2) NOT NULL DEFAULT 0,
    NurseInCharge INT NULL,
    CONSTRAINT FK_Wards_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    CONSTRAINT FK_Wards_NurseInCharge FOREIGN KEY (NurseInCharge) REFERENCES Nurses(NurseID),
    CONSTRAINT CK_Wards_TotalBeds CHECK (TotalBeds > 0),
    CONSTRAINT CK_Wards_DailyCharges CHECK (DailyCharges >= 0)
);

CREATE TABLE Beds (
    BedID INT IDENTITY(1,1) PRIMARY KEY,
    WardID INT NOT NULL,
    BedNumber NVARCHAR(30) NOT NULL,
    BedType NVARCHAR(50) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Available',
    DailyCharges DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT FK_Beds_Wards FOREIGN KEY (WardID) REFERENCES Wards(WardID),
    CONSTRAINT UQ_Beds_Ward_BedNumber UNIQUE (WardID, BedNumber),
    CONSTRAINT CK_Beds_Status CHECK (Status IN ('Available', 'Occupied', 'Reserved', 'Maintenance')),
    CONSTRAINT CK_Beds_DailyCharges CHECK (DailyCharges >= 0)
);

CREATE TABLE OPDRooms (
    RoomID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentID INT NOT NULL,
    RoomNumber NVARCHAR(30) NOT NULL,
    RoomType NVARCHAR(50) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Available',
    Capacity INT NOT NULL DEFAULT 1,
    CONSTRAINT FK_OPDRooms_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    CONSTRAINT UQ_OPDRooms_Department_Room UNIQUE (DepartmentID, RoomNumber),
    CONSTRAINT CK_OPDRooms_Status CHECK (Status IN ('Available', 'Occupied', 'Maintenance')),
    CONSTRAINT CK_OPDRooms_Capacity CHECK (Capacity > 0)
);

CREATE TABLE DutyRoster (
    RosterID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    DepartmentID INT NOT NULL,
    ShiftDate DATE NOT NULL,
    ShiftType NVARCHAR(40) NOT NULL,
    CONSTRAINT FK_DutyRoster_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_DutyRoster_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE TABLE HospitalEquipment (
    EquipmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentID INT NOT NULL,
    EquipmentName NVARCHAR(120) NOT NULL,
    Status NVARCHAR(40) NOT NULL DEFAULT 'Available',
    LastMaintenanceDate DATE NULL,
    NextMaintenanceDue DATE NULL,
    CONSTRAINT FK_HospitalEquipment_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE TABLE OTRooms (
    OT_ID INT IDENTITY(1,1) PRIMARY KEY,
    OT_Name NVARCHAR(100) NOT NULL UNIQUE,
    IsSterilized BIT NOT NULL DEFAULT 1
);

CREATE TABLE MedicalTests (
    TestID INT IDENTITY(1,1) PRIMARY KEY,
    TestName NVARCHAR(120) NOT NULL,
    TestCode NVARCHAR(40) NOT NULL UNIQUE,
    Category NVARCHAR(80) NOT NULL,
    Cost DECIMAL(10,2) NOT NULL,
    CONSTRAINT CK_MedicalTests_Cost CHECK (Cost >= 0)
);

CREATE TABLE Medications (
    MedicationID INT IDENTITY(1,1) PRIMARY KEY,
    MedicationName NVARCHAR(120) NOT NULL,
    GenericName NVARCHAR(120) NULL,
    Category NVARCHAR(80) NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    Form NVARCHAR(50) NULL,
    CONSTRAINT CK_Medications_UnitPrice CHECK (UnitPrice >= 0)
);

CREATE TABLE Inventory (
    InventoryID INT IDENTITY(1,1) PRIMARY KEY,
    MedicationID INT NOT NULL,
    QuantityInStock INT NOT NULL DEFAULT 0,
    MinimumStockLevel INT NOT NULL DEFAULT 0,
    ReorderLevel INT NOT NULL DEFAULT 0,
    ExpiryDate DATE NULL,
    CONSTRAINT FK_Inventory_Medications FOREIGN KEY (MedicationID) REFERENCES Medications(MedicationID),
    CONSTRAINT CK_Inventory_Quantities CHECK (QuantityInStock >= 0 AND MinimumStockLevel >= 0 AND ReorderLevel >= 0)
);

CREATE TABLE OPDAppointments (
    AppointmentID INT IDENTITY(1,1) PRIMARY KEY,
    PatientID INT NOT NULL,
    DoctorID INT NOT NULL,
    RoomID INT NULL,
    AppointmentDate DATETIME2 NOT NULL,
    AppointmentType NVARCHAR(50) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Pending',
    ChiefComplaint NVARCHAR(MAX) NULL,
    TokenNumber INT NOT NULL,
    CONSTRAINT FK_OPDAppointments_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_OPDAppointments_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    CONSTRAINT FK_OPDAppointments_OPDRooms FOREIGN KEY (RoomID) REFERENCES OPDRooms(RoomID),
    CONSTRAINT UQ_OPDAppointments_Doctor_Date UNIQUE (DoctorID, AppointmentDate),
    CONSTRAINT CK_OPDAppointments_Status CHECK (Status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled'))
);

CREATE TABLE OPDPrescriptions (
    PrescriptionID INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentID INT NOT NULL,
    PatientID INT NOT NULL,
    DoctorID INT NOT NULL,
    PrescriptionDate DATE NOT NULL DEFAULT CONVERT(DATE, GETDATE()),
    Diagnosis NVARCHAR(MAX) NULL,
    CONSTRAINT FK_OPDPrescriptions_Appointments FOREIGN KEY (AppointmentID) REFERENCES OPDAppointments(AppointmentID),
    CONSTRAINT FK_OPDPrescriptions_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_OPDPrescriptions_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

CREATE TABLE OPDTestOrders (
    TestOrderID INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentID INT NOT NULL,
    PatientID INT NOT NULL,
    TestID INT NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Ordered',
    Results NVARCHAR(MAX) NULL,
    CONSTRAINT FK_OPDTestOrders_Appointments FOREIGN KEY (AppointmentID) REFERENCES OPDAppointments(AppointmentID),
    CONSTRAINT FK_OPDTestOrders_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_OPDTestOrders_MedicalTests FOREIGN KEY (TestID) REFERENCES MedicalTests(TestID)
);

CREATE TABLE OPDPayments (
    PaymentID INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentID INT NOT NULL,
    PatientID INT NOT NULL,
    TotalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    PaidAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Pending',
    CONSTRAINT FK_OPDPayments_Appointments FOREIGN KEY (AppointmentID) REFERENCES OPDAppointments(AppointmentID),
    CONSTRAINT FK_OPDPayments_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT CK_OPDPayments_Amounts CHECK (TotalAmount >= 0 AND PaidAmount >= 0),
    CONSTRAINT CK_OPDPayments_Status CHECK (Status IN ('Pending', 'Partial', 'Paid', 'Failed'))
);

CREATE TABLE IPDAdmissions (
    AdmissionID INT IDENTITY(1,1) PRIMARY KEY,
    PatientID INT NOT NULL,
    AttendingDoctorID INT NOT NULL,
    BedID INT NOT NULL,
    WardID INT NOT NULL,
    AdmissionDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DischargeDate DATETIME2 NULL,
    AdmissionType NVARCHAR(50) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Admitted',
    ClinicalDiagnosis NVARCHAR(MAX) NULL,
    CONSTRAINT FK_IPDAdmissions_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_IPDAdmissions_Doctors FOREIGN KEY (AttendingDoctorID) REFERENCES Doctors(DoctorID),
    CONSTRAINT FK_IPDAdmissions_Beds FOREIGN KEY (BedID) REFERENCES Beds(BedID),
    CONSTRAINT FK_IPDAdmissions_Wards FOREIGN KEY (WardID) REFERENCES Wards(WardID),
    CONSTRAINT CK_IPDAdmissions_Status CHECK (Status IN ('Admitted', 'Discharged', 'Transferred', 'Cancelled'))
);

CREATE TABLE SurgeryBookings (
    BookingID INT IDENTITY(1,1) PRIMARY KEY,
    AdmissionID INT NOT NULL,
    OT_ID INT NOT NULL,
    SurgeonID INT NOT NULL,
    StartTime DATETIME2 NOT NULL,
    EndTime DATETIME2 NULL,
    SurgeryType NVARCHAR(100) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    CONSTRAINT FK_SurgeryBookings_IPDAdmissions FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
    CONSTRAINT FK_SurgeryBookings_OTRooms FOREIGN KEY (OT_ID) REFERENCES OTRooms(OT_ID),
    CONSTRAINT FK_SurgeryBookings_Doctors FOREIGN KEY (SurgeonID) REFERENCES Doctors(DoctorID)
);

CREATE TABLE IPDProgressNotes (
    ProgressNoteID INT IDENTITY(1,1) PRIMARY KEY,
    AdmissionID INT NOT NULL,
    DoctorID INT NULL,
    NurseID INT NULL,
    RecordDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    VitalSigns NVARCHAR(MAX) NULL,
    ProgressNotes NVARCHAR(MAX) NULL,
    CONSTRAINT FK_IPDProgressNotes_IPDAdmissions FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
    CONSTRAINT FK_IPDProgressNotes_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    CONSTRAINT FK_IPDProgressNotes_Nurses FOREIGN KEY (NurseID) REFERENCES Nurses(NurseID)
);

CREATE TABLE IPDPrescriptions (
    PrescriptionID INT IDENTITY(1,1) PRIMARY KEY,
    AdmissionID INT NOT NULL,
    PatientID INT NOT NULL,
    DoctorID INT NOT NULL,
    PrescriptionDate DATE NOT NULL DEFAULT CONVERT(DATE, GETDATE()),
    Diagnosis NVARCHAR(MAX) NULL,
    CONSTRAINT FK_IPDPrescriptions_IPDAdmissions FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
    CONSTRAINT FK_IPDPrescriptions_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_IPDPrescriptions_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

CREATE TABLE IPDTestOrders (
    TestOrderID INT IDENTITY(1,1) PRIMARY KEY,
    AdmissionID INT NOT NULL,
    PatientID INT NOT NULL,
    TestID INT NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Ordered',
    Results NVARCHAR(MAX) NULL,
    CONSTRAINT FK_IPDTestOrders_IPDAdmissions FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
    CONSTRAINT FK_IPDTestOrders_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_IPDTestOrders_MedicalTests FOREIGN KEY (TestID) REFERENCES MedicalTests(TestID)
);

CREATE TABLE IPDPayments (
    PaymentID INT IDENTITY(1,1) PRIMARY KEY,
    AdmissionID INT NOT NULL,
    PatientID INT NOT NULL,
    TotalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    PaidAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Pending',
    CONSTRAINT FK_IPDPayments_IPDAdmissions FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
    CONSTRAINT FK_IPDPayments_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT CK_IPDPayments_Amounts CHECK (TotalAmount >= 0 AND PaidAmount >= 0),
    CONSTRAINT CK_IPDPayments_Status CHECK (Status IN ('Pending', 'Partial', 'Paid', 'Failed'))
);

CREATE TABLE OPDPrescriptionMedications (
    PrescriptionMedicationID INT IDENTITY(1,1) PRIMARY KEY,
    PrescriptionID INT NOT NULL,
    MedicationID INT NOT NULL,
    Dosage NVARCHAR(80) NOT NULL,
    Frequency NVARCHAR(80) NOT NULL,
    CONSTRAINT FK_OPDPrescriptionMedications_Prescriptions FOREIGN KEY (PrescriptionID) REFERENCES OPDPrescriptions(PrescriptionID),
    CONSTRAINT FK_OPDPrescriptionMedications_Medications FOREIGN KEY (MedicationID) REFERENCES Medications(MedicationID)
);

CREATE TABLE IPDPrescriptionMedications (
    PrescriptionMedicationID INT IDENTITY(1,1) PRIMARY KEY,
    PrescriptionID INT NOT NULL,
    MedicationID INT NOT NULL,
    Dosage NVARCHAR(80) NOT NULL,
    Frequency NVARCHAR(80) NOT NULL,
    CONSTRAINT FK_IPDPrescriptionMedications_Prescriptions FOREIGN KEY (PrescriptionID) REFERENCES IPDPrescriptions(PrescriptionID),
    CONSTRAINT FK_IPDPrescriptionMedications_Medications FOREIGN KEY (MedicationID) REFERENCES Medications(MedicationID)
);

CREATE TABLE OPDBillingDetails (
    BillingDetailID INT IDENTITY(1,1) PRIMARY KEY,
    PaymentID INT NOT NULL,
    ItemType NVARCHAR(80) NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT FK_OPDBillingDetails_OPDPayments FOREIGN KEY (PaymentID) REFERENCES OPDPayments(PaymentID),
    CONSTRAINT CK_OPDBillingDetails_Amounts CHECK (Amount >= 0 AND Quantity > 0)
);

CREATE TABLE IPDBillingDetails (
    BillingDetailID INT IDENTITY(1,1) PRIMARY KEY,
    PaymentID INT NOT NULL,
    ItemType NVARCHAR(80) NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT FK_IPDBillingDetails_IPDPayments FOREIGN KEY (PaymentID) REFERENCES IPDPayments(PaymentID),
    CONSTRAINT CK_IPDBillingDetails_Amounts CHECK (Amount >= 0 AND Quantity > 0)
);

CREATE TABLE Reviews (
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    PatientID INT NOT NULL,
    DoctorID INT NOT NULL,
    Rating INT NOT NULL,
    Comments NVARCHAR(MAX) NULL,
    CONSTRAINT FK_Reviews_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    CONSTRAINT FK_Reviews_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5)
);

CREATE INDEX IX_Users_Role ON Users(Role);
CREATE INDEX IX_Patients_MRNumber ON Patients(MRNumber);
CREATE INDEX IX_Doctors_Specialization ON Doctors(Specialization);
CREATE INDEX IX_OPDAppointments_Date_Status ON OPDAppointments(AppointmentDate, Status);
CREATE INDEX IX_OPDAppointments_Patient ON OPDAppointments(PatientID, AppointmentDate);
CREATE INDEX IX_IPDAdmissions_Status ON IPDAdmissions(Status, AdmissionDate);
CREATE INDEX IX_OPDPayments_Status ON OPDPayments(Status);
CREATE INDEX IX_IPDPayments_Status ON IPDPayments(Status);
GO
