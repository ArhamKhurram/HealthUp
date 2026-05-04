// OPD controller for doctor availability, appointments, and unified prescriptions.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const SLOT_MINUTES = 30;
const ACTIVE_APPOINTMENT_STATUSES = ["Pending", "Confirmed"];

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function toSqlTime(value, fallback) {
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  return String(value || fallback).slice(0, 5);
}

function sameDateBounds(dateText) {
  const day = new Date(`${dateText}T00:00:00`);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  return { day, next };
}

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

async function assertSlotAvailable(pool, doctorId, appointmentDateTime, ignoredAppointmentId = null) {
  const desired = new Date(appointmentDateTime);
  if (Number.isNaN(desired.getTime())) {
    const error = new Error("Appointment date and time is invalid");
    error.statusCode = 400;
    throw error;
  }

  const doctor = await pool.request()
    .input("DoctorID", sql.Int, doctorId)
    .query("SELECT ShiftStartTime, ShiftEndTime, WorkDays FROM Doctors WHERE DoctorID = @DoctorID");
  const row = doctor.recordset[0];
  if (!row) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  const workDays = String(row.WorkDays || "1,2,3,4,5").split(",").map(Number);
  const dayOfWeek = desired.getDay();
  if (!workDays.includes(dayOfWeek)) {
    const error = new Error("Selected date is outside the doctor's weekly schedule");
    error.statusCode = 400;
    throw error;
  }

  const startTime = toSqlTime(row.ShiftStartTime, "09:00");
  const endTime = toSqlTime(row.ShiftEndTime, "17:00");
  const selectedTime = desired.toTimeString().slice(0, 5);
  if (selectedTime < startTime || selectedTime >= endTime) {
    const error = new Error("Selected time is outside the doctor's shift");
    error.statusCode = 400;
    throw error;
  }

  const conflictRequest = pool.request()
    .input("DoctorID", sql.Int, doctorId)
    .input("AppointmentDateTime", sql.DateTime2, desired)
    .input("IgnoredAppointmentID", sql.Int, ignoredAppointmentId);

  const conflict = await conflictRequest.query(`
    SELECT AppointmentID
    FROM OPDAppointments
    WHERE DoctorID = @DoctorID
      AND AppointmentDateTime = @AppointmentDateTime
      AND Status IN ('${ACTIVE_APPOINTMENT_STATUSES.join("','")}')
      AND (@IgnoredAppointmentID IS NULL OR AppointmentID <> @IgnoredAppointmentID)
  `);

  if (conflict.recordset[0]) {
    const error = new Error("That doctor slot is already booked");
    error.statusCode = 409;
    throw error;
  }
}

function appointmentSelect(whereClause = "") {
  return `
    SELECT a.AppointmentID, a.PatientID, a.DoctorID,
           a.AppointmentDateTime, a.AppointmentDateTime AS AppointmentDate,
           a.AppointmentType, a.Status, a.ChiefComplaint,
           a.AppointmentID AS TokenNumber,
           p.MRNumber,
           pu.FullName AS PatientName,
           du.FullName AS DoctorName,
           d.Specialization,
           d.ConsultationFee
    FROM OPDAppointments a
    INNER JOIN Patients p ON p.PatientID = a.PatientID
    INNER JOIN Users pu ON pu.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = a.DoctorID
    INNER JOIN Users du ON du.UserID = d.UserID
    ${whereClause}
  `;
}

const listAvailableDoctorSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: "date query parameter is required" });

  const pool = await getPool();
  const doctor = await pool.request()
    .input("DoctorID", sql.Int, req.params.doctorId)
    .query("SELECT ShiftStartTime, ShiftEndTime, WorkDays FROM Doctors WHERE DoctorID = @DoctorID");
  const row = doctor.recordset[0];
  if (!row) return res.status(404).json({ message: "Doctor not found" });

  const { day, next } = sameDateBounds(date);
  const workDays = String(row.WorkDays || "1,2,3,4,5").split(",").map(Number);
  if (!workDays.includes(day.getDay())) return res.json([]);

  const booked = await pool.request()
    .input("DoctorID", sql.Int, req.params.doctorId)
    .input("Start", sql.DateTime2, day)
    .input("End", sql.DateTime2, next)
    .query(`
      SELECT AppointmentDateTime
      FROM OPDAppointments
      WHERE DoctorID = @DoctorID
        AND AppointmentDateTime >= @Start
        AND AppointmentDateTime < @End
        AND Status IN ('Pending', 'Confirmed')
    `);

  const bookedTimes = new Set(booked.recordset.map((item) => new Date(item.AppointmentDateTime).toTimeString().slice(0, 5)));
  const [startHour, startMinute] = toSqlTime(row.ShiftStartTime, "09:00").split(":").map(Number);
  const [endHour, endMinute] = toSqlTime(row.ShiftEndTime, "17:00").split(":").map(Number);
  const cursor = new Date(day);
  cursor.setHours(startHour, startMinute, 0, 0);
  const end = new Date(day);
  end.setHours(endHour, endMinute, 0, 0);

  const slots = [];
  while (cursor < end) {
    const time = cursor.toTimeString().slice(0, 5);
    if (!bookedTimes.has(time)) {
      slots.push({ value: `${date}T${time}`, label: time, time });
    }
    cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
  }

  res.json(slots);
});

const listAppointments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const actor = await actorContext(pool, req);
  const request = pool.request();
  let whereClause = "";

  if (req.user.role === "Patient") {
    request.input("PatientID", sql.Int, actor.patientId);
    whereClause = "WHERE a.PatientID = @PatientID";
  } else if (req.user.role === "Doctor") {
    request.input("DoctorID", sql.Int, actor.doctorId);
    whereClause = "WHERE a.DoctorID = @DoctorID";
  }

  const result = await request.query(`${appointmentSelect(whereClause)} ORDER BY a.AppointmentDateTime DESC`);
  res.json(result.recordset);
});

const getAppointment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("AppointmentID", sql.Int, req.params.id)
    .query(`${appointmentSelect("WHERE a.AppointmentID = @AppointmentID")}`);

  if (!result.recordset[0]) return res.status(404).json({ message: "Appointment not found" });
  res.json(result.recordset[0]);
});

const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, appointmentDate, appointmentDateTime, appointmentType, chiefComplaint } = req.body;
  const selectedDate = appointmentDateTime || appointmentDate;
  const pool = await getPool();
  await assertSlotAvailable(pool, doctorId, selectedDate);

  const result = await pool.request()
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("AppointmentDateTime", sql.DateTime2, new Date(selectedDate))
    .input("AppointmentType", sql.NVarChar(50), appointmentType || "Consultation")
    .input("ChiefComplaint", sql.NVarChar(sql.MAX), normalizeOptional(chiefComplaint))
    .query(`
      INSERT INTO OPDAppointments (PatientID, DoctorID, AppointmentDateTime, AppointmentType, Status, ChiefComplaint)
      OUTPUT INSERTED.*, INSERTED.AppointmentDateTime AS AppointmentDate
      VALUES (@PatientID, @DoctorID, @AppointmentDateTime, @AppointmentType, 'Pending', @ChiefComplaint)
    `);

  res.status(201).json(result.recordset[0]);
});

const updateAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, appointmentDate, appointmentDateTime, appointmentType, status, chiefComplaint } = req.body;
  const selectedDate = appointmentDateTime || appointmentDate;
  const nextStatus = status || "Pending";

  // Validate status value
  if (!["Pending", "Confirmed", "Completed"].includes(nextStatus)) {
    return res.status(400).json({ message: "Invalid appointment status" });
  }

  const pool = await getPool();
  const existing = await pool.request()
    .input("AppointmentID", sql.Int, req.params.id)
    .query("SELECT * FROM OPDAppointments WHERE AppointmentID = @AppointmentID");

  if (!existing.recordset[0]) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  const current = existing.recordset[0];

  // ============================================================
  // ROLE-BASED FIELD VALIDATION
  // ============================================================
  // Admin  — unrestricted; can modify all fields
  // Doctor — can ONLY set Status = 'Completed' (with completion notes via chiefComplaint)
  // Receptionist — can modify schedule/rescheduling fields; NOT status or clinical data
  // Nurse — NO access (removed from route requireRole)
  // ============================================================

  const role = req.user?.role;

  // Build UPDATE parameters dynamically based on role permissions
  const updateFields = [];
  const params = { AppointmentID: req.params.id };

  // —— Always present ——
  params.PatientID = sql.Int, params.DoctorID = sql.Int, params.AppointmentDateTime = sql.DateTime2;
  params.AppointmentType = sql.NVarChar(50), params.Status = sql.NVarChar(30);
  params.ChiefComplaint = sql.NVarChar(sql.MAX);

  // Determine which fields each role may change
  let allowedFields = {
    patientId: false,
    doctorId: false,
    appointmentDateTime: false,
    appointmentType: false,
    chiefComplaint: false
  };

  if (role === "Admin") {
    // Admins: full edit
    allowedFields = { patientId: true, doctorId: true, appointmentDateTime: true, appointmentType: true, chiefComplaint: true };
  } else if (role === "Receptionist") {
    // Receptionists: rescheduling + reassignment
    allowedFields = { patientId: true, doctorId: true, appointmentDateTime: true, appointmentType: true, chiefComplaint: true };
    // Receptionists cannot manually set status to 'Completed'; they can only Pending/Confirmed
    if (nextStatus === "Completed") {
      return res.status(403).json({ message: "Only a doctor can mark an appointment as Completed" });
    }
  } else if (role === "Doctor") {
    // Doctors: can ONLY set status to 'Completed' on their own appointments; otherwise read-only
    if (nextStatus !== "Completed") {
      return res.status(403).json({ message: "Doctors can only mark appointments as Completed" });
    }
    // Verify this doctor owns the appointment
    if (current.DoctorID !== actor.doctorId) {
      return res.status(403).json({ message: "You can only update your own appointments" });
    }
    // If doctor included other fields, reject (status only)
    const attemptedFieldChanges = [
      patientId, doctorId, appointmentDate, appointmentDateTime, appointmentType, chiefComplaint
    ].some(v => v !== undefined && v !== "");
    if (attemptedFieldChanges) {
      return res.status(403).json({ message: "Doctors can only update appointment status to Completed (no other fields)" });
    }
    // Doctors allowed: status change only; chiefComplaint may be omitted (kept as is) or provided for completion notes
    allowedFields = { chiefComplaint: true };
  }

  // Apply defaults for fields (respecting role-based previous logic)
  const mergedPatientId   = patientId   !== undefined && patientId !== ""   ? Number(patientId)   : current.PatientID;
  const mergedDoctorId    = doctorId    !== undefined && doctorId !== ""    ? Number(doctorId)    : current.DoctorID;
  const mergedDateTime    = selectedDate !== undefined && selectedDate !== "" ? new Date(selectedDate) : current.AppointmentDateTime;
  const mergedType        = appointmentType !== undefined && appointmentType !== "" ? appointmentType : current.AppointmentType;
  const mergedChief       = chiefComplaint !== undefined ? (chiefComplaint || null) : current.ChiefComplaint;

  // If changing doctor or datetime, check slot availability (ensures no double-booking)
  if (mergedDoctorId !== current.DoctorID || mergedDateTime.getTime() !== new Date(current.AppointmentDateTime).getTime()) {
    await assertSlotAvailable(pool, mergedDoctorId, mergedDateTime, Number(req.params.id));
  }

  // Final status value to write (already validated)
  const finalStatus = nextStatus;

  // Construct parameterised UPDATE query dynamically — we include ChiefComplaint ONLY if role permits it
  let updateQuery = `
    UPDATE OPDAppointments
    SET
      PatientID = @PatientID,
      DoctorID = @DoctorID,
      AppointmentDateTime = @AppointmentDateTime,
      AppointmentType = @AppointmentType,
      Status = @Status
  `;

  if (allowedFields.chiefComplaint || role === "Admin") {
    updateQuery += `, ChiefComplaint = @ChiefComplaint`;
  }

  updateQuery += `
    OUTPUT INSERTED.*, INSERTED.AppointmentDateTime AS AppointmentDate
    WHERE AppointmentID = @AppointmentID
  `;

  // Execute UPDATE in a single atomic statement (SQL Server runs each statement in an implicit transaction)
  const result = await pool.request()
    .input("AppointmentID", sql.Int, req.params.id)
    .input("PatientID", sql.Int, mergedPatientId)
    .input("DoctorID", sql.Int, mergedDoctorId)
    .input("AppointmentDateTime", sql.DateTime2, mergedDateTime)
    .input("AppointmentType", sql.NVarChar(50), mergedType)
    .input("Status", sql.NVarChar(30), finalStatus)
    .input("ChiefComplaint", sql.NVarChar(sql.MAX), mergedChief)
    .query(updateQuery);

  res.json(result.recordset[0]);
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("AppointmentID", sql.Int, req.params.id)
    .query("DELETE FROM OPDAppointments OUTPUT DELETED.AppointmentID WHERE AppointmentID = @AppointmentID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Appointment not found" });
  res.json({ message: "Appointment deleted" });
});

function prescriptionSelect(whereClause = "WHERE pr.AppointmentID IS NOT NULL") {
  return `
    SELECT pr.PrescriptionID, pr.PatientID, pr.DoctorID, pr.AppointmentID, pr.PrescriptionDate,
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
    .query(`${prescriptionSelect("WHERE pr.PrescriptionID = @PrescriptionID AND pr.AppointmentID IS NOT NULL")}`);
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription not found" });
  res.json(result.recordset[0]);
});

const createPrescription = asyncHandler(async (req, res) => {
  const { appointmentId, patientId, doctorId, diagnosis, notes } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("AppointmentID", sql.Int, appointmentId)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("Diagnosis", sql.NVarChar(sql.MAX), diagnosis || null)
    .input("Notes", sql.NVarChar(sql.MAX), notes || null)
    .query(`
      INSERT INTO Prescriptions (AppointmentID, PatientID, DoctorID, Diagnosis, Notes)
      OUTPUT INSERTED.*
      VALUES (@AppointmentID, @PatientID, @DoctorID, @Diagnosis, @Notes)
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
      WHERE PrescriptionID = @PrescriptionID AND AppointmentID IS NOT NULL
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription not found" });
  res.json(result.recordset[0]);
});

const deletePrescription = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("PrescriptionID", sql.Int, req.params.id)
    .query("DELETE FROM Prescriptions OUTPUT DELETED.PrescriptionID WHERE PrescriptionID = @PrescriptionID AND AppointmentID IS NOT NULL");
  if (!result.recordset[0]) return res.status(404).json({ message: "Prescription not found" });
  res.json({ message: "Prescription deleted" });
});

const listPrescriptionMedications = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT pm.*, m.MedicationName, pr.AppointmentID, pr.AdmissionID
    FROM PrescriptionMedications pm
    INNER JOIN Prescriptions pr ON pr.PrescriptionID = pm.PrescriptionID
    INNER JOIN Medications m ON m.MedicationID = pm.MedicationID
    WHERE pr.AppointmentID IS NOT NULL
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
