# Production Deployment Guide (Docker)

This project now ships with container builds for backend and frontend.

## 1) Access and ownership checklist

Before go-live, ensure you have:

- VM SSH access (or platform access) for deployment
- DNS control for app/API domains
- TLS certificate ownership (Let's Encrypt / managed certs)
- Secret manager access for production secrets
- Container registry access (if building in CI)
- Monitoring/alerting access (logs, uptime, errors)

## 2) Required production files

- Backend secrets: create `backend/.env.production` from `backend/.env.production.example`
- Frontend build arg: `VITE_API_BASE_URL` (default `/api/v1`)

> Do not commit real secrets into git.

## 3) Build and run with Docker Compose

From repository root:

```bash
# Use hosted Postgres: set DATABASE_URL (and secrets) in backend/.env.production or repo-root .env.
# Skip prisma db push on container start (run migrations in CI instead):
SKIP_PRISMA_PUSH=1 docker compose build --no-cache
SKIP_PRISMA_PUSH=1 docker compose up -d
```

Health checks:

- Frontend: `http://<host>:5176/healthz`
- Backend (through same public port): `http://<host>:5176/backend-health`

Application:

- Frontend: `http://<host>:5176`
- Backend API (same origin): `http://<host>:5176/api/v1`

## 4) Reverse proxy / domain setup

Recommended:

- `app.example.com` -> frontend container (port 80 in container)
- Backend is private on Docker network only (`backend:5000`) and is not publicly exposed.

Frontend Nginx proxies:

- `/api/*` -> backend API
- `/backend-health` -> backend `/health`

## 5) Security hardening (required)

- Use strong `JWT_SECRET` (>= 32 chars)
- Set `NODE_ENV=production`
- Set strict `CORS_ORIGINS` (no wildcard in prod)
- Prefer HTTPS in public environments (terminate TLS at your load balancer or reverse proxy; the app stack serves HTTP on port 80 inside Docker)
- Use managed PostgreSQL with IP allowlist / private networking where available
- Rotate SMTP / Google / Gupshup / LSQ secrets

## 6) Operational recommendations

- Enable automatic restart policies (`unless-stopped` already configured)
- Centralize logs (`docker logs` -> log shipping stack)
- Add uptime and error alerts
- Schedule DB backups and test restores
- Keep image tags immutable per release

## 7) Release quality gate (before production)

Run locally/in CI:

```bash
# frontend
cd frontend
npm ci
npm run lint
npm run build

# backend
cd ../backend
npm ci
npm run test
```

If `npm run test` is placeholder/no-op, add API tests before go-live.

## 8) PostgreSQL (Prisma)

The app uses PostgreSQL only. From `backend/`:

```bash
npm run db:prisma:generate
npm run db:prisma:push
```

For production, prefer `prisma migrate deploy` in CI instead of `db push` on the server. See `backend/POSTGRES_MIGRATION.md` for a short overview.
