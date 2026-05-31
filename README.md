# Baraa Raed Car Showroom Management System

Luxury, owner-controlled, offline-first car showroom ERP foundation for vehicle inventory, sales, installments, accounting, printing, reports, branches, employees, permissions, backup, and synchronization.

This project is not SaaS and contains no subscription or pricing-plan logic.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- React Query dependency for API sync expansion
- Zustand offline store
- React Hook Form
- Zod validation
- Framer Motion
- IndexedDB offline persistence
- PostgreSQL schema in `docs/DATABASE_SCHEMA.sql`

## Run

```bash
npm install
npm run dev
```

التطبيق يستمع على `0.0.0.0:3000` (مناسب للشبكة المحلية والنشر).

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