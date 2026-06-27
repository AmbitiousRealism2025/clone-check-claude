# Clone Check — Claude Team Build

This workspace is the **Claude team's** build of Clone Check, running head-to-head against a Factory mission (GPT-5.5 orchestrator + GLM-5.2 coder/validator) building the identical spec in the sibling repo `../clone-check/`. Same spec, same rubric, different stack.

- **Spec & rubric:** [`FACTORY-MISSION-PROMPT.md`](./FACTORY-MISSION-PROMPT.md) — the product spec, and especially its **§2 Validation Contract (51 behavioral assertions)**, which is the **objective, model-agnostic scoring rubric** both teams are judged against. We do not modify the spec or the contract; we build to it.
- **This repo** is independent (its own `.git`, no coupling to the Factory workspace).

## Team & roles (mirrors Factory's architecture)

| Role | Factory side | Claude side |
|---|---|---|
| Orchestrator | GPT-5.5 | **Claude (Opus) — lead**, plans each milestone's features + claimed assertions |
| Coder / workers | GLM-5.2 | Claude worker agents — implement one feature each, **tests-first**, commit per feature |
| Validator | GLM-5.2 | Claude validator agents — **adversarial**, verify the milestone's VC assertions, default to fail on doubt |

## Run model

Driven by the staged workflow `.claude-team/build-milestone.workflow.js`, run **one milestone at a time** (the lead reviews between milestones, honoring the brief's gates):

```
Plan (lead reads brief + repo state → ordered features + claimed assertions)
  → Build (workers implement each feature serially, tests-first, commit)
  → Validate (adversarial validators check the milestone's VC assertions)
  → Fix loop (bounded; fix-features until the milestone's assertions pass)
```

Launch per milestone: `Workflow({ scriptPath: ".claude-team/build-milestone.workflow.js", args: { milestone: "M1" } })`.

## Order & gates (from the brief)

`M1` Data-Trust Engine → `M2` Platform/Backend (MCP + SHA cache + CI/deploy + containment) → `M3` Web surface → `M4` Design → `M5` A11y/QA → `M6` (optional). **Hard gate:** the trustworthy engine (M1) must fully pass before the web surface (M3) is built on it. The brief recommends shipping the **M1 + MCP probe first** as a wedge-validation gate.

## Non-negotiable invariants (every worker & validator inherits these)

- **Never assert "Safe."** Max positive label is `Looks clone-able`.
- **Never positive on missing data** → `Not enough signal` / cautionary.
- **The verdict engine is a pure function** — no DOM, no `fetch`; all surfaces wrap it.
- Build **only** what a validation-contract assertion claims; greenfield (don't "refactor" assets that don't exist).
- A **false-green slipping past validation** is the defining failure — validators are adversarial and default to fail on doubt.

*Scaffolding (package.json, Vite, Vitest, etc.) is created by the build itself — there is none here yet, by design.*
