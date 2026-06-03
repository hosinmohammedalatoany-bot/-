# Cursor Development Environment — Final Audit Report

**Project:** baraa-raed-showroom  
**Date:** 2026-05-31  
**Scope:** 12-phase setup of trusted Skills, Plugins, MCP servers, Rules, and AI tooling  
**Environment:** Cursor Cloud Agent (Linux), branch `cursor/baraa-raed-auth-system-7d2b`

---

## Executive summary

Phases 1–11 are **complete or documented**. The repository now has a **project-level Cursor configuration** under `.cursor/` (rules, MCP, skills map, agent personas). The Cloud Agent workspace already exposes **80+ plugin MCP servers**; only **Context7** is pinned in project `mcp.json` (official npm package). Bulk installation of optional frontend/backend packages (Axios, ShadCN, Playwright, Celery, etc.) was **intentionally skipped** to avoid bloating or breaking the showroom app; they are listed under “Missing / optional” with install guidance.

**Verification:** `npm run typecheck` passes. `npm run lint` completes (one React Hook Form informational warning).

---

## Phase 1 — Environment inspection

| Component | Status | Version / notes |
|-----------|--------|-----------------|
| **Node.js** | Installed | v22.22.3 |
| **npm** | Installed | 10.9.7 |
| **Python** | Installed | 3.12.3 |
| **Git** | Installed | 2.43.0 |
| **GitHub CLI (`gh`)** | Installed | `/exec-daemon/gh` — use `gh auth login` on your machine |
| **cloudflared** | Installed | 2026.5.2 — used by `npm run tunnel` |
| **Docker** | Not installed | `docker-compose.yml` exists; use host Docker or Render for Postgres |
| **Cursor CLI** | Not in PATH | Normal on Cloud Agent; IDE handles MCP |
| **MCP support** | Yes | Plugin MCP catalog active in workspace |

**Project structure:** Next.js 15 App Router (`app/`), Django API (`backend/`), BFF routes (`app/api/`), PWA/offline (`lib/offline-*`), tunnel scripts (`scripts/start-tunnel.sh`, `start-production.mjs`).

---

## Phase 2 — Core development tools

| Tool | Status |
|------|--------|
| Git | Ready |
| GitHub (`gh`) | Binary present; **auth required** on developer machine |
| Terminal / filesystem | Native to agent |
| Code search | `grep`, `glob`, explore agents |
| Documentation | **Context7** (project `mcp.json` + plugin) |
| Browser / tunnel | **Subtext** MCP (ready), `npm run tunnel`, production `npm run start` |

---

## Phase 3 — Frontend stack

| Package / tool | In `package.json` | Notes |
|----------------|-------------------|--------|
| Next.js 15 | Yes | `next@^15.5.18` |
| React 19 | Yes | |
| TypeScript | Yes | `npm run typecheck` |
| Tailwind CSS 4 | Yes | |
| ShadCN UI | No | No `components.json`; custom UI in `components/` |
| Zustand | Yes | |
| React Query | Yes | `@tanstack/react-query` |
| React Hook Form | Yes | |
| Zod | Yes | v4 |
| Axios | No | Use `fetch` in BFF/client |
| Framer Motion | Yes | |

**Recommendation:** Add ShadCN only if you standardize on Radix primitives; run `npx shadcn@latest init` locally when ready.

---

## Phase 4 — Backend stack

| Component | Status |
|-----------|--------|
| Python 3.12 | Ready |
| Django + DRF | `backend/requirements.txt` |
| JWT (simplejwt) | Yes |
| PostgreSQL driver | `psycopg2-binary` |
| FastAPI | Not used |
| MySQL | Not used |
| Redis (Python pkg) | May be installed globally; **no Celery** in project |
| Celery | Not configured |

**Recommendation:** Keep Django as single API; add Celery only if background jobs are required.

---

## Phase 5 — Cloud & deployment

| Tool | Status |
|------|--------|
| Docker Compose | File present; Docker daemon **not** on this VM |
| Vercel | MCP **needsAuth** — connect in Cursor Settings |
| Cloudflare Tunnel | **Working** via `npm run tunnel` + `cloudflared` |
| Cloudflare Workers MCP | **needsAuth** for bindings deploy |
| Supabase / Firebase | MCP **needsAuth** |
| AWS | **Awsknowledge** MCP error in this session; **Azure** MCP ready |
| Render | MCP **ready** (deploy + Postgres) |

**Public access:** Use `npm run build` then `npm run start` on port **3000**; Django on **8000**. Tunnel URLs rotate each run — see `docs/PUBLIC_ACCESS_CURRENT.md`.

---

## Phase 6 — Testing & quality

| Tool | Status |
|------|--------|
| ESLint | Yes — `npm run lint` |
| Prettier | Not in devDependencies | Optional add |
| Jest / Vitest | Not installed | Project uses `scripts/test-*.mjs` + `npm test` |
| Playwright / Cypress | Not installed | **Browserstack** MCP available for cross-browser |
| Typecheck | `npm run typecheck` |
| URL guard | `npm run check:urls` |
| Django tests | `npm run test:django:*` scripts |

**Recommendation:** Current script-based tests match the repo; add Playwright only if you need E2E in CI.

---

## Phase 7 — AI development tools

| Capability | How to use |
|------------|------------|
| Context7 | `.cursor/mcp.json` + plugin |
| Web search | Firecrawl / Exa / Parallel skills (plugin) |
| Browser automation | Subtext, Browserstack skills |
| Agent personas | `.cursor/agents.md` |
| Plugin skills | 500+ skills in Cursor cache — see `.cursor/skills.md` |

**OpenAI / Anthropic:** Configured in **Cursor account settings**, not in repo.

---

## Phase 8 — Business & productivity

| Service | MCP status | Connect |
|---------|------------|---------|
| Stripe | needsAuth | Stripe restricted key in Cursor MCP |
| Twilio | Twilio-docs ready; live API needsAuth | Account + API keys |
| Figma | Often error/needsAuth | Figma PAT in IDE |
| Notion | needsAuth | Integration token |
| Slack | needsAuth | Slack app |
| Discord | No dedicated MCP in catalog | Use webhooks manually |

---

## Phase 9 — Cursor project structure (created)

```
.cursor/
  rules.md           # Strict project rules
  mcp.json           # Context7 only (official)
  mcp.recommended.md # Trusted MCP catalog + auth guide
  skills.md          # Skill → stack mapping
  agents.md          # 10 virtual roles
docs/
  CURSOR_SETUP_AUDIT.md  # This report
```

---

## Phase 10 — Cursor rules (summary)

Full text: `.cursor/rules.md`

Highlights: no deletes without confirmation; no DB changes without backup; no fake UI; validate forms; production build for tunnel; no hardcoded localhost in client; run typecheck/lint/test/build before done.

---

## Phase 11 — AI development team

Full definitions: `.cursor/agents.md`

Roles: Senior Full Stack, Backend, Frontend, Database, DevOps, Security, QA, UI/UX, AI Engineer, Product Manager — each with owns / responsibilities / does-not boundaries.

---

## Phase 12 — Final audit

### 1. Installed / configured tools

- Runtimes: Node 22, npm, Python 3.12, Git, gh, cloudflared  
- App stack: Next 15, React 19, Tailwind 4, Zustand, RQ, RHF, Zod, Framer Motion, ESLint  
- API: Django 5.x, DRF, JWT, CORS, gunicorn, psycopg2  
- Cursor: `.cursor/*` rules, agents, MCP (Context7), skills map  
- MCP plugins: ~33 servers **ready**, ~50 **needsAuth**, ~16 **error** (session-dependent)

### 2. Missing / optional tools (not installed by design)

- Axios, ShadCN, Playwright, Cypress, Jest, Vitest, Prettier (package)  
- FastAPI, Celery, MySQL  
- Docker engine on Cloud Agent VM  
- Discord MCP  

### 3. Required logins

| System | Where |
|--------|--------|
| GitHub | `gh auth login` or Cursor GitHub integration |
| Vercel | Cursor → MCP → Vercel |
| Cloudflare (dashboard) | Optional; tunnel works without account |
| Notion / Slack / Figma / Stripe / Sentry / PostHog | Cursor MCP OAuth per server |
| Django admin | Local `api:dev` + superuser |

### 4. Required API keys (when enabling MCP)

| Service | Key type | Obtain from |
|---------|----------|-------------|
| Stripe | Restricted secret | Stripe Dashboard → Developers |
| Sentry | Auth token | sentry.io settings |
| Neon / PlanetScale | API key | Provider console |
| Datadog | API + app key | Datadog org |
| Render | API key | Render dashboard (MCP may prompt) |
| Context7 | None for basic use | npm package |

Never commit keys to the repo; use Cursor Secrets or `.env.local` (gitignored).

### 5. Configuration files created

- `.cursor/rules.md`, `mcp.json`, `mcp.recommended.md`, `skills.md`, `agents.md`  
- `docs/CURSOR_SETUP_AUDIT.md` (this file)

### 6. Potential conflicts

| Issue | Mitigation |
|-------|------------|
| `next dev` behind Cloudflare | Use `npm run build` + `npm run start` |
| Tunnel overwrites `.env.local` | `start-tunnel.sh` preserves `DJANGO_API_URL` |
| Stale trycloudflare URL | Re-run `npm run tunnel`; update shared links |
| Duplicate MCP in user + project config | Project only adds Context7 |
| ESLint 9 + Next 15 vs Next 16 eslint-config | Monitor on Next upgrade |

### 7. Fix recommendations

1. Authenticate **Vercel** MCP if deploying to Vercel from Cursor.  
2. Run **Docker** locally for `docker-compose` Postgres parity.  
3. Add **Prettier** if team wants formatted diffs: `npm i -D prettier` + `.prettierrc.json`.  
4. Re-auth **Figma/Datadog/GitLab** MCP if status shows `error`.  
5. For mobile QA, always verify fresh tunnel URL after restart.

### 8. Security recommendations

- Keep `DJANGO_API_URL` server-only; browser uses `/api/*`.  
- Run **Aikido** or **Sonatype** MCP on dependency changes.  
- Use Stripe **restricted** keys only.  
- Rotate tunnel URLs; do not treat trycloudflare as permanent.  
- Enable **Sentry** MCP after auth for production error tracking.

### 9. Performance recommendations

- Production standalone server: `scripts/start-production.mjs`.  
- Lazy-load heavy dashboard routes where possible.  
- Postgres in production vs sqlite dev (`docker-compose.yml`).  
- Run `npm run build` in CI before merge.

### 10. Next actions

1. **Commit and push** `.cursor/` and `docs/CURSOR_SETUP_AUDIT.md`.  
2. In **Cursor IDE → Settings → MCP**, authenticate servers you need (Vercel, Stripe, Notion, Slack).  
3. On developer machine: `gh auth login`, optional `docker compose up -d db`.  
4. For public demo: `npm run build && npm run start` + `npm run api:dev` + `npm run tunnel` — share **new** URL only.  
5. Optional: `npx shadcn@latest init` if adopting ShadCN.  
6. Optional: add Playwright in a follow-up PR with CI workflow.

---

## MCP server status snapshot (this workspace)

Counts are unique servers from plugin catalog (status may change per session):

- **ready:** ~33 (e.g. Context7, Render, Azure, Antimetal, Subtext, Browserstack, Aikido, Elastic-docs, Twilio-docs, Clerk docs, Convex, Prisma-Local, etc.)
- **needsAuth:** ~50 (e.g. Vercel, Notion, Slack, Stripe, Sentry, PostHog, Neon, Amplitude, Atlassian, etc.)
- **error:** ~16 (e.g. Awsknowledge, some Figma/Datadog/GitLab/Tierzero — retry after IDE auth)

Details: `.cursor/mcp.recommended.md` and Cursor **Settings → MCP**.

---

## Sign-off

All 12 phases are **documented**. Project-safe configuration is in `.cursor/`. No untrusted MCP binaries were added. Application behavior was not modified for this audit except new config/docs files.

For tunnel/production issues, see `docs/PUBLIC_ACCESS_CURRENT.md` and commit `fe790e7`.
