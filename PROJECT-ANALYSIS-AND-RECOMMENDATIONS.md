# GitHub Repository Explorer — Project Analysis & Revival Recommendations

> **Prepared:** 2026-06-26 · **Status:** for owner review
> **Subject:** `github-repo-explorer` — a dormant vanilla-JS + Vite multi-page app (built Dec 29–30 2025; 104 commits; inactive ~6 months)
> **Method:** Multi-agent exploration workflow — 27 agents across 5 phases: 11 subsystem readers → 4 cross-cutting evaluators (premise, architecture, security, accessibility/performance) → 4 feature-ideation lenses + product synthesis → 3 dedicated design reviewers + a design director → 3 section writers. Findings below are evidence-linked to specific files and lines.
> **Goal of this document:** decide what it takes to turn a high-craft portfolio demo into a tool people actually return to, then use the approved subset to brief an implementation agent team.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Subsystem Scorecard](#subsystem-scorecard)
- [Part 1 — Premise & Execution Analysis](#part-1--premise--execution-analysis)
- [Part 2 — Feature Recommendations & Roadmap](#part-2--feature-recommendations--roadmap)
- [Part 3 — UI/UX & Design Recommendations](#part-3--uiux--design-recommendations)
- [Part 4 — Consolidated Roadmap & Implementation Workstreams](#part-4--consolidated-roadmap--implementation-workstreams)
- [Decisions Needed Before We Brief the Build Team](#decisions-needed-before-we-brief-the-build-team)
- [Appendix — How This Report Was Produced](#appendix--how-this-report-was-produced)

---

## Executive Summary

**The one-line verdict:** This is a genuinely above-average piece of engineering wearing a half-owned identity, solving a problem GitHub already solves — *except* for one judgment GitHub deliberately buries, which is exactly where the product should plant its flag. The bones are good enough to revive; the work is to **focus it, make its hero feature trustworthy, and commit to a design point of view.**

**What's strong (keep it):** layered XSS defense and a strict CSP on all 7 pages; a token-disciplined CSS system (937 `var()` vs 12 stray hex); real loading/empty/error state machines; ~718 passing tests on the risky pure-logic; a credible accessibility baseline; and two *actually-shipped* differentiators (Repository DNA, Pulse Dashboard) where most projects ship neither.

**What's wrong (the revival work):**
- **No focus.** Seven loosely-coupled surfaces serve four different half-users; roughly half the app (Search, Trending, raw Detail) is a strictly-worse reimplementation of native GitHub throttled at 60 requests/hour.
- **The hero feature lies.** Pulse — the "is this repo dying?" dashboard — presents *fabricated and broken* signals (synthetic momentum, a contributor card that renders everyone as "Unknown 0%", PRs polluting issue counts) as measured truth, and silently defaults to a confident green "stable" on missing data. For a trust tool, that is fatal.
- **No reason to return.** Every flow is one-shot; there is no watchlist, no change detection, no retention loop.
- **The design stops where the generic-AI default begins.** Strong typography and atmosphere, but a stock Zinc palette + a lone teal accent + zero industrial geometry — plus a keyboard focus ring that is silently broken app-wide and a contrast-failing light theme.

**The wedge to own (product vision):**

> *The fastest, most trustworthy way to decide whether to adopt and keep depending on an open-source repo — a synthesized, evidence-linked **Adopt / Avoid** verdict you can compare side-by-side, share as a dated artifact, and track over time. It owns the one judgment GitHub buries across five surfaces and that an ephemeral LLM chat can neither source nor persist.*

**Headline scorecard:**

| Dimension | Score | One-line read |
|---|:--:|---|
| Premise & product fit | **4/10** | Generic explorer is not viable; a narrow due-diligence wedge is |
| Architecture & code quality | **6/10** | Sound MPA, clean modules; debt is concentrated duplication — no rewrite needed |
| Security & robustness | **7/10** | Above-average hygiene; headline risk is a plaintext PAT in localStorage |
| Accessibility & performance | **7/10** | Strong baseline undercut by a broken focus ring and latent perf cliffs |
| Design maturity | **C+ / B−** | "Competent system, under-committed brand" — one decisive move from *designed* |

**If you do only five things:**
1. **Make Pulse trustworthy** — fix the four data defects and replace fake-green defaults with explicit *Unknown* states. Trust *is* the product.
2. **Commit the wedge** — build the **Adoption Verdict Report**, upgrade Compare into a **Decision Matrix** that picks a winner, add a **Watchlist** with change detection; demote the GitHub-duplicating surfaces to supporting nav.
3. **Fix the live accessibility failures** — restore the app-wide keyboard focus ring and muted-text contrast (both are real WCAG regressions), and **rebuild Health Score around maintenance, not popularity**.
4. **Beat the rate-limit cliff** — ship the global **token + live rate-limit drawer** and a **quota-aware request manager** (caching, AbortController, honest 429s). This unblocks everything past ~8 lookups/hour.
5. **Pick a design direction and commit** — recommended: **"Field Manual"** (industrial cartography). Geometry + palette + light-theme parity is what converts "templated" into "designed," and it reuses the strong type/atmosphere equity already built.

Two structural enablers underpin all of the above and should land early: **extract a shared nav + page-controller layer** (kills a whole cluster of drift bugs at once), and **stand up CI + a real deploy** (the app currently has neither).

---

## Subsystem Scorecard

Quality scores from the 11 parallel subsystem explorers (1–10). Detail and the "good vs superficial" breakdown for each are in [Part 1(c)](#c-execution-quality-per-subsystem).

| Subsystem | Score | Verdict |
|---|:--:|---|
| Project history & prior art | 8 | Unusually well-documented; planned features mostly built, not abandoned |
| Repository DNA visualization | 8 | Best-engineered module — but decorative, not informative |
| Core utilities & client state | 7 | Strong defensive code; unguarded localStorage writes are the soft spot |
| Core UI components | 7 | Clean factories; Health Score model is popularity-biased |
| CSS / styling architecture | 7 | Token-disciplined and flat-specificity; `components.css` bloated to 4,124 lines |
| Testing | 7 | Dense on pure logic; **zero page-controller coverage** |
| Build, config & security | 7 | Strict CSP, lean deps; no CI/CD, no deploy, outdated DOMPurify |
| API / data layer | 6 | One good retry envelope; stats endpoints bypass cache/retry entirely |
| Page controllers | 6 | Consistent state machine; heavy duplication drives real bugs |
| Pulse Dashboard | 6 | Excellent structure undermined by fabricated/broken signals |
| HTML & information architecture | 6 | Good semantics per page; no shared header → 7× duplicated chrome & drift |

---

## Part 1 — Premise & Execution Analysis

### (a) What the Project IS Today

A polished, backend-free, multi-page vanilla-JS + Vite application that wraps the GitHub REST API behind a "Cyber-Industrial" glassmorphism skin. It ships **seven** real entry pages (the docs still say six), a localStorage persistence layer, dark/light theming, and two signature differentiators — Repository DNA and the Pulse Dashboard — both of which were actually built to their phased plans rather than abandoned.

| Page | File | What it does | Demo vs Tool |
|------|------|--------------|--------------|
| Search | `index.html` / `src/js/search.js` | Repo search with language/star/sort filters, URL deep-linking, pagination, token modal | **Tool-grade** — cleanest controller; the only page with token entry |
| Trending | `trending.html` / `src/js/trending.js` | "Created in last 7 days" + category dropdown, rich empty states | **Demo** — strictly worse than GitHub's native Trending; no URL state |
| Favorites | `favorites.html` / `src/js/favorites.js` | localStorage list, remove-only cards | **Demo** — no pagination/sort/search, single `innerHTML` render |
| Detail | `detail.html` / `src/js/detail.js` | Repo deep-dive: languages, events, README, health, heatmap, clone, notes, DNA, embedded Pulse | **Mixed** — largest controller; embedded Pulse is miscomputed (see bugs) |
| Compare | `compare.html` / `src/js/compare.js` | 2–4 fixed text inputs, best-value highlighting | **Demo** — the most defensible wedge, least developed |
| Collections | `collections.html` / `src/js/collections.js` | CRUD + base64 share-link import/export with validation | **Tool-leaning** — real validation, but re-binds listeners every render |
| Pulse | `pulse.html` / `src/js/pulse.js` | Dedicated "is this repo dying?" vitals dashboard, six metrics + banners | **Aspires to tool, behaves like demo** — several signals fabricated/broken |

**Honest read:** this is a *high-craft portfolio piece*, not yet a tool people return to. The engineering hygiene (XSS defense, CSP, 718 tests, token discipline in CSS) is real and above-average. But the surface area is a grab-bag of seven loosely-coupled demos, the would-be hero feature (Pulse) presents fabricated data as measured truth, and there is **no retention loop** — every flow is one-shot. A stray scratch file (`pulse-animation-test.html`) still sits in the repo root, and the docs (`CLAUDE.md`, `README.md`) have drifted (claim 6 pages / 283 tests; reality is 7 pages / ~718 tests, dev port mismatch).

### (b) Premise & Product-Fit Verdict

**Verdict: the standalone "GitHub Explorer" premise is not sound in 2026, but a narrow, real wedge exists.** GitHub's own search, Insights, dependency graph, and in-product Copilot dominate generic browsing, and an unauthenticated client-side app capped at 60 req/hr cannot out-browse them. Worse, a developer asking "is this library maintained?" will increasingly just ask an LLM — so even the generic-explorer framing is under structural pressure.

The product currently serves *four different half-users* — casual discoverer (Search/Trending), personal curator (Favorites/Collections/Notes), dependency evaluator (Compare), and due-diligence user (Pulse/Health) — and fully serves none. Roughly half the real estate (Search, Trending, raw Detail) re-implements things GitHub does natively and better.

**The sharpest wedge** is the one thing GitHub deliberately does poorly: a synthesized, glanceable **"should I trust and adopt this repo?"** verdict, sitting next to **true side-by-side comparison**, backed by a **persistent watchlist** that diffs change over time. That maps to exactly one coherent user — a developer evaluating a dependency or doing OSS due diligence — and it is precisely what a one-off LLM chat cannot persist. The path is narrow but real: make Compare + Pulse the product, make Pulse trustworthy, require auth, add a reason to return, and cut the decorative/GitHub-duplicating surface. Product-fit score from the evaluation: **4/10**.

### (c) Execution Quality per Subsystem

| Subsystem | Score | Genuinely good | Superficial / weak |
|-----------|:----:|----------------|--------------------|
| API / data layer (`api.js`) | 6 | One `fetchWithRetry` envelope, correct UTF-8 base64 decode, jittered backoff, `Promise.allSettled` fan-out, rate-limit surfacing | Stats endpoints bypass the cache/retry path entirely; `STATS_CACHE_TTL_MS` is dead; FIFO (not LRU) cache; no timeout/AbortController; 429/Retry-After unhandled |
| Core utilities (`common.js`) | 7 | Defensive read guards, layered XSS defense, `getRequiredElement`, focus-trapped mobile nav | **No try/catch on any write** (QuotaExceededError breaks actions); `escapeHtml` doesn't escape quotes; inconsistent storage versioning; unbounded `stats.explored` growth |
| Page controllers | 6 | Consistent loading/error/empty state machine; URL deep-linking on search/compare; thoughtful Pulse banners | Heavy boilerplate duplication across 7 files; detail/pulse independently re-implement Pulse mapping (root of the high-sev bug); dead-end "add token in Settings" copy |
| Core UI components | 7 | Pure factories, DocumentFragment + delegation in RepoGrid, good defensive guards, JSDoc | HealthScore is popularity-biased (35% stars+forks); a11y gaps in heatmap/clone tabs/notes; two incompatible favorite-button schemas |
| Repository DNA | 8 | Strong modular split, seeded PRNG, high uniqueness surface, reduced-motion + IntersectionObserver gating | **Decorative, not informative**; not time-deterministic (`Date.now()`); the grid-safe badge path is dead code; retina-blur; animation leak |
| Pulse Dashboard | 6 | Excellent defensive structure, `allSettled` resilience, sound velocity + freshness math, XSS-safe DOM | **Bus factor broken, momentum fabricated, PR/issue conflation, 202 banner dead, defaults to "stable" on missing data** — fatal for a trust tool |
| CSS / styling | 7 | 937 `var()` vs 12 hex, flat specificity (0 IDs, 0 `!important`), cohesive aesthetic, real a11y baseline | `components.css` is 4124 lines (~35% one-off Pulse rules); duplicated dark-theme block; scattered breakpoints; status colors bypass semantic tokens |
| Testing | 7 | ~1210 assertions, high density on risky pure logic, security branches tested, deterministic harness | **Zero page-controller tests** (~1540 LOC unverified); `collections.test.js` tests an inline reimplementation, not the module; coverage gamed by exclusion |
| Build / config / security | 7 | Strict consistent CSP on all 7 pages, correct marked+DOMPurify pipeline, lean deps, no secrets committed | No CI/CD, no deploy config, DOMPurify outdated, meta-only CSP (no frame-ancestors), stray unprotected test file |
| HTML / IA | 6 | Semantic landmarks, skip links, tailored per-page metadata, contextual cross-links | **No shared header** → 7× duplicated chrome and drift; `index.html` has no `<h1>`; no `aria-current`; no favicon/OG metadata |

### (d) Architecture & Tech-Debt Assessment

The architecture is fundamentally sound for what it is: a static MPA with clean module boundaries (`api.js` → `common.js` → `components/` → page controllers), strong token-driven CSS, and a deliberate, *documented* rejection of SPA, proxy-state, and a markdown-parser library. **None of that warrants a rewrite.** The debt is concentrated and addressable in place.

The dominant structural problem is **duplication without a shared layer**, which is the single root cause behind a cluster of bugs:

- **No shared header/nav component** → ~115 lines duplicated byte-for-byte across 7 HTML files → the `pulse.html` active-class drift, missing `aria-current`, and unlabeled nav landmark.
- **No shared page-bootstrap / state-machine helper** → the init triple, theme toggle, element-grab block, and `showState()` are copy-pasted into all 7 controllers.
- **No single Pulse data-mapping function** → `detail.js` and `pulse.js` map `fetchPulseData` output differently, and `detail.js` maps it *wrong* (the high-severity bug below).

Pragmatic modernization path (in order, no gratuitous rewrite):

1. **Extract a shared nav** (build-time include or JS-rendered) — fixes 4+ a11y/IA defects at once and stops future drift.
2. **Extract one `mapPulseData()` and a `createPageController()` bootstrap** — kills the detail/pulse divergence and the controller boilerplate.
3. **Route stats endpoints through `fetchWithRetry`** — activates the dead `STATS_CACHE_TTL_MS`, gives them caching/backoff/rate-limit handling.
4. **Add `escapeAttr` + a safe `setItem` wrapper** in `common.js` — closes the quote-escape gap and the silent quota-failure class centrally.
5. **Pick up the genuinely-open, never-resolved items**: LRU cache, `RepoGrid.js` decomposition, AbortController, collection-picker listener cleanup, and page-controller/E2E test coverage.
6. **Stand up minimal CI** (`npm test` + `npm run build` + `npm audit`) and a deploy config with host-level headers.

### (e) Top Risks & Bugs (Prioritized)

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 1 | **Critical** | Pulse presents fabricated/broken signals as measured truth: synthetic momentum, broken bus factor, PR/issue conflation, defaults to "stable" on missing data — fatal for a trust tool | `src/js/pulse.js`, `PulseDashboard/PulseCalculator.js` | Fix the four data defects; replace "default stable/50" with explicit "Unknown / computing"; label estimates |
| 2 | **High** | `detail.js` passes raw `fetchPulseData` output to `calculateAllMetrics` without remapping → PR Health on empty array, Freshness loses `pushed_at` (→Infinity), momentum gets `repo=null`; diverges from `pulse.js` | `src/js/detail.js:83-86` | Extract one shared mapping fn (mirror `pulse.js:178-186`) and use it on both pages |
| 3 | **High** | Bus Factor card: `distribution` set to `sparklineData` (numbers), but `createContributorBars` expects `{login,percentage}` → every row "Unknown" at 0% | `src/js/pulse.js:211` | Plumb contributor logins; pass `[{login,percentage}]` |
| 4 | **High** | Long-lived GitHub PAT in plaintext `localStorage`, exfiltratable by any XSS to the only allowed `connect-src` (api.github.com) | `src/js/api.js:11`, `common.js:70-78` | Session-only/in-memory token mode; steer to fine-grained short-expiry PATs; long-term backend/OAuth proxy |
| 5 | **High** | HealthScore measures popularity, not health (35% stars+forks; activity collapses onto `pushed_at`); no "insufficient data" state | `src/js/components/HealthScore.js` | De-weight stars/forks; add archived/issue-ratio/contributor/release signals + unknown state |
| 6 | **Medium** | Unguarded `localStorage` writes throw uncaught on `QuotaExceededError`; compounded by unbounded `stats.explored` growth | `src/js/common.js:24-30,107,126-151,164` | Safe write wrapper: catch quota, toast, prune history |
| 7 | **Medium** | 202 "computing" flag stripped by `fetchPulseData`; banner is dead code; repos with uncomputed stats silently show "stable" | `src/js/api.js:464`, `pulse.js:157` | Preserve `{processing}` through fan-out; render explicit computing state |
| 8 | **Medium** | `/issues` returns PRs; never filtered by `pull_request` field → issue counts inflated, temperature skewed | `api.js:398`, `PulseCalculator.js:632` | Filter out items with a `pull_request` field |
| 9 | **Medium** | `dashboardData` shape diverges between detail.js and pulse.js for the same component → one page shows degraded sub-metrics | `src/js/detail.js:92-101` | Single shared mapping (same fix as #2) |
| 10 | **Medium** | `escapeHtml` doesn't escape quotes despite "attribute insertion" contract; RepoGrid `data-repo='…'` breakout risk | `common.js:412-417`, `RepoGrid.js:44-74` | Add `escapeAttr` (escape `"` and `'`) |
| 11 | **Medium** | DNA animation/observer leaks unless removed via `.remove()` monkey-patch | `RepositoryDNA/index.js:140-146` | Return explicit `destroy()` |
| 12 | **Low** | `index.html` has no `<h1>`; no `aria-current`; `pulse.html` mobile active-class drift | `index.html`, `pulse.html:100` | Shared nav + add `<h1>` and `aria-current="page"` |
| 13 | **Low** | DiscoveryStats injects language names into `innerHTML` unescaped (only component without `escapeHtml`) | `DiscoveryStats.js:54` | `escapeHtml(lang)` |
| 14 | **Low** | Doc drift + stray `pulse-animation-test.html` (no CSP, repo root) | `CLAUDE.md`, `pulse-animation-test.html` | Refresh docs to 7 pages/~718 tests; remove scratch file |

### (f) Scorecards & Most Important Fixes

**Security — 7/10.** Above-average hygiene for a backend-less app: strict consistent CSP across all 7 pages, correct marked+DOMPurify pipeline, `sanitizeUrl` allowlisting, pervasive `textContent` escaping. Headline gaps are the plaintext PAT and dependency currency.

| Most important fixes | Effort |
|---|---|
| Move token off `localStorage` (session-only mode now; backend/OAuth proxy later) | L |
| `npm audit fix` to bump DOMPurify (16 advisories) + add to CI | S |
| Add `escapeAttr` + safe `setItem` wrapper | M |
| Harden CSP (`object-src 'none'`, `base-uri 'self'`, `rel=noopener` on markdown links) | S |

**Accessibility — 7/10.** Genuinely strong baseline: global `prefers-reduced-motion`, forced-colors, skip links on every page, `:focus-visible`, focus-trapped mobile nav, `aria-live` counts, Pulse `meter`/ARIA roles. Concrete gaps remain.

| Most important fixes | Effort |
|---|---|
| Add `<h1>` to `index.html`; `aria-current="page"` + nav label via shared JS nav | M |
| Make CommitHeatmap / CloneCommands tabs / RepoNotes screen-reader & keyboard accessible | M |
| Audit muted-text contrast (`#9ca3af` ~2.5:1 light, `#64748b` ~4.3:1 dark likely fail AA); scope the AAA claim accurately | S |

**Performance — 7/10.** Headline "many animated canvases" risk is latent (DNA is single-instance, IntersectionObserver-gated). Real cliffs: marked+DOMPurify bundle into all 7 entries, DNA full-redraws 8 layers/frame with shadowBlur and no DPR scaling, unbounded favorites/collections renders, stats never cached, no AbortController, render-blocking font `@import`.

| Most important fixes | Effort |
|---|---|
| Dynamic-import the markdown pipeline so marked+DOMPurify ship only on `detail` (~20KB+ gzip off 6 pages) | S |
| Cache stats endpoints (wire up dead `STATS_CACHE_TTL_MS`) + add AbortController | M |
| Offscreen-cache DNA static layers + DPR scaling before any grid use | M |
| Paginate favorites/collections | S |

**Testing — 7/10.** Pure-logic and component layers are genuinely well tested (~1210 assertions, real value/DOM checks, XSS branches). Confidence gap is concentrated and somewhat hidden by coverage exclusions.

| Most important fixes | Effort |
|---|---|
| Add page-controller tests (`pulse`, `detail`, `search`, `compare`, etc.) covering loading/empty/error/404/202/rate-limit states | L |
| Rewrite `collections.test.js` to test the real module (currently tests an inline copy of the algorithm) | S |
| Remove the threshold-exclusion list + add `errorBoundary.js` tests so coverage reflects the shipping surface | M |
| Add Playwright E2E smoke for the 7 entries + a11y assertions | M |

## Part 2 — Feature Recommendations & Roadmap

### Product vision (the wedge)

**Be the fastest, most trustworthy way to decide whether to adopt and keep depending on an open-source repo** — a synthesized, evidence-linked *Adopt / Avoid* verdict you can compare side-by-side, share as a dated artifact, and track over time. This owns the one judgment GitHub buries across five surfaces (Search, Insights, dependency graph, contributors, releases) and that an ephemeral LLM chat can neither source nor persist. Everything below either makes that verdict *trustworthy*, makes it *comparable/shareable*, or gives the user a *reason to return* — and is anchored to the hard reality that an unauthenticated client gets **60 requests/hour** (10/min search), an authenticated one gets **5,000/hour** (30/min search), and Pulse alone fans out to ~6–7 endpoints per repo.

---

### (b) Must-haves — the price of being a genuinely useful daily tool

These are non-negotiable: without them the verdict is either untrustworthy, unreachable past the rate-limit cliff, or unshareable.

| Feature | Why it's a must-have | Builds on | Effort | API cost |
|---|---|---|---|---|
| **Make Pulse trustworthy** (fix fabricated signals + explicit *Unknown* states) | For a verdict tool, trust IS the product. Today the bus-factor card renders every contributor as "Unknown 0%", PRs pollute Issue Temperature, Community Momentum is a synthetic sine wave, half-window math flags healthy repos as declining, and missing/202/rate-limited data silently defaults to a confident green "stable/50". A fake-green dashboard actively misleads the exact decision it exists to support. | `PulseCalculator.js`, `pulse.js`, `fetchPulseData`, `getContributorStats`/`getIssueTimeline` | L | Neutral — same endpoints, correctness only |
| **Rebuild Health Score around maintenance, not popularity** | 35% of the current score is pure popularity (stars 25% + forks 10%) and activity collapses onto `pushed_at`. A large abandoned repo scores high; a small well-maintained one scores low — exactly backwards for adoption. Incorporate archived/disabled flags, open:closed ratio, time-to-first-response, contributor count, release cadence, plus an explicit "insufficient data" state. | `HealthScore.js` | M | Neutral — reuses Pulse fan-out fields |
| **Global settings drawer: token + live rate-limit on every page** | Removes the single biggest friction in the headline flow. Today a 403 on Detail/Pulse tells users to open a Settings panel *that does not exist on those pages*; authenticating lifts the ceiling 60 → 5,000 req/hr. A glanceable "X/5000, resets in Ym" readout everywhere is something github.com itself doesn't surface. | `search.js` settings modal, `Storage.getToken/setToken`, `checkRateLimit` envelope | M | Strongly positive — drives auth |
| **Quota-aware request manager** (AbortController, shared budget, honest 429/Retry-After, cache stats endpoints) | Stops Pulse self-DDoSing the 60 req/hr budget, cancels superseded searches, activates the dead `STATS_CACHE_TTL_MS`, and replaces the misleading "Forbidden: check your token" with accurate "try again in N seconds". | `fetchWithRetry`/`fetchPulseData`, stats endpoints, `errorBoundary.js` | M | Neutral-to-positive |
| **Deep-linkable state on every page + Back/Forward** | Shareable, bookmarkable URLs are the defining property of a tool people reopen and send to teammates. Today trending/favorites filters evaporate on reload and Back is a no-op. Also the substrate for command palette, saved searches, and verdict permalinks. | `search.js`/`compare.js` `URLSearchParams`, page controllers | M | None beyond existing (popstate hits the 5-min cache) |
| **Favorites & Collections management** (search/sort/paginate/bulk/export) | The unbounded-`innerHTML` curation pages become unusable at exactly the point of success. Add filter/sort/pagination, multi-select bulk actions, empty states, and one-click JSON/CSV/Markdown export for portability with zero lock-in. | `favorites.js`/`collections.js`, `RepoGrid` pager, `Storage` CRUD | M | Zero — operates on localStorage |
| **Releases & changelog tab on Detail** | "Is this actively shipping and what changed?" is a weekly adoption question, and `getReleaseHistory` is *already built* (api.js:442) yet currently wasted on Detail. Near-free win: tags, dates, badges, time-since-last-release, median-gap cadence. | `getReleaseHistory`, `renderMarkdown`, `detail.js` fan-out | S | One cached releases call per view |
| **Command palette (Cmd/Ctrl-K)** | Highest-signal power affordance: any page → any repo's vitals in two keystrokes, making the app habit-forming. Fuzzy-matches nav, favorites, and recent searches locally; only an explicit "search GitHub" action hits the API. | `debounce`/`Icons`, `searchRepositories`, `Storage`, mobile-nav focus-trap | M | Zero for nav/local; one debounced search on execute |
| **Advanced search query builder** (qualifiers UI) | Turns a worse-than-native search into a guided way to answer real evaluation questions ("maintained MIT Rust libs updated this year with good-first-issues") without memorizing qualifier syntax. | `searchRepositories`, `search.js` filters, `TRENDING_CATEGORIES` | M | Same one search call per query |
| **First-run onboarding + keyboard-shortcut help overlay** | Frames a seven-surface grab-bag around the wedge and heads off the rate-limit cliff with a token prompt before users hit it. | `showToast`/`Storage`, settings modal, focus-trap | S | Zero; encourages auth |

---

### (c) Differentiators — the signature features GitHub and an LLM structurally can't match

| Feature | Why it differentiates | Builds on | Effort | API cost |
|---|---|---|---|---|
| **Adoption Verdict Report** — the shareable "Should I depend on this?" page | The wedge itself: one plain-English *Adopt / Adopt-with-caution / Avoid / Insufficient-data* call synthesized from maintenance, cadence, real bus factor, issue responsiveness, license, and archived flags — each line evidence-linked with a confidence chip and an explicit *Unknown* row, ending in a copyable one-liner and `?repo=` permalink. Deterministic and auditable in a way a chat answer never is. | `fetchPulseData` + `calculateAllMetrics`, `HealthScore`, `?repo=` pattern | L | Reuses ~6 detail/pulse calls; near-zero net new if rendered on Detail |
| **Decision Matrix** — comparison that picks a winner and says why | GitHub has *no* multi-repo comparison at all — the most defensible "GitHub-can't-do-this" surface. Upgrade `compare.js` from a 2–4 input table to an unlimited, scored, opinionated recommender ("Pick fastify: actively maintained, MIT, bus factor 5 vs 1") with inline Pulse mini-cards and a "compare with alternatives" button. | `compare.js` (`findBestValue` + `repos=` deep-link exist), `HealthScore`, DNA badge | M | `getRepository` per repo (already done); lazy Pulse only when "compare health" expanded |
| **Repo Watchlist with change detection** — the retention loop | The single missing reason to return weekly. On each visit, diff lightweight signals (`pushed_at`, latest release, open-issue count, Pulse status) against the last localStorage snapshot: "react-foo went Stable→Cooling (no commits in 21 days)". Exactly the persistent job a stateless chat cannot do. | `Storage` favorites/collections, Pulse status calc, `DiscoveryStats` layout | L | ~2 cheap calls/repo/session, cached; full re-run opt-in (a *scheduled* version needs the backend) |
| **Saved searches with "new since last visit" counts** | The first retention hook on the discovery side. Pin a composed search, diff current top-result IDs against the snapshot, badge "N new repos match" — a no-backend change-signal GitHub has no equivalent for. | `Storage` CRUD pattern, `STORAGE_KEYS`, `search.js` | M | One search per execution, only when opened, cache-served; no background polling |
| **Bus Factor Constellation** — contributor concentration | Bus factor is a top adoption-risk signal invisible on github.com. Size contributors by commit share, highlight the smallest set covering 80%, and say it plainly: "One person wrote 71% of commits — high risk." Replaces the currently-broken Unknown-0% card. | `PulseCalculator` bus-factor calc (data-shape bug fixed), contributor stats | M | Reuses already-fetched contributor stats — zero net new |
| **Similar Repos ("More like this")** | The most-requested discovery action GitHub doesn't serve. Build a search from the seed's topics + language + star band, rank by a transparent overlap score with a one-line "why similar". Feeds the Decision Matrix. | `searchRepositories`, `getRepository` topics, `RepoGrid` | M | One cached, debounced search per panel |
| **Niche & Rising-Star trending** | GitHub trending is global/language-only and star-sorted, perpetually re-showing the same giants. Add topic-scoped trending and a velocity-relative-to-age "Rising Stars" rank that surfaces tomorrow's repos in *your* niche. | `getTrendingRepositories`, `TRENDING_CATEGORIES`, `trending.js` | M | 1–2 cacheable search calls per view |
| **Fork Network Voyager** — find the living fork | Solves a painful scenario GitHub makes nearly impossible: the original is abandoned but a fork is the true maintained successor. Fetch top forks, compute ahead/behind via `/compare`, rank by liveness, flag the de-facto maintained version. | new `getRepositoryForks` + `compareRefs` on `fetchWithRetry`, verdict scoring per fork | L | **~11 calls** (1 fork list + 1 compare per capped candidate); pre-filter, cache, gate behind token + explicit "analyze more forks" |
| **Shareable Verdict & DNA cards** (downloadable PNG + README badge) | Gives developers a polished artifact to justify a dependency in Slack/PR/README — carrying the explorer's visual identity and creating a loop back to the tool, while finally giving DNA a purpose beyond decoration. | `DNAExporter.js` (toBlob/clipboard already built), `createDNABadge()` (currently dead code) | M | Zero — client-side canvas from fetched data |
| **Repo Receipt** — point-in-time snapshot permalink | An auditable, dated, self-contained artifact ("Snapshot of owner/repo evaluated 2026-06-26: Stable, MIT, bus factor 3") serialized into a base64 URL fragment — no backend. Useful for code review, RFCs, compliance trails. | `collections.js` base64 + schema-validation pattern, verdict builder | S | Zero on share; one `getRepository` on "refresh to live" |
| **Contributable-issues finder** (good-first-issue, health-ranked) | Converts the app from pure evaluation into a contribution on-ramp ("what can I help with this week?"), ranking welcoming repos by maintainer responsiveness — and fixes the PR-in-issues bug. | `getIssueTimeline` (+ labels/state + `pull_request` filter), `RepoGrid` list | M | One `/issues` call per candidate, lazy + capped; PAT recommended |
| **Personalized "For You" recommendations** | A discovery feed built from already-tracked favorites/collections/exploration history, with "recommended because you favorited X" provenance — the reason to open this instead of github.com/trending. | exploration tracking + favorites + collections, `TRENDING_CATEGORIES` | L | 3–5 search/trending calls on load, cached; gate heavier refresh behind token |
| **Dependency / SBOM health peek on Detail** | A supply-chain x-ray: "before I adopt this, are ITS dependencies alive?" Reuse HealthScore per resolved dependency, flagging archived/stale/deprecated. | `getDependencySbom`/`getRepositoryContents`, `HealthScore`, `detail.js` | L | **High — the main constraint:** 1 SBOM + up to 1 `getRepository` per dep (20–50). **Requires a PAT**, cap to top N, lazy + persistent cache |
| **AI repo brief** (BYO-key, optional, privacy-flagged) | Compresses "understand this repo" into a 5-line structured brief sitting *next to* deterministic metrics — judgment + data together, persistable, not an open-ended chat. | `getRepositoryReadme`, `renderMarkdown`/DOMPurify | L | GitHub: reuses fetched README. LLM: user's key — **calling direct from the browser exposes the key; a thin proxy is the trustworthy path** |

---

### (d) Platform / infrastructure foundations

These exist because the GitHub API economics and the plaintext-PAT security model dictate them. The recurring theme: **a backend is optional until you need server-held credentials, scheduled work, or server-rendered link previews — and is mandatory for those three.**

- **CI/CD + static deploy config with HTTP security headers (S, no backend).** `.github/workflows/ci.yml` running `npm ci && npm test && npm run build && npm audit`, plus a static host (`_headers`/`netlify.toml`/`vercel.json`) shipping CSP via real HTTP headers so `frame-ancestors`/`X-Frame-Options`/HSTS/`X-Content-Type-Options` — which meta-tag CSP *cannot* set — finally apply. Adds `object-src 'none'` + `base-uri 'self'`, pins Node via `engines`/`.nvmrc`, removes the CSP-less `pulse-animation-test.html`, and adds Dependabot for the open DOMPurify advisory. *Rationale: moves the dormant app from "local portfolio repo" to a public URL gated by the existing test suite. No GitHub-quota cost.*

- **ETag conditional requests + persistent IndexedDB cache (M, no backend).** Two-tier (memory + IndexedDB) cache keyed by URL **and auth state**, storing `ETag`/`Last-Modified` and sending `If-None-Match` so **304s return cached bodies and do NOT count against the rate limit**. Routes stats endpoints through the shared path (activating the dead `STATS_CACHE_TTL_MS`). *Rationale: the durable fix for the quota cliff — re-opening a repo costs zero budget on unchanged data — and the base layer for PWA offline.*

- **GitHub GraphQL read layer for Pulse & Detail (L, needs auth).** A `graphql()` client collapsing the ~6–7 REST round-trips of `fetchPulseData` + detail aggregation into **~2 requests** (60–80% fewer), with PR-vs-issue separation built in and `rateLimit{cost,remaining,resetAt}` read into the existing envelope. *Rationale: makes the app quota-efficient enough to evaluate **many** repos per session instead of dying after ~8 lookups. GraphQL forbids unauthenticated access, so it dovetails with the token drawer — land that first.*

- **PWA: installable offline shell + cached views (M, no backend).** Web manifest + service worker (`vite-plugin-pwa`) precaching the 7 entries and runtime-caching GitHub responses stale-while-revalidate atop the ETag cache; favorites/collections/notes already work offline via localStorage. *Rationale: github.com is not installable or offline-capable for a curated evaluation workspace. Requires an icon/favicon set (none exist today).*

- **Privacy-respecting telemetry + error monitoring (S).** Wire `errorBoundary.js` to a self-hostable error monitor (surfacing the currently-silent `QuotaExceededError` write failures) plus cookieless analytics (Plausible/Umami). *Rationale: bugs that fail silently become visible, and usage evidence justifies cutting the GitHub-duplicating surfaces.*

- **OAuth Device Flow token broker — thin backend (XL). ← the backend boundary.** A minimal serverless function implementing GitHub Device Flow: the client secret never ships, the token is held server-side, and the browser gets a short-lived httpOnly SameSite session cookie. *Rationale: the **only** true fix for the highest-severity finding — a long-lived PAT in plaintext localStorage, stealable by any XSS and exfiltratable to the one allowed origin (api.github.com). One-click "Sign in with GitHub" replaces the scary token field, delivers 5,000 req/hr everywhere, and **unblocks GraphQL, account sync, and the OG service.** PAT-in-localStorage stays as an explicit "advanced / no-backend" fallback with an XSS warning.*

- **Optional account sync + scheduled watchlist/digest backend (XL, requires the auth backend).** Cloud sync of the curation layer keyed to GitHub user id, plus a server-side cron that snapshots Pulse/Health for watchlisted repos and powers a weekly digest. *Rationale: curation stops being one-cleared-cache from gone (today a `STORAGE_VERSION` bump silently wipes favorites), the digest is the strongest recurring return reason, and expensive Pulse fetches move server-side on a schedule with ETag conditional requests — sharply dropping per-user interactive quota.*

- **Thin share/OG-image service (L, requires the backend + deterministic-DNA fix).** Server-rendered Open Graph images for `/share?repo=` so verdict links unfurl richly in Slack/Twitter/Discord (the app currently has zero social metadata). *Rationale: client-only sharing can download/copy a card, but **auto-unfurling link previews need a host.** Low quota cost — viewers spend none.*

---

### (e) Prioritized roadmap

Tiers reflect dependency order and the rate-limit reality: **Now** establishes trust + the auth/quota foundation + the core verdict; **Next** builds the comparison, retention, and efficiency layers on top; **Later** holds high-value but quota-heavy or backend-dependent bets.

| Tier | Feature | Impact | Effort |
|---|---|---|---|
| **Now** | Make Pulse trustworthy (fix fabricated signals + Unknown states) | Very high | L |
| **Now** | Global settings drawer: token + live rate-limit on every page | Very high | M |
| **Now** | Quota-aware request manager + cache stats endpoints | High | M |
| **Now** | CI/CD pipeline + static deploy config with HTTP security headers | High | S |
| **Now** | Rebuild Health Score around maintenance, not popularity | High | M |
| **Now** | Deep-linkable state on every page + Back/Forward | High | M |
| **Now** | **Adoption Verdict Report** (the wedge) | Very high | L |
| **Now** | Releases & changelog tab on Detail | Medium | S |
| **Next** | Decision Matrix — comparison that picks a winner | Very high | M |
| **Next** | Repo Watchlist with change detection (retention loop) | Very high | L |
| **Next** | Favorites & Collections management (search/sort/paginate/bulk/export) | High | M |
| **Next** | ETag conditional requests + persistent IndexedDB cache | High | M |
| **Next** | GitHub GraphQL read layer for Pulse & Detail | High | L |
| **Next** | Bus Factor Constellation | High | M |
| **Next** | Command palette (Cmd/Ctrl-K) | High | M |
| **Next** | Similar Repos ("More like this") | High | M |
| **Next** | Saved searches with "new since last visit" counts | High | M |
| **Next** | Advanced search query builder (qualifiers UI) | Medium | M |
| **Next** | Shareable Verdict & DNA cards | Medium | M |
| **Next** | Niche & Rising-Star trending | Medium | M |
| **Next** | First-run onboarding + keyboard-shortcut help overlay | Medium | S |
| **Next** | PWA: installable offline shell + cached views | Medium | M |
| **Next** | Privacy-respecting telemetry + error monitoring | Medium | S |
| **Later** | Repo Receipt — point-in-time snapshot permalink | Medium | S |
| **Later** | Contributable-issues finder (health-ranked) | Medium | M |
| **Later** | Fork Network Voyager — find the living fork | High | L |
| **Later** | Personalized "For You" recommendations | Medium | L |
| **Later** | Dependency / SBOM health peek | Medium | L |
| **Later** | OAuth Device Flow token broker (thin backend) | Very high | XL |
| **Later** | Optional account sync + scheduled watchlist/digest backend | High | XL |
| **Later** | Thin share/OG-image service for verdicts & DNA | Medium | L |
| **Later** | AI repo brief (BYO-key) | Medium | L |

> **Sequencing note:** The auth backend (Device Flow) is the highest-*impact* infra item yet deliberately deferred to **Later** — it is the first server and should land only after the client-side wedge (trustworthy Pulse + Verdict + Decision Matrix + Watchlist) proves the product is worth signing into. Until then, the token drawer + GraphQL + ETag caching extract most of the 5,000 req/hr benefit with no server. Fork Voyager, For-You, and SBOM are quota-hungry and intentionally sit behind auth + the quota manager.

---

### (f) Considered & dropped

| Idea | Why dropped |
|---|---|
| **Repository DNA as a signature/identity feature** | Decorative, illegible without a legend, and non-deterministic (reads `Date.now()`, so the "fingerprint" changes daily) — the clearest symptom of demo-flash over user value. Demoted to an optional flourish; its only justified use is as the visual on shareable verdict cards/badges (after the determinism fix). |
| **Topic / Ecosystem force-graph map** | Repeats the "pretty visualization over substance" trap, costs 3–6 search calls per build against a 60 req/hr ceiling, and serves a weak job that Similar Repos + the query builder already cover more cheaply. |
| **Search / Trending / raw Detail as primary hero surfaces** | Strictly inferior reimplementations of native GitHub at 60 req/hr. Kept only as supporting navigation that feeds the verdict/compare wedge — not the product's center of gravity. |
| **Repo Q&A over README (BYO-key, XL)** | Lowest feasibility without a backend, XL effort, and largely redundant with the AI repo brief. Fold any near-term value into the brief; revisit only post-backend. |
| **Contributor Constellation as a cross-repo force graph (original framing)** | Infeasible at 60 req/hr (N calls per contributor across repos). Replaced by the single-repo, zero-net-call Bus Factor Constellation. |
| **Dynamic shields.io-style server-rendered badge (no-backend version)** | Impossible without a host. Replaced by a client-generated static "Adopt Score" PNG/SVG the user downloads; the live-rendered variant is deferred to the OG-image service. |
| **Gamified Discovery Journal / achievement badges / learning paths (original vision)** | Vague gamification with no clear evaluator value. The concrete, data-grounded retention substance is captured instead by the Watchlist, Saved Searches, and For-You recommendations. |

## Part 3 — UI/UX & Design Recommendations

### Current-State Verdict

This is a genuinely above-average vanilla-JS app wearing a half-owned identity. The invisible, hard work is done well: token discipline (937 `var()` references against just 12 stray hex values), real loading/empty/error state machines on every list page, a credible accessibility baseline (skip link, focus-trapped mobile nav, `prefers-reduced-motion` guards, a `forced-colors` block), and two shipped differentiators that most projects only promise — Repository DNA and the Pulse dashboard. The identity even has two real, distinctive axes: **TYPE** (mono-everywhere terminal treatment plus a Syne display face) and **ATMOSPHERE** (a fixed cyber grid, film grain, and gradient hairlines). Those read as "a careful person touched this."

The problem is that the brand stops exactly where the generic-AI default begins: **COLOR** and **GEOMETRY**. The palette is stock Tailwind/Zinc with a single teal accent — the single biggest "this was generated" tell — and despite the name "Cyber-Industrial," there is *zero* industrial geometry (clip-path count: 0; everything is 4–12px rounded rects softened by glass blur, which actually skews friendly-SaaS). The light theme is a contrast-failing second-class citizen, the keyboard focus ring is silently broken app-wide, and the two signature features are either undiscoverable or dead-end (clicking Pulse cold greets a first-time user with "Repository not found"). The system has earned the right to commit — it is one decisive move on geometry, palette, and light-theme parity away from feeling *designed* rather than *templated*.

**Design Maturity Grade: C+ (visual identity) / B- (overall)** — "competent system, under-committed brand." Engineering maturity is a solid B; the gap to an A is entirely decision-making courage on color and geometry, plus closing the accessibility and discoverability holes. The leverage here is unusually high because the typographic and atmospheric foundation is already strong enough to carry a real point of view.

---

### Top Cross-Cutting Issues (Ranked by Impact)

| # | Issue | Why It Matters | Severity |
|---|-------|----------------|----------|
| 1 | **Stock palette + zero geometry = the core generic-AI tell.** Zinc 900/800 neutrals, a lone teal-500 accent, verbatim Tailwind status colors, and all-rounded radii with glass blur. Two dead "Deep Purple/Electric Blue" hue tokens advertise an abandoned direction. | This is the line between "looks AI-generated" and "looks designed." Highest leverage because the type/atmosphere groundwork is already finished — only color and geometry are under-committed. | **Critical** |
| 2 | **Keyboard focus is silently broken on the most common control.** `main.css` sets `:focus-visible { outline:none; box-shadow: var(--shadow-focus) }` and loads *after* components.css, but `.btn`/`.card` use `overflow:hidden`, which clips a box-shadow ring — and `forced-colors` never paints box-shadow at all. | A real WCAG 2.4.7 regression on buttons, invisible in mouse testing. Compliance risk and a craft embarrassment against an otherwise-strong a11y layer. | **Critical** |
| 3 | **Light theme is a contrast-failing fallback, not a co-equal brand.** Light `--color-text-muted` (#9ca3af) lands at ~2.3–2.6:1 driving filter labels, footer, and placeholders; `--color-accent-subtle` is an opaque pale mint misused as a shadow in 6 places; grid/grain/glow evaporate on light grey. | Half the userbase gets an off-brand, partially non-compliant experience. The theme toggle currently *destroys* the identity instead of translating it. | **Major** |
| 4 | **The two signature features are undiscoverable or dead-end.** Pulse sits in global nav but errors without a `?repo` param; DNA renders into a bare container with no legend; Compare requires hand-typing owner/repo; Collections import/export isn't in the markup. Zero first-run onboarding. | The product's entire claim to distinctiveness is walled off from the discovery flow. Effort was spent on delighters nobody is routed to. | **Major** |
| 5 | **Hand-duplicated chrome across 7 pages is actively producing drift bugs.** The ~115-line header/mobile-nav is copy-pasted byte-for-byte. Already caused: a missing Pulse link, Settings only on `index.html`, a wrong active-class on `pulse.html`, and stagger off-by-ones. `index.html` has no `h1` at all. | Brand and a11y consistency can't hold across the surface; every header change is a 7× manual edit that will keep drifting. | **Major** |
| 6 | **Signature systems applied ad hoc.** Glow has no quantized scale (`0 0 5/8/10/15-20px` scattered); icons mix filled Octicons with stroke Feather; breakpoints sprawl across 11 values; two competing grid strategies fight with the auto-fill logic dead-coded. | Exactly the inconsistencies a craftsperson notices instantly. Individually minor, collectively they pin the system at "careful template" instead of "owned system." | **Minor** |

---

### Quick Wins (S-Effort, High-Impact)

- [ ] **Fix the global focus ring.** Remove `outline:none` at `main.css:109`; use `outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: 2px` (optionally plus the glow), and add a focus rule inside `@media (forced-colors: active)`. One change restores keyboard focus app-wide.
- [ ] **Raise muted-text contrast in both themes.** Light `--color-text-muted` #9ca3af → #6b7280 (≥4.6:1); dark #64748b → ~#8b99ad so it clears 4.5:1 on the #27272a tertiary surfaces it actually sits on. Make the search/select chevron SVG strokes `currentColor` instead of hardcoded #6b7280.
- [ ] **Meet the 44px touch target on filters.** Add `.input, .select { min-height: 44px }` to the existing `@media (max-width:1024px)` touch block.
- [ ] **Kill the worst first impression.** Convert param-less `pulse.html` from an error into a repo-picker empty state ("Choose a repository to see its pulse" + search box), *or* remove Pulse from global nav and keep only the contextual detail-header entry.
- [ ] **Fix Pulse wayfinding.** Patch `pulse.html:100` to `mobile-nav__link active` and add `aria-current="page"` to the active nav link (desktop + mobile) on all pages.
- [ ] **Seed the home empty state.** Add starter-query chips, a real Trending link, and an `h1` to `index.html` (currently zero `h1`).
- [ ] **Remove fossils.** Delete the two dead hue tokens (`theme.css:10-11`) and the stray, CSP-less `pulse-animation-test.html` from repo root.
- [ ] **Systematize glow.** Introduce `--glow-sm/md/lg` tokens and route every ad-hoc `0 0 Npx` glow through them; add a separate alpha-based `--color-glow` used in *both* themes to fix the opaque-mint light-mode halos.
- [ ] **Make DNA legible and honest.** Add a one-line DNA "what is this?" tooltip, and route Pulse status colors through `--color-success/warning/danger` instead of repeated raw rgba literals.

---

### Component-Level Fixes

| Component | Fix |
|-----------|-----|
| **Repo card / button geometry** (`.repo-card`, `.btn`) | Introduce chamfered corners via `clip-path` polygon (or a bracketed corner-tick key-line frame) and reduce `radius-lg` from 12px. The single highest-leverage visual change — typography already works; geometry is the missing axis. |
| **Shared header/nav** | Extract header + mobile-nav into ONE source (build-time include or a small JS render on every page) so nav items, active states, Settings access, and ARIA attributes can't drift. Promote the Settings/token gear into this shared header so rate-limit fixes are reachable everywhere. |
| **Repository DNA** | Add a hover/"?" legend explaining what shape/color/glow encode. Make generation time-invariant (remove `Date.now()` reads so the fingerprint is stable and cache-coherent), add `devicePixelRatio` scaling for retina, gate the rAF loop on `prefers-reduced-motion` in `DNARenderer.js` (CSS can't stop canvas), and return a real `destroy()` instead of monkey-patching `.remove()`. |
| **Pulse Dashboard** | Plumb `{login, percentage}` objects into `createContributorBars` (every bar currently shows "Unknown" at 0%). Label measured vs. estimated metrics honestly — momentum is a synthetic sine wave and the freshness sparkline is a decay curve. Change the missing-data default from "stable/50" to an explicit "unknown" state. |
| **Compare page** | Add an "Add to Compare" action on RepoGrid cards and the detail header that deep-links `compare.html?repos=`; allow seeding from Favorites; add per-input invalid states + a results-area error fallback; reflow the table into stacked per-repo cards below 640px. |
| **HealthScore** | Rebalance: 35% is currently pure popularity (stars 25% + forks 10%), and activity collapses onto `pushed_at` when commit data is absent. Add an "insufficient data" state instead of a confident-but-bogus number, and incorporate archived/disabled status and issue responsiveness. |
| **Toasts & detail loading** | Add an explicit dismiss control + ARIA live region to toasts (error toasts auto-vanish with no way to re-read). Replace plain "Loading README…"/"Loading activity…" text on `detail.html` with the existing `.skeleton` primitives. |
| **Grid & breakpoint system** | Pick ONE grid strategy (delete the dead intrinsic auto-fill OR the explicit column ladder; the 768=480 rule is pure redundancy) and consolidate the 11 scattered breakpoints onto the documented 360/480/640/768/1024/1280 ladder via shared tokens / `@custom-media`. |

---

### Design Directions

Three concrete directions follow. Each keeps the genuinely strong type-and-atmosphere equity while decisively fixing the two generic axes — color and geometry. All three explicitly reject the default dark + neon-teal + glassmorphism AI look.

---

#### Direction 1 — "Field Manual" (Industrial Cartography) ★ RECOMMENDED

**Concept.** Commit, finally, to the *Industrial* half of the name. Evolve the existing mono + grid + grain into a true technical-document system: this is a precision instrument's field manual, not a SaaS dashboard. Every surface becomes a spec sheet — parts lists, registration marks, stamped section numbers, hazard wayfinding. DNA and Pulse read as the "instrument readouts" the manual documents. Keeps 100% of the existing typographic and atmospheric equity while fixing the exact two things that read as generic.

**Palette.** Shift off stock Zinc to a cool-warm graphite, and treat light as first-class.

| Role | Dark | Light |
|------|------|-------|
| Base ink / ground | `#14181D` | `#ECE7DC` (warm drafting paper) |
| Surface | `#1B2127` | `#FFFFFF` |
| Raised | `#232B33` | `#FFFFFF` |
| Hairline | `#313B45` | `#D8D0C0` |
| Text | `#E8EBEE` | `#1A1F25` |
| Muted (≥4.5:1) | `#9BA6B2` | `#5C6671` |
| Primary action / wayfinding | Hazard amber `#F4B740` | Hazard amber `#F4B740` |
| Data viz / links / DNA secondary | Blueprint cyan `#4F8FC0` | Blueprint cyan `#4F8FC0` |
| Danger | Oxide red `#C5503A` | Oxide red `#C5503A` |
| Success | `#4F9D69` | `#4F9D69` |

The single teal accent is retired. On light, the grid and grain are *reborn* as faint blueprint-cyan plotter lines so the brand survives the toggle.

**Typography.** Keep **JetBrains Mono**, but *reserve* it for labels, metadata, numerals, and terminal prompt glyphs — where mono shines — not search inputs and buttons. Body moves to a workhorse grotesque (**Space Grotesk** free, or Söhne if licensed) for legible typed queries. Display swaps Syne for a condensed industrial face (**Saira Semi Condensed** 600/800) in tracked uppercase for a stencil/equipment-label feel. Strict modular scale (ratio 1.25) with stamped numeric section labels: `01 / SEARCH`.

**Motion.** Mechanical, not floaty. Snappy `ease-out` cubic (~180ms), no `translateY` hover-float — instead a 1px hairline "snap" and corner-tick illumination, like a plotter pen or a thrown switch. Skeletons become hazard-stripe sweeps. Honors reduced-motion natively.

**Signature moves.**
- Chamfered corners via `clip-path` on cards and primary buttons (replacing soft 12px radii) — the one move that converts friendly-SaaS into industrial.
- Bracket corner-ticks and crosshair registration marks framing key panels (DNA, Pulse, hero card) like a technical drawing.
- Dotted-leader metadata rows (`label .......... value`) like a parts list / index.
- Stamped section numbers and a hazard-amber "you-are-here" system that replaces teal everywhere.
- Hazard-stripe loading sweeps and a faint blueprint-cyan plotter grid that finally makes light mode on-brand.

**Best for.** The recommended path: lowest risk, highest leverage. It builds on the strongest existing equity (mono, grid, grain) and directly resolves both core critiques — stock palette and no geometry — without discarding shipped work.

---

#### Direction 2 — "Specimen" (Bio-Luminescent Lab)

**Concept.** Lean hard into the biology metaphor the app already invented. DNA and Pulse aren't decoration — they're the thesis. Repos are specimens; the app is a lab bench / natural-history catalog. Light-first "lab paper" with ink, contour-line topography instead of a tech grid, and a single bioluminescent accent that glows *only* on live data, so glow becomes meaningful rather than ambient. The Pulse heartbeat becomes the system's metronome.

**Palette.** Light-first.

| Role | Light | Dark |
|------|-------|------|
| Base (lab paper) | `#F6F4EF` | `#0A0C0B` (specimen jar) |
| Raised | `#FFFFFF` | `#12150F` |
| Hairline | `#E2DED4` | `#1E231C` |
| Text | `#15171A` | `#EDEFE8` |
| Muted (≥4.5:1) | `#5A6066` | `#9098A0` |
| Bioluminescent accent (live data only) | `#36D399` | `#36D399` |
| Editorial secondary | Deep-sea indigo `#283A8C` | `#283A8C` |
| Danger / at-risk | Vital coral `#FF6B5E` | `#FF6B5E` |

In dark mode the green reads as actual bioluminescence — the glow finally has a reason to exist.

**Typography.** Editorial-scientific. Display in a humanist serif (**Fraunces** or **Newsreader**) for a natural-history-catalog voice — a deliberate, confident departure from the AI-default geometric sans. Data and numerals in **IBM Plex Mono**; body in **IBM Plex Sans**. Scale leans into large specimen-label headings with small-caps mono captions.

**Motion.** Organic, breathing. A spring/ease with slight overshoot; the Pulse heartbeat (`sin`-based) becomes the global loading and idle metronome. Cards "settle" rather than snap. Reduced-motion replaces breathing with a single static frame.

**Signature moves.**
- Specimen-label cards: each repo framed like a museum/herbarium tag with a tear-edge or pinned corner.
- Contour-line topographic backgrounds (free-flowing isolines) replacing the CSS grid — organic, not technical.
- DNA reimagined as a wax-seal / specimen stamp with a real interactive legend, promoting it from art to identity mark.
- Bioluminescent glow used ONLY on live/active data so the signature effect carries meaning.
- Heartbeat-as-system: the Pulse vital-sign rhythm drives global loading, refresh, and live-data pings.

**Best for.** The boldest brand bet, and the one that most fully exploits the DNA/Pulse differentiators. Choose it if the team wants a memorable, ownable POV and can invest in serif/illustration polish and a light-first rebuild.

---

#### Direction 3 — "Phosphor" (CRT Terminal Maximalist) — Wildcard

**Concept.** The maximalist version of what's already there: go full retro-terminal. Monochrome phosphor with a single inverted accent, scanline texture, and unapologetic mono everywhere — but executed with restraint and real type craft so it reads as designed homage, not costume. A contrarian, instantly-recognizable identity for a developer-tool audience.

**Palette.** Dark-native, with a real "paper-terminal" inverse.

| Role | Dark (native) | Light inverse |
|------|---------------|---------------|
| Base | `#0B0E0B` | `#E8E6DC` (paper) |
| Surface | `#0F140F` | `#FFFFFF` |
| Phosphor text | `#B6F25C` | `#1B2416` (ink-green) |
| Muted (≥4.5:1) | `#6E8F4A` | `#4A5C3E` |
| Alert | Amber `#FFB000` | `#A66A00` |
| Critical (reserved) | Magenta `#E83AB0` | `#B0247E` |

**Typography.** Mono as the *entire* system, with hierarchy from weight/size/case rather than family — **JetBrains Mono** 400/700, generous tracking on uppercase labels, oversized numerals for stats. A single non-mono accent face only for the wordmark.

**Motion.** CRT-authentic but tasteful: a one-time power-on sweep on page load, cursor-blink for live regions, type-on reveals for result counts. All gated hard behind reduced-motion (scanlines and flicker off).

**Signature moves.**
- Subtle scanline + phosphor-bloom texture replacing grain (off in reduced-motion / high-contrast).
- Blinking block cursor on active inputs and live-data regions.
- Boxed ASCII-style key-line frames (corners drawn with line characters) around panels.
- Stats rendered as oversized phosphor numerals with type-on reveal.
- Magenta reserved as the single "critical" color so it lands with maximum weight.

**Best for.** A high-personality side bet for a pure dev audience. Highest risk on legibility/accessibility and the least flexible for the data-dense Pulse dashboard — present as the wildcard, not the default.

---

### Responsive & Mobile Recommendations

- **One breakpoint system.** Collapse the 11 sprawled values (359/479/480/600/639/640/767/768/900/1024/1280) onto the documented `360/480/640/768/1024/1280` ladder via shared tokens or `@custom-media`. Replace each near-duplicate (479→480, 600→640, 639→640, 767→768) to kill the off-by-one straddles that drive drift.
- **Pick one grid.** The intrinsic `auto-fill` grid is dead-coded by the explicit column ladder (the 768=480 rule is pure redundancy). Commit to one and delete the loser.
- **Touch targets.** Add `min-height:44px` to `.input`/`.select` in the existing mobile touch block — the filter dropdowns (~39px) currently miss the target the rest of the app enforces.
- **Adapt, don't shrink.** Reflow the Compare table from a tiny horizontally-scrolling grid into stacked per-repo cards below 640px — the weakest "shrink vs. adapt" case in the app.
- **Sticky-header offset.** Align `.main { scroll-margin-top }` with the *actual* mobile header height across the 640–767px band, where it's currently too small.
- **Extend fluid type.** Consider `clamp()` on the high-traffic `--text-sm/base/lg` UI tokens so buttons/nav/labels scale smoothly, and drop redundant per-element font-size overrides like `.page-title` at `max-639`.

### Accessibility Recommendations

- **Restore keyboard focus app-wide (do this first).** Replace `outline:none` + clipped box-shadow with a real `outline` (outlines ignore `overflow:hidden` and are honored in forced-colors), and add an explicit focus rule inside `@media (forced-colors: active)`. This is a live WCAG 2.4.7 failure on buttons.
- **Fix contrast in both themes.** Raise light `--color-text-muted` to ≥4.6:1 and dark muted to clear 4.5:1 on the #27272a tertiary surfaces it actually sits on. Make chevron SVG strokes theme-aware (`currentColor`).
- **Stop canvas motion for reduced-motion users.** CSS can't halt a `requestAnimationFrame` loop — gate the DNA, Pulse heartbeat, and heatmap render loops on `matchMedia('(prefers-reduced-motion: reduce)')` in JS and paint a single static frame, subscribing to the media query's `change` event.
- **Announce transient UI.** Give toasts a dismiss control and a proper ARIA live region so error messages can be re-read rather than auto-vanishing.
- **Wayfinding semantics.** Add `aria-current="page"` to the active nav link (desktop and mobile) on every page, and standardize the active class so Pulse stops losing its "you-are-here" highlight.
- **Document structure.** Give `index.html` an `h1` (it currently has none) and add a one-line explainer/tooltip to the DNA visualization so its meaning is available to all users, not just those who can decode the art.
- **Carry the brand through the toggle.** Whichever direction is chosen, design the light theme as a co-equal expression (grid/grain/glow translated, not dropped) and route glow through a shared alpha-based `--color-glow` token so it never renders as a flat opaque halo.

---

## Part 4 — Consolidated Roadmap & Implementation Workstreams

Parts 1–3 each carry their own prioritized list (bugs, features, design). This part **merges them into parallelizable workstreams** so the next step — briefing an implementation agent team — is a short hop. Each workstream is scoped to be owned by one or two specialist agents with clear dependencies, so several can run concurrently.

### Suggested v1 definition ("the wedge, shipped honestly")

> A developer pastes/searches a repo and gets a **trustworthy** Adoption Verdict (correct data or an honest *Unknown*), can put two repos side-by-side and see a recommended pick, can add it to a watchlist that flags change on return — all on a deployed URL behind CI, with the live accessibility failures fixed and one committed design direction. Everything else is post-v1.

### Workstreams

| ID | Workstream | Goal | Folds in (from Parts 1–3) | Suggested agent specialty | Depends on | Tier |
|----|-----------|------|---------------------------|---------------------------|-----------|------|
| **WS‑1** | **Data Trust & Correctness** | Every number is correct or honestly labeled *Unknown* | Fix Pulse signals (bugs #1,#3,#7,#8); single shared `mapPulseData()` (bugs #2,#9); rebuild Health Score on maintenance (bug #5); label measured vs estimated | `backend-architect` + `quality-engineer` | — | **Now** |
| **WS‑2** | **Platform & Quota Foundation** | Survive the 60 req/hr cliff; ship to a real URL | Quota-aware request manager (AbortController, honest 429/Retry-After); cache stats endpoints (activate dead `STATS_CACHE_TTL_MS`); `escapeAttr` + safe `setItem` (bugs #6,#10); CI (`npm ci/test/build/audit`) + static deploy with **HTTP** security headers + Dependabot/`npm audit fix`; *(Next)* ETag + IndexedDB two-tier cache | `devops-architect` + `backend-architect` | — | **Now** → Next |
| **WS‑3** | **Shared Shell & Navigation** | One source of truth for chrome + bootstrap; kills drift bugs | Extract shared header/nav (bug #12, design #5); `createPageController()` + `showState()` helper; deep-linkable state + Back/Forward on every page; global settings drawer (token + live rate-limit) in the shared header; `aria-current`; add `index.html` `<h1>` | `frontend-architect` | WS‑2 (rate-limit readout) | **Now** |
| **WS‑4** | **The Wedge — Product Surfaces** | Build the differentiated product on trustworthy data | Adoption Verdict Report; Decision Matrix (Compare upgrade + "add to compare" from cards/detail); Repo Watchlist w/ change detection; Releases & changelog tab (`getReleaseHistory` already built); Saved searches "new since last visit"; Bus Factor Constellation; Similar Repos; Command palette; shareable Verdict/DNA cards | `frontend-architect` + `requirements-analyst` (spec) | WS‑1, WS‑3 | **Now** (Verdict, Releases) → Next |
| **WS‑5** | **Design System Refresh** | Convert "templated" → "designed" | Commit a direction (**Field Manual** recommended); geometry (`clip-path` chamfers); palette off Zinc; **light-theme parity**; quantized glow tokens; one breakpoint ladder; one grid strategy; DNA legend + determinism fix; remove dead hue tokens | `frontend-design` skill + `frontend-architect` | **Design-direction decision** (gate); WS‑3 | **Now** (decision + quick wins) → Next |
| **WS‑6** | **Accessibility & QA Hardening** | Close live WCAG failures + the test gap | Restore focus ring app-wide + `forced-colors` rule (design #2); muted-text contrast both themes; 44px touch targets; **JS-gate canvas animations** on reduced-motion (DNA/Pulse/heatmap); toast dismiss + ARIA live; page-controller tests for all 7 entries; rewrite `collections.test.js` against the real module; Playwright E2E + a11y smoke; `DiscoveryStats` escape (bug #13) | `quality-engineer` + `frontend-architect` | — (quick wins immediate) | **Now** → Next |
| **WS‑7** | **Hygiene & Docs** | Remove fossils, fix drift | Delete stray CSP-less `pulse-animation-test.html`; refresh `CLAUDE.md`/`README.md` (7 pages / ~718 tests / correct dev port) | any (`technical-writer`) | — | **Now** (trivial) |
| **WS‑8** | **Backend Tier** *(deferred — the backend boundary)* | Server-held credentials, scheduled work, link previews | OAuth Device Flow token broker; GraphQL read layer (needs auth); account sync + scheduled watchlist/digest; OG-image service; Fork Voyager; For-You; SBOM peek; AI brief (BYO-key via proxy) | `backend-architect` + `devops-architect` | WS‑1…6 proving the product | **Later** |

### Dependency / sequencing at a glance

```
Now ─┬─ WS‑1 Data Trust ─────────────┐
     ├─ WS‑2 Platform/Quota ──┐       ├──► WS‑4 The Wedge (Verdict, Decision Matrix, Watchlist)
     ├─ WS‑3 Shared Shell ◄───┘       │
     ├─ WS‑6 a11y quick wins (focus ring, contrast)   │
     ├─ WS‑7 Hygiene                  │
     └─ WS‑5 design-direction DECISION ─► WS‑5 rollout │
Next ── ETag/IndexedDB · GraphQL · test coverage · remaining wedge surfaces · PWA · telemetry
Later ─ WS‑8 Backend (OAuth broker first) ─► account sync · digest · OG service · Fork Voyager · SBOM · AI
```

**Why this order:** WS‑1 and WS‑2 are independent and start immediately (data correctness; quota survival + deployability). WS‑3 lands the shared shell early because the wedge surfaces and the design refresh both build on it and it erases a cluster of drift bugs. WS‑4 (the actual product) needs trustworthy data (WS‑1) and deep-linking/shell (WS‑3). WS‑5 is gated on *your* design-direction choice but its accessibility quick wins (focus ring, contrast) are unconditional and urgent. WS‑8 (the first server) is deliberately last — prove the client-side wedge is worth signing into before standing up auth infrastructure.

---

## Decisions Needed Before We Brief the Build Team

These are the choices that change *what* the implementation prompt tells the agent team to build. Once you answer them, the workstreams above become a concrete, assignable brief.

1. **Confirm the wedge.** Commit to the **Adopt/Avoid due-diligence tool** and demote Search/Trending/raw-Detail to supporting navigation? Or keep it a broad general-purpose explorer? *(Recommendation: commit. It's the only framing with a real answer to "why not just GitHub or an LLM?")*
2. **Pick a design direction.** **Field Manual** (recommended — lowest risk, highest leverage, reuses existing equity), **Specimen** (boldest brand bet, leans into DNA/Pulse), **Phosphor** (high-personality wildcard), or a blend/other. This gates WS‑5.
3. **Backend appetite for v1.** Stay **no-backend** for v1 — token drawer + GraphQL + ETag caching capture most of the 5,000 req/hr benefit with zero server — and defer the OAuth broker (WS‑8) to a "product has proven out" milestone? Or commit to the backend now?
4. **v1 milestone scope.** Minimum viable revival ≈ WS‑1 + WS‑2 (CI/deploy/request manager) + WS‑3 + Adoption Verdict Report + a11y quick wins + the design-direction decision. Do you want v1 tighter (Verdict only) or wider (also Decision Matrix + Watchlist)?
5. **AI features — in or out?** The BYO-key "repo brief" needs a thin proxy to avoid leaking the user's key. Skip for v1, or scope a proxy?
6. **Repository DNA's fate.** Demote to a shareable-card/badge visual only (after the determinism fix), invest further, or drop it? *(Recommendation: demote — it's the best-engineered module but currently decoration; give it a job on the shareable verdict card.)*

> **Next step after your review:** pick answers to the six questions above (and flag any features in Part 2 to add or cut), and I'll turn the approved workstreams into a structured implementation prompt for an agent team — with per-stream task breakdowns, specialist assignments, dependencies, and acceptance criteria.

---

## Appendix — How This Report Was Produced

**Process.** A dynamic, multi-agent workflow (27 agents, ~1.77M agent tokens across two runs) ran in five phases: subsystem exploration (11 parallel readers, each returning a structured map), cross-cutting evaluation (4 evaluators), feature ideation (4 lenses → 1 product synthesis, 32 prioritized items), dedicated design review (3 reviewers → 1 design director, 3 directions), and report writing (3 section writers). The orchestrator assembled the sections and authored the executive summary, scorecards, and this consolidated roadmap.

**Prior art incorporated (so nothing here re-recommends what was already done or rejected):** `README.md`, `CLAUDE.md`, `agents.md`, `feature-ideas.md`, `AltCoder-review.md`, `AltCoder-follow-up.md`, `docs/` (DNA + Pulse implementation plans), and `archive/` (planning notes + prior Claude/Codex reviews). Of the 5 original "standout" ideas, DNA and Pulse were built; Fork Voyager, Contributor Constellation, and Discovery Journal were not — and the analysis above sharpens or replaces each rather than restating it.

**A note on confidence.** Design and code findings are derived from reading the actual source (CSS, HTML, JS) and are cited to files/lines throughout. They were **not** validated against a live render or real GitHub API responses; a short follow-up pass running the app with screenshots + a real token would confirm the visual and rate-limit findings before implementation. Line numbers reflect the repo state at the time of analysis and should be re-checked at edit time.
