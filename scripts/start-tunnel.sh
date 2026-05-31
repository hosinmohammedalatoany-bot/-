#!/usr/bin/env bash
# Starts Next.js (if not running) and Cloudflare quick tunnel for public HTTPS access.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-4173}"
HOST="127.0.0.1"

free_port() {
  local p="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${p}/tcp" 2>/dev/null || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti :"${p}" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  fi
  pkill -f "next dev" 2>/dev/null || true
}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Installing cloudflared..."
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) CF_ARCH="amd64" ;;
    aarch64|arm64) CF_ARCH="arm64" ;;
    *) echo "Unsupported arch: $ARCH"; exit 1 ;;
  esac
  TMP="$(mktemp -d)"
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" -o "${TMP}/cloudflared"
  chmod +x "${TMP}/cloudflared"
  sudo mv "${TMP}/cloudflared" /usr/local/bin/cloudflared 2>/dev/null || mv "${TMP}/cloudflared" "${ROOT}/.bin/cloudflared"
  export PATH="${ROOT}/.bin:${PATH}"
fi

if pgrep -f "next dev" >/dev/null 2>&1; then
  echo "WARNING: next dev is running — stopping it (use production build behind tunnel)."
  free_port "${PORT}"
  sleep 2
fi

if ! curl -sf "http://${HOST}:${PORT}/api/health" >/dev/null 2>&1; then
  echo "Starting Next.js (production) on port ${PORT}..."
  if [ ! -f ".next/BUILD_ID" ]; then
    echo "Building production bundle..."
    npm run build
  fi
  free_port "${PORT}"
  sleep 1
  SESSION_NAME="baraa-prod-server"
  if tmux -f /exec-daemon/tmux.portal.conf has-session -t "=${SESSION_NAME}" 2>/dev/null; then
    echo "Reusing tmux session: ${SESSION_NAME}"
  else
    tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "${SESSION_NAME}" -c "$ROOT" -- "${SHELL:-bash}" -l
  fi
  tmux -f /exec-daemon/tmux.portal.conf send-keys -t "${SESSION_NAME}:0.0" "cd '$ROOT' && set -a && [ -f .env.local ] && . ./.env.local; set +a && HOSTNAME=0.0.0.0 PORT=${PORT} npm run start" C-m
  for i in $(seq 1 30); do
    if curl -sf "http://${HOST}:${PORT}/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if ! curl -sf "http://${HOST}:${PORT}/api/health" >/dev/null 2>&1; then
  echo "ERROR: App not responding on http://${HOST}:${PORT}"
  exit 1
fi

echo "Starting Cloudflare tunnel -> http://${HOST}:${PORT}"
LOG="${ROOT}/.tunnel.log"
rm -f "$LOG"
cloudflared tunnel --url "http://${HOST}:${PORT}" 2>&1 | tee "$LOG" &
CF_PID=$!
trap 'kill $CF_PID 2>/dev/null || true' EXIT

for i in $(seq 1 45); do
  URL="$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)"
  if [ -n "$URL" ]; then
    echo ""
    echo "=============================================="
    echo "  Baraa Raed — رابط عام (HTTPS)"
    echo "  $URL"
    echo "=============================================="
    echo ""
    cat > "${ROOT}/.env.local" <<EOF
# Cloudflare quick tunnel — origin is also detected from each request (no restart required for links)
NEXT_PUBLIC_PUBLIC_BASE_URL=$URL
NEXT_PUBLIC_APP_URL=$URL
VERIFY_EMAIL_IN_RESPONSE=true
EOF
    echo "تم حفظ .env.local (PUBLIC_BASE_URL + APP_URL)."
    echo "الروابط والجلسات تستخدم origin الحالي تلقائياً — إعادة التشغيل اختيارية."
    echo ""
    echo "افتح من iPhone / Android / Windows:"
    echo "  $URL/login"
    echo "  $URL/setup  (أول مرة)"
    echo "  $URL/dashboard/dashboard"
    echo ""
    # Keep tunnel running
    wait $CF_PID
    exit 0
  fi
  sleep 1
done

echo "Tunnel URL not found in log. See $LOG"
kill $CF_PID 2>/dev/null || true
exit 1
