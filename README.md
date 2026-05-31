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