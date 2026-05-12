# MongoDB -> PostgreSQL Migration (Prisma)

This backend still runs on MongoDB by default. The files added here provide an end-to-end migration toolkit to move existing data into PostgreSQL safely.

## 1) Install / generate Prisma client

From `backend/`:

```bash
npm run db:prisma:generate
```

## 2) Configure PostgreSQL URL

Set `DATABASE_URL` in `backend/.env` or `backend/.env.production`:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/meeting_reservation?schema=public
```

## 3) Create Postgres schema

```bash
npm run db:prisma:push
```

## 4) Migrate Mongo data into Postgres

```bash
npm run db:migrate:mongo-to-postgres
```

Optional full reset of target Postgres tables before import:

```bash
RESET_POSTGRES=true npm run db:migrate:mongo-to-postgres
```

## 5) Local Postgres container (optional)

From repository root:

```bash
docker compose --profile bundled-db up -d postgres
```

Default local credentials:

- DB: `meeting_reservation`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

Override with `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`.

## Notes

- Migration maps legacy Mongo IDs into `legacyMongoId` columns for traceability.
- Slot + booking relations are normalized in PostgreSQL (`availabilities` / `availability_slots` / `bookings`).
- Runtime services are not switched to PostgreSQL yet; this toolkit prepares schema and data for the next phase (service-layer cutover).
