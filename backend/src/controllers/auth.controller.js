const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

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

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
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
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const passwordMatches = await bcrypt.compare(password, user.Password);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials" });
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
  const {
    fullName,
    email,
    password,
    phone,
    address,
    mrNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    emergencyContact,
    allergies,
    chronicConditions
  } = req.body;

  if (!fullName || !email || !password || !dateOfBirth || !gender) {
    return res.status(400).json({
      message: "Full name, email, password, date of birth, and gender are required"
    });
  }

  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const userResult = await new sql.Request(transaction)
      .input("FullName", sql.NVarChar(120), fullName)
      .input("Email", sql.NVarChar(150), email)
      .input("Password", sql.NVarChar(255), hash)
      .input("Phone", sql.NVarChar(30), phone || null)
      .input("Address", sql.NVarChar(255), address || null)
      .query(`
        INSERT INTO Users (FullName, Email, Password, Role, Phone, Address)
        OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role
        VALUES (@FullName, @Email, @Password, 'Patient', @Phone, @Address)
      `);

    const user = userResult.recordset[0];
    const generatedMrNumber = mrNumber || `MR-${String(user.UserID).padStart(4, "0")}`;

    const patientResult = await new sql.Request(transaction)
      .input("UserID", sql.Int, user.UserID)
      .input("MRNumber", sql.NVarChar(50), generatedMrNumber)
      .input("DateOfBirth", sql.Date, dateOfBirth)
      .input("Gender", sql.NVarChar(20), gender)
      .input("BloodGroup", sql.NVarChar(10), bloodGroup || null)
      .input("EmergencyContact", sql.NVarChar(50), emergencyContact || null)
      .input("Allergies", sql.NVarChar(sql.MAX), allergies || null)
      .input("ChronicConditions", sql.NVarChar(sql.MAX), chronicConditions || null)
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

  res.json(shapeAuthUser(result.recordset[0]));
});

module.exports = { login, registerPatient, me };
