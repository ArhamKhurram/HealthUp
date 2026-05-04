// Billing controller.
// OPD and IPD endpoints are preserved, but both now write to the unified Payments/BillingDetails tables.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

function paymentSelect(kind, whereClause = "") {
  const sourceJoin = kind === "OPD"
    ? "LEFT JOIN OPDAppointments a ON a.AppointmentID = pay.AppointmentID"
    : "LEFT JOIN IPDAdmissions a ON a.AdmissionID = pay.AdmissionID";
  const sourceColumn = kind === "OPD" ? "pay.AppointmentID" : "pay.AdmissionID";

  return `
    SELECT pay.PaymentID, pay.PatientID, ${sourceColumn} AS ${kind === "OPD" ? "AppointmentID" : "AdmissionID"},
           pay.TotalAmount, pay.PaidAmount, pay.Status, pay.PaymentMethod, pay.ReferenceNo,
           pay.ReceivedByUserID, pay.PaidAt, pay.CreatedAt,
           pu.FullName AS PatientName,
           ru.FullName AS ReceivedByName
    FROM Payments pay
    INNER JOIN Patients p ON p.PatientID = pay.PatientID
    INNER JOIN Users pu ON pu.UserID = p.UserID
    ${sourceJoin}
    LEFT JOIN Users ru ON ru.UserID = pay.ReceivedByUserID
    ${whereClause}
  `;
}

async function createPayment(req, res, kind) {
  const pool = await getPool();
  const sourceField = kind === "OPD" ? "appointmentId" : "admissionId";
  const sourceColumn = kind === "OPD" ? "AppointmentID" : "AdmissionID";
  const { patientId, totalAmount, paidAmount, status, paymentMethod, referenceNo, details = [] } = req.body;

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const inserted = await new sql.Request(transaction)
      .input("PatientID", sql.Int, patientId)
      .input(sourceColumn, sql.Int, req.body[sourceField])
      .input("TotalAmount", sql.Decimal(10, 2), Number(totalAmount || 0))
      .input("PaidAmount", sql.Decimal(10, 2), Number(paidAmount || totalAmount || 0))
      .input("Status", sql.NVarChar(30), status || "Paid")
      .input("PaymentMethod", sql.NVarChar(50), paymentMethod || "Cash")
      .input("ReferenceNo", sql.NVarChar(80), referenceNo || null)
      .input("ReceivedByUserID", sql.Int, req.user?.userId || null)
      .query(`
        INSERT INTO Payments (PatientID, ${sourceColumn}, TotalAmount, PaidAmount, Status, PaymentMethod, ReferenceNo, ReceivedByUserID, PaidAt)
        OUTPUT INSERTED.*
        VALUES (@PatientID, @${sourceColumn}, @TotalAmount, @PaidAmount, @Status, @PaymentMethod, @ReferenceNo, @ReceivedByUserID, SYSDATETIME())
      `);

    const paymentId = inserted.recordset[0].PaymentID;
    for (const detail of details) {
      await new sql.Request(transaction)
        .input("PaymentID", sql.Int, paymentId)
        .input("ItemType", sql.NVarChar(50), detail.itemType || "Service")
        .input("ItemDescription", sql.NVarChar(255), detail.itemDescription || detail.description || "Hospital service")
        .input("Quantity", sql.Int, Number(detail.quantity || 1))
        .input("UnitPrice", sql.Decimal(10, 2), Number(detail.unitPrice || detail.amount || 0))
        .query(`
          INSERT INTO BillingDetails (PaymentID, ItemType, ItemDescription, Quantity, UnitPrice)
          VALUES (@PaymentID, @ItemType, @ItemDescription, @Quantity, @UnitPrice)
        `);
    }

    await transaction.commit();
    res.status(201).json(inserted.recordset[0]);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function updatePayment(req, res, kind) {
  const sourceColumn = kind === "OPD" ? "AppointmentID" : "AdmissionID";
  const sourceBody = kind === "OPD" ? "appointmentId" : "admissionId";
  const { patientId, totalAmount, paidAmount, status, paymentMethod, referenceNo } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("PaymentID", sql.Int, req.params.id)
    .input("PatientID", sql.Int, patientId)
    .input(sourceColumn, sql.Int, req.body[sourceBody])
    .input("TotalAmount", sql.Decimal(10, 2), Number(totalAmount || 0))
    .input("PaidAmount", sql.Decimal(10, 2), Number(paidAmount || 0))
    .input("Status", sql.NVarChar(30), status || "Paid")
    .input("PaymentMethod", sql.NVarChar(50), paymentMethod || "Cash")
    .input("ReferenceNo", sql.NVarChar(80), referenceNo || null)
    .input("ReceivedByUserID", sql.Int, req.user?.userId || null)
    .query(`
      UPDATE Payments
      SET PatientID = @PatientID,
          ${sourceColumn} = @${sourceColumn},
          TotalAmount = @TotalAmount,
          PaidAmount = @PaidAmount,
          Status = @Status,
          PaymentMethod = @PaymentMethod,
          ReferenceNo = @ReferenceNo,
          ReceivedByUserID = @ReceivedByUserID,
          PaidAt = CASE WHEN @Status = 'Paid' THEN COALESCE(PaidAt, SYSDATETIME()) ELSE PaidAt END
      OUTPUT INSERTED.*
      WHERE PaymentID = @PaymentID AND ${sourceColumn} IS NOT NULL
    `);

  if (!result.recordset[0]) return res.status(404).json({ message: "Payment not found" });
  res.json(result.recordset[0]);
}

async function deletePayment(req, res, sourceColumn) {
  const pool = await getPool();
  const result = await pool.request()
    .input("PaymentID", sql.Int, req.params.id)
    .query(`DELETE FROM Payments OUTPUT DELETED.PaymentID WHERE PaymentID = @PaymentID AND ${sourceColumn} IS NOT NULL`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Payment not found" });
  res.json({ message: "Payment deleted" });
}

const listOPDPayments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`${paymentSelect("OPD", "WHERE pay.AppointmentID IS NOT NULL")} ORDER BY pay.CreatedAt DESC`);
  res.json(result.recordset);
});

const getOPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("PaymentID", sql.Int, req.params.id)
    .query(`${paymentSelect("OPD", "WHERE pay.PaymentID = @PaymentID AND pay.AppointmentID IS NOT NULL")}`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Payment not found" });
  res.json(result.recordset[0]);
});

const createOPDPayment = asyncHandler((req, res) => createPayment(req, res, "OPD"));
const updateOPDPayment = asyncHandler((req, res) => updatePayment(req, res, "OPD"));
const deleteOPDPayment = asyncHandler((req, res) => deletePayment(req, res, "AppointmentID"));

const listIPDPayments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`${paymentSelect("IPD", "WHERE pay.AdmissionID IS NOT NULL")} ORDER BY pay.CreatedAt DESC`);
  res.json(result.recordset);
});

const getIPDPayment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("PaymentID", sql.Int, req.params.id)
    .query(`${paymentSelect("IPD", "WHERE pay.PaymentID = @PaymentID AND pay.AdmissionID IS NOT NULL")}`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Payment not found" });
  res.json(result.recordset[0]);
});

const createIPDPayment = asyncHandler((req, res) => createPayment(req, res, "IPD"));
const updateIPDPayment = asyncHandler((req, res) => updatePayment(req, res, "IPD"));
const deleteIPDPayment = asyncHandler((req, res) => deletePayment(req, res, "AdmissionID"));

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
