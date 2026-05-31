# Deployment Guide

## Requirements

- Node.js 20+
- PostgreSQL 15+
- HTTPS reverse proxy or managed platform with HTTPS
- Private file storage for uploaded documents

## Production URLs

Production must not depend on `localhost`, `127.0.0.1`, private LAN IPs, or a terminal window running on a laptop. Deploy the system behind public HTTPS domains:

- Admin dashboard: `https://admin.baraa-raed.com`
- API: `https://api.baraa-raed.com`
- Customer website: `https://baraa-raed.com`

Alternatively, use one domain with paths:

- `https://baraa-raed.com/admin`
- `https://baraa-raed.com/api`
- `https://baraa-raed.com/cars`

All iPhone, Android, Windows, laptop, desktop, and PWA clients must use the same HTTPS API and central database.

## Web dashboard

```bash
npm install
npm run typecheck
npm run build
npm run start
```

## Database

1. Create a PostgreSQL database owned by the showroom.
2. Apply `docs/DATABASE_SCHEMA.sql`.
3. Create the first `Super Admin` role and owner user.
4. Store secrets outside the repository.

## Environment variables

```bash
POSTGRES_URL=postgres://user:password@host:5432/baraa_raed
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
FILE_STORAGE_PATH=/srv/baraa-raed/files
BACKUP_STORAGE_PATH=/srv/baraa-raed/backups
```

## Production security checklist

- Enforce HTTPS.
- Redirect HTTP to HTTPS.
- Do not ship production clients configured with localhost or private IP URLs.
- Rotate JWT secrets before launch.
- Enable database backups and restore drills.
- Restrict database network access.
- Configure audit log retention.
- Configure file upload scanning.
- Create least-privilege roles.
- Run cross-browser and device QA before handover.
