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

const listAppointments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request();
  let whereClause = "";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause = "WHERE a.PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause = "WHERE a.DoctorID = @ActorDoctorID";
  }

  const result = await request.query(`
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
    ${whereClause}
    ORDER BY a.AppointmentDate DESC
  `);
  res.json(result.recordset);
});

const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, roomId, appointmentDate, appointmentType, chiefComplaint } = req.body;
  let effectivePatientId = patientId;

  if (!doctorId || !appointmentDate || !appointmentType) {
    return res.status(400).json({ message: "Patient, doctor, appointment date, and appointment type are required" });
  }

  const pool = await getPool();
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    if (patientId && Number(patientId) !== Number(actor.PatientID)) {
      return res.status(403).json({ message: "Patients can only create their own appointments" });
    }
    effectivePatientId = actor.PatientID;
  }

  if (!effectivePatientId) {
    return res.status(400).json({ message: "Patient is required" });
  }

  const created = await pool
    .request()
    .input("PatientID", sql.Int, effectivePatientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("RoomID", sql.Int, roomId || null)
    .input("AppointmentDate", sql.DateTime2, appointmentDate)
    .input("AppointmentType", sql.NVarChar(50), appointmentType)
    .input("ChiefComplaint", sql.NVarChar(sql.MAX), chiefComplaint || null)
    .query(`
      EXEC sp_BookOPDAppointment
        @PatientID = @PatientID,
        @DoctorID = @DoctorID,
        @RoomID = @RoomID,
        @AppointmentDate = @AppointmentDate,
        @AppointmentType = @AppointmentType,
        @ChiefComplaint = @ChiefComplaint
    `);

  const appointmentId = created.recordset[0]?.AppointmentID;
  const result = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .query("SELECT * FROM OPDAppointments WHERE AppointmentID = @AppointmentID");

  res.status(201).json(result.recordset[0]);
});

const getAppointment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request().input("AppointmentID", sql.Int, req.params.id);
  let whereClause = "WHERE AppointmentID = @AppointmentID";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause += " AND PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause += " AND DoctorID = @ActorDoctorID";
  }

  const result = await request.query(`
      SELECT *
      FROM OPDAppointments
      ${whereClause}
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
  const request = pool.request();
  let whereClause = "";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause = "WHERE pr.PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause = "WHERE pr.DoctorID = @ActorDoctorID";
  }

  const result = await request.query(`
    SELECT pr.PrescriptionID, pr.AppointmentID, pr.PatientID, pr.DoctorID,
           pr.PrescriptionDate, pr.Diagnosis,
           patientUser.FullName AS PatientName, doctorUser.FullName AS DoctorName
    FROM OPDPrescriptions pr
    INNER JOIN Patients p ON p.PatientID = pr.PatientID
    INNER JOIN Users patientUser ON patientUser.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = pr.DoctorID
    INNER JOIN Users doctorUser ON doctorUser.UserID = d.UserID
    ${whereClause}
    ORDER BY pr.PrescriptionID DESC
  `);

  res.json(result.recordset);
});

const getPrescription = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const request = pool.request().input("PrescriptionID", sql.Int, req.params.id);
  let whereClause = "WHERE PrescriptionID = @PrescriptionID";
  if (req.user.role === "Patient") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.PatientID) return res.status(403).json({ message: "Patient profile is required" });
    request.input("ActorPatientID", sql.Int, actor.PatientID);
    whereClause += " AND PatientID = @ActorPatientID";
  } else if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    request.input("ActorDoctorID", sql.Int, actor.DoctorID);
    whereClause += " AND DoctorID = @ActorDoctorID";
  }

  const result = await request.query(`
      SELECT *
      FROM OPDPrescriptions
      ${whereClause}
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Prescription not found" });
  }

  res.json(result.recordset[0]);
});

const createPrescription = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, doctorId, prescriptionDate, diagnosis } = req.body;
  let effectiveDoctorId = doctorId;

  if (!appointmentId || !patientId || !doctorId) {
    return res.status(400).json({ message: "Appointment, patient, and doctor are required" });
  }

  const pool = await getPool();
  const appointmentCheck = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .query("SELECT AppointmentID, PatientID, DoctorID FROM OPDAppointments WHERE AppointmentID = @AppointmentID");
  const appointment = appointmentCheck.recordset[0];
  if (!appointment) return res.status(404).json({ message: "Appointment not found" });
  if (Number(appointment.PatientID) !== Number(patientId) || Number(appointment.DoctorID) !== Number(doctorId)) {
    return res.status(400).json({ message: "Prescription must match appointment patient and doctor" });
  }
  if (req.user.role === "Doctor") {
    const actor = await getActorContext(pool, req.user.userId);
    if (!actor.DoctorID) return res.status(403).json({ message: "Doctor profile is required" });
    if (Number(actor.DoctorID) !== Number(doctorId)) {
      return res.status(403).json({ message: "Doctors can only create prescriptions under their own profile" });
    }
    effectiveDoctorId = actor.DoctorID;
  }

  const created = await pool
    .request()
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, effectiveDoctorId)
    .input("PrescriptionDate", sql.Date, prescriptionDate || null)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .query(`
      EXEC sp_AddOPDPrescription
        @AppointmentID = @AppointmentID,
        @PatientID = @PatientID,
        @DoctorID = @DoctorID,
        @PrescriptionDate = @PrescriptionDate,
        @Diagnosis = @Diagnosis
    `);

  const prescriptionId = created.recordset[0]?.PrescriptionID;
  const result = await pool
    .request()
    .input("PrescriptionID", sql.Int, prescriptionId)
    .query("SELECT * FROM OPDPrescriptions WHERE PrescriptionID = @PrescriptionID");

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
