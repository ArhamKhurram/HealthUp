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
  CONSTRAINT FK_OPDAppointments_Patients FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
  CONSTRAINT FK_OPDAppointments_Doctors FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
  CONSTRAINT CK_OPDAppointments_Status CHECK (Status IN ('Pending', 'Confirmed', 'Completed'))
);
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
