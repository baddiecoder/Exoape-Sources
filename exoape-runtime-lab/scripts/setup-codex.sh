#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"

SITES=(fluid exoape inversa aebele)

log() { printf '[setup-codex] %s\n' "$*"; }

log "Ensuring runtime-lab scaffold in: $ROOT"

# Core dirs
mkdir -p "$ROOT"/{docs,targets,reports,synthesis,tools,schemas,prompts,.codex,scripts,evidence/snippets,evidence/seeds,capture}

# Site-scoped dirs (idempotent; never delete)
for site in "${SITES[@]}"; do
  mkdir -p "$ROOT/reports/$site"
  mkdir -p "$ROOT/capture/$site"/{raw,filtered,reports}
  mkdir -p "$ROOT/evidence/snippets/$site"
done

# Local codex config materialization
if [[ ! -f "$ROOT/.codex/settings.json" && -f "$ROOT/.codex/settings.example.json" ]]; then
  cp "$ROOT/.codex/settings.example.json" "$ROOT/.codex/settings.json"
  log "Created .codex/settings.json from example"
fi

# Validate essential docs exist
required_files=(
  "$ROOT/README.md"
  "$ROOT/docs/methodology.md"
  "$ROOT/docs/confidence-scale.md"
  "$ROOT/docs/authentication-and-github-settings.md"
  "$ROOT/targets/sites.yaml"
  "$ROOT/targets/priorities.yaml"
  "$ROOT/prompts/system-prompt.md"
  "$ROOT/prompts/task-template.md"
)

missing=0
for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    log "Missing required file: ${f#$REPO_ROOT/}"
    missing=1
  fi
done

if [[ $missing -eq 1 ]]; then
  log "Scaffold check incomplete: missing required files above"
  exit 1
fi

# package.json guard (repo root)
if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  log "No repo-root package.json found; creating minimal package.json"
  cat > "$REPO_ROOT/package.json" <<'JSON'
{
  "name": "exoape-sources",
  "private": true,
  "type": "module"
}
JSON
fi

cat <<MSG

[setup-codex] ✅ Scaffold ready

Next commands:
  1) npm install || true
  2) npm run scan -- --site fluid
  3) npm run trace -- --site fluid
  4) npm run classify -- --site fluid
  5) npm run evidence -- --site fluid

Safety reminders:
  - Never commit capture/*/raw artifacts.
  - Never commit media dumps or source-map bulk dumps.
  - Keep snippets <=20 lines and confidence-labeled.
MSG
