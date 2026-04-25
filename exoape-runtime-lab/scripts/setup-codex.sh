#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT"/{docs,targets,reports,synthesis,tools,schemas,prompts,.codex,scripts,evidence/snippets,capture}
mkdir -p "$ROOT"/reports/{fluid,exoape,inversa,aebele}
mkdir -p "$ROOT"/capture/{fluid,exoape,inversa,aebele}

if [[ ! -f "$ROOT/.codex/settings.json" && -f "$ROOT/.codex/settings.example.json" ]]; then
  cp "$ROOT/.codex/settings.example.json" "$ROOT/.codex/settings.json"
fi

echo "Codex runtime-lab scaffold ensured at: $ROOT"
