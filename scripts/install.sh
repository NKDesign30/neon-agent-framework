#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Neon Agent Framework installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/NKDesign30/neon-agent-framework/main/scripts/install.sh | bash
  bash scripts/install.sh --no-onboard

Options:
  --no-onboard       Install CLI only
  --install-daemon   Run onboarding with daemon install
  --help            Show help
USAGE
}

NO_ONBOARD=0
INSTALL_DAEMON=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-onboard)
      NO_ONBOARD=1
      shift
      ;;
    --install-daemon)
      INSTALL_DAEMON=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 22.16+ or Node 24." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required." >&2
  exit 1
fi

NEON_AGENT_PACKAGE="${NEON_AGENT_PACKAGE:-github:NKDesign30/neon-agent-framework#v0.1.13}"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Packing $NEON_AGENT_PACKAGE..."
PACK_OUTPUT="$(cd "$TMP_DIR" && npm pack "$NEON_AGENT_PACKAGE" --silent)"
TARBALL="$(printf '%s\n' "$PACK_OUTPUT" | tail -n 1)"
npm install -g "$TMP_DIR/$TARBALL"

if [[ "$NO_ONBOARD" == "1" ]]; then
  echo "Installed. Run: neon onboard"
  exit 0
fi

if [[ "$INSTALL_DAEMON" == "1" ]]; then
  neon onboard --install-daemon
else
  neon onboard
fi
