const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const patientDirectory = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT * FROM vw_PatientDirectory ORDER BY PatientID DESC");
  res.json(result.recordset);
});

const opdAppointmentsView = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT * FROM vw_OPDAppointmentDetails ORDER BY AppointmentDate DESC");
  res.json(result.recordset);
});

const billingSummary = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT * FROM vw_BillingSummary ORDER BY BillingType, PaymentID DESC");
  res.json(result.recordset);
});

const doctorRating = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("DoctorID", sql.Int, req.params.doctorId)
    .query("EXEC sp_GetDoctorRating @DoctorID = @DoctorID");
  res.json(result.recordset[0] || null);
});

module.exports = { patientDirectory, opdAppointmentsView, billingSummary, doctorRating };

