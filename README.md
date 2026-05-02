# HealthUp Healthcare Management System

HealthUp is a database-driven healthcare management system built for SQL Server, Node.js/Express, and React. It supports role-based access for admins, patients, doctors, and nurses with OPD appointments, IPD admissions, prescriptions, tests, pharmacy inventory, billing, and reviews.

## Tech Stack

- Database: SQL Server / SSMS
- Backend: Node.js, Express, `mssql`
- Frontend: React, Vite, Axios
- Auth: SQL-backed `Users` table with role-based JWT authorization

## Project Structure

```text
backend/
  database/schema.sql
  src/
    config/db.js
    controllers/
    middleware/
    routes/
    services/
frontend/
  src/
    api/
    components/
    context/
    pages/
```

## Getting Started

1. Create a SQL Server database named `HealthUp`.
2. Run `backend/database/schema.sql` in SSMS.
3. Optional: run `backend/database/seed.sql` for demo data.
4. Copy `backend/.env.example` to `backend/.env` and fill in SQL Server credentials.
5. Install backend dependencies and start the API:

```bash
cd backend
npm install
npm run dev
```

6. Install frontend dependencies and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Demo logins from `seed.sql`:

- `admin@healthup.test` / `password`
- `patient@healthup.test` / `password`
- `doctor@healthup.test` / `password`
- `nurse@healthup.test` / `password`
