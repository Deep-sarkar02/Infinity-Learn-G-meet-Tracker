# PostgreSQL (Prisma)

The backend **runs on PostgreSQL only** (Prisma). There is **no MongoDB driver or runtime** in `backend/src` or `backend/scripts`.

If you still have a legacy MongoDB dataset, use a one-off export/import process outside this repo (or restore historical migration tooling from version control). Day-to-day work is Prisma + `DATABASE_URL`.

## Prisma setup

From `backend/`:

```bash
npm run db:prisma:generate
npm run db:prisma:push
```

Use `npm run db:prisma:validate` to check the schema. For production, prefer `prisma migrate deploy` in CI instead of `db push` on every deploy.

Set `DATABASE_URL` in `backend/.env` or `backend/.env.production` (hosted Postgres such as Neon, RDS, or a local instance you manage yourself).
