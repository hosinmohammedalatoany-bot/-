# باور لإدارة معارض السيارات

نظام عربي فاخر ومملوك بالكامل لإدارة معارض السيارات، يدعم العمل بدون إنترنت، ويغطي السيارات والعملاء والمبيعات والتقسيط والمشتريات والمخزون والمحاسبة والموظفين والفروع والتقارير والإعدادات.

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
- Arabic full project prompt in `docs/POWER_FULL_PROJECT_PROMPT_AR.md`

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