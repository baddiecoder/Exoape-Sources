# Methodology

## Phase 1: Acquisition (minimal)

- Collect only engine-relevant assets.
- Avoid recursive crawling and non-essential media.
- Keep raw capture local and uncommitted.

## Phase 2: Signature indexing

For each target, index:

- RAF/ticker (`requestAnimationFrame`, `gsap.ticker`, `.raf(`)
- scroll engine (`advance`, `lerp`, `wheel`, `touch`, `ResizeObserver`)
- state (`setMenuOpen`, `setQuoteOpen`, class toggles)
- transitions (`beforeEach`, `afterEach`, `page:loading`, `leave`, `enter`)
- menu (`menuOpen`, burger handlers, GSAP open/close)
- loader (`intro`, `loading`, `progress`, unlock points)

## Phase 3: Control-flow tracing

Start at known anchors and trace both directions:

- bottom-up (who calls this?)
- top-down (what does this function trigger?)

Output edge list:

`producer -> transport (call/event/state) -> consumer`

## Phase 4: Module classification

Tag modules into:

- CORE_RUNTIME
- SCROLL_ENGINE
- RAF_ENGINE
- STATE_STORE
- ROUTER_TRANSITION
- LOADER
- MENU_NAV
- CURSOR
- SECTION_COMPONENT
- VENDOR

## Phase 5: Cross-site synthesis

Compare same module classes across sites and log:

- common core
- variant implementation
- site-specific behavior

Do not update canonical architecture unless at least two independent evidence chains support the change.
