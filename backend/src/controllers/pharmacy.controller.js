const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listMedications = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT m.MedicationID, m.MedicationName, m.GenericName, m.Category,
           m.UnitPrice, m.Form, i.QuantityInStock, i.MinimumStockLevel,
           i.ReorderLevel, i.ExpiryDate
    FROM Medications m
    LEFT JOIN Inventory i ON i.MedicationID = m.MedicationID
    ORDER BY m.MedicationName
  `);
  res.json(result.recordset);
});

const getMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("MedicationID", sql.Int, req.params.id)
    .query(`
      SELECT m.MedicationID, m.MedicationName, m.GenericName, m.Category,
             m.UnitPrice, m.Form, i.InventoryID, i.QuantityInStock,
             i.MinimumStockLevel, i.ReorderLevel, i.ExpiryDate
      FROM Medications m
      LEFT JOIN Inventory i ON i.MedicationID = m.MedicationID
      WHERE m.MedicationID = @MedicationID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Medication not found" });
  }

  res.json(result.recordset[0]);
});

const createMedication = asyncHandler(async (req, res) => {
  const {
    medicationName,
    genericName,
    category,
    unitPrice,
    form,
    quantityInStock,
    minimumStockLevel,
    reorderLevel,
    expiryDate
  } = req.body;

  if (!medicationName || unitPrice === undefined) {
    return res.status(400).json({ message: "Medication name and unit price are required" });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const medication = await new sql.Request(transaction)
      .input("MedicationName", sql.NVarChar(120), medicationName)
      .input("GenericName", sql.NVarChar(120), genericName || null)
      .input("Category", sql.NVarChar(80), category || null)
      .input("UnitPrice", sql.Decimal(10, 2), unitPrice)
      .input("Form", sql.NVarChar(50), form || null)
      .query(`
        INSERT INTO Medications (MedicationName, GenericName, Category, UnitPrice, Form)
        OUTPUT INSERTED.*
        VALUES (@MedicationName, @GenericName, @Category, @UnitPrice, @Form)
      `);

    const medicationId = medication.recordset[0].MedicationID;
    await new sql.Request(transaction)
      .input("MedicationID", sql.Int, medicationId)
      .input("QuantityInStock", sql.Int, quantityInStock || 0)
      .input("MinimumStockLevel", sql.Int, minimumStockLevel || 0)
      .input("ReorderLevel", sql.Int, reorderLevel || 0)
      .input("ExpiryDate", sql.Date, expiryDate || null)
      .query(`
        INSERT INTO Inventory (MedicationID, QuantityInStock, MinimumStockLevel, ReorderLevel, ExpiryDate)
        VALUES (@MedicationID, @QuantityInStock, @MinimumStockLevel, @ReorderLevel, @ExpiryDate)
      `);

    await transaction.commit();
    res.status(201).json(medication.recordset[0]);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateMedication = asyncHandler(async (req, res) => {
  const {
    medicationName,
    genericName,
    category,
    unitPrice,
    form,
    quantityInStock,
    minimumStockLevel,
    reorderLevel,
    expiryDate
  } = req.body;

  if (!medicationName || unitPrice === undefined) {
    return res.status(400).json({ message: "Medication name and unit price are required" });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const medication = await new sql.Request(transaction)
      .input("MedicationID", sql.Int, req.params.id)
      .input("MedicationName", sql.NVarChar(120), medicationName)
      .input("GenericName", sql.NVarChar(120), genericName || null)
      .input("Category", sql.NVarChar(80), category || null)
      .input("UnitPrice", sql.Decimal(10, 2), unitPrice)
      .input("Form", sql.NVarChar(50), form || null)
      .query(`
        UPDATE Medications
        SET MedicationName = @MedicationName,
            GenericName = @GenericName,
            Category = @Category,
            UnitPrice = @UnitPrice,
            Form = @Form
        OUTPUT INSERTED.*
        WHERE MedicationID = @MedicationID
      `);

    if (!medication.recordset[0]) {
      await transaction.rollback();
      return res.status(404).json({ message: "Medication not found" });
    }

    await new sql.Request(transaction)
      .input("MedicationID", sql.Int, req.params.id)
      .input("QuantityInStock", sql.Int, quantityInStock || 0)
      .input("MinimumStockLevel", sql.Int, minimumStockLevel || 0)
      .input("ReorderLevel", sql.Int, reorderLevel || 0)
      .input("ExpiryDate", sql.Date, expiryDate || null)
      .query(`
        MERGE Inventory AS target
        USING (SELECT @MedicationID AS MedicationID) AS source
          ON target.MedicationID = source.MedicationID
        WHEN MATCHED THEN
          UPDATE SET QuantityInStock = @QuantityInStock,
                     MinimumStockLevel = @MinimumStockLevel,
                     ReorderLevel = @ReorderLevel,
                     ExpiryDate = @ExpiryDate
        WHEN NOT MATCHED THEN
          INSERT (MedicationID, QuantityInStock, MinimumStockLevel, ReorderLevel, ExpiryDate)
          VALUES (@MedicationID, @QuantityInStock, @MinimumStockLevel, @ReorderLevel, @ExpiryDate);
      `);

    await transaction.commit();
    res.json(medication.recordset[0]);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const deleteMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input("MedicationID", sql.Int, req.params.id)
      .query("DELETE FROM Inventory WHERE MedicationID = @MedicationID");

    const deleted = await new sql.Request(transaction)
      .input("MedicationID", sql.Int, req.params.id)
      .query(`
        DELETE FROM Medications
        OUTPUT DELETED.*
        WHERE MedicationID = @MedicationID
      `);

    if (!deleted.recordset[0]) {
      await transaction.rollback();
      return res.status(404).json({ message: "Medication not found" });
    }

    await transaction.commit();
    res.json(deleted.recordset[0]);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { listMedications, getMedication, createMedication, updateMedication, deleteMedication };
