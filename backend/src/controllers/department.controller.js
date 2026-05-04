const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listDepartments = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query("SELECT * FROM Departments ORDER BY DepartmentName");
  res.json(result.recordset);
});

const createDepartment = asyncHandler(async (req, res) => {
  const { departmentName, departmentType, location, headOfDepartment, contactNumber } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("DepartmentName", sql.NVarChar(100), departmentName)
    .input("DepartmentType", sql.NVarChar(50), departmentType)
    .input("Location", sql.NVarChar(120), location || null)
    .input("HeadOfDepartment", sql.NVarChar(120), headOfDepartment || null)
    .input("ContactNumber", sql.NVarChar(30), contactNumber || null)
    .query(`
      INSERT INTO Departments (DepartmentName, DepartmentType, Location, HeadOfDepartment, ContactNumber)
      OUTPUT INSERTED.*
      VALUES (@DepartmentName, @DepartmentType, @Location, @HeadOfDepartment, @ContactNumber)
    `);
  res.status(201).json(result.recordset[0]);
});

const updateDepartment = asyncHandler(async (req, res) => {
  const { departmentName, departmentType, location, headOfDepartment, contactNumber } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("DepartmentID", sql.Int, req.params.id)
    .input("DepartmentName", sql.NVarChar(100), departmentName)
    .input("DepartmentType", sql.NVarChar(50), departmentType)
    .input("Location", sql.NVarChar(120), location || null)
    .input("HeadOfDepartment", sql.NVarChar(120), headOfDepartment || null)
    .input("ContactNumber", sql.NVarChar(30), contactNumber || null)
    .query(`
      UPDATE Departments
      SET DepartmentName = @DepartmentName, DepartmentType = @DepartmentType, Location = @Location,
          HeadOfDepartment = @HeadOfDepartment, ContactNumber = @ContactNumber
      OUTPUT INSERTED.*
      WHERE DepartmentID = @DepartmentID
    `);
  res.json(result.recordset[0] || null);
});

const listNurses = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT n.NurseID, n.UserID, n.DepartmentID, n.ShiftTime, n.NurseType, n.Certification, u.FullName, d.DepartmentName
    FROM Nurses n
    INNER JOIN Users u ON u.UserID = n.UserID
    INNER JOIN Departments d ON d.DepartmentID = n.DepartmentID
    ORDER BY n.NurseID DESC
  `);
  res.json(result.recordset);
});

const createNurse = asyncHandler(async (req, res) => {
  const { userId, departmentId, shiftTime, nurseType, certification } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("UserID", sql.Int, userId)
    .input("DepartmentID", sql.Int, departmentId)
    .input("ShiftTime", sql.NVarChar(50), shiftTime || null)
    .input("NurseType", sql.NVarChar(50), nurseType || null)
    .input("Certification", sql.NVarChar(150), certification || null)
    .query(`
      INSERT INTO Nurses (UserID, DepartmentID, ShiftTime, NurseType, Certification)
      OUTPUT INSERTED.*
      VALUES (@UserID, @DepartmentID, @ShiftTime, @NurseType, @Certification)
    `);
  res.status(201).json(result.recordset[0]);
});

const listWards = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT w.*, d.DepartmentName
    FROM Wards w
    INNER JOIN Departments d ON d.DepartmentID = w.DepartmentID
    ORDER BY w.WardID DESC
  `);
  res.json(result.recordset);
});

const createWard = asyncHandler(async (req, res) => {
  const { departmentId, wardName, wardType, floor, totalBeds, dailyCharges, nurseInCharge } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("DepartmentID", sql.Int, departmentId)
    .input("WardName", sql.NVarChar(100), wardName)
    .input("WardType", sql.NVarChar(50), wardType)
    .input("Floor", sql.Int, floor || null)
    .input("TotalBeds", sql.Int, totalBeds)
    .input("DailyCharges", sql.Decimal(10, 2), dailyCharges || 0)
    .input("NurseInCharge", sql.Int, nurseInCharge || null)
    .query(`
      INSERT INTO Wards (DepartmentID, WardName, WardType, Floor, TotalBeds, DailyCharges, NurseInCharge)
      OUTPUT INSERTED.*
      VALUES (@DepartmentID, @WardName, @WardType, @Floor, @TotalBeds, @DailyCharges, @NurseInCharge)
    `);
  res.status(201).json(result.recordset[0]);
});

const updateWard = asyncHandler(async (req, res) => {
  const { departmentId, wardName, wardType, floor, totalBeds, dailyCharges, nurseInCharge } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("WardID", sql.Int, req.params.id)
    .input("DepartmentID", sql.Int, departmentId)
    .input("WardName", sql.NVarChar(100), wardName)
    .input("WardType", sql.NVarChar(50), wardType)
    .input("Floor", sql.Int, floor || null)
    .input("TotalBeds", sql.Int, totalBeds)
    .input("DailyCharges", sql.Decimal(10, 2), dailyCharges || 0)
    .input("NurseInCharge", sql.Int, nurseInCharge || null)
    .query(`
      UPDATE Wards
      SET DepartmentID = @DepartmentID, WardName = @WardName, WardType = @WardType, Floor = @Floor,
          TotalBeds = @TotalBeds, DailyCharges = @DailyCharges, NurseInCharge = @NurseInCharge
      OUTPUT INSERTED.*
      WHERE WardID = @WardID
    `);
  res.json(result.recordset[0] || null);
});

const listBeds = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT b.*, w.WardName
    FROM Beds b
    INNER JOIN Wards w ON w.WardID = b.WardID
    ORDER BY b.BedID DESC
  `);
  res.json(result.recordset);
});

const createBed = asyncHandler(async (req, res) => {
  const { wardId, bedNumber, bedType, status, dailyCharges } = req.body;
  const pool = await getPool();
  let resolvedBedNumber = bedNumber;
  if (!resolvedBedNumber) {
    const prefixResult = await pool
      .request()
      .input("WardID", sql.Int, wardId)
      .query("SELECT WardName FROM Wards WHERE WardID = @WardID");
    if (!prefixResult.recordset[0]) {
      return res.status(404).json({ message: "Ward not found." });
    }
    const wardPrefix = String(prefixResult.recordset[0].WardName || "BED")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8) || "BED";
    const nextResult = await pool
      .request()
      .input("WardID", sql.Int, wardId)
      .query("SELECT COUNT(1) AS BedCount FROM Beds WHERE WardID = @WardID");
    const nextNumber = Number(nextResult.recordset[0]?.BedCount || 0) + 1;
    resolvedBedNumber = `${wardPrefix}-${String(nextNumber).padStart(3, "0")}`;
  }
  const result = await pool
    .request()
    .input("WardID", sql.Int, wardId)
    .input("BedNumber", sql.NVarChar(30), resolvedBedNumber)
    .input("BedType", sql.NVarChar(50), bedType)
    .input("Status", sql.NVarChar(30), status || "Available")
    .input("DailyCharges", sql.Decimal(10, 2), dailyCharges || 0)
    .query(`
      INSERT INTO Beds (WardID, BedNumber, BedType, Status, DailyCharges)
      OUTPUT INSERTED.*
      VALUES (@WardID, @BedNumber, @BedType, @Status, @DailyCharges)
    `);
  res.status(201).json(result.recordset[0]);
});

const updateBed = asyncHandler(async (req, res) => {
  const { wardId, bedNumber, bedType, status, dailyCharges } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("BedID", sql.Int, req.params.id)
    .input("WardID", sql.Int, wardId)
    .input("BedNumber", sql.NVarChar(30), bedNumber)
    .input("BedType", sql.NVarChar(50), bedType)
    .input("Status", sql.NVarChar(30), status || "Available")
    .input("DailyCharges", sql.Decimal(10, 2), dailyCharges || 0)
    .query(`
      UPDATE Beds
      SET WardID = @WardID, BedNumber = @BedNumber, BedType = @BedType, Status = @Status, DailyCharges = @DailyCharges
      OUTPUT INSERTED.*
      WHERE BedID = @BedID
    `);
  res.json(result.recordset[0] || null);
});

const updateBedStatus = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("BedID", sql.Int, req.params.id)
    .input("Status", sql.NVarChar(30), req.body.status)
    .query("UPDATE Beds SET Status = @Status OUTPUT INSERTED.* WHERE BedID = @BedID");
  res.json(result.recordset[0] || null);
});

const listOpdRooms = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT r.*, d.DepartmentName
    FROM OPDRooms r
    INNER JOIN Departments d ON d.DepartmentID = r.DepartmentID
    ORDER BY r.RoomID DESC
  `);
  res.json(result.recordset);
});

const createOpdRoom = asyncHandler(async (req, res) => {
  const { departmentId, roomNumber, roomType, status, capacity } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("DepartmentID", sql.Int, departmentId)
    .input("RoomNumber", sql.NVarChar(30), roomNumber)
    .input("RoomType", sql.NVarChar(50), roomType)
    .input("Status", sql.NVarChar(30), status || "Available")
    .input("Capacity", sql.Int, capacity || 1)
    .query(`
      INSERT INTO OPDRooms (DepartmentID, RoomNumber, RoomType, Status, Capacity)
      OUTPUT INSERTED.*
      VALUES (@DepartmentID, @RoomNumber, @RoomType, @Status, @Capacity)
    `);
  res.status(201).json(result.recordset[0]);
});

const updateOpdRoom = asyncHandler(async (req, res) => {
  const { departmentId, roomNumber, roomType, status, capacity } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("RoomID", sql.Int, req.params.id)
    .input("DepartmentID", sql.Int, departmentId)
    .input("RoomNumber", sql.NVarChar(30), roomNumber)
    .input("RoomType", sql.NVarChar(50), roomType)
    .input("Status", sql.NVarChar(30), status || "Available")
    .input("Capacity", sql.Int, capacity || 1)
    .query(`
      UPDATE OPDRooms
      SET DepartmentID = @DepartmentID, RoomNumber = @RoomNumber, RoomType = @RoomType, Status = @Status, Capacity = @Capacity
      OUTPUT INSERTED.*
      WHERE RoomID = @RoomID
    `);
  res.json(result.recordset[0] || null);
});

const updateOpdRoomStatus = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("RoomID", sql.Int, req.params.id)
    .input("Status", sql.NVarChar(30), req.body.status)
    .query("UPDATE OPDRooms SET Status = @Status OUTPUT INSERTED.* WHERE RoomID = @RoomID");
  res.json(result.recordset[0] || null);
});

const listDutyRoster = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT dr.*, u.FullName, d.DepartmentName,
      CONVERT(VARCHAR(5), dr.ShiftStartTime, 108) AS ShiftStartTime,
      CONVERT(VARCHAR(5), dr.ShiftEndTime, 108) AS ShiftEndTime
    FROM DutyRoster dr
    INNER JOIN Users u ON u.UserID = dr.UserID
    INNER JOIN Departments d ON d.DepartmentID = dr.DepartmentID
    ORDER BY dr.RosterID DESC
  `);
  res.json(result.recordset);
});

const createDutyRoster = asyncHandler(async (req, res) => {
  const { userId, departmentId, shiftDate, shiftStartTime, shiftEndTime } = req.body;
  const shiftType = "Custom";
  if (!shiftStartTime || !shiftEndTime) {
    return res.status(400).json({ message: "Shift start and end time are required." });
  }
  const pool = await getPool();
  const userRole = await pool
    .request()
    .input("UserID", sql.Int, userId)
    .query("SELECT Role FROM Users WHERE UserID = @UserID");
  if (!userRole.recordset[0] || userRole.recordset[0].Role !== "Nurse") {
    return res.status(400).json({ message: "Duty roster assignment only supports nurse users." });
  }
  const result = await pool
    .request()
    .input("UserID", sql.Int, userId)
    .input("DepartmentID", sql.Int, departmentId)
    .input("ShiftDate", sql.Date, shiftDate)
    .input("ShiftStartTime", sql.Time, shiftStartTime)
    .input("ShiftEndTime", sql.Time, shiftEndTime)
    .input("ShiftType", sql.NVarChar(40), shiftType)
    .query(`
      INSERT INTO DutyRoster (UserID, DepartmentID, ShiftDate, ShiftType, ShiftStartTime, ShiftEndTime)
      OUTPUT INSERTED.*
      VALUES (@UserID, @DepartmentID, @ShiftDate, @ShiftType, @ShiftStartTime, @ShiftEndTime)
    `);
  res.status(201).json(result.recordset[0]);
});

const listEquipment = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT e.*, d.DepartmentName
    FROM HospitalEquipment e
    INNER JOIN Departments d ON d.DepartmentID = e.DepartmentID
    ORDER BY e.EquipmentID DESC
  `);
  res.json(result.recordset);
});

const createEquipment = asyncHandler(async (req, res) => {
  const { departmentId, equipmentName, status, lastMaintenanceDate, nextMaintenanceDue } = req.body;
  const pool = await getPool();
  const result = await pool
    .request()
    .input("DepartmentID", sql.Int, departmentId)
    .input("EquipmentName", sql.NVarChar(120), equipmentName)
    .input("Status", sql.NVarChar(40), status || "Available")
    .input("LastMaintenanceDate", sql.Date, lastMaintenanceDate || null)
    .input("NextMaintenanceDue", sql.Date, nextMaintenanceDue || null)
    .query(`
      INSERT INTO HospitalEquipment (DepartmentID, EquipmentName, Status, LastMaintenanceDate, NextMaintenanceDue)
      OUTPUT INSERTED.*
      VALUES (@DepartmentID, @EquipmentName, @Status, @LastMaintenanceDate, @NextMaintenanceDue)
    `);
  res.status(201).json(result.recordset[0]);
});

const updateEquipmentStatus = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("EquipmentID", sql.Int, req.params.id)
    .input("Status", sql.NVarChar(40), req.body.status)
    .query("UPDATE HospitalEquipment SET Status = @Status OUTPUT INSERTED.* WHERE EquipmentID = @EquipmentID");
  res.json(result.recordset[0] || null);
});

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  listNurses,
  createNurse,
  listWards,
  createWard,
  updateWard,
  listBeds,
  createBed,
  updateBed,
  updateBedStatus,
  listOpdRooms,
  createOpdRoom,
  updateOpdRoom,
  updateOpdRoomStatus,
  listDutyRoster,
  createDutyRoster,
  listEquipment,
  createEquipment,
  updateEquipmentStatus
};
