const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listOPDPayments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT pay.PaymentID, pay.AppointmentID, pay.PatientID, pay.TotalAmount,
           pay.PaidAmount, pay.Status, u.FullName AS PatientName
    FROM OPDPayments pay
    INNER JOIN Patients p ON p.PatientID = pay.PatientID
    INNER JOIN Users u ON u.UserID = p.UserID
    ORDER BY pay.PaymentID DESC
  `);
  res.json(result.recordset);
});

const getOPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, req.params.id)
    .query(`
      SELECT *
      FROM OPDPayments
      WHERE PaymentID = @PaymentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "OPD payment not found" });
  }

  res.json(result.recordset[0]);
});

const createOPDPayment = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, totalAmount, paidAmount, status } = req.body;

  if (!appointmentId || !patientId) {
    return res.status(400).json({ message: "Appointment and patient are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("TotalAmount", sql.Decimal(10, 2), totalAmount || 0)
    .input("PaidAmount", sql.Decimal(10, 2), paidAmount || 0)
    .input("Status", sql.NVarChar(30), status || "Pending")
    .query(`
      INSERT INTO OPDPayments (AppointmentID, PatientID, TotalAmount, PaidAmount, Status)
      OUTPUT INSERTED.*
      VALUES (@AppointmentID, @PatientID, @TotalAmount, @PaidAmount, @Status)
    `);

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
  const result = await pool.request().query(`
    SELECT pay.PaymentID, pay.AdmissionID, pay.PatientID, pay.TotalAmount,
           pay.PaidAmount, pay.Status, u.FullName AS PatientName
    FROM IPDPayments pay
    INNER JOIN Patients p ON p.PatientID = pay.PatientID
    INNER JOIN Users u ON u.UserID = p.UserID
    ORDER BY pay.PaymentID DESC
  `);

  res.json(result.recordset);
});

const getIPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PaymentID", sql.Int, req.params.id)
    .query(`
      SELECT *
      FROM IPDPayments
      WHERE PaymentID = @PaymentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "IPD payment not found" });
  }

  res.json(result.recordset[0]);
});

const createIPDPayment = asyncHandler(async (req, res) => {
  const { admissionId, patientId, totalAmount, paidAmount, status } = req.body;

  if (!admissionId || !patientId) {
    return res.status(400).json({ message: "Admission and patient are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("TotalAmount", sql.Decimal(10, 2), totalAmount || 0)
    .input("PaidAmount", sql.Decimal(10, 2), paidAmount || 0)
    .input("Status", sql.NVarChar(30), status || "Pending")
    .query(`
      INSERT INTO IPDPayments (AdmissionID, PatientID, TotalAmount, PaidAmount, Status)
      OUTPUT INSERTED.*
      VALUES (@AdmissionID, @PatientID, @TotalAmount, @PaidAmount, @Status)
    `);

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
