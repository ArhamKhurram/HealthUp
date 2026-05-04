// Admin user lifecycle controller.
// Keeps Users as the account table and stores role-specific fields only in Patients, Doctors, or Nurses.
const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { normalizePhone, isValidPakistanPhone, validateCreatePassword } = require("../utils/userValidation");

const CREATABLE_ROLES = ["Receptionist", "Doctor", "Nurse", "Patient"];
const VALID_ROLES = ["Admin", "Receptionist", "Doctor", "Nurse", "Patient"];
const VALID_GENDERS = ["M", "F", "Other"];
const VALID_BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const DOCTOR_SPECIALIZATIONS = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General Medicine", "Dermatology", "ENT"];
const DOCTOR_QUALIFICATIONS = ["MBBS", "BDS", "FCPS", "MS", "MD"];
const DOCTOR_DESIGNATIONS = ["Consultant", "Specialist", "Resident", "Senior Registrar"];

const userSelect = `
  SELECT u.UserID, u.FullName, u.Email, u.Role, u.Phone, u.Address, u.CreatedAt, u.IsActive,
         p.PatientID, d.DoctorID, n.NurseID
  FROM Users u
  LEFT JOIN Patients p ON p.UserID = u.UserID
  LEFT JOIN Doctors d ON d.UserID = u.UserID
  LEFT JOIN Nurses n ON n.UserID = u.UserID
`;

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function buildMrNumber(userId) {
  return `MR-${String(userId).padStart(4, "0")}`;
}

function formatDbTime(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  return String(value).slice(0, 5);
}

function normalizeWorkDays(scheduleDays, fallback = "1,2,3,4,5") {
  const days = Array.isArray(scheduleDays)
    ? scheduleDays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6)
    : String(scheduleDays || fallback)
        .split(",")
        .map((day) => Number(day.trim()))
        .filter((day) => day >= 0 && day <= 6);
  return [...new Set(days)].sort((a, b) => a - b).join(",");
}

function validationErrorResponse(res, errors, message = "Validation failed") {
  return res.status(400).json({ code: "USER_VALIDATION_FAILED", message, errors });
}

function roleValidation(role, profile, isUpdate = false, allowAdmin = false) {
  const errors = [];
  const normalizedRole = normalizeOptional(role);
  const allowedRoles = allowAdmin ? VALID_ROLES : CREATABLE_ROLES;

  if (!allowedRoles.includes(normalizedRole)) {
    errors.push({
      field: "role",
      message: !allowAdmin && normalizedRole === "Admin"
        ? "Admin users cannot be created from this flow"
        : allowAdmin
        ? "Role must be one of Admin, Receptionist, Doctor, Nurse, or Patient"
        : "Role must be one of Receptionist, Doctor, Nurse, or Patient"
    });
  }

  if (normalizedRole === "Patient") {
    if (!normalizeOptional(profile?.dateOfBirth) && !isUpdate) errors.push({ field: "profile.dateOfBirth", message: "Patient dateOfBirth is required" });
    if (!normalizeOptional(profile?.gender) && !isUpdate) errors.push({ field: "profile.gender", message: "Patient gender is required" });
    if (normalizeOptional(profile?.gender) && !VALID_GENDERS.includes(profile.gender)) errors.push({ field: "profile.gender", message: "Patient gender must be M, F, or Other" });
    if (normalizeOptional(profile?.bloodGroup) && !VALID_BLOOD_GROUPS.includes(profile.bloodGroup)) errors.push({ field: "profile.bloodGroup", message: "Patient bloodGroup is invalid" });
  }

  if (normalizedRole === "Doctor") {
    if (!normalizeOptional(profile?.specialization)) errors.push({ field: "profile.specialization", message: "Doctor specialization is required" });
    if (normalizeOptional(profile?.specialization) && !DOCTOR_SPECIALIZATIONS.includes(profile.specialization)) errors.push({ field: "profile.specialization", message: "Doctor specialization is invalid" });
    if (normalizeOptional(profile?.qualification) && !DOCTOR_QUALIFICATIONS.includes(profile.qualification)) errors.push({ field: "profile.qualification", message: "Doctor qualification is invalid" });
    if (normalizeOptional(profile?.designation) && !DOCTOR_DESIGNATIONS.includes(profile.designation)) errors.push({ field: "profile.designation", message: "Doctor designation is invalid" });
    if (!Array.isArray(profile?.scheduleDays) || profile.scheduleDays.length === 0) errors.push({ field: "profile.scheduleDays", message: "Doctor scheduleDays is required" });
    if (!normalizeOptional(profile?.startTime)) errors.push({ field: "profile.startTime", message: "Doctor startTime is required" });
    if (!normalizeOptional(profile?.endTime)) errors.push({ field: "profile.endTime", message: "Doctor endTime is required" });
  }

  if (normalizedRole === "Nurse" && !profile?.departmentId && !isUpdate) {
    errors.push({ field: "profile.departmentId", message: "Nurse departmentId is required" });
  }

  return errors;
}

async function upsertPatientProfile(transaction, userId, profile) {
  const existing = await new sql.Request(transaction)
    .input("UserID", sql.Int, userId)
    .query("SELECT PatientID FROM Patients WHERE UserID = @UserID");

  if (!existing.recordset[0]) {
    await new sql.Request(transaction)
      .input("UserID", sql.Int, userId)
      .input("MRNumber", sql.NVarChar(50), normalizeOptional(profile?.mrNumber) || buildMrNumber(userId))
      .input("DateOfBirth", sql.Date, normalizeOptional(profile?.dateOfBirth))
      .input("Gender", sql.NVarChar(20), normalizeOptional(profile?.gender))
      .input("BloodGroup", sql.NVarChar(10), normalizeOptional(profile?.bloodGroup))
      .input("EmergencyContact", sql.NVarChar(50), normalizeOptional(profile?.emergencyContact))
      .input("Allergies", sql.NVarChar(sql.MAX), normalizeOptional(profile?.allergies))
      .input("ChronicConditions", sql.NVarChar(sql.MAX), normalizeOptional(profile?.chronicConditions))
      .query(`
        INSERT INTO Patients (UserID, MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions)
        VALUES (@UserID, @MRNumber, @DateOfBirth, @Gender, @BloodGroup, @EmergencyContact, @Allergies, @ChronicConditions)
      `);
    return;
  }

  await new sql.Request(transaction)
    .input("UserID", sql.Int, userId)
    .input("DateOfBirth", sql.Date, normalizeOptional(profile?.dateOfBirth))
    .input("Gender", sql.NVarChar(20), normalizeOptional(profile?.gender))
    .input("BloodGroup", sql.NVarChar(10), normalizeOptional(profile?.bloodGroup))
    .input("EmergencyContact", sql.NVarChar(50), normalizeOptional(profile?.emergencyContact))
    .input("Allergies", sql.NVarChar(sql.MAX), normalizeOptional(profile?.allergies))
    .input("ChronicConditions", sql.NVarChar(sql.MAX), normalizeOptional(profile?.chronicConditions))
    .query(`
      UPDATE Patients
      SET DateOfBirth = COALESCE(@DateOfBirth, DateOfBirth),
          Gender = COALESCE(@Gender, Gender),
          BloodGroup = @BloodGroup,
          EmergencyContact = @EmergencyContact,
          Allergies = @Allergies,
          ChronicConditions = @ChronicConditions
      WHERE UserID = @UserID
    `);
}

async function upsertDoctorProfile(transaction, userId, profile) {
  const existing = await new sql.Request(transaction)
    .input("UserID", sql.Int, userId)
    .query("SELECT DoctorID FROM Doctors WHERE UserID = @UserID");

  const departmentId = profile?.departmentId ? Number(profile.departmentId) : null;
  const specialization = normalizeOptional(profile?.specialization);
  const qualification = normalizeOptional(profile?.qualification);
  const designation = normalizeOptional(profile?.designation);
  const consultationFee = Number(profile?.consultationFee || 0);
  const shiftStartTime = normalizeOptional(profile?.startTime) || "09:00";
  const shiftEndTime = normalizeOptional(profile?.endTime) || "17:00";
  const workDays = normalizeWorkDays(profile?.scheduleDays);

  const request = new sql.Request(transaction)
    .input("UserID", sql.Int, userId)
    .input("DepartmentID", sql.Int, departmentId)
    .input("Specialization", sql.NVarChar(100), specialization)
    .input("Qualification", sql.NVarChar(150), qualification)
    .input("Designation", sql.NVarChar(100), designation)
    .input("ConsultationFee", sql.Decimal(10, 2), consultationFee)
    .input("ShiftStartTime", sql.NVarChar(8), `${shiftStartTime}:00`)
    .input("ShiftEndTime", sql.NVarChar(8), `${shiftEndTime}:00`)
    .input("WorkDays", sql.NVarChar(50), workDays);

  if (!existing.recordset[0]) {
    await request.query(`
      INSERT INTO Doctors (UserID, DepartmentID, Specialization, Qualification, Designation, ConsultationFee, ShiftStartTime, ShiftEndTime, WorkDays)
      VALUES (@UserID, @DepartmentID, @Specialization, @Qualification, @Designation, @ConsultationFee, @ShiftStartTime, @ShiftEndTime, @WorkDays)
    `);
    return;
  }

  await request.query(`
    UPDATE Doctors
    SET DepartmentID = @DepartmentID,
        Specialization = @Specialization,
        Qualification = @Qualification,
        Designation = @Designation,
        ConsultationFee = @ConsultationFee,
        ShiftStartTime = @ShiftStartTime,
        ShiftEndTime = @ShiftEndTime,
        WorkDays = @WorkDays
    WHERE UserID = @UserID
  `);
}

async function upsertNurseProfile(transaction, userId, profile) {
  const existing = await new sql.Request(transaction)
    .input("UserID", sql.Int, userId)
    .query("SELECT NurseID, DepartmentID FROM Nurses WHERE UserID = @UserID");

  const departmentId = profile?.departmentId ? Number(profile.departmentId) : existing.recordset[0]?.DepartmentID || null;
  const shiftStartTime = normalizeOptional(profile?.shiftStartTime) || "09:00";
  const shiftEndTime = normalizeOptional(profile?.shiftEndTime) || "17:00";

  const request = new sql.Request(transaction)
    .input("UserID", sql.Int, userId)
    .input("DepartmentID", sql.Int, departmentId)
    .input("ShiftStartTime", sql.NVarChar(8), `${shiftStartTime}:00`)
    .input("ShiftEndTime", sql.NVarChar(8), `${shiftEndTime}:00`);

  if (!existing.recordset[0]) {
    await request.query(`
      INSERT INTO Nurses (UserID, DepartmentID, ShiftStartTime, ShiftEndTime)
      VALUES (@UserID, @DepartmentID, @ShiftStartTime, @ShiftEndTime)
    `);
    return;
  }

  await request.query(`
    UPDATE Nurses
    SET DepartmentID = @DepartmentID,
        ShiftStartTime = @ShiftStartTime,
        ShiftEndTime = @ShiftEndTime
    WHERE UserID = @UserID
  `);
}

async function upsertRoleProfile(transaction, userId, role, profile) {
  if (role === "Patient") return upsertPatientProfile(transaction, userId, profile);
  if (role === "Doctor") return upsertDoctorProfile(transaction, userId, profile);
  if (role === "Nurse") return upsertNurseProfile(transaction, userId, profile);
}

const listUsers = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    ${userSelect}
    ORDER BY u.UserID DESC
  `);
  res.json(result.recordset);
});

const getUser = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const user = await pool.request()
    .input("UserID", sql.Int, req.params.id)
    .query(`${userSelect} WHERE u.UserID = @UserID`);

  if (!user.recordset[0]) return res.status(404).json({ message: "User not found" });
  const row = user.recordset[0];

  if (row.Role === "Patient") {
    const profile = await pool.request()
      .input("UserID", sql.Int, row.UserID)
      .query("SELECT MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions FROM Patients WHERE UserID = @UserID");
    row.Profile = profile.recordset[0] || {};
  }

  if (row.Role === "Doctor") {
    const profile = await pool.request()
      .input("UserID", sql.Int, row.UserID)
      .query(`
        SELECT DepartmentID, Specialization, Qualification, Designation, ConsultationFee, ShiftStartTime, ShiftEndTime, WorkDays
        FROM Doctors
        WHERE UserID = @UserID
      `);
    const doctor = profile.recordset[0] || {};
    row.Profile = {
      ...doctor,
      StartTime: formatDbTime(doctor.ShiftStartTime),
      EndTime: formatDbTime(doctor.ShiftEndTime),
      ScheduleDays: String(doctor.WorkDays || "").split(",").filter(Boolean).map(Number)
    };
  }

  if (row.Role === "Nurse") {
    const profile = await pool.request()
      .input("UserID", sql.Int, row.UserID)
      .query("SELECT DepartmentID, ShiftStartTime, ShiftEndTime FROM Nurses WHERE UserID = @UserID");
    const nurse = profile.recordset[0] || {};
    row.Profile = {
      ...nurse,
      ShiftStartTime: formatDbTime(nurse.ShiftStartTime),
      ShiftEndTime: formatDbTime(nurse.ShiftEndTime)
    };
  }

  res.json(row);
});

const createUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPassword, role, phone, address, profile = {} } = req.body;
  const errors = [];
  const normalizedPhone = normalizePhone(phone);
  const normalizedRole = normalizeOptional(role);

  if (!normalizeOptional(fullName)) errors.push({ field: "fullName", message: "Full name is required" });
  if (!normalizeOptional(email)) errors.push({ field: "email", message: "Email is required" });
  if (!normalizedPhone || !isValidPakistanPhone(normalizedPhone)) errors.push({ field: "phone", message: "Phone must be 11 digits starting with 0 (e.g., 03001234567)" });
  errors.push(...validateCreatePassword(password, confirmPassword));
  errors.push(...roleValidation(normalizedRole, profile));
  if (errors.length) return validationErrorResponse(res, errors, "User creation validation failed");

  const pool = await getPool();
  const duplicate = await pool.request()
    .input("Email", sql.NVarChar(255), email)
    .query("SELECT UserID FROM Users WHERE Email = @Email");
  if (duplicate.recordset[0]) return res.status(409).json({ message: "Email already exists" });

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const hash = await bcrypt.hash(password, 10);
    const inserted = await new sql.Request(transaction)
      .input("FullName", sql.NVarChar(150), fullName)
      .input("Email", sql.NVarChar(255), email)
      .input("Password", sql.NVarChar(255), hash)
      .input("Role", sql.NVarChar(50), normalizedRole)
      .input("Phone", sql.NVarChar(20), normalizedPhone)
      .input("Address", sql.NVarChar(255), normalizeOptional(address))
      .query(`
        INSERT INTO Users (FullName, Email, Password, Role, Phone, Address, IsActive)
        OUTPUT INSERTED.UserID
        VALUES (@FullName, @Email, @Password, @Role, @Phone, @Address, 1)
      `);

    const userId = inserted.recordset[0].UserID;
    await upsertRoleProfile(transaction, userId, normalizedRole, profile);
    await transaction.commit();
    res.status(201).json({ message: "User created", userId });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { fullName, email, role, phone, address, isActive, newPassword, confirmNewPassword, profile = {} } = req.body;
  const errors = [];
  const normalizedRole = normalizeOptional(role);
  const normalizedPhone = normalizePhone(phone);

  if (!normalizeOptional(fullName)) errors.push({ field: "fullName", message: "Full name is required" });
  if (!normalizeOptional(email)) errors.push({ field: "email", message: "Email is required" });
  if (!normalizedPhone || !isValidPakistanPhone(normalizedPhone)) errors.push({ field: "phone", message: "Phone must be 11 digits starting with 0 (e.g., 03001234567)" });
  if (newPassword || confirmNewPassword) {
    const passwordErrors = validateCreatePassword(newPassword, confirmNewPassword).map((error) => ({
      field: error.field === "password" ? "newPassword" : "confirmNewPassword",
      message: error.message
    }));
    errors.push(...passwordErrors);
  }
  errors.push(...roleValidation(normalizedRole, profile, true, true));
  if (normalizedRole === "Admin") errors.push({ field: "role", message: "The original admin account cannot be edited into another flow here" });
  if (errors.length) return validationErrorResponse(res, errors);

  const pool = await getPool();
  const existing = await pool.request()
    .input("UserID", sql.Int, req.params.id)
    .query("SELECT UserID, Role FROM Users WHERE UserID = @UserID");
  if (!existing.recordset[0]) return res.status(404).json({ message: "User not found" });

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction)
      .input("UserID", sql.Int, req.params.id)
      .input("FullName", sql.NVarChar(150), fullName)
      .input("Email", sql.NVarChar(255), email)
      .input("Role", sql.NVarChar(50), normalizedRole)
      .input("Phone", sql.NVarChar(20), normalizedPhone)
      .input("Address", sql.NVarChar(255), normalizeOptional(address))
      .input("IsActive", sql.Bit, isActive === undefined ? true : Boolean(isActive));

    let passwordSql = "";
    if (newPassword) {
      request.input("Password", sql.NVarChar(255), await bcrypt.hash(newPassword, 10));
      passwordSql = ", Password = @Password";
    }

    await request.query(`
      UPDATE Users
      SET FullName = @FullName,
          Email = @Email,
          Role = @Role,
          Phone = @Phone,
          Address = @Address,
          IsActive = @IsActive
          ${passwordSql}
      WHERE UserID = @UserID
    `);

    await upsertRoleProfile(transaction, Number(req.params.id), normalizedRole, profile);
    await transaction.commit();
    res.json({ message: "User updated" });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("UserID", sql.Int, req.params.id)
    .query("UPDATE Users SET IsActive = 0 OUTPUT INSERTED.UserID WHERE UserID = @UserID AND Role <> 'Admin'");

  if (!result.recordset[0]) return res.status(404).json({ message: "User not found or cannot deactivate admin" });
  res.json({ message: "User deactivated" });
});

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
};
