#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

required=(
  index.html
  app.js
  appwrite-config.example.js
  manifest.json
  vercel.json
  assets/cna-insignia.png
)

for f in "${required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "missing required file: $f" >&2
    exit 1
  fi
done

python3 -m json.tool manifest.json >/dev/null
python3 -m json.tool vercel.json >/dev/null

if ! grep -q 'script src="app.js"' index.html; then
  echo "index.html does not load app.js" >&2
  exit 1
fi

if ! grep -q 'script src="appwrite-config.js"' index.html; then
  echo "index.html does not load appwrite-config.js" >&2
  exit 1
fi

if git grep -nE 'sk_live_|sk-ant-|ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----' -- . ':!.github/**' >/dev/null; then
  echo "possible high-risk secret in tracked files" >&2
  git grep -nE 'sk_live_|sk-ant-|ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----' -- . ':!.github/**' >&2 || true
  exit 1
fi

echo "ci-check ok"
