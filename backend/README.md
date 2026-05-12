# Teacher-Student Meeting Reservation Backend

Production-ready backend built with Node.js, Express, MongoDB (Mongoose), JWT auth, Google Calendar integration, and email notifications.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Google Calendar API (Google Meet links)
- Nodemailer
- Joi validation

## Project Structure (MVC)

```text
src/
├── models/
├── controllers/
├── services/
├── routes/
├── middleware/
├── utils/
├── config/
├── app.js
└── server.js
```

## Setup

1. Install dependencies:
   - `npm install`
2. Create env file:
   - Copy `.env.example` to `.env` and fill values.
3. Start:
   - Dev: `npm run dev`
   - Prod: `npm start`

## Docker

- Build image (from `backend/`):
  - `docker build -t il-gmeet-backend:latest .`
- Run:
  - `docker run --env-file .env -p 5000:5000 il-gmeet-backend:latest`

## PostgreSQL Migration Toolkit

This repository now includes Prisma schema + migration scripts for MongoDB -> PostgreSQL transition.

- Guide: `POSTGRES_MIGRATION.md`
- Prisma schema: `prisma/schema.prisma`
- Migration script: `scripts/migrateMongoToPostgres.js`

## API Base

- `/api/v1/auth`
- `/api/v1/admin`
- `/api/v1/availability`
- `/api/v1/bookings`

## Core Endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Admin (admin only)

- `POST /api/v1/admin/teachers`
- `PATCH /api/v1/admin/teachers/:teacherId/grade`
- `PATCH /api/v1/admin/booking-window`

### Teacher

- `POST /api/v1/availability/teacher` (set availability slots)
- `GET /api/v1/availability/teacher` (calendar view)

### Student

- `GET /api/v1/availability/student?grade=<grade>&date=<ISO_DATE>`
- `POST /api/v1/bookings` (book slot with `availabilityId` + `slotId`)
- `GET /api/v1/bookings/me`

## Notes

- All booking times are stored in UTC.
- Double booking is prevented with atomic `findOneAndUpdate` slot reservation.
- Booking window is configurable by admin.
- Google Meet and SMTP gracefully fallback when not configured.
- Internal implementation remains domain-oriented while exposed structure is MVC-aligned.
