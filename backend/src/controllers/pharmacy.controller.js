// Pharmacy controller for demo-core medications and stock.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const MEDICATION_CATEGORIES = ["Analgesic", "Antibiotic", "Antacid", "Antihistamine", "Cardiac", "Diabetes", "General"];
const MEDICATION_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops"];

const listMedications = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT m.MedicationID, m.MedicationName, m.Category, m.Form, m.UnitPrice,
           i.QuantityInStock, i.ReorderLevel, i.ReorderLevel AS MinimumStockLevel, i.ExpiryDate
    FROM Medications m
    LEFT JOIN Inventory i ON i.MedicationID = m.MedicationID
    ORDER BY m.MedicationName
  `);
  res.json(result.recordset);
});

const getMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("MedicationID", sql.Int, req.params.id)
    .query(`
      SELECT m.MedicationID, m.MedicationName, m.Category, m.Form, m.UnitPrice,
             i.QuantityInStock, i.ReorderLevel, i.ReorderLevel AS MinimumStockLevel, i.ExpiryDate
      FROM Medications m
      LEFT JOIN Inventory i ON i.MedicationID = m.MedicationID
      WHERE m.MedicationID = @MedicationID
    `);
  if (!result.recordset[0]) return res.status(404).json({ message: "Medication not found" });
  res.json(result.recordset[0]);
});

const createMedication = asyncHandler(async (req, res) => {
  const { medicationName, category, form, unitPrice, quantityInStock, reorderLevel, minimumStockLevel, expiryDate } = req.body;
  if (!medicationName) return res.status(400).json({ message: "Medication name is required" });
  if (category && !MEDICATION_CATEGORIES.includes(category)) return res.status(400).json({ message: "Invalid medication category" });
  if (form && !MEDICATION_FORMS.includes(form)) return res.status(400).json({ message: "Invalid medication form" });

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const inserted = await new sql.Request(transaction)
      .input("MedicationName", sql.NVarChar(150), medicationName)
      .input("Category", sql.NVarChar(100), category || "General")
      .input("Form", sql.NVarChar(50), form || "Tablet")
      .input("UnitPrice", sql.Decimal(10, 2), Number(unitPrice || 0))
      .query(`
        INSERT INTO Medications (MedicationName, Category, Form, UnitPrice)
        OUTPUT INSERTED.*
        VALUES (@MedicationName, @Category, @Form, @UnitPrice)
      `);

    await new sql.Request(transaction)
      .input("MedicationID", sql.Int, inserted.recordset[0].MedicationID)
      .input("QuantityInStock", sql.Int, Number(quantityInStock || 0))
      .input("ReorderLevel", sql.Int, Number(reorderLevel || minimumStockLevel || 0))
      .input("ExpiryDate", sql.Date, expiryDate || null)
      .query(`
        INSERT INTO Inventory (MedicationID, QuantityInStock, ReorderLevel, ExpiryDate)
        VALUES (@MedicationID, @QuantityInStock, @ReorderLevel, @ExpiryDate)
      `);

    await transaction.commit();
    res.status(201).json(inserted.recordset[0]);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateMedication = asyncHandler(async (req, res) => {
  const { medicationName, category, form, unitPrice, quantityInStock, reorderLevel, minimumStockLevel, expiryDate } = req.body;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const updated = await new sql.Request(transaction)
      .input("MedicationID", sql.Int, req.params.id)
      .input("MedicationName", sql.NVarChar(150), medicationName)
      .input("Category", sql.NVarChar(100), category || "General")
      .input("Form", sql.NVarChar(50), form || "Tablet")
      .input("UnitPrice", sql.Decimal(10, 2), Number(unitPrice || 0))
      .query(`
        UPDATE Medications
        SET MedicationName = @MedicationName,
            Category = @Category,
            Form = @Form,
            UnitPrice = @UnitPrice
        OUTPUT INSERTED.*
        WHERE MedicationID = @MedicationID
      `);

    if (!updated.recordset[0]) {
      await transaction.rollback();
      return res.status(404).json({ message: "Medication not found" });
    }

    await new sql.Request(transaction)
      .input("MedicationID", sql.Int, req.params.id)
      .input("QuantityInStock", sql.Int, Number(quantityInStock || 0))
      .input("ReorderLevel", sql.Int, Number(reorderLevel || minimumStockLevel || 0))
      .input("ExpiryDate", sql.Date, expiryDate || null)
      .query(`
        MERGE Inventory AS target
        USING (SELECT @MedicationID AS MedicationID) AS source
        ON target.MedicationID = source.MedicationID
        WHEN MATCHED THEN
          UPDATE SET QuantityInStock = @QuantityInStock, ReorderLevel = @ReorderLevel, ExpiryDate = @ExpiryDate
        WHEN NOT MATCHED THEN
          INSERT (MedicationID, QuantityInStock, ReorderLevel, ExpiryDate)
          VALUES (@MedicationID, @QuantityInStock, @ReorderLevel, @ExpiryDate);
      `);

    await transaction.commit();
    res.json(updated.recordset[0]);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const deleteMedication = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("MedicationID", sql.Int, req.params.id)
    .query("DELETE FROM Medications OUTPUT DELETED.MedicationID WHERE MedicationID = @MedicationID");
  if (!result.recordset[0]) return res.status(404).json({ message: "Medication not found" });
  res.json({ message: "Medication deleted" });
});

module.exports = {
  listMedications,
  getMedication,
  createMedication,
  updateMedication,
  deleteMedication
};
