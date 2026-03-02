#!/usr/bin/env bash
set -euo pipefail

npm run build

if [ ! -d "android" ]; then
  npx cap add android
fi

npm run cap:sync:android
test -d android

echo "[mobile-bootstrap] PASS"
