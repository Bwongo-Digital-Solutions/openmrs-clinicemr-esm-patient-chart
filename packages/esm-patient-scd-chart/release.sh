#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# release.sh  –  Automates the SCD chart release cycle
#
# Usage:
#   ./release.sh            # auto-bump patch, build, publish, update distro, rebuild docker
#   ./release.sh --no-docker  # skip docker rebuild (useful when no internet during assemble)
#   ./release.sh --skip-publish  # build only, no npm publish (dry-run)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISTRO_DIR="/home/tendo/bwongo-digital-solutions/SSUUBO/openmrs-ssuubo-emr"
ASSEMBLE_CONFIG="${DISTRO_DIR}/frontend/spa-assemble-config.json"
PKG_JSON="${SCRIPT_DIR}/package.json"
WEBPACK="${SCRIPT_DIR}/../../node_modules/.bin/webpack"

NO_DOCKER=false
SKIP_PUBLISH=false

for arg in "$@"; do
  case $arg in
    --no-docker)    NO_DOCKER=true ;;
    --skip-publish) SKIP_PUBLISH=true ;;
  esac
done

# ── 1. Bump patch version ─────────────────────────────────────────────────────
CURRENT=$(node -p "require('${PKG_JSON}').version")
IFS='.' read -r -a PARTS <<< "$CURRENT"
NEW_VERSION="${PARTS[0]}.${PARTS[1]}.$((PARTS[2] + 1))"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SCD Chart Release: ${CURRENT} → ${NEW_VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update package.json version
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('${PKG_JSON}', 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('${PKG_JSON}', JSON.stringify(pkg, null, 2) + '\n');
"
echo "[1/5] Version bumped to ${NEW_VERSION}"

# ── 2. Webpack production build ───────────────────────────────────────────────
echo "[2/5] Building..."
cd "${SCRIPT_DIR}"
NODE_OPTIONS="--max-old-space-size=4096" "${WEBPACK}" --mode production
echo "[2/5] Build complete"

# ── 3. Publish to npm ─────────────────────────────────────────────────────────
if [ "${SKIP_PUBLISH}" = "true" ]; then
  echo "[3/5] Skipping npm publish (--skip-publish flag set)"
else
  echo "[3/5] Publishing @clinicemr/esm-patient-scd-chart@${NEW_VERSION}..."
  npm publish --access public --ignore-scripts
  echo "[3/5] Published"
fi

# ── 4. Update distro spa-assemble-config.json ─────────────────────────────────
echo "[4/5] Updating ${ASSEMBLE_CONFIG}..."
node -e "
  const fs = require('fs');
  const cfg = JSON.parse(fs.readFileSync('${ASSEMBLE_CONFIG}', 'utf8'));
  cfg.frontendModules['@clinicemr/esm-patient-scd-chart'] = '${NEW_VERSION}';
  fs.writeFileSync('${ASSEMBLE_CONFIG}', JSON.stringify(cfg, null, 2) + '\n');
"
echo "[4/5] Distro config updated to ${NEW_VERSION}"

# ── 5. Rebuild Docker image ───────────────────────────────────────────────────
if [ "${NO_DOCKER}" = "true" ]; then
  echo "[5/5] Skipping Docker rebuild (--no-docker flag set)"
  echo ""
  echo "✓ Release ${NEW_VERSION} ready. Run manually when ready:"
  echo "  cd ${DISTRO_DIR} && docker compose build frontend --no-cache"
else
  echo "[5/5] Rebuilding Docker frontend image (no-cache)..."
  cd "${DISTRO_DIR}"
  docker compose build frontend --no-cache
  echo "[5/5] Docker image rebuilt"
  echo ""
  echo "✓ Release ${NEW_VERSION} complete. Restart the container:"
  echo "  docker compose up -d frontend"
fi
