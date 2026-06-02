# Backend setup (Django + PostgreSQL)

## Structure

```
backend/
  config/          # Django project settings
  core/            # Health check and shared API utilities
  manage.py
  requirements.txt
```

## Local development (SQLite, no Docker)

```bash
cd backend
cp .env.example .env
echo "USE_SQLITE=true" >> .env
export PATH="$HOME/.local/bin:$PATH"
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Health: `http://127.0.0.1:8000/api/health/`

## Local development (PostgreSQL via Docker)

```bash
docker compose up -d db
cd backend && cp .env.example .env
# Edit .env: POSTGRES_PASSWORD=baraa_dev_secret
export PATH="$HOME/.local/bin:$PATH"
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Full stack (app + api + db)

```bash
cp backend/.env.example backend/.env
docker compose up -d --build
```

- Frontend: http://127.0.0.1:3000
- API: http://127.0.0.1:8000/api/health/

## Frontend env

Set in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
DJANGO_API_URL=http://127.0.0.1:8000
VERIFY_EMAIL_IN_RESPONSE=true
```

When `NEXT_PUBLIC_API_BASE_URL` or `DJANGO_API_URL` is set, `/api/auth/*` routes proxy to Django JWT auth. Without it, the legacy JSON file store is used.

## Auth API (Phase 2)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/setup/status/` | GET | Setup completed? |
| `/api/auth/setup/` | POST | First admin |
| `/api/auth/register/` | POST | New user (pending approval) |
| `/api/auth/login/` | POST | JWT access + refresh |
| `/api/auth/refresh/` | POST | Refresh access token |
| `/api/auth/logout/` | POST | Blacklist refresh |
| `/api/auth/me/` | GET | Current user |
| `/api/auth/forgot-password/` | POST | Reset link (dev: in JSON) |
| `/api/auth/reset-password/` | POST | Set new password |
| `/api/auth/change-password/` | POST | Authenticated change |
| `/api/auth/verify-email/` | POST | Email verification token |
| `/api/auth/permissions/check/` | POST | Permission probe |

Smoke test:

```bash
npm run api:dev
npm run test:django
```

The Next.js app continues to work offline with IndexedDB; domain data migrates to Django in later phases.
