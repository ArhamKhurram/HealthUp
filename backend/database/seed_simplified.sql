USE HealthUp;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @PasswordHash NVARCHAR(255) = '$2a$10$9nZd2vdC9w6XWcteRzOAQOmZC4r.xpjxBGDbQM8Jn9NvqA.4pgbQa';

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@healthup.test')
BEGIN
  INSERT INTO Users (FullName, Email, Password, Role, Phone, Address)
  VALUES
    ('System Admin', 'admin@healthup.test', @PasswordHash, 'Admin', '03000000000', 'Admin Office'),
    ('Sara Khan', 'patient@healthup.test', @PasswordHash, 'Patient', '03011111111', 'Lahore'),
    ('Dr. Ahmed Raza', 'doctor@healthup.test', @PasswordHash, 'Doctor', '03022222222', 'Lahore'),
    ('Nurse Fatima Noor', 'nurse@healthup.test', @PasswordHash, 'Nurse', '03033333333', 'Lahore'),
    ('Ali Hassan', 'reception@healthup.test', @PasswordHash, 'Receptionist', '03055555555', 'Front Desk');
END
GO

IF NOT EXISTS (SELECT 1 FROM Departments)
BEGIN
  INSERT INTO Departments (DepartmentName, DepartmentType, Location)
  VALUES
    ('Cardiology', 'Clinical', 'First Floor'),
    ('General Medicine', 'Clinical', 'Ground Floor');
END
GO

IF NOT EXISTS (SELECT 1 FROM Patients)
BEGIN
  INSERT INTO Patients (UserID, MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions)
  SELECT u.UserID, 'MR-0001', '2001-08-12', 'F', 'B+', '03044444444', 'Penicillin', 'None'
  FROM Users u
  WHERE u.Email = 'patient@healthup.test';
END
GO

IF NOT EXISTS (SELECT 1 FROM Doctors)
BEGIN
  INSERT INTO Doctors (UserID, DepartmentID, Specialization, Qualification, Designation, ConsultationFee, ShiftStartTime, ShiftEndTime, WorkDays)
  SELECT u.UserID, d.DepartmentID, 'Cardiology', 'MBBS', 'Consultant', 2500, '09:00', '17:00', '1,2,3,4,5'
  FROM Users u
  CROSS JOIN Departments d
  WHERE u.Email = 'doctor@healthup.test' AND d.DepartmentName = 'Cardiology';
END
GO

IF NOT EXISTS (SELECT 1 FROM Nurses)
BEGIN
  INSERT INTO Nurses (UserID, DepartmentID, ShiftStartTime, ShiftEndTime)
  SELECT u.UserID, d.DepartmentID, '09:00', '17:00'
  FROM Users u
  CROSS JOIN Departments d
  WHERE u.Email = 'nurse@healthup.test' AND d.DepartmentName = 'Cardiology';
END
GO

IF NOT EXISTS (SELECT 1 FROM MedicalTests)
BEGIN
  INSERT INTO MedicalTests (TestName, Category, Cost)
  VALUES ('Complete Blood Count', 'Pathology', 1200), ('Electrocardiogram', 'Cardiology', 1500);
END
GO

IF NOT EXISTS (SELECT 1 FROM Medications)
BEGIN
  INSERT INTO Medications (MedicationName, Category, Form, UnitPrice)
  VALUES ('Panadol', 'Analgesic', 'Tablet', 12), ('Augmentin', 'Antibiotic', 'Tablet', 85);
END
GO

IF NOT EXISTS (SELECT 1 FROM Inventory)
BEGIN
  INSERT INTO Inventory (MedicationID, QuantityInStock, ReorderLevel, ExpiryDate)
  SELECT MedicationID, 100, 20, '2027-12-31' FROM Medications;
END
GO

IF NOT EXISTS (SELECT 1 FROM OPDAppointments)
BEGIN
  INSERT INTO OPDAppointments (PatientID, DoctorID, AppointmentDateTime, AppointmentType, Status, ChiefComplaint)
  SELECT p.PatientID, d.DoctorID, DATEADD(DAY, 1, SYSUTCDATETIME()), 'Consultation', 'Confirmed', 'Chest discomfort'
  FROM Patients p CROSS JOIN Doctors d;
END
GO

IF NOT EXISTS (SELECT 1 FROM Prescriptions)
BEGIN
  INSERT INTO Prescriptions (PatientID, DoctorID, AppointmentID, PrescriptionDate, Diagnosis, Notes)
  SELECT a.PatientID, a.DoctorID, a.AppointmentID, SYSUTCDATETIME(), 'Stable OPD case', 'Hydration and follow-up'
  FROM OPDAppointments a;
END
GO

IF NOT EXISTS (SELECT 1 FROM PrescriptionMedications)
BEGIN
  INSERT INTO PrescriptionMedications (PrescriptionID, MedicationID, Dosage, Frequency, DurationDays, Instructions)
  SELECT TOP 1 p.PrescriptionID, m.MedicationID, '500 mg', 'Twice Daily', 5, 'After meals'
  FROM Prescriptions p CROSS JOIN Medications m
  ORDER BY p.PrescriptionID, m.MedicationID;
END
GO

IF NOT EXISTS (SELECT 1 FROM TestOrders)
BEGIN
  INSERT INTO TestOrders (PatientID, DoctorID, TestID, AppointmentID, Status)
  SELECT TOP 1 a.PatientID, a.DoctorID, t.TestID, a.AppointmentID, 'Ordered'
  FROM OPDAppointments a CROSS JOIN MedicalTests t
  ORDER BY a.AppointmentID, t.TestID;
END
GO

IF NOT EXISTS (SELECT 1 FROM Payments)
BEGIN
  INSERT INTO Payments (PatientID, AppointmentID, TotalAmount, PaidAmount, Status, PaymentMethod, ReferenceNo, ReceivedByUserID, PaidAt)
  SELECT TOP 1 a.PatientID, a.AppointmentID, 2500, 2500, 'Paid', 'Cash', 'OPD-REC-001', u.UserID, SYSUTCDATETIME()
  FROM OPDAppointments a
  CROSS JOIN Users u
  WHERE u.Role = 'Receptionist';
END
GO

IF NOT EXISTS (SELECT 1 FROM BillingDetails)
BEGIN
  INSERT INTO BillingDetails (PaymentID, ItemType, ItemDescription, Quantity, UnitPrice)
  SELECT TOP 1 p.PaymentID, 'Consultation', 'OPD Consultation Fee', 1, 2500
  FROM Payments p;
END
GO

IF NOT EXISTS (SELECT 1 FROM IPDAdmissions)
BEGIN
  INSERT INTO IPDAdmissions (PatientID, DoctorID, DepartmentID, AdmissionDate, Status, BedNumber, Diagnosis)
  SELECT TOP 1 p.PatientID, d.DoctorID, d.DepartmentID, SYSUTCDATETIME(), 'Admitted', 'B-101', 'Observation'
  FROM Patients p CROSS JOIN Doctors d;
END
GO

IF NOT EXISTS (SELECT 1 FROM Reviews)
BEGIN
  INSERT INTO Reviews (PatientID, DoctorID, Rating, Comments)
  SELECT TOP 1 p.PatientID, d.DoctorID, 5, 'Very professional and attentive.'
  FROM Patients p CROSS JOIN Doctors d;
END
GO
