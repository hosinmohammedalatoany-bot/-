# Baraa Raed — Cursor Project Rules

Strict rules for AI agents and developers working in this repository.

## Safety and data

- Never delete files or directories without explicit user confirmation.
- Never modify production databases without a verified backup and a rollback plan.
- Never run destructive SQL (`DROP`, mass `DELETE` without `WHERE`) without confirmation.
- Never commit secrets (`.env.local`, API keys, passwords, `backend/db.sqlite3` with real data).

## Implementation quality

- Never ship fake implementations, mock-only UI, or “coming soon” buttons that do nothing.
- Never leave empty pages, placeholder routes, or dead navigation links in shipped modules.
- Validate all forms (client + server); show clear Arabic/English error messages.
- Match existing patterns: Next.js App Router, Django BFF under `app/api/`, `lib/runtime-config.ts` for URLs.
- Never hardcode `localhost`, `127.0.0.1`, or stale `trycloudflare.com` URLs in client-facing source (see `npm run check:urls`).

## Architecture

- Follow clean architecture: UI → hooks/stores → API routes → Django (when enabled).
- Respect `lib/shipped-modules.ts` — do not expose unshipped modules in navigation.
- Prefer extending existing functions over new abstractions.
- SOLID: single responsibility per module; depend on interfaces at boundaries (auth, API client).

## Security

- Use `DJANGO_API_URL` only server-side; browser calls same-origin `/api/*`.
- Enforce auth on protected routes (`middleware.ts`, session cookies, module gates).
- Sanitize user input; never log passwords or tokens.
- Follow OWASP basics: CSRF via same-site cookies, no secrets in client bundles.

## Performance

- Use production `npm run build` + `npm run start` for tunnel/mobile testing — not `next dev` behind Cloudflare.
- Lazy-load heavy dashboard modules where possible.
- Avoid N+1 API patterns; batch Django calls in BFF routes.

## Verification before completion

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test` (project test suite)
4. `npm run build`
5. For auth/API changes: `npm run api:check` and relevant `npm run test:django:*`
6. Document every modified file in the PR or task summary.

## Public access (Cloudflare)

- Tunnel URL changes each run — always use fresh output from `npm run tunnel`.
- Port **3000** for production Next; **8000** for Django.
- Preserve `DJANGO_API_URL` in `.env.local` when updating tunnel URLs.

## Git and PRs

- Small, focused commits with clear messages.
- Do not force-push shared branches without agreement.
- Run `npm run check:urls` before merging frontend URL changes.
