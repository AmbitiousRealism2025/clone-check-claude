# Experiment — Review Panel Consensus

> **Generated:** 2026-06-26 by a staged 6-persona review panel (The Vibe Coder · Product Strategist · Growth/Distribution · Staff Engineer · Design/UX · Skeptic), run as positions → cross-rebuttals → adversarial red-team → chair consensus. Audience mandate: vibe coders first; product mandate: blend the report's due-diligence core with a dedicated vibe-coder mode.
>
> **What changed vs. the analysis report:** the panel sharpened the product into **"Clone Check,"** promoted an **MCP server (in-agent) to a co-equal v1 surface**, flipped to a **backend-in-v1** (SHA-keyed verdict cache), **cut 2-up Compare from v1**, and ruled out LLM calls + a shared-PAT proxy. The red-team's 10 fatal-flaw findings reshaped several decisions (notably the freshness-glow honesty fix and the backend flip). This doc feeds the Factory mission brief (`FACTORY-MISSION-PROMPT.md`).

---

## Panel Consensus — Vibe-Coder Revival Decisions

### The Mandate

Blend the existing repository-explorer assets into a single sharp product, aimed **vibe-coders first**, around one job worth doing well: helping an anxious, mostly-non-developer audience decide whether a recommended GitHub starter is worth cloning *before* they burn a weekend on it. The audience (63% non-developers) lives inside Cursor and Claude Code, trusts the Tailwind/shadcn visual world, and has one recurring trauma — *"it looked finished, then broke past the surface."* Everything below optimizes for trust, in-flow delivery, and honesty about what a heuristic can and cannot promise.

**Product one-liner:** a trustworthy *"should I clone this starter?"* engine — one pure-function due-diligence core, delivered first where vibe-coders already work (an MCP server + deterministic context block inside Cursor/Claude Code) and mirrored on a website as a plain-English **Clone Check** verdict (*looks clone-able / clone with care / skip / not enough signal*). It detects stack-fit + AI-readiness + slop and hands over a paste-ready agent brief. One engine, two surfaces, never a security guarantee.

---

### Decisions (D1–D9)

| # | Decision | Rationale | Dissent |
|---|----------|-----------|---------|
| **D1** | **One engine, two surfaces — built greenfield, not reskinned.** Build ONE deterministic pure-function `verdict()` engine; expose it through two co-equal v1 surfaces — the in-agent MCP/context-block AND the warm *Clone Check* website — with the pro Pulse metric view behind a "show the receipts" toggle. Drop the draft's "keep the engine verbatim." | JTBD maps ~1:1 to plain language + stack-fit + AI-readiness + context block. But honesty about scope is mandatory: `HealthScore.js` is DOM-coupled (line 121), and there is no verdict engine, slop detector, stack-fit, AI-readiness check, or contents API. This is a from-scratch value-prop build on a 7-page demo. | Skeptic wanted collapse to one screen + settings; panel keeps the shared pure-function core with the pro view demoted (not deleted) and the MCP promoted to co-v1. |
| **D2** | **The single killer job.** *"My agent / a tweet / a YouTube video / an awesome-list told me to clone this starter — before I burn my weekend, is it maintained-or-slop, does it fit my stack, will my agent understand it, and give me a brief so it doesn't faceplant."* Starter SELECTION + agent priming — not abstract dependency adoption, not a code tour. | Sharpest, most frequent, most expensive, most emotionally charged moment (one user lost 17 hours on auth from the wrong starter). GitHub buries it (stars lie); a stateless LLM chat can't source or persist it. The user is already inside their agent here — so the MCP is primary, not an afterthought. | None substantive; framing sharpened (entry is an agent/tweet-recommended clone, not a deliberate dep pick). |
| **D3** | **Design direction.** Light-first, warm, shadcn/Tailwind-familiar front door + one "alive-glow" accent **redefined as a freshness indicator** (renders on data fresher than a stamped threshold — live OR recently-rebuilt cache). Reject Field Manual as front door; cut Phosphor/CRT. Two registers: calm/warm in-app, bold/memetic stamped share card with a dated "not a security audit" footer. | Familiarity equals trust for a non-dev majority; a full editorial rebuild is the highest thrash risk for a long autonomous mission. Red-team caught that a live-only glow would be ABSENT on the cached first-run surface that converts; freshness + date stamps resolves the self-defeat honestly. | Report + three round-1 voices backed Field Manual; Design Lead pushed full Specimen; Growth insists the share card stays loud. Resolved as a register split. *Owner should bless "two registers allowed."* |
| **D4** | **Backend is v1 (changed from fast-follow).** v1 bundle = MCP server + serverless SHA-keyed verdict CACHE. Verdict is a pure function so all surfaces are thin wrappers. Quota tiered: headline from the 1–2 cheapest calls (metadata + commits list); expensive stats endpoints opt-in. Curated shelf pre-cached, scheduled-rebuild, date-stamped. Per-user OAuth later. Shared single-PAT proxy rejected. | Pure client-side v1 bricks on novel/trending URLs on the highest-visibility day, and the moat (MCP) was being deferred. SHA-keyed cache-hit peaks when load peaks; tiering survives the verified 202/empty-`{}` failures of the stats endpoints on famous repos. | Original draft had no-backend v1; chair concedes the Skeptic/Growth dissent in substance. *Owner must confirm appetite for a v1 backend* — but chair rules cache-first over any shared-token proxy. |
| **D5** | **Cut 2-up Compare from v1.** Ship single-repo verdict only. Compare returns once the SHA cache + cheap-tier verdict make N-repo affordable on novel URLs. | The draft's Compare only worked on pre-cached shelf repos you already trust and bricked on the novel tweet-recommended pair that IS the decision. Constrained-to-uselessness scope should be cut, not shipped. Freed effort funds the four real differentiators and the v1 backend. | Product Strategist/Vibe Coder wanted Compare sooner; chair rules it quota-bound vaporware until the cache lands. |
| **D6** | **AI features.** Deterministic rule-based templating for the verdict; NO LLM calls in v1. The "Copy context for your agent" block is deterministic assembly and is the LEAD v1 value (shipped via MCP). BYO-key dropped. **Honesty guardrail:** slop and AI-ready are gameable heuristics, worded as likelihoods ("looks abandoned", "likely agent-friendly"), never laundered as facts. Generative AI only ever as server-proxied garnish beside the receipts. | The user already pays for Cursor/Claude Code; competing on generation erodes the only moat — a sourced, auditable, reproducible verdict. Red-team flagged that branding heuristic guesses as "deterministic, sourced, auditable" launders authority a non-dev cannot interrogate; the wording guardrail fixes this without losing determinism. | Skeptic wanted AI-as-narrator default-on; Vibe Coder wanted an AI proxy as first server; both conceded deterministic templating is cheaper, safer, the moat. |
| **D7** | **Repository DNA fate.** Remove DNA from the verdict/eval flow entirely. Keep ONLY as the share-card watermark, hard-gated on (a) fixing the `Date.now()` non-determinism and (b) adding a one-line legend, plus the dated footer. Invest nothing further. | Decorative, non-deterministic, illegible-without-legend art in a trust path is tonally fatal for this audience. A fixed, legended, ownable fingerprint on a shareable card is near-free brand propagation (export plumbing already exists). | Skeptic wanted a full drop; conceded to "out of core flow, allowed as gated share-card watermark." |
| **D8** | **Distribution & monetization — MCP is v1, not fast-follow.** MCP ships in v1 as in-flow surface AND durable moat. Growth loops: MCP pre-clone `clone_check`; shareable stamped DNA-watermarked verdict card; curated starters list + "is [boilerplate] safe to clone?" SEO + embeddable README badge + awesome-list inclusion. Rename to **Clone Check**. Free forever: core verdict + context block + share + MCP. Pro: batch audits, CLI, saved context packs, higher quota (OAuth), team/B2B due-diligence. **Neutrality firewall:** never take boilerplate-brand money to influence rankings; affiliate only on independently-graded "fits your stack" starters, disclosed, zero score influence; any "verified" seal earned/objective/revocable. The memetic A–F letter grade lives on the SHARE CARD only. | This audience lives inside their agent and IS the share culture. Deferring MCP inverted priority — withholding the defensible, in-flow part while shipping the cloneable wrapper. Neutrality is the entire value of the verdict, so revenue must come from workflow tooling and teams, never from moving the score. | Growth wanted a letter grade as the PRIMARY in-app verdict; chair keeps that on the share card only. Chair notes the wedge-thinness concern is real and gates the full build behind a cheap MCP probe. |
| **D9** | **Cuts & trust-liability resolution.** Cut/defer everything serving the deprioritized pro-dev or burning the 60-req/hr budget (see list below). **Hard trust gate:** never assert "Safe" (cap at "Looks clone-able"); never render positive on missing data; dated "heuristic, not a security audit" disclaimer on every verdict AND share card; a named owner for a viral false-green incident BEFORE the warm surface ships. | At 60 req/hr unauth, any feature fanning out N>~3 calls/repo is unusable for a no-token audience; qualifier-syntax/archaeology surfaces violate the jargon anti-need. Determinism removes hallucination but NOT being confidently wrong on a malicious-but-recently-touched repo — a false-green is the cheapest thing for a troll to manufacture and screenshot. | Skeptic wanted to cut the whole 7-page MPA and the dev-second audience; chair keeps the shared shell (pro view demoted) and treats dev-second as the "receipts" layer. |

---

### The Vibe-Coder Mode

**Name:** **Clone Check**

**Concept:** the DEFAULT web surface AND the in-agent MCP tool — one jargon-off rendering of the same deterministic due-diligence engine, ending in a paste-block (or direct MCP hand-off) for the user's AI agent. Reframed to the audience's own words: *"My agent / a tweet / a YouTube video / an awesome-list told me to clone this starter — before I burn my weekend, is it maintained-or-slop, does it fit my stack, will my agent understand it, and give me a brief so it doesn't faceplant."*

**Key surfaces:**

- **MCP tool (co-equal v1 surface):** the agent calls `clone_check(repo)` pre-clone and gets the verdict + deterministic context block in-flow — no detour to a website.
- **Input (web):** paste a GitHub URL or pick from a pre-cached, date-stamped "reputable starters" shelf — no login, no token, no empty search box.
- **First-run stack picker:** a one-time 10-second 3-chip picker (e.g. Next.js / Supabase / Tailwind) stored in localStorage — NOT a login — so the high-converting "fits your stack" signal isn't dead on first impression.
- **Verdict chip:** big plain-English headline — *Looks clone-able / Clone with care / Skip it / Not enough signal.* Never asserts "Safe"; never a bare 0–100 in-app; explicit honest *Unknown* states are first-class, and it is structurally impossible to render positive on missing data.
- **Heuristic disclaimer:** a visible, dated *"heuristic check, not a security audit — verify before you ship"* line on every verdict and the share card.
- **What this is:** one-paragraph human summary, no jargon.
- **Stack-fit row:** auto-detected chips (Next.js / React / Supabase / Tailwind / shadcn / Stripe / Prisma) parsed from `package.json` + config via the new contents API, matched against the saved 3-chip stack.
- **Trust-in-words row:** maintenance ("last commit 3 days ago"), license, bus factor in plain words, lightweight "are headline deps alive + pinned?" flag — all from the 1–2 cheapest calls so the headline survives 202/empty-stats failures.
- **AI-ready badge:** detects `CLAUDE.md` / `AGENTS.md` / `.cursor` rules + README quality + file-count modularity, worded as a likelihood ("likely agent-friendly"), not a guarantee.
- **Slop-check caution:** initial-commit-only history, no tests, abandoned — worded as "looks like," with a squashed-history false-positive guard.
- **The money button:** *"Copy context for Cursor/Claude Code"* (web) / direct MCP hand-off (in-agent) — the deterministic paste-ready brief, the real product.
- **Show the receipts:** progressive-disclosure expander revealing the pro metric view (Pulse signals, evidence links, opt-in expensive stats) from the same engine.
- **Share:** export a bold stamped, DNA-watermarked, dated verdict card.

---

### v1 Scope (checklist)

- [ ] **Pure-function `verdict()` engine** built from scratch (repo data in, structured verdict out, no DOM/fetch coupling) — NOT a reskin of `HealthScore.js`.
- [ ] **New contents API in `api.js`** (fetch `package.json`, README, file tree, and AI-rules files: `CLAUDE.md` / `AGENTS.md` / `.cursor`) — the prerequisite for the four differentiators.
- [ ] **Four un-owned differentiators built greenfield:** slop detector, stack-fit matcher, AI-readiness badge, deterministic context block.
- [ ] **MCP server** exposing verdict + context block in-agent — co-equal v1 surface, the moat and the in-flow workflow.
- [ ] **Serverless SHA-keyed verdict cache** so novel/trending launch-day URLs survive the 60/hr cliff.
- [ ] **Tiered quota design:** headline verdict from 1–2 cheapest calls; expensive stats endpoints opt-in behind "receipts."
- [ ] **Clone Check default web skin** (plain-language, warm/shadcn, explicit Unknowns, dated heuristic disclaimer) with "show the receipts" progressive disclosure to the pro Pulse view.
- [ ] **One-time 3-chip localStorage stack picker.**
- [ ] **Pre-cached, date-stamped, scheduled-rebuild curated starters shelf**; freshness-based alive-glow accent.
- [ ] **DNA share card** (gated: stable fingerprint + legend) with dated "not a security audit" footer.
- [ ] **Verdict permalink** (website as share/landing surface) + OG auto-unfurl.
- [ ] **Trust safeguards:** never assert "Safe," cap at "Looks clone-able," never-positive-on-missing-data, heuristic framing on all gameable signals.
- [ ] **a11y, production build, and product rename** to "Clone Check."

---

### Cut / Out of Scope

- **2-up Compare in v1** — only functions on pre-cached shelf repos you already trust, bricks on the novel tweet-recommended URLs that ARE the killer job, and burns quota you don't have. Returns when the cache + cheap-tier verdict make N-repo affordable.
- **Phosphor (CRT terminal) design direction** — alienates the non-dev majority.
- **Field Manual as the front door** — industrial/hazard-amber reads "hackers only"; its structural discipline may inform only the "receipts" depth view.
- **BYO-key AI and any in-browser API key** — dead for this audience.
- **Generative LLM verdict/brief in v1** — replaced by deterministic templating + the deterministic context block.
- **Repository DNA in the verdict/eval flow** — survives only as a gated share-card watermark.
- **Watchlist as the v1 retention hero** — wrong loop; this audience re-picks starters each weekend.
- **Full N-way Decision Matrix in v1** — fast-follow after the cache lands.
- **Command palette (Cmd/Ctrl-K)** — power-dev affordance for users who often have never used Git.
- **Advanced search query builder with qualifier syntax** — jargon; stack-fit chips cover the real need.
- **Fork Network Voyager (~11 calls/repo)** — pro-dev archaeology, quota suicide at 60/hr.
- **Deep SBOM / transitive dependency tree peek (20–50 calls/repo)** — replaced by the lightweight "headline deps alive + pinned?" flag.
- **Personalized "For You" recs, Niche/Rising-Star trending, Contributable-issues finder, Similar Repos** — wrong user / split focus before traffic exists.
- **Whole-repo GitIngest-style ingest** — separate product + quota trap; replaced by the bounded context block.
- **Shared single-PAT proxy** — global launch-day cliff + ToS gray zone; SHA-keyed verdict-cache chosen instead.
- **Any "Safe to clone" language asserting a safety guarantee** — cut on liability grounds; max positive verdict is "Looks clone-able."

---

### The Calls, Called Out Clearly

**Design (D3):** light-first, warm, shadcn/Tailwind-familiar — defined by *axis*, not a branded name, to avoid autonomous-build thrash: **light-first + warm plain-language + shadcn-familiar + one freshness-glow accent + no hacker-only signifiers.** Two deliberate registers: the **in-app surface is calm/warm/reassuring** (an anxious non-dev decides whether to trust the verdict here); the **share card is loud/memetic** — bold inspection-stamp + verdict + DNA watermark sized to pop at thumbnail in an X/Reddit feed — and carries a dated "heuristic, not a security audit" footer so a screenshot can never imply a safety guarantee. The alive-glow is a **freshness** indicator, not a live-vs-cached flag.

**Backend (D4):** **v1, not fast-follow.** MCP server + serverless **SHA-keyed** verdict cache (not shared-PAT — cache-hit peaks exactly when load peaks on famous/trending starters, survives the spike, dodges the shared-token cliff and the ToS gray zone). The verdict is a **pure function** so the website, MCP, cache, CLI, and OG auto-unfurl are all thin wrappers on one core. Quota tiered so the headline (maintenance, license, bus factor, slop) comes from the 1–2 cheapest calls and is robust to the 202/empty-`{}` responses the existing `getParticipationStats`/`getContributorStats`/`getCommitActivity` endpoints return on famous repos; expensive stats demoted to opt-in "receipts." Per-user "Sign in with GitHub" OAuth is a later power-user add, never a v1 wall. Shared single-PAT proxy rejected outright.

**AI (D6):** **no LLM calls in v1.** Verdict is deterministic rule-based templating ("Last commit 3 days ago — actively maintained"; "One author wrote 71% of commits — risky if they leave"; "MIT — free to ship commercially"). The real v1 AI win is the deterministic **"Copy context for your agent" block** — the genuinely un-owned, hard-to-clone, in-flow value, led via the MCP rather than competing with the agent the user already pays for. An LLM chat structurally cannot source, persist, cite, or reproduce its answer; that auditability is the moat. **Honesty guardrail:** slop and AI-ready signals are gameable heuristics and must be worded as such ("looks abandoned (initial-commit-only history)," "has `CLAUDE.md` — likely agent-friendly"), never laundered as fact. Generative AI, if ever added, is server-proxied garnish beside the auditable receipts — never the verdict, never gating the call, never first.

**DNA (D7):** **pulled out of the verdict/evaluation flow entirely** — illegible non-deterministic art in the trust path is tonally catastrophic for an audience whose #1 trauma is "looks finished, breaks past the surface." Survives ONLY as the watermark/identity mark on the shareable verdict card — the "this came from [tool]" tell that propagates brand even when the URL is cropped. Hard-gated on two cheap fixes: remove the `Date.now()` non-determinism (fingerprint must be stable) and add a one-line legend. Export plumbing (`toBlob`, `createDNABadge`) already exists as dead code, so distribution is near-free. If the gates aren't met, it drops. Invest nothing further.

---

### Open Questions for the Owner

1. **Build-cost confirmation (was "backend ruling").** The chair now rules the backend IS v1 (MCP + SHA-keyed cache), reversing the no-backend draft because pure client-side bricks on launch-day novel URLs and defers the moat. This raises v1 cost/time. Confirm appetite for shipping a serverless backend in v1 vs. accepting an honestly demo-only client build. *(Chair's recommendation: backend-in-v1.)*
2. **Wedge-validation gate (hard pre-build gate).** RoastMyCode, GitIngest, Context7, DeepWiki, and slop CLIs all exist free; the only un-owned sliver is the *combination*, and combination products are the easiest to clone. Chair rules: ship the context-block MCP ALONE as a ~1-week probe to r/vibecoding FIRST. If it pulls, fund the full Clone Check build; if not, the verdict chip won't save it. Approve this cheapest-slice-first sequence.
3. **Product name + domain.** Chair selects **Clone Check** (carries the verb, screenshot-legible). Ratify and secure the domain before distribution starts.
4. **False-green ownership.** The heuristic disclaimer + "never assert Safe" + "never-positive-on-missing-data" gates reduce but do not eliminate the liability of a confident wrong verdict on a malicious/broken repo. Name WHO owns a viral false-positive incident and accept these as hard ship gates, not polish.
5. **Sequencing gate.** WS-1 data correctness (kill fake-positive, ship explicit Unknown states, tier the cheap-call headline) MUST land before the warm/welcoming surface ships. Hard gate — a friendly face on an untrustworthy engine is the one mistake that kills the product.
6. **Stack-picker friction.** Chair adds a one-time 3-chip localStorage stack picker so "fits your stack" isn't dead on first run. Confirm this 10-second step is acceptable against the "zero onboarding" principle *(chair judges it a net conversion win, not friction)*.

---

### How the Panel Got Here

The panel did not arrive at consensus cleanly — the draft was reversed in three material places by an unusually sharp red-team. The original plan led with a **website** and a no-backend, client-side v1, kept the MCP as a fast-follow, included 2-up Compare, and narrated the work as a *reskin* of an existing "deterministic engine." The red-team dismantled all four: the audience structurally won't detour to a site when "just clone it and let the agent figure it out" is free and in-flow (form-factor mismatch); the engine being reskinned **doesn't exist** (`HealthScore.js` is DOM-coupled, and there is no verdict engine, slop detector, stack-fit, AI-readiness check, or contents API); a client-side v1 bricks on exactly the novel, trending URLs that drive launch-day traffic; and Compare only worked on the shelf repos nobody needs to compare. The chair conceded each in substance — promoting the **MCP and the SHA-keyed cache into v1**, cutting Compare, and re-labeling the build honestly as **greenfield**. Where the draft and red-team genuinely disagreed, the panel split the difference rather than papering over it: the alive-glow was redefined from a self-defeating "live-only" flag into an honest **freshness** indicator after the red-team showed it would be absent on the very surface meant to convert; the design "two registers" (calm in-app vs. loud share card) survived Design-Lead and Growth pressure as a deliberate compromise the owner is asked to bless; and the trust liability — which the draft had filed as a mild "open question" — was elevated to a **hard pre-ship gate** with a named incident owner, because determinism removes hallucination but not the cheapest, most viral failure of all: a confident false-green a troll can manufacture and screenshot. The one place the chair held firm against the Skeptic was refusing to collapse the product to a single screen: the shared pure-function core stays, with the pro "receipts" view demoted rather than deleted. The net result is a smaller, more honest v1 than the draft proposed — fewer surfaces, a real backend, deterministic-only AI, and a product that leads with the un-owned, in-flow context block instead of a liability-bearing verdict chip on a site the audience would visit once for the meme and then ignore.
---

## Owner Resolutions (2026-06-26)

The two items the chair escalated to the owner are now decided:

| Item | Resolution |
|---|---|
| **Serverless backend in v1** (D4) | **Approved.** The owner abided by the panel's recommendation — MCP server + SHA-keyed verdict cache + OG are core v1 (milestone M2), not a fast-follow or scope-cut lever. |
| **Viral false-positive ownership** | **Containment in v1.** The product owns the *response*, never a safety guarantee. v1 ships the containment layer: a "Report this verdict" path on every surface, an authenticated cache kill-switch (withdraw/recompute one verdict globally, no redeploy), a public `/how-it-works` methodology page linked from every verdict, and a committed `INCIDENT-PLAYBOOK.md`. One human task remains: designate the on-call owner who operates the kill-switch. |

These are encoded in `FACTORY-MISSION-PROMPT.md` as validation-contract **Group H (VC-CONTAIN-01..04)**, milestone feature **F2.5**, hard constraint **HC-13**, and the §7 incident-response procedure.
