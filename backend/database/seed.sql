USE HealthUp;
GO

-- Demo password for all users: password
DECLARE @PasswordHash NVARCHAR(255) = '$2a$10$9nZd2vdC9w6XWcteRzOAQOmZC4r.xpjxBGDbQM8Jn9NvqA.4pgbQa';

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@healthup.test')
BEGIN
    INSERT INTO Users (FullName, Email, Password, Role, Phone, Address)
    VALUES
        ('System Admin', 'admin@healthup.test', @PasswordHash, 'Admin', '0300-0000000', 'HealthUp Admin Office'),
        ('Sara Khan', 'patient@healthup.test', @PasswordHash, 'Patient', '0301-1111111', 'Lahore'),
        ('Dr. Ahmed Raza', 'doctor@healthup.test', @PasswordHash, 'Doctor', '0302-2222222', 'Lahore'),
        ('Nurse Fatima Noor', 'nurse@healthup.test', @PasswordHash, 'Nurse', '0303-3333333', 'Lahore'),
        ('Ali Hassan', 'reception@healthup.test', @PasswordHash, 'Receptionist', '0305-5555555', 'Front Desk');

    INSERT INTO Departments (DepartmentName, DepartmentType, Location, HeadOfDepartment, ContactNumber)
    VALUES
        ('Cardiology', 'Clinical', 'First Floor', 'Dr. Ahmed Raza', '042-111-222'),
        ('General Medicine', 'Clinical', 'Ground Floor', 'Dr. Ahmed Raza', '042-111-333');

    INSERT INTO Patients (UserID, MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions)
    SELECT UserID, 'MR-0001', '2001-08-12', 'Female', 'B+', '0304-4444444', 'Penicillin', 'None'
    FROM Users
    WHERE Email = 'patient@healthup.test';

    INSERT INTO Doctors (UserID, Specialization, Qualification, Designation, LicenseNumber, ExperienceYears, ConsultationFee, AvailableForOPD, AvailableForIPD)
    SELECT UserID, 'Cardiology', 'MBBS, FCPS', 'Consultant Cardiologist', 'PMDC-HEALTHUP-001', 9, 2500, 1, 1
    FROM Users
    WHERE Email = 'doctor@healthup.test';

    INSERT INTO Nurses (UserID, DepartmentID, ShiftTime, NurseType, Certification)
    SELECT u.UserID, d.DepartmentID, 'Morning', 'Registered Nurse', 'BSc Nursing'
    FROM Users u
    CROSS JOIN Departments d
    WHERE u.Email = 'nurse@healthup.test' AND d.DepartmentName = 'Cardiology';

    INSERT INTO DoctorDepartments (DoctorID, DepartmentID, Schedule)
    SELECT doc.DoctorID, dep.DepartmentID, 'Mon-Fri 09:00-14:00'
    FROM Doctors doc
    CROSS JOIN Departments dep
    WHERE dep.DepartmentName = 'Cardiology';

    INSERT INTO Wards (DepartmentID, WardName, WardType, Floor, TotalBeds, DailyCharges, NurseInCharge)
    SELECT dep.DepartmentID, 'Cardiology Ward A', 'General', 1, 20, 5000, nurse.NurseID
    FROM Departments dep
    CROSS JOIN Nurses nurse
    WHERE dep.DepartmentName = 'Cardiology';

    INSERT INTO Beds (WardID, BedNumber, BedType, Status, DailyCharges)
    SELECT WardID, 'A-101', 'Standard', 'Available', 5000
    FROM Wards
    WHERE WardName = 'Cardiology Ward A';

    INSERT INTO OPDRooms (DepartmentID, RoomNumber, RoomType, Status, Capacity)
    SELECT DepartmentID, 'OPD-01', 'Consultation', 'Available', 1
    FROM Departments
    WHERE DepartmentName = 'Cardiology';

    INSERT INTO MedicalTests (TestName, TestCode, Category, Cost)
    VALUES
        ('Complete Blood Count', 'CBC', 'Pathology', 1200),
        ('Electrocardiogram', 'ECG', 'Cardiology', 1500);

    INSERT INTO Medications (MedicationName, GenericName, Category, UnitPrice, Form)
    VALUES
        ('Panadol', 'Paracetamol', 'Analgesic', 12, 'Tablet'),
        ('Augmentin', 'Amoxicillin Clavulanate', 'Antibiotic', 85, 'Tablet');

    INSERT INTO Inventory (MedicationID, QuantityInStock, MinimumStockLevel, ReorderLevel, ExpiryDate)
    SELECT MedicationID, 100, 20, 35, '2027-12-31'
    FROM Medications;

    INSERT INTO OPDAppointments (PatientID, DoctorID, RoomID, AppointmentDate, AppointmentType, Status, ChiefComplaint, TokenNumber)
    SELECT p.PatientID, d.DoctorID, r.RoomID, DATEADD(DAY, 1, SYSUTCDATETIME()), 'Consultation', 'Confirmed', 'Chest discomfort', NEXT VALUE FOR OPDTokenSequence
    FROM Patients p
    CROSS JOIN Doctors d
    CROSS JOIN OPDRooms r;

    -- Seed initial doctor reviews for demo/reporting.
    INSERT INTO Reviews (PatientID, DoctorID, Rating, Comments)
    SELECT p.PatientID, d.DoctorID, v.Rating, v.Comments
    FROM Patients p
    CROSS JOIN Doctors d
    CROSS JOIN (VALUES
        (5, N'Excellent care and clear explanation.'),
        (4, N'Good consultation and follow-up guidance.'),
        (5, N'Very professional and attentive.'),
        (4, N'Helpful treatment plan and advice.'),
        (5, N'Highly satisfied with overall experience.')
    ) v(Rating, Comments);
END
GO
