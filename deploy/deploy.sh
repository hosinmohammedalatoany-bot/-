#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f production.env ]]; then
  echo "Missing production.env — copy from production.env.example and edit values."
  exit 1
fi

echo "==> Building and starting baraa raed (Docker Compose)"
docker compose build
docker compose up -d

echo "==> Done. App listens on 127.0.0.1:3000 (put Nginx in front for HTTPS)."
echo "    See deploy/nginx.conf.example and docs/DEPLOYMENT_GUIDE.md"
