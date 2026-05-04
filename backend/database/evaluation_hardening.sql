USE HealthUp;
GO

UPDATE Users
SET Phone = NULL
WHERE Phone IS NOT NULL
  AND Phone NOT LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';
GO

UPDATE Users
SET Role = 'Patient'
WHERE Role NOT IN ('Admin', 'Patient', 'Doctor', 'Nurse', 'Receptionist');

UPDATE Patients
SET EmergencyContact = NULL
WHERE EmergencyContact IS NOT NULL
  AND EmergencyContact NOT LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';

UPDATE Departments
SET ContactNumber = NULL
WHERE ContactNumber IS NOT NULL
  AND ContactNumber NOT LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]';

UPDATE Departments SET DepartmentType = 'Clinical' WHERE DepartmentType NOT IN ('Clinical', 'Surgical', 'Diagnostics', 'Support');
UPDATE Wards SET WardType = 'General' WHERE WardType NOT IN ('General', 'Private', 'ICU', 'Isolation');
UPDATE Beds SET BedType = 'General' WHERE BedType NOT IN ('General', 'Semi-Private', 'Private', 'ICU', 'Isolation');
UPDATE OPDRooms SET RoomType = 'Consultation' WHERE RoomType NOT IN ('Consultation', 'Procedure', 'Emergency');
IF COL_LENGTH('DutyRoster', 'ShiftStartTime') IS NULL
BEGIN
    ALTER TABLE DutyRoster ADD ShiftStartTime TIME NULL;
END;

IF COL_LENGTH('DutyRoster', 'ShiftEndTime') IS NULL
BEGIN
    ALTER TABLE DutyRoster ADD ShiftEndTime TIME NULL;
END;

UPDATE DutyRoster
SET ShiftStartTime = CASE ShiftType WHEN 'Morning' THEN '08:00' WHEN 'Evening' THEN '14:00' WHEN 'Night' THEN '20:00' ELSE '09:00' END
WHERE ShiftStartTime IS NULL;

UPDATE DutyRoster
SET ShiftEndTime = CASE ShiftType WHEN 'Morning' THEN '14:00' WHEN 'Evening' THEN '20:00' WHEN 'Night' THEN '23:59' ELSE '17:00' END
WHERE ShiftEndTime IS NULL;

UPDATE DutyRoster SET ShiftType = 'Custom' WHERE ShiftType NOT IN ('Morning', 'Evening', 'Night', 'Custom');
UPDATE HospitalEquipment SET Status = 'Available' WHERE Status NOT IN ('Available', 'In Use', 'Maintenance', 'Out of Service');
UPDATE Medications SET Category = NULL WHERE Category IS NOT NULL AND Category NOT IN ('Antibiotic', 'Analgesic', 'Antipyretic', 'Antiseptic', 'Other');
UPDATE Medications SET Form = NULL WHERE Form IS NOT NULL AND Form NOT IN ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment');
UPDATE MedicalTests SET Category = 'Pathology' WHERE Category NOT IN ('Pathology', 'Radiology', 'Cardiology', 'Microbiology');
UPDATE OPDPayments SET Status = CASE WHEN PaidAmount >= TotalAmount THEN 'Paid' WHEN Status = 'Rejected' THEN 'Rejected' ELSE 'Pending' END;
UPDATE IPDPayments SET Status = CASE WHEN PaidAmount >= TotalAmount THEN 'Paid' WHEN Status = 'Rejected' THEN 'Rejected' ELSE 'Pending' END;
UPDATE OPDAppointments SET Status = 'Pending' WHERE Status NOT IN ('Pending', 'PendingPayment', 'Confirmed', 'CheckedIn', 'Completed', 'Cancelled');
UPDATE OPDTestOrders SET Status = 'Ordered' WHERE Status NOT IN ('Ordered', 'Completed', 'Cancelled');
UPDATE IPDTestOrders SET Status = 'Ordered' WHERE Status NOT IN ('Ordered', 'Completed', 'Cancelled');
UPDATE SurgeryBookings SET Status = 'Scheduled' WHERE Status NOT IN ('Scheduled', 'Completed', 'Cancelled');
UPDATE SurgeryBookings SET EndTime = NULL WHERE EndTime IS NOT NULL AND EndTime <= StartTime;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role' AND parent_object_id = OBJECT_ID('Users'))
BEGIN
    ALTER TABLE Users DROP CONSTRAINT CK_Users_Role;
END
GO
ALTER TABLE Users
ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Patient', 'Doctor', 'Nurse', 'Receptionist'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Phone' AND parent_object_id = OBJECT_ID('Users'))
BEGIN
    ALTER TABLE Users DROP CONSTRAINT CK_Users_Phone;
END
GO
ALTER TABLE Users
ADD CONSTRAINT CK_Users_Phone CHECK (Phone IS NULL OR Phone LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Patients_EmergencyContact' AND parent_object_id = OBJECT_ID('Patients'))
BEGIN
    ALTER TABLE Patients DROP CONSTRAINT CK_Patients_EmergencyContact;
END
GO
ALTER TABLE Patients
ADD CONSTRAINT CK_Patients_EmergencyContact CHECK (EmergencyContact IS NULL OR EmergencyContact LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Departments_Type' AND parent_object_id = OBJECT_ID('Departments'))
BEGIN
    ALTER TABLE Departments DROP CONSTRAINT CK_Departments_Type;
END
GO
ALTER TABLE Departments
ADD CONSTRAINT CK_Departments_Type CHECK (DepartmentType IN ('Clinical', 'Surgical', 'Diagnostics', 'Support'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Departments_ContactNumber' AND parent_object_id = OBJECT_ID('Departments'))
BEGIN
    ALTER TABLE Departments DROP CONSTRAINT CK_Departments_ContactNumber;
END
GO
ALTER TABLE Departments
ADD CONSTRAINT CK_Departments_ContactNumber CHECK (ContactNumber IS NULL OR ContactNumber LIKE '03[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Nurses_ShiftTime' AND parent_object_id = OBJECT_ID('Nurses'))
BEGIN
    ALTER TABLE Nurses DROP CONSTRAINT CK_Nurses_ShiftTime;
END
GO
ALTER TABLE Nurses
ADD CONSTRAINT CK_Nurses_ShiftTime CHECK (ShiftTime IS NULL OR ShiftTime LIKE '[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]');
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Wards_Type' AND parent_object_id = OBJECT_ID('Wards'))
BEGIN
    ALTER TABLE Wards DROP CONSTRAINT CK_Wards_Type;
END
GO
ALTER TABLE Wards
ADD CONSTRAINT CK_Wards_Type CHECK (WardType IN ('General', 'Private', 'ICU', 'Isolation'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Beds_Type' AND parent_object_id = OBJECT_ID('Beds'))
BEGIN
    ALTER TABLE Beds DROP CONSTRAINT CK_Beds_Type;
END
GO
ALTER TABLE Beds
ADD CONSTRAINT CK_Beds_Type CHECK (BedType IN ('General', 'Semi-Private', 'Private', 'ICU', 'Isolation'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_OPDRooms_Type' AND parent_object_id = OBJECT_ID('OPDRooms'))
BEGIN
    ALTER TABLE OPDRooms DROP CONSTRAINT CK_OPDRooms_Type;
END
GO
ALTER TABLE OPDRooms
ADD CONSTRAINT CK_OPDRooms_Type CHECK (RoomType IN ('Consultation', 'Procedure', 'Emergency'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DutyRoster_ShiftType' AND parent_object_id = OBJECT_ID('DutyRoster'))
BEGIN
    ALTER TABLE DutyRoster DROP CONSTRAINT CK_DutyRoster_ShiftType;
END
GO
ALTER TABLE DutyRoster
ADD CONSTRAINT CK_DutyRoster_ShiftType CHECK (ShiftType IN ('Morning', 'Evening', 'Night', 'Custom'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DutyRoster_TimeWindow' AND parent_object_id = OBJECT_ID('DutyRoster'))
BEGIN
    ALTER TABLE DutyRoster DROP CONSTRAINT CK_DutyRoster_TimeWindow;
END
GO
ALTER TABLE DutyRoster
ADD CONSTRAINT CK_DutyRoster_TimeWindow CHECK (ShiftStartTime < ShiftEndTime);
GO

IF EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('DutyRoster')
      AND name = 'UQ_DutyRoster_User_Department_Date_Shift'
)
BEGIN
    ALTER TABLE DutyRoster DROP CONSTRAINT UQ_DutyRoster_User_Department_Date_Shift;
END
GO

ALTER TABLE DutyRoster
ALTER COLUMN ShiftStartTime TIME NOT NULL;
GO

ALTER TABLE DutyRoster
ALTER COLUMN ShiftEndTime TIME NOT NULL;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_HospitalEquipment_Status' AND parent_object_id = OBJECT_ID('HospitalEquipment'))
BEGIN
    ALTER TABLE HospitalEquipment DROP CONSTRAINT CK_HospitalEquipment_Status;
END
GO
ALTER TABLE HospitalEquipment
ADD CONSTRAINT CK_HospitalEquipment_Status CHECK (Status IN ('Available', 'In Use', 'Maintenance', 'Out of Service'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Medications_Category' AND parent_object_id = OBJECT_ID('Medications'))
BEGIN
    ALTER TABLE Medications DROP CONSTRAINT CK_Medications_Category;
END
GO
ALTER TABLE Medications
ADD CONSTRAINT CK_Medications_Category CHECK (Category IS NULL OR Category IN ('Antibiotic', 'Analgesic', 'Antipyretic', 'Antiseptic', 'Other'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Medications_Form' AND parent_object_id = OBJECT_ID('Medications'))
BEGIN
    ALTER TABLE Medications DROP CONSTRAINT CK_Medications_Form;
END
GO
ALTER TABLE Medications
ADD CONSTRAINT CK_Medications_Form CHECK (Form IS NULL OR Form IN ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_MedicalTests_Category' AND parent_object_id = OBJECT_ID('MedicalTests'))
BEGIN
    ALTER TABLE MedicalTests DROP CONSTRAINT CK_MedicalTests_Category;
END
GO
ALTER TABLE MedicalTests
ADD CONSTRAINT CK_MedicalTests_Category CHECK (Category IN ('Pathology', 'Radiology', 'Cardiology', 'Microbiology'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_OPDAppointments_Status' AND parent_object_id = OBJECT_ID('OPDAppointments'))
BEGIN
    ALTER TABLE OPDAppointments DROP CONSTRAINT CK_OPDAppointments_Status;
END
GO
ALTER TABLE OPDAppointments
ADD CONSTRAINT CK_OPDAppointments_Status CHECK (Status IN ('Pending', 'PendingPayment', 'Confirmed', 'CheckedIn', 'Completed', 'Cancelled'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_OPDTestOrders_Status' AND parent_object_id = OBJECT_ID('OPDTestOrders'))
BEGIN
    ALTER TABLE OPDTestOrders DROP CONSTRAINT CK_OPDTestOrders_Status;
END
GO
ALTER TABLE OPDTestOrders
ADD CONSTRAINT CK_OPDTestOrders_Status CHECK (Status IN ('Ordered', 'Completed', 'Cancelled'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_IPDTestOrders_Status' AND parent_object_id = OBJECT_ID('IPDTestOrders'))
BEGIN
    ALTER TABLE IPDTestOrders DROP CONSTRAINT CK_IPDTestOrders_Status;
END
GO
ALTER TABLE IPDTestOrders
ADD CONSTRAINT CK_IPDTestOrders_Status CHECK (Status IN ('Ordered', 'Completed', 'Cancelled'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SurgeryBookings_Status' AND parent_object_id = OBJECT_ID('SurgeryBookings'))
BEGIN
    ALTER TABLE SurgeryBookings DROP CONSTRAINT CK_SurgeryBookings_Status;
END
GO
ALTER TABLE SurgeryBookings
ADD CONSTRAINT CK_SurgeryBookings_Status CHECK (Status IN ('Scheduled', 'Completed', 'Cancelled'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_SurgeryBookings_TimeWindow' AND parent_object_id = OBJECT_ID('SurgeryBookings'))
BEGIN
    ALTER TABLE SurgeryBookings DROP CONSTRAINT CK_SurgeryBookings_TimeWindow;
END
GO
ALTER TABLE SurgeryBookings
ADD CONSTRAINT CK_SurgeryBookings_TimeWindow CHECK (EndTime IS NULL OR EndTime > StartTime);
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_OPDPayments_Status' AND parent_object_id = OBJECT_ID('OPDPayments'))
BEGIN
    ALTER TABLE OPDPayments DROP CONSTRAINT CK_OPDPayments_Status;
END
GO
ALTER TABLE OPDPayments
ADD CONSTRAINT CK_OPDPayments_Status CHECK (Status IN ('Pending', 'Paid', 'Rejected'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_IPDPayments_Status' AND parent_object_id = OBJECT_ID('IPDPayments'))
BEGIN
    ALTER TABLE IPDPayments DROP CONSTRAINT CK_IPDPayments_Status;
END
GO
ALTER TABLE IPDPayments
ADD CONSTRAINT CK_IPDPayments_Status CHECK (Status IN ('Pending', 'Paid', 'Rejected'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Doctors_Specialization' AND parent_object_id = OBJECT_ID('Doctors'))
BEGIN
    ALTER TABLE Doctors DROP CONSTRAINT CK_Doctors_Specialization;
END
GO
ALTER TABLE Doctors
ADD CONSTRAINT CK_Doctors_Specialization CHECK (Specialization IN ('Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'Dermatology', 'ENT'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Doctors_Qualification' AND parent_object_id = OBJECT_ID('Doctors'))
BEGIN
    ALTER TABLE Doctors DROP CONSTRAINT CK_Doctors_Qualification;
END
GO
ALTER TABLE Doctors
ADD CONSTRAINT CK_Doctors_Qualification CHECK (Qualification IS NULL OR Qualification IN ('MBBS', 'BDS', 'FCPS', 'MS', 'MD'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Doctors_Designation' AND parent_object_id = OBJECT_ID('Doctors'))
BEGIN
    ALTER TABLE Doctors DROP CONSTRAINT CK_Doctors_Designation;
END
GO
ALTER TABLE Doctors
ADD CONSTRAINT CK_Doctors_Designation CHECK (Designation IS NULL OR Designation IN ('Consultant', 'Specialist', 'Resident', 'Senior Registrar'));
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DoctorSchedules_DayOfWeek' AND parent_object_id = OBJECT_ID('DoctorSchedules'))
BEGIN
    ALTER TABLE DoctorSchedules DROP CONSTRAINT CK_DoctorSchedules_DayOfWeek;
END
GO
ALTER TABLE DoctorSchedules
ADD CONSTRAINT CK_DoctorSchedules_DayOfWeek CHECK (DayOfWeek BETWEEN 0 AND 6);
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DoctorSchedules_TimeWindow' AND parent_object_id = OBJECT_ID('DoctorSchedules'))
BEGIN
    ALTER TABLE DoctorSchedules DROP CONSTRAINT CK_DoctorSchedules_TimeWindow;
END
GO
ALTER TABLE DoctorSchedules
ADD CONSTRAINT CK_DoctorSchedules_TimeWindow CHECK (StartTime < EndTime);
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_DoctorSchedules_SlotDuration' AND parent_object_id = OBJECT_ID('DoctorSchedules'))
BEGIN
    ALTER TABLE DoctorSchedules DROP CONSTRAINT CK_DoctorSchedules_SlotDuration;
END
GO
ALTER TABLE DoctorSchedules
ADD CONSTRAINT CK_DoctorSchedules_SlotDuration CHECK (SlotDurationMinutes = 30);
GO

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
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

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
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
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

CREATE OR ALTER TRIGGER trg_Doctors_UserRole
ON Doctors
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1 FROM inserted i
        INNER JOIN Users u ON u.UserID = i.UserID
        WHERE u.Role <> 'Doctor'
    )
    BEGIN
        RAISERROR('Doctors.UserID must reference a user with Role = Doctor.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO
