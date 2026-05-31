#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Baraa Raed — first production deploy checklist"
echo "1. Copy production.env.example -> production.env and set:"
echo "   - NEXT_PUBLIC_APP_URL (https://...)"
echo "   - DEFAULT_ADMIN_* (strong password; change after first login)"
echo "2. Point DNS: app.baraa-raed.com -> this server"
echo "3. Install certbot and configure deploy/nginx.conf.example"
echo "4. Run: bash deploy/deploy.sh"
echo "5. Open https://your-domain/login and sign in"
echo "6. Change default admin password in Settings if env bootstrap was used"

if [[ -f production.env ]]; then
  bash deploy/deploy.sh
else
  echo ""
  echo "production.env not found — create it before running deploy."
  exit 1
fi
