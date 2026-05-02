const { getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listDepartments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT DepartmentID, DepartmentName, DepartmentType, Location,
           HeadOfDepartment, ContactNumber
    FROM Departments
    ORDER BY DepartmentName
  `);
  res.json(result.recordset);
});

module.exports = { listDepartments };

