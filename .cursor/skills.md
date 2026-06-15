# Cursor Skills & Plugins — Baraa Raed workspace

Skills are loaded from Cursor plugins (`~/.cursor/plugins/cache/...`). Invoke by matching the task — read the skill `SKILL.md` before acting.

## Always use for this repo

| Skill / area | When |
|--------------|------|
| **nextjs** (Vercel plugin) | App Router, Server Components, caching, deployment |
| **verification** (Vercel) | End-to-end flow checks after dev server |
| **supabase** | Only if adopting Supabase (not current primary DB) |
| **prisma** skills | Only if adding Prisma (project uses Django ORM) |
| **ce-debug** | Production bugs, 500s, tunnel issues |
| **fix-ci** / **loop-on-ci** | PR checks failing |
| **ce-commit** / **ce-commit-push-pr** | Commits and PRs |

## Frontend (matches `package.json`)

| Technology | In repo? | Skill / note |
|------------|----------|----------------|
| Next.js 15 | Yes | `nextjs`, `next-cache-components` |
| React 19 | Yes | `react-best-practices` |
| TypeScript | Yes | `typescript-best-practices` |
| Tailwind 4 | Yes | `shadcn` for new UI components (optional init) |
| Zustand | Yes | — |
| React Query | Yes (`@tanstack/react-query`) | — |
| React Hook Form + Zod | Yes | — |
| Framer Motion | Yes | `gsap-*` only if adding GSAP |
| ShadCN UI | Not initialized | Run `npx shadcn@latest init` if adopting |
| Axios | Not used | Prefer `fetch` + `lib/runtime-config.ts` |

## Backend (matches `backend/requirements.txt`)

| Technology | In repo? | Skill / note |
|------------|----------|----------------|
| Django 5+ / 6 | Yes | — |
| Django REST Framework | Yes | — |
| JWT (simplejwt) | Yes | `auth` if adding Clerk (not primary) |
| PostgreSQL | Docker Compose | `postgres`, `prisma-database-setup-postgresql` |
| FastAPI | No | Not in scope unless new service |
| Celery / Redis | No | `redis` pip present; no Celery app |
| MySQL | No | — |

## DevOps & access

| Tool | In repo? | Skill |
|------|----------|-------|
| Docker Compose | `docker-compose.yml` | `render-*`, `cloudflare` |
| Cloudflare tunnel | `npm run tunnel` | See `docs/PUBLIC_ACCESS_CURRENT.md` |
| Vercel deploy | Optional | `vercel-cli`, `deployments-cicd` |
| AWS / Azure / GCP | MCP only | `deploy` (AWS), `azure-*` plugins |

## Testing & quality

| Tool | In repo? | Skill |
|------|----------|-------|
| ESLint | Yes (`eslint-config-next`) | — |
| Prettier | Config only (see `.prettierrc.json`) | Add `prettier` devDep locally if desired |
| Jest / Vitest | No unit runner | Use `npm test` scripts + Django tests |
| Playwright / Cypress | Not installed | `run-smoke-tests`, `ce-test-browser` |

## AI & research

| Tool | Skill |
|------|-------|
| Context7 MCP | `context7-mcp`, `docs-researcher` |
| Firecrawl / Exa / Tavily | `firecrawl`, `exa-web-search`, `tavily-search` |
| Browser automation | `browser-automation`, `control-ui` |

## Business integrations (optional)

| Tool | MCP / skill |
|------|-------------|
| Stripe | `stripe-best-practices` |
| Twilio | `twilio-*` skills |
| Figma | `figma-use`, `figma-generate-design` |
| Notion | Notion plugin skills |
| Slack | `ce-slack-research` |

## How to add a new skill

1. Cursor Settings → Rules / Plugins → install official plugin only.
2. Do not copy skill files into the repo unless team-standard.
3. Reference this file when onboarding.
