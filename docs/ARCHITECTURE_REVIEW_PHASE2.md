# Phase 2 — System Architecture Review

**System:** baraa raed · Enterprise Car Dealership Management  
**Date:** 2026-05-31  
**Audience:** Engineering leadership, security, ERP, and delivery

---

## 1. Executive summary

The codebase is a **hybrid Next.js 15 (App Router) + Django REST Framework + PostgreSQL** showroom ERP with **offline-first IndexedDB**, **PWA**, **JWT session cookies**, and a **public showroom** (`/showroom`). Core revenue paths (vehicles, customers, leads, sales, installments, reservations, accounting, printing, reports) are **implemented end-to-end** with Django backing and BFF-style Next API routes.

Gaps are concentrated in: **(a)** seven nav modules that only render capability lists, **(b)** sync queue acknowledgment without server replay, **(c)** print/PDF labeled as PDF but emitting HTML, **(d)** permissions enforced in UI more than on every API route, **(e)** documentation drift (NestJS target vs Django reality).

**Recommendation:** Stabilize the shipped surface (hide or build placeholders), harden authZ on Django, implement sync replay, then expand modules 11–20 per the product roadmap—without rewriting the stack.

---

## 2. Current topology (as implemented)

```text
Browser (RTL PWA)
    │
    ├─► Next.js 15 (UI, middleware, /api/* BFF proxies)
    │       ├─► IndexedDB (Zustand + offline queue)
    │       ├─► Service Worker (public/sw.js)
    │       └─► runtime-config (origin / trycloudflare / env)
    │
    └─► Django 5 + DRF (JWT, domain apps)
            └─► PostgreSQL (+ media for backups/files)

Public: /showroom, /verify/vehicle, /verify/invoice
```

| Layer | Location | Responsibility |
|--------|-----------|----------------|
| UI shell | `components/layout/app-shell.tsx` | Nav, sync status, session hydrate |
| Modules | `components/modules/*` | Feature screens |
| Domain | `lib/domain.ts`, `lib/*-map.ts` | Types, mappers, module metadata |
| Offline | `lib/offline-store.ts`, `lib/sync-idempotency.ts` | Queue, local entities |
| BFF | `app/api/**` | Proxy to Django, cookies, ops |
| Backend | `backend/*` | Models, services, permissions |
| Workspace | `backend/workspace/` | Dashboard aggregates, search, notifications |

---

## 3. Folder structure assessment

| Area | Verdict | Notes |
|------|---------|--------|
| `app/` | Good | App Router, auth, dashboard, showroom, verify |
| `components/modules/` | Good | One module per file; clear split |
| `lib/` | Good | Maps per domain (`sales-map`, etc.) |
| `backend/` | Good | Django apps by bounded context |
| `components/dashboard-shell.tsx` | **Remove** | ~43KB, **zero imports** — dead code |
| `docs/ARCHITECTURE.md` | **Update** | Still references NestJS target; implementation is Django |

**Clean architecture alignment:** Partial. UI → BFF → Django is clear, but business rules are split between Zustand offline store and Django services (`sales/services.py` for double-sale). Long-term: **single write path** through API with offline as queue-only.

---

## 4. API structure

- **Pattern:** Next `app/api/<resource>/route.ts` forwards to Django with session/JWT.
- **Strengths:** Hides Django URL from browser; cookie-based auth works on same origin.
- **Risks:**
  - Not every route may repeat Django permission classes—needs audit per app.
  - `NEXT_PUBLIC_API_BASE_URL` optional; some client calls assume same-origin `/api`.
- **Scalability:** Add OpenAPI export from DRF; version prefix `/api/v1/` already partially used on Django.

---

## 5. Services & domain logic

| Domain | Server truth | Client cache |
|--------|--------------|--------------|
| Sales / VIN / double sale | `backend/sales/services.py` | Offline store + validation |
| Installments | `backend/installments/services.py` | Module + API |
| Accounting | `backend/accounting/` | Expenses, daily cash |
| Vehicles | `backend/vehicles/` | Cars module |
| Auth | `backend/accounts/` | `middleware.ts`, `br_session` |

**Critical:** Vehicle sold/reserved checks must stay in Django on every sale/reservation mutation; client checks are UX only.

---

## 6. Database design

- PostgreSQL schema via Django migrations across `vehicles`, `customers`, `sales`, `installments`, `accounting`, `organization`, `ops`, `workspace`, etc.
- Reference SQL in `docs/DATABASE_SCHEMA.sql` may lag migrations—treat Django models as source of truth.
- **Multi-branch:** Organization models exist; many list endpoints need consistent `branch` filtering (identified risk in Phase 1).

---

## 7. Security layers

| Control | Status |
|---------|--------|
| Password hashing | PBKDF2 (Django default) |
| JWT + httpOnly session | Implemented |
| Pending registration / admin approval | Implemented |
| Role defaults | `backend/accounts/roles.py`, `lib/client-permissions.ts` |
| Audit logs | Sales revisions, auth audit API |
| CSRF | Less critical for JWT API; review cookie flags |
| Rate limiting | **Gap** — add at reverse proxy + DRF throttling |
| SECRET_KEY / DEBUG | Must be env-driven in production |

**Principal recommendation:** Enforce `permission_classes` + object-level branch checks on **every** mutating view; mirror with Next middleware only for route existence, not authorization.

---

## 8. State management

- **Zustand** (`useShowroomStore`): vehicles, customers, leads, sales, sync queue, network status.
- **React Query** dependency present; not uniformly used—opportunity for server-state consistency.
- **localStorage `br_user`:** UX cache; must not be sole auth source (session cookie is).

---

## 9. Offline architecture

```text
User action → Zustand update → IndexedDB persist → queue entry
     → online: POST /api/sync → (today: ack + idempotency keys)
     → target: replay ops to Django with conflict resolution
```

| Rule | Implementation |
|------|----------------|
| Idempotency keys | `lib/sync-idempotency.ts` |
| No silent financial overwrite | Policy documented; needs server merge rules |
| VIN duplicate | Blocked client + server |

**Phase 21–22 priority:** Implement **operation replay** in `app/api/sync/route.ts` mapping queue ops to Django endpoints.

---

## 10. Sync architecture (target)

1. Client sends batch: `{ operations: [{ id, type, payload, clientTimestamp }] }`.
2. Server validates auth, branch, permissions per op type.
3. Server returns `{ accepted, rejected, conflicts }`.
4. Client marks queue items by status; UI shows conflict inbox for finance ops.

---

## 11. Shipped vs planned modules

**Shipped (dedicated React modules):**  
`dashboard`, `cars`, `customers`, `leads`, `sales`, `installments`, `inventory`, `accounting`, `reservations`, `printing`, `permissions`, `backup-sync`, `system-health`, `reports`, `settings`, `branches`, `notifications`.

**Not shipped (metadata only / GenericModule):**  
`purchases`, `employees`, `test-drives`, `maintenance`, `insurance`, `offers`, `whatsapp`.

**Action taken in Phase 3:** Hide unshipped modules from navigation; direct URLs return 404 until implemented (commercial product rule: no fake pages).

---

## 12. Refactoring plan (prioritized)

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Remove `dashboard-shell.tsx` | S |
| P0 | `SHIPPED_MODULES` gate for nav + routes | S |
| P0 | Allowlist dev test scripts in URL checker | S |
| P1 | Django permission audit on all mutations | M |
| P1 | Sync replay engine | L |
| P1 | Branch scoping on list APIs | M |
| P2 | Replace HTML-as-PDF with real PDF (e.g. `@react-pdf` or server WeasyPrint) | M |
| P2 | Excel export via `xlsx` or server openpyxl | M |
| P2 | Suppliers app (Django) + purchases UI | L |
| P3 | Consolidate offline writes behind API adapters | L |
| P3 | React Query for dashboard metrics | M |

---

## 13. Scalability report

| Dimension | Current | At 10 branches / 50 users |
|-----------|---------|---------------------------|
| App server | Single Next + Django | Horizontal replicas behind load balancer; sticky sessions or stateless JWT |
| DB | PostgreSQL | Read replicas for reports; index on `vin`, `invoice_number`, `branch_id` |
| Media | Local `media/` | S3-compatible object storage |
| Offline | Per-device IndexedDB | Server idempotency + conflict UI |
| Jobs | Minimal | Celery for reminders, installment SMS, backups |

**Revenue-enabling features (sell better):** multi-branch P&L, commission engine, WhatsApp lead ingest, customer portal, integrated 10DLC SMS, BI export to Power BI.

**Daily-stickiness features:** installment due dashboard, reservation expiry alerts, morning executive digest, mobile PWA install.

---

## 14. Professional additions (not in original phases)

| Feature | Benefit | When |
|---------|---------|------|
| Approval workflow UI (discounts, delete vehicle) | Enterprise sales governance | Phase 11 |
| Commission statements | Sales team adoption | Phase 16 |
| Document OCR for purchase invoices | Faster vehicle costing | Later |
| Customer WhatsApp click-to-chat from CRM | Regional market fit | Phase 10/20 |
| Audit export for accountant | Compliance sales | Phase 17 |
| Tenant-style backup encryption | Trust for hosted deals | Phase 25 |

---

## 15. Risks requiring stop-the-line in production

1. `DEBUG=True` or default `SECRET_KEY` on public URL.
2. Open CORS `*` with credentials in production.
3. Self-register role `branch_manager` without admin gate (if still allowed).
4. Selling vehicle without server-side lock (verify tests cover race).
5. Announcing `app.powerxerp.com` before DNS exists.

---

## 16. Next phase

**Phase 3 — Project cleanup** (dead code, URL tests, docs, nav gating) — in progress.  
**Phase 4 — Brand identity** (SVG refresh, dynamic PNG icons via Next `apple-icon.tsx`).

---

*This document supersedes aspirational NestJS diagrams in `docs/ARCHITECTURE.md` for as-built decisions; update `ARCHITECTURE.md` in a follow-up commit.*
