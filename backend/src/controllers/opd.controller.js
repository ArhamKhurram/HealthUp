const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const SLOT_MINUTES = 30;
const APPOINTMENT_STATUSES = ["Pending", "PendingPayment", "Confirmed", "CheckedIn", "Completed", "Cancelled"];
const SLOT_BLOCKING_STATUSES = ["Pending", "PendingPayment", "Confirmed", "CheckedIn"];
const APPOINTMENT_STATUS_TRANSITIONS = {
  Pending: ["Pending", "PendingPayment", "Confirmed", "Cancelled"],
  PendingPayment: ["PendingPayment", "Confirmed", "Cancelled"],
  Confirmed: ["Confirmed", "CheckedIn", "Cancelled"],
  CheckedIn: ["CheckedIn", "Completed", "Cancelled"],
  Completed: ["Completed"],
  Cancelled: ["Cancelled"]
};

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

const getSlotWindow = (appointmentDate) => {
  const requestedAt = new Date(appointmentDate);
  if (Number.isNaN(requestedAt.getTime())) return null;
  if (requestedAt.getMinutes() % SLOT_MINUTES !== 0 || requestedAt.getSeconds() !== 0 || requestedAt.getMilliseconds() !== 0) return null;
  const dayOfWeek = requestedAt.getDay();
  const hh = String(requestedAt.getHours()).padStart(2, "0");
  const mm = String(requestedAt.getMinutes()).padStart(2, "0");
  const appointmentTime = `${hh}:${mm}:00`;
  const slotEnd = new Date(requestedAt.getTime() + SLOT_MINUTES * 60000);
  return { requestedAt, dayOfWeek, appointmentTime, slotEnd };
};

const ensureDoctorSlotAvailable = async ({ pool, doctorId, appointmentDate, excludeAppointmentId = null }) => {
  const slot = getSlotWindow(appointmentDate);
  if (!slot) {
    return { ok: false, code: 400, message: "Appointments must start on 30-minute slots" };
  }

  const schedule = await pool
    .request()
    .input("DoctorID", sql.Int, doctorId)
    .input("DayOfWeek", sql.Int, slot.dayOfWeek)
    .input("AppointmentTime", sql.Time, slot.appointmentTime)
    .query(`
      SELECT TOP 1 ScheduleID
      FROM DoctorSchedules
      WHERE DoctorID = @DoctorID
        AND DayOfWeek = @DayOfWeek
        AND IsActive = 1
        AND @AppointmentTime >= StartTime
        AND DATEADD(minute, ${SLOT_MINUTES}, @AppointmentTime) <= EndTime
    `);
  if (!schedule.recordset[0]) {
    return { ok: false, code: 400, message: "Selected time is outside doctor's schedule" };
  }

  const request = pool
    .request()
    .input("DoctorID", sql.Int, doctorId)
    .input("StartAt", sql.DateTime2, slot.requestedAt)
    .input("EndAt", sql.DateTime2, slot.slotEnd);
  let excludeClause = "";
  if (excludeAppointmentId) {
    request.input("ExcludeAppointmentID", sql.Int, excludeAppointmentId);
    excludeClause = "AND AppointmentID <> @ExcludeAppointmentID";
  }
  const conflict = await request.query(`
      SELECT TOP 1 AppointmentID
      FROM OPDAppointments
      WHERE DoctorID = @DoctorID
        AND Status IN (${SLOT_BLOCKING_STATUSES.map((s) => `'${s}'`).join(", ")})
        AND AppointmentDate < @EndAt
        AND DATEADD(minute, ${SLOT_MINUTES}, AppointmentDate) > @StartAt
        ${excludeClause}
    `);

  if (conflict.recordset[0]) {
    return { ok: false, code: 409, message: "This slot is already booked for the doctor" };
  }

  return { ok: true };
};

const listAvailableDoctorSlots = asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.doctorId);
  const date = String(req.query.date || "");
  if (!doctorId || !date) {
    return res.status(400).json({ message: "Doctor and date are required" });
  }

  const requestedDay = new Date(`${date}T00:00:00`);
  if (Number.isNaN(requestedDay.getTime())) {
    return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
  }

  const dayOfWeek = requestedDay.getDay();
  const pool = await getPool();

  const scheduleResult = await pool
    .request()
    .input("DoctorID", sql.Int, doctorId)
    .input("DayOfWeek", sql.Int, dayOfWeek)
    .query(`
      SELECT StartTime, EndTime
      FROM DoctorSchedules
      WHERE DoctorID = @DoctorID
        AND DayOfWeek = @DayOfWeek
        AND IsActive = 1
      ORDER BY StartTime
    `);

  if (!scheduleResult.recordset.length) {
    return res.json([]);
  }

  const bookedResult = await pool
    .request()
    .input("DoctorID", sql.Int, doctorId)
    .input("DateOnly", sql.Date, date)
    .query(`
      SELECT AppointmentDate
      FROM OPDAppointments
      WHERE DoctorID = @DoctorID
        AND CAST(AppointmentDate AS DATE) = @DateOnly
        AND Status IN (${SLOT_BLOCKING_STATUSES.map((s) => `'${s}'`).join(", ")})
    `);

  const booked = new Set(
    bookedResult.recordset.map((row) => {
      const dt = new Date(row.AppointmentDate);
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    })
  );

  const toMinutes = (value) => {
    if (value instanceof Date) {
      return value.getHours() * 60 + value.getMinutes();
    }
    const raw = String(value || "");
    const hhmm = raw.includes("T")
      ? raw.split("T")[1]?.slice(0, 5)
      : raw.match(/\d{2}:\d{2}/)?.[0];
    if (!hhmm) return NaN;
    const [hh, mm] = hhmm.split(":").map(Number);
    return hh * 60 + mm;
  };
  const formatTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  const available = [];
  for (const row of scheduleResult.recordset) {
    const start = toMinutes(row.StartTime);
    const end = toMinutes(row.EndTime);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    for (let current = start; current + SLOT_MINUTES <= end; current += SLOT_MINUTES) {
      const time = formatTime(current);
      if (!booked.has(time)) {
        available.push({
          value: `${date}T${time}`,
          time
        });
      }
    }
  }

  res.json(available);
});

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

  const slotValidation = await ensureDoctorSlotAvailable({ pool, doctorId, appointmentDate });
  if (!slotValidation.ok) {
    return res.status(slotValidation.code).json({ message: slotValidation.message });
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
  if (status && !APPOINTMENT_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid appointment status" });
  }

  const pool = await getPool();
  const current = await pool.request().input("AppointmentID", sql.Int, req.params.id).query("SELECT * FROM OPDAppointments WHERE AppointmentID = @AppointmentID");
  if (!current.recordset[0]) {
    return res.status(404).json({ message: "Appointment not found" });
  }
  const existing = current.recordset[0];
  const nextStatus = status || existing.Status || "Pending";
  const allowedTransitions = APPOINTMENT_STATUS_TRANSITIONS[existing.Status] || [existing.Status];
  if (status && !allowedTransitions.includes(status)) {
    return res.status(409).json({ message: `Appointment cannot move from ${existing.Status} to ${status}` });
  }

  const nextDoctorId = doctorId || existing.DoctorID;
  const nextAppointmentDate = appointmentDate || existing.AppointmentDate;
  if (doctorId || appointmentDate) {
    const slotValidation = await ensureDoctorSlotAvailable({
      pool,
      doctorId: nextDoctorId,
      appointmentDate: nextAppointmentDate,
      excludeAppointmentId: Number(req.params.id)
    });
    if (!slotValidation.ok) {
      return res.status(slotValidation.code).json({ message: slotValidation.message });
    }
  }

  if (status === "Confirmed") {
    const payment = await pool
      .request()
      .input("AppointmentID", sql.Int, req.params.id)
      .query(`
        SELECT TOP 1 PaymentID, Status, PaidAmount, TotalAmount
        FROM OPDPayments
        WHERE AppointmentID = @AppointmentID
        ORDER BY PaymentID DESC
      `);
    const latestPayment = payment.recordset[0];
    if (!latestPayment || latestPayment.Status !== "Paid" || Number(latestPayment.PaidAmount) < Number(latestPayment.TotalAmount)) {
      return res.status(409).json({ message: "Appointment can only be confirmed after paid OPD payment" });
    }
  }

  const result = await pool
    .request()
    .input("AppointmentID", sql.Int, req.params.id)
    .input("PatientID", sql.Int, patientId || existing.PatientID)
    .input("DoctorID", sql.Int, nextDoctorId)
    .input("RoomID", sql.Int, roomId !== undefined ? roomId : existing.RoomID)
    .input("AppointmentDate", sql.DateTime2, nextAppointmentDate)
    .input("AppointmentType", sql.NVarChar(50), appointmentType || existing.AppointmentType)
    .input("Status", sql.NVarChar(30), nextStatus)
    .input("ChiefComplaint", sql.NVarChar(sql.MAX), chiefComplaint !== undefined ? chiefComplaint : existing.ChiefComplaint)
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
  listAvailableDoctorSlots,
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
