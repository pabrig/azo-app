#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

required=(
  index.html
  package.json
  src/main.tsx
  src/config.ts
  public/assets/cna-insignia.png
  public/docs/AR_VELA_LIGERA.docx
  public/docs/IR_VELA_LIGERA.docx
  vercel.json
  .env.example
)

for f in "${required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "missing required file: $f" >&2
    exit 1
  fi
done

python3 -m json.tool vercel.json >/dev/null
python3 -m json.tool package.json >/dev/null

if ! grep -q 'src="/src/main.tsx"' index.html; then
  echo "index.html does not load the Vite entry" >&2
  exit 1
fi

# Pattern is split so this script does not match itself.
secret_pat="sk_live_|sk[-]ant[-]|ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----"
if git grep -nE "$secret_pat" -- . ':!.github/**' ':!scripts/ci-check.sh' ':!package-lock.json'; then
  echo "possible high-risk secret in tracked files" >&2
  exit 1
fi

echo "ci-check ok"
