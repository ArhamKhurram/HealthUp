// Patient review CRUD endpoints.
const { sql, getPool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const listReviews = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT r.ReviewID, r.Rating, r.Comments,
           patientUser.FullName AS PatientName, doctorUser.FullName AS DoctorName
    FROM Reviews r
    INNER JOIN Patients p ON p.PatientID = r.PatientID
    INNER JOIN Users patientUser ON patientUser.UserID = p.UserID
    INNER JOIN Doctors d ON d.DoctorID = r.DoctorID
    INNER JOIN Users doctorUser ON doctorUser.UserID = d.UserID
    ORDER BY r.ReviewID DESC
  `);
  res.json(result.recordset);
});

const getReview = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("ReviewID", sql.Int, req.params.id)
    .query(`
      SELECT *
      FROM Reviews
      WHERE ReviewID = @ReviewID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Review not found" });
  }

  res.json(result.recordset[0]);
});

const createReview = asyncHandler(async (req, res) => {
  const { patientId, doctorId, rating, comments } = req.body;

  if (!patientId || !doctorId || rating === undefined) {
    return res.status(400).json({ message: "Patient, doctor, and rating are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("Rating", sql.Int, rating)
    .input("Comments", sql.NVarChar(sql.MAX), comments || null)
    .query(`
      INSERT INTO Reviews (PatientID, DoctorID, Rating, Comments)
      OUTPUT INSERTED.*
      VALUES (@PatientID, @DoctorID, @Rating, @Comments)
    `);

  res.status(201).json(result.recordset[0]);
});

const updateReview = asyncHandler(async (req, res) => {
  const { patientId, doctorId, rating, comments } = req.body;

  if (!patientId || !doctorId || rating === undefined) {
    return res.status(400).json({ message: "Patient, doctor, and rating are required" });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("ReviewID", sql.Int, req.params.id)
    .input("PatientID", sql.Int, patientId)
    .input("DoctorID", sql.Int, doctorId)
    .input("Rating", sql.Int, rating)
    .input("Comments", sql.NVarChar(sql.MAX), comments || null)
    .query(`
      UPDATE Reviews
      SET PatientID = @PatientID,
          DoctorID = @DoctorID,
          Rating = @Rating,
          Comments = @Comments
      OUTPUT INSERTED.*
      WHERE ReviewID = @ReviewID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Review not found" });
  }

  res.json(result.recordset[0]);
});

const deleteReview = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("ReviewID", sql.Int, req.params.id)
    .query(`
      DELETE FROM Reviews
      OUTPUT DELETED.*
      WHERE ReviewID = @ReviewID
    `);

  if (!result.recordset[0]) {
    return res.status(404).json({ message: "Review not found" });
  }

  res.json(result.recordset[0]);
});

module.exports = { listReviews, getReview, createReview, updateReview, deleteReview };
