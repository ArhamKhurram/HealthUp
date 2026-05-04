// Department controller.
// Demo-core keeps Departments and Nurses. Removed facility modules return empty compatibility responses.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const DEPARTMENT_TYPES = ["Clinical", "Surgical", "Diagnostics", "Support"];
const LOCATIONS = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "East Wing", "West Wing"];

const listDepartments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT * FROM Departments ORDER BY DepartmentName");
  res.json(result.recordset);
});

const createDepartment = asyncHandler(async (req, res) => {
  const { departmentName, departmentType, location } = req.body;
  if (!departmentName) return res.status(400).json({ message: "Department name is required" });
  if (!DEPARTMENT_TYPES.includes(departmentType)) return res.status(400).json({ message: "Invalid department type" });
  if (!LOCATIONS.includes(location)) return res.status(400).json({ message: "Invalid department location" });

  const pool = await getPool();
  const result = await pool.request()
    .input("DepartmentName", sql.NVarChar(120), departmentName)
    .input("DepartmentType", sql.NVarChar(80), departmentType)
    .input("Location", sql.NVarChar(120), location)
    .query(`
      INSERT INTO Departments (DepartmentName, DepartmentType, Location)
      OUTPUT INSERTED.*
      VALUES (@DepartmentName, @DepartmentType, @Location)
    `);
  res.status(201).json(result.recordset[0]);
});

const updateDepartment = asyncHandler(async (req, res) => {
  const { departmentName, departmentType, location } = req.body;
  if (!DEPARTMENT_TYPES.includes(departmentType)) return res.status(400).json({ message: "Invalid department type" });
  if (!LOCATIONS.includes(location)) return res.status(400).json({ message: "Invalid department location" });

  const pool = await getPool();
  const result = await pool.request()
    .input("DepartmentID", sql.Int, req.params.id)
    .input("DepartmentName", sql.NVarChar(120), departmentName)
    .input("DepartmentType", sql.NVarChar(80), departmentType)
    .input("Location", sql.NVarChar(120), location)
    .query(`
      UPDATE Departments
      SET DepartmentName = @DepartmentName,
          DepartmentType = @DepartmentType,
          Location = @Location
      OUTPUT INSERTED.*
      WHERE DepartmentID = @DepartmentID
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "Department not found" });
  res.json(result.recordset[0]);
});

const listNurses = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT n.NurseID, n.UserID, n.DepartmentID, n.ShiftStartTime, n.ShiftEndTime,
           u.FullName, u.Email, u.Phone,
           d.DepartmentName
    FROM Nurses n
    INNER JOIN Users u ON u.UserID = n.UserID
    LEFT JOIN Departments d ON d.DepartmentID = n.DepartmentID
    ORDER BY u.FullName
  `);
  res.json(result.recordset);
});

const createNurse = asyncHandler(async (req, res) => {
  const { userId, departmentId, shiftStartTime, shiftEndTime } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input("UserID", sql.Int, userId)
    .input("DepartmentID", sql.Int, departmentId || null)
    .input("ShiftStartTime", sql.NVarChar(8), `${shiftStartTime || "09:00"}:00`)
    .input("ShiftEndTime", sql.NVarChar(8), `${shiftEndTime || "17:00"}:00`)
    .query(`
      INSERT INTO Nurses (UserID, DepartmentID, ShiftStartTime, ShiftEndTime)
      OUTPUT INSERTED.*
      VALUES (@UserID, @DepartmentID, @ShiftStartTime, @ShiftEndTime)
    `);
  res.status(201).json(result.recordset[0]);
});

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  listNurses,
  createNurse
};
