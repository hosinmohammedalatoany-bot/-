# Baraa Raed Car Showroom Management System

Luxury, owner-controlled, offline-first car showroom ERP foundation for vehicle inventory, sales, installments, accounting, printing, reports, branches, employees, permissions, backup, and synchronization.

This project is not SaaS and contains no subscription or pricing-plan logic.

## Stack

- Next.js 15 (frontend + PWA)
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- Django + Django REST Framework (API)
- PostgreSQL (production) / SQLite (local dev)
- JWT (SimpleJWT) — see `backend/`
- Zustand offline store + IndexedDB
- PostgreSQL baseline schema in `docs/DATABASE_SCHEMA.sql`

## Run

```bash
npm install
npm run dev
```

التطبيق يستمع على `0.0.0.0:3000` (مناسب للشبكة المحلية والنشر).

### API (Django)

```bash
cd backend && cp .env.example .env
# للتطوير بدون Postgres: echo USE_SQLITE=true >> .env
pip install -r requirements.txt
npm run api:migrate
npm run api:dev
```

تفاصيل: `docs/BACKEND_SETUP.md` — الصحة: `http://127.0.0.1:8000/api/health/`

## رابط عام (HTTPS) — مؤقت عبر Cloudflare

```bash
npm run build
npm run tunnel
```

سيُعرض رابط مثل `https://xxxx.trycloudflare.com`. انسخه إلى `.env.local` كـ `NEXT_PUBLIC_APP_URL` ثم أعد تشغيل السيرفر.

تفاصيل النشر على VPS: `docs/DEPLOY_PUBLIC_URL.md`

## Verify

```bash
npm run typecheck
npm run build
```

## Included deliverables

- Web dashboard and PWA shell
- Luxury SVG brand assets in `public/brand`
- Offline queue and IndexedDB persistence
- Working vehicle, customer, lead, reservation, invoice, expense, installment, export, print, backup, and WhatsApp actions
- RBAC matrix and audit trail surfaces
- PostgreSQL baseline schema for all requested tables
- Architecture, deployment, offline, QA, and Flutter mobile/desktop implementation documentation