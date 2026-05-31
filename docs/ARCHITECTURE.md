# Baraa Raed Architecture

## Product stance

Baraa Raed is designed as an owner-controlled vehicle showroom ERP. It is not a SaaS product, has no subscriptions, and has no pricing-plan logic. The showroom owner hosts and owns the database, files, backups, and deployed applications.

## Implemented repository baseline

- Next.js 15 web dashboard with TypeScript.
- Tailwind CSS luxury UI with shadcn-style component composition.
- React Hook Form + Zod validation.
- Zustand offline state and native IndexedDB persistence.
- React Query dependency included for API synchronization expansion.
- PWA manifest and installable app metadata.
- Self-hosted API routes for health and sync handshake.
- PostgreSQL schema for all requested enterprise tables.
- SVG brand assets for horizontal logo, app icon, white, black, and transparent versions.

## Target production topology

```text
Web / PWA / Chrome / Safari / Edge
        |
        | HTTPS + JWT access token
        v
Next.js Dashboard ---- NestJS API ---- PostgreSQL
        |                  |              |
        |                  |              +-- PITR backups
        |                  +-- Secure file storage
        |                  +-- Audit/event logs
        v
IndexedDB offline cache
        |
        v
Sync queue + conflict resolver
```

## Mobile and desktop topology

Flutter should share the same domain contracts and API:

- iPhone and Android use Flutter with SQLite for local persistence.
- Windows desktop uses Flutter Windows with SQLite.
- All clients maintain a device session and local operation queue.
- Sync uses idempotent operation IDs and server-side conflict logs.

## Offline-first rules

1. Every local write creates an operation in the local queue.
2. Financial records are never silently overwritten.
3. Vehicle VIN conflicts are blocked locally and rechecked server-side.
4. File uploads are stored locally first, then uploaded during sync.
5. Server reconciliation returns accepted, rejected, and conflict groups.
6. Conflicts involving invoices, installments, purchases, or accounting require approval.

## Security model

- JWT access tokens with short expiry.
- Refresh tokens stored as hashes server-side.
- Passwords hashed with Argon2 or bcrypt.
- Role and permission checks on every API mutation.
- Audit logs for all high-risk actions.
- Approval requests for large discounts, vehicle deletion, archiving, high-value sales, and invoice changes.
- HTTPS-only deployment with secure response headers.
- File upload validation by MIME type, extension, size, and malware scanning hook.

## Module ownership

The dashboard exposes all requested modules through a single enterprise shell. Each module has action surfaces that are permission checked, audit logged, and offline-safe. Production expansion should map each module to a NestJS module with service, repository, DTO, policy guard, and audit interceptor.
