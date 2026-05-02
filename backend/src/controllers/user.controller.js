const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const userSelect = `
  SELECT UserID, FullName, Email, Role, Phone, Address, CreatedAt, IsActive
  FROM Users
`;

const listUsers = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    ${userSelect}
    ORDER BY UserID DESC
  `);

  res.json(result.recordset);
});

const getUser = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("UserID", sql.Int, req.params.id)
    .query(`
      ${userSelect}
      WHERE UserID = @UserID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(result.recordset[0]);
});

const createUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone, address } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: "Full name, email, password, and role are required" });
  }

  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();
  const result = await pool
    .request()
    .input("FullName", sql.NVarChar(120), fullName)
    .input("Email", sql.NVarChar(150), email)
    .input("Password", sql.NVarChar(255), hash)
    .input("Role", sql.NVarChar(30), role)
    .input("Phone", sql.NVarChar(30), phone || null)
    .input("Address", sql.NVarChar(255), address || null)
    .query(`
      INSERT INTO Users (FullName, Email, Password, Role, Phone, Address)
      OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.Phone, INSERTED.Address, INSERTED.IsActive
      VALUES (@FullName, @Email, @Password, @Role, @Phone, @Address)
    `);

  res.status(201).json(result.recordset[0]);
});

const updateUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone, address, isActive } = req.body;

  if (!fullName || !email || !role) {
    return res.status(400).json({ message: "Full name, email, and role are required" });
  }

  const pool = await getPool();
  const request = pool
    .request()
    .input("UserID", sql.Int, req.params.id)
    .input("FullName", sql.NVarChar(120), fullName)
    .input("Email", sql.NVarChar(150), email)
    .input("Role", sql.NVarChar(30), role)
    .input("Phone", sql.NVarChar(30), phone || null)
    .input("Address", sql.NVarChar(255), address || null)
    .input("IsActive", sql.Bit, isActive === undefined ? true : Boolean(isActive));

  const passwordSql = password ? ", Password = @Password" : "";
  if (password) {
    request.input("Password", sql.NVarChar(255), await bcrypt.hash(password, 10));
  }

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
    return res.status(404).json({ message: "User not found" });
  }

  res.json(result.recordset[0]);
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
