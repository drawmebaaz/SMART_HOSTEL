# Smart Hostel Grievance

A hostel problem-reporting platform where students raise problems clearly and hostel staff manage them from a focused staff board.

Live demo: [https://smart-hostel-grievance.onrender.com](https://smart-hostel-grievance.onrender.com)

Render free-tier apps may take a short time to wake up after inactivity.

## Screenshots

### Staff Board

![Staff board showing hostel problems, filters, priority sorting, and student reports](docs/images/admin-dashboard.png)

### Student Report Flow

![Student report screen showing location, report details, and recent report history](docs/images/student-complaint-flow.png)

## Demo Accounts

```text
Staff:   admin@example.com / YourStrongPassword123
Student: student@example.com / StudentPassword123
```

## What The Project Does

Smart Hostel Grievance helps hostels move from scattered student reports to clear action.

Students can:

- Create an account and log in securely.
- Submit hostel reports in English or Hinglish.
- Add useful context such as hostel, exact location, impact, and contact permission.
- See what was understood from their report.
- Track recent reports and their current progress.

Hostel staff can:

- See the most urgent hostel problems first.
- View similar student reports together instead of as separate scattered reports.
- Filter problems by hostel, type, progress, and time pressure.
- Open each problem and review the student reports behind it.
- Add updates and move problems toward resolution.

## Why It Stands Out

- Real student and staff workflows instead of a static screen.
- Similar reports are grouped into one problem so staff avoid duplicate work.
- English and Hinglish report handling.
- Clear priority sorting so staff know what needs attention first.
- Student-friendly report form with low-friction context fields.
- Staff board built for daily use: search, filters, progress labels, history, and quick updates.
- Secure login with student/staff roles and HTTP-only cookies.
- Clean engineering structure with tests, typed data shapes, and database migrations.
- Free deployment-ready setup using Render and Neon.

## Screens And Workflows

### Student Side

1. Student logs in or creates an account.
2. Student selects hostel and writes the report.
3. Student optionally adds exact location, impact, and contact permission.
4. The system saves the report and links it to the right hostel problem.
5. Student can view recent reports and current progress.

### Staff Side

1. Staff logs in.
2. Staff board shows problems sorted by priority.
3. Staff filters by hostel, type, progress, or time status.
4. Staff opens a problem to review all related student reports.
5. Staff updates progress and adds a short note.

## Development Blog

Read the build story, problems faced, errors encountered, and fixes here:

[Building Smart Hostel Grievance: Problems Faced And How I Solved Them](docs/development-blog.md)

## Tech Stack

App server:

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL for deployment
- SQLite option for quick local development
- Pydantic settings and schemas
- Cookie-based authentication
- Local report understanding and grouping logic

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Lucide icons

Deployment:

- Render free web service
- Neon PostgreSQL
- Docker support

## Project Structure

```text
app/
  api/v1/          API routes
  services/        main app logic
  repositories/    database access
  db/models/       database models
  schemas/         request and response shapes
  ai/              report understanding and grouping
  core/            config and security

admin-ui/src/
  api/             frontend API client
  auth/            login/session state
  components/      shared UI pieces
  pages/           login, register, student, staff board, problem detail
  styles/          app styling
  utils/           time formatting helpers
```

## API Overview

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Complaints:

- `POST /api/v1/complaints`
- `GET /api/v1/complaints/me`

Staff:

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/issues`
- `GET /api/v1/admin/issues/{issue_id}`
- `PATCH /api/v1/admin/issues/{issue_id}/status`

Health:

- `GET /api/v1/health`
- `GET /api/v1/ready`

## Run Locally

Create an environment file:

```bash
cp .env.example .env
```

For simple laptop development, use SQLite:

```env
ENVIRONMENT=local
DATABASE_URL=sqlite:///./data/dev.db
AUTO_CREATE_TABLES=true
SECRET_KEY=replace-with-at-least-32-random-characters
ENABLE_TRANSFORMER_EMBEDDINGS=false
```

Install and run the app server:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Install and run the frontend:

```bash
cd admin-ui
npm install
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:3000
API docs: http://localhost:8000/api/v1/docs
Health:   http://localhost:8000/api/v1/health
```

If port `8000` is already busy, run the app server on another port and point Vite to it:

```bash
uvicorn app.main:app --reload --port 8010
cd admin-ui
VITE_API_PROXY_TARGET=http://127.0.0.1:8010 npm run dev -- --port 3001
```

On Windows PowerShell:

```powershell
$env:VITE_API_PROXY_TARGET="http://127.0.0.1:8010"
npm run dev -- --port 3001
```

Seed demo users and sample reports:

```bash
python scripts/seed_demo.py
```

Create or update a staff account:

```bash
python scripts/create_admin.py --email admin@example.com --name "Hostel Staff" --password "YourStrongPassword123"
```

## Deploy For Free

Recommended free setup:

```text
App hosting: Render Free Web Service
Database:    Neon Free PostgreSQL
```

Useful deployment files:

- `Dockerfile.render`
- `render.yaml`
- `deploy/RENDER_FREE.md`

Use a Neon database URL with the SQLAlchemy driver prefix:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

## Quality Checks

Python app:

```bash
python -m compileall app
pytest
```

Frontend:

```bash
cd admin-ui
npm run lint
npm run build
```

## Notes

- Keep `.env` private.
- Change demo passwords before sharing outside a controlled demo.
- Use `SECURE_COOKIES=true` on HTTPS production deployments.
- Keep transformer embeddings disabled on very small free servers unless enough memory is available.
- Do not commit local database files, logs, generated artifacts, or dependency folders.
