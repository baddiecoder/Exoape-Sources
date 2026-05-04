# Exoape Runtime Lab

A focused reverse-engineering workspace for extracting and codifying reusable motion/runtime architecture patterns.

## Mission

We are **not broad scraping** websites. We are identifying reusable architecture patterns:

- fixed viewport shell
- internal scroll surface
- custom input normalization
- RAF/ticker ownership
- global state/event bus
- GSAP timeline orchestration
- overlay/menu/loader/cursor state planes

## Scope

Priority targets:

1. `exoape.com`
2. `fluid.glass`
3. `inversa.com`
4. `aebeleinteriors.com`

## Starter workflow

1. Build/refresh target-local `asset-map.md`.
2. Generate `signature-index.md` from current local files.
3. Build `control-flow-map.md` from known anchors (`advance`, `requestAnimationFrame`, `setMenuOpen`, etc).
4. Produce `module-classification.md` and `unknowns.md`.
5. Update `synthesis/architecture-canonical.md` only when evidence supports changes.

## Confidence model

Every claim in reports must be labeled:

- `exact`
- `observed`
- `inferred`
- `unknown`

See `docs/confidence-scale.md`.

## Security and auth

Do **not** script token extraction from local browsers/keychains.
Use explicit secret injection only (env vars, GitHub Actions secrets, or GitHub App).

See `docs/authentication-and-github-settings.md`.
