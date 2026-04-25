# Full Crawl Artifact Policy

The full source-recovery crawl has already been executed for this branch.

The generated crawl artifacts are too large to keep in a pull request that needs human review, so heavy output directories/files are intentionally ignored in git.

Ignored heavy artifacts:
- `raw/`
- `extracted/`
- `maps/`
- `reconstructed/`
- `logs/`
- `reports/assets.json`

The committed crawl summary remains in `reports/inventory.md` and is the reviewable source of truth for what was captured.

If full artifacts are needed again, share them outside the main PR flow (for example as a zip, a release asset, or a separate artifact branch).
