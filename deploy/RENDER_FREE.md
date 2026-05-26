# Free Public Demo Deployment

This project can run as a single Render free web service backed by a free Neon Postgres database.
The Render service serves both the React UI and FastAPI API from one domain, which keeps auth cookies simple.

## 1. Create The Free Database

1. Create a free Neon project.
2. Copy the pooled or direct Postgres connection string.
3. Make sure it uses the SQLAlchemy driver prefix:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

The Alembic migration creates the `vector` extension automatically.

## 2. Push This Project To GitHub

Run these from the project root:

```powershell
git init
git add .
git commit -m "Production deployment setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart-hostel-grievance.git
git push -u origin main
```

Do not commit `.env`; it is ignored.

## 3. Create The Render Service

1. Open Render.
2. Choose **New > Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml`.
5. When Render asks for `DATABASE_URL`, paste your Neon connection string.
6. Deploy.

Render will build the React app, copy it into the FastAPI image, run Alembic migrations, and serve the app publicly.

## 4. Create Demo Accounts

After the first deploy succeeds, either use Render Shell if available on your plan, or temporarily run the admin creation command locally against Neon:

```powershell
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require"
python scripts/create_admin.py --email admin@example.com --name "Hostel Admin" --password "YourStrongPassword123"
python scripts/seed_demo.py
```

Change demo passwords before putting the link on your resume.

## Free-Tier Notes

- Render free web services spin down after inactivity, so the first request can take about a minute.
- Neon free databases have usage limits, but they are enough for a resume demo.
- Keep `ENABLE_TRANSFORMER_EMBEDDINGS=false` on free hosting. The local lexical embedding path is much lighter and still demonstrates grouping.
