# Clone Check — Factory Mission Brief

> **What this is:** the complete brief to paste into Factory's desktop app via `/enter-mission` (the "missions" option) to kick off the long autonomous build. It is the **input to Droid's planning conversation**, not a script — Droid should read it whole, propose a plan (validation contract first, then milestones → features), ask its clarifying questions, then enter Mission Control. See *§7 — Guardrails, Config & Operating Instructions* for recommended model/effort settings, and the opening of *§1* for "how to use this brief."
>
> **Provenance:** generated 2026-06-26 by a two-track review workflow — a 6-persona debate panel (positions → rebuttals → adversarial red-team → chair consensus) decided the product; a parallel research track produced the companion *Factory Missions Authoring Playbook*; a blueprint architect + 7 section writers produced this brief. The product decisions are recorded in `EXPERIMENT-PANEL-CONSENSUS.md`; the structural rationale in `FACTORY-MISSIONS-PLAYBOOK.md`.

## Mission at a Glance

| | |
|---|---|
| **Product** | **Clone Check** — a trustworthy *"should I clone this starter?"* engine for vibe coders |
| **Killer job** | "My agent / a tweet / an awesome-list told me to clone this starter — before I burn my weekend, is it maintained-or-slop, does it fit my stack, will my agent understand it, and give me a brief so it doesn't faceplant." |
| **Audience** | Vibe coders first (~63%-non-dev; Next.js/Supabase/Tailwind/shadcn stack gravity); developers second (the demoted "show the receipts" Pulse layer) |
| **Shape** | ONE deterministic pure-function `verdict()` engine → TWO co-equal v1 surfaces: an **MCP server** (`clone_check(repo)` in Cursor/Claude Code) + a warm, light-first **website** |
| **Verdict states** | *Looks clone-able · Clone with care · Skip it · Not enough signal* — **never "Safe," never positive on missing data** |
| **Backend** | In v1: MCP server + serverless **SHA-keyed verdict cache** + CI/deploy with real HTTP headers. (Per-user OAuth deferred; shared-PAT proxy rejected.) |
| **AI in v1** | None. Deterministic rule-based templating only; the "copy context for your agent" block is deterministic assembly. |
| **Design** | Light-first, warm, shadcn-familiar front door + one freshness "alive-glow" accent; loud memetic share card with a dated "not a security audit" footer. (DNA demoted to share-card watermark only.) |
| **Cut from v1** | 2-up Compare (returns once the SHA cache makes novel-URL comparison affordable) |
| **Milestones** | M1 Data-Trust Engine → M2 Platform/Quota/Backend (MCP + SHA cache + CI) → M3 Clone Check web surface → M4 Design rollout → M5 A11y & QA → M6 (optional) power-user backend |
| **Validation contract** | 51 behavioral assertions (see §2) — both scrutiny + user-testing validation stay ON; trust gates are hard pre-ship gates |
| **Owner decisions (resolved)** | (1) serverless backend in v1 → **YES** (M2); (2) viral false-positive → **containment in v1** — report path · cache kill-switch · public methodology page · incident playbook (see §2 Group H, F2.5, HC-13) |

## Brief Contents

1. **§1 — Mission Overview & Product Vision** (intent, the blend, the killer job, scope honesty, how to use this brief)
2. **§2 — Validation Contract** (the 51 testable behavioral assertions = definition of done)
3. **§3 — Product Spec** (the verdict engine, the four differentiators, both surfaces, flow by flow)
4. **§4 — Existing Codebase, Architecture & Required Fixes** (what's really there vs. greenfield; bugs to fix)
5. **§5 — Milestone & Feature Execution Plan** (the dependency-ordered backbone)
6. **§6 — Design System & Experience** (the light-first direction, the share card, a11y/responsive)
7. **§7 — Guardrails, Config & Operating Instructions** (constraints, skills, Factory model/effort config, how to run & steer)

---

## Mission Overview & Product Vision

Droid — this section orients you before you author the validation contract. Read it for intent and tone, not as a spec; the testable assertions and feature decomposition live in later sections.

### The Mission in One Paragraph

Build **Clone Check**: a trustworthy "should I clone this starter?" due-diligence tool for vibe coders, built around ONE deterministic pure-function `verdict()` engine and exposed through TWO co-equal v1 surfaces — an **MCP server** an agent calls as `clone_check(repo)` pre-clone, and a warm, light-first, shadcn-familiar **website** that renders the same engine as a plain-English verdict. A user pastes a novel or trending GitHub URL (no login, no token) or picks from a date-stamped curated starters shelf and, in seconds, sees stack-fit matched to a one-time 3-chip stack picker, maintenance/license/bus-factor in plain words, a likelihood-worded AI-readiness badge and slop caution, copies a paste-ready agent brief, can expand "show the receipts" for the pro metric view, and can share a stamped, DNA-watermarked, dated verdict card — all backed by a serverless SHA-keyed cache that survives launch-day traffic, shipped to a public URL behind CI with the live accessibility failures fixed. This is a **greenfield value-prop build** on top of an existing 7-page Vite/vanilla-JS demo — **not a reskin**.

### Product Vision: Due-Diligence Core × Vibe-Coder Mode

The product is the blend of two things the market currently sells separately:

- **The Adopt/Avoid due-diligence core** — a sourced, auditable, reproducible verdict that answers "is this maintained-or-slop, and can I trust it?" An LLM chat structurally cannot source, persist, cite, or reproduce its answer. That auditability is the moat, so the verdict stays **deterministic rule-based templating** — no LLM calls in v1.
- **Vibe-coder mode** — that same engine rendered jargon-off, ending in a paste-block (web) or a direct hand-off (MCP) to the user's AI agent. Four states, no bare score in-app: **Looks clone-able / Clone with care / Skip it / Not enough signal.**

Two hard product invariants ride every surface and must survive into your contract:

| Invariant | Why it is non-negotiable |
|---|---|
| Never assert "Safe" — max positive label is "Looks clone-able" | This is a heuristic aid, never a security guarantee; a false-green is the cheapest thing a troll can manufacture and screenshot |
| Structurally impossible to render positive on missing data | Missing maintenance/license/bus-factor/slop → "Not enough signal" or cautionary, never the positive label |
| Gameable signals worded as likelihoods | "looks abandoned (initial-commit-only history)" not "is slop"; "has CLAUDE.md — likely agent-friendly" not "your agent will grok this" |
| A dated "heuristic check, not a security audit" disclaimer on every verdict AND share card | A cropped screenshot must never imply a safety guarantee |

### Who It Is For, and the One Killer Use-Case

**Vibe coders first** (a ~63%-non-developer audience whose stack gravity is Next.js / Supabase / Tailwind / shadcn), and **developers broadly** second — the dev-second audience is served by the demoted "show the receipts" Pulse layer, not by the front door.

The single killer job, which every feature must serve:

> "My agent / a tweet / a YouTube video / an awesome-list told me to clone this starter — before I burn my weekend, is it maintained-or-slop, does it fit my stack, will my agent understand it, and give me a brief so it doesn't faceplant."

Template/starter **selection + agent priming** — not abstract dependency adoption, not a code tour. The user is already inside Cursor/Claude Code at this moment, which is exactly why the MCP tool is a co-equal v1 surface and not an afterthought.

### How Success Is Judged (High Level)

Detailed, testable assertions follow in the Validation Contract section. At the altitude of this mission, "done" means:

- [ ] The pure `verdict()` engine exists and is provably deterministic, DOM/fetch-free, and cannot emit a positive verdict on missing data or the word "Safe."
- [ ] The four greenfield differentiators — slop detector (with squashed-history false-positive guard), stack-fit matcher, AI-readiness check, deterministic context block — exist and are exercisable, because **none of them exist today.**
- [ ] Both surfaces render the same verdict for the same repo+SHA: the MCP `clone_check` tool (working on novel repos in-agent, no web detour, no token) and the warm web surface.
- [ ] It ships to a public URL behind a CI gate, with real HTTP security headers, a SHA-keyed serverless cache that survives launch-day novel URLs, and the live WCAG regressions fixed.
- [ ] The three end-to-end flows pass: cold novel-URL, in-agent parity, and first-run stack-fit.

The failure mode that matters most: **a false-green.** This is a trust product. Keep both scrutiny and user-testing validation ON; treat the trust gates as hard pre-ship gates, not polish.

### Scope Honesty (Read This Before You Estimate)

This is greenfield on top of a demo, and you must plan it as such. The existing `HealthScore.js` is DOM-coupled (it calls `createElement` around line 121); there is no verdict engine, no slop detector, no stack-fit matcher, no AI-readiness check, and no contents API in the current `src/js/api.js`. Do not let a worker narrate a "refactor" of an asset that isn't there. The concrete build detail and current-state audit are on disk at `/Users/ambrealismwork/Desktop/coding-projects/github-repo-explorer/PROJECT-ANALYSIS-AND-RECOMMENDATIONS.md` — draw on it when authoring features.

A second sequencing non-negotiable: **the trustworthy engine (data-correctness + the four states + explicit Unknowns + the cheap-tier headline) MUST land before the warm web surface is built on it.** Shipping a friendly face on an untrustworthy engine is the single mistake that kills this product. Enforce that ordering; do not let a worker pull verdict-render work forward.

### How to Use This Brief

This document is the input to your **planning conversation** — not a command to execute and not an implementation design. Your job now, in order:

1. **Read the whole brief**, including the Validation Contract, the milestone decomposition, and the QA-harness requirements.
2. **Propose a plan**: author the validation contract first (behavioral, black-box, user-observable assertions with stable IDs), then decompose into features-within-milestones where every assertion is claimed by exactly one feature.
3. **Ask your clarifying questions and push back.** I have pre-answered as much as I can; surface anything still ambiguous. The two previously owner-gated items are now DECIDED (backend-in-v1: yes; false-positive: containment ships in v1 — see §7 step 3 and Group H); the only human task left open is designating the on-call owner who operates the verdict kill-switch.
4. **Then enter Mission Control** once the plan is approved, and run the milestones with the fix-feature re-validation loop.

Where this brief and the codebase disagree, the codebase wins — investigate and tell me. Where the brief states a product invariant (never "Safe," never-positive-on-missing-data, deterministic engine, MCP as co-equal v1), hold firm: those are decided, not open.

## Validation Contract — Definition of Done

Droid: this is the load-bearing artifact of the mission. Adopt this checklist verbatim as `validation-contract.md` before you decompose a single feature. Every assertion below is a black-box-observable, pass/fail behavior — no subjective adjectives, no "looks good." The coverage invariant is total: **every assertion ID here must be claimed by exactly one feature's `fulfills` — no orphans, no duplicates.** User-testing validators will exercise these against the running web surface AND the MCP tool; scrutiny validators will check the engine internals. Keep `skipScrutiny=OFF` and `skipUserTesting=OFF`.

**Two hard gates override normal milestone convergence:**

1. **Sequencing gate (M1 → M3):** All of `VC-ENGINE-01..06`, `VC-DATA-01..05`, and `VC-CONTENTS-01` must be GREEN before any verdict-rendering web feature (the M3 `VC-WEB-*` set) is allowed to validate. A friendly face on an untrustworthy engine is the one failure that kills the product. Do not let a worker pull verdict-render work ahead of the trust core.
2. **False-green ship gate:** `VC-ENGINE-02`, `VC-ENGINE-03`, `VC-ENGINE-06`, `VC-WEB-04`, `VC-SHARE-01`, `VC-CONTAIN-02`, and `VC-CONTAIN-03` must ALL pass before the warm surface is exposed at a public URL — you may not go live without the ability to pull a bad verdict (`VC-CONTAIN-02`) and a public methodology page (`VC-CONTAIN-03`). This is a liability gate, not polish.

Each assertion is stated as **Behavior** (the pass/fail condition) and **Evidence** (what a validator must collect). Where a code path is named, the affected modules are `src/js/api.js` (data layer + new contents calls), `src/js/components/HealthScore.js` (DOM-coupled today — the pure engine is authored fresh, not refactored from it), and `src/js/common.js` (storage/escaping). See `/Users/ambrealismwork/Desktop/coding-projects/github-repo-explorer/PROJECT-ANALYSIS-AND-RECOMMENDATIONS.md` for the underlying bug ledger these assertions close.

---

### Group A — Data Trust (engine purity + data correctness)

These are the integrity guarantees of the deterministic `verdict()` core and the cheap-tier data layer feeding it.

**VC-ENGINE-01 — `verdict()` is a pure function.**
- *Behavior:* Calling `verdict()` twice with identical repo-data input yields byte-identical structured output. The engine module references no DOM (`document`/`window`) and performs no network `fetch`.
- *Evidence:* Unit test asserting deep-equality across two runs; static grep showing zero `document`/`window`/`fetch` references in the engine module; terminal output of the passing test run.

**VC-ENGINE-02 — Never positive on missing data.**
- *Behavior:* When any required headline signal (maintenance, license, bus factor, slop) is missing or Unknown, `verdict()` cannot return `Looks clone-able`; it returns `Not enough signal` or a cautionary state. It is structurally impossible to reach the positive label without the backing signals present.
- *Evidence:* Unit tests feeding partial/empty inputs across every required signal, each asserting the result label is never the positive one.

**VC-ENGINE-03 — No safety-guarantee language.**
- *Behavior:* The maximum positive label is exactly `Looks clone-able`. The strings `Safe` or `Safe to clone` never appear as a verdict value anywhere in engine output or rendered output.
- *Evidence:* Unit test enumerating all possible verdict labels; grep over engine module + render output showing zero `Safe`/`Safe to clone` verdict values.

**VC-ENGINE-04 — Four explicit states, no bare in-app score.**
- *Behavior:* The verdict object exposes exactly the four states (`Looks clone-able` / `Clone with care` / `Skip it` / `Not enough signal`) and carries no bare 0–100 numeric score field intended for in-app display.
- *Evidence:* Unit test on the verdict schema asserting the state enum and the absence of an in-app score field.

**VC-ENGINE-05 — Gameable signals worded as likelihoods.**
- *Behavior:* Slop and AI-ready outputs are emitted as likelihood-worded strings (e.g. `looks abandoned (initial-commit-only history)`, `has CLAUDE.md — likely agent-friendly`), never as asserted facts (`is slop`, `your agent will grok this`).
- *Evidence:* Unit tests asserting the wording patterns; snapshot of all emitted slop/AI-ready strings showing likelihood framing.

**VC-ENGINE-06 — Dated heuristic disclaimer in every verdict.**
- *Behavior:* Every verdict object includes a dated `heuristic check, not a security audit` disclaimer field, on every verdict shape including cautionary and Not-enough-signal states.
- *Evidence:* Unit test asserting the field is present and carries a date on all verdict shapes.

**VC-DATA-01 — Headline from ≤2 cheap calls.**
- *Behavior:* The headline verdict (maintenance / license / bus-factor / slop) is computed from at most two GitHub calls (repo metadata + one commits-list call) before it appears.
- *Evidence:* Network trace on initial verdict render showing ≤2 GitHub requests before the headline paints.

**VC-DATA-02 — Issues exclude pull requests.**
- *Behavior:* Any issue count/temperature signal filters out items carrying a `pull_request` field.
- *Evidence:* Unit test with a mixed issues+PRs payload asserting PRs are excluded from the counts.

**VC-DATA-03 — 202 / empty-stats degrade honestly.**
- *Behavior:* When stats endpoints return `202` or empty `{}`, the headline still renders and the expensive metrics show an explicit `computing` / `Unknown` state — never a fabricated number and never a default green.
- *Evidence:* Test stubbing 202 and empty `{}` responses asserting Unknown/computing states render and no green/numeric fabrication occurs.

**VC-DATA-04 — Bus factor shows real contributors.**
- *Behavior:* When contributor data is present, the bus-factor view renders real `{login, percentage}` rows, never `Unknown 0%` rows.
- *Evidence:* Unit/DOM test with contributor fixtures asserting logins and percentages render.

**VC-DATA-05 — Expensive stats are opt-in.**
- *Behavior:* The participation / contributor / commit-activity stats endpoints are NOT called on initial headline render; they fire only when the user opens "show the receipts."
- *Evidence:* Network trace before expansion (no stats calls) and after expansion (stats calls present).

**VC-CONTENTS-01 — Contents API exists.**
- *Behavior:* The API layer can fetch `package.json`, README, the file tree, and AI-rules files (`CLAUDE.md` / `AGENTS.md` / `.cursor`) for a given repo.
- *Evidence:* Unit tests against mocked contents responses for each file type.

---

### Group B — Due-Diligence Core (the four un-owned differentiators + MCP parity)

The greenfield value-prop. None of these exist today; build and validate as from-scratch.

**VC-STACK-01 — Stack-fit detection + match.**
- *Behavior:* The stack-fit row auto-detects framework chips (Next.js / React / Supabase / Tailwind / shadcn / Stripe / Prisma) from `package.json` + config and visibly matches them against the saved 3-chip stack.
- *Evidence:* Test with a sample `package.json` asserting detected chips and visible match highlighting against saved chips.

**VC-AIREADY-01 — AI-readiness badge.**
- *Behavior:* The AI-ready badge is derived from presence of `CLAUDE.md`/`AGENTS.md`/`.cursor` + README quality + file-count modularity, and is worded as a likelihood.
- *Evidence:* Tests across repos with and without AI-rules files asserting badge text and likelihood wording.

**VC-SLOP-01 — Slop caution with false-positive guard.**
- *Behavior:* Slop-check flags initial-commit-only history / no tests / abandoned as `looks like…`, AND a repo with squashed history is NOT flagged as slop on commit count alone.
- *Evidence:* Test for a slop fixture (flagged) and a squashed-history fixture (explicitly not flagged).

**VC-CONTEXT-01 — Deterministic context block.**
- *Behavior:* "Copy context for your agent" assembles a deterministic block containing README excerpt + detected stack + verdict + setup gotchas grep'd from README/issues + key files; identical input yields an identical block. It stays a bounded block — it does NOT expand into a whole-repo ingest.
- *Evidence:* Unit test asserting deterministic (identical-across-runs) output with all required sections present and bounded scope.

**VC-MCP-01 — MCP parity.**
- *Behavior:* The MCP server exposes a `clone_check(repo)` tool returning the same structured verdict + context block as the web engine for the same repo+SHA.
- *Evidence:* A test comparing MCP tool output to the web engine output for identical input, asserting equivalence.

**VC-MCP-02 — MCP works on novel repos without a web detour.**
- *Behavior:* `clone_check(repo)` on a novel (not-yet-cached) repo returns a verdict in-agent without requiring the user to visit the website or supply a token.
- *Evidence:* MCP harness run against a fresh repo id returning a verdict, with no website visit and no token.

---

### Group C — Vibe-Coder Mode (the Clone Check web surface)

The warm, light-first, jargon-off default skin. Gated behind the sequencing gate above.

**VC-SHELL-01 — Single-source shell + deep-linkable state.**
- *Behavior:* Page chrome/nav is rendered from one shared source (no per-page duplicated header), and verdict state is deep-linkable with working Back/Forward.
- *Evidence:* Inspection showing one nav source across pages; navigation trace showing URL state restored on Back/Forward.

**VC-WEB-01 — Zero-friction input.**
- *Behavior:* The landing surface offers a paste-a-URL input AND a date-stamped curated starters shelf; a verdict is obtainable with no login and no token.
- *Evidence:* Screenshot of the landing surface; black-box run producing a verdict with no auth.

**VC-WEB-02 — One-time 3-chip stack picker.**
- *Behavior:* On first run a 3-chip stack picker appears, is stored in localStorage, is NOT shown again after selection, and is not a login.
- *Evidence:* First-run screenshot; localStorage value after selection; second-run screenshot showing it absent.

**VC-WEB-03 — Verdict surface composition.**
- *Behavior:* The verdict page shows the verdict chip, a one-paragraph plain-English "what this is," the stack-fit row, the trust-in-words row (maintenance / license / bus factor / deps-alive), the AI-ready badge, the slop-check caution, and the "Copy context for Cursor/Claude Code" money button.
- *Evidence:* Screenshot + DOM assertions for each of the named elements.

**VC-WEB-04 — Visible dated disclaimer.**
- *Behavior:* A visible dated `heuristic check, not a security audit — verify before you ship` line appears on every verdict.
- *Evidence:* DOM assertion + screenshot showing the dated line on a rendered verdict.

**VC-WEB-05 — Show the receipts.**
- *Behavior:* A progressive-disclosure expander reveals the pro metric (Pulse) view with evidence links and opt-in expensive stats.
- *Evidence:* Screenshots before/after expansion; network trace showing stats fire only on expand (pairs with VC-DATA-05).

**VC-WEB-06 — Permalink + OG unfurl.**
- *Behavior:* A verdict has a shareable `?repo=` permalink that re-renders the same verdict, and the link unfurls with an OG image.
- *Evidence:* Opening the permalink in a fresh session asserting the same verdict; OG image fetch returning an image for the share URL.

---

### Group D — Accessibility (close the live WCAG regressions)

**VC-A11Y-01 — Visible focus ring everywhere.**
- *Behavior:* A visible keyboard focus ring appears on all interactive controls (buttons, cards, inputs), including under forced-colors. No `outline:none` without a replacement.
- *Evidence:* Keyboard-navigation screenshots; forced-colors render screenshot.

**VC-A11Y-02 — Muted-text contrast.**
- *Behavior:* Muted text meets ≥4.5:1 contrast in both light and dark themes.
- *Evidence:* Automated contrast report for muted tokens in both themes.

**VC-A11Y-03 — Touch targets.**
- *Behavior:* Interactive controls / inputs / selects are ≥44px on mobile.
- *Evidence:* Measured dimensions in a mobile viewport.

**VC-A11Y-04 — Reduced-motion stops canvas.**
- *Behavior:* With `prefers-reduced-motion` set, canvas animations (DNA) stop and paint a single static frame.
- *Evidence:* Test asserting the rAF loop is not running under reduced-motion; static-frame screenshot.

**VC-A11Y-05 — Wayfinding + announcements.**
- *Behavior:* The active nav link carries `aria-current="page"`, the index page has an `h1`, and toasts have a dismiss control plus an ARIA live region.
- *Evidence:* DOM assertions for `aria-current`, the `h1`, and the toast live region + dismiss control.

---

### Group E — Design (two registers, honest freshness, gated DNA)

**VC-DESIGN-01 — Light-first warm shadcn skin.**
- *Behavior:* The in-app surface is light-first, warm, and shadcn-familiar, with the light theme as the default (co-equal, not a degraded fallback) and contrast-compliant.
- *Evidence:* Screenshot in light theme; contrast checks on key text.

**VC-DESIGN-02 — Freshness alive-glow + as-of stamps.**
- *Behavior:* The alive-glow accent renders on any verdict computed from data fresher than the stamped threshold (live OR recently-rebuilt cache), NOT as a live-vs-cached flag; every shelf card shows an `as of <date>` stamp.
- *Evidence:* Screenshot of a fresh-cache shelf card showing both the glow and the date stamp; test asserting the glow toggles by freshness threshold, not by live-vs-cached origin.

**VC-DESIGN-03 — Calm in-app register, no grade/score in-app.**
- *Behavior:* The in-app verdict uses plain language with explicit Unknowns and shows no A–F letter grade and no bare 0–100 score; the A–F letter grade appears only on the share card.
- *Evidence:* DOM assertions confirming absence of grade/score in-app and presence of the grade on the share card.

**VC-SHARE-01 — Memetic share card.**
- *Behavior:* The share card exports a bold inspection-stamp + verdict label + A–F grade + DNA watermark + a dated `not a security audit` footer, legible at thumbnail size.
- *Evidence:* Exported card image showing all named elements; thumbnail-scale screenshot confirming legibility.

**VC-SHARE-02 — Deterministic DNA watermark + legend.**
- *Behavior:* The DNA watermark fingerprint is deterministic (no `Date.now()`), producing an identical fingerprint for the same repo across days, carries a one-line legend, and the component exposes a real `destroy()`. (If these gates are unmet, DNA is dropped entirely — invest nothing further.)
- *Evidence:* Test asserting identical fingerprint across simulated dates; presence of the legend; `destroy()` unit test.

---

### Group F — Platform / Deploy (harness, backend, CI, quota, hygiene)

**VC-QA-01 — One-command scriptable startup with disk logs.**
- *Behavior:* A single documented command starts the app for black-box testing and writes logs to a known filesystem path (secrets redacted, excluded from VCS).
- *Evidence:* Terminal output of the start command; log file appearing at the documented path with secrets redacted.

**VC-QA-02 — Programmatic end-to-end harness.**
- *Behavior:* A scriptable harness can drive a verdict end-to-end (input repo → rendered verdict) and invoke the MCP `clone_check` tool programmatically.
- *Evidence:* Harness run output for both the web path and the MCP tool.

**VC-PLATFORM-01 — CI gate.**
- *Behavior:* CI runs `npm ci`, test, build, and audit and fails the pipeline on any failure.
- *Evidence:* CI config + a passing run log AND a demonstrated failing run blocking merge.

**VC-PLATFORM-02 — Deployed with real HTTP security headers.**
- *Behavior:* The app is reachable at a public URL serving CSP and security headers (`frame-ancestors`, `X-Content-Type-Options`, `object-src 'none'`, `base-uri 'self'`) via real HTTP headers, not meta tags.
- *Evidence:* `curl -I` output of the deployed URL showing the headers.

**VC-PLATFORM-03 — Honest rate-limit handling.**
- *Behavior:* On `429`/`Retry-After` the UI shows an honest `try again in N seconds` message (never `Forbidden: check your token`), and superseded requests are cancelled via `AbortController`.
- *Evidence:* Test stubbing a 429 with `Retry-After` asserting the message; test asserting an aborted prior request.

**VC-PLATFORM-04 — Safe storage + attribute escaping.**
- *Behavior:* localStorage writes are wrapped to catch `QuotaExceededError` (toast + prune, no uncaught throw), and `escapeAttr` escapes both single and double quotes.
- *Evidence:* Unit tests forcing `QuotaExceededError` and asserting no throw; `escapeAttr` unit test on both quote characters.

**VC-CACHE-01 — SHA-keyed verdict cache.**
- *Behavior:* The serverless verdict cache is keyed by repo + commit SHA; a repeat request for the same repo+SHA is served from cache without a new GitHub fan-out.
- *Evidence:* Backend test/log showing a cache hit and the absence of upstream GitHub calls on the second request.

**VC-CACHE-02 — Pre-cached dated shelf.**
- *Behavior:* Curated shelf entries are pre-cached and each carries an `as of <date>` stamp.
- *Evidence:* Shelf payload/snapshot showing cached verdicts with date stamps.

**VC-HYGIENE-01 — Fossils removed, docs current.**
- *Behavior:* The stray CSP-less `pulse-animation-test.html` is removed and docs (`CLAUDE.md`/`README`) reflect the Clone Check product, correct page/test counts, and dev port.
- *Evidence:* Repo listing showing the file gone; doc diff.

---

### Group G — Cross-Feature Flows (end-to-end journeys spanning multiple features)

These exercise the whole spine and must pass at final validation. Each spans several of the assertions above.

**VC-FLOW-01 — Cold novel-URL flow.**
- *Behavior:* Pasting a novel trending repo URL (not cached) renders a headline verdict from cheap-tier calls with honest Unknowns, allows Copy context, produces a share permalink, and reopening the permalink shows the same verdict.
- *Evidence:* End-to-end trace + screenshots across the steps (paste → headline → copy → permalink → reopen).

**VC-FLOW-02 — In-agent parity flow.**
- *Behavior:* Calling `clone_check(repo)` in-agent pre-clone returns a verdict + context block that matches the web surface for the same repo+SHA.
- *Evidence:* Side-by-side MCP vs web output for one repo.

**VC-FLOW-03 — First-run stack-fit flow.**
- *Behavior:* First run → pick 3 stack chips → verdict shows stack-fit matched to those chips → "show the receipts" reveals the pro view.
- *Evidence:* End-to-end screenshots across the steps.

---

### Group H — Trust-Incident Containment (own the response to a false-green)

The owner's decision on false-positive ownership: the product never guarantees safety, but it **owns the response** when a heuristic verdict is wrong or gamed. These four mechanisms exist because a viral false-positive screenshot is the cheapest attack on a trust product; `VC-CONTAIN-02` and `VC-CONTAIN-03` are pre-ship gates (see the false-green ship gate above).

**VC-CONTAIN-01 — Report-this-verdict path on every surface.**
- *Behavior:* Every rendered verdict — web surface, share card, and MCP `clone_check` output — carries a "Report this verdict" affordance that captures repo + commit-SHA + the verdict shown and files it to a monitored channel (issue / form / endpoint).
- *Evidence:* DOM assertion/screenshot of the affordance on web + share card; the field in MCP output; a submitted report landing in the monitored channel with repo+SHA+verdict captured.

**VC-CONTAIN-02 — Verdict kill-switch + recompute (ship-gating).**
- *Behavior:* An authentication-protected admin action invalidates a specific cached verdict by repo+SHA so subsequent requests either recompute or return an explicit `withdrawn pending review` state — globally, without a redeploy. The public surface may not go live until this works.
- *Evidence:* Backend test: seed a cached verdict, invoke the kill-switch, assert the next request recomputes or returns `withdrawn`; assert the action rejects unauthenticated callers.

**VC-CONTAIN-03 — Public methodology page, linked from every verdict (ship-gating).**
- *Behavior:* A public `/how-it-works` methodology page states what each signal measures, what the verdict does and does NOT claim ("cannot detect malware; measures maintenance/license/structure heuristics"), and the known limits; every verdict links to it.
- *Evidence:* The page resolves at a public path; a rendered verdict contains a visible link to it; the page explicitly disclaims safety/malware detection.

**VC-CONTAIN-04 — Incident playbook committed to the repo.**
- *Behavior:* A versioned `INCIDENT-PLAYBOOK.md` defines the false-green runbook: detect (report channel / social) → kill-switch the verdict (`VC-CONTAIN-02`) → post a public correction → patch the gamed heuristic → add a regression test.
- *Evidence:* The file exists with those steps and is referenced from §7's incident-response procedure.

---

### Coverage Ledger (claim map for the orchestrator)

| Group | Assertion IDs | Count |
|---|---|---|
| A — Data Trust | VC-ENGINE-01..06, VC-DATA-01..05, VC-CONTENTS-01 | 12 |
| B — Due-Diligence Core | VC-STACK-01, VC-AIREADY-01, VC-SLOP-01, VC-CONTEXT-01, VC-MCP-01, VC-MCP-02 | 6 |
| C — Vibe-Coder Mode | VC-SHELL-01, VC-WEB-01..06 | 7 |
| D — Accessibility | VC-A11Y-01..05 | 5 |
| E — Design | VC-DESIGN-01..03, VC-SHARE-01, VC-SHARE-02 | 5 |
| F — Platform/Deploy | VC-QA-01..02, VC-PLATFORM-01..04, VC-CACHE-01..02, VC-HYGIENE-01 | 9 |
| G — Cross-Feature Flows | VC-FLOW-01..03 | 3 |
| H — Trust-Incident Containment | VC-CONTAIN-01..04 | 4 |
| **Total** | | **51** |

**Definition of Done:** the mission is complete only when all 51 assertions are GREEN under fresh adversarial validation, the two hard gates (sequencing M1→M3, and the false-green ship gate) were honored in order, a named human owner has accepted the false-green liability gate, AND the Group H containment mechanisms (report path, kill-switch, methodology page, incident playbook) are live. A milestone is not "done" because workers believe it is — it is done when its claimed assertions pass independent user-testing and scrutiny validation. Expect 2–4 validation rounds per milestone and budget for fix-features; a false-green verdict slipping past validation is the defining failure mode of this product and is grounds to fail the milestone outright.

## Product Spec — Features & UX

Droid: build ONE deterministic `verdict()` engine and render it through TWO co-equal v1 surfaces — an **MCP tool** the agent calls in-flow, and a **warm "Clone Check" website**. Both are thin wrappers on the same pure core (D1, D4). There are two deliberate UX registers: the **in-app surface is calm, plain-language, reassuring** (an anxious non-dev decides whether to trust the verdict here); the **share card is loud and memetic** (D3). This section specifies every surface, what it shows, what it does, and the per-surface acceptance criteria. Build order is gated: the trustworthy engine (M1) and backend (M2) must land before the warm web skin (M3) — never ship a friendly face on an untrustworthy engine (sequencing gate, risks).

### The shared verdict object (what every surface renders)

The engine returns one structured verdict consumed identically by MCP, web, cache, share card, and OG. Every surface renders from these fields — never recomputes:

| Field | Content | Hard rule |
|---|---|---|
| `state` | One of exactly four: **Looks clone-able / Clone with care / Skip it / Not enough signal** | Never "Safe"/"Safe to clone"; max positive is "Looks clone-able" (VC-ENGINE-03, D9) |
| `whatThisIs` | One-paragraph plain-English human summary, no jargon | — |
| `stackFit` | Detected framework chips + match against saved 3-chip stack | From package.json + config (VC-STACK-01) |
| `trustInWords` | Maintenance / license / bus-factor / "deps alive + pinned?" as plain sentences | From ≤2 cheap calls; honest Unknowns (VC-DATA-01/03) |
| `aiReady` | Likelihood-worded badge | "likely agent-friendly", never "your agent will grok this" (VC-AIREADY-01) |
| `slop` | Likelihood-worded caution | "looks abandoned (initial-commit-only history)", never "is slop" (VC-SLOP-01) |
| `contextBlock` | Deterministic paste-ready agent brief | Identical input → identical block (VC-CONTEXT-01) |
| `disclaimer` | Dated "heuristic check, not a security audit" string | Present on EVERY verdict (VC-ENGINE-06) |
| `receipts` | The pro Pulse metric view + evidence links (opt-in) | Expensive stats not computed until requested (VC-DATA-05) |

Structural invariant the UX depends on: it is **impossible to render a positive verdict on missing data** — any missing headline signal forces "Not enough signal" or a cautionary state (VC-ENGINE-02). No bare 0–100 score is exposed for in-app display (VC-ENGINE-04, VC-DESIGN-03).

---

### Surface 1 — MCP tool `clone_check(repo)` (co-equal v1, the moat)

The vibe coder is already inside Cursor/Claude Code. The agent calls `clone_check(repo)` **pre-clone**, in-flow, and gets the verdict + context block back without a detour to any website and without the user supplying a token (vibeCoderMode keySurface "MCP TOOL"; D4, D8).

What it returns: the full structured verdict object above, including the deterministic context block (README excerpt + detected stack + verdict + setup gotchas grep'd from README/issues + key files).

| Acceptance | Criteria |
|---|---|
| Parity | `clone_check(repo)` output is byte-equivalent to the web engine for the same repo+SHA (VC-MCP-01, VC-FLOW-02) |
| Novel repos | Returns a verdict for a not-yet-cached repo in-agent, no web detour, no user token (VC-MCP-02) |
| Honesty | Same four-state labels, likelihood wording, and dated disclaimer as the web (VC-ENGINE-03/05/06) |

This is the cheapest-slice probe (risks: WEDGE THINNESS) — it must stand alone as a value-prop before the full web build is funded.

---

### Surface 2 — Clone Check website (the default warm skin)

Reframed JTBD (D2): *"My agent / a tweet / a YouTube video / an awesome-list told me to clone this starter — before I burn my weekend, is it maintained-or-slop, does it fit my stack, will my agent understand it, and give me a brief so it doesn't faceplant."* Walk the flow screen by screen.

#### 2.1 Zero-friction input + curated shelf (landing)

The landing surface offers BOTH a paste-a-GitHub-URL input AND a date-stamped "reputable starters" shelf (shelf data served pre-cached from the M2 SHA cache). No login, no token, no empty search box (VC-WEB-01; D9 zero-onboarding).

- [ ] Paste a novel/trending GitHub URL → a headline verdict appears in seconds (VC-WEB-01, VC-FLOW-01)
- [ ] Curated shelf renders cards, each stamped **"as of `<date>`"** (VC-CACHE-02, VC-DESIGN-02)
- [ ] A verdict is obtainable with no auth — black-box run proves it (VC-WEB-01)
- [ ] Shelf cards computed from data fresher than the stamped threshold show the **alive-glow** freshness accent (VC-DESIGN-02)

#### 2.2 First-run 3-chip stack picker (one-time)

On first run only, a 10-second 3-chip picker appears (e.g. Next.js / Supabase / Tailwind), stored in localStorage. It is NOT a login, and it is **never shown again** after selection — so the high-converting "fits your stack" signal isn't dead on first impression (VC-WEB-02; openQuestion STACK-PICKER-FRICTION).

- [ ] First run shows the picker; selection persists to localStorage (VC-WEB-02)
- [ ] Second run does NOT show it (VC-WEB-02, VC-FLOW-03)
- [ ] Saved chips drive the stack-fit match highlighting on every subsequent verdict

#### 2.3 The verdict composition (the core screen)

This is the Adoption Verdict, reframed for vibe coders as the plain-English Clone Check. It composes, top to bottom (VC-WEB-03):

1. **Verdict chip** — big plain-English headline (one of the four states). Calm in-app register, no letter grade, no bare score (VC-DESIGN-03).
2. **"What this is"** — one-paragraph human summary, no jargon.
3. **Stack-fit row** — auto-detected chips (Next.js/React/Supabase/Tailwind/shadcn/Stripe/Prisma) parsed from package.json + config via the new contents API, visibly matched against the saved 3-chip stack (VC-STACK-01).
4. **Trust-in-words row** — maintenance ("last commit 3 days ago — actively maintained"), license ("MIT — free to ship commercially"), bus factor ("one author wrote 71% of commits — risky if they leave"), and a lightweight "are headline deps alive + pinned?" flag. All from the 1–2 cheapest calls so the headline survives 202/empty-stats failures (VC-DATA-01/03). Bus factor renders real `{login, percentage}` rows, never "Unknown 0%" (VC-DATA-04; report bug #3, `src/js/pulse.js:211`). Issue signals exclude PRs (VC-DATA-02; report bug #8).
5. **AI-ready badge** — likelihood-worded, from CLAUDE.md/AGENTS.md/.cursor + README quality + file-count modularity (VC-AIREADY-01).
6. **Slop-check caution** — likelihood-worded, with squashed-history false-positive guard (VC-SLOP-01; risks: SLOP FALSE POSITIVES).
7. **The money button** — "Copy context for Cursor/Claude Code". This is the real product: the deterministic paste-ready agent brief (VC-CONTEXT-01, VC-WEB-03).
8. **Heuristic disclaimer line** — visible, dated "heuristic check, not a security audit — verify before you ship" on every verdict (VC-WEB-04, VC-ENGINE-06; D9).

- [ ] Every one of elements 1–8 present (DOM assertions + screenshot) (VC-WEB-03/04)
- [ ] Verdict state never positive when a headline signal is missing (VC-ENGINE-02)
- [ ] No A–F grade and no 0–100 score anywhere in-app (VC-DESIGN-03)
- [ ] Copy-context button yields a deterministic block with all required sections (VC-CONTEXT-01)

#### 2.4 Show the receipts (the trustworthy Pulse, demoted not deleted)

A progressive-disclosure expander reveals the **pro Pulse metric view** — the dev-second "receipts" layer with evidence links and opt-in expensive stats (VC-WEB-05; D1, D9). This is where the original due-diligence CORE Pulse lives, rebuilt trustworthy: real bus-factor distribution, maintenance velocity, freshness, honest 202/"computing"/Unknown states — never a fabricated number or default green (VC-DATA-03/04; report bugs #1, #3, #7). **Releases/changelog** signal folds in here and into the "deps alive + pinned?" trust line rather than a standalone tab.

- [ ] Expander hidden by default; expensive participation/contributor/commit-activity stats fire ONLY on expand (VC-WEB-05, VC-DATA-05) — network trace before/after proves it
- [ ] 202/empty-`{}` stats render explicit "computing"/"Unknown", never a default green (VC-DATA-03)
- [ ] Evidence links resolve to the underlying GitHub data backing each claim

#### 2.5 Permalink + OG unfurl (website as share/landing surface)

A verdict has a shareable `?repo=` permalink that re-renders the same verdict; the link unfurls with an OG image from the M2 endpoint (VC-WEB-06; D8 distribution).

- [ ] Opening the permalink in a fresh session shows the same verdict (VC-WEB-06, VC-FLOW-01)
- [ ] OG image fetch for the share URL returns an image (VC-WEB-06)
- [ ] Verdict state is deep-linkable with working Back/Forward (VC-SHELL-01)

#### 2.6 Memetic share card (the loud register)

Export a bold, stamped verdict card sized to pop at thumbnail in an X/Reddit feed: inspection-stamp + verdict label + **A–F letter grade (share card ONLY)** + deterministic DNA watermark + a dated "not a security audit" footer (VC-SHARE-01; D3, D7). The A–F grade is the one place virality is allowed; keeping it off the in-app surface protects in-app trust (VC-DESIGN-03; risks: DESIGN TWO-REGISTER HONESTY).

- [ ] Exported card shows all five elements, legible at thumbnail scale (VC-SHARE-01)
- [ ] DNA watermark is deterministic — identical fingerprint for the same repo across days (no `Date.now()`), carries a one-line legend, and the component exposes a real `destroy()` (VC-SHARE-02; D7, report bug #11). If these gates aren't met, drop DNA entirely — invest nothing further.

---

### CORE due-diligence surfaces: what's IN, reframed, or CUT for v1

The prompt's classic due-diligence surfaces map onto the consensus as follows. Droid: honor the cuts — do not let a worker pull cut surfaces forward.

| CORE surface | v1 disposition | Where it lives |
|---|---|---|
| **Adoption Verdict** | IN — renamed | The §2.3 verdict chip + composition (the whole product) |
| **Trustworthy Pulse** | IN — demoted | §2.4 "show the receipts" expander (VC-WEB-05) |
| **Releases** | IN — folded | The "deps alive + pinned?" trust line + receipts; not a standalone tab |
| **Decision Matrix / Compare** | **CUT from v1 (D5)** | Returns post-cache (M6). It bricks on the novel tweet-recommended URLs that ARE the killer job and burns quota you don't have |
| **Watchlist** | **CUT from v1 (D9)** | Wrong loop — this audience re-picks starters each weekend, not a tracking cohort |

### Cross-feature flows the UX must satisfy end-to-end

- [ ] **Cold novel-URL flow** — paste a novel trending URL → headline verdict from cheap-tier calls with honest Unknowns → Copy context works → share permalink produced → reopening the permalink shows the same verdict (VC-FLOW-01)
- [ ] **In-agent parity flow** — `clone_check(repo)` pre-clone returns a verdict + context block matching the web surface for the same repo+SHA (VC-FLOW-02)
- [ ] **First-run stack-fit flow** — first run → pick 3 chips → verdict shows stack-fit matched to those chips → "show the receipts" reveals the pro view (VC-FLOW-03)

### UX guardrails that ride every surface

- Light-first, warm, shadcn/Tailwind-familiar; light theme is co-equal and contrast-compliant, not a degraded fallback (VC-DESIGN-01; D3). Field Manual and Phosphor are rejected as the front door (cuts).
- The alive-glow is a **freshness** indicator (renders on data fresher than a stamped threshold, live OR recently-rebuilt cache) — never a live-vs-cached flag, so it is present on the converting first-run shelf and never dishonest (VC-DESIGN-02; risks: DESIGN TWO-REGISTER HONESTY).
- Single-source shell/nav — no per-page duplicated chrome; kills the active-class drift bugs (VC-SHELL-01; report bugs #12).
- Gameable signals (slop, AI-ready) are ALWAYS worded as likelihoods, never laundered as facts to an audience that cannot interrogate them (VC-ENGINE-05; D6 honesty guardrail).

## Existing Codebase, Architecture & Required Fixes

Droid — read this section before you touch a file. It tells you exactly what is already here, what is broken, what to extract, and what conventions you must not regress. The full evidence trail is in `/Users/ambrealismwork/Desktop/coding-projects/github-repo-explorer/PROJECT-ANALYSIS-AND-RECOMMENDATIONS.md` (cited as "report Part N" below). **This is a greenfield value-prop build on top of a working 7-page demo, NOT a reskin** — the `verdict()` engine, contents API, slop detector, stack-fit matcher, AI-readiness check, and context block do not exist yet. Do not narrate a "refactor" of code that isn't there.

### What exists today (the substrate you build on)

A polished, backend-free, multi-page **vanilla JavaScript + Vite** application that wraps the GitHub REST API. No framework, no SPA router, no state library — this is a deliberate, documented architecture choice; do not introduce React/Vue/a router. There are **seven** real HTML entry points (the docs say six — they have drifted), each with a matching page-controller script.

| Page | Files | Role going forward |
|------|-------|--------------------|
| Search | `index.html` / `src/js/search.js` | Cleanest controller; only page with token entry. Demote to supporting nav. |
| Trending | `trending.html` / `src/js/trending.js` | Feeds the curated shelf; not a hero surface. |
| Favorites | `favorites.html` / `src/js/favorites.js` | localStorage list. Supporting. |
| Detail | `detail.html` / `src/js/detail.js` | Largest controller; embeds Pulse (currently mis-mapped — bug #2). |
| Compare | `compare.html` / `src/js/compare.js` | CUT from v1 per blueprint; leave dormant. |
| Collections | `collections.html` / `src/js/collections.js` | base64 share-link import/export with schema validation. |
| Pulse | `pulse.html` / `src/js/pulse.js` | Becomes the "show the receipts" pro view — demoted, not deleted. |

**Core modules** (all under `src/js/`):
- `api.js` — GitHub REST wrapper. One good `fetchWithRetry` envelope (jittered exponential backoff, `Promise.allSettled` fan-out, UTF-8-safe base64 README decode, rate-limit surfacing). **Stats endpoints bypass the cache/retry path entirely**; `STATS_CACHE_TTL_MS` is declared but dead; cache is FIFO not LRU; no `AbortController`; 429/`Retry-After` unhandled.
- `common.js` — `Storage` (favorites/theme/token/notes/collections/exploration), UI helpers (`showToast`, `formatNumber`, `formatDate`, `debounce`), XSS layer (`safeText`, `createElement`, `escapeHtml`, `sanitizeUrl`), `getRequiredElement(id)`, `initMobileNav()`. **No try/catch on any write** (uncaught `QuotaExceededError`); `escapeHtml` does not escape quotes despite an attribute-insertion contract.
- `constants.js` — API/cache/pagination config, `STORAGE_KEYS`, `TRENDING_CATEGORIES`.
- `components/` — `RepoGrid.js`, `HealthScore.js` (DOM-coupled — `createElement` at ~line 121, so it is NOT a pure engine you can lift), `CommitHeatmap.js`, `CloneCommands.js`, `RepoNotes.js`, `DiscoveryStats.js`, plus `RepositoryDNA/` (the Bio-Circuit canvas system) and `PulseDashboard/PulseCalculator.js`.

**Two shipped visualizations:** Repository DNA (best-engineered module — seeded PRNG, reduced-motion + IntersectionObserver gating, but decorative and non-deterministic because it reads `Date.now()`) and the Pulse Dashboard (excellent defensive structure undermined by fabricated/broken signals). In this mission: DNA survives ONLY as the gated share-card watermark (M4); Pulse becomes the receipts view (M3).

### Prioritized bugs to fix (report Part 1(e))

These are real, evidence-located defects. Several are load-bearing for the trust contract — a fake-green readout is the failure mode this whole product exists to prevent.

| # | Sev | Bug | Location | Maps to |
|---|-----|-----|----------|---------|
| 1 | Critical | Pulse presents fabricated/broken signals as measured truth (synthetic momentum sine wave, broken bus factor, PR/issue conflation) and **defaults to a confident green "stable/50" on missing data** | `src/js/pulse.js`, `PulseDashboard/PulseCalculator.js` | VC-ENGINE-02, VC-DATA-03 |
| 2 | High | `detail.js` passes raw `fetchPulseData` output to `calculateAllMetrics` without remapping → PR Health on empty array, Freshness loses `pushed_at` (→Infinity), momentum gets `repo=null`; diverges from `pulse.js` | `src/js/detail.js:83-86` (mirror the correct map at `pulse.js:178-186`) | single `mapPulseData()` |
| 3 | High | Bus Factor card sets `distribution` to `sparklineData` (numbers) but `createContributorBars` expects `{login,percentage}` → **every row renders "Unknown 0%"** | `src/js/pulse.js:211` | VC-DATA-04 |
| 5 | High | HealthScore measures popularity, not health (35% stars+forks; activity collapses onto `pushed_at`); no "insufficient data" state | `src/js/components/HealthScore.js` | engine re-model around maintenance |
| 6 | Med | Unguarded `localStorage` writes throw uncaught on `QuotaExceededError`; unbounded `stats.explored` growth | `src/js/common.js:24-30,107,126-151,164` | VC-PLATFORM-04 |
| 7 | Med | 202 "computing" flag stripped by `fetchPulseData`; banner is dead code; uncomputed stats silently show "stable" | `src/js/api.js:464`, `pulse.js:157` | VC-DATA-03 |
| 8 | Med | `/issues` returns PRs; never filtered by `pull_request` field → issue counts inflated | `api.js:398`, `PulseCalculator.js:632` | VC-DATA-02 |
| 9 | Med | `dashboardData` shape diverges between `detail.js` and `pulse.js` for the same component | `src/js/detail.js:92-101` | same single-map fix as #2 |
| 10 | Med | `escapeHtml` doesn't escape quotes; `RepoGrid` `data-repo='…'` breakout risk | `common.js:412-417`, `RepoGrid.js:44-74` | VC-PLATFORM-04 (`escapeAttr`) |
| 11 | Med | DNA animation/observer leaks unless removed via a `.remove()` monkey-patch | `RepositoryDNA/index.js:140-146` | VC-SHARE-02 (real `destroy()`) |
| 12 | Low | `index.html` has no `<h1>`; no `aria-current`; `pulse.html:100` mobile active-class drift | `index.html`, `pulse.html` | VC-A11Y-05, VC-SHELL-01 |
| 13 | Low | `DiscoveryStats` injects language names into `innerHTML` unescaped | `DiscoveryStats.js:54` | XSS discipline |
| 14 | Low | Doc drift + stray CSP-less `pulse-animation-test.html` in repo root | `CLAUDE.md`, `pulse-animation-test.html` | VC-HYGIENE-01 |

(Bug #4 — plaintext PAT in localStorage — is descoped: v1 is token-free for end users; the SHA-keyed serverless cache and later per-user OAuth replace it. Do not build a shared-PAT proxy.)

### Architecture moves (do these once, centrally)

The dominant structural problem is **duplication without a shared layer** — it is the single root cause behind a cluster of drift bugs (report Part 1(d)). Build the shared seams; do not patch the same thing seven times.

- **One pure-function `verdict(repoData)` engine.** Author from scratch. Zero DOM, zero `fetch`. Every surface (website, MCP, cache, OG, share card) is a thin wrapper. This is the WS-1 sequencing gate — it must exist and be trustworthy before the warm M3 surface is built on it. Encodes the hard trust gates: four states, never "Safe", structurally-impossible-positive-on-missing-data, likelihood wording, dated disclaimer field.
- **Single `mapPulseData()`.** Extract one mapping function (mirror the correct `pulse.js:178-186`) and use it on both `detail.js` and `pulse.js`. Kills bugs #2 and #9 at once.
- **Shared shell: one nav/header source.** ~115 lines of chrome are copy-pasted byte-for-byte across all 7 HTML files (drives the active-class drift, missing `aria-current`, unlabeled landmark). Render nav from ONE source (build-time include or JS render). Add `aria-current="page"` and the missing `index.html` `<h1>` here.
- **`createPageController()` + `showState()` bootstrap.** The init triple, theme toggle, element-grab block, and state machine are duplicated in all 7 controllers. Extract one bootstrap; deep-linkable state with working Back/Forward lives here (VC-SHELL-01).
- **Quota-aware request manager.** Route stats endpoints through `fetchWithRetry` (activates the dead `STATS_CACHE_TTL_MS`), add `AbortController` to cancel superseded requests, and replace the misleading "Forbidden: check your token" with honest 429/`Retry-After` "try again in N seconds" (VC-PLATFORM-03). Headline verdict must come from ≤2 cheap calls (metadata + one commits list); expensive participation/contributor/commit-activity stats fire only on "show the receipts" (VC-DATA-01/05).
- **New contents API in `api.js`.** Fetch `package.json`, README, file tree, and AI-rules files (`CLAUDE.md` / `AGENTS.md` / `.cursor`). Prerequisite for the four differentiators; does not exist today (VC-CONTENTS-01).
- **Central safety helpers in `common.js`.** Add `escapeAttr` (escapes both `'` and `"`) and a safe `setItem` wrapper (catch `QuotaExceededError`, toast, prune — never throw).

### Stack & conventions to preserve (do not regress)

These are existing strengths. Keep them.

- **Strict CSP on every page** — currently meta-tag; M2 must also serve real HTTP headers (`frame-ancestors`, `X-Content-Type-Options`, `object-src 'none'`, `base-uri 'self'`). Any new page/endpoint inherits the CSP.
- **Layered XSS discipline** — all user/API data goes through `safeText` / `createElement` / `escapeHtml` / `escapeAttr` / `sanitizeUrl`. The marked + DOMPurify markdown pipeline is correct; keep it. Never introduce raw `innerHTML` with untrusted data (fix #13, don't add more).
- **Design-token discipline** — 937 `var()` references vs 12 stray hex. New styles use tokens. The M4 light-first warm shadcn skin replaces palette/geometry but keeps the token system; route glow through a shared alpha-based token, no raw rgba literals.
- **Tests as a gate** — Vitest + jsdom under `src/js/__tests__/`. ~718 tests currently pass (docs wrongly say 283 — fix in `CLAUDE.md`). Add page-controller tests (all states: loading/empty/error/404/202/rate-limit — currently ZERO), rewrite `collections.test.js` to test the real module (it tests an inline copy today), and add Playwright E2E. Engine units must assert determinism (VC-ENGINE-01).
- **Clean module boundaries** — `api.js` → `common.js` → `components/` → page controllers. Respect this layering; the engine is a new pure layer beneath the controllers.

### How to run, build, and test

```bash
npm run dev        # dev server (verify the actual port and correct the docs — drift noted in bug #14)
npm run build      # production build to dist/
npm run preview    # preview the production build
npm test           # Vitest once (CI mode)
npm run test:watch # Vitest watch mode
```

There is **no CI and no deploy today** (report Part 1(f)). M2 must add `.github/workflows/ci.yml` running `npm ci && npm test && npm run build && npm audit` as a merge gate (VC-PLATFORM-01), a static deploy serving real HTTP security headers (VC-PLATFORM-02), and `npm audit fix` / Dependabot for the outdated DOMPurify advisories. The QA/run harness (M1, VC-QA-01/02) must expose ONE documented start command writing logs to a known filesystem path (secrets redacted, excluded from VCS) plus a scriptable path that drives both the web verdict and the MCP `clone_check` tool — Factory's #1 named failure cause is an app that can't be reliably stood up and exercised, so this lands in M1, not last.

## Milestone & Feature Execution Plan

Droid — this is the backbone you will decompose into features and milestones. Build it in the order below; the ordering is load-bearing, not cosmetic. **WS-1 (the trustworthy engine, M1) MUST fully land before the warm web surface (M3) ships** — a friendly face on an untrustworthy engine is the single failure that kills this product. Treat M1 + the M2 MCP feature as the cheapest-slice-first wedge probe, not a sunk commitment.

Two invariants ride every milestone and every fresh-context worker (put them in `AGENTS.md`): **never assert "Safe"; never render a positive verdict on missing data.** Redact secrets from any disk logs.

**Coverage invariant:** every VC assertion in the validation contract is claimed by exactly one feature below — no orphans, no duplicates. M6 features are optional/post-v1 and claim zero v1 assertions. The in-contract assertions distribute across M1–M5 (the four `VC-CONTAIN-*` containment assertions are claimed by M2's F2.5); the three `VC-FLOW-*` cross-feature assertions are claimed by the M5 E2E feature because they can only pass once the engine, web surface, and MCP all exist.

Dependency spine: **M1 data-trust/foundation → M2 platform + backend (MCP + cache + CI/deploy) → M3 web surface → M4 design → M5 a11y/QA → M6 optional/backend.**

---

### M1 — Data Trust & Greenfield Due-Diligence Engine

**Intent.** Author, from scratch, the pure `verdict()` engine, the new contents API, the four un-owned differentiators, and the data-correctness safeguards FIRST — behind a scriptable QA harness so validators can run from milestone 1. This is greenfield: there is no existing verdict engine, slop detector, stack-fit matcher, AI-readiness check, or contents API, and `HealthScore.js` is DOM-coupled (`createElement` at line 121). Workers must NOT narrate a "refactor" of assets that do not exist.

**Exit / validation criteria.**
- All of `VC-ENGINE-01..06`, `VC-CONTENTS-01`, `VC-DATA-01..05`, `VC-STACK-01`, `VC-AIREADY-01`, `VC-SLOP-01`, `VC-CONTEXT-01`, `VC-QA-01..02` pass.
- A static grep proves the engine module references zero `document`/`window`/`fetch`.
- The QA harness starts the app with one documented command and writes redacted logs to a known path; the same harness can drive a verdict end-to-end AND invoke the MCP tool path (stub acceptable until M2).
- No worker has pulled any verdict-render/web-surface work forward.

| Feature | Claims (assertions) | Key files / areas |
|---|---|---|
| F1.1 Pure `verdict()` engine + trust safeguards | VC-ENGINE-01, -02, -03, -04, -05, -06 | new `src/js/engine/verdict.js` (pure core, no DOM/fetch); model maintenance-not-popularity, re-homing logic away from `HealthScore.js` |
| F1.2 Contents API + tiered cheap-call data layer | VC-CONTENTS-01, VC-DATA-01, -03, -05 | `src/js/api.js` (new contents calls; route stats through `fetchWithRetry`; activate dead `STATS_CACHE_TTL_MS`); `constants.js` |
| F1.3 Data-correctness fixes (PR/issue split, real bus factor) | VC-DATA-02, VC-DATA-04 | `api.js:398`, `PulseDashboard/PulseCalculator.js` (PR filter); contributor `{login,percentage}` plumbing (fixes `pulse.js:211`) |
| F1.4 The four un-owned differentiators | VC-STACK-01, VC-AIREADY-01, VC-SLOP-01, VC-CONTEXT-01 | new `src/js/engine/` modules: slop detector, stack-fit matcher, AI-readiness detector, context-block assembler |
| F1.5 QA / run harness (black-box testability) | VC-QA-01, VC-QA-02 | new harness script + documented start command; filesystem log path; programmatic web + MCP invocation |

**Feature detail.**

**F1.1 — Pure `verdict()` engine + trust safeguards.** *Intent:* one deterministic function, repo-data in → structured verdict out, that all surfaces wrap. *Acceptance:* calling twice with identical input yields byte-identical output (deep-equality test); exactly four states (`Looks clone-able` / `Clone with care` / `Skip it` / `Not enough signal`) and no other; the strings `Safe`/`Safe to clone` appear nowhere in output; when any headline signal (maintenance, license, bus factor, slop) is missing/Unknown the result is structurally never the positive label; no bare 0–100 score field is exposed for in-app display; gameable signals are likelihood-worded; every verdict object carries a dated "heuristic check, not a security audit" disclaimer field.

**F1.2 — Contents API + tiered cheap-call data layer.** *Intent:* fetch the file-level data the differentiators need, cheaply, and survive the famous-repo failure modes. *Acceptance:* layer can fetch `package.json`, README, file tree, and AI-rules files (`CLAUDE.md`/`AGENTS.md`/`.cursor`), each with a mocked-response unit test; the headline verdict is computed from ≤2 GitHub calls (metadata + one commits-list) verified by network trace; on 202 or empty `{}` from stats endpoints the headline still renders and expensive metrics show an explicit `computing`/`Unknown` state (never a fabricated number, never a default green); participation/contributor/commit-activity stats are NOT called on initial headline render.

**F1.3 — Data-correctness fixes.** *Intent:* kill the two laundered-data bugs the engine inherits. *Acceptance:* a mixed issues+PRs payload excludes any item carrying a `pull_request` field from issue counts/temperature; with contributor fixtures present, the bus-factor view renders real `{login, percentage}` rows and never an "Unknown 0%" row.

**F1.4 — The four un-owned differentiators (greenfield).** *Intent:* build the actual value prop. *Acceptance:* stack-fit detects framework chips (Next.js/React/Supabase/Tailwind/shadcn/Stripe/Prisma) from `package.json`+config and visibly matches them against a saved 3-chip stack; AI-ready badge is derived from AI-rules-file presence + README quality + file-count modularity and worded as a likelihood; slop-check flags initial-commit-only/no-tests/abandoned as "looks like…" AND a squashed-history fixture is NOT flagged as slop on commit count alone (false-positive guard is load-bearing); the "Copy context for your agent" assembler produces a deterministic block (README excerpt + detected stack + verdict + setup gotchas grep'd from README/issues + key files) with required sections present and identical-input → identical-output. Guard against scope-creep into a whole-repo GitIngest-style ingest — keep it a bounded block.

**F1.5 — QA / run harness.** *Intent:* Factory's #1 named failure cause is an un-exercisable app, so this lands in M1. *Acceptance:* one documented command starts the app for black-box testing; logs are written to a documented filesystem path with secrets redacted and excluded from VCS; a scriptable harness drives a verdict end-to-end (input repo → rendered verdict) and invokes the MCP `clone_check` path programmatically (a stub MCP target is acceptable in M1, wired for real in M2).

---

### M2 — Platform, Quota & v1 Backend (MCP + SHA cache + CI/deploy)

**Intent.** Stand up the v1 backend bundle the consensus promoted out of fast-follow: the MCP server (the moat + in-flow surface), the serverless SHA-keyed verdict cache (survives launch-day novel URLs when load and cache-hit peak together), the trust-incident containment layer (F2.5), plus the quota-aware request manager and CI/deploy so everything ships behind a gate to a real public URL. **Owner decision (confirmed):** backend-in-v1 is approved — build F2.2 (serverless cache) and F2.3 (MCP) as core v1, NOT as a scope-cut lever. The SHA cache is the substrate the F2.5 kill-switch operates on, so containment lands in this milestone.

**Exit / validation criteria.**
- `VC-PLATFORM-01..04`, `VC-CACHE-01..02`, `VC-MCP-01..02`, `VC-CONTAIN-01..04`, `VC-HYGIENE-01` pass (the `VC-CONTAIN-02` kill-switch and `VC-CONTAIN-03` methodology page are pre-ship gates — the M3 public surface may not go live without them).
- CI runs `npm ci`/`test`/`build`/`audit` as a merge gate; a passing run log AND a demonstrated failing run that blocks merge both exist.
- `curl -I` on the deployed URL shows CSP + security headers via real HTTP headers (not meta tags).
- MCP `clone_check(repo)` returns the same structured verdict + context block as the web engine for the same repo+SHA, and works on a fresh (uncached) repo with no web detour and no user token.

| Feature | Claims (assertions) | Key files / areas |
|---|---|---|
| F2.1 Quota-aware request manager + safe storage | VC-PLATFORM-03, VC-PLATFORM-04 | `api.js` (AbortController, 429/Retry-After, stats caching); `common.js:24-30` (safe `setItem` wrapper for QuotaExceededError; `escapeAttr` for both quote types) |
| F2.2 Serverless SHA-keyed verdict cache + scheduled shelf rebuild | VC-CACHE-01, VC-CACHE-02 | new serverless cache (repo+commit-SHA key); scheduled curated-shelf rebuild with `as of <date>` stamps |
| F2.3 MCP server (`clone_check` tool) | VC-MCP-01, VC-MCP-02 | new MCP server wrapping the pure `src/js/engine/` core; register as a named MCP integration |
| F2.4 CI/CD, static deploy, security headers, hygiene | VC-PLATFORM-01, VC-PLATFORM-02, VC-HYGIENE-01 | `.github/workflows/ci.yml`; `_headers`/`netlify.toml`/`vercel.json`; remove `pulse-animation-test.html`; refresh `CLAUDE.md`/`README.md`; scaffold OG-image endpoint (consumed by M3) |
| F2.5 Trust-incident containment (own the response) | VC-CONTAIN-01, -02, -03, -04 | "Report this verdict" affordance on web + share card + MCP output; authenticated kill-switch/recompute on the SHA cache; public `/how-it-works` methodology page linked from every verdict; committed `INCIDENT-PLAYBOOK.md` |

**Feature detail.**

**F2.1 — Quota-aware request manager + safe storage.** *Acceptance:* on 429/Retry-After the UI shows an honest "try again in N seconds" (never "Forbidden: check your token"); superseded requests are cancelled via AbortController (test asserts a prior request is aborted); `localStorage` writes are wrapped to catch QuotaExceededError (toast + prune, no uncaught throw); `escapeAttr` escapes both single and double quotes.

**F2.2 — Serverless SHA-keyed verdict cache + scheduled shelf.** *Acceptance:* cache is keyed by repo + commit SHA; a repeat request for the same repo+SHA is served from cache with no new GitHub fan-out (backend test/log shows cache hit and absent upstream calls); curated shelf entries are pre-cached and each carries an `as of <date>` stamp. SHA-keyed, NOT shared-PAT — cache-hit must peak exactly when launch load peaks.

**F2.3 — MCP server.** *Acceptance:* `clone_check(repo)` returns the same structured verdict + deterministic context block as the web engine for identical repo+SHA (parity test); on a novel not-yet-cached repo it returns a verdict in-agent without requiring a website visit or a token (harness run against a fresh repo id). Thin wrapper on the pure core — no logic fork.

**F2.4 — CI/CD, deploy, headers, hygiene.** *Acceptance:* CI runs `npm ci`/`test`/`build`/`audit` and fails the pipeline on any failure (passing + failing run both demonstrated); deployed public URL serves CSP and `frame-ancestors`, `X-Content-Type-Options`, `object-src 'none'`, `base-uri 'self'` via real HTTP headers (curl -I evidence); `pulse-animation-test.html` is removed and docs reflect the Clone Check product, correct page/test counts, and dev port; `npm audit fix`/Dependabot addresses DOMPurify. Scaffold the OG-image endpoint here for M3's permalink to consume.

**F2.5 — Trust-incident containment.** *Intent:* the owner owns the *response* to a false-green, never a safety guarantee. *Acceptance:* every verdict (web + share card + MCP output) shows a "Report this verdict" affordance capturing repo+SHA+verdict to a monitored channel; an authentication-protected admin action invalidates a specific cached verdict by repo+SHA so the next request recomputes or returns an explicit "withdrawn pending review" state globally with no redeploy (backend test seeds → kills → asserts, and rejects unauthenticated callers); a public `/how-it-works` methodology page states what each signal measures and explicitly disclaims malware/safety detection, with every verdict linking to it; a versioned `INCIDENT-PLAYBOOK.md` captures the runbook (detect → kill-switch → public correction → patch the gamed heuristic → add a regression test). `VC-CONTAIN-02` and `VC-CONTAIN-03` are pre-ship gates for the M3 public surface.

---

### M3 — Clone Check Web Surface (vibe-coder default skin)

**Intent.** Render the trustworthy engine as the warm, jargon-off Clone Check default surface: zero-friction input, the one-time 3-chip stack picker, the full verdict composition, the money button, the dated disclaimer, "show the receipts" progressive disclosure, and the share permalink. Builds on the M1 engine and M2 backend. **Gated:** do not start until M1 trust assertions pass.

**Exit / validation criteria.**
- `VC-SHELL-01`, `VC-WEB-01..06` pass.
- A verdict is obtainable with no login and no token (black-box run + screenshot).
- One nav source renders the chrome (no per-page duplicated header); verdict state is deep-linkable with working Back/Forward.
- Every verdict shows the visible dated disclaimer line; "show the receipts" fires expensive stats only on expand (network trace before/after).

| Feature | Claims | Key files / areas |
|---|---|---|
| F3.1 Shared shell, nav & deep-linkable state | VC-SHELL-01 | single-source header/nav (kills 7× duplicated chrome, `pulse.html` active-class drift); new `createPageController()`/`showState()` bootstrap; `URLSearchParams` + popstate |
| F3.2 Zero-friction input + curated shelf UI | VC-WEB-01 | landing surface: paste-URL input + date-stamped starters shelf (data from F2.2 cache) |
| F3.3 First-run 3-chip stack picker | VC-WEB-02 | one-time picker, `localStorage` via `Storage`; not a login; not re-shown after selection |
| F3.4 Verdict composition + money button | VC-WEB-03 | verdict page: chip, plain-English "what this is", stack-fit row, trust-in-words row, AI-ready badge, slop caution, "Copy context for Cursor/Claude Code" button |
| F3.5 Heuristic disclaimer line | VC-WEB-04 | visible dated "heuristic check, not a security audit — verify before you ship" on every verdict |
| F3.6 Show the receipts (progressive disclosure) | VC-WEB-05 | expander revealing pro Pulse metric view with evidence links + opt-in expensive stats |
| F3.7 Verdict permalink + OG auto-unfurl | VC-WEB-06 | `?repo=` permalink re-rendering same verdict; OG image via F2.4 endpoint |

**Feature detail.**

**F3.1 — Shared shell + deep-linkable state.** *Acceptance:* page chrome/nav renders from one shared source (inspection shows a single nav source, no duplicated header); verdict state is deep-linkable and a navigation trace shows URL state restored on Back/Forward.

**F3.2 — Zero-friction input + shelf.** *Acceptance:* landing offers a paste-a-URL input AND a date-stamped curated starters shelf; a verdict is obtainable with no login and no token (screenshot + black-box run). No empty search box as the first impression.

**F3.3 — First-run 3-chip stack picker.** *Acceptance:* on first run a 3-chip picker appears, is stored in `localStorage`, is not shown again after selection, and is not a login (first-run screenshot, localStorage value, second-run screenshot showing it absent).

**F3.4 — Verdict composition + money button.** *Acceptance:* the verdict page shows, with DOM assertions for each: the verdict chip, a one-paragraph plain-English "what this is", the stack-fit row (matched to saved chips), the trust-in-words row (maintenance/license/bus factor/deps-alive), the AI-ready badge, the slop-check caution, and the "Copy context for Cursor/Claude Code" money button.

**F3.5 — Heuristic disclaimer line.** *Acceptance:* a visible dated disclaimer line appears on every verdict (DOM assertion + screenshot).

**F3.6 — Show the receipts.** *Acceptance:* a progressive-disclosure expander reveals the pro Pulse metric view with evidence links and opt-in expensive stats; network trace shows stats fire only on expand (Pulse demoted, not deleted).

**F3.7 — Permalink + OG unfurl.** *Acceptance:* a `?repo=` permalink re-renders the same verdict in a fresh session; the share URL unfurls with an OG image (OG fetch returns an image).

---

### M4 — Design Direction Rollout (light-first warm + freshness glow + memetic share card)

**Intent.** Commit the design axis: light-first, warm, shadcn/Tailwind-familiar, one alive-glow freshness accent, two deliberate registers (calm in-app vs loud share card). Reject Field Manual as the front door; cut Phosphor entirely. DNA survives ONLY as the gated share-card watermark.

**Critical honesty constraint (red-team):** the alive-glow is a FRESHNESS indicator (renders on any verdict from data fresher than a stamped threshold — live OR recently-rebuilt cache), NOT a live-vs-cached flag. A live-only glow would be absent on the exact cached first-run shelf that converts — self-defeating and dishonest. Keep the A-F letter grade strictly share-card-only.

**Exit / validation criteria.**
- `VC-DESIGN-01..03`, `VC-SHARE-01..02` pass.
- In-app surface is light-first, warm, contrast-compliant (screenshot + contrast checks); no A-F grade and no bare 0–100 score in-app; grade appears only on the share card.
- Glow toggles by freshness threshold (test), not by live-vs-cached; every shelf card shows an `as of <date>` stamp.
- DNA watermark fingerprint is deterministic across simulated dates (no `Date.now()`), carries a one-line legend, and exposes a real `destroy()` — or DNA is dropped entirely (gate per D7).

| Feature | Claims | Key files / areas |
|---|---|---|
| F4.1 Light-first warm shadcn design system | VC-DESIGN-01, VC-DESIGN-03 | `theme.css`, `main.css`, `components.css` (light default, warm tokens); in-app: no grade/score |
| F4.2 Alive-glow freshness indicator + as-of stamps | VC-DESIGN-02 | freshness-threshold glow logic; shelf-card `as of <date>` stamps |
| F4.3 Memetic stamped share card | VC-SHARE-01 | share card: inspection-stamp + verdict label + A-F grade + DNA watermark + dated "not a security audit" footer |
| F4.4 DNA watermark determinism + legend + `destroy()` | VC-SHARE-02 | `RepositoryDNA/` (remove `Date.now()` per report bug #11; `index.js:140-146` `destroy()`; one-line legend) |

**Feature detail.**

**F4.1 — Light-first warm shadcn system.** *Acceptance:* in-app surface is light-default, warm, shadcn-familiar, and contrast-compliant (light-theme screenshot + contrast checks on key text); DOM assertions confirm absence of any A-F grade and any bare 0–100 score in-app, with explicit Unknowns shown in plain language.

**F4.2 — Alive-glow freshness + as-of stamps.** *Acceptance:* the alive-glow renders on any verdict computed from data fresher than the stamped threshold (live OR recently-rebuilt cache); a fresh-cache shelf card shows both the glow and a date stamp; a test asserts the glow toggles by freshness threshold, not by live-vs-cached.

**F4.3 — Memetic share card.** *Acceptance:* the exported card shows a bold inspection-stamp + verdict label + A-F grade + DNA watermark + a dated "not a security audit" footer, legible at thumbnail scale (full image + thumbnail-scale screenshot).

**F4.4 — DNA determinism + legend + `destroy()`.** *Acceptance:* the watermark fingerprint is identical for the same repo across simulated dates (no `Date.now()`); a one-line legend is present; the component exposes a real `destroy()` (unit test). If either gate (determinism + legend) is unmet, drop DNA and invest nothing further.

---

### M5 — Accessibility & QA Hardening

**Intent.** Close the live WCAG regressions and the test gap before declaring done: restore the app-wide focus ring, fix contrast and touch targets, JS-gate canvas motion, add wayfinding/announcements, and build the full automated test surface (engine units, page-controller states, MCP contract parity, Playwright E2E + a11y) that exercises the three cross-feature flows.

**Exit / validation criteria.**
- `VC-A11Y-01..05` pass.
- `VC-FLOW-01..03` pass (the cross-feature flows — claimed here because they require the engine, web surface, AND MCP to all exist).
- Page-controller tests cover loading/empty/error/404/202/rate-limit states; `collections.test.js` is rewritten to test the real module; Playwright E2E + a11y smoke exercise the three flows.

| Feature | Claims | Key files / areas |
|---|---|---|
| F5.1 Focus ring, contrast & touch targets | VC-A11Y-01, -02, -03 | `main.css:109` (replace `outline:none` + clipped box-shadow with real outline + forced-colors rule); muted-text tokens; 44px touch targets on inputs/selects |
| F5.2 Reduced-motion gating + wayfinding + toasts | VC-A11Y-04, -05 | `DNARenderer.js` (JS-gate rAF under prefers-reduced-motion); `aria-current="page"`; `index.html` `<h1>`; toast dismiss + ARIA live region |
| F5.3 Automated test surface + cross-feature E2E | VC-FLOW-01, -02, -03 | engine units (determinism/slop/stack-fit/AI-ready/context); page-controller tests; MCP contract parity; Playwright MCP E2E + a11y smoke (register Playwright MCP) |

**Feature detail.**

**F5.1 — Focus ring, contrast & touch targets.** *Acceptance:* a visible keyboard focus ring appears on all interactive controls (buttons, cards, inputs) including under forced-colors (keyboard-nav + forced-colors screenshots); muted text meets ≥4.5:1 in both light and dark themes (automated contrast report); interactive controls/inputs/selects are ≥44px on mobile (measured in a mobile viewport).

**F5.2 — Reduced-motion gating + wayfinding + toasts.** *Acceptance:* with `prefers-reduced-motion` set, the DNA canvas rAF loop is not running and a single static frame is painted (test + static-frame screenshot); the active nav link carries `aria-current="page"`, the index page has an `<h1>`, and toasts have a dismiss control plus an ARIA live region (DOM assertions).

**F5.3 — Automated test surface + cross-feature E2E.** *Acceptance:* the three end-to-end flows pass —
- **VC-FLOW-01 (cold novel-URL):** pasting a novel trending repo URL (not cached) renders a headline verdict from cheap-tier calls with honest Unknowns, allows Copy context, produces a share permalink, and reopening the permalink shows the same verdict (E2E trace + screenshots).
- **VC-FLOW-02 (in-agent parity):** `clone_check(repo)` in-agent pre-clone returns a verdict + context block matching the web surface for the same repo+SHA (side-by-side MCP vs web output).
- **VC-FLOW-03 (first-run stack-fit):** first run → pick 3 stack chips → verdict shows stack-fit matched to those chips → "show the receipts" reveals the pro view (E2E screenshots).

Engine unit tests (determinism, slop, stack-fit, AI-ready, context block), page-controller tests for all states (loading/empty/error/404/202/rate-limit), and MCP contract parity tests are part of this feature's deliverable surface.

---

### M6 — (Optional, post-v1) Power-user backend add

**Intent.** Stretch only — NOT part of the v1 contract and claims zero v1 assertions. Returns the deferred power-user surface once the wedge proves out. Do not pull any M6 work into v1; if v1 capacity is tight, M6 is the first thing cut.

**Exit / validation criteria.** Defined at the time M6 is funded; no v1 validation gate depends on it.

| Feature | Claims | Notes |
|---|---|---|
| F6.1 Per-user GitHub OAuth (private repos, quota headroom) | — | optional "Sign in with GitHub" for private-repo verdicts + personal 5,000/hr quota; never a v1 wall; shared single-PAT proxy stays rejected |
| F6.2 CLI, batch audits & saved context packs (Pro) | — | thin CLI on the same pure engine; batch verdicts; saved context packs; monetization never touches ranking neutrality (neutrality firewall per D8); 2-up Compare returns here once the cache makes N-repo affordable |

---

**Sequencing reminders for the orchestrator.**
- Hold the line on M1 → M3 ordering. Do not let a worker pull verdict-render work forward onto an unfinished engine.
- Raise worker reasoning effort to HIGH for the genuinely hard features: F1.1 (pure engine), F1.4 (the four differentiators), F2.2 (SHA cache), F2.3 (MCP server).
- Budget for the fix-feature loop: ~23 v1 features across 5 v1 milestones ≈ 33 worker/validator runs as a floor, before the expected ~1/3 fix overhead; plan 2–4 validation rounds per milestone.
- A false-green is the failure mode of this trust product: keep both `skipScrutiny=OFF` and `skipUserTesting=OFF`, and treat `VC-ENGINE-02/03/06`, `VC-WEB-04`, and `VC-SHARE-01` as hard pre-ship gates for the warm surface, not polish.

## Design System & Experience

Droid — this section defines the visual system, the two in-app registers, the share-card register, onboarding, and the live accessibility fixes. It is implementation-light on layout (workers own that) but **prescriptive on tokens, behavior, and acceptance**. All design work lands in M4, except the accessibility quick-wins (focus ring, contrast, touch, reduced-motion gating) which are unconditional and land in M5 regardless of any direction debate. Edit tokens in `src/css/theme.css`; the broken focus rule lives in `src/css/main.css` (~line 109); component skins in `src/css/components.css`; a11y rules in `src/css/accessibility.css`. Validation hooks: `VC-DESIGN-01/02/03`, `VC-SHARE-01/02`, `VC-A11Y-01..05`.

### Direction (locked — do not re-litigate)

**Light-first, warm, shadcn/Tailwind-familiar, with exactly ONE distinctive accent: a bioluminescent "alive-glow" used as a FRESHNESS indicator.** The audience is 63% non-developers whose stack gravity is Tailwind + shadcn — familiarity equals trust, and a full editorial rebuild is the single highest thrash risk for a long autonomous run. So the front door must feel like a polished shadcn app, not a branded art piece.

Rejected and out of scope as the front door (do not implement, do not let a worker drift toward them): **Field Manual / industrial / hazard-amber** (reads "real engineers only"), and **Phosphor / CRT / scanlines** (cut entirely). Their structural discipline may inform only the dense "receipts" depth view, never the landing surface.

The system runs in **three deliberate registers**:

| Register | Where | Feel | Rule |
|---|---|---|---|
| **Calm (Clone Check default)** | The verdict surface a non-dev reads to decide whether to trust the call | Warm, reassuring, plain-language, generous whitespace | NO A–F grade, NO bare 0–100 score, explicit Unknowns are first-class (`VC-DESIGN-03`) |
| **Receipts (pro / Pulse)** | Behind the "show the receipts" expander | Denser, metric-forward, evidence links | Coherent tokens with Calm; may carry more numbers/charts; still no letter grade |
| **Loud (share card)** | Exported image only | Bold, memetic, thumbnail-legible | A–F grade lives HERE and ONLY here; dated "not a security audit" footer required (`VC-SHARE-01`) |

### Palette (hex + roles)

Warm-neutral base (shift the current cool Zinc/`#f3f4f6` ground to warm stone) + one bioluminescent accent. **The light theme is co-equal and default, not a degraded fallback** (`VC-DESIGN-01`). Replace the existing teal accent (`--color-accent: #0d9488`) with the bioluminescent system below.

**Surfaces & ink**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-bg-primary` | `#FAF8F4` | `#0E0E10` | App ground (warm paper / near-black) |
| `--color-bg-secondary` | `#FFFFFF` | `#1A1A1D` | Cards, verdict panel |
| `--color-bg-tertiary` | `#F1ECE3` | `#26262A` | Muted fills, expander, chips |
| `--color-border` | `#E7E0D4` | `#33333A` | Hairlines, card edges |
| `--color-text-primary` | `#1C1917` | `#F5F3EF` | Headlines, verdict label |
| `--color-text-secondary` | `#44403C` | `#D6D3CD` | Body |
| `--color-text-muted` | `#6B6157` (≥4.6:1 on paper) | `#9AA0AC` (≥4.5:1 on `#26262A`) | Labels, captions, placeholders |

> Note: `--color-text-secondary` dark was already corrected to `#d1d5db`; keep that intent and warm it slightly. **Do NOT regress muted to the old `#9ca3af` (~2.4:1) / `#64748b`** — those are the live `VC-A11Y-02` failures.

**Accent — the alive-glow (bioluminescent freshness)**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-accent` | `#0E7C66` | `#34D399` | Interactive accent, primary button, links (deep enough for ≥4.5:1 on paper in light) |
| `--color-accent-hover` | `#0B6453` | `#5EEAD4` | Hover/active |
| `--color-glow` | `rgba(52, 211, 153, 0.45)` | `rgba(52, 211, 153, 0.55)` | **Alpha-based** glow used in BOTH themes — fixes the opaque pale-mint halo bug (`--color-accent-subtle` misused as a shadow in ~6 places) |

In dark mode the accent reads as actual bioluminescence; in light mode it's a confident emerald. **The glow is a freshness signal, not a live-vs-cached flag** (see signature moves).

**Verdict state colors** (warm, distinguishable, never an alarm-red panic palette):

| State | Text (light) | Tint fill (light) | Role |
|---|---|---|---|
| Looks clone-able | `#15803D` | `#E8F6EC` | Positive cap (never "Safe") |
| Clone with care | `#B45309` | `#FBF1E3` | Caution amber |
| Skip it | `#B42318` (clay, not fire-engine) | `#FBEAE7` | Negative |
| Not enough signal | `#57534E` (warm slate) | `#F1ECE3` | Honest Unknown — first-class, never styled as "broken" |

Provide dark-theme equivalents (lighten text ~2 steps, drop tint alpha to ~0.15). Verify each state's text/tint pair at ≥4.5:1 in both themes before M4 closes.

**Glow scale tokens** (kill the scattered ad-hoc `0 0 5/8/10/15-20px`): introduce `--glow-sm: 0 0 6px`, `--glow-md: 0 0 12px`, `--glow-lg: 0 0 22px`, each composed with `--color-glow`. Route every glow through these.

### Typography

Stay shadcn-familiar; do not introduce an editorial serif on the front door.

- **UI / body:** Inter (or the system `ui-sans-serif` stack) — the audience's native register.
- **Mono:** a single mono (e.g. `ui-monospace`, JetBrains Mono) reserved for: the verdict's evidence/receipts (`last commit 3 days ago`), the copyable agent-brief block, code/file names, and the `as of <date>` stamp. Mono = "this is sourced data," and that is the entire trust tell — do not spray mono across the whole UI (the old build's mistake).
- **Scale:** one type ramp. Verdict label is the largest in-app type. "What this is" paragraph is comfortable reading size (≥16px). Keep one consistent ramp; no per-page drift.

### Motion

Organic and calm, never floaty-generic. Spring/ease-out with slight settle (~180–220ms); cards "settle" rather than snap or `translateY`-float. The alive-glow may breathe on fresh verdicts (a slow `sin` pulse, opacity only). **All motion is gated** — see reduced-motion below. No motion may block reading the verdict.

### Signature moves (the ownable bits)

1. **Alive-glow = freshness, not liveness.** The accent glow renders on **any** verdict computed from data fresher than a stamped threshold — live fetch OR a recently-rebuilt cache entry. It must NOT key on live-vs-cached, or it would be absent on the exact pre-cached first-run shelf that converts (`VC-DESIGN-02`; risk: "design two-register honesty"). Drive it off a freshness timestamp compared to a threshold.
2. **`as of <date>` stamps everywhere data is dated.** Every curated-shelf card and every cached verdict carries a visible mono `as of <date>` stamp (`VC-DESIGN-02`, `VC-CACHE-02`). Honesty about staleness is the brand.
3. **Inspection stamp.** A bold rubber-stamp motif (the verdict label inside a stamped frame) is the share-card hero and a lighter echo in-app on the verdict chip.
4. **DNA watermark — share card only.** Pulled entirely out of the verdict/eval flow. Survives ONLY as the deterministic fingerprint watermark on the export card, gated on: remove `Date.now()` non-determinism (stable across days), add a one-line legend, expose a real `destroy()` (`VC-SHARE-02`). If those gates aren't met, drop it; invest nothing further.

### Share card (loud register) — `VC-SHARE-01`

Exported image must contain, legible at thumbnail scale in an X/Reddit feed: bold inspection-stamp + verdict label + **A–F letter grade (share card only)** + deterministic DNA watermark + one-line DNA legend + a dated `heuristic check — not a security audit` footer. The grade must NOT leak into the in-app surface (`VC-DESIGN-03`). Generate via the existing `toBlob`/`createDNABadge` export plumbing.

### Vibe-coder surface — look & feel (distinct yet coherent)

"Clone Check" is the **default web skin AND the in-agent MCP rendering** — one jargon-off face of the same engine. It is the Calm register. It must feel distinct from the pro "receipts/Pulse" view yet share every token:

- **Distinct:** plain-English sentences over metrics ("One author wrote 71% of commits — risky if they leave" rather than a contributor bar chart); a single big verdict chip; the money button ("Copy context for Cursor/Claude Code") visually dominant; warm and unintimidating.
- **Coherent:** same palette, type ramp, glow tokens, spacing. The "show the receipts" expander reveals the denser Pulse view **in place**, using the same tokens — it reads as "more detail," not "a different app." No A–F grade or bare score appears in either in-app register.
- A visible dated `heuristic check, not a security audit — verify before you ship` line sits on every verdict (`VC-WEB-04`), styled as quiet muted text, never hidden.

### Onboarding / first 60 seconds

Zero login, zero token. The first-run path:

1. **Landing is never an empty search box.** A paste-a-URL input sits beside a date-stamped curated "reputable starters" shelf, so a verdict is reachable in one action with no auth (`VC-WEB-01`).
2. **One-time 3-chip stack picker** appears on first run (e.g. Next.js / Supabase / Tailwind), ~10 seconds, stored in localStorage, **never shown again** after selection, and explicitly **not a login** (`VC-WEB-02`). Frame it as "so we can tell you if it fits your stack" — a value exchange, not a gate. After this, the stack-fit row has something to match against on the very first verdict.
3. Within seconds the user sees: verdict chip → one-paragraph "what this is" → stack-fit row (matched to their chips) → trust-in-words row → AI-ready badge → slop caution → money button → dated disclaimer. "Show the receipts" is collapsed by default.

The picker must feel like the only setup step that exists; do not add a tutorial overlay, a tour, or a settings wall.

### Responsive requirements

- **One breakpoint ladder.** The old build sprawls across ~11 ad-hoc breakpoints. Collapse to a single documented ladder (e.g. 360 / 480 / 640 / 768 / 1024 / 1280) and use it everywhere; no new stray values.
- **Single-source shell.** Page chrome/nav renders from ONE shared source — kill the ~115-line header duplicated across pages and the `pulse.html` active-class drift (`VC-SHELL-01`).
- Verdict surface is readable and fully usable at 360px wide: verdict chip, plain-English summary, money button, and disclaimer all visible without horizontal scroll; receipts collapse gracefully.
- **Touch targets ≥44px on mobile** (`VC-A11Y-03`): the filter `.input`/`.select` controls currently land ~39px. Add `min-height: 44px` to inputs/selects/buttons within the mobile touch block (`@media (max-width:1024px)`).

### Accessibility requirements (live WCAG fixes — non-negotiable, M5)

These are real regressions in the current app, not polish. Each maps to a `VC-A11Y-*` assertion and must pass before "done."

- [ ] **Restore the app-wide focus ring (`VC-A11Y-01`).** The current `:focus-visible { outline: none; box-shadow: var(--shadow-focus) }` is silently broken: `.btn`/`.card` use `overflow: hidden`, which clips the box-shadow ring, and `forced-colors` never paints box-shadow at all. **Replace with a real outline** that ignores `overflow:hidden`:
  - `:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: 2px; }` (optionally keep the glow as a secondary cue).
  - Add an explicit focus rule inside `@media (forced-colors: active)` so the ring survives forced-colors. Evidence: keyboard-nav screenshots + a forced-colors render.
- [ ] **Fix muted-text contrast in BOTH themes (`VC-A11Y-02`).** Light `--color-text-muted` → `#6B6157` (≥4.6:1 on paper); dark muted → `~#9AA0AC` so it clears 4.5:1 on the `#26262A` tertiary surface it actually sits on. Make search/select chevron SVG strokes `currentColor` instead of a hardcoded grey. Produce an automated contrast report for muted tokens in both themes.
- [ ] **44px touch targets (`VC-A11Y-03`)** — see Responsive above; measure in a mobile viewport.
- [ ] **Reduced-motion stops the canvas (`VC-A11Y-04`).** CSS cannot halt a `requestAnimationFrame` loop. **JS-gate** every canvas/raf loop (DNA in `DNARenderer.js`, the Pulse heartbeat, the commit heatmap) on `matchMedia('(prefers-reduced-motion: reduce)')`: when reduced-motion is set, do not start/stop the rAF loop and paint a single static frame. Subscribe to the media query's `change` event so it responds live. Evidence: a test asserting the rAF loop is not running under reduced-motion + a static-frame screenshot.
- [ ] **Wayfinding + announcements (`VC-A11Y-05`).** Add `aria-current="page"` to the active nav link (desktop + mobile) on every page via the shared shell; standardize the active class so Pulse stops losing its highlight (the old `pulse.html` drift). Add an `<h1>` to the index page. Give toasts a dismiss control and an `aria-live` region. Evidence: DOM assertions for `aria-current`, the `h1`, and the toast live-region/dismiss.

### Acceptance for this section

Light-theme screenshot with passing contrast on verdict label, muted labels, and each verdict-state chip (`VC-DESIGN-01`); a fresh-cache shelf card showing BOTH the alive-glow and an `as of <date>` stamp, with a test proving the glow toggles on the freshness threshold and not on live-vs-cached (`VC-DESIGN-02`); DOM assertions confirming no A–F grade and no bare score in-app, and their presence on the export card (`VC-DESIGN-03`); an exported share card legible at thumbnail with all required elements (`VC-SHARE-01`) and a deterministic, legended, `destroy()`-able watermark (`VC-SHARE-02`); and all five `VC-A11Y-*` evidence artifacts.

I have enough context. Writing the section now.

## Guardrails, Config & Operating Instructions

This is the closing operations contract for the mission. Droid: treat everything in this section as binding. Where a rule here conflicts with a worker's local judgment, this section wins. These constraints are not polish — several of them are pre-ship gates that block the milestone from passing.

### 1. Hard Constraints (non-negotiable, enforce on every feature)

These are the invariants every fresh-context worker and every adversarial validator must inherit. Surface them verbatim in `AGENTS.md` so they survive context resets — anything not in a durable artifact does not exist for the workers.

| # | Constraint | Why it is load-bearing | Tied to |
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

### 2. Skills the Mission Should Use

Name these so the orchestrator reuses rather than rediscovers them. Existing Droid config (skills, MCP integrations, custom droids, hooks) carries straight into the mission.

| Skill | Where it applies |
|---|---|
| `design-planning` / `sc-design` | M3/M4 — the light-first warm shadcn-familiar surface and the two-register design system; plan the verdict composition and share card before implementation. |
| `frontend-design` | M3/M4 — production-grade, non-generic UI for the verdict surface, shelf cards, and the memetic share card. |
| `sc-implement` | M1–M3 worker implementation — the pure `verdict()` engine, contents API, four differentiators, MCP server, web surface. |
| `sc-test` | M1 (QA harness) and M5 (engine units, page-controller states, MCP contract parity, Playwright E2E + a11y). |
| `claude-api` | Reference only — confirms there are **no LLM calls in v1** (deterministic templating). Use to keep workers from reaching for a generative shortcut, not to add one. |
| `code-review` | Scrutiny support at milestone boundaries — adversarial white-box review of worker diffs. |
| `security-review` | M2 — real HTTP security headers, `escapeAttr`, safe `setItem`, SHA-keyed-not-shared-PAT, CSP. |
| `verify` | Black-box confirmation that a verdict renders end-to-end on the web path AND via the MCP `clone_check` tool before a feature is called done. |

**MCP integrations to register up front** (they are both deliverables and validation surfaces):
- The **`clone_check` MCP server** — workers build it (M2) and validators must invoke it programmatically (VC-MCP-01/02, VC-FLOW-02). It needs its own scriptable invocation path, not just the web UI.
- The **Playwright MCP** — for the M5 E2E + a11y smoke driving the three cross-feature flows.

### 3. Recommended Factory Config

Pair a strong orchestrator/validator with a balanced worker — planning and adversarial validation are the highest-leverage work, and this is a TRUST product where a false-green is the failure mode.

| Key | Recommended setting | Rationale |
|---|---|---|
| `missionOrchestratorModel` | Strongest available model | Authoring the validation contract and holding firm on the greenfield-vs-reskin scope + backend-in-v1 decision is the make-or-break work. |
| `missionOrchestratorReasoningEffort` | `high` | Planning/steering benefits most from extra reasoning. |
| `missionModelSettings.workerModel` | Balanced/faster model | Routine feature work; most of the ~23 v1 features are well-bounded. |
| `missionModelSettings.workerReasoningEffort` | `medium`, raised to `high` for the hard features | Raise to `high` for: the pure `verdict()` engine and four differentiators (M1), the MCP server, and the SHA-keyed cache (M2). |
| `missionModelSettings.validationWorkerModel` | Strong model | One setting covers BOTH scrutiny and user-testing validators; validation is adversarial and this product fails on false-green. |
| `missionModelSettings.validationWorkerReasoningEffort` | `high` | Validators must adversarially hunt false-greens and 202/empty-stats fabrications, not happy-path. |
| `missionModelSettings.skipScrutiny` | **OFF** | Correctness/code-quality is paramount; the engine invariants are subtle. |
| `missionModelSettings.skipUserTesting` | **OFF** | The app has a real scriptable web QA surface AND an MCP harness — user-testing validators fully apply. |
| `keepSystemAwakeDuringMissions` | `true` (default) | Long local run. |
| `missionPolicy.restrictedAccess` / `allowedUserIds` | Per org policy | Set if running under Enterprise gating. |

**Cost sizing.** Cost floor ≈ `#features + 2*#milestones`. This blueprint is ~24 v1 features across 5 v1 milestones (M6 optional) ≈ 24 + 10 = **~34 worker/validator runs as a floor**, before the expected ~1/3 fix-feature overhead. Budget for **2–4 validation rounds per milestone** and expect validation to consume ~37% of runtime. For a run of this size, consider a **Droid Computer** so it executes in the background on a persistent machine; missions are resumable from Mission Control.

**AGENTS.md is mandatory.** Surface an `AGENTS.md` capturing: the test/build/deploy commands; the HC-1…HC-13 invariants (especially never-assert-Safe, never-positive-on-missing-data, own-the-false-green-response, redact-secrets-from-disk-logs); the ≤2-cheap-calls headline rule; and the file map. Every fresh-context worker inherits it.

### 4. How to Run It as a Desktop Mission

1. **Start.** In the desktop app, open a new session in **Mission mode** (or run `/enter-mission` / `/missions` inside a session, or start from the Mission Control page). Paste this brief.
2. **Have the planning conversation — do not skip it.** The plan is the product. Let Droid push back and ask clarifying questions until the plan is solid. Confirm: the validation contract is authored before features; every VC-ID is claimed by exactly one feature (no orphans, no duplicates); milestone ordering enforces **M1 (trustworthy engine) → M3 (warm surface)** with the WS-1 sequencing gate intact. Approve only when the milestone/feature decomposition matches the blueprint.
3. **Both owner gates are RESOLVED — confirm and proceed** (recorded in `EXPERIMENT-PANEL-CONSENSUS.md`):
   - **BACKEND IN V1 — APPROVED.** Build the serverless backend (MCP + SHA cache + OG) as core v1; it is not a scope-cut lever. (The owner abided by the panel's recommendation.)
   - **FALSE-GREEN OWNERSHIP — CONTAINMENT IN V1.** The product owns the *response*, not a guarantee: ship the F2.5 / Group H containment layer (report path, cache kill-switch, public methodology page, `INCIDENT-PLAYBOOK.md`). One remaining human task: designate the on-call owner who operates the kill-switch when an incident fires.
   - Recommended sequence: ship the **context-block MCP alone as a ~1-week probe** (buildable after M1 + the M2 MCP feature) before funding the full Clone Check build (WEDGE-VALIDATION GATE).
4. **Approve → Mission Control.** Droid enters the dashboard. You are now the project manager: watch the progress log, worker terminal output, and per-role model dropdowns (tunable on the fly).

### 5. How the Owner Intervenes / Checkpoints

Missions are not fire-and-forget. Let the fix-feature loop run (2–4 rounds/milestone is normal); reserve intervention for these named failure modes:

| Symptom | Lever |
|---|---|
| "Feature retry limit reached" | Root cause is almost always an un-exercisable app. Inspect the latest worker for that feature; confirm the M1 QA harness + MCP invocation path actually stand up. |
| Frozen mission | Pause the orchestrator, tell it what you are seeing, ask it to recover. |
| Stuck worker | Pause; tell it to mark the current item complete and move on — you do not need to wait. |
| Blocked milestone | Ask the orchestrator to re-assess remaining work and explain the block. |
| Change of direction / scope pressure | Pause and tell the orchestrator; it can re-scope and continue. Use this if a worker tries to pull verdict-render (M3) ahead of trust (M1), or revive a CUT feature. |

**Checkpoint at every milestone boundary** — these are your validation gates. Specifically verify before letting the run proceed past:
- **End of M1:** HC-1…HC-4 engine gates pass and the QA harness + MCP harness are exercisable (validators must run from M1).
- **End of M2:** SHA-keyed cache hit verified (no upstream GitHub calls on repeat), MCP parity holds, CI gate blocks a demonstrated failing run, real HTTP headers present via `curl -I`.
- **Before M3 ships:** the full trust-gate set (VC-ENGINE-02/03/06, VC-WEB-04, VC-SHARE-01, **VC-CONTAIN-02 kill-switch, VC-CONTAIN-03 methodology page**) is green and a named false-green on-call owner exists. Do not let the friendly surface ship on an unproven engine or without the ability to pull a bad verdict.
- **End of M5:** the three cross-feature flows (VC-FLOW-01/02/03) pass end-to-end and the live a11y regressions (focus ring, contrast, touch targets, reduced-motion) are closed.

### 5b. Incident Response (post-launch false-green)

When a verdict is reported wrong, or a "Looks clone-able" screenshot goes viral against a repo that turns out bad, follow `INCIDENT-PLAYBOOK.md` (built in F2.5): **detect** (report channel / social) → **kill-switch** the specific repo+SHA verdict so it withdraws/recomputes globally with no redeploy (`VC-CONTAIN-02`) → **post a public correction**, pointing to `/how-it-works` (`VC-CONTAIN-03`) → **patch** the gamed heuristic → **add a regression test** so the same gaming can't recur. The disclaimer (HC-3) limits *legal* exposure; this loop limits *reputational* exposure — the one that can kill a trust product. Designate the on-call owner before launch.

### 6. Definition of Done (v1 recap)

v1 is done when ALL of the following hold:

- [ ] **One pure `verdict()` engine** — deterministic, zero DOM/fetch coupling, four states, never "Safe", structurally impossible to go positive on missing data, dated disclaimer on every verdict, gameable signals worded as likelihoods. (VC-ENGINE-01…06)
- [ ] **Trustworthy data layer** — new contents API; headline from ≤2 cheap calls; PRs excluded from issue counts; real `{login, percentage}` bus factor; 202/empty degrade honestly; expensive stats opt-in. (VC-CONTENTS-01, VC-DATA-01…05)
- [ ] **Four differentiators built greenfield** — slop detector (with squashed-history guard), stack-fit matcher, AI-readiness badge, deterministic context block. (VC-STACK-01, VC-AIREADY-01, VC-SLOP-01, VC-CONTEXT-01)
- [ ] **Two co-equal surfaces** — MCP `clone_check(repo)` working on novel repos in-agent with no web detour and no token, at parity with the web engine for the same repo+SHA. (VC-MCP-01/02)
- [ ] **Serverless backend** — SHA-keyed verdict cache (repeat repo+SHA served without GitHub fan-out) + pre-cached, date-stamped, scheduled-rebuild shelf. (VC-CACHE-01/02)
- [ ] **Quota + platform hardening** — AbortController cancellation, honest 429/Retry-After, safe `setItem`, `escapeAttr`; CI gate (ci/test/build/audit); deployed to a public URL with real HTTP security headers; fossils removed and docs current. (VC-PLATFORM-01…04, VC-HYGIENE-01)
- [ ] **Warm web surface** — zero-friction paste-URL + dated shelf; one-time 3-chip stack picker; full verdict composition + the "Copy context for Cursor/Claude Code" money button; visible dated disclaimer; "show the receipts" progressive disclosure; `?repo=` permalink + OG unfurl; single-source shell with deep-linkable Back/Forward state. (VC-SHELL-01, VC-WEB-01…06)
- [ ] **Design rollout** — light-first warm shadcn-familiar skin; freshness alive-glow + "as of" stamps; calm in-app register with no grade/score in-app; memetic stamped, DNA-watermarked, dated share card with a deterministic (no `Date.now()`) fingerprint + legend + real `destroy()`. (VC-DESIGN-01…03, VC-SHARE-01/02)
- [ ] **Accessibility + QA** — visible focus ring everywhere (incl. forced-colors); muted text ≥4.5:1 both themes; ≥44px touch targets; reduced-motion stops the canvas to a static frame; aria-current/h1/toast live region; engine units + page-controller-state tests + MCP contract tests + Playwright E2E/a11y exercising all three flows. (VC-A11Y-01…05, VC-FLOW-01…03)
- [ ] **Trust-incident containment** — "Report this verdict" on every surface; authenticated cache kill-switch that withdraws/recomputes a single repo+SHA verdict with no redeploy; public `/how-it-works` methodology page linked from every verdict; committed `INCIDENT-PLAYBOOK.md`; named on-call owner. (VC-CONTAIN-01…04)
- [ ] **Green suite + green CI**, each feature committed cleanly, and **nothing built that no assertion claims.**

Anything in the CUT list (2-up Compare, command palette, query builder, Fork Network Voyager, deep SBOM, generative-LLM verdict, BYO-key, Watchlist, full Decision Matrix, whole-repo ingest, shared-PAT proxy, any "Safe to clone" language) is **explicitly out of v1** and its presence is a defect, not a bonus. M6 (per-user OAuth, CLI/batch/Pro, Compare's return) is stretch — start it only after the v1 wedge proves out.
