const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listDoctors = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT d.DoctorID, u.FullName, u.Email, u.Phone, d.Specialization,
           d.Designation, d.ConsultationFee, d.AvailableForOPD, d.AvailableForIPD
    FROM Doctors d
    INNER JOIN Users u ON u.UserID = d.UserID
    WHERE u.IsActive = 1
    ORDER BY u.FullName
  `);
  res.json(result.recordset);
});

const getDoctor = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const doctor = await pool
    .request()
    .input("DoctorID", sql.Int, req.params.id)
    .query(`
      SELECT d.*, u.FullName, u.Email, u.Phone, u.Address
      FROM Doctors d
      INNER JOIN Users u ON u.UserID = d.UserID
      WHERE d.DoctorID = @DoctorID
    `);

  if (!doctor.recordset[0]) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  res.json(doctor.recordset[0]);
});

const createDoctor = asyncHandler(async (req, res) => {
  const {
    userId,
    specialization,
    qualification,
    designation,
    licenseNumber,
    experienceYears,
    consultationFee,
    availableForOPD,
    availableForIPD
  } = req.body;

  if (!userId || !specialization || !licenseNumber) {
    return res.status(400).json({ message: "User, specialization, and license number are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("UserID", sql.Int, userId)
    .input("Specialization", sql.NVarChar(100), specialization)
    .input("Qualification", sql.NVarChar(150), qualification || null)
    .input("Designation", sql.NVarChar(100), designation || null)
    .input("LicenseNumber", sql.NVarChar(80), licenseNumber)
    .input("ExperienceYears", sql.Int, experienceYears || 0)
    .input("ConsultationFee", sql.Decimal(10, 2), consultationFee || 0)
    .input("AvailableForOPD", sql.Bit, availableForOPD === undefined ? true : Boolean(availableForOPD))
    .input("AvailableForIPD", sql.Bit, availableForIPD === undefined ? false : Boolean(availableForIPD))
    .query(`
      INSERT INTO Doctors
        (UserID, Specialization, Qualification, Designation, LicenseNumber, ExperienceYears,
         ConsultationFee, AvailableForOPD, AvailableForIPD)
      OUTPUT INSERTED.*
      VALUES
        (@UserID, @Specialization, @Qualification, @Designation, @LicenseNumber, @ExperienceYears,
         @ConsultationFee, @AvailableForOPD, @AvailableForIPD)
    `);

  res.status(201).json(result.recordset[0]);
});

const updateDoctor = asyncHandler(async (req, res) => {
  const {
    specialization,
    qualification,
    designation,
    licenseNumber,
    experienceYears,
    consultationFee,
    availableForOPD,
    availableForIPD
  } = req.body;

  if (!specialization || !licenseNumber) {
    return res.status(400).json({ message: "Specialization and license number are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("DoctorID", sql.Int, req.params.id)
    .input("Specialization", sql.NVarChar(100), specialization)
    .input("Qualification", sql.NVarChar(150), qualification || null)
    .input("Designation", sql.NVarChar(100), designation || null)
    .input("LicenseNumber", sql.NVarChar(80), licenseNumber)
    .input("ExperienceYears", sql.Int, experienceYears || 0)
    .input("ConsultationFee", sql.Decimal(10, 2), consultationFee || 0)
    .input("AvailableForOPD", sql.Bit, availableForOPD === undefined ? true : Boolean(availableForOPD))
    .input("AvailableForIPD", sql.Bit, availableForIPD === undefined ? false : Boolean(availableForIPD))
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
      OUTPUT INSERTED.*
      WHERE DoctorID = @DoctorID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  res.json(result.recordset[0]);
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("DoctorID", sql.Int, req.params.id)
    .query(`
      DELETE FROM Doctors
      OUTPUT DELETED.*
      WHERE DoctorID = @DoctorID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  res.json(result.recordset[0]);
});

module.exports = { listDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor };
