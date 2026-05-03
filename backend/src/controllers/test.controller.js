const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const getActorContext = async (pool, userId) => {
  const result = await pool
    .request()
    .input("UserID", sql.Int, userId)
    .query(`
      SELECT
        (SELECT TOP 1 PatientID FROM Patients WHERE UserID = @UserID) AS PatientID,
        (SELECT TOP 1 DoctorID FROM Doctors WHERE UserID = @UserID) AS DoctorID
    `);
  return result.recordset[0] || { PatientID: null, DoctorID: null };
};

const listMedicalTests = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TestID, TestName, TestCode, Category, Cost
    FROM MedicalTests
    ORDER BY TestName
  `);
  res.json(result.recordset);
});

const getMedicalTest = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestID", sql.Int, req.params.id)
    .query(`
      SELECT TestID, TestName, TestCode, Category, Cost
      FROM MedicalTests
      WHERE TestID = @TestID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Medical test not found" });
  }

  res.json(result.recordset[0]);
});

const createMedicalTest = asyncHandler(async (req, res) => {
  const { testName, testCode, category, cost } = req.body;

  if (!testName || !testCode || !category || cost === undefined) {
    return res.status(400).json({ message: "Test name, code, category, and cost are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestName", sql.NVarChar(120), testName)
    .input("TestCode", sql.NVarChar(40), testCode)
    .input("Category", sql.NVarChar(80), category)
    .input("Cost", sql.Decimal(10, 2), cost)
    .query(`
      INSERT INTO MedicalTests (TestName, TestCode, Category, Cost)
      OUTPUT INSERTED.*
      VALUES (@TestName, @TestCode, @Category, @Cost)
    `);

  res.status(201).json(result.recordset[0]);
});

const updateMedicalTest = asyncHandler(async (req, res) => {
  const { testName, testCode, category, cost } = req.body;

  if (!testName || !testCode || !category || cost === undefined) {
    return res.status(400).json({ message: "Test name, code, category, and cost are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestID", sql.Int, req.params.id)
    .input("TestName", sql.NVarChar(120), testName)
    .input("TestCode", sql.NVarChar(40), testCode)
    .input("Category", sql.NVarChar(80), category)
    .input("Cost", sql.Decimal(10, 2), cost)
    .query(`
      UPDATE MedicalTests
      SET TestName = @TestName,
          TestCode = @TestCode,
          Category = @Category,
          Cost = @Cost
      OUTPUT INSERTED.*
      WHERE TestID = @TestID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Medical test not found" });
  }

  res.json(result.recordset[0]);
});

const deleteMedicalTest = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestID", sql.Int, req.params.id)
    .query(`
      DELETE FROM MedicalTests
      OUTPUT DELETED.*
      WHERE TestID = @TestID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Medical test not found" });
  }

  res.json(result.recordset[0]);
});

const listOPDTestOrders = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request();
  let whereClause = "";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause = "WHERE o.PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause = "WHERE a.DoctorID = @ActorDoctorID";
  }
  const result = await request.query(`
    SELECT o.TestOrderID, o.AppointmentID, o.PatientID, o.TestID, o.Status, o.Results,
           t.TestName, u.FullName AS PatientName
    FROM OPDTestOrders o
    INNER JOIN OPDAppointments a ON a.AppointmentID = o.AppointmentID
    INNER JOIN MedicalTests t ON t.TestID = o.TestID
    INNER JOIN Patients p ON p.PatientID = o.PatientID
    INNER JOIN Users u ON u.UserID = p.UserID
    ${whereClause}
    ORDER BY o.TestOrderID DESC
  `);

  res.json(result.recordset);
});

const getOPDTestOrder = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request().input("TestOrderID", sql.Int, req.params.id);
  let whereClause = "WHERE o.TestOrderID = @TestOrderID";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause += " AND o.PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause += " AND a.DoctorID = @ActorDoctorID";
  }
  const result = await request.query(`
      SELECT o.*
      FROM OPDTestOrders o
      INNER JOIN OPDAppointments a ON a.AppointmentID = o.AppointmentID
      ${whereClause}
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "OPD test order not found" });
  }

  res.json(result.recordset[0]);
});

const createOPDTestOrder = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, testId, status, results } = req.body;
  let effectivePatientId = patientId;

  if (!appointmentId || !patientId || !testId) {
    return res.status(400).json({ message: "Appointment, patient, and test are required" });
  }

  const pool = await getPool();
  const appointmentCheck = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .query("SELECT AppointmentID, PatientID, DoctorID FROM OPDAppointments WHERE AppointmentID = @AppointmentID");
  const appointment = appointmentCheck.recordset[0];
  if (!appointment) return res.status(404).json({ message: "Appointment not found" });
  if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    if (Number(appointment.DoctorID) !== Number(actor.DoctorID)) {
      return res.status(403).json({ message: "Doctors can only create test orders for their own appointments" });
    }
  }
  if (Number(appointment.PatientID) !== Number(patientId)) {
    return res.status(400).json({ message: "Test order patient must match appointment patient" });
  }
  effectivePatientId = appointment.PatientID;

  const created = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, effectivePatientId)
    .input("TestID", sql.Int, testId)
    .input("Status", sql.NVarChar(30), status || "Ordered")
    .input("Results", sql.NVarChar(sql.MAX), results || null)
    .query(`
      EXEC sp_AddOPDTestOrder
        @AppointmentID = @AppointmentID,
        @PatientID = @PatientID,
        @TestID = @TestID,
        @Status = @Status,
        @Results = @Results
    `);

  const testOrderId = created.recordset[0]?.TestOrderID;
  const result = await pool
    .request()
    .input("TestOrderID", sql.Int, testOrderId)
    .query("SELECT * FROM OPDTestOrders WHERE TestOrderID = @TestOrderID");

  res.status(201).json(result.recordset[0]);
});

const updateOPDTestOrder = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, testId, status, results } = req.body;

  if (!appointmentId || !patientId || !testId) {
    return res.status(400).json({ message: "Appointment, patient, and test are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestOrderID", sql.Int, req.params.id)
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("TestID", sql.Int, testId)
    .input("Status", sql.NVarChar(30), status || "Ordered")
    .input("Results", sql.NVarChar(sql.MAX), results || null)
    .query(`
      UPDATE OPDTestOrders
      SET AppointmentID = @AppointmentID,
          PatientID = @PatientID,
          TestID = @TestID,
          Status = @Status,
          Results = @Results
      OUTPUT INSERTED.*
      WHERE TestOrderID = @TestOrderID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "OPD test order not found" });
  }

  res.json(result.recordset[0]);
});

const deleteOPDTestOrder = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestOrderID", sql.Int, req.params.id)
    .query(`
      DELETE FROM OPDTestOrders
      OUTPUT DELETED.*
      WHERE TestOrderID = @TestOrderID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "OPD test order not found" });
  }

  res.json(result.recordset[0]);
});

const listIPDTestOrders = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request();
  let whereClause = "";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause = "WHERE o.PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause = "WHERE a.AttendingDoctorID = @ActorDoctorID";
  }
  const result = await request.query(`
    SELECT o.TestOrderID, o.AdmissionID, o.PatientID, o.TestID, o.Status, o.Results,
           t.TestName, u.FullName AS PatientName
    FROM IPDTestOrders o
    INNER JOIN IPDAdmissions a ON a.AdmissionID = o.AdmissionID
    INNER JOIN MedicalTests t ON t.TestID = o.TestID
    INNER JOIN Patients p ON p.PatientID = o.PatientID
    INNER JOIN Users u ON u.UserID = p.UserID
    ${whereClause}
    ORDER BY o.TestOrderID DESC
  `);

  res.json(result.recordset);
});

const getIPDTestOrder = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request().input("TestOrderID", sql.Int, req.params.id);
  let whereClause = "WHERE o.TestOrderID = @TestOrderID";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause += " AND o.PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause += " AND a.AttendingDoctorID = @ActorDoctorID";
  }
  const result = await request.query(`
      SELECT o.*
      FROM IPDTestOrders o
      INNER JOIN IPDAdmissions a ON a.AdmissionID = o.AdmissionID
      ${whereClause}
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "IPD test order not found" });
  }

  res.json(result.recordset[0]);
});

const createIPDTestOrder = asyncHandler(async (req, res) => {
  const { admissionId, patientId, testId, status, results } = req.body;

  if (!admissionId || !patientId || !testId) {
    return res.status(400).json({ message: "Admission, patient, and test are required" });
  }

  const pool = await getPool();
  const admissionCheck = await pool
    .request()
    .input("AdmissionID", sql.Int, admissionId)
    .query("SELECT AdmissionID, PatientID, AttendingDoctorID FROM IPDAdmissions WHERE AdmissionID = @AdmissionID");
  const admission = admissionCheck.recordset[0];
  if (!admission) return res.status(404).json({ message: "Admission not found" });
  if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    if (Number(admission.AttendingDoctorID) !== Number(actor.DoctorID)) {
      return res.status(403).json({ message: "Doctors can only create test orders for their own admissions" });
    }
  }
  if (Number(admission.PatientID) !== Number(patientId)) {
    return res.status(400).json({ message: "Test order patient must match admission patient" });
  }

  const result = await pool
    .request()
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("TestID", sql.Int, testId)
    .input("Status", sql.NVarChar(30), status || "Ordered")
    .input("Results", sql.NVarChar(sql.MAX), results || null)
    .query(`
      INSERT INTO IPDTestOrders (AdmissionID, PatientID, TestID, Status, Results)
      OUTPUT INSERTED.*
      VALUES (@AdmissionID, @PatientID, @TestID, @Status, @Results)
    `);

  res.status(201).json(result.recordset[0]);
});

const updateIPDTestOrder = asyncHandler(async (req, res) => {
  const { admissionId, patientId, testId, status, results } = req.body;

  if (!admissionId || !patientId || !testId) {
    return res.status(400).json({ message: "Admission, patient, and test are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestOrderID", sql.Int, req.params.id)
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("TestID", sql.Int, testId)
    .input("Status", sql.NVarChar(30), status || "Ordered")
    .input("Results", sql.NVarChar(sql.MAX), results || null)
    .query(`
      UPDATE IPDTestOrders
      SET AdmissionID = @AdmissionID,
          PatientID = @PatientID,
          TestID = @TestID,
          Status = @Status,
          Results = @Results
      OUTPUT INSERTED.*
      WHERE TestOrderID = @TestOrderID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "IPD test order not found" });
  }

  res.json(result.recordset[0]);
});

const deleteIPDTestOrder = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("TestOrderID", sql.Int, req.params.id)
    .query(`
      DELETE FROM IPDTestOrders
      OUTPUT DELETED.*
      WHERE TestOrderID = @TestOrderID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "IPD test order not found" });
  }

  res.json(result.recordset[0]);
});

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
