# Validation Contract — Definition of Done

> Adopted verbatim from the Factory Mission Brief §2. This is the load-bearing
> artifact of the mission. Every assertion below is a black-box-observable,
> pass/fail behavior — no subjective adjectives, no "looks good." The coverage
> invariant is total: **every assertion ID here must be claimed by exactly one
> feature's `fulfills` — no orphans, no duplicates.** User-testing validators
> will exercise these against the running web surface AND the MCP tool;
> scrutiny validators will check the engine internals. Keep `skipScrutiny=OFF`
> and `skipUserTesting=OFF`.

**Two hard gates override normal milestone convergence:**

1. **Sequencing gate (M1 → M3):** All of `VC-ENGINE-01..06`, `VC-DATA-01..05`, and `VC-CONTENTS-01` must be GREEN before any verdict-rendering web feature (the M3 `VC-WEB-*` set) is allowed to validate. A friendly face on an untrustworthy engine is the one failure that kills the product. Do not let a worker pull verdict-render work ahead of the trust core.
2. **False-green ship gate:** `VC-ENGINE-02`, `VC-ENGINE-03`, `VC-ENGINE-06`, `VC-WEB-04`, `VC-SHARE-01`, `VC-CONTAIN-02`, and `VC-CONTAIN-03` must ALL pass before the warm surface is exposed at a public URL — you may not go live without the ability to pull a bad verdict (`VC-CONTAIN-02`) and a public methodology page (`VC-CONTAIN-03`). This is a liability gate, not polish.

Each assertion is stated as **Behavior** (the pass/fail condition) and **Evidence** (what a validator must collect). Where a code path is named, the affected modules are `src/js/api.js` (data layer + new contents calls), `src/js/components/HealthScore.js` (DOM-coupled today — the pure engine is authored fresh, not refactored from it), and `src/js/common.js` (storage/escaping). See `PROJECT-ANALYSIS-AND-RECOMMENDATIONS.md` for the underlying bug ledger these assertions close.

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
