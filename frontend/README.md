# Teacher-Student Meeting Reservation Frontend

Modern React + Tailwind frontend for Admin, Teacher, and Student roles.

## Stack

- React (Vite)
- Tailwind CSS
- React Router
- Zustand
- Axios
- Framer Motion

## Run

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`
3. Start dev server: `npm run dev`

## Docker

- Build image (from `frontend/`):
  - `docker build -t il-gmeet-frontend:latest --build-arg VITE_API_BASE_URL=/api/v1 .`
- Run:
  - `docker run -p 5176:80 il-gmeet-frontend:latest`

## MVC-oriented Frontend Structure

```text
src/
├── models/        # Zustand stores + UI/navigation models
├── controllers/   # Role-based controller hooks
├── pages/         # View pages
├── components/    # Reusable view components
├── services/      # API clients and endpoint wrappers
├── hooks/         # Cross-cutting hooks (toast)
├── utils/
└── App.jsx
```
