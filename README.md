# Clone Check — Factory Mission Package

This folder is the **planning package for the Clone Check build**. It is not source code — it is everything the **Factory Missions Orchestrator** needs to plan and execute the build from scratch, plus the human-readable record of how the product was decided.

**Clone Check** is a trustworthy *"should I clone this starter?"* engine for vibe coders: one deterministic pure-function `verdict()` engine exposed through two co-equal surfaces — an **MCP server** (`clone_check(repo)` inside Cursor/Claude Code) and a warm, light-first **website** — that answers *maintained-or-slop, does-it-fit-my-stack, will-my-agent-understand-it* and hands over a paste-ready agent brief. Verdict states are *Looks clone-able · Clone with care · Skip it · Not enough signal* — **never "Safe," never positive on missing data.**

> This is a **greenfield** project. It was informed by an analysis of a separate dormant repo (`github-repo-explorer`), but it is built from scratch and shares no code with it.

---

## ▶ Orchestrator: start here

1. **The mission brief is [`FACTORY-MISSION-PROMPT.md`](./FACTORY-MISSION-PROMPT.md).** Read it whole. It is the **input to your planning conversation**, not a script to execute and not a finished design.
2. **Launch:** in the Factory desktop app, open a session in **Mission mode** (or run `/enter-mission`), and paste the brief.
3. **Have the planning conversation — do not skip it.** Author the **validation contract first** (the brief's §2 — 51 behavioral assertions), then decompose into **milestones → features** where every assertion is claimed by exactly one feature (no orphans, no duplicates). Push back and ask clarifying questions until the plan is solid.
4. **Approve → Mission Control,** then run the milestones with the fix-feature re-validation loop. The owner acts as project manager (monitor, unblock, redirect).

### Non-negotiable invariants (surface these in `AGENTS.md`)

- **Never assert "Safe."** Max positive label is `Looks clone-able`.
- **Never render a positive verdict on missing data** → fall back to `Not enough signal` / cautionary.
- **The verdict engine is a pure function** — no DOM, no `fetch`; all surfaces are thin wrappers on it.
- **Sequencing gate:** the trustworthy engine (M1) must fully land **before** the warm web surface (M3) is built on it. A friendly face on an untrustworthy engine is the one failure that kills this product.
- **False-green ship gate:** the public surface may not go live until the trust + containment gates are green (see brief §2).
- This is greenfield — do **not** "refactor" assets that don't exist (there is no verdict engine, slop detector, stack-fit matcher, AI-readiness check, or contents API today).

### Recommended Factory config (full detail in brief §7)

| Key | Setting |
|---|---|
| `missionOrchestratorModel` / `…ReasoningEffort` | strongest model / `high` |
| `missionModelSettings.workerModel` / `workerReasoningEffort` | balanced model / `medium` (`high` for the engine, the four differentiators, the MCP server, and the SHA cache) |
| `missionModelSettings.validationWorkerModel` / `…ReasoningEffort` | strong model / `high` |
| `missionModelSettings.skipScrutiny` | **OFF** |
| `missionModelSettings.skipUserTesting` | **OFF** |
| `keepSystemAwakeDuringMissions` | `true` |

This is a **trust product** — a false-green slipping past validation is the defining failure mode, so keep both validation passes ON and treat the trust gates as hard pre-ship gates.

---

## The documents (reading order)

| # | File | What it is | Who reads it |
|---|------|------------|--------------|
| 1 | **[`FACTORY-MISSION-PROMPT.md`](./FACTORY-MISSION-PROMPT.md)** | **The build brief** — paste into Factory. 7 sections: vision, the 51-assertion validation contract, product spec, codebase/fixes, milestone/feature plan, design system, guardrails/config/ops. | Orchestrator (primary) |
| 2 | [`EXPERIMENT-PANEL-CONSENSUS.md`](./EXPERIMENT-PANEL-CONSENSUS.md) | The product decisions (D1–D9) with rationale, dissents, red-team findings, and the resolved owner decisions. The *why* behind the brief. | Human + orchestrator (context) |
| 3 | [`FACTORY-MISSIONS-PLAYBOOK.md`](./FACTORY-MISSIONS-PLAYBOOK.md) | How Factory missions work and how this brief is structured (validation-contract-first, milestones→features, config, run/steer). | Human (orientation) |
| 4 | [`PROJECT-ANALYSIS-AND-RECOMMENDATIONS.md`](./PROJECT-ANALYSIS-AND-RECOMMENDATIONS.md) | The original deep analysis of the dormant `github-repo-explorer` repo that seeded this work — bug ledger, feature roadmap, design directions. Reference for build detail. | Reference |

---

## Scope & milestones

**Built in v1:** the pure `verdict()` engine + trust safeguards; a new contents API + cheap-tier data layer; the four greenfield differentiators (slop detector, stack-fit matcher, AI-readiness check, deterministic context block); the MCP server; the warm web surface; a serverless **SHA-keyed verdict cache**; CI + deploy with real HTTP headers; the chosen light-first design direction; accessibility fixes; and the trust-incident containment layer.

**Milestones:** `M1` Data-Trust Engine → `M2` Platform/Quota/Backend (MCP + SHA cache + CI/deploy + containment) → `M3` Clone Check web surface → `M4` Design rollout → `M5` Accessibility & QA → `M6` (optional, post-v1) power-user backend.

**Cut from v1** (presence is a defect, not a bonus): 2-up Compare, command palette, query builder, Fork Network Voyager, deep SBOM, generative-LLM verdict, BYO-key, Watchlist, full Decision Matrix, whole-repo ingest, shared-PAT proxy, any "Safe to clone" language. Repository DNA survives only as a gated share-card watermark.

---

## Owner decisions (resolved) & the one open human task

- **Backend in v1 — approved.** MCP server + serverless SHA-keyed verdict cache + CI/deploy are core v1 (M2), not fast-follow.
- **Viral false-positive — containment in v1.** The product owns the *response*, never a safety guarantee: a "Report this verdict" path on every surface, an authenticated cache kill-switch, a public `/how-it-works` methodology page, and a committed `INCIDENT-PLAYBOOK.md` (validation-contract **Group H**, feature **F2.5**, constraint **HC-13**).
- **⚠ Open human task:** designate the **on-call owner** who operates the verdict kill-switch when an incident fires. The machinery is in the brief; the named person is not.

---

*Provenance: generated 2026-06-26 by a two-track multi-agent review workflow — a 6-persona debate panel (positions → rebuttals → adversarial red-team → chair consensus) decided the product; a parallel research track produced the Factory playbook; a blueprint architect + section writers produced the brief. Verify Factory-specific config keys against [docs.factory.ai](https://docs.factory.ai) before relying on them, as the platform evolves.*
