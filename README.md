# Smart Hostel Grievance

Production-oriented FastAPI + React application for hostel grievance intake, AI-assisted classification, issue aggregation, SLA-aware triage, and admin resolution workflows.

## What Is Included

- Student authentication and complaint submission
- Admin authentication, dashboard, issue queue, and status updates
- English + Hinglish normalization for natural student complaints
- Fast local hybrid intelligence by default, with optional `sentence-transformers` embeddings for pre-warmed production environments
- Resume-grade admin command center with SLA pressure, recommended actions, risk scoring, and real complaint evidence
- PostgreSQL + `pgvector` production persistence
- Alembic migrations
- Docker Compose deployment for a single VPS
- TypeScript React frontend with real API data only

## Local Development

```bash
cp .env.example .env
```

For a lightweight local backend, set this in `.env`:

```bash
DATABASE_URL=sqlite:///./data/dev.db
AUTO_CREATE_TABLES=true
SECRET_KEY=replace-with-at-least-32-random-characters
```

Run the backend:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Transformer embeddings are optional. The default local hybrid intelligence path is used unless
`ENABLE_TRANSFORMER_EMBEDDINGS=true`; install optional AI dependencies only when you have tested
model download and memory:

```bash
pip install ".[ai]"
```

Run the frontend:

```bash
cd admin-ui
npm install
npm run dev
```

Frontend: `http://localhost:3000`
API docs: `http://localhost:8000/api/v1/docs`

Seed a polished local demo:

```bash
python scripts/seed_demo.py
```

Demo accounts:

- Admin: `admin@example.com` / `YourStrongPassword123`
- Student: `student@example.com` / `StudentPassword123`

## Production With Docker Compose

```bash
cp .env.example .env
# edit SECRET_KEY, database password, CORS origins, and cookie settings
docker compose up --build -d
```

The backend container runs `alembic upgrade head` before starting Uvicorn.

Create an admin account:

```bash
docker compose exec backend python scripts/create_admin.py --email admin@example.com --name "Hostel Admin"
```

## Free Public Demo Deployment

For a no-card public demo, use Neon Free for Postgres and Render Free for a single Docker web service. This repo includes:

- `Dockerfile.render` to build the React UI and serve it from FastAPI.
- `render.yaml` for Render Blueprint deployment.
- `deploy/RENDER_FREE.md` with the full step-by-step checklist.

Keep `.env` private and set `DATABASE_URL` in Render from your Neon connection string.

## API Surface

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/oauth/{provider}/start`
- `GET /api/v1/auth/oauth/{provider}/callback`
- `POST /api/v1/complaints`
- `GET /api/v1/complaints/me`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/issues`
- `GET /api/v1/admin/issues/{issue_id}`
- `PATCH /api/v1/admin/issues/{issue_id}/status`
- `GET /api/v1/health`
- `GET /api/v1/ready`

## Quality Checks

```bash
python -m compileall app
pytest
cd admin-ui
npm run lint
npm run test
npm run build
```

## Notes

The previous milestone-era implementation is intentionally no longer the running application. Existing demo database files are not migrated; start from Alembic migrations and seed/admin scripts.
