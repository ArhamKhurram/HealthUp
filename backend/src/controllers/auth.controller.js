const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^03\d{9}$/;  // Pakistani mobile format: 03XXXXXXXXX (11 digits)

function shapeAuthUser(user) {
  return {
    userId: user.UserID,
    fullName: user.FullName,
    email: user.Email,
    role: user.Role,
    phone: user.Phone,
    address: user.Address,
    patientId: user.PatientID || null,
    doctorId: user.DoctorID || null,
    nurseId: user.NurseID || null
  };
}

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function validatePatientRegistration(payload) {
  const errors = [];
  const fullName = normalizeOptional(payload.fullName);
  const email = normalizeOptional(payload.email)?.toLowerCase() || null;
  const password = typeof payload.password === "string" ? payload.password : "";
  const passwordConfirm = typeof payload.passwordConfirm === "string" ? payload.passwordConfirm : "";
  const gender = normalizeOptional(payload.gender);
  const dateOfBirthRaw = normalizeOptional(payload.dateOfBirth);
  let dateOfBirth = null;
  const phone = normalizeOptional(payload.phone);
  const bloodGroup = normalizeOptional(payload.bloodGroup);

  if (!fullName) errors.push({ field: "fullName", message: "Full name is required" });
  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
  }

  if (!passwordConfirm) {
    errors.push({ field: "passwordConfirm", message: "Please confirm your password" });
  } else if (password && password !== passwordConfirm) {
    errors.push({ field: "passwordConfirm", message: "Passwords do not match" });
  }

  if (phone && !PHONE_REGEX.test(phone)) {
    errors.push({ field: "phone", message: "Phone must be 11 digits starting with 0 (e.g., 03001234567)" });
  }

  if (gender && !['M', 'F', 'Other'].includes(gender)) {
    errors.push({ field: "gender", message: "Gender must be M, F, or Other" });
  }

  const validBloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  if (bloodGroup && !validBloodGroups.includes(bloodGroup)) {
    errors.push({ field: "bloodGroup", message: "Invalid blood group" });
  }

  if (!dateOfBirthRaw) {
    errors.push({ field: "dateOfBirth", message: "Date of birth is required" });
  } else {
    const parsed = new Date(dateOfBirthRaw);
    const isDateValid = !Number.isNaN(parsed.getTime());
    const now = new Date();
    if (!isDateValid) {
      errors.push({ field: "dateOfBirth", message: "Date of birth must be a valid date" });
    } else if (parsed > now) {
      errors.push({ field: "dateOfBirth", message: "Date of birth cannot be in the future" });
    } else {
      dateOfBirth = dateOfBirthRaw;
    }
  }

  if (!gender) errors.push({ field: "gender", message: "Gender is required" });

  return {
    errors,
    sanitized: {
      fullName,
      email,
      password,
      phone,
      address: normalizeOptional(payload.address),
      mrNumber: normalizeOptional(payload.mrNumber),
      dateOfBirth,
      gender,
      bloodGroup,
      emergencyContact: normalizeOptional(payload.emergencyContact),
      allergies: normalizeOptional(payload.allergies),
      chronicConditions: normalizeOptional(payload.chronicConditions)
    }
  };
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      code: "AUTH_VALIDATION_FAILED",
      message: "Email and password are required"
    });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("Email", sql.NVarChar(150), email)
    .query(`
      SELECT u.UserID, u.FullName, u.Email, u.Password, u.Role, u.Phone, u.Address, u.IsActive,
             p.PatientID, d.DoctorID, n.NurseID
      FROM Users u
      LEFT JOIN Patients p ON p.UserID = u.UserID
      LEFT JOIN Doctors d ON d.UserID = u.UserID
      LEFT JOIN Nurses n ON n.UserID = u.UserID
      WHERE u.Email = @Email
    `);

  const user = result.recordset[0];

  if (!user || !user.IsActive) {
    return res.status(401).json({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid credentials"
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.Password);

  if (!passwordMatches) {
    return res.status(401).json({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid credentials"
    });
  }

  const token = jwt.sign(
    { userId: user.UserID, role: user.Role, email: user.Email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  res.json({
    token,
    user: shapeAuthUser(user)
  });
});

const registerPatient = asyncHandler(async (req, res) => {
  const { errors, sanitized } = validatePatientRegistration(req.body || {});

  if (errors.length) {
    return res.status(400).json({
      code: "AUTH_VALIDATION_FAILED",
      message: "Patient registration validation failed",
      errors
    });
  }

   const hash = await bcrypt.hash(sanitized.password, 10);
   const pool = await getPool();
   const transaction = new sql.Transaction(pool);

   await transaction.begin();

   try {
     await new sql.Request(transaction)
        .input("FullName", sql.NVarChar(120), sanitized.fullName)
        .input("Email", sql.NVarChar(150), sanitized.email)
        .input("Password", sql.NVarChar(255), hash)
        .input("Phone", sql.NVarChar(30), sanitized.phone)
        .input("Address", sql.NVarChar(255), sanitized.address)
        .query(`
          INSERT INTO Users (FullName, Email, Password, Role, Phone, Address)
          VALUES (@FullName, @Email, @Password, 'Patient', @Phone, @Address)
        `);

      const userResult = await new sql.Request(transaction)
        .query("SELECT SCOPE_IDENTITY() AS UserID");
      const userId = userResult.recordset[0].UserID;

      // Fetch the complete user record
      const userFull = await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .query(`
          SELECT u.UserID, u.FullName, u.Email, u.Role, u.Phone, u.Address
          FROM Users u
          WHERE u.UserID = @UserID
        `);
      const user = userFull.recordset[0];

      const generatedMrNumber = sanitized.mrNumber || `MR-${String(userId).padStart(4, "0")}`;

      const patientResult = await new sql.Request(transaction)
        .input("UserID", sql.Int, user.UserID)
        .input("MRNumber", sql.NVarChar(50), generatedMrNumber)
        .input("DateOfBirth", sql.Date, sanitized.dateOfBirth)
        .input("Gender", sql.NVarChar(20), sanitized.gender)
        .input("BloodGroup", sql.NVarChar(10), sanitized.bloodGroup)
        .input("EmergencyContact", sql.NVarChar(50), sanitized.emergencyContact)
        .input("Allergies", sql.NVarChar(sql.MAX), sanitized.allergies)
        .input("ChronicConditions", sql.NVarChar(sql.MAX), sanitized.chronicConditions)
        .query(`
          INSERT INTO Patients
            (UserID, MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions)
          OUTPUT INSERTED.PatientID, INSERTED.MRNumber
          VALUES
            (@UserID, @MRNumber, @DateOfBirth, @Gender, @BloodGroup, @EmergencyContact, @Allergies, @ChronicConditions)
        `);

    const token = jwt.sign(
      { userId: user.UserID, role: user.Role, email: user.Email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    await transaction.commit();

    res.status(201).json({
      token,
      user: {
        userId: user.UserID,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role,
        patientId: patientResult.recordset[0].PatientID,
        mrNumber: patientResult.recordset[0].MRNumber
      }
    });
  } catch (error) {
    await transaction.rollback();
    if (error?.number === 2627 || error?.number === 2601) {
      const duplicateTarget = /MRNumber/i.test(error.originalError?.info?.message || error.message) ? "mrNumber" : "email";
      return res.status(409).json({
        code: "AUTH_CONFLICT",
        message: duplicateTarget === "mrNumber" ? "MR number already exists" : "Email is already registered",
        errors: [{ field: duplicateTarget, message: duplicateTarget === "mrNumber" ? "MR number must be unique" : "Email must be unique" }]
      });
    }
    throw error;
  }
});

const me = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("UserID", sql.Int, req.user.userId)
    .query(`
      SELECT u.UserID, u.FullName, u.Email, u.Role, u.Phone, u.Address, u.CreatedAt, u.IsActive,
             p.PatientID, d.DoctorID, n.NurseID
      FROM Users u
      LEFT JOIN Patients p ON p.UserID = u.UserID
      LEFT JOIN Doctors d ON d.UserID = u.UserID
      LEFT JOIN Nurses n ON n.UserID = u.UserID
      WHERE u.UserID = @UserID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({
      code: "AUTH_USER_NOT_FOUND",
      message: "Authenticated user record not found"
    });
  }

  res.json(shapeAuthUser(result.recordset[0]));
});

module.exports = { login, registerPatient, me };
