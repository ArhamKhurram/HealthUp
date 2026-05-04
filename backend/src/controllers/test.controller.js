// Medical-test controller.
// OPD/IPD test routes share the unified TestOrders table and are filtered by source column.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const testCategories = ["Lab", "Radiology", "Pathology", "Cardiology", "General"];

const listMedicalTests = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT * FROM MedicalTests ORDER BY TestName");
  res.json(result.recordset);
});

const getMedicalTest = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("TestID", sql.Int, req.params.id)
    .query("SELECT * FROM MedicalTests WHERE TestID = @TestID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Medical test not found" });
  res.json(result.recordset[0]);
});

const createMedicalTest = asyncHandler(async (req, res) => {
  const { testName, category, cost } = req.body;
  if (!testName) return res.status(400).json({ message: "Test name is required" });
  if (category && !testCategories.includes(category)) return res.status(400).json({ message: "Invalid test category" });

  const pool = await getPool();
  const result = await pool.request()
    .input("TestName", sql.NVarChar(150), testName)
    .input("Category", sql.NVarChar(100), category || "General")
    .input("Cost", sql.Decimal(10, 2), Number(cost || 0))
    .query(`
      INSERT INTO MedicalTests (TestName, Category, Cost)
      OUTPUT INSERTED.*
      VALUES (@TestName, @Category, @Cost)
    `);
  res.status(201).json(result.recordset[0]);
});

const updateMedicalTest = asyncHandler(async (req, res) => {
  const { testName, category, cost } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("TestID", sql.Int, req.params.id)
    .input("TestName", sql.NVarChar(150), testName)
    .input("Category", sql.NVarChar(100), category || "General")
    .input("Cost", sql.Decimal(10, 2), Number(cost || 0))
    .query(`
      UPDATE MedicalTests
      SET TestName = @TestName,
          Category = @Category,
          Cost = @Cost
      OUTPUT INSERTED.*
      WHERE TestID = @TestID
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "Medical test not found" });
  res.json(result.recordset[0]);
});

const deleteMedicalTest = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("TestID", sql.Int, req.params.id)
    .query("DELETE FROM MedicalTests OUTPUT DELETED.TestID WHERE TestID = @TestID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Medical test not found" });
  res.json({ message: "Medical test deleted" });
});

function orderSelect(kind, whereClause = "") {
  const sourceColumn = kind === "OPD" ? "o.AppointmentID" : "o.AdmissionID";
  return `
    SELECT o.TestOrderID, o.PatientID, o.DoctorID, o.TestID,
           ${sourceColumn} AS ${kind === "OPD" ? "AppointmentID" : "AdmissionID"},
           o.OrderedAt, o.Status, o.Results,
           t.TestName, t.Category, t.Cost,
           pu.FullName AS PatientName,
           du.FullName AS DoctorName
    FROM TestOrders o
    INNER JOIN MedicalTests t ON t.TestID = o.TestID
    INNER JOIN Patients p ON p.PatientID = o.PatientID
    INNER JOIN Users pu ON pu.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = o.DoctorID
    INNER JOIN Users du ON du.UserID = d.UserID
    ${whereClause}
  `;
}

async function createOrder(req, res, kind) {
  const sourceField = kind === "OPD" ? "appointmentId" : "admissionId";
  const sourceColumn = kind === "OPD" ? "AppointmentID" : "AdmissionID";
  const { patientId, doctorId, testId, status, results } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("TestID", sql.Int, testId)
    .input(sourceColumn, sql.Int, req.body[sourceField])
    .input("Status", sql.NVarChar(30), status || "Ordered")
    .input("Results", sql.NVarChar(sql.MAX), results || null)
    .query(`
      INSERT INTO TestOrders (PatientID, DoctorID, TestID, ${sourceColumn}, Status, Results)
      OUTPUT INSERTED.*
      VALUES (@PatientID, @DoctorID, @TestID, @${sourceColumn}, @Status, @Results)
    `);
  res.status(201).json(result.recordset[0]);
}

async function updateOrder(req, res, sourceColumn) {
  const { status, results } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("TestOrderID", sql.Int, req.params.id)
    .input("Status", sql.NVarChar(30), status || "Ordered")
    .input("Results", sql.NVarChar(sql.MAX), results || null)
    .query(`
      UPDATE TestOrders
      SET Status = @Status, Results = @Results
      OUTPUT INSERTED.*
      WHERE TestOrderID = @TestOrderID AND ${sourceColumn} IS NOT NULL
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "Test order not found" });
  res.json(result.recordset[0]);
}

async function deleteOrder(req, res, sourceColumn) {
  const pool = await getPool();
  const result = await pool.request()
    .input("TestOrderID", sql.Int, req.params.id)
    .query(`DELETE FROM TestOrders OUTPUT DELETED.TestOrderID WHERE TestOrderID = @TestOrderID AND ${sourceColumn} IS NOT NULL`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Test order not found" });
  res.json({ message: "Test order deleted" });
}

const listOPDTestOrders = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`${orderSelect("OPD", "WHERE o.AppointmentID IS NOT NULL")} ORDER BY o.OrderedAt DESC`);
  res.json(result.recordset);
});

const getOPDTestOrder = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("TestOrderID", sql.Int, req.params.id)
    .query(`${orderSelect("OPD", "WHERE o.TestOrderID = @TestOrderID AND o.AppointmentID IS NOT NULL")}`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Test order not found" });
  res.json(result.recordset[0]);
});

const createOPDTestOrder = asyncHandler((req, res) => createOrder(req, res, "OPD"));
const updateOPDTestOrder = asyncHandler((req, res) => updateOrder(req, res, "AppointmentID"));
const deleteOPDTestOrder = asyncHandler((req, res) => deleteOrder(req, res, "AppointmentID"));

const listIPDTestOrders = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`${orderSelect("IPD", "WHERE o.AdmissionID IS NOT NULL")} ORDER BY o.OrderedAt DESC`);
  res.json(result.recordset);
});

const getIPDTestOrder = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("TestOrderID", sql.Int, req.params.id)
    .query(`${orderSelect("IPD", "WHERE o.TestOrderID = @TestOrderID AND o.AdmissionID IS NOT NULL")}`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Test order not found" });
  res.json(result.recordset[0]);
});

const createIPDTestOrder = asyncHandler((req, res) => createOrder(req, res, "IPD"));
const updateIPDTestOrder = asyncHandler((req, res) => updateOrder(req, res, "AdmissionID"));
const deleteIPDTestOrder = asyncHandler((req, res) => deleteOrder(req, res, "AdmissionID"));

module.exports = {
  listMedicalTests,
  getMedicalTest,
  createMedicalTest,
  updateMedicalTest,
  deleteMedicalTest,
  listOPDTestOrders,
  getOPDTestOrder,
  createOPDTestOrder,
  updateOPDTestOrder,
  deleteOPDTestOrder,
  listIPDTestOrders,
  getIPDTestOrder,
  createIPDTestOrder,
  updateIPDTestOrder,
  deleteIPDTestOrder
};
