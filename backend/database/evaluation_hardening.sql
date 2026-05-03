USE HealthUp;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('DutyRoster')
      AND name = 'UQ_DutyRoster_User_Department_Date_Shift'
)
BEGIN
    ALTER TABLE DutyRoster
    ADD CONSTRAINT UQ_DutyRoster_User_Department_Date_Shift UNIQUE (UserID, DepartmentID, ShiftDate, ShiftType);
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
                WHEN @PaidAmount < @TotalAmount THEN 'Partial'
                WHEN @PaidAmount >= @TotalAmount THEN 'Paid'
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
