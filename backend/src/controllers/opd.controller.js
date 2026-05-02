const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listAppointments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT a.AppointmentID, a.PatientID, a.DoctorID, a.RoomID,
           a.AppointmentDate, a.AppointmentType, a.Status,
           a.ChiefComplaint, a.TokenNumber, p.MRNumber,
           patientUser.FullName AS PatientName, doctorUser.FullName AS DoctorName,
           r.RoomNumber
    FROM OPDAppointments a
    INNER JOIN Patients p ON p.PatientID = a.PatientID
    INNER JOIN Users patientUser ON patientUser.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = a.DoctorID
    INNER JOIN Users doctorUser ON doctorUser.UserID = d.UserID
    LEFT JOIN OPDRooms r ON r.RoomID = a.RoomID
    ORDER BY a.AppointmentDate DESC
  `);
  res.json(result.recordset);
});

const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, roomId, appointmentDate, appointmentType, chiefComplaint } = req.body;

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("RoomID", sql.Int, roomId || null)
    .input("AppointmentDate", sql.DateTime2, appointmentDate)
    .input("AppointmentType", sql.NVarChar(50), appointmentType || "Consultation")
    .input("ChiefComplaint", sql.NVarChar(sql.MAX), chiefComplaint || null)
    .query(`
      INSERT INTO OPDAppointments
        (PatientID, DoctorID, RoomID, AppointmentDate, AppointmentType, Status, ChiefComplaint, TokenNumber)
      OUTPUT INSERTED.*
      VALUES
        (@PatientID, @DoctorID, @RoomID, @AppointmentDate, @AppointmentType, 'Pending', @ChiefComplaint,
         NEXT VALUE FOR OPDTokenSequence)
    `);

  res.status(201).json(result.recordset[0]);
});

const getAppointment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("AppointmentID", sql.Int, req.params.id)
    .query(`
      SELECT *
      FROM OPDAppointments
      WHERE AppointmentID = @AppointmentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  res.json(result.recordset[0]);
});

const updateAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, roomId, appointmentDate, appointmentType, status, chiefComplaint } = req.body;

  if (!patientId || !doctorId || !appointmentDate || !appointmentType) {
    return res.status(400).json({ message: "Patient, doctor, appointment date, and appointment type are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("AppointmentID", sql.Int, req.params.id)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("RoomID", sql.Int, roomId || null)
    .input("AppointmentDate", sql.DateTime2, appointmentDate)
    .input("AppointmentType", sql.NVarChar(50), appointmentType)
    .input("Status", sql.NVarChar(30), status || "Pending")
    .input("ChiefComplaint", sql.NVarChar(sql.MAX), chiefComplaint || null)
    .query(`
      UPDATE OPDAppointments
      SET PatientID = @PatientID,
          DoctorID = @DoctorID,
          RoomID = @RoomID,
          AppointmentDate = @AppointmentDate,
          AppointmentType = @AppointmentType,
          Status = @Status,
          ChiefComplaint = @ChiefComplaint
      OUTPUT INSERTED.*
      WHERE AppointmentID = @AppointmentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  res.json(result.recordset[0]);
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("AppointmentID", sql.Int, req.params.id)
    .query(`
      DELETE FROM OPDAppointments
      OUTPUT DELETED.*
      WHERE AppointmentID = @AppointmentID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  res.json(result.recordset[0]);
});

const listPrescriptions = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT pr.PrescriptionID, pr.AppointmentID, pr.PatientID, pr.DoctorID,
           pr.PrescriptionDate, pr.Diagnosis,
           patientUser.FullName AS PatientName, doctorUser.FullName AS DoctorName
    FROM OPDPrescriptions pr
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
      FROM OPDPrescriptions
      WHERE PrescriptionID = @PrescriptionID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  res.json(result.recordset[0]);
});

const createPrescription = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, doctorId, prescriptionDate, diagnosis } = req.body;

  if (!appointmentId || !patientId || !doctorId) {
    return res.status(400).json({ message: "Appointment, patient, and doctor are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("PrescriptionDate", sql.Date, prescriptionDate || null)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .query(`
      INSERT INTO OPDPrescriptions (AppointmentID, PatientID, DoctorID, PrescriptionDate, Diagnosis)
      OUTPUT INSERTED.*
      VALUES (@AppointmentID, @PatientID, @DoctorID, COALESCE(@PrescriptionDate, CONVERT(DATE, GETDATE())), @Diagnosis)
    `);

  res.status(201).json(result.recordset[0]);
});

const updatePrescription = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, doctorId, prescriptionDate, diagnosis } = req.body;

  if (!appointmentId || !patientId || !doctorId) {
    return res.status(400).json({ message: "Appointment, patient, and doctor are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("PrescriptionDate", sql.Date, prescriptionDate || null)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .query(`
      UPDATE OPDPrescriptions
      SET AppointmentID = @AppointmentID,
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
      DELETE FROM OPDPrescriptions
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
    FROM OPDPrescriptionMedications pm
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
      FROM OPDPrescriptionMedications
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
      INSERT INTO OPDPrescriptionMedications (PrescriptionID, MedicationID, Dosage, Frequency)
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
      UPDATE OPDPrescriptionMedications
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
      DELETE FROM OPDPrescriptionMedications
      OUTPUT DELETED.*
      WHERE PrescriptionMedicationID = @PrescriptionMedicationID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription medication not found" });
  }

  res.json(result.recordset[0]);
});

module.exports = {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
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
