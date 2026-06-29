#!/usr/bin/env bash
# Gate local antes de deploy — build + testes unitários (+ E2E opcional)
set -euo pipefail

echo "==> build"
npm run build

echo "==> unit tests"
npm test

if [[ "${RUN_E2E:-}" == "1" ]]; then
  echo "==> e2e smoke (E2E_SMOKE=1)"
  export E2E_SMOKE=1
  npm run test:e2e
fi

echo "Smoke local OK."
