# Recommended MCP Servers (trusted / official)

This workspace Cloud Agent already has **80+ MCP servers** from Cursor plugins. Use **Cursor Settings → MCP** to enable auth for servers marked `needsAuth`.

Project-level `mcp.json` only adds **Context7** (official npm package). Add more servers in user or team Cursor settings — do not duplicate untrusted binaries.

## Ready without extra setup (examples)

| Server | Use for this project |
|--------|----------------------|
| **Context7** | Next.js, Django, DRF, React Query docs |
| **Render** | Deploy web + Postgres |
| **Convex** | If migrating real-time backend |
| **Prisma-Local** | Schema tooling (Postgres) |
| **Elastic-docs** | Search/observability reference |
| **Etoro-api-docs** | Only if integrating eToro |
| **Twilio-docs** | SMS/voice reference |
| **Resend** | Transactional email |
| **Sinch** | SMS (alternative) |
| **Phantom-connect-sdk** | Wallet integrations only |
| **Browserstack** | Cross-browser QA |
| **Snyk** / **Sonatype-mcp** | Dependency security |
| **Aikido** | SAST on changed files |
| **Antimetal** | Infra investigation |
| **Subtext-tunnel** | UI proof / tunnel testing |
| **Svelte** | N/A unless Svelte added |

## Requires authentication (connect in Cursor IDE)

| Server | How to connect | API key / login |
|--------|----------------|-----------------|
| **Vercel** | Cursor MCP → Vercel → Sign in | Vercel account |
| **GitHub** | Built-in or gh CLI | `gh auth login` |
| **GitLab** | MCP OAuth | GitLab account |
| **Notion** | Notion MCP integration | Notion integration token |
| **Slack** | Slack MCP | Slack app token |
| **Figma** | Figma MCP (when status `ready`) | Figma PAT |
| **Stripe** | Stripe plugin MCP | Restricted secret key |
| **Sentry** | Sentry MCP | Auth token |
| **PostHog** | PostHog MCP | Personal API key |
| **Neon** / **PlanetScale** | Database MCP | Provider API key |
| **Amplitude** | Product analytics | API key |
| **Datadog** | Observability | API + app keys |
| **Firebase** | Google login | Firebase project |
| **Cloudflare-bindings** | Cloudflare account | API token |
| **Buildkite** | CI | API token |
| **Harness** | CI/CD | API key |

## Official install commands (local machine only)

```bash
# Context7 (also in .cursor/mcp.json)
npx -y @upstash/context7-mcp@latest

# Cloudflare tunnel (already used by npm run tunnel)
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# GitHub CLI
# https://cli.github.com/
gh auth login
```

## Do not install

- Random npm MCP packages without publisher verification
- MCP servers that request full filesystem + network without need
- Cracked or “unlimited” API proxy tools
