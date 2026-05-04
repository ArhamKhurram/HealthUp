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
    CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Patient', 'Doctor', 'Nurse', 'Receptionist')),
    CONSTRAINT CK_Users_Phone CHECK (Phone IS NULL OR Phone LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
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
    CONSTRAINT FK_Patients_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT CK_Patients_Gender CHECK (Gender IN ('M', 'F', 'Other')),
    CONSTRAINT CK_Patients_BloodGroup CHECK (BloodGroup IN ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', NULL)),
    CONSTRAINT CK_Patients_EmergencyContact CHECK (EmergencyContact IS NULL OR EmergencyContact LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
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
    CONSTRAINT CK_Doctors_Fee CHECK (ConsultationFee >= 0),
    CONSTRAINT CK_Doctors_Specialization CHECK (Specialization IN ('Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'Dermatology', 'ENT')),
    CONSTRAINT CK_Doctors_Qualification CHECK (Qualification IS NULL OR Qualification IN ('MBBS', 'BDS', 'FCPS', 'MS', 'MD')),
    CONSTRAINT CK_Doctors_Designation CHECK (Designation IS NULL OR Designation IN ('Consultant', 'Specialist', 'Resident', 'Senior Registrar'))
);

CREATE TABLE Departments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentName NVARCHAR(100) NOT NULL UNIQUE,
    DepartmentType NVARCHAR(50) NOT NULL,
    Location NVARCHAR(120) NULL,
    HeadOfDepartment NVARCHAR(120) NULL,
    ContactNumber NVARCHAR(30) NULL,
    CONSTRAINT CK_Departments_Type CHECK (DepartmentType IN ('Clinical', 'Surgical', 'Diagnostics', 'Support')),
    CONSTRAINT CK_Departments_ContactNumber CHECK (ContactNumber IS NULL OR ContactNumber LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
);

CREATE TABLE Nurses (
    NurseID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    DepartmentID INT NOT NULL,
    ShiftTime NVARCHAR(50) NULL,
    NurseType NVARCHAR(50) NULL,
    Certification NVARCHAR(150) NULL,
    CONSTRAINT FK_Nurses_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Nurses_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    CONSTRAINT CK_Nurses_ShiftTime CHECK (ShiftTime IS NULL OR ShiftTime LIKE '[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]')
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
    CONSTRAINT CK_Wards_Type CHECK (WardType IN ('General', 'Private', 'ICU', 'Isolation')),
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
    CONSTRAINT CK_Beds_Type CHECK (BedType IN ('General', 'Semi-Private', 'Private', 'ICU', 'Isolation')),
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
    CONSTRAINT CK_OPDRooms_Type CHECK (RoomType IN ('Consultation', 'Procedure', 'Emergency')),
    CONSTRAINT CK_OPDRooms_Status CHECK (Status IN ('Available', 'Occupied', 'Maintenance')),
    CONSTRAINT CK_OPDRooms_Capacity CHECK (Capacity > 0)
);

CREATE TABLE DutyRoster (
    RosterID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    DepartmentID INT NOT NULL,
    ShiftDate DATE NOT NULL,
    ShiftType NVARCHAR(40) NOT NULL,
    ShiftStartTime TIME NOT NULL,
    ShiftEndTime TIME NOT NULL,
    CONSTRAINT FK_DutyRoster_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_DutyRoster_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    CONSTRAINT CK_DutyRoster_ShiftType CHECK (ShiftType IN ('Morning', 'Evening', 'Night', 'Custom')),
    CONSTRAINT CK_DutyRoster_TimeWindow CHECK (ShiftStartTime < ShiftEndTime),
    CONSTRAINT UQ_DutyRoster_User_Department_Date_Shift UNIQUE (UserID, DepartmentID, ShiftDate, ShiftStartTime, ShiftEndTime)
);

CREATE TABLE HospitalEquipment (
    EquipmentID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentID INT NOT NULL,
    EquipmentName NVARCHAR(120) NOT NULL,
    Status NVARCHAR(40) NOT NULL DEFAULT 'Available',
    LastMaintenanceDate DATE NULL,
    NextMaintenanceDue DATE NULL,
    CONSTRAINT FK_HospitalEquipment_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    CONSTRAINT CK_HospitalEquipment_Status CHECK (Status IN ('Available', 'In Use', 'Maintenance', 'Out of Service'))
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
    CONSTRAINT CK_MedicalTests_Cost CHECK (Cost >= 0),
    CONSTRAINT CK_MedicalTests_Category CHECK (Category IN ('Pathology', 'Radiology', 'Cardiology', 'Microbiology'))
);

CREATE TABLE Medications (
    MedicationID INT IDENTITY(1,1) PRIMARY KEY,
    MedicationName NVARCHAR(120) NOT NULL,
    GenericName NVARCHAR(120) NULL,
    Category NVARCHAR(80) NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    Form NVARCHAR(50) NULL,
    CONSTRAINT CK_Medications_UnitPrice CHECK (UnitPrice >= 0),
    CONSTRAINT CK_Medications_Category CHECK (Category IS NULL OR Category IN ('Antibiotic', 'Analgesic', 'Antipyretic', 'Antiseptic', 'Other')),
    CONSTRAINT CK_Medications_Form CHECK (Form IS NULL OR Form IN ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment'))
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
    CONSTRAINT CK_OPDAppointments_Status CHECK (Status IN ('Pending', 'PendingPayment', 'Confirmed', 'CheckedIn', 'Completed', 'Cancelled'))
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
    CONSTRAINT FK_OPDTestOrders_MedicalTests FOREIGN KEY (TestID) REFERENCES MedicalTests(TestID),
    CONSTRAINT CK_OPDTestOrders_Status CHECK (Status IN ('Ordered', 'Completed', 'Cancelled'))
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
    CONSTRAINT CK_OPDPayments_Status CHECK (Status IN ('Pending', 'Paid', 'Rejected'))
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
    CONSTRAINT FK_SurgeryBookings_Doctors FOREIGN KEY (SurgeonID) REFERENCES Doctors(DoctorID),
    CONSTRAINT CK_SurgeryBookings_Status CHECK (Status IN ('Scheduled', 'Completed', 'Cancelled')),
    CONSTRAINT CK_SurgeryBookings_TimeWindow CHECK (EndTime IS NULL OR EndTime > StartTime)
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
    CONSTRAINT FK_IPDTestOrders_MedicalTests FOREIGN KEY (TestID) REFERENCES MedicalTests(TestID),
    CONSTRAINT CK_IPDTestOrders_Status CHECK (Status IN ('Ordered', 'Completed', 'Cancelled'))
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
    CONSTRAINT CK_IPDPayments_Status CHECK (Status IN ('Pending', 'Paid', 'Rejected'))
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

/*
    ==========================
    BONUS: VIEWS
    ==========================
    These views provide denormalized datasets for dashboards and reports.
*/

CREATE VIEW vw_PatientDirectory
AS
SELECT
    p.PatientID,
    p.MRNumber,
    u.FullName AS PatientName,
    u.Email,
    u.Phone,
    p.DateOfBirth,
    p.Gender,
    p.BloodGroup,
    p.EmergencyContact
FROM Patients p
INNER JOIN Users u ON u.UserID = p.UserID;
GO

CREATE VIEW vw_OPDAppointmentDetails
AS
SELECT
    a.AppointmentID,
    a.AppointmentDate,
    a.AppointmentType,
    a.Status,
    a.TokenNumber,
    p.PatientID,
    p.MRNumber,
    pu.FullName AS PatientName,
    d.DoctorID,
    du.FullName AS DoctorName,
    d.Specialization,
    r.RoomNumber
FROM OPDAppointments a
INNER JOIN Patients p ON p.PatientID = a.PatientID
INNER JOIN Users pu ON pu.UserID = p.UserID
INNER JOIN Doctors d ON d.DoctorID = a.DoctorID
INNER JOIN Users du ON du.UserID = d.UserID
LEFT JOIN OPDRooms r ON r.RoomID = a.RoomID;
GO

CREATE VIEW vw_BillingSummary
AS
SELECT
    'OPD' AS BillingType,
    op.PaymentID,
    op.PatientID,
    op.TotalAmount,
    op.PaidAmount,
    (op.TotalAmount - op.PaidAmount) AS OutstandingAmount,
    op.Status
FROM OPDPayments op
UNION ALL
SELECT
    'IPD' AS BillingType,
    ip.PaymentID,
    ip.PatientID,
    ip.TotalAmount,
    ip.PaidAmount,
    (ip.TotalAmount - ip.PaidAmount) AS OutstandingAmount,
    ip.Status
FROM IPDPayments ip;
GO

/*
    ==========================
    BONUS: STORED PROCEDURES
    ==========================
    These procedures enforce reusable transactional operations.
*/

CREATE OR ALTER PROCEDURE sp_BookOPDAppointment
    @PatientID INT,
    @DoctorID INT,
    @RoomID INT = NULL,
    @AppointmentDate DATETIME2,
    @AppointmentType NVARCHAR(50),
    @ChiefComplaint NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @DayOfWeek INT = DATEPART(WEEKDAY, @AppointmentDate) - 1;
        DECLARE @AppointmentTime TIME = CONVERT(TIME, @AppointmentDate);
        DECLARE @SlotEnd DATETIME2 = DATEADD(MINUTE, 30, @AppointmentDate);
        DECLARE @AppointmentID INT;

        IF DATEPART(MINUTE, @AppointmentDate) % 30 <> 0
        BEGIN
            THROW 50001, 'Appointments must start on 30-minute slots.', 1;
        END

        IF NOT EXISTS (
            SELECT 1
            FROM DoctorSchedules ds
            WHERE ds.DoctorID = @DoctorID
              AND ds.DayOfWeek = @DayOfWeek
              AND ds.IsActive = 1
              AND @AppointmentTime >= ds.StartTime
              AND DATEADD(MINUTE, 30, @AppointmentTime) <= ds.EndTime
        )
        BEGIN
            THROW 50002, 'Selected appointment time is outside doctor schedule.', 1;
        END

        IF EXISTS (
            SELECT 1
            FROM OPDAppointments a
            WHERE a.DoctorID = @DoctorID
              AND a.Status IN ('Pending', 'Confirmed')
              AND a.AppointmentDate < @SlotEnd
              AND DATEADD(MINUTE, 30, a.AppointmentDate) > @AppointmentDate
        )
        BEGIN
            THROW 50003, 'Selected appointment slot is already booked.', 1;
        END

        INSERT INTO OPDAppointments
            (PatientID, DoctorID, RoomID, AppointmentDate, AppointmentType, Status, ChiefComplaint, TokenNumber)
        VALUES
            (@PatientID, @DoctorID, @RoomID, @AppointmentDate, @AppointmentType, 'Pending', @ChiefComplaint, NEXT VALUE FOR OPDTokenSequence);

        SET @AppointmentID = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
        SELECT @AppointmentID AS AppointmentID;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_RecordOPDPayment
    @AppointmentID INT,
    @PatientID INT,
    @TotalAmount DECIMAL(10,2),
    @PaidAmount DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Status NVARCHAR(30) =
        CASE
            WHEN @PaidAmount <= 0 THEN 'Pending'
            WHEN @PaidAmount >= @TotalAmount THEN 'Paid'
            WHEN @PaidAmount < @TotalAmount THEN 'Pending'
            ELSE 'Pending'
        END;

    INSERT INTO OPDPayments (AppointmentID, PatientID, TotalAmount, PaidAmount, Status)
    VALUES (@AppointmentID, @PatientID, @TotalAmount, @PaidAmount, @Status);

    SELECT SCOPE_IDENTITY() AS PaymentID, @Status AS PaymentStatus;
END;
GO

CREATE OR ALTER PROCEDURE sp_GetDoctorRating
    @DoctorID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.DoctorID,
        COUNT(*) AS TotalReviews,
        CAST(AVG(CAST(r.Rating AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS AverageRating
    FROM Reviews r
    WHERE r.DoctorID = @DoctorID
    GROUP BY r.DoctorID;
END;
GO

CREATE OR ALTER PROCEDURE sp_AddOPDPrescription
    @AppointmentID INT,
    @PatientID INT,
    @DoctorID INT,
    @PrescriptionDate DATE = NULL,
    @Diagnosis NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO OPDPrescriptions (AppointmentID, PatientID, DoctorID, PrescriptionDate, Diagnosis)
    VALUES (@AppointmentID, @PatientID, @DoctorID, COALESCE(@PrescriptionDate, CONVERT(DATE, GETDATE())), @Diagnosis);

    SELECT SCOPE_IDENTITY() AS PrescriptionID;
END;
GO

CREATE OR ALTER PROCEDURE sp_AddOPDTestOrder
    @AppointmentID INT,
    @PatientID INT,
    @TestID INT,
    @Status NVARCHAR(30) = 'Ordered',
    @Results NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO OPDTestOrders (AppointmentID, PatientID, TestID, Status, Results)
    VALUES (@AppointmentID, @PatientID, @TestID, @Status, @Results);

    SELECT SCOPE_IDENTITY() AS TestOrderID;
END;
GO

/*
    Transactional procedure:
    Creates OPD payment and corresponding billing details atomically.
    If any detail insert fails, everything is rolled back.
*/
CREATE OR ALTER PROCEDURE sp_CreateOPDPaymentWithDetails
    @AppointmentID INT,
    @PatientID INT,
    @TotalAmount DECIMAL(10,2),
    @PaidAmount DECIMAL(10,2),
    @ItemType1 NVARCHAR(80),
    @Amount1 DECIMAL(10,2),
    @Quantity1 INT = 1,
    @ItemType2 NVARCHAR(80) = NULL,
    @Amount2 DECIMAL(10,2) = NULL,
    @Quantity2 INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @PaymentID INT;
        DECLARE @Status NVARCHAR(30) =
        CASE
            WHEN @PaidAmount <= 0 THEN 'Pending'
            WHEN @PaidAmount >= @TotalAmount THEN 'Paid'
            WHEN @PaidAmount < @TotalAmount THEN 'Pending'
            ELSE 'Pending'
        END;

        INSERT INTO OPDPayments (AppointmentID, PatientID, TotalAmount, PaidAmount, Status)
        VALUES (@AppointmentID, @PatientID, @TotalAmount, @PaidAmount, @Status);

        SET @PaymentID = SCOPE_IDENTITY();

        INSERT INTO OPDBillingDetails (PaymentID, ItemType, Amount, Quantity)
        VALUES (@PaymentID, @ItemType1, @Amount1, @Quantity1);

        IF @ItemType2 IS NOT NULL AND @Amount2 IS NOT NULL
        BEGIN
            INSERT INTO OPDBillingDetails (PaymentID, ItemType, Amount, Quantity)
            VALUES (@PaymentID, @ItemType2, @Amount2, @Quantity2);
        END

        COMMIT TRANSACTION;

        SELECT @PaymentID AS PaymentID, @Status AS PaymentStatus;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

/*
    Transactional procedure:
    Admits patient only when selected bed is available.
    Uses update lock to prevent race conditions on bed assignment.
*/
CREATE OR ALTER PROCEDURE sp_AdmitPatientTransactional
    @PatientID INT,
    @AttendingDoctorID INT,
    @BedID INT,
    @WardID INT,
    @AdmissionType NVARCHAR(50),
    @ClinicalDiagnosis NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @CurrentBedStatus NVARCHAR(30);

        SELECT @CurrentBedStatus = b.Status
        FROM Beds b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.BedID = @BedID;

        IF @CurrentBedStatus IS NULL
        BEGIN
            RAISERROR('Bed does not exist.', 16, 1);
        END

        IF @CurrentBedStatus <> 'Available'
        BEGIN
            RAISERROR('Bed is not available for admission.', 16, 1);
        END

        IF NOT EXISTS (
            SELECT 1
            FROM Doctors d
            INNER JOIN Users u ON u.UserID = d.UserID
            WHERE d.DoctorID = @AttendingDoctorID
              AND u.IsActive = 1
        )
        BEGIN
            RAISERROR('Attending doctor must be an active doctor.', 16, 1);
        END

        IF EXISTS (
            SELECT 1
            FROM Wards w
            WHERE w.WardID = @WardID
              AND EXISTS (SELECT 1 FROM DoctorDepartments dd WHERE dd.DoctorID = @AttendingDoctorID)
              AND NOT EXISTS (
                  SELECT 1
                  FROM DoctorDepartments dd
                  WHERE dd.DoctorID = @AttendingDoctorID
                    AND dd.DepartmentID = w.DepartmentID
              )
        )
        BEGIN
            RAISERROR('Attending doctor is not assigned to the selected ward department.', 16, 1);
        END

        INSERT INTO IPDAdmissions
            (PatientID, AttendingDoctorID, BedID, WardID, AdmissionType, Status, ClinicalDiagnosis)
        VALUES
            (@PatientID, @AttendingDoctorID, @BedID, @WardID, @AdmissionType, 'Admitted', @ClinicalDiagnosis);

        UPDATE Beds
        SET Status = 'Occupied'
        WHERE BedID = @BedID;

        COMMIT TRANSACTION;

        SELECT SCOPE_IDENTITY() AS AdmissionID;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER TRIGGER trg_IPDAdmissions_DoctorWardValidation
ON IPDAdmissions
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN Doctors d ON d.DoctorID = i.AttendingDoctorID
        INNER JOIN Users u ON u.UserID = d.UserID
        INNER JOIN Wards w ON w.WardID = i.WardID
        WHERE u.IsActive <> 1
           OR (
                EXISTS (SELECT 1 FROM DoctorDepartments dd WHERE dd.DoctorID = d.DoctorID)
                AND NOT EXISTS (
                    SELECT 1
                    FROM DoctorDepartments dd
                    WHERE dd.DoctorID = d.DoctorID
                      AND dd.DepartmentID = w.DepartmentID
                )
           )
    )
    BEGIN
        RAISERROR('Attending doctor must be active and mapped to ward department.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

/*
    ==========================
    BONUS: TRIGGERS
    ==========================
    These triggers keep cross-table integrity aligned with business rules.
*/

CREATE OR ALTER TRIGGER trg_OPDPayments_SetStatus
ON OPDPayments
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE p
    SET p.Status =
        CASE
            WHEN p.PaidAmount <= 0 THEN 'Pending'
            WHEN p.PaidAmount >= p.TotalAmount THEN 'Paid'
            WHEN p.PaidAmount < p.TotalAmount THEN 'Pending'
            ELSE p.Status
        END
    FROM OPDPayments p
    INNER JOIN inserted i ON i.PaymentID = p.PaymentID;
END;
GO

CREATE OR ALTER TRIGGER trg_IPDPayments_SetStatus
ON IPDPayments
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE p
    SET p.Status =
        CASE
            WHEN p.PaidAmount <= 0 THEN 'Pending'
            WHEN p.PaidAmount >= p.TotalAmount THEN 'Paid'
            WHEN p.PaidAmount < p.TotalAmount THEN 'Pending'
            ELSE p.Status
        END
    FROM IPDPayments p
    INNER JOIN inserted i ON i.PaymentID = p.PaymentID;
END;
GO

CREATE OR ALTER TRIGGER trg_IPDAdmissions_BedOccupancy
ON IPDAdmissions
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Beds for active admissions remain occupied.
    UPDATE b
    SET b.Status = CASE WHEN i.Status = 'Admitted' THEN 'Occupied' ELSE b.Status END
    FROM Beds b
    INNER JOIN inserted i ON i.BedID = b.BedID;

    -- Beds are released when admission leaves active state.
    UPDATE b
    SET b.Status = 'Available'
    FROM Beds b
    INNER JOIN inserted i ON i.BedID = b.BedID
    WHERE i.Status IN ('Discharged', 'Cancelled', 'Transferred');
END;
GO

/*
    ==========================
    EVALUATION HARDENING PATCH
    ==========================
*/

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('DutyRoster')
      AND name = 'UQ_DutyRoster_User_Department_Date_Shift'
)
BEGIN
    ALTER TABLE DutyRoster
    ADD CONSTRAINT UQ_DutyRoster_User_Department_Date_Shift UNIQUE (UserID, DepartmentID, ShiftDate, ShiftStartTime, ShiftEndTime);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory')
      AND name = 'UQ_Inventory_Medication'
)
BEGIN
    ALTER TABLE Inventory
    ADD CONSTRAINT UQ_Inventory_Medication UNIQUE (MedicationID);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('IPDAdmissions')
      AND name = 'CK_IPDAdmissions_DischargeAfterAdmission'
)
BEGIN
    ALTER TABLE IPDAdmissions
    ADD CONSTRAINT CK_IPDAdmissions_DischargeAfterAdmission
    CHECK (DischargeDate IS NULL OR DischargeDate >= AdmissionDate);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('HospitalEquipment')
      AND name = 'CK_HospitalEquipment_MaintenanceDates'
)
BEGIN
    ALTER TABLE HospitalEquipment
    ADD CONSTRAINT CK_HospitalEquipment_MaintenanceDates
    CHECK (NextMaintenanceDue IS NULL OR LastMaintenanceDate IS NULL OR NextMaintenanceDue >= LastMaintenanceDate);
END
GO

CREATE OR ALTER VIEW vw_BillingSummary
AS
SELECT
    'OPD' AS BillingType,
    op.PaymentID,
    op.PatientID,
    u.FullName AS PatientName,
    op.TotalAmount,
    op.PaidAmount,
    (op.TotalAmount - op.PaidAmount) AS OutstandingAmount,
    op.Status
FROM OPDPayments op
INNER JOIN Patients p ON p.PatientID = op.PatientID
INNER JOIN Users u ON u.UserID = p.UserID
UNION ALL
SELECT
    'IPD' AS BillingType,
    ip.PaymentID,
    ip.PatientID,
    u.FullName AS PatientName,
    ip.TotalAmount,
    ip.PaidAmount,
    (ip.TotalAmount - ip.PaidAmount) AS OutstandingAmount,
    ip.Status
FROM IPDPayments ip
INNER JOIN Patients p ON p.PatientID = ip.PatientID
INNER JOIN Users u ON u.UserID = p.UserID;
GO

CREATE OR ALTER VIEW vw_DoctorRatingSummary
AS
SELECT
    d.DoctorID,
    u.FullName AS DoctorName,
    COUNT(r.ReviewID) AS TotalReviews,
    CAST(AVG(CAST(r.Rating AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS AverageRating
FROM Doctors d
INNER JOIN Users u ON u.UserID = d.UserID
LEFT JOIN Reviews r ON r.DoctorID = d.DoctorID
GROUP BY d.DoctorID, u.FullName;
GO

CREATE OR ALTER PROCEDURE sp_CreateIPDPaymentWithDetails
    @AdmissionID INT,
    @PatientID INT,
    @TotalAmount DECIMAL(10,2),
    @PaidAmount DECIMAL(10,2),
    @ItemType1 NVARCHAR(80),
    @Amount1 DECIMAL(10,2),
    @Quantity1 INT = 1,
    @ItemType2 NVARCHAR(80) = NULL,
    @Amount2 DECIMAL(10,2) = NULL,
    @Quantity2 INT = 1
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @PaymentID INT;
        DECLARE @Status NVARCHAR(30) =
            CASE
                WHEN @PaidAmount <= 0 THEN 'Pending'
                WHEN @PaidAmount >= @TotalAmount THEN 'Paid'
                WHEN @PaidAmount < @TotalAmount THEN 'Pending'
                ELSE 'Pending'
            END;

        INSERT INTO IPDPayments (AdmissionID, PatientID, TotalAmount, PaidAmount, Status)
        VALUES (@AdmissionID, @PatientID, @TotalAmount, @PaidAmount, @Status);

        SET @PaymentID = SCOPE_IDENTITY();

        INSERT INTO IPDBillingDetails (PaymentID, ItemType, Amount, Quantity)
        VALUES (@PaymentID, @ItemType1, @Amount1, @Quantity1);

        IF @ItemType2 IS NOT NULL AND @Amount2 IS NOT NULL
        BEGIN
            INSERT INTO IPDBillingDetails (PaymentID, ItemType, Amount, Quantity)
            VALUES (@PaymentID, @ItemType2, @Amount2, @Quantity2);
        END

        COMMIT TRANSACTION;
        SELECT @PaymentID AS PaymentID, @Status AS PaymentStatus;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_AddIPDProgressNote
    @AdmissionID INT,
    @DoctorID INT = NULL,
    @NurseID INT = NULL,
    @VitalSigns NVARCHAR(MAX) = NULL,
    @ProgressNotes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO IPDProgressNotes (AdmissionID, DoctorID, NurseID, VitalSigns, ProgressNotes)
    VALUES (@AdmissionID, @DoctorID, @NurseID, @VitalSigns, @ProgressNotes);

    SELECT SCOPE_IDENTITY() AS ProgressNoteID;
END;
GO

CREATE OR ALTER TRIGGER trg_Doctors_UserRole
ON Doctors
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN Users u ON u.UserID = i.UserID
        WHERE u.Role <> 'Doctor'
    )
    BEGIN
        RAISERROR('Doctors.UserID must reference a user with Role = Doctor.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

CREATE OR ALTER TRIGGER trg_Patients_UserRole
ON Patients
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN Users u ON u.UserID = i.UserID
        WHERE u.Role <> 'Patient'
    )
    BEGIN
        RAISERROR('Patients.UserID must reference a user with Role = Patient.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

CREATE TABLE DoctorSchedules (
    ScheduleID INT IDENTITY(1,1) PRIMARY KEY,
    DoctorID INT NOT NULL FOREIGN KEY REFERENCES Doctors(DoctorID),
    DayOfWeek INT NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    SlotDurationMinutes INT DEFAULT 30,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedBy INT FOREIGN KEY REFERENCES Users(UserID),
    CONSTRAINT CK_DoctorSchedules_DayOfWeek CHECK (DayOfWeek BETWEEN 0 AND 6),
    CONSTRAINT CK_DoctorSchedules_TimeWindow CHECK (StartTime < EndTime),
    CONSTRAINT CK_DoctorSchedules_SlotDuration CHECK (SlotDurationMinutes = 30)
);
GO

CREATE INDEX IX_DoctorSchedules_Doctor ON DoctorSchedules(DoctorID);
CREATE INDEX IX_DoctorSchedules_Day ON DoctorSchedules(DayOfWeek);
GO

CREATE OR ALTER TRIGGER trg_Nurses_UserRole
ON Nurses
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN Users u ON u.UserID = i.UserID
        WHERE u.Role <> 'Nurse'
    )
    BEGIN
        RAISERROR('Nurses.UserID must reference a user with Role = Nurse.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END
GO
