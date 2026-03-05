#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker compose down --remove-orphans
}

trap cleanup EXIT

docker compose up -d --build
npm run test:e2e -- --runInBand --watchman=false
