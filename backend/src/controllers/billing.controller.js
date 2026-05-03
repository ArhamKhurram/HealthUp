const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const getActorPatientId = async (pool, userId) => {
  const result = await pool
    .request()
    .input("UserID", sql.Int, userId)
    .query("SELECT TOP 1 PatientID FROM Patients WHERE UserID = @UserID");
  return result.recordset[0]?.PatientID || null;
};

const listOPDPayments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request();
  let whereClause = "";
  if (req.user.role === "Patient") {
    const patientId = await getActorPatientId(pool, req.user.userId);
    if (!patientId) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, patientId);
    whereClause = "WHERE pay.PatientID = @ActorPatientID";
  }
  const result = await request.query(`
    SELECT pay.PaymentID, pay.AppointmentID, pay.PatientID, pay.TotalAmount,
           pay.PaidAmount, pay.Status, u.FullName AS PatientName
    FROM OPDPayments pay
    INNER JOIN Patients p ON p.PatientID = pay.PatientID
    INNER JOIN Users u ON u.UserID = p.UserID
    ${whereClause}
    ORDER BY pay.PaymentID DESC
  `);
  res.json(result.recordset);
});

const getOPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request().input("PaymentID", sql.Int, req.params.id);
  let whereClause = "WHERE PaymentID = @PaymentID";
  if (req.user.role === "Patient") {
    const patientId = await getActorPatientId(pool, req.user.userId);
    if (!patientId) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, patientId);
    whereClause += " AND PatientID = @ActorPatientID";
  }
  const result = await request.query(`
      SELECT *
      FROM OPDPayments
      ${whereClause}
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "OPD payment not found" });
  }

  res.json(result.recordset[0]);
});

const createOPDPayment = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, totalAmount, paidAmount, details } = req.body;

  if (!appointmentId || !patientId) {
    return res.status(400).json({ message: "Appointment and patient are required" });
  }

  if (!Array.isArray(details) || details.length === 0 || details.length > 2) {
    return res.status(400).json({ message: "Provide 1 or 2 billing detail items in details[]" });
  }

  const first = details[0];
  const second = details[1] || null;
  if (!first.itemType || first.amount === undefined) {
    return res.status(400).json({ message: "Each detail requires itemType and amount" });
  }

  const pool = await getPool();
  const appointmentCheck = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .query("SELECT AppointmentID, PatientID FROM OPDAppointments WHERE AppointmentID = @AppointmentID");
  const appointment = appointmentCheck.recordset[0];
  if (!appointment) return res.status(404).json({ message: "Appointment not found" });
  if (Number(appointment.PatientID) !== Number(patientId)) {
    return res.status(400).json({ message: "Payment patient must match appointment patient" });
  }

  const created = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("TotalAmount", sql.Decimal(10, 2), totalAmount || 0)
    .input("PaidAmount", sql.Decimal(10, 2), paidAmount || 0)
    .input("ItemType1", sql.NVarChar(80), first.itemType)
    .input("Amount1", sql.Decimal(10, 2), first.amount)
    .input("Quantity1", sql.Int, first.quantity || 1)
    .input("ItemType2", sql.NVarChar(80), second?.itemType || null)
    .input("Amount2", sql.Decimal(10, 2), second?.amount || null)
    .input("Quantity2", sql.Int, second?.quantity || 1)
    .query(`
      EXEC sp_CreateOPDPaymentWithDetails
        @AppointmentID = @AppointmentID,
        @PatientID = @PatientID,
        @TotalAmount = @TotalAmount,
        @PaidAmount = @PaidAmount,
        @ItemType1 = @ItemType1,
        @Amount1 = @Amount1,
        @Quantity1 = @Quantity1,
        @ItemType2 = @ItemType2,
        @Amount2 = @Amount2,
        @Quantity2 = @Quantity2
    `);

  const paymentId = created.recordset[0]?.PaymentID;
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, paymentId)
    .query("SELECT * FROM OPDPayments WHERE PaymentID = @PaymentID");

  res.status(201).json(result.recordset[0]);
});

const updateOPDPayment = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, totalAmount, paidAmount, status } = req.body;

  if (!appointmentId || !patientId) {
    return res.status(400).json({ message: "Appointment and patient are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, req.params.id)
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("TotalAmount", sql.Decimal(10, 2), totalAmount || 0)
    .input("PaidAmount", sql.Decimal(10, 2), paidAmount || 0)
    .input("Status", sql.NVarChar(30), status || "Pending")
    .query(`
      UPDATE OPDPayments
      SET AppointmentID = @AppointmentID,
          PatientID = @PatientID,
          TotalAmount = @TotalAmount,
          PaidAmount = @PaidAmount,
          Status = @Status
      OUTPUT INSERTED.*
      WHERE PaymentID = @PaymentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "OPD payment not found" });
  }

  res.json(result.recordset[0]);
});

const deleteOPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, req.params.id)
    .query(`
      DELETE FROM OPDPayments
      OUTPUT DELETED.*
      WHERE PaymentID = @PaymentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "OPD payment not found" });
  }

  res.json(result.recordset[0]);
});

const listIPDPayments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request();
  let whereClause = "";
  if (req.user.role === "Patient") {
    const patientId = await getActorPatientId(pool, req.user.userId);
    if (!patientId) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, patientId);
    whereClause = "WHERE pay.PatientID = @ActorPatientID";
  }
  const result = await request.query(`
    SELECT pay.PaymentID, pay.AdmissionID, pay.PatientID, pay.TotalAmount,
           pay.PaidAmount, pay.Status, u.FullName AS PatientName
    FROM IPDPayments pay
    INNER JOIN Patients p ON p.PatientID = pay.PatientID
    INNER JOIN Users u ON u.UserID = p.UserID
    ${whereClause}
    ORDER BY pay.PaymentID DESC
  `);

  res.json(result.recordset);
});

const getIPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request().input("PaymentID", sql.Int, req.params.id);
  let whereClause = "WHERE PaymentID = @PaymentID";
  if (req.user.role === "Patient") {
    const patientId = await getActorPatientId(pool, req.user.userId);
    if (!patientId) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, patientId);
    whereClause += " AND PatientID = @ActorPatientID";
  }
  const result = await request.query(`
      SELECT *
      FROM IPDPayments
      ${whereClause}
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "IPD payment not found" });
  }

  res.json(result.recordset[0]);
});

const createIPDPayment = asyncHandler(async (req, res) => {
  const { admissionId, patientId, totalAmount, paidAmount, details } = req.body;

  if (!admissionId || !patientId) {
    return res.status(400).json({ message: "Admission and patient are required" });
  }

  const pool = await getPool();
  const admissionCheck = await pool
    .request()
    .input("AdmissionID", sql.Int, admissionId)
    .query("SELECT AdmissionID, PatientID FROM IPDAdmissions WHERE AdmissionID = @AdmissionID");
  const admission = admissionCheck.recordset[0];
  if (!admission) return res.status(404).json({ message: "Admission not found" });
  if (Number(admission.PatientID) !== Number(patientId)) {
    return res.status(400).json({ message: "Payment patient must match admission patient" });
  }

  if (!Array.isArray(details) || details.length === 0 || details.length > 2) {
    return res.status(400).json({ message: "Provide 1 or 2 billing detail items in details[]" });
  }
  const first = details[0];
  const second = details[1] || null;
  if (!first.itemType || first.amount === undefined) {
    return res.status(400).json({ message: "Each detail requires itemType and amount" });
  }

  const created = await pool
    .request()
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("TotalAmount", sql.Decimal(10, 2), totalAmount || 0)
    .input("PaidAmount", sql.Decimal(10, 2), paidAmount || 0)
    .input("ItemType1", sql.NVarChar(80), first.itemType)
    .input("Amount1", sql.Decimal(10, 2), first.amount)
    .input("Quantity1", sql.Int, first.quantity || 1)
    .input("ItemType2", sql.NVarChar(80), second?.itemType || null)
    .input("Amount2", sql.Decimal(10, 2), second?.amount || null)
    .input("Quantity2", sql.Int, second?.quantity || 1)
    .query(`
      EXEC sp_CreateIPDPaymentWithDetails
        @AdmissionID = @AdmissionID,
        @PatientID = @PatientID,
        @TotalAmount = @TotalAmount,
        @PaidAmount = @PaidAmount,
        @ItemType1 = @ItemType1,
        @Amount1 = @Amount1,
        @Quantity1 = @Quantity1,
        @ItemType2 = @ItemType2,
        @Amount2 = @Amount2,
        @Quantity2 = @Quantity2
    `);

  const paymentId = created.recordset[0]?.PaymentID;
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, paymentId)
    .query("SELECT * FROM IPDPayments WHERE PaymentID = @PaymentID");

  res.status(201).json(result.recordset[0]);
});

const updateIPDPayment = asyncHandler(async (req, res) => {
  const { admissionId, patientId, totalAmount, paidAmount, status } = req.body;

  if (!admissionId || !patientId) {
    return res.status(400).json({ message: "Admission and patient are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, req.params.id)
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("TotalAmount", sql.Decimal(10, 2), totalAmount || 0)
    .input("PaidAmount", sql.Decimal(10, 2), paidAmount || 0)
    .input("Status", sql.NVarChar(30), status || "Pending")
    .query(`
      UPDATE IPDPayments
      SET AdmissionID = @AdmissionID,
          PatientID = @PatientID,
          TotalAmount = @TotalAmount,
          PaidAmount = @PaidAmount,
          Status = @Status
      OUTPUT INSERTED.*
      WHERE PaymentID = @PaymentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "IPD payment not found" });
  }

  res.json(result.recordset[0]);
});

const deleteIPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, req.params.id)
    .query(`
      DELETE FROM IPDPayments
      OUTPUT DELETED.*
      WHERE PaymentID = @PaymentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "IPD payment not found" });
  }

  res.json(result.recordset[0]);
});

module.exports = {
  listOPDPayments,
  getOPDPayment,
  createOPDPayment,
  updateOPDPayment,
  deleteOPDPayment,
  listIPDPayments,
  getIPDPayment,
  createIPDPayment,
  updateIPDPayment,
  deleteIPDPayment
};
