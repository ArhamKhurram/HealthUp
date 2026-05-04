USE HealthUp;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* =========================
   HealthUp Simplified Schema
   Phase 2 (From Scratch)
   ========================= */

/* Drop every FK first so resets work even when legacy tables from older phases still exist. */
DECLARE @dropFkSql NVARCHAR(MAX) = N'';
SELECT @dropFkSql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id)) +
                     N' DROP CONSTRAINT ' + QUOTENAME(name) + N';' + CHAR(13)
FROM sys.foreign_keys;
EXEC sp_executesql @dropFkSql;
GO

/* Drop in dependency-safe order */
IF OBJECT_ID('IPDBillingDetails', 'U') IS NOT NULL DROP TABLE IPDBillingDetails;
IF OBJECT_ID('OPDBillingDetails', 'U') IS NOT NULL DROP TABLE OPDBillingDetails;
IF OBJECT_ID('IPDPayments', 'U') IS NOT NULL DROP TABLE IPDPayments;
IF OBJECT_ID('OPDPayments', 'U') IS NOT NULL DROP TABLE OPDPayments;
IF OBJECT_ID('IPDTestOrders', 'U') IS NOT NULL DROP TABLE IPDTestOrders;
IF OBJECT_ID('OPDTestOrders', 'U') IS NOT NULL DROP TABLE OPDTestOrders;
IF OBJECT_ID('IPDPrescriptionMedications', 'U') IS NOT NULL DROP TABLE IPDPrescriptionMedications;
IF OBJECT_ID('OPDPrescriptionMedications', 'U') IS NOT NULL DROP TABLE OPDPrescriptionMedications;
IF OBJECT_ID('IPDPrescriptions', 'U') IS NOT NULL DROP TABLE IPDPrescriptions;
IF OBJECT_ID('OPDPrescriptions', 'U') IS NOT NULL DROP TABLE OPDPrescriptions;
IF OBJECT_ID('DoctorSchedules', 'U') IS NOT NULL DROP TABLE DoctorSchedules;
IF OBJECT_ID('DoctorDepartments', 'U') IS NOT NULL DROP TABLE DoctorDepartments;
IF OBJECT_ID('DoctorQualifications', 'U') IS NOT NULL DROP TABLE DoctorQualifications;
IF OBJECT_ID('DutyRoster', 'U') IS NOT NULL DROP TABLE DutyRoster;
IF OBJECT_ID('HospitalEquipment', 'U') IS NOT NULL DROP TABLE HospitalEquipment;
IF OBJECT_ID('Beds', 'U') IS NOT NULL DROP TABLE Beds;
IF OBJECT_ID('Wards', 'U') IS NOT NULL DROP TABLE Wards;
IF OBJECT_ID('OPDRooms', 'U') IS NOT NULL DROP TABLE OPDRooms;
IF OBJECT_ID('OTRooms', 'U') IS NOT NULL DROP TABLE OTRooms;
IF OBJECT_ID('SurgeryBookings', 'U') IS NOT NULL DROP TABLE SurgeryBookings;
IF OBJECT_ID('BillingDetails', 'U') IS NOT NULL DROP TABLE BillingDetails;
IF OBJECT_ID('Payments', 'U') IS NOT NULL DROP TABLE Payments;
IF OBJECT_ID('TestOrders', 'U') IS NOT NULL DROP TABLE TestOrders;
IF OBJECT_ID('PrescriptionMedications', 'U') IS NOT NULL DROP TABLE PrescriptionMedications;
IF OBJECT_ID('Prescriptions', 'U') IS NOT NULL DROP TABLE Prescriptions;
IF OBJECT_ID('Reviews', 'U') IS NOT NULL DROP TABLE Reviews;
IF OBJECT_ID('PatientVitals', 'U') IS NOT NULL DROP TABLE PatientVitals;
IF OBJECT_ID('IPDAdmissions', 'U') IS NOT NULL DROP TABLE IPDAdmissions;
IF OBJECT_ID('OPDAppointments', 'U') IS NOT NULL DROP TABLE OPDAppointments;
IF OBJECT_ID('Inventory', 'U') IS NOT NULL DROP TABLE Inventory;
IF OBJECT_ID('Medications', 'U') IS NOT NULL DROP TABLE Medications;
IF OBJECT_ID('MedicalTests', 'U') IS NOT NULL DROP TABLE MedicalTests;
IF OBJECT_ID('Nurses', 'U') IS NOT NULL DROP TABLE Nurses;
IF OBJECT_ID('Doctors', 'U') IS NOT NULL DROP TABLE Doctors;
IF OBJECT_ID('Patients', 'U') IS NOT NULL DROP TABLE Patients;
IF OBJECT_ID('Departments', 'U') IS NOT NULL DROP TABLE Departments;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

CREATE TABLE Users (
  UserID INT IDENTITY(1,1) PRIMARY KEY,
  FullName NVARCHAR(120) NOT NULL,
  Email NVARCHAR(150) NOT NULL UNIQUE,
  Password NVARCHAR(255) NOT NULL,
  Role NVARCHAR(30) NOT NULL,
  Phone NVARCHAR(20) NULL,
  Address NVARCHAR(255) NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Patient', 'Doctor', 'Nurse', 'Receptionist')),
  CONSTRAINT CK_Users_Phone CHECK (Phone IS NULL OR Phone LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
);
GO

CREATE TABLE Departments (
  DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
  DepartmentName NVARCHAR(100) NOT NULL UNIQUE,
  DepartmentType NVARCHAR(50) NOT NULL,
  Location NVARCHAR(120) NULL,
  CONSTRAINT CK_Departments_Type CHECK (DepartmentType IN ('Clinical', 'Surgical', 'Diagnostics', 'Support'))
);
GO

CREATE TABLE Patients (
  PatientID INT IDENTITY(1,1) PRIMARY KEY,
  UserID INT NOT NULL UNIQUE,
  MRNumber NVARCHAR(50) NOT NULL UNIQUE,
  DateOfBirth DATE NOT NULL,
  Gender NVARCHAR(10) NOT NULL,
  BloodGroup NVARCHAR(10) NULL,
  EmergencyContact NVARCHAR(20) NULL,
  Allergies NVARCHAR(MAX) NULL,
  ChronicConditions NVARCHAR(MAX) NULL,
  CONSTRAINT FK_Patients_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
  CONSTRAINT CK_Patients_Gender CHECK (Gender IN ('M', 'F', 'Other')),
  CONSTRAINT CK_Patients_Blood CHECK (BloodGroup IS NULL OR BloodGroup IN ('O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-')),
  CONSTRAINT CK_Patients_EmergencyContact CHECK (EmergencyContact IS NULL OR EmergencyContact LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
);
GO

CREATE TABLE Doctors (
  DoctorID INT IDENTITY(1,1) PRIMARY KEY,
  UserID INT NOT NULL UNIQUE,
  DepartmentID INT NULL,
  Specialization NVARCHAR(100) NOT NULL,
  Qualification NVARCHAR(120) NULL,
  Designation NVARCHAR(100) NULL,
  ConsultationFee DECIMAL(10,2) NOT NULL DEFAULT 0,
  ShiftStartTime TIME NOT NULL DEFAULT '09:00',
  ShiftEndTime TIME NOT NULL DEFAULT '17:00',
  WorkDays NVARCHAR(40) NOT NULL DEFAULT '1,2,3,4,5',
  CONSTRAINT FK_Doctors_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
  CONSTRAINT FK_Doctors_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
  CONSTRAINT CK_Doctors_Fee CHECK (ConsultationFee >= 0),
  CONSTRAINT CK_Doctors_ShiftWindow CHECK (ShiftStartTime < ShiftEndTime)
);
GO

CREATE TABLE Nurses (
  NurseID INT IDENTITY(1,1) PRIMARY KEY,
  UserID INT NOT NULL UNIQUE,
  DepartmentID INT NOT NULL,
  ShiftStartTime TIME NOT NULL DEFAULT '09:00',
  ShiftEndTime TIME NOT NULL DEFAULT '17:00',
  CONSTRAINT FK_Nurses_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
  CONSTRAINT FK_Nurses_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
  CONSTRAINT CK_Nurses_ShiftWindow CHECK (ShiftStartTime < ShiftEndTime)
);
GO

CREATE TABLE MedicalTests (
  TestID INT IDENTITY(1,1) PRIMARY KEY,
  TestName NVARCHAR(120) NOT NULL,
  Category NVARCHAR(80) NOT NULL,
  Cost DECIMAL(10,2) NOT NULL,
  CONSTRAINT CK_MedicalTests_Cost CHECK (Cost >= 0),
  CONSTRAINT CK_MedicalTests_Category CHECK (Category IN ('Pathology', 'Radiology', 'Cardiology', 'Microbiology'))
);
GO

CREATE TABLE Medications (
  MedicationID INT IDENTITY(1,1) PRIMARY KEY,
  MedicationName NVARCHAR(120) NOT NULL,
  Category NVARCHAR(80) NULL,
  Form NVARCHAR(40) NULL,
  UnitPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT CK_Medications_Price CHECK (UnitPrice >= 0)
);
GO

CREATE TABLE Inventory (
  InventoryID INT IDENTITY(1,1) PRIMARY KEY,
  MedicationID INT NOT NULL UNIQUE,
  QuantityInStock INT NOT NULL DEFAULT 0,
  ReorderLevel INT NOT NULL DEFAULT 0,
  ExpiryDate DATE NULL,
  CONSTRAINT FK_Inventory_Medications FOREIGN KEY (MedicationID) REFERENCES Medications(MedicationID),
  CONSTRAINT CK_Inventory_Stock CHECK (QuantityInStock >= 0 AND ReorderLevel >= 0)
);
GO

CREATE TABLE OPDAppointments (
  AppointmentID INT IDENTITY(1,1) PRIMARY KEY,
  PatientID INT NOT NULL,
  DoctorID INT NOT NULL,
  AppointmentDateTime DATETIME2 NOT NULL,
  AppointmentType NVARCHAR(50) NOT NULL DEFAULT 'Consultation',
  Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
  ChiefComplaint NVARCHAR(MAX) NULL,

  -- Foreign keys: appointments belong to patients and doctors
  CONSTRAINT FK_OPDAppointments_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_OPDAppointments_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),

  -- Status workflow: Pending → Confirmed → Completed.
  -- Receptionists and Admins can transition Pending ↔ Confirmed; Doctors set to Completed.
  -- Once Completed, no further edits allowed (enforced in application layer).
  CONSTRAINT CK_OPDAppointments_Status CHECK (Status IN ('Pending', 'Confirmed', 'Completed')),

  -- A doctor cannot have two active (Pending/Confirmed) appointments at the same datetime slot.
  -- Enforced via filtered unique index below.
);
GO

/* Indexes for OPDAppointments (performance for common lookups):
   • By date descending for list views
   • By patient for patient history
   • By doctor for doctor schedules
   • Composite index for the active-slot uniqueness filter and scheduling queries
*/
CREATE NONCLUSTERED INDEX IX_OPDAppointments_Date_Status ON OPDAppointments (AppointmentDateTime DESC, Status);
CREATE NONCLUSTERED INDEX IX_OPDAppointments_Patient ON OPDAppointments (PatientID, AppointmentDateTime DESC);
CREATE NONCLUSTERED INDEX IX_OPDAppointments_Doctor ON OPDAppointments (DoctorID, AppointmentDateTime DESC);
-- Used by the unique constraint above and slot-booking queries
CREATE NONCLUSTERED INDEX IX_OPDAppointments_Doctor_Slot_Status ON OPDAppointments (DoctorID, AppointmentDateTime) WHERE Status IN ('Pending', 'Confirmed');
CREATE UNIQUE NONCLUSTERED INDEX UQ_OPDAppointments_Doctor_Active_Slot ON OPDAppointments (DoctorID, AppointmentDateTime) WHERE Status IN ('Pending', 'Confirmed');
GO

CREATE TABLE IPDAdmissions (
  AdmissionID INT IDENTITY(1,1) PRIMARY KEY,
  PatientID INT NOT NULL,
  DoctorID INT NOT NULL,
  DepartmentID INT NOT NULL,
  AdmissionDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  DischargeDate DATETIME2 NULL,
  Status NVARCHAR(20) NOT NULL DEFAULT 'Admitted',
  BedNumber NVARCHAR(30) NULL,
  Diagnosis NVARCHAR(MAX) NULL,
  CONSTRAINT FK_IPDAdmissions_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_IPDAdmissions_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
  CONSTRAINT FK_IPDAdmissions_Departments FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
  CONSTRAINT CK_IPDAdmissions_Status CHECK (Status IN ('Admitted', 'Discharged')),
  CONSTRAINT CK_IPDAdmissions_DateWindow CHECK (DischargeDate IS NULL OR DischargeDate >= AdmissionDate)
);
GO

CREATE TABLE Prescriptions (
  PrescriptionID INT IDENTITY(1,1) PRIMARY KEY,
  PatientID INT NOT NULL,
  DoctorID INT NOT NULL,
  AppointmentID INT NULL,
  AdmissionID INT NULL,
  PrescriptionDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  Diagnosis NVARCHAR(MAX) NULL,
  Notes NVARCHAR(MAX) NULL,
  CONSTRAINT FK_Prescriptions_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_Prescriptions_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
  CONSTRAINT FK_Prescriptions_OPDAppointment FOREIGN KEY (AppointmentID) REFERENCES OPDAppointments(AppointmentID),
  CONSTRAINT FK_Prescriptions_IPDAdmission FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
  CONSTRAINT CK_Prescriptions_Source CHECK (
    (AppointmentID IS NOT NULL AND AdmissionID IS NULL) OR
    (AppointmentID IS NULL AND AdmissionID IS NOT NULL)
  )
);
GO

CREATE TABLE PrescriptionMedications (
  PrescriptionMedicationID INT IDENTITY(1,1) PRIMARY KEY,
  PrescriptionID INT NOT NULL,
  MedicationID INT NOT NULL,
  Dosage NVARCHAR(80) NOT NULL,
  Frequency NVARCHAR(80) NOT NULL,
  DurationDays INT NULL,
  Instructions NVARCHAR(255) NULL,
  CONSTRAINT FK_PrescriptionMedications_Prescriptions FOREIGN KEY (PrescriptionID) REFERENCES Prescriptions(PrescriptionID),
  CONSTRAINT FK_PrescriptionMedications_Medications FOREIGN KEY (MedicationID) REFERENCES Medications(MedicationID),
  CONSTRAINT CK_PrescriptionMedications_Duration CHECK (DurationDays IS NULL OR DurationDays > 0)
);
GO

CREATE TABLE TestOrders (
  TestOrderID INT IDENTITY(1,1) PRIMARY KEY,
  PatientID INT NOT NULL,
  DoctorID INT NOT NULL,
  TestID INT NOT NULL,
  AppointmentID INT NULL,
  AdmissionID INT NULL,
  OrderedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  Status NVARCHAR(20) NOT NULL DEFAULT 'Ordered',
  Results NVARCHAR(MAX) NULL,
  CONSTRAINT FK_TestOrders_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_TestOrders_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
  CONSTRAINT FK_TestOrders_MedicalTests FOREIGN KEY (TestID) REFERENCES MedicalTests(TestID),
  CONSTRAINT FK_TestOrders_OPDAppointment FOREIGN KEY (AppointmentID) REFERENCES OPDAppointments(AppointmentID),
  CONSTRAINT FK_TestOrders_IPDAdmission FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
  CONSTRAINT CK_TestOrders_Status CHECK (Status IN ('Ordered', 'Completed', 'Cancelled')),
  CONSTRAINT CK_TestOrders_Source CHECK (
    (AppointmentID IS NOT NULL AND AdmissionID IS NULL) OR
    (AppointmentID IS NULL AND AdmissionID IS NOT NULL)
  )
);
GO

CREATE TABLE Payments (
  PaymentID INT IDENTITY(1,1) PRIMARY KEY,
  PatientID INT NOT NULL,
  AppointmentID INT NULL,
  AdmissionID INT NULL,
  TotalAmount DECIMAL(10,2) NOT NULL,
  PaidAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
  Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
  PaymentMethod NVARCHAR(30) NULL,
  ReferenceNo NVARCHAR(100) NULL,
  ReceivedByUserID INT NULL,
  PaidAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Payments_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_Payments_OPDAppointment FOREIGN KEY (AppointmentID) REFERENCES OPDAppointments(AppointmentID),
  CONSTRAINT FK_Payments_IPDAdmission FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
  CONSTRAINT FK_Payments_ReceivedByUser FOREIGN KEY (ReceivedByUserID) REFERENCES Users(UserID),
  CONSTRAINT CK_Payments_Amounts CHECK (TotalAmount >= 0 AND PaidAmount >= 0 AND PaidAmount <= TotalAmount),
  CONSTRAINT CK_Payments_Status CHECK (Status IN ('Pending', 'Paid', 'Rejected')),
  CONSTRAINT CK_Payments_Source CHECK (
    (AppointmentID IS NOT NULL AND AdmissionID IS NULL) OR
    (AppointmentID IS NULL AND AdmissionID IS NOT NULL)
  )
);
GO

CREATE TABLE BillingDetails (
  BillingDetailID INT IDENTITY(1,1) PRIMARY KEY,
  PaymentID INT NOT NULL,
  ItemType NVARCHAR(50) NOT NULL,
  ItemDescription NVARCHAR(150) NULL,
  Quantity INT NOT NULL DEFAULT 1,
  UnitPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
  LineTotal AS (Quantity * UnitPrice) PERSISTED,
  CONSTRAINT FK_BillingDetails_Payments FOREIGN KEY (PaymentID) REFERENCES Payments(PaymentID),
  CONSTRAINT CK_BillingDetails_QtyPrice CHECK (Quantity > 0 AND UnitPrice >= 0)
);
GO

CREATE TABLE Reviews (
  ReviewID INT IDENTITY(1,1) PRIMARY KEY,
  PatientID INT NOT NULL,
  DoctorID INT NOT NULL,
  Rating INT NOT NULL,
  Comments NVARCHAR(MAX) NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Reviews_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_Reviews_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
  CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5)
);
GO

/* Flow: Nurse records vitals/progress for an admitted IPD patient; doctor/admin views timeline in patient details. */
CREATE TABLE PatientVitals (
  VitalID INT IDENTITY(1,1) PRIMARY KEY,
  AdmissionID INT NOT NULL,
  PatientID INT NOT NULL,
  NurseID INT NOT NULL,
  RecordedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  TemperatureC DECIMAL(4,1) NULL,
  SystolicBP INT NULL,
  DiastolicBP INT NULL,
  HeartRate INT NULL,
  RespiratoryRate INT NULL,
  OxygenSaturation INT NULL,
  ProgressNote NVARCHAR(MAX) NULL,
  CONSTRAINT FK_PatientVitals_Admissions FOREIGN KEY (AdmissionID) REFERENCES IPDAdmissions(AdmissionID),
  CONSTRAINT FK_PatientVitals_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_PatientVitals_Nurses FOREIGN KEY (NurseID) REFERENCES Nurses(NurseID),
  CONSTRAINT CK_PatientVitals_Temp CHECK (TemperatureC IS NULL OR (TemperatureC >= 30 AND TemperatureC <= 45)),
  CONSTRAINT CK_PatientVitals_BP CHECK (
    (SystolicBP IS NULL AND DiastolicBP IS NULL) OR
    (SystolicBP IS NOT NULL AND DiastolicBP IS NOT NULL AND SystolicBP BETWEEN 60 AND 260 AND DiastolicBP BETWEEN 40 AND 180)
  ),
  CONSTRAINT CK_PatientVitals_HeartRate CHECK (HeartRate IS NULL OR HeartRate BETWEEN 20 AND 260),
  CONSTRAINT CK_PatientVitals_RespRate CHECK (RespiratoryRate IS NULL OR RespiratoryRate BETWEEN 5 AND 80),
  CONSTRAINT CK_PatientVitals_O2 CHECK (OxygenSaturation IS NULL OR OxygenSaturation BETWEEN 50 AND 100),
  CONSTRAINT CK_PatientVitals_Content CHECK (
    ProgressNote IS NOT NULL OR TemperatureC IS NOT NULL OR SystolicBP IS NOT NULL OR HeartRate IS NOT NULL OR RespiratoryRate IS NOT NULL OR OxygenSaturation IS NOT NULL
  )
);
GO

CREATE OR ALTER VIEW vw_PatientVitalHistory
AS
SELECT
  v.VitalID,
  v.AdmissionID,
  v.PatientID,
  pu.FullName AS PatientName,
  v.NurseID,
  nu.FullName AS NurseName,
  v.RecordedAt,
  v.TemperatureC,
  v.SystolicBP,
  v.DiastolicBP,
  v.HeartRate,
  v.RespiratoryRate,
  v.OxygenSaturation,
  v.ProgressNote
FROM PatientVitals v
INNER JOIN Patients p ON p.PatientID = v.PatientID
INNER JOIN Users pu ON pu.UserID = p.UserID
INNER JOIN Nurses n ON n.NurseID = v.NurseID
INNER JOIN Users nu ON nu.UserID = n.UserID;
GO

/* Flow 1C (Nurse Vitals): Nurse submits vitals/progress for selected admission; inserts normalized row. */
CREATE OR ALTER PROCEDURE sp_RecordPatientVital
  @AdmissionID INT,
  @NurseID INT,
  @TemperatureC DECIMAL(4,1) = NULL,
  @SystolicBP INT = NULL,
  @DiastolicBP INT = NULL,
  @HeartRate INT = NULL,
  @RespiratoryRate INT = NULL,
  @OxygenSaturation INT = NULL,
  @ProgressNote NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @PatientID INT;
  SELECT @PatientID = PatientID FROM IPDAdmissions WHERE AdmissionID = @AdmissionID;

  IF @PatientID IS NULL
    THROW 50001, 'Admission not found.', 1;

  INSERT INTO PatientVitals (
    AdmissionID, PatientID, NurseID, TemperatureC, SystolicBP, DiastolicBP, HeartRate, RespiratoryRate, OxygenSaturation, ProgressNote
  )
  VALUES (
    @AdmissionID, @PatientID, @NurseID, @TemperatureC, @SystolicBP, @DiastolicBP, @HeartRate, @RespiratoryRate, @OxygenSaturation, @ProgressNote
  );

  SELECT * FROM vw_PatientVitalHistory WHERE VitalID = SCOPE_IDENTITY();
END;
GO

/* Flow 1C (Vital History): Doctor/Nurse/Admin fetches timeline for selected admission in patient details page. */
CREATE OR ALTER PROCEDURE sp_GetPatientVitalHistory
  @AdmissionID INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM vw_PatientVitalHistory
  WHERE AdmissionID = @AdmissionID
  ORDER BY RecordedAt DESC, VitalID DESC;
END;
GO

CREATE OR ALTER VIEW vw_UserAuthProfile
AS
SELECT u.UserID, u.FullName, u.Email, u.Password, u.Role, u.Phone, u.Address, u.IsActive,
       p.PatientID, d.DoctorID, n.NurseID
FROM Users u
LEFT JOIN Patients p ON p.UserID = u.UserID
LEFT JOIN Doctors d ON d.UserID = u.UserID
LEFT JOIN Nurses n ON n.UserID = u.UserID;
GO

CREATE OR ALTER VIEW vw_IPDAdmissionDetails
AS
SELECT a.AdmissionID, a.PatientID, a.DoctorID, a.DepartmentID,
       a.AdmissionDate, a.DischargeDate, a.Status, a.BedNumber, a.Diagnosis,
       a.DoctorID AS AttendingDoctorID,
       a.DepartmentID AS WardID,
       CAST(NULL AS int) AS BedID,
       'General' AS AdmissionType,
       a.Diagnosis AS ClinicalDiagnosis,
       p.MRNumber,
       pu.FullName AS PatientName,
       du.FullName AS DoctorName,
       dep.DepartmentName,
       dep.DepartmentName AS WardName
FROM IPDAdmissions a
INNER JOIN Patients p ON p.PatientID = a.PatientID
INNER JOIN Users pu ON pu.UserID = p.UserID
INNER JOIN Doctors d ON d.DoctorID = a.DoctorID
INNER JOIN Users du ON du.UserID = d.UserID
INNER JOIN Departments dep ON dep.DepartmentID = a.DepartmentID;
GO

CREATE OR ALTER VIEW vw_PaymentSummary
AS
SELECT pay.PaymentID, pay.PatientID, pay.AppointmentID, pay.AdmissionID,
       pay.TotalAmount, pay.PaidAmount, pay.Status, pay.PaymentMethod, pay.ReferenceNo,
       pay.ReceivedByUserID, pay.PaidAt, pay.CreatedAt,
       pu.FullName AS PatientName, ru.FullName AS ReceivedByName
FROM Payments pay
INNER JOIN Patients p ON p.PatientID = pay.PatientID
INNER JOIN Users pu ON pu.UserID = p.UserID
LEFT JOIN Users ru ON ru.UserID = pay.ReceivedByUserID;
GO

CREATE OR ALTER PROCEDURE sp_LoginUser @Email NVARCHAR(150)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM vw_UserAuthProfile WHERE Email = @Email;
END;
GO

CREATE OR ALTER PROCEDURE sp_RegisterPatient
  @FullName NVARCHAR(120), @Email NVARCHAR(150), @Password NVARCHAR(255),
  @Phone NVARCHAR(30) = NULL, @Address NVARCHAR(255) = NULL, @MRNumber NVARCHAR(50),
  @DateOfBirth DATE, @Gender NVARCHAR(20), @BloodGroup NVARCHAR(10) = NULL,
  @EmergencyContact NVARCHAR(50) = NULL, @Allergies NVARCHAR(MAX) = NULL, @ChronicConditions NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRAN;
  BEGIN TRY
    INSERT INTO Users (FullName, Email, Password, Role, Phone, Address)
    VALUES (@FullName, @Email, @Password, 'Patient', @Phone, @Address);
    DECLARE @UserID INT = SCOPE_IDENTITY();
    INSERT INTO Patients (UserID, MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions)
    VALUES (@UserID, @MRNumber, @DateOfBirth, @Gender, @BloodGroup, @EmergencyContact, @Allergies, @ChronicConditions);
    SELECT u.UserID, u.FullName, u.Email, u.Role, p.PatientID, p.MRNumber
    FROM Users u INNER JOIN Patients p ON p.UserID = u.UserID WHERE u.UserID = @UserID;
    COMMIT TRAN;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_ListIPDAdmissions @PatientID INT = NULL, @DoctorID INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM vw_IPDAdmissionDetails
  WHERE (@PatientID IS NULL OR PatientID = @PatientID) AND (@DoctorID IS NULL OR DoctorID = @DoctorID)
  ORDER BY AdmissionDate DESC;
END;
GO

CREATE OR ALTER PROCEDURE sp_CreateIPDAdmission
  @PatientID INT, @DoctorID INT, @DepartmentID INT, @BedNumber NVARCHAR(30), @Diagnosis NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO IPDAdmissions (PatientID, DoctorID, DepartmentID, BedNumber, Diagnosis, Status)
  VALUES (@PatientID, @DoctorID, @DepartmentID, @BedNumber, @Diagnosis, 'Admitted');
  SELECT * FROM vw_IPDAdmissionDetails WHERE AdmissionID = SCOPE_IDENTITY();
END;
GO

CREATE OR ALTER PROCEDURE sp_UpdateIPDAdmission
  @AdmissionID INT, @PatientID INT, @DoctorID INT, @DepartmentID INT, @BedNumber NVARCHAR(30),
  @Diagnosis NVARCHAR(MAX) = NULL, @Status NVARCHAR(30), @DischargeDate DATETIME2 = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE IPDAdmissions
  SET PatientID = @PatientID, DoctorID = @DoctorID, DepartmentID = @DepartmentID, BedNumber = @BedNumber,
      Diagnosis = @Diagnosis, Status = @Status,
      DischargeDate = CASE WHEN @Status = 'Discharged' THEN COALESCE(@DischargeDate, SYSDATETIME()) ELSE @DischargeDate END
  WHERE AdmissionID = @AdmissionID;
  SELECT * FROM vw_IPDAdmissionDetails WHERE AdmissionID = @AdmissionID;
END;
GO

CREATE OR ALTER PROCEDURE sp_RecordPayment
  @PatientID INT, @AppointmentID INT = NULL, @AdmissionID INT = NULL, @TotalAmount DECIMAL(10,2),
  @PaidAmount DECIMAL(10,2), @Status NVARCHAR(30), @PaymentMethod NVARCHAR(50),
  @ReferenceNo NVARCHAR(80) = NULL, @ReceivedByUserID INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Payments (PatientID, AppointmentID, AdmissionID, TotalAmount, PaidAmount, Status, PaymentMethod, ReferenceNo, ReceivedByUserID, PaidAt)
  VALUES (@PatientID, @AppointmentID, @AdmissionID, @TotalAmount, @PaidAmount, @Status, @PaymentMethod, @ReferenceNo, @ReceivedByUserID, CASE WHEN @Status='Paid' THEN SYSDATETIME() ELSE NULL END);
  SELECT * FROM vw_PaymentSummary WHERE PaymentID = SCOPE_IDENTITY();
END;
GO

CREATE OR ALTER TRIGGER trg_Payments_SetPaidAt ON Payments
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE p
  SET PaidAt = COALESCE(p.PaidAt, SYSUTCDATETIME())
  FROM Payments p
  INNER JOIN inserted i ON i.PaymentID = p.PaymentID
  WHERE i.Status = 'Paid';
END;
GO
