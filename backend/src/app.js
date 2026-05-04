const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const patientRoutes = require("./routes/patient.routes");
const doctorRoutes = require("./routes/doctor.routes");
const departmentRoutes = require("./routes/department.routes");
const opdRoutes = require("./routes/opd.routes");
const ipdRoutes = require("./routes/ipd.routes");
const pharmacyRoutes = require("./routes/pharmacy.routes");
const testRoutes = require("./routes/test.routes");
const billingRoutes = require("./routes/billing.routes");
const reviewRoutes = require("./routes/review.routes");

const app = express();

const envOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...envOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "HealthUp API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/opd", opdRoutes);
app.use("/api/ipd", ipdRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error"
  });
});

module.exports = app;
