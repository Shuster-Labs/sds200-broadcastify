#!/bin/bash
# Deploy ONLY the web dashboard to the LXC — stream service is never touched.
# Usage: ./deploy-web.sh <lxc-ip> [ssh-user]

set -euo pipefail

TARGET="${1:-}"
USER="${2:-root}"

if [[ -z "$TARGET" ]]; then
  echo "Usage: ./deploy-web.sh <lxc-ip> [ssh-user]"
  exit 1
fi

REMOTE="${USER}@${TARGET}"
DEPLOY_DIR="/opt/sds200-broadcastify"

echo "→ Copying web dashboard files (stream service untouched)..."
scp src/webserver.js  "${REMOTE}:${DEPLOY_DIR}/src/webserver.js"
scp src/web-html.js   "${REMOTE}:${DEPLOY_DIR}/src/web-html.js"
scp sds200-web.service "${REMOTE}:/etc/systemd/system/sds200-web.service"

echo "→ Installing and starting sds200-web service..."
ssh "$REMOTE" "
  systemctl daemon-reload
  systemctl enable sds200-web
  systemctl restart sds200-web
  systemctl status sds200-web --no-pager -l
"

echo ""
echo "✓ Web dashboard deployed. Stream service was NOT restarted."
echo "  Dashboard: http://${TARGET}:3000"
