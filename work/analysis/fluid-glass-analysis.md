# fluid.glass targeted extraction + architecture analysis

Target analyzed: `https://fluid.glass`  
Method: single-page Puppeteer interception + keyword filtering + source-map probing.

## 1) Extraction stats

- Total captured assets: **22**
- Total JS files: **20**
- Filtered files (keyword hits): **12**
- Source maps: **0/20 found** (`not-found` for all JS targets)
- `sourcesContent` availability: **none observed**

## 2) Framework detection

- **Nuxt/Vue confirmed** (**exact**):
  - Runtime bundle exports include Nuxt page/runtime symbols and `NuxtPage` plumbing.
  - `window.__NUXT__` hydration path appears in the main bundle.
- **Rendering mode**: **SSR-hydrated SPA pattern** (**observed/inferred**):
  - Nuxt hydration/root boot path is present.
  - Client-side transition and route orchestration are handled in runtime JS.

## 3) Engine systems found

### Scroll system

- **Internal smooth-scroll engine detected (Lenis-like implementation)** (**exact**):
  - Virtual scroll class, wheel/touch normalization, `scrollTo`, and inertial interpolation logic appear in `CH-ncNjb`.
- **Fixed viewport shell + internal scroll container** (**observed/inferred**):
  - App-level overlay/menu/quote states are toggled by root classes while animation hooks run through central app runtime.
- **RAF loop present** (**exact**):
  - `requestAnimationFrame` loop dispatches a global `window:raf` hook each frame.

### Animation system

- **GSAP present** (**exact**):
  - `timeline`, `fromTo`, `ScrollTrigger` patterns occur across components and in core runtime.
- **Timeline orchestration** (**observed**):
  - Components attach to shared lifecycle hooks (`window:raf`, resize hooks, menu enter/leave hooks), creating coordinated timelines.

### Overlay system

- **Overlay layer present** (**exact**):
  - App root toggles overlay/menu/filter/quote states with global classes.
- **Transition mechanism** (**exact/observed**):
  - Overlay panels animate via GSAP `fromTo/to`, with enter/leave handlers and shared state store flags.

### Loader system

- **Preload/intro logic** (**observed**):
  - Intro/cookie/player/quote/menu are all controlled from a centralized app shell.
- **Progress tracking** (**exact for video/player, inferred for global loader)**:
  - Explicit player progress controls exist.
  - A full asset preloader progress pipeline was not directly recovered in this pass.

### Menu system

- **Open/close mechanism** (**exact**):
  - Shared store `menuOpen` flag toggles menu transitions and overlay classing.
- **State classes** (**exact**):
  - Root class toggles include menu/overlay/footer states.

## 4) Key files (engine-likely)

1. `work/sources/fluid/filtered/CH-ncNjb-5945dc603f65.js`
   - Core smooth-scroll, RAF dispatch, app orchestration.
2. `work/sources/fluid/filtered/Bss2-XLh-bcff349a3642.js`
   - Main Nuxt runtime/app bundle; global hooks/components/transitions.
3. `work/sources/fluid/filtered/B_8cjYaO-7593d8985a39.js`
   - ScrollTrigger-driven media/asset choreography.
4. `work/sources/fluid/filtered/BXbsi62n-c90d5c5c0399.js`
   - Timeline-driven section transforms/parallax-style movement.
5. `work/sources/fluid/filtered/BfuieHRu-133ec8acc49e.js`
   - Footer + scroll-reactive visibility/state coupling.

## 5) Confidence levels

- **Exact**: Nuxt/Vue runtime, RAF loop, GSAP usage, overlay/menu state machinery.
- **Observed**: component-level timeline choreography; app-shell transition coordination.
- **Inferred**: strict fixed-shell + internal container architecture alignment (high likelihood from runtime behavior and hook structure).
- **Unknown**: full original source intent (no source maps); hidden/unloaded route-specific modules not fetched in single-page pass.

## 6) Cross-check vs Exoape expectations

Expectation | fluid.glass status | Confidence
---|---|---
Fixed shell | Present via root app class orchestration and panel overlays | observed/inferred
Scroll container | Present via Lenis-like internal scroll abstraction | exact/observed
Overlay system | Strongly present (menu, quote panel, filter/player overlays) | exact
Loader system | Intro/experience shell present; full preloader progress not fully isolated | observed/inferred

### Conclusion

`fluid.glass` **matches Exoape-style architecture strongly** on scroll/RAF/timeline/overlay/menu orchestration. Remaining gap is source-level clarity for loader internals due to unavailable source maps and single-page-only capture scope.
