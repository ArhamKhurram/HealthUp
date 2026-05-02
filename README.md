# HealthUp Healthcare Management System

HealthUp is a database-driven healthcare management system built for SQL Server, Node.js/Express, and React. It supports role-based access for admins, patients, doctors, nurses, and receptionists with OPD appointments, IPD admissions, prescriptions, tests, pharmacy inventory, billing, and reviews.

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
docs/
  RELEASE_CANDIDATE.md
```

## Getting Started

1. Start SQL Server (Docker quickstart):

```bash
docker rm -f healthup-sql 2>/dev/null || true
docker run -d \
  --name healthup-sql \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=HealthUpPass123!" \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

2. Create database `HealthUp`, then run:
   - `backend/database/schema.sql`
   - `backend/database/seed.sql` (recommended for demo users/data)
3. Configure backend `.env` (or use defaults):
   - `PORT=5001`
   - `CLIENT_ORIGIN=http://127.0.0.1:5173`
   - SQL Server connection values for your machine/container
4. Install backend dependencies and start the API:

```bash
cd backend
npm install
npm run dev
```

5. Install frontend dependencies and start Vite:

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
- `reception@healthup.test` / `password`

Default local URLs:
- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:5001/api`

Release notes and QA evidence:
- `docs/RELEASE_CANDIDATE.md`
