#!/usr/bin/env bash
# verify.sh - runs the project tests and exits 0 on success.
set -euo pipefail
cd "$(dirname "$0")"

echo "== verify.sh: starting =="

# Prefer npm test if npm is available and node_modules isn't required for it.
if command -v npm >/dev/null 2>&1; then
  echo "== running npm test =="
  npm test
else
  echo "== npm not found, running basic shell checks =="
  node --test test/
fi

# Basic shell checks: key files must exist.
for f in package.json inquiries.json fetch-inquiries.mjs build-inquiries.mjs; do
  test -f "$f" || { echo "MISSING: $f" >&2; exit 1; }
  echo "ok: $f"
done

echo "== verify.sh: all checks passed =="
exit 0
