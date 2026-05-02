const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listPatients = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT p.PatientID, p.MRNumber, u.FullName, u.Email, u.Phone,
           p.DateOfBirth, p.Gender, p.BloodGroup, p.EmergencyContact
    FROM Patients p
    INNER JOIN Users u ON u.UserID = p.UserID
    ORDER BY p.PatientID DESC
  `);
  res.json(result.recordset);
});

const getPatient = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PatientID", sql.Int, req.params.id)
    .query(`
      SELECT p.*, u.FullName, u.Email, u.Phone, u.Address
      FROM Patients p
      INNER JOIN Users u ON u.UserID = p.UserID
      WHERE p.PatientID = @PatientID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Patient not found" });
  }

  res.json(result.recordset[0]);
});

const createPatient = asyncHandler(async (req, res) => {
  const {
    userId,
    mrNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    emergencyContact,
    allergies,
    chronicConditions
  } = req.body;

  if (!userId || !mrNumber || !dateOfBirth || !gender) {
    return res.status(400).json({ message: "User, MR number, date of birth, and gender are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("UserID", sql.Int, userId)
    .input("MRNumber", sql.NVarChar(50), mrNumber)
    .input("DateOfBirth", sql.Date, dateOfBirth)
    .input("Gender", sql.NVarChar(20), gender)
    .input("BloodGroup", sql.NVarChar(10), bloodGroup || null)
    .input("EmergencyContact", sql.NVarChar(50), emergencyContact || null)
    .input("Allergies", sql.NVarChar(sql.MAX), allergies || null)
    .input("ChronicConditions", sql.NVarChar(sql.MAX), chronicConditions || null)
    .query(`
      INSERT INTO Patients
        (UserID, MRNumber, DateOfBirth, Gender, BloodGroup, EmergencyContact, Allergies, ChronicConditions)
      OUTPUT INSERTED.*
      VALUES
        (@UserID, @MRNumber, @DateOfBirth, @Gender, @BloodGroup, @EmergencyContact, @Allergies, @ChronicConditions)
    `);

  res.status(201).json(result.recordset[0]);
});

const updatePatient = asyncHandler(async (req, res) => {
  const {
    mrNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    emergencyContact,
    allergies,
    chronicConditions
  } = req.body;

  if (!mrNumber || !dateOfBirth || !gender) {
    return res.status(400).json({ message: "MR number, date of birth, and gender are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PatientID", sql.Int, req.params.id)
    .input("MRNumber", sql.NVarChar(50), mrNumber)
    .input("DateOfBirth", sql.Date, dateOfBirth)
    .input("Gender", sql.NVarChar(20), gender)
    .input("BloodGroup", sql.NVarChar(10), bloodGroup || null)
    .input("EmergencyContact", sql.NVarChar(50), emergencyContact || null)
    .input("Allergies", sql.NVarChar(sql.MAX), allergies || null)
    .input("ChronicConditions", sql.NVarChar(sql.MAX), chronicConditions || null)
    .query(`
      UPDATE Patients
      SET MRNumber = @MRNumber,
          DateOfBirth = @DateOfBirth,
          Gender = @Gender,
          BloodGroup = @BloodGroup,
          EmergencyContact = @EmergencyContact,
          Allergies = @Allergies,
          ChronicConditions = @ChronicConditions
      OUTPUT INSERTED.*
      WHERE PatientID = @PatientID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Patient not found" });
  }

  res.json(result.recordset[0]);
});

const deletePatient = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("PatientID", sql.Int, req.params.id)
    .query(`
      DELETE FROM Patients
      OUTPUT DELETED.*
      WHERE PatientID = @PatientID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Patient not found" });
  }

  res.json(result.recordset[0]);
});

module.exports = { listPatients, getPatient, createPatient, updatePatient, deletePatient };
