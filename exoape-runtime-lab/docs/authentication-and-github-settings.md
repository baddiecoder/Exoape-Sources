# Authentication and GitHub Settings (Simple + Flexible)

## Important safety rule

Do **not** use scripts to extract tokens from local browsers, keychains, or device storage.
That is insecure and brittle.

Use one of these supported methods:

## Recommended auth options

### Option A (best for automation): GitHub App token
- Short-lived
- Narrow permissions
- Easy rotation
- Good for CI and bots

### Option B (simple developer setup): Fine-grained PAT
- Scope to one repo/org
- Minimal permissions (contents: read/write; pull requests: write)
- Store in CI secret or password manager

### Option C (SSH deploy key for push-only automation)
- One key per repo
- Limited blast radius
- Good for script-only pushes

## Mobile-friendly workflow (no local CLI required)

1. Keep code changes in remote branch via web editor or CI job dispatch.
2. Use GitHub Actions `workflow_dispatch` to run analysis/scaffold tasks.
3. Store auth in GitHub Secrets (`LAB_PAT` or GitHub App credentials).
4. Let Actions perform push/PR actions.

## Minimal GitHub repo settings (recommended)

### General
- Visibility: your preference (private while developing)
- Enable Issues and Discussions (optional)

### Branch protection (main)
- Require pull request before merge
- Require at least 1 approval
- Require status checks to pass
- Restrict direct pushes to `main`
- Allow auto-merge (optional)

### Actions
- Allow local and reusable workflows
- Set default workflow permissions to **Read repository contents**
- Grant per-workflow write only when needed

### Secrets and variables
- Add `LAB_PAT` (if using PAT)
- Or GitHub App credentials (`APP_ID`, `APP_PRIVATE_KEY`, `APP_INSTALLATION_ID`)
- Never print secrets in logs

### Security
- Enable secret scanning and push protection
- Enable Dependabot alerts (optional)

## Permissions baseline for this lab

- `contents: read` by default
- `contents: write` only for publish/push workflows
- `pull-requests: write` only if PR automation is needed

## First authorization test (safe)

Use a tiny workflow that:
1. checks out repository
2. creates/updates `exoape-runtime-lab/.auth-test.txt`
3. commits with bot identity
4. pushes to `chore/auth-test`

This validates auth without exposing credentials or touching production files.
