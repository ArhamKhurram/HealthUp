# Backend Blueprint

This scratch blueprint assumes:

- SQL Server managed through SSMS.
- Node.js + Express backend.
- `mssql` for database access.
- SQL-based auth using `Users.Role`.
- Allowed runtime dependencies only: `express`, `mssql`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`.

The examples use representative names. Adjust stored procedure/table/column names to match the final ERD.

## Suggested Backend Layout

```text
backend/
  package.json
  .env
  src/
    server.js
    app.js
    config/
      db.js
    middleware/
      auth.middleware.js
      role.middleware.js
      error.middleware.js
    utils/
      asyncHandler.js
      sqlTypes.js
    routes/
      auth.routes.js
      patient.routes.js
      doctor.routes.js
      opd.routes.js
      ipd.routes.js
      pharmacy.routes.js
      test.routes.js
      billing.routes.js
    controllers/
      auth.controller.js
      patient.controller.js
      doctor.controller.js
      opd.controller.js
      ipd.controller.js
      pharmacy.controller.js
      test.controller.js
      billing.controller.js
    services/
      auth.service.js
      patient.service.js
      doctor.service.js
      opd.service.js
      ipd.service.js
      pharmacy.service.js
      test.service.js
      billing.service.js
```

Keep each route thin, each controller HTTP-aware, and each service database-aware.

## Environment Variables

```env
PORT=5000
NODE_ENV=development

DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=localhost
DB_DATABASE=HealthcareManagement
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

JWT_SECRET=replace_with_long_secret
JWT_EXPIRES_IN=1d
```

## App Bootstrap

`src/server.js`

```js
const app = require('./app');
const { connectDb } = require('./config/db');

const port = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });
```

`src/app.js`

```js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const doctorRoutes = require('./routes/doctor.routes');
const opdRoutes = require('./routes/opd.routes');
const ipdRoutes = require('./routes/ipd.routes');
const pharmacyRoutes = require('./routes/pharmacy.routes');
const testRoutes = require('./routes/test.routes');
const billingRoutes = require('./routes/billing.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/ipd', ipdRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/billing', billingRoutes);

app.use(errorMiddleware);

module.exports = app;
```

## Database Connection

`src/config/db.js`

```js
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool;

async function connectDb() {
  if (!pool) {
    pool = await sql.connect(config);
  }

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }

  return pool;
}

module.exports = {
  sql,
  connectDb,
  getPool,
};
```

## Middleware Pattern

`src/utils/asyncHandler.js`

```js
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

`src/middleware/error.middleware.js`

```js
module.exports = function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || 'Internal server error',
  });
};
```

`src/middleware/auth.middleware.js`

```js
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

`src/middleware/role.middleware.js`

```js
module.exports = function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
};
```

## Auth Module

Typical SQL tables from ERD:

- `Users(UserId, Username, PasswordHash, Role, IsActive, CreatedAt)`
- Optional role-linked profile tables: `Doctors.UserId`, `Staff.UserId`, etc.

`src/routes/auth.routes.js`

```js
const express = require('express');
const controller = require('../controllers/auth.controller');
const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', controller.login);
router.get('/me', requireAuth, controller.me);

module.exports = router;
```

`src/controllers/auth.controller.js`

```js
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

exports.me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.userId);
  res.json(user);
});
```

`src/services/auth.service.js`

```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');

function signToken(user) {
  return jwt.sign(
    {
      userId: user.UserId,
      username: user.Username,
      role: user.Role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

exports.login = async function login({ username, password }) {
  if (!username || !password) {
    const error = new Error('Username and password are required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const result = await pool
    .request()
    .input('Username', sql.NVarChar(100), username)
    .query(`
      SELECT TOP 1 UserId, Username, PasswordHash, Role, IsActive
      FROM Users
      WHERE Username = @Username
    `);

  const user = result.recordset[0];

  if (!user || !user.IsActive) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.PasswordHash);

  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  return {
    token: signToken(user),
    user: {
      userId: user.UserId,
      username: user.Username,
      role: user.Role,
    },
  };
};

exports.getCurrentUser = async function getCurrentUser(userId) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('UserId', sql.Int, userId)
    .query(`
      SELECT UserId, Username, Role, IsActive, CreatedAt
      FROM Users
      WHERE UserId = @UserId
    `);

  return result.recordset[0] || null;
};
```

## Shared CRUD Pattern

Use this shape for domain modules:

- Route defines URL and role access.
- Controller reads `req.params`, `req.query`, `req.body`.
- Service validates required fields and calls SQL with parameters.
- SQL uses parameterized queries or stored procedures.

Example route:

```js
router.get('/', requireAuth, requireRole('Admin', 'Receptionist', 'Doctor'), controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireRole('Admin', 'Receptionist'), controller.create);
router.put('/:id', requireAuth, requireRole('Admin', 'Receptionist'), controller.update);
router.delete('/:id', requireAuth, requireRole('Admin'), controller.remove);
```

## Patients Module

Likely endpoints:

- `GET /api/patients?search=&page=&pageSize=`
- `GET /api/patients/:id`
- `POST /api/patients`
- `PUT /api/patients/:id`
- `GET /api/patients/:id/history`

Representative service:

```js
const { sql, getPool } = require('../config/db');

exports.listPatients = async function listPatients({ search = '' }) {
  const pool = getPool();
  const result = await pool
    .request()
    .input('Search', sql.NVarChar(100), `%${search}%`)
    .query(`
      SELECT PatientId, MRNo, FullName, Gender, DateOfBirth, Phone, Address
      FROM Patients
      WHERE @Search = '%%'
         OR FullName LIKE @Search
         OR MRNo LIKE @Search
         OR Phone LIKE @Search
      ORDER BY PatientId DESC
    `);

  return result.recordset;
};

exports.createPatient = async function createPatient(payload) {
  const { mrNo, fullName, gender, dateOfBirth, phone, address } = payload;

  if (!fullName || !gender) {
    const error = new Error('Full name and gender are required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const result = await pool
    .request()
    .input('MRNo', sql.NVarChar(50), mrNo)
    .input('FullName', sql.NVarChar(150), fullName)
    .input('Gender', sql.NVarChar(20), gender)
    .input('DateOfBirth', sql.Date, dateOfBirth || null)
    .input('Phone', sql.NVarChar(30), phone || null)
    .input('Address', sql.NVarChar(300), address || null)
    .query(`
      INSERT INTO Patients (MRNo, FullName, Gender, DateOfBirth, Phone, Address)
      OUTPUT INSERTED.*
      VALUES (@MRNo, @FullName, @Gender, @DateOfBirth, @Phone, @Address)
    `);

  return result.recordset[0];
};
```

## Doctors Module

Likely endpoints:

- `GET /api/doctors`
- `GET /api/doctors/:id`
- `POST /api/doctors`
- `PUT /api/doctors/:id`
- `GET /api/doctors/:id/schedule`

Roles:

- Admin can create/update doctors.
- Receptionist can read doctor lists/schedules.
- Doctor can read own profile/schedule.

Representative SQL read:

```sql
SELECT d.DoctorId, d.FullName, d.Specialization, d.Phone, d.ConsultationFee, u.Username, u.IsActive
FROM Doctors d
LEFT JOIN Users u ON u.UserId = d.UserId
ORDER BY d.FullName;
```

## OPD Appointments Module

Likely tables:

- `OPDAppointments(AppointmentId, PatientId, DoctorId, AppointmentDate, TokenNo, Status, Notes, CreatedByUserId)`
- `OPDPrescriptions(PrescriptionId, AppointmentId, Diagnosis, Advice, FollowUpDate)`

Likely endpoints:

- `GET /api/opd/appointments?date=&doctorId=&status=`
- `POST /api/opd/appointments`
- `PATCH /api/opd/appointments/:id/status`
- `POST /api/opd/appointments/:id/prescription`

Representative create:

```js
exports.createAppointment = async function createAppointment(payload, createdByUserId) {
  const { patientId, doctorId, appointmentDate, notes } = payload;

  if (!patientId || !doctorId || !appointmentDate) {
    const error = new Error('Patient, doctor, and appointment date are required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const result = await pool
    .request()
    .input('PatientId', sql.Int, patientId)
    .input('DoctorId', sql.Int, doctorId)
    .input('AppointmentDate', sql.DateTime2, appointmentDate)
    .input('Status', sql.NVarChar(30), 'Scheduled')
    .input('Notes', sql.NVarChar(500), notes || null)
    .input('CreatedByUserId', sql.Int, createdByUserId)
    .query(`
      INSERT INTO OPDAppointments
        (PatientId, DoctorId, AppointmentDate, Status, Notes, CreatedByUserId)
      OUTPUT INSERTED.*
      VALUES
        (@PatientId, @DoctorId, @AppointmentDate, @Status, @Notes, @CreatedByUserId)
    `);

  return result.recordset[0];
};
```

Status values should be constrained in SQL or service logic:

- `Scheduled`
- `CheckedIn`
- `Completed`
- `Cancelled`

## IPD Admissions Module

Likely tables:

- `IPDAdmissions(AdmissionId, PatientId, DoctorId, WardId, BedId, AdmissionDate, DischargeDate, Status, Diagnosis)`
- `Wards(WardId, Name)`
- `Beds(BedId, WardId, BedNo, Status)`

Likely endpoints:

- `GET /api/ipd/admissions?status=`
- `GET /api/ipd/admissions/:id`
- `POST /api/ipd/admissions`
- `PATCH /api/ipd/admissions/:id/discharge`
- `GET /api/ipd/beds/available`

Representative transaction:

```js
exports.admitPatient = async function admitPatient(payload) {
  const { patientId, doctorId, bedId, admissionDate, diagnosis } = payload;

  if (!patientId || !doctorId || !bedId) {
    const error = new Error('Patient, doctor, and bed are required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const request = new sql.Request(transaction);

    await request
      .input('BedId', sql.Int, bedId)
      .query(`
        UPDATE Beds
        SET Status = 'Occupied'
        WHERE BedId = @BedId AND Status = 'Available'
      `);

    const admissionResult = await new sql.Request(transaction)
      .input('PatientId', sql.Int, patientId)
      .input('DoctorId', sql.Int, doctorId)
      .input('BedId', sql.Int, bedId)
      .input('AdmissionDate', sql.DateTime2, admissionDate || new Date())
      .input('Diagnosis', sql.NVarChar(500), diagnosis || null)
      .query(`
        INSERT INTO IPDAdmissions
          (PatientId, DoctorId, BedId, AdmissionDate, Diagnosis, Status)
        OUTPUT INSERTED.*
        VALUES
          (@PatientId, @DoctorId, @BedId, @AdmissionDate, @Diagnosis, 'Admitted')
      `);

    await transaction.commit();
    return admissionResult.recordset[0];
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

## Pharmacy Module

Likely tables:

- `Medicines(MedicineId, Name, GenericName, UnitPrice, StockQty, ReorderLevel, IsActive)`
- `MedicinePurchases(PurchaseId, SupplierId, PurchaseDate, TotalAmount)`
- `MedicineSales(SaleId, PatientId, SaleDate, TotalAmount, CreatedByUserId)`
- `MedicineSaleItems(SaleItemId, SaleId, MedicineId, Qty, UnitPrice)`

Likely endpoints:

- `GET /api/pharmacy/medicines?search=`
- `POST /api/pharmacy/medicines`
- `PUT /api/pharmacy/medicines/:id`
- `POST /api/pharmacy/sales`
- `GET /api/pharmacy/low-stock`

Representative sale flow should use a transaction:

```js
exports.createSale = async function createSale({ patientId, items }, createdByUserId) {
  if (!patientId || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Patient and sale items are required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    let totalAmount = 0;

    const saleResult = await new sql.Request(transaction)
      .input('PatientId', sql.Int, patientId)
      .input('CreatedByUserId', sql.Int, createdByUserId)
      .query(`
        INSERT INTO MedicineSales (PatientId, SaleDate, TotalAmount, CreatedByUserId)
        OUTPUT INSERTED.SaleId
        VALUES (@PatientId, SYSDATETIME(), 0, @CreatedByUserId)
      `);

    const saleId = saleResult.recordset[0].SaleId;

    for (const item of items) {
      const medicineResult = await new sql.Request(transaction)
        .input('MedicineId', sql.Int, item.medicineId)
        .query(`
          SELECT MedicineId, UnitPrice, StockQty
          FROM Medicines
          WHERE MedicineId = @MedicineId AND IsActive = 1
        `);

      const medicine = medicineResult.recordset[0];

      if (!medicine || medicine.StockQty < item.qty) {
        const error = new Error('Insufficient medicine stock');
        error.statusCode = 400;
        throw error;
      }

      const lineTotal = Number(medicine.UnitPrice) * Number(item.qty);
      totalAmount += lineTotal;

      await new sql.Request(transaction)
        .input('SaleId', sql.Int, saleId)
        .input('MedicineId', sql.Int, item.medicineId)
        .input('Qty', sql.Int, item.qty)
        .input('UnitPrice', sql.Decimal(18, 2), medicine.UnitPrice)
        .query(`
          INSERT INTO MedicineSaleItems (SaleId, MedicineId, Qty, UnitPrice)
          VALUES (@SaleId, @MedicineId, @Qty, @UnitPrice);

          UPDATE Medicines
          SET StockQty = StockQty - @Qty
          WHERE MedicineId = @MedicineId;
        `);
    }

    await new sql.Request(transaction)
      .input('SaleId', sql.Int, saleId)
      .input('TotalAmount', sql.Decimal(18, 2), totalAmount)
      .query(`
        UPDATE MedicineSales
        SET TotalAmount = @TotalAmount
        WHERE SaleId = @SaleId
      `);

    await transaction.commit();
    return { saleId, totalAmount };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

## Tests/Lab Module

Likely tables:

- `LabTests(TestId, TestName, Price, IsActive)`
- `TestOrders(OrderId, PatientId, DoctorId, OrderDate, Status)`
- `TestOrderItems(OrderItemId, OrderId, TestId, Price, ResultValue, ResultNotes, Status)`

Likely endpoints:

- `GET /api/tests/catalog`
- `POST /api/tests/orders`
- `GET /api/tests/orders?patientId=&status=`
- `PATCH /api/tests/orders/:orderItemId/result`

Roles:

- Doctor can create orders.
- Lab staff can update results.
- Receptionist/Admin can view orders.

Representative result update:

```js
exports.updateResult = async function updateResult(orderItemId, payload) {
  const { resultValue, resultNotes } = payload;

  const pool = getPool();
  const result = await pool
    .request()
    .input('OrderItemId', sql.Int, orderItemId)
    .input('ResultValue', sql.NVarChar(500), resultValue || null)
    .input('ResultNotes', sql.NVarChar(1000), resultNotes || null)
    .query(`
      UPDATE TestOrderItems
      SET ResultValue = @ResultValue,
          ResultNotes = @ResultNotes,
          Status = 'Reported'
      OUTPUT INSERTED.*
      WHERE OrderItemId = @OrderItemId
    `);

  return result.recordset[0];
};
```

## Billing Module

Likely tables:

- `Bills(BillId, PatientId, SourceType, SourceId, BillDate, SubTotal, Discount, Tax, TotalAmount, PaidAmount, Status)`
- `BillItems(BillItemId, BillId, ItemType, Description, Qty, UnitPrice, LineTotal)`
- `Payments(PaymentId, BillId, PaymentDate, Amount, PaymentMethod, ReferenceNo)`

Likely endpoints:

- `GET /api/billing/bills?patientId=&status=`
- `GET /api/billing/bills/:id`
- `POST /api/billing/bills`
- `POST /api/billing/bills/:id/payments`
- `GET /api/billing/patient/:patientId/ledger`

Representative payment flow:

```js
exports.addPayment = async function addPayment(billId, payload) {
  const { amount, paymentMethod, referenceNo } = payload;

  if (!amount || amount <= 0) {
    const error = new Error('Payment amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input('BillId', sql.Int, billId)
      .input('Amount', sql.Decimal(18, 2), amount)
      .input('PaymentMethod', sql.NVarChar(50), paymentMethod)
      .input('ReferenceNo', sql.NVarChar(100), referenceNo || null)
      .query(`
        INSERT INTO Payments (BillId, PaymentDate, Amount, PaymentMethod, ReferenceNo)
        VALUES (@BillId, SYSDATETIME(), @Amount, @PaymentMethod, @ReferenceNo);

        UPDATE Bills
        SET PaidAmount = PaidAmount + @Amount
        WHERE BillId = @BillId;

        UPDATE Bills
        SET Status =
          CASE
            WHEN PaidAmount >= TotalAmount THEN 'Paid'
            WHEN PaidAmount > 0 THEN 'PartiallyPaid'
            ELSE 'Unpaid'
          END
        WHERE BillId = @BillId;
      `);

    await transaction.commit();
    return { billId, amount };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

## Route Summary

```text
POST   /api/auth/login
GET    /api/auth/me

GET    /api/patients
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
GET    /api/patients/:id/history

GET    /api/doctors
GET    /api/doctors/:id
POST   /api/doctors
PUT    /api/doctors/:id
GET    /api/doctors/:id/schedule

GET    /api/opd/appointments
POST   /api/opd/appointments
PATCH  /api/opd/appointments/:id/status
POST   /api/opd/appointments/:id/prescription

GET    /api/ipd/admissions
GET    /api/ipd/admissions/:id
POST   /api/ipd/admissions
PATCH  /api/ipd/admissions/:id/discharge
GET    /api/ipd/beds/available

GET    /api/pharmacy/medicines
POST   /api/pharmacy/medicines
PUT    /api/pharmacy/medicines/:id
POST   /api/pharmacy/sales
GET    /api/pharmacy/low-stock

GET    /api/tests/catalog
POST   /api/tests/orders
GET    /api/tests/orders
PATCH  /api/tests/orders/:orderItemId/result

GET    /api/billing/bills
GET    /api/billing/bills/:id
POST   /api/billing/bills
POST   /api/billing/bills/:id/payments
GET    /api/billing/patient/:patientId/ledger
```

## Role Matrix

```text
Admin:
  Full access.

Receptionist:
  Patients, OPD scheduling, billing reads/create, doctor schedules.

Doctor:
  Own appointments, patient clinical history, prescriptions, test orders, IPD notes.

LabStaff:
  Test catalog read, test order read, result updates.

Pharmacist:
  Medicines, stock, pharmacy sales.

Cashier:
  Bills, payments, receipts.
```

## Implementation Notes

- Keep passwords as bcrypt hashes in `Users.PasswordHash`; never store raw passwords.
- Put `Role` in JWT so the backend can authorize requests quickly, but still query the user for sensitive operations if account status may change.
- Use parameterized SQL everywhere.
- Use SQL transactions for operations that affect money, inventory, bed occupancy, or multi-table clinical records.
- Prefer SQL constraints for statuses, foreign keys, uniqueness, and non-negative amounts/stock.
- Keep React Axios calls aligned with these REST routes and send the token as `Authorization: Bearer <token>`.
- Avoid exposing SQL error details to the frontend in production.
