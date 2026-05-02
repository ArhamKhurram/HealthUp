const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listAdmissions = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT a.AdmissionID, a.AdmissionDate, a.DischargeDate, a.AdmissionType,
           a.Status, a.ClinicalDiagnosis, p.MRNumber,
           patientUser.FullName AS PatientName, doctorUser.FullName AS DoctorName,
           w.WardName, b.BedNumber
    FROM IPDAdmissions a
    INNER JOIN Patients p ON p.PatientID = a.PatientID
    INNER JOIN Users patientUser ON patientUser.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = a.AttendingDoctorID
    INNER JOIN Users doctorUser ON doctorUser.UserID = d.UserID
    INNER JOIN Wards w ON w.WardID = a.WardID
    INNER JOIN Beds b ON b.BedID = a.BedID
    ORDER BY a.AdmissionDate DESC
  `);
  res.json(result.recordset);
});

const getAdmission = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("AdmissionID", sql.Int, req.params.id)
    .query(`
      SELECT *
      FROM IPDAdmissions
      WHERE AdmissionID = @AdmissionID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Admission not found" });
  }

  res.json(result.recordset[0]);
});

const createAdmission = asyncHandler(async (req, res) => {
  const { patientId, attendingDoctorId, bedId, wardId, admissionType, clinicalDiagnosis } = req.body;

  if (!patientId || !attendingDoctorId || !bedId || !wardId || !admissionType) {
    return res.status(400).json({ message: "Patient, doctor, bed, ward, and admission type are required" });
  }

  const pool = await getPool();
  const created = await pool
    .request()
    .input("PatientID", sql.Int, patientId)
    .input("AttendingDoctorID", sql.Int, attendingDoctorId)
    .input("BedID", sql.Int, bedId)
    .input("WardID", sql.Int, wardId)
    .input("AdmissionType", sql.NVarChar(50), admissionType)
    .input("ClinicalDiagnosis", sql.NVarChar(sql.MAX), clinicalDiagnosis || null)
    .query(`
      EXEC sp_AdmitPatientTransactional
        @PatientID = @PatientID,
        @AttendingDoctorID = @AttendingDoctorID,
        @BedID = @BedID,
        @WardID = @WardID,
        @AdmissionType = @AdmissionType,
        @ClinicalDiagnosis = @ClinicalDiagnosis
    `);

  const admissionId = created.recordset[0]?.AdmissionID;
  const result = await pool
    .request()
    .input("AdmissionID", sql.Int, admissionId)
    .query("SELECT * FROM IPDAdmissions WHERE AdmissionID = @AdmissionID");

  res.status(201).json(result.recordset[0]);
});

const updateAdmission = asyncHandler(async (req, res) => {
  const {
    patientId,
    attendingDoctorId,
    bedId,
    wardId,
    admissionDate,
    dischargeDate,
    admissionType,
    status,
    clinicalDiagnosis
  } = req.body;

  if (!patientId || !attendingDoctorId || !bedId || !wardId || !admissionType) {
    return res.status(400).json({ message: "Patient, doctor, bed, ward, and admission type are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("AdmissionID", sql.Int, req.params.id)
    .input("PatientID", sql.Int, patientId)
    .input("AttendingDoctorID", sql.Int, attendingDoctorId)
    .input("BedID", sql.Int, bedId)
    .input("WardID", sql.Int, wardId)
    .input("AdmissionDate", sql.DateTime2, admissionDate || null)
    .input("DischargeDate", sql.DateTime2, dischargeDate || null)
    .input("AdmissionType", sql.NVarChar(50), admissionType)
    .input("Status", sql.NVarChar(30), status || "Admitted")
    .input("ClinicalDiagnosis", sql.NVarChar(sql.MAX), clinicalDiagnosis || null)
    .query(`
      UPDATE IPDAdmissions
      SET PatientID = @PatientID,
          AttendingDoctorID = @AttendingDoctorID,
          BedID = @BedID,
          WardID = @WardID,
          AdmissionDate = COALESCE(@AdmissionDate, AdmissionDate),
          DischargeDate = @DischargeDate,
          AdmissionType = @AdmissionType,
          Status = @Status,
          ClinicalDiagnosis = @ClinicalDiagnosis
      OUTPUT INSERTED.*
      WHERE AdmissionID = @AdmissionID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Admission not found" });
  }

  res.json(result.recordset[0]);
});

const deleteAdmission = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("AdmissionID", sql.Int, req.params.id)
    .query(`
      DELETE FROM IPDAdmissions
      OUTPUT DELETED.*
      WHERE AdmissionID = @AdmissionID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Admission not found" });
  }

  res.json(result.recordset[0]);
});

const listPrescriptions = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT pr.PrescriptionID, pr.AdmissionID, pr.PatientID, pr.DoctorID,
           pr.PrescriptionDate, pr.Diagnosis,
           patientUser.FullName AS PatientName, doctorUser.FullName AS DoctorName
    FROM IPDPrescriptions pr
    INNER JOIN Patients p ON p.PatientID = pr.PatientID
    INNER JOIN Users patientUser ON patientUser.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = pr.DoctorID
    INNER JOIN Users doctorUser ON doctorUser.UserID = d.UserID
    ORDER BY pr.PrescriptionID DESC
  `);

  res.json(result.recordset);
});

const getPrescription = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .query(`
      SELECT *
      FROM IPDPrescriptions
      WHERE PrescriptionID = @PrescriptionID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  res.json(result.recordset[0]);
});

const createPrescription = asyncHandler(async (req, res) => {
  const { admissionId, patientId, doctorId, prescriptionDate, diagnosis } = req.body;

  if (!admissionId || !patientId || !doctorId) {
    return res.status(400).json({ message: "Admission, patient, and doctor are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("PrescriptionDate", sql.Date, prescriptionDate || null)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .query(`
      INSERT INTO IPDPrescriptions (AdmissionID, PatientID, DoctorID, PrescriptionDate, Diagnosis)
      OUTPUT INSERTED.*
      VALUES (@AdmissionID, @PatientID, @DoctorID, COALESCE(@PrescriptionDate, CONVERT(DATE, GETDATE())), @Diagnosis)
    `);

  res.status(201).json(result.recordset[0]);
});

const updatePrescription = asyncHandler(async (req, res) => {
  const { admissionId, patientId, doctorId, prescriptionDate, diagnosis } = req.body;

  if (!admissionId || !patientId || !doctorId) {
    return res.status(400).json({ message: "Admission, patient, and doctor are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .input("AdmissionID", sql.Int, admissionId)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("PrescriptionDate", sql.Date, prescriptionDate || null)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .query(`
      UPDATE IPDPrescriptions
      SET AdmissionID = @AdmissionID,
          PatientID = @PatientID,
          DoctorID = @DoctorID,
          PrescriptionDate = COALESCE(@PrescriptionDate, PrescriptionDate),
          Diagnosis = @Diagnosis
      OUTPUT INSERTED.*
      WHERE PrescriptionID = @PrescriptionID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  res.json(result.recordset[0]);
});

const deletePrescription = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .query(`
      DELETE FROM IPDPrescriptions
      OUTPUT DELETED.*
      WHERE PrescriptionID = @PrescriptionID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  res.json(result.recordset[0]);
});

const listPrescriptionMedications = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT pm.PrescriptionMedicationID, pm.PrescriptionID, pm.MedicationID,
           pm.Dosage, pm.Frequency, m.MedicationName
    FROM IPDPrescriptionMedications pm
    INNER JOIN Medications m ON m.MedicationID = pm.MedicationID
    ORDER BY pm.PrescriptionMedicationID DESC
  `);

  res.json(result.recordset);
});

const getPrescriptionMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionMedicationID", sql.Int, req.params.id)
    .query(`
      SELECT *
      FROM IPDPrescriptionMedications
      WHERE PrescriptionMedicationID = @PrescriptionMedicationID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription medication not found" });
  }

  res.json(result.recordset[0]);
});

const createPrescriptionMedication = asyncHandler(async (req, res) => {
  const { prescriptionId, medicationId, dosage, frequency } = req.body;

  if (!prescriptionId || !medicationId || !dosage || !frequency) {
    return res.status(400).json({ message: "Prescription, medication, dosage, and frequency are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionID", sql.Int, prescriptionId)
    .input("MedicationID", sql.Int, medicationId)
    .input("Dosage", sql.NVarChar(80), dosage)
    .input("Frequency", sql.NVarChar(80), frequency)
    .query(`
      INSERT INTO IPDPrescriptionMedications (PrescriptionID, MedicationID, Dosage, Frequency)
      OUTPUT INSERTED.*
      VALUES (@PrescriptionID, @MedicationID, @Dosage, @Frequency)
    `);

  res.status(201).json(result.recordset[0]);
});

const updatePrescriptionMedication = asyncHandler(async (req, res) => {
  const { prescriptionId, medicationId, dosage, frequency } = req.body;

  if (!prescriptionId || !medicationId || !dosage || !frequency) {
    return res.status(400).json({ message: "Prescription, medication, dosage, and frequency are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionMedicationID", sql.Int, req.params.id)
    .input("PrescriptionID", sql.Int, prescriptionId)
    .input("MedicationID", sql.Int, medicationId)
    .input("Dosage", sql.NVarChar(80), dosage)
    .input("Frequency", sql.NVarChar(80), frequency)
    .query(`
      UPDATE IPDPrescriptionMedications
      SET PrescriptionID = @PrescriptionID,
          MedicationID = @MedicationID,
          Dosage = @Dosage,
          Frequency = @Frequency
      OUTPUT INSERTED.*
      WHERE PrescriptionMedicationID = @PrescriptionMedicationID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription medication not found" });
  }

  res.json(result.recordset[0]);
});

const deletePrescriptionMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionMedicationID", sql.Int, req.params.id)
    .query(`
      DELETE FROM IPDPrescriptionMedications
      OUTPUT DELETED.*
      WHERE PrescriptionMedicationID = @PrescriptionMedicationID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription medication not found" });
  }

  res.json(result.recordset[0]);
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
  deletePrescriptionMedication
};
