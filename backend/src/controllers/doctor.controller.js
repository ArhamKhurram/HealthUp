// Doctor CRUD controller for the simplified demo schema.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const doctorProjection = `
  SELECT d.DoctorID, d.UserID, u.FullName, u.Email, u.Phone,
         d.DepartmentID, dep.DepartmentName,
         d.Specialization, d.Qualification, d.Designation, d.ConsultationFee,
         d.ShiftStartTime, d.ShiftEndTime, d.WorkDays,
         CAST(1 AS bit) AS AvailableForOPD,
         CAST(1 AS bit) AS AvailableForIPD,
         dep.DepartmentName AS Departments
  FROM Doctors d
  INNER JOIN Users u ON u.UserID = d.UserID
  LEFT JOIN Departments dep ON dep.DepartmentID = d.DepartmentID
`;

const listDoctors = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    ${doctorProjection}
    ORDER BY u.FullName
  `);
  res.json(result.recordset);
});

const getDoctor = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("DoctorID", sql.Int, req.params.id)
    .query(`${doctorProjection} WHERE d.DoctorID = @DoctorID`);

  if (!result.recordset[0]) return res.status(404).json({ message: "Doctor not found" });
  res.json(result.recordset[0]);
});

const createDoctor = asyncHandler(async (req, res) => {
  const { userId, departmentId, specialization, qualification, designation, consultationFee, shiftStartTime, shiftEndTime, workDays } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("UserID", sql.Int, userId)
    .input("DepartmentID", sql.Int, departmentId || null)
    .input("Specialization", sql.NVarChar(100), specialization)
    .input("Qualification", sql.NVarChar(150), qualification || null)
    .input("Designation", sql.NVarChar(100), designation || null)
    .input("ConsultationFee", sql.Decimal(10, 2), Number(consultationFee || 0))
    .input("ShiftStartTime", sql.NVarChar(8), `${shiftStartTime || "09:00"}:00`)
    .input("ShiftEndTime", sql.NVarChar(8), `${shiftEndTime || "17:00"}:00`)
    .input("WorkDays", sql.NVarChar(50), workDays || "1,2,3,4,5")
    .query(`
      INSERT INTO Doctors (UserID, DepartmentID, Specialization, Qualification, Designation, ConsultationFee, ShiftStartTime, ShiftEndTime, WorkDays)
      OUTPUT INSERTED.*
      VALUES (@UserID, @DepartmentID, @Specialization, @Qualification, @Designation, @ConsultationFee, @ShiftStartTime, @ShiftEndTime, @WorkDays)
    `);

  res.status(201).json(result.recordset[0]);
});

const updateDoctor = asyncHandler(async (req, res) => {
  const { departmentId, specialization, qualification, designation, consultationFee, shiftStartTime, shiftEndTime, workDays } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("DoctorID", sql.Int, req.params.id)
    .input("DepartmentID", sql.Int, departmentId || null)
    .input("Specialization", sql.NVarChar(100), specialization)
    .input("Qualification", sql.NVarChar(150), qualification || null)
    .input("Designation", sql.NVarChar(100), designation || null)
    .input("ConsultationFee", sql.Decimal(10, 2), Number(consultationFee || 0))
    .input("ShiftStartTime", sql.NVarChar(8), `${shiftStartTime || "09:00"}:00`)
    .input("ShiftEndTime", sql.NVarChar(8), `${shiftEndTime || "17:00"}:00`)
    .input("WorkDays", sql.NVarChar(50), workDays || "1,2,3,4,5")
    .query(`
      UPDATE Doctors
      SET DepartmentID = @DepartmentID,
          Specialization = @Specialization,
          Qualification = @Qualification,
          Designation = @Designation,
          ConsultationFee = @ConsultationFee,
          ShiftStartTime = @ShiftStartTime,
          ShiftEndTime = @ShiftEndTime,
          WorkDays = @WorkDays
      OUTPUT INSERTED.*
      WHERE DoctorID = @DoctorID
    `);

  if (!result.recordset[0]) return res.status(404).json({ message: "Doctor not found" });
  res.json(result.recordset[0]);
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("DoctorID", sql.Int, req.params.id)
    .query("DELETE FROM Doctors OUTPUT DELETED.DoctorID WHERE DoctorID = @DoctorID");

  if (!result.recordset[0]) return res.status(404).json({ message: "Doctor not found" });
  res.json({ message: "Doctor deleted" });
});

module.exports = {
  listDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
