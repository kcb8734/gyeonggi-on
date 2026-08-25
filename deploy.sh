#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
echo "cwd=$(pwd)"
exec node "$ROOT/scripts/deploy-prod.mjs"
