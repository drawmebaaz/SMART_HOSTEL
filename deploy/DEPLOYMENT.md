# Deployment Guide

This project is ready for a single-VPS Docker Compose deployment. The compose stack runs:

- PostgreSQL with `pgvector`
- FastAPI backend with Alembic migrations on startup
- React/Vite frontend served by Nginx
- Reverse proxy on port `80`

## 1. Prepare The Server

Install Docker and the Compose plugin on an Ubuntu VPS:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in after adding your user to the Docker group.

## 2. Copy The Project

```bash
git clone <your-repo-url> smart-hostel-grievance
cd smart-hostel-grievance
cp .env.example .env
```

Edit `.env` before starting production:

```bash
ENVIRONMENT=production
POSTGRES_PASSWORD=<strong-database-password>
SECRET_KEY=<at-least-32-random-characters>
SECURE_COOKIES=true
CORS_ORIGINS=https://your-domain.com
ENABLE_TRANSFORMER_EMBEDDINGS=false
```

Keep `ENABLE_TRANSFORMER_EMBEDDINGS=false` for the first deployment unless you have already tested model download and memory usage on the server.

## 3. Start The Stack

```bash
docker compose up --build -d
docker compose ps
```

The backend container automatically runs:

```bash
alembic upgrade head
```

## 4. Create The First Admin

```bash
docker compose exec backend python scripts/create_admin.py --email admin@example.com --name "Hostel Admin"
```

Use the generated password or pass one explicitly:

```bash
docker compose exec backend python scripts/create_admin.py --email admin@example.com --name "Hostel Admin" --password "YourStrongPassword123"
```

## 5. Verify Production

```bash
curl http://localhost/api/v1/health
curl http://localhost/api/v1/ready
```

Then open:

```text
http://your-server-ip
```

## 6. Useful Operations

View logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f proxy
```

Restart after code changes:

```bash
docker compose up --build -d
```

Backup database:

```bash
docker compose exec postgres pg_dump -U smart_hostel smart_hostel > smart_hostel_backup.sql
```

Restore database:

```bash
cat smart_hostel_backup.sql | docker compose exec -T postgres psql -U smart_hostel smart_hostel
```

## 7. Domain And HTTPS

Point your domain's `A` record to the VPS IP. For HTTPS, put this stack behind Cloudflare SSL or add a host-level reverse proxy such as Caddy or Nginx with Certbot.

For a resume demo, the fastest reliable path is:

1. Deploy with Docker Compose.
2. Put the domain behind Cloudflare.
3. Enable Cloudflare proxy and SSL.
4. Set `SECURE_COOKIES=true` and `CORS_ORIGINS=https://your-domain.com`.
