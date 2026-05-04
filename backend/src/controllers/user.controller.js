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

function validationErrorResponse(res, errors, message = "Validation failed") {
  return res.status(400).json({
    code: "USER_VALIDATION_FAILED",
    message,
    errors
  });
}

function roleValidation(role, profile, isUpdate = false, allowAdmin = false) {
  const errors = [];
  const normalizedRole = normalizeOptional(role);
  const allowedRoles = allowAdmin ? VALID_ROLES : CREATABLE_ROLES;
  if (!allowedRoles.includes(normalizedRole)) {
    errors.push({
      field: "role",
      message: allowAdmin
        ? "Role must be one of Admin, Receptionist, Doctor, Nurse, or Patient"
        : "Role must be one of Receptionist, Doctor, Nurse, or Patient"
    });
  }

  if (normalizedRole === "Patient") {
    if (!normalizeOptional(profile?.dateOfBirth) && !isUpdate) errors.push({ field: "profile.dateOfBirth", message: "Patient dateOfBirth is required" });
    if (!normalizeOptional(profile?.gender) && !isUpdate) errors.push({ field: "profile.gender", message: "Patient gender is required" });
    if (normalizeOptional(profile?.gender) && !VALID_GENDERS.includes(profile.gender)) {
      errors.push({ field: "profile.gender", message: "Patient gender must be M, F, or Other" });
    }
    if (normalizeOptional(profile?.bloodGroup) && !VALID_BLOOD_GROUPS.includes(profile.bloodGroup)) {
      errors.push({ field: "profile.bloodGroup", message: "Patient bloodGroup is invalid" });
    }
  }

  if (normalizedRole === "Doctor") {
    if (!normalizeOptional(profile?.specialization)) errors.push({ field: "profile.specialization", message: "Doctor specialization is required" });
    if (normalizeOptional(profile?.specialization) && !DOCTOR_SPECIALIZATIONS.includes(profile.specialization)) errors.push({ field: "profile.specialization", message: "Doctor specialization is invalid" });
    if (normalizeOptional(profile?.qualification) && !DOCTOR_QUALIFICATIONS.includes(profile.qualification)) errors.push({ field: "profile.qualification", message: "Doctor qualification is invalid" });
    if (normalizeOptional(profile?.designation) && !DOCTOR_DESIGNATIONS.includes(profile.designation)) errors.push({ field: "profile.designation", message: "Doctor designation is invalid" });
    const dayCount = Array.isArray(profile?.scheduleDays) ? profile.scheduleDays.length : 0;
    if (!dayCount) errors.push({ field: "profile.scheduleDays", message: "Doctor scheduleDays is required" });
    if (!normalizeOptional(profile?.startTime)) errors.push({ field: "profile.startTime", message: "Doctor startTime is required" });
    if (!normalizeOptional(profile?.endTime)) errors.push({ field: "profile.endTime", message: "Doctor endTime is required" });
  }

  if (normalizedRole === "Nurse") {
    if (!profile?.departmentId && !isUpdate) errors.push({ field: "profile.departmentId", message: "Nurse departmentId is required" });
  }

  return errors;
}

async function upsertRoleProfile(transaction, userId, role, profile, actorUserId) {
  if (role === "Patient") {
    const dateOfBirth = normalizeOptional(profile?.dateOfBirth);
    const gender = normalizeOptional(profile?.gender);
    const bloodGroup = normalizeOptional(profile?.bloodGroup);
    const emergencyContact = normalizeOptional(profile?.emergencyContact);
    const allergies = normalizeOptional(profile?.allergies);
    const chronicConditions = normalizeOptional(profile?.chronicConditions);
    const mrNumber = normalizeOptional(profile?.mrNumber);

    const existing = await new sql.Request(transaction)
      .input("UserID", sql.Int, userId)
      .query("SELECT PatientID FROM Patients WHERE UserID = @UserID");

    if (!existing.recordset[0]) {
      await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .input("MRNumber", sql.NVarChar(50), mrNumber || buildMrNumber(userId))
        .input("DateOfBirth", sql.Date, dateOfBirth)
        .input("Gender", sql.NVarChar(20), gender)
        .input("BloodGroup", sql.NVarChar(10), bloodGroup)
        .input("EmergencyContact", sql.NVarChar(50), emergencyContact)
        .input("Allergies", sql.NVarChar(sql.MAX), allergies)
        .input("ChronicConditions", sql.NVarChar(sql.MAX), chronicConditions)
        .query(`
          INSERT INTO Patients (UserID, MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions)
          VALUES (@UserID, @MRNumber, @DateOfBirth, @Gender, @BloodGroup, @EmergencyContact, @Allergies, @ChronicConditions)
        `);
    } else {
      await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .input("DateOfBirth", sql.Date, dateOfBirth)
        .input("Gender", sql.NVarChar(20), gender)
        .input("BloodGroup", sql.NVarChar(10), bloodGroup)
        .input("EmergencyContact", sql.NVarChar(50), emergencyContact)
        .input("Allergies", sql.NVarChar(sql.MAX), allergies)
        .input("ChronicConditions", sql.NVarChar(sql.MAX), chronicConditions)
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
    return;
  }

  if (role === "Doctor") {
    const specialization = normalizeOptional(profile?.specialization);
    const qualification = normalizeOptional(profile?.qualification);
    const designation = normalizeOptional(profile?.designation);
    const licenseNumber = normalizeOptional(profile?.licenseNumber) || `LIC-${userId}`;
    const experienceYears = 0;
    const consultationFee = Number(profile?.consultationFee || 0);
    const availableForOPD = true;
    const availableForIPD = true;
    const scheduleDays = Array.isArray(profile?.scheduleDays) ? profile.scheduleDays.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6) : [1, 2, 3, 4, 5];
    const startTime = normalizeOptional(profile?.startTime) || "09:00";
    const endTime = normalizeOptional(profile?.endTime) || "17:00";

    const existing = await new sql.Request(transaction)
      .input("UserID", sql.Int, userId)
      .query("SELECT DoctorID FROM Doctors WHERE UserID = @UserID");

    let doctorId = existing.recordset[0]?.DoctorID;
    if (!doctorId) {
      const inserted = await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .input("Specialization", sql.NVarChar(100), specialization)
        .input("Qualification", sql.NVarChar(150), qualification)
        .input("Designation", sql.NVarChar(100), designation)
        .input("LicenseNumber", sql.NVarChar(80), licenseNumber)
        .input("ExperienceYears", sql.Int, experienceYears)
        .input("ConsultationFee", sql.Decimal(10, 2), consultationFee)
        .input("AvailableForOPD", sql.Bit, availableForOPD)
        .input("AvailableForIPD", sql.Bit, availableForIPD)
        .query(`
          INSERT INTO Doctors (UserID, Specialization, Qualification, Designation, LicenseNumber, ExperienceYears, ConsultationFee, AvailableForOPD, AvailableForIPD)
          OUTPUT INSERTED.DoctorID
          VALUES (@UserID, @Specialization, @Qualification, @Designation, @LicenseNumber, @ExperienceYears, @ConsultationFee, @AvailableForOPD, @AvailableForIPD)
        `);
      doctorId = inserted.recordset[0].DoctorID;
    } else {
      await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .input("Specialization", sql.NVarChar(100), specialization)
        .input("Qualification", sql.NVarChar(150), qualification)
        .input("Designation", sql.NVarChar(100), designation)
        .input("LicenseNumber", sql.NVarChar(80), licenseNumber)
        .input("ExperienceYears", sql.Int, experienceYears)
        .input("ConsultationFee", sql.Decimal(10, 2), consultationFee)
        .input("AvailableForOPD", sql.Bit, availableForOPD)
        .input("AvailableForIPD", sql.Bit, availableForIPD)
        .query(`
          UPDATE Doctors
          SET Specialization = @Specialization,
              Qualification = @Qualification,
              Designation = @Designation,
              LicenseNumber = @LicenseNumber,
              ExperienceYears = @ExperienceYears,
              ConsultationFee = @ConsultationFee,
              AvailableForOPD = @AvailableForOPD,
              AvailableForIPD = @AvailableForIPD
          WHERE UserID = @UserID
        `);
    }

    await new sql.Request(transaction)
      .input("DoctorID", sql.Int, doctorId)
      .query("DELETE FROM DoctorSchedules WHERE DoctorID = @DoctorID");

    for (const day of scheduleDays) {
      await new sql.Request(transaction)
        .input("DoctorID", sql.Int, doctorId)
        .input("DayOfWeek", sql.Int, day)
        .input("StartTime", sql.Time, `${startTime}:00`)
        .input("EndTime", sql.Time, `${endTime}:00`)
        .input("UpdatedBy", sql.Int, actorUserId || null)
        .query(`
          INSERT INTO DoctorSchedules (DoctorID, DayOfWeek, StartTime, EndTime, SlotDurationMinutes, IsActive, UpdatedBy)
          VALUES (@DoctorID, @DayOfWeek, @StartTime, @EndTime, 30, 1, @UpdatedBy)
        `);
    }
    return;
  }

  if (role === "Nurse") {
    const departmentId = profile?.departmentId ? Number(profile.departmentId) : null;
    const shiftTime = `${normalizeOptional(profile?.shiftStartTime) || "09:00"}-${normalizeOptional(profile?.shiftEndTime) || "17:00"}`;

    const existing = await new sql.Request(transaction)
      .input("UserID", sql.Int, userId)
      .query("SELECT NurseID, DepartmentID FROM Nurses WHERE UserID = @UserID");

    if (!existing.recordset[0]) {
      await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .input("DepartmentID", sql.Int, departmentId)
        .input("ShiftTime", sql.NVarChar(50), shiftTime)
        .input("NurseType", sql.NVarChar(50), null)
        .input("Certification", sql.NVarChar(150), null)
        .query(`
          INSERT INTO Nurses (UserID, DepartmentID, ShiftTime, NurseType, Certification)
          VALUES (@UserID, @DepartmentID, @ShiftTime, @NurseType, @Certification)
        `);
    } else {
      await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .input("DepartmentID", sql.Int, departmentId || existing.recordset[0].DepartmentID)
        .input("ShiftTime", sql.NVarChar(50), shiftTime)
        .input("NurseType", sql.NVarChar(50), null)
        .input("Certification", sql.NVarChar(150), null)
        .query(`
          UPDATE Nurses
          SET DepartmentID = @DepartmentID,
              ShiftTime = @ShiftTime,
              NurseType = @NurseType,
              Certification = @Certification
          WHERE UserID = @UserID
        `);
    }
  }
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
  const baseResult = await pool
    .request()
    .input("UserID", sql.Int, req.params.id)
    .query(`
      ${userSelect}
      WHERE u.UserID = @UserID
    `);

  if (!baseResult.recordset[0]) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = baseResult.recordset[0];
  const profile = {};
  if (user.Role === "Patient") {
    const patientResult = await pool.request().input("UserID", sql.Int, user.UserID).query(`
      SELECT MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions
      FROM Patients
      WHERE UserID = @UserID
    `);
    Object.assign(profile, patientResult.recordset[0] || {});
  } else if (user.Role === "Doctor") {
    const doctorResult = await pool.request().input("UserID", sql.Int, user.UserID).query(`
      SELECT Specialization, Qualification, Designation, LicenseNumber, ExperienceYears, ConsultationFee, AvailableForOPD, AvailableForIPD
      FROM Doctors
      WHERE UserID = @UserID
    `);
    Object.assign(profile, doctorResult.recordset[0] || {});
    if (user.DoctorID) {
      const scheduleResult = await pool.request().input("DoctorID", sql.Int, user.DoctorID).query(`
        SELECT DayOfWeek, StartTime, EndTime
        FROM DoctorSchedules
        WHERE DoctorID = @DoctorID AND IsActive = 1
        ORDER BY DayOfWeek
      `);
      const rows = scheduleResult.recordset || [];
      profile.ScheduleDays = rows.map((row) => row.DayOfWeek);
      profile.StartTime = rows[0]?.StartTime ? String(rows[0].StartTime).slice(0, 5) : "";
      profile.EndTime = rows[0]?.EndTime ? String(rows[0].EndTime).slice(0, 5) : "";
    }
  } else if (user.Role === "Nurse") {
    const nurseResult = await pool.request().input("UserID", sql.Int, user.UserID).query(`
      SELECT DepartmentID, ShiftTime, NurseType, Certification
      FROM Nurses
      WHERE UserID = @UserID
    `);
    Object.assign(profile, nurseResult.recordset[0] || {});
    if (profile.ShiftTime && String(profile.ShiftTime).includes("-")) {
      const [start, end] = String(profile.ShiftTime).split("-");
      profile.ShiftStartTime = start;
      profile.ShiftEndTime = end;
    }
  }

  res.json({ ...user, profile });
});

const createUser = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    confirmPassword,
    passwordConfirm,
    role,
    phone,
    address,
    profile
  } = req.body;

  const errors = [];
  if (!fullName) errors.push({ field: "fullName", message: "Full name is required" });
  if (!email) errors.push({ field: "email", message: "Email is required" });
  if (!role) errors.push({ field: "role", message: "Role is required" });
  errors.push(...validateCreatePassword(password, confirmPassword || passwordConfirm));
  if (role === "Admin") {
    errors.push({ field: "role", message: "Admin users cannot be created from this flow" });
  }

  const normalizedPhone = normalizePhone(phone);
  if (phone && !isValidPakistanPhone(normalizedPhone)) {
    errors.push({ field: "phone", message: "Phone must be 11 digits starting with 0 (e.g., 03001234567)" });
  }

  const profileErrors = roleValidation(role, profile || {}, false, false);
  if (profileErrors.length) errors.push(...profileErrors);
  if (errors.length) {
    return validationErrorResponse(res, errors, "User creation validation failed");
  }

  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const result = await new sql.Request(transaction)
      .input("FullName", sql.NVarChar(120), fullName)
      .input("Email", sql.NVarChar(150), String(email).toLowerCase())
      .input("Password", sql.NVarChar(255), hash)
      .input("Role", sql.NVarChar(30), role)
      .input("Phone", sql.NVarChar(30), normalizedPhone)
      .input("Address", sql.NVarChar(255), address || null)
      .query(`
        INSERT INTO Users (FullName, Email, Password, Role, Phone, Address)
        OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.Phone, INSERTED.Address, INSERTED.CreatedAt, INSERTED.IsActive
        VALUES (@FullName, @Email, @Password, @Role, @Phone, @Address)
      `);

    const user = result.recordset[0];
    await upsertRoleProfile(transaction, user.UserID, role, profile || {}, req.user?.userId);
    await transaction.commit();
    res.status(201).json(user);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone, address, isActive, profile } = req.body;

  const errors = [];
  if (!fullName) errors.push({ field: "fullName", message: "Full name is required" });
  if (!email) errors.push({ field: "email", message: "Email is required" });
  if (!role) errors.push({ field: "role", message: "Role is required" });

  const normalizedPhone = normalizePhone(phone);
  if (phone && !isValidPakistanPhone(normalizedPhone)) {
    errors.push({ field: "phone", message: "Phone must be 11 digits starting with 0 (e.g., 03001234567)" });
  }

  const profileErrors = roleValidation(role, profile || {}, true, true);
  if (profileErrors.length) errors.push(...profileErrors);
  if (errors.length) {
    return validationErrorResponse(res, errors, "User update validation failed");
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  const request = new sql.Request(transaction)
    .input("UserID", sql.Int, req.params.id)
    .input("FullName", sql.NVarChar(120), fullName)
    .input("Email", sql.NVarChar(150), String(email).toLowerCase())
    .input("Role", sql.NVarChar(30), role)
    .input("Phone", sql.NVarChar(30), normalizedPhone)
    .input("Address", sql.NVarChar(255), address || null)
    .input("IsActive", sql.Bit, isActive === undefined ? true : Boolean(isActive));

  const passwordSql = password ? ", Password = @Password" : "";
  if (password) {
    request.input("Password", sql.NVarChar(255), await bcrypt.hash(password, 10));
  }

  try {
    const result = await request.query(`
      UPDATE Users
      SET FullName = @FullName,
          Email = @Email,
          Role = @Role,
          Phone = @Phone,
          Address = @Address,
          IsActive = @IsActive
          ${passwordSql}
      OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role,
             INSERTED.Phone, INSERTED.Address, INSERTED.CreatedAt, INSERTED.IsActive
      WHERE UserID = @UserID
    `);

    if (!result.recordset[0]) {
      await transaction.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    await upsertRoleProfile(transaction, Number(req.params.id), role, profile || {}, req.user?.userId);
    await transaction.commit();
    res.json(result.recordset[0]);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("UserID", sql.Int, req.params.id)
    .query(`
      UPDATE Users
      SET IsActive = 0
      OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role,
             INSERTED.Phone, INSERTED.Address, INSERTED.CreatedAt, INSERTED.IsActive
      WHERE UserID = @UserID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(result.recordset[0]);
});

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
