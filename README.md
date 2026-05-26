# Smart Hostel Grievance

Smart Hostel Grievance is a production-oriented hostel complaint intelligence platform. Students submit real grievances in English or Hinglish, the system classifies and groups related complaints, and admins manage a prioritized issue queue with SLA pressure, risk scoring, recommended actions, and complaint evidence.

This project was rebuilt from a prototype into a full-stack FastAPI + React TypeScript application with authentication, database migrations, Docker deployment, and a polished command-center UI.

## Live Demo

Live app: [https://smart-hostel-grievance.onrender.com](https://smart-hostel-grievance.onrender.com)

Health check: [https://smart-hostel-grievance.onrender.com/api/v1/health](https://smart-hostel-grievance.onrender.com/api/v1/health)

Render free-tier apps may take a short time to wake up after inactivity.

Demo accounts:

```text
Admin:   admin@example.com / YourStrongPassword123
Student: student@example.com / StudentPassword123
```

## Why It Stands Out

- Real grievance intake instead of mock dashboard data
- Role-based student and admin workflows
- English + Hinglish complaint normalization
- AI-assisted category and urgency classification
- Complaint grouping into operational issues
- SLA-aware triage and risk scoring
- Recommended admin actions for every issue
- Admin issue history with complaint evidence
- Secure HTTP-only cookie authentication
- Production database schema with Alembic migrations
- Docker and Render deployment support

## Core Workflows

### Student

1. Register or log in.
2. Submit a hostel complaint with hostel context.
3. See AI classification, urgency, and linked issue information.
4. Track previously submitted complaints.

### Admin

1. Log in as an admin.
2. View live operational metrics and prioritized issues.
3. Filter issue queue by status.
4. Open detailed issue pages with complaint evidence and history.
5. Update issue status as resolution progresses.

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy 2
- Alembic
- PostgreSQL
- pgvector
- Pydantic settings
- JWT auth with secure HTTP-only cookies
- Local hybrid AI classification and embeddings
- Optional `sentence-transformers` support

### Frontend

- React 18
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Lucide icons
- Componentized API, auth, dashboard, issue, and student flows

### Deployment

- Docker Compose for local/VPS deployment
- Render Blueprint deployment
- Neon Postgres for the hosted demo
- Single-service Render image serving both React and FastAPI

## Architecture

```text
Student/Admin Browser
        |
        v
React + Vite UI
        |
        v
FastAPI /api/v1
        |
        +--> Auth service
        +--> Complaint service
        +--> Admin issue service
        +--> AI classification layer
        |
        v
SQLAlchemy repositories
        |
        v
PostgreSQL + pgvector
```

Backend structure:

```text
app/
  api/v1/          HTTP routers
  services/        business logic
  repositories/    database access
  db/models/       SQLAlchemy models
  schemas/         request/response schemas
  ai/              normalization, classification, embeddings
  core/            config and security
```

Frontend structure:

```text
admin-ui/src/
  api/             typed API client
  auth/            auth provider and session state
  components/      shared shell and UI components
  pages/           login, register, student, admin, issue detail
  styles/          application styling
  utils/           time and formatting helpers
```

## API Surface

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/oauth/{provider}/start`
- `GET /api/v1/auth/oauth/{provider}/callback`

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

## Local Development

Create an environment file:

```bash
cp .env.example .env
```

For lightweight local development, use SQLite:

```env
DATABASE_URL=sqlite:///./data/dev.db
AUTO_CREATE_TABLES=true
SECRET_KEY=replace-with-at-least-32-random-characters
ENABLE_TRANSFORMER_EMBEDDINGS=false
```

Run the backend:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Run the frontend:

```bash
cd admin-ui
npm install
npm run dev
```

Local URLs:

```text
Frontend: http://localhost:3000
API docs: http://localhost:8000/api/v1/docs
```

Seed demo data:

```bash
python scripts/seed_demo.py
```

Create or update an admin:

```bash
python scripts/create_admin.py --email admin@example.com --name "Hostel Admin" --password "YourStrongPassword123"
```

## Docker Compose

Run the full stack locally with PostgreSQL and Nginx:

```bash
cp .env.example .env
# edit SECRET_KEY, POSTGRES_PASSWORD, CORS_ORIGINS, and cookie settings
docker compose up --build -d
```

The backend container runs:

```bash
alembic upgrade head
uvicorn app.main:app
```

Docker URLs:

```text
App:     http://localhost
Backend: http://localhost:8000
Health:  http://localhost/api/v1/health
```

## Free Deployment

This repository includes a free public deployment path:

- `Dockerfile.render` builds the React UI and serves it from FastAPI.
- `render.yaml` defines the Render web service.
- `deploy/RENDER_FREE.md` contains the step-by-step deployment checklist.

Recommended free hosted setup:

```text
Frontend + Backend: Render Free Web Service
Database: Neon Free PostgreSQL
```

Use a Neon connection string with the SQLAlchemy driver prefix:

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
npm run test
npm run build
```

## Production Notes

- Keep `.env` private.
- Rotate demo passwords before sharing beyond a controlled demo.
- Set `SECURE_COOKIES=true` for HTTPS deployments.
- Keep `ENABLE_TRANSFORMER_EMBEDDINGS=false` on small free instances.
- Use Alembic migrations as the source of truth for schema changes.
- Avoid committing local database files, logs, generated artifacts, or dependency folders.

## Status

The project is deployed and running publicly on Render:

[https://smart-hostel-grievance.onrender.com](https://smart-hostel-grievance.onrender.com)
