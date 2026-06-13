#!/bin/bash
# Deploy sds200-broadcastify to a Proxmox LXC container.
# Run this from the project directory:
#   ./deploy.sh <lxc-ip-or-hostname> [ssh-user]
#
# Prerequisites on the LXC:
#   apt install docker.io docker-compose-plugin
#   (or docker-ce from Docker's own repo for latest version)

set -euo pipefail

TARGET="${1:-}"
USER="${2:-root}"

if [[ -z "$TARGET" ]]; then
  echo "Usage: ./deploy.sh <lxc-ip> [ssh-user]"
  exit 1
fi

REMOTE="${USER}@${TARGET}"
DEPLOY_DIR="/opt/sds200-broadcastify"

echo "→ Deploying to ${REMOTE}:${DEPLOY_DIR}"

# Create remote directory
ssh "$REMOTE" "mkdir -p ${DEPLOY_DIR}/config"

# Copy project files (exclude node_modules and credentials)
rsync -av --exclude='node_modules/' --exclude='.git/' --exclude='config.json' \
  ./ "${REMOTE}:${DEPLOY_DIR}/"

# Copy config.json separately (contains credentials, handled explicitly)
if [[ -f config.json ]]; then
  echo "→ Copying config.json..."
  scp config.json "${REMOTE}:${DEPLOY_DIR}/config/config.json"
fi

echo "→ Building Docker image on ${TARGET}..."
ssh "$REMOTE" "cd ${DEPLOY_DIR} && docker compose build"

echo "→ Starting service..."
ssh "$REMOTE" "cd ${DEPLOY_DIR} && docker compose up -d"

echo "→ Service status:"
ssh "$REMOTE" "cd ${DEPLOY_DIR} && docker compose ps"

echo ""
echo "✓ Deployed. To tail logs:"
echo "  ssh ${REMOTE} 'docker compose -C ${DEPLOY_DIR} logs -f'"
