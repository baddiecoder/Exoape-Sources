# Current Branch Operating Prompt

You are operating in:
- repo: `baddiecoder/Exoape-Sources`
- branch: `codex/runtime-lab-scaffold`
- workspace: `exoape-runtime-lab/`

## Non-negotiables
- Do not create a new repo.
- Do not reset history.
- Do not delete existing evidence/reports.
- Do not commit raw captures under `capture/*/raw`.
- Do not broad scrape.
- Do not extract credentials/tokens/cookies from browsers or local keychains.

## Read order (every session)
1. `exoape-runtime-lab/README.md`
2. `exoape-runtime-lab/docs/methodology.md`
3. `exoape-runtime-lab/docs/confidence-scale.md`
4. `exoape-runtime-lab/docs/authentication-and-github-settings.md`
5. `exoape-runtime-lab/targets/sites.yaml`
6. `exoape-runtime-lab/targets/priorities.yaml`
7. `exoape-runtime-lab/targets/signatures.yaml`
8. `exoape-runtime-lab/prompts/system-prompt.md`
9. `exoape-runtime-lab/prompts/task-template.md`

## Required reporting style
- Evidence snippets must be <=20 lines.
- Every claim must be marked: exact / observed / inferred / unknown.
- Do not treat keyword hits as proof of architecture ownership.
- Prefer producer -> transport -> consumer traces.

## Preferred command sequence
1. `bash exoape-runtime-lab/scripts/setup-codex.sh`
2. `npm install || true`
3. `npm run scan -- --site <site>`
4. `npm run trace -- --site <site>`
5. `npm run classify -- --site <site>`
6. `npm run evidence -- --site <site>`
