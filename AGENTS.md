# AGENTS.md — Clone Check

> Mandatory reading for every fresh-context worker. These invariants survive
> context resets: if you only read one file before touching code, read this.
> The defining failure mode of this product is a **false-green** — a verdict
> that implies a repo is safe/good when the data does not support it. Do not
> create one.

## What this repo is

**Clone Check** — a trustworthy *"should I clone this starter?"* due-diligence
engine for vibe coders. ONE deterministic pure-function `verdict()` engine →
TWO co-equal v1 surfaces: an **MCP server** (`clone_check(repo)`) and a warm,
light-first **website**. No LLM calls in v1 — deterministic rule-based
templating only.

The definition of done lives in [`validation-contract.md`](./validation-contract.md):
51 black-box assertions, each claimed by exactly one feature.

## Commands

```bash
npm install        # or `npm ci` for a clean, lockfile-exact install
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # Production build to dist/
npm run preview    # Preview the production build
npm test           # Vitest run once (CI mode)
npm run test:watch # Vitest watch mode
npm run test:coverage
```

Every feature ends with `npm ci && npm test && npm run build && npm audit`
passing locally before handoff (HC-9). CI is a hard merge gate.

## Hard Invariants (HC-1 … HC-13) — verbatim, non-negotiable

| # | Invariant | Why | Assertions |
|---|---|---|---|
| HC-1 | **Never assert "Safe."** The maximum positive label is exactly `Looks clone-able`. The strings "Safe" / "Safe to clone" must never appear as a verdict value in engine output, render output, share card, or MCP output. | This is a heuristic due-diligence aid, never a security guarantee. A false-green is the cheapest thing a troll can manufacture and screenshot. | VC-ENGINE-03, VC-WEB-04, D9 |
| HC-2 | **Never positive on missing data.** It must be structurally impossible to render `Looks clone-able` when any headline signal (maintenance/license/bus-factor/slop) is missing/Unknown — fall back to `Not enough signal` or a cautionary state. | The single mistake that kills a trust product is a friendly face on an untrustworthy engine. | VC-ENGINE-02, sequencing gate |
| HC-3 | **Dated heuristic disclaimer rides every verdict and every share card** — "heuristic check, not a security audit — verify before you ship." | Liability containment; a cropped screenshot must never imply a safety claim. | VC-ENGINE-06, VC-WEB-04, VC-SHARE-01 |
| HC-4 | **Gameable signals are worded as likelihoods, never facts** — "looks abandoned (initial-commit-only history)", "has CLAUDE.md — likely agent-friendly". Never "is slop" / "your agent will grok this". | Laundering a heuristic as fact to a non-dev audience that cannot interrogate it is the exact failure D6 exists to prevent. | VC-ENGINE-05, VC-SLOP-01, VC-AIREADY-01 |
| HC-5 | **GitHub rate-limit discipline.** Headline verdict comes from ≤2 cheap calls (repo metadata + one commits list). Expensive participation/contributor/commit-activity stats are opt-in behind "show the receipts" — never on initial render. No feature may fan out >~3 calls/repo for the no-token path. | 60 req/hr unauth is the real ceiling; launch-day novel URLs concentrate load. | VC-DATA-01, VC-DATA-05, VC-CACHE-01 |
| HC-6 | **Honest failure modes.** 202/empty-`{}` stats degrade to explicit `computing`/`Unknown` — never a fabricated number or default green. On 429/Retry-After show "try again in N seconds" — never "Forbidden: check your token". Cancel superseded requests via AbortController. | The verified failure modes of the existing stats endpoints (`api.js:464`) brick the headline on the highest-traffic day if mishandled. | VC-DATA-03, VC-PLATFORM-03 |
| HC-7 | **Token / security rules.** No GitHub token is required for the core flow (no login, no token, no BYO-key). The serverless cache is **SHA-keyed, never a shared single-PAT proxy** (ToS gray zone + global launch-day cliff). Per-user OAuth is M6-only, never a v1 wall. Plaintext-PAT-in-localStorage (the `api.js:11` / `common.js:70-78` liability) must not be reintroduced. | Avoids the shared-token cliff and the exfiltration class flagged in the report. | backendStance, D4, VC-CACHE-01 |
| HC-8 | **Security headers are real HTTP headers, not meta tags** — CSP + `frame-ancestors`, `X-Content-Type-Options`, `object-src 'none'`, `base-uri 'self'`. Add `escapeAttr` (escapes both quote types) and a safe `setItem` wrapper catching `QuotaExceededError`. | Meta-tag CSP cannot set frame-ancestors/HSTS; the `escapeHtml` quote gap (`common.js:412-417`) is an attribute-breakout risk. | VC-PLATFORM-02, VC-PLATFORM-04 |
| HC-9 | **Keep the test suite green; commit per feature.** Every feature ends with `npm ci && npm test && npm run build && npm audit` passing locally before handoff. CI is a hard merge gate — a red pipeline blocks the milestone. One coherent commit per feature, coordinated through git (handoffs happen through commits + shared artifacts, not a live conversation). | Workers iterate to "believe it's correct" then hand off; the green suite + CI gate is what the next fresh-context worker trusts. | VC-PLATFORM-01, VC-QA-01/02 |
| HC-10 | **NO scope creep beyond the contract.** Build only what a validation-contract assertion claims. Specifically: the context block stays a bounded block (NOT a whole-repo GitIngest ingest); DNA is share-card watermark ONLY (out of the verdict/eval flow); 2-up Compare, command palette, query builder, Fork Network Voyager, deep SBOM, generative-LLM verdict, BYO-key, Watchlist, full Decision Matrix are all CUT from v1. Workers must not "refactor" assets that don't exist — M1 is greenfield (HealthScore.js is DOM-coupled at `:121`; there is no verdict engine, slop detector, stack-fit, AI-readiness, or contents API today). | Combination products are the easiest to clone; scope discipline is what makes the run converge. | cuts list, D1, D5, D7 |
| HC-11 | **Two design registers, kept honest.** Calm/warm/plain-language in-app with explicit Unknowns and **no A-F grade and no bare 0-100 score in-app**; the A-F grade lives on the share card ONLY. The alive-glow is a **freshness** indicator (renders on data fresher than a stamped threshold, live OR recently-rebuilt cache), NOT a live-vs-cached flag. | A live-only glow would be absent on the cached first-run shelf that converts — self-defeating and dishonest. Virality must not erode in-app trust. | VC-DESIGN-02, VC-DESIGN-03, D3 |
| HC-12 | **Disk logs redact secrets and are excluded from VCS/CI.** The QA harness writes logs to a documented filesystem path with secrets redacted. Remove the fossil `pulse-animation-test.html`; refresh `CLAUDE.md`/`README.md` to the Clone Check product, correct page/test counts, and dev port. | Black-box testability is Factory's #1 named failure cause; secret leakage via logs is the cost of getting it wrong. | VC-QA-01, VC-HYGIENE-01 |
| HC-13 | **Own the response to a false-green.** Every verdict (web + share card + MCP) carries a "Report this verdict" path; the SHA cache has an authenticated kill-switch that withdraws/recomputes a single verdict globally with no redeploy; a public `/how-it-works` methodology page is linked from every verdict; an `INCIDENT-PLAYBOOK.md` is committed. The product never claims safety — it owns the *correction*. | A viral false-positive screenshot is the cheapest attack on a trust product; the disclaimer alone cannot respond to it. Owner-decided: containment ships in v1. | VC-CONTAIN-01..04, false-green ship gate |

### The two invariants that ride every surface (restated)

1. **Never assert "Safe."** Max positive label is `Looks clone-able` (HC-1).
2. **Never render a positive verdict on missing data** — missing maintenance /
   license / bus-factor / slop → `Not enough signal` or cautionary (HC-2).
3. The `verdict()` engine is a **PURE function** (no DOM, no `fetch`) that all
   surfaces wrap. Every surface renders the verdict object; none recomputes.
4. **Redact secrets from any disk logs** (HC-12).

## The four verdict states (the ONLY allowed labels)

`Looks clone-able` · `Clone with care` · `Skip it` · `Not enough signal`

No bare 0–100 score in-app. No A–F grade in-app (share card only).

## File map

| Path | Purpose |
|---|---|
| `validation-contract.md` | The 51-assertion definition of done. Load-bearing. |
| `AGENTS.md` | This file — hard invariants for fresh-context workers. |
| `src/js/engine/` | **Greenfield** home of the pure `verdict()` engine (F1.1+). No DOM, no fetch. |
| `src/js/api.js` | GitHub REST wrapper + the new contents API calls (F1.2). |
| `src/js/common.js` | Storage, escaping (`escapeAttr`), UI helpers. |
| `src/js/constants.js` | Config: API, caching, pagination, storage keys. |
| `src/js/components/HealthScore.js` | DOM-coupled legacy scorer (`:121`). The pure engine is authored fresh, NOT refactored from this. |
| `src/js/components/PulseDashboard/PulseCalculator.js` | Pulse metric math (F1.3 PR/issue split). |
| `src/js/pulse.js` | Pulse page controller (F1.3 bus-factor `{login,percentage}` fix). |
| `src/js/__tests__/` | Vitest suite + `setup.js` (jsdom). |
| `*.html` (index, trending, favorites, detail, compare, collections, pulse) | Vite multi-page entry points. |
| `logs/` | QA harness disk-log path (F1.5) — secrets redacted, git-ignored (HC-12). |
| `PROJECT-ANALYSIS-AND-RECOMMENDATIONS.md` | The current-state audit + bug ledger the assertions close. |

## Architecture choice (deliberate, do not "modernize")

Vanilla-JS multi-page Vite 7 + Vitest 4 app. **Do NOT introduce React / Vue /
a router / a state library.** The vanilla multi-page architecture is a
documented, intentional choice.

## Sequencing gates (do not pull work forward)

1. **M1 → M3:** `VC-ENGINE-01..06`, `VC-DATA-01..05`, `VC-CONTENTS-01` must be
   GREEN before any verdict-rendering web feature validates.
2. **False-green ship gate:** `VC-ENGINE-02/03/06`, `VC-WEB-04`, `VC-SHARE-01`,
   `VC-CONTAIN-02`, `VC-CONTAIN-03` must all pass before the public surface goes
   live.
