# Smart Hostel Grievance

A full-stack hostel complaint platform where students report problems and hostel staff manage them from a focused admin dashboard.

Live demo: [https://smart-hostel-grievance.onrender.com](https://smart-hostel-grievance.onrender.com)

Render free-tier apps may take a short time to wake up after inactivity.

## Screenshots

### Admin Dashboard

![Admin dashboard showing hostel problems, filters, priority sorting, and student reports](docs/images/admin-dashboard.png)

### Student Complaint Flow

![Student complaint screen showing complaint context, receipt, and recent complaint history](docs/images/student-complaint-flow.png)

## Demo Accounts

```text
Admin:   admin@example.com / YourStrongPassword123
Student: student@example.com / StudentPassword123
```

## What The Project Does

Smart Hostel Grievance helps hostels move from scattered complaints to clear action.

Students can:

- Create an account and log in securely.
- Submit hostel complaints in English or Hinglish.
- Add useful context such as hostel, exact location, impact, and contact permission.
- See what was understood from their complaint.
- Track recent complaints and their current status.

Admins can:

- See the most urgent hostel problems first.
- View similar student complaints together instead of as separate scattered reports.
- Filter problems by hostel, category, status, and time pressure.
- Open each problem and review the student reports behind it.
- Add updates and move problems through resolution states.

## Why It Stands Out

- Real student and admin workflows instead of a static dashboard.
- Similar complaints are grouped into one problem so staff avoid duplicate work.
- English and Hinglish complaint handling.
- Clear priority sorting so admins know what needs attention first.
- Student-friendly complaint form with low-friction context fields.
- Admin dashboard built for daily use: search, filters, status badges, history, and quick updates.
- Secure login with student/admin roles and HTTP-only cookies.
- Production-oriented backend structure with routers, services, repositories, schemas, and migrations.
- Free deployment-ready setup using Render and Neon.

## Screens And Workflows

### Student Side

1. Student logs in or creates an account.
2. Student selects hostel and writes the complaint.
3. Student optionally adds exact location, impact, and contact permission.
4. The system saves the complaint and links it to the right hostel problem.
5. Student can view recent complaints and current status.

### Admin Side

1. Admin logs in.
2. Dashboard shows problems sorted by priority.
3. Admin filters by hostel, category, status, or time status.
4. Admin opens a problem to review all related student reports.
5. Admin updates status and adds a short note.

## Development Blog

Read the build story, problems faced, errors encountered, and fixes here:

[Building Smart Hostel Grievance: Problems Faced And How I Solved Them](docs/development-blog.md)

## Tech Stack

Backend:

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL for deployment
- SQLite option for quick local development
- Pydantic settings and schemas
- Cookie-based authentication
- Local complaint classification and grouping logic

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
  ai/              complaint understanding and grouping
  core/            config and security

admin-ui/src/
  api/             frontend API client
  auth/            login/session state
  components/      shared UI pieces
  pages/           login, register, student, admin, issue detail
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

Admin:

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

Install and run the backend:

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

If port `8000` is already busy, run the backend on another port and point Vite to it:

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

Seed demo users and sample complaints:

```bash
python scripts/seed_demo.py
```

Create or update an admin:

```bash
python scripts/create_admin.py --email admin@example.com --name "Hostel Admin" --password "YourStrongPassword123"
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

Backend:

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
