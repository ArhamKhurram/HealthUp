// IPD controller for the simplified admissions model.
// Bed and ward tables were removed; each admission now stores DepartmentID, DoctorID, and a simple BedNumber.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

async function actorContext(pool, req) {
  if (req.user?.role === "Patient") {
    const patient = await pool.request()
      .input("UserID", sql.Int, req.user.userId)
      .query("SELECT PatientID FROM Patients WHERE UserID = @UserID");
    return { patientId: patient.recordset[0]?.PatientID || null, doctorId: null };
  }

  if (req.user?.role === "Doctor") {
    const doctor = await pool.request()
      .input("UserID", sql.Int, req.user.userId)
      .query("SELECT DoctorID FROM Doctors WHERE UserID = @UserID");
    return { patientId: null, doctorId: doctor.recordset[0]?.DoctorID || null };
  }

  return { patientId: null, doctorId: null };
}

function normalizeAdmissionBody(body) {
  return {
    patientId: Number(body.patientId),
    doctorId: Number(body.doctorId || body.attendingDoctorId),
    departmentId: Number(body.departmentId || body.wardId),
    bedNumber: body.bedNumber || (body.bedId ? `BED-${body.bedId}` : null),
    diagnosis: body.diagnosis || body.clinicalDiagnosis || null,
    status: body.status || "Admitted",
    dischargeDate: body.dischargeDate || null
  };
}

const listAdmissions = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const actor = await actorContext(pool, req);
  const result = await pool.request()
    .input("PatientID", sql.Int, req.user.role === "Patient" ? actor.patientId : null)
    .input("DoctorID", sql.Int, req.user.role === "Doctor" ? actor.doctorId : null)
    .query("EXEC sp_ListIPDAdmissions @PatientID, @DoctorID");
  res.json(result.recordset);
});

const getAdmission = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("AdmissionID", sql.Int, req.params.id)
    .query("SELECT * FROM vw_IPDAdmissionDetails WHERE AdmissionID = @AdmissionID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Admission not found" });
  res.json(result.recordset[0]);
});

const createAdmission = asyncHandler(async (req, res) => {
  const body = normalizeAdmissionBody(req.body);
  if (!body.patientId || !body.doctorId || !body.departmentId || !body.bedNumber) {
    return res.status(400).json({ message: "patientId, doctorId, departmentId, and bedNumber are required" });
  }

  const pool = await getPool();
  const result = await pool.request()
    .input("PatientID", sql.Int, body.patientId)
    .input("DoctorID", sql.Int, body.doctorId)
    .input("DepartmentID", sql.Int, body.departmentId)
    .input("BedNumber", sql.NVarChar(30), body.bedNumber)
    .input("Diagnosis", sql.NVarChar(sql.MAX), body.diagnosis)
    .query("EXEC sp_CreateIPDAdmission @PatientID, @DoctorID, @DepartmentID, @BedNumber, @Diagnosis");
  res.status(201).json(result.recordset[0]);
});

const updateAdmission = asyncHandler(async (req, res) => {
  const body = normalizeAdmissionBody(req.body);
  if (!["Admitted", "Discharged"].includes(body.status)) return res.status(400).json({ message: "Invalid admission status" });

  const pool = await getPool();
  const existing = await pool.request()
    .input("AdmissionID", sql.Int, req.params.id)
    .query("SELECT * FROM vw_IPDAdmissionDetails WHERE AdmissionID = @AdmissionID");
  if (!existing.recordset[0]) return res.status(404).json({ message: "Admission not found" });

  const previous = existing.recordset[0];
  const result = await pool.request()
    .input("AdmissionID", sql.Int, req.params.id)
    .input("PatientID", sql.Int, body.patientId || previous.PatientID)
    .input("DoctorID", sql.Int, body.doctorId || previous.DoctorID)
    .input("DepartmentID", sql.Int, body.departmentId || previous.DepartmentID)
    .input("BedNumber", sql.NVarChar(30), body.bedNumber || previous.BedNumber)
    .input("Diagnosis", sql.NVarChar(sql.MAX), body.diagnosis ?? previous.Diagnosis)
    .input("Status", sql.NVarChar(30), body.status || previous.Status)
    .input("DischargeDate", sql.DateTime2, body.dischargeDate ? new Date(body.dischargeDate) : previous.DischargeDate)
    .query("EXEC sp_UpdateIPDAdmission @AdmissionID, @PatientID, @DoctorID, @DepartmentID, @BedNumber, @Diagnosis, @Status, @DischargeDate");
  res.json(result.recordset[0]);
});

const deleteAdmission = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("AdmissionID", sql.Int, req.params.id)
    .query("DELETE FROM IPDAdmissions OUTPUT DELETED.AdmissionID WHERE AdmissionID = @AdmissionID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Admission not found" });
  res.json({ message: "Admission deleted" });
});

function prescriptionSelect(whereClause = "WHERE pr.AdmissionID IS NOT NULL") {
  return `
    SELECT pr.PrescriptionID, pr.PatientID, pr.DoctorID, pr.AdmissionID, pr.PrescriptionDate,
           pr.Diagnosis, pr.Notes,
           pu.FullName AS PatientName, du.FullName AS DoctorName,
           meds.MedicationName, meds.Dosage, meds.Frequency
    FROM Prescriptions pr
    INNER JOIN Patients p ON p.PatientID = pr.PatientID
    INNER JOIN Users pu ON pu.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = pr.DoctorID
    INNER JOIN Users du ON du.UserID = d.UserID
    OUTER APPLY (
      SELECT
        STRING_AGG(m.MedicationName, ', ') AS MedicationName,
        STRING_AGG(pm.Dosage, ', ') AS Dosage,
        STRING_AGG(pm.Frequency, ', ') AS Frequency
      FROM PrescriptionMedications pm
      INNER JOIN Medications m ON m.MedicationID = pm.MedicationID
      WHERE pm.PrescriptionID = pr.PrescriptionID
    ) meds
    ${whereClause}
  `;
}

const listPrescriptions = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`${prescriptionSelect()} ORDER BY pr.PrescriptionDate DESC`);
  res.json(result.recordset);
});

const getPrescription = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .query(`${prescriptionSelect("WHERE pr.PrescriptionID = @PrescriptionID AND pr.AdmissionID IS NOT NULL")}`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription not found" });
  res.json(result.recordset[0]);
});

const createPrescription = asyncHandler(async (req, res) => {
  const { admissionId, patientId, doctorId, diagnosis, notes } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .input("Notes", sql.NVarChar(sql.MAX), notes || null)
    .query(`
      INSERT INTO Prescriptions (AdmissionID, PatientID, DoctorID, Diagnosis, Notes)
      OUTPUT INSERTED.*
      VALUES (@AdmissionID, @PatientID, @DoctorID, @Diagnosis, @Notes)
    `);
  res.status(201).json(result.recordset[0]);
});

const updatePrescription = asyncHandler(async (req, res) => {
  const { diagnosis, notes } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .input("Notes", sql.NVarChar(sql.MAX), notes || null)
    .query(`
      UPDATE Prescriptions
      SET Diagnosis = @Diagnosis, Notes = @Notes
      OUTPUT INSERTED.*
      WHERE PrescriptionID = @PrescriptionID AND AdmissionID IS NOT NULL
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription not found" });
  res.json(result.recordset[0]);
});

const deletePrescription = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .query("DELETE FROM Prescriptions OUTPUT DELETED.PrescriptionID WHERE PrescriptionID = @PrescriptionID AND AdmissionID IS NOT NULL");
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription not found" });
  res.json({ message: "Prescription deleted" });
});

const listPrescriptionMedications = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT pm.*, m.MedicationName, pr.AdmissionID
    FROM PrescriptionMedications pm
    INNER JOIN Prescriptions pr ON pr.PrescriptionID = pm.PrescriptionID
    INNER JOIN Medications m ON m.MedicationID = pm.MedicationID
    WHERE pr.AdmissionID IS NOT NULL
    ORDER BY pm.PrescriptionMedicationID DESC
  `);
  res.json(result.recordset);
});

const getPrescriptionMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionMedicationID", sql.Int, req.params.id)
    .query("SELECT * FROM PrescriptionMedications WHERE PrescriptionMedicationID = @PrescriptionMedicationID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription medication not found" });
  res.json(result.recordset[0]);
});

const createPrescriptionMedication = asyncHandler(async (req, res) => {
  const { prescriptionId, medicationId, dosage, frequency, durationDays, instructions } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionID", sql.Int, prescriptionId)
    .input("MedicationID", sql.Int, medicationId)
    .input("Dosage", sql.NVarChar(80), dosage || null)
    .input("Frequency", sql.NVarChar(100), frequency || null)
    .input("DurationDays", sql.Int, durationDays || null)
    .input("Instructions", sql.NVarChar(sql.MAX), instructions || null)
    .query(`
      INSERT INTO PrescriptionMedications (PrescriptionID, MedicationID, Dosage, Frequency, DurationDays, Instructions)
      OUTPUT INSERTED.*
      VALUES (@PrescriptionID, @MedicationID, @Dosage, @Frequency, @DurationDays, @Instructions)
    `);
  res.status(201).json(result.recordset[0]);
});

const updatePrescriptionMedication = asyncHandler(async (req, res) => {
  const { medicationId, dosage, frequency, durationDays, instructions } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionMedicationID", sql.Int, req.params.id)
    .input("MedicationID", sql.Int, medicationId)
    .input("Dosage", sql.NVarChar(80), dosage || null)
    .input("Frequency", sql.NVarChar(100), frequency || null)
    .input("DurationDays", sql.Int, durationDays || null)
    .input("Instructions", sql.NVarChar(sql.MAX), instructions || null)
    .query(`
      UPDATE PrescriptionMedications
      SET MedicationID = @MedicationID,
          Dosage = @Dosage,
          Frequency = @Frequency,
          DurationDays = @DurationDays,
          Instructions = @Instructions
      OUTPUT INSERTED.*
      WHERE PrescriptionMedicationID = @PrescriptionMedicationID
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription medication not found" });
  res.json(result.recordset[0]);
});

const deletePrescriptionMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionMedicationID", sql.Int, req.params.id)
    .query("DELETE FROM PrescriptionMedications OUTPUT DELETED.PrescriptionMedicationID WHERE PrescriptionMedicationID = @PrescriptionMedicationID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription medication not found" });
  res.json({ message: "Prescription medication deleted" });
});

const listVitalsByAdmission = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("AdmissionID", sql.Int, req.params.id)
    .query("EXEC sp_GetPatientVitalHistory @AdmissionID");
  res.json(result.recordset);
});

const createVitalForAdmission = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const nurse = await pool.request()
    .input("UserID", sql.Int, req.user.userId)
    .query("SELECT NurseID FROM Nurses WHERE UserID = @UserID");

  const nurseId = nurse.recordset[0]?.NurseID;
  if (!nurseId) {
    return res.status(403).json({ message: "Only nurse profiles can record vitals." });
  }

  const body = req.body || {};
  const result = await pool.request()
    .input("AdmissionID", sql.Int, req.params.id)
    .input("NurseID", sql.Int, nurseId)
    .input("TemperatureC", sql.Decimal(4, 1), body.temperatureC ?? null)
    .input("SystolicBP", sql.Int, body.systolicBP ?? null)
    .input("DiastolicBP", sql.Int, body.diastolicBP ?? null)
    .input("HeartRate", sql.Int, body.heartRate ?? null)
    .input("RespiratoryRate", sql.Int, body.respiratoryRate ?? null)
    .input("OxygenSaturation", sql.Int, body.oxygenSaturation ?? null)
    .input("ProgressNote", sql.NVarChar(sql.MAX), body.progressNote ?? null)
    .query(`
      EXEC sp_RecordPatientVital
        @AdmissionID,
        @NurseID,
        @TemperatureC,
        @SystolicBP,
        @DiastolicBP,
        @HeartRate,
        @RespiratoryRate,
        @OxygenSaturation,
        @ProgressNote
    `);

  res.status(201).json(result.recordset[0]);
});

module.exports = {
  listAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  listPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  deletePrescription,
  listPrescriptionMedications,
  getPrescriptionMedication,
  createPrescriptionMedication,
  updatePrescriptionMedication,
  deletePrescriptionMedication,
  listVitalsByAdmission,
  createVitalForAdmission
};
