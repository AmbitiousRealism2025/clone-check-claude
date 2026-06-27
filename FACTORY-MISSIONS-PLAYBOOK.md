# Factory Missions Authoring Playbook

> **Generated:** 2026-06-26 by a 4-agent research track (missions fundamentals/architecture · planning & brief authoring · config/models/desktop · exemplars & pitfalls) synthesizing public Factory documentation and write-ups. It is the structural guide behind `FACTORY-MISSION-PROMPT.md` — how Factory missions work and how to author a brief that plans and executes well. Verify against the live docs at docs.factory.ai before relying on specific config keys, as Factory evolves.

---

## Factory Missions Authoring Playbook

A guide for structuring a single, gigantic mission brief that an autonomous Factory (Droid) Missions run can execute over hours or days. The thesis throughout: in Missions, **the plan is the product**, and your brief's job is to make the planning conversation converge fast and correctly — not to specify implementation. ([planning](https://docs.factory.ai/features/missions/planning), [news/missions](https://factory.ai/news/missions))

---

### 1. How Missions Work

**Why the architecture exists.** Factory's stated premise is that "agents are highly reactive to their context." As context accumulates, agent performance degrades two ways: irrelevant-context dilution, and self-evaluation bias — "an agent that implemented something is worse at objectively evaluating" it. The entire multi-agent design exists to keep each agent's context small and single-purpose, and to separate the implementer from the judge. ([missions-architecture](https://factory.ai/news/missions-architecture))

**Three roles, each with one goal.** "Each role has a single goal, and the system is structured so that nothing in an agent's trajectory pulls it away from that goal." ([missions-architecture](https://factory.ai/news/missions-architecture))

- **Orchestrator** — "plans and decomposes an approach to the user's goal, and steers execution to completion." It "avoids accumulating overly granular context, delegating all investigation and implementation to subagents and workers." ([missions-architecture](https://factory.ai/news/missions-architecture))
- **Workers** — complete "well-specified features with clear success criteria," each in a fresh context, iterating "until they believe the work is correct, then hand it off." But "the final judgment on correctness is not their call." ([missions-architecture](https://factory.ai/news/missions-architecture))
- **Validators** (two independent kinds) — **Scrutiny validators** "review each worker's implementation and trajectory for quality and correctness" (white-box); **User-testing validators** "exercise the system as a black box — using it the way a real user would — and verify behavior against the validation contract." Validators "surface bugs and gaps. They don't implement fixes." Validation is "adversarial by design." ([missions-architecture](https://factory.ai/news/missions-architecture))

**The validation contract is written FIRST — before any features.** TDD operates at two levels: the orchestrator "creates a validation contract, a set of behavioral assertions that define success, before defining any features," and workers "write tests before code." Ordering is deliberate: "When creating the validation contract, the orchestrator draws from its understanding of requirements. If it had created the features first, the contract would be influenced by the implementation it had already planned." The contract is "a finite checklist of testable behavioral assertions that define completion and correctness for the mission" — the load-bearing artifact of the whole system. ([missions-architecture](https://factory.ai/news/missions-architecture), [planning](https://docs.factory.ai/features/missions/planning))

**Milestones → Features.** "Droid constructs a structured plan: a set of features organized into milestones. Each milestone represents a meaningful checkpoint in the work." A feature is "a bounded piece of implementation that claims which assertions it will fulfill." The coverage invariant: "every assertion ID in validation-contract.md must be claimed by exactly one feature's `fulfills` — no orphans, no duplicates." Critically, "Milestones define validation frequency. Validation workers run at the end of each milestone." ([missions-architecture](https://factory.ai/news/missions-architecture), [planning](https://docs.factory.ai/features/missions/planning))

**Externalized state.** "No single agent needs to hold the complete picture in its context at once. The full state is distributed across shared artifacts: the validation contract, the feature list, research notes, operational guidelines, and an evolving knowledge base." Coordination and handoffs happen "through git commits" and these files — not a giant shared conversation. **Anything not captured in a durable artifact effectively does not exist for the workers.** ([missions-architecture](https://factory.ai/news/missions-architecture))

**Planning-first, then serial execution.** The flow: orchestrator writes the contract → decomposes into features/milestones → creates shared state files defining boundaries/procedures → "a programmatic runner spawns workers sequentially for each feature" → at milestone end, fresh validators assess. Factory treats parallelism as an open research question — "Is parallelization necessary? ... does it actually produce better results than sequential execution?" — and prioritizes reliability over speed. ([missions-architecture](https://factory.ai/news/missions-architecture), [overview](https://docs.factory.ai/features/missions/overview))

**The fix-feature re-validation loop.** After validators surface gaps, "the orchestrator creates fix features targeted at actionable gaps, which get executed before the milestone re-validates. This loop repeats until milestone validation passes." This is a first-class part of the process, not an exception: in a 16.5-hour Slack-clone mission — 185 agent runs across 6 milestones, 38.8k LOC (52.5% tests, 89.25% statement coverage) — validators surfaced 81 issues, generating 21 fix features (34.4% of implementation work), with "every milestone converging in 2-4 validation rounds." ([missions-architecture](https://factory.ai/news/missions-architecture))

**Mission Control — you become the project manager.** Once the plan is approved, "Droid enters Mission Control and begins execution." Your role shifts: "you're the project manager: monitoring progress, unblocking workers when they get stuck, redirecting when priorities change." "Missions are not fire-and-forget. The orchestrator is an agent, and you can talk to it" — pause, observe, have it re-assess/re-scope/re-plan, then resume. ([news/missions](https://factory.ai/news/missions), [overview](https://docs.factory.ai/features/missions/overview), [troubleshooting](https://docs.factory.ai/features/missions/troubleshooting))

**The desktop "missions" option.** You enter a mission with `/enter-mission` (also surfaced as `/missions` or `/mission`) in any Droid session, or via "Mission mode when creating a new session," or "directly from the Mission Control page." The desktop/web app provides "a rich, visual Mission Control dashboard." ([planning](https://docs.factory.ai/features/missions/planning), [web/missions](https://docs.factory.ai/web/missions))

---

### 2. What Makes Planning Succeed

Factory is unusually blunt about this: **"The biggest value we have found in Missions is in the planning phase. Getting the upfront plan right — the features, the ordering, the milestones, the skills involved, and how the work gets validated — is what determines whether the execution succeeds."** And: "A well-scoped plan with clear milestones produces dramatically better results than jumping straight into execution on a vague goal." ([planning](https://docs.factory.ai/features/missions/planning))

What separates a converging plan from a stalling one:

1. **It's a conversation, not a one-shot prompt.** "Droid will push back, ask questions, and iterate with you until the plan is solid," and "investigates and asks clarifying questions until the requirements are unambiguous." A great brief **pre-answers the questions Droid would otherwise have to ask** — goal, constraints, non-goals, ordering, acceptance criteria, environment facts — so the conversation iterates on structure, not on missing facts. ([planning](https://docs.factory.ai/features/missions/planning))

2. **Frame requirements as outcomes and observable behaviors, not implementation.** Because the contract is deliberately written before features (to stay implementation-independent), a brief written as a solution design works *against* the architecture. State what "done" looks like from a user's perspective. ([missions-architecture](https://factory.ai/news/missions-architecture))

3. **Make every success criterion testable and total.** Each assertion must be claimed by exactly one feature; anything vague or unmeasurable will not survive into a feature and won't be guaranteed built. Avoid subjective adjectives without a measurable threshold. ([planning](https://docs.factory.ai/features/missions/planning))

4. **Guarantee black-box testability — the #1 named failure cause.** "Your codebase needs an automated, scriptable way to exercise the app the way a user would... Without it, the mission cannot reliably verify its own work." For best results the repo should be at "Agent Readiness Level 4 (Optimized) or above." ([overview](https://docs.factory.ai/features/missions/overview), [troubleshooting](https://docs.factory.ai/features/missions/troubleshooting))

5. **Right-size milestones to cost and risk.** "For simple projects, one milestone is often enough; for longer or complex projects, more frequent milestone validation helps keep the foundation stable as work scales" and "can prevent drift and reduce expensive rework later." Cost scales predictably: **"total runs ≈ #features + 2 \* #milestones"** (a floor, not a ceiling) — each feature is one worker run; each milestone adds ~2 validator runs. ([planning](https://docs.factory.ai/features/missions/planning))

---

### 3. Recommended Skeleton for a Mission Brief

Write the brief section-by-section in this order. It mirrors the orchestrator's own planning sequence (contract → features → milestones → validation surface), so the planning conversation can *confirm* rather than *excavate*.

#### A. Mission Goal & Outcome (3–6 sentences)
State the end state in user-facing terms. What exists when this is done that doesn't exist now? Name the workload shape — greenfield build, migration, or test-coverage backfill — because each has a known acceptance pattern. For migrations, state **source → target stacks and behavioral parity criteria**; for coverage work, state the **target metric** (e.g., statement coverage %); for greenfield, enumerate the **feature set and user journeys** that define acceptance. ([news/missions](https://factory.ai/news/missions))

#### B. Constraints & Non-Goals (explicit in/out of scope)
Hard constraints (stack, dependencies, performance budgets, security/compliance) and an explicit **out-of-scope** list. This is the single biggest accelerant for a converging planning conversation, because it removes the ambiguity Droid would otherwise stop to resolve. ([planning](https://docs.factory.ai/features/missions/planning))

#### C. The Validation Contract (the centerpiece)
Write your acceptance criteria in the contract's *native shape* so they seed the contract directly. "The validation contract should be organized by user-facing feature, with an additional section for cross-feature flows." Each assertion has three parts ([planning](https://docs.factory.ai/features/missions/planning)):

- **Title** — a short description of the behavior.
- **Behavioral description** — "semantic but unambiguous, with a clear pass/fail condition."
- **Evidence requirements** — "what evidence must be collected (screenshots, console-errors, network calls, terminal output)."

Give each assertion a stable ID so features can claim it. Example:

> **VC-AUTH-03 — Logged-out user is redirected to login.**
> *Behavior:* A user with no session cookie who requests `/dashboard` receives a 302 to `/login`; after successful login they land back on `/dashboard`.
> *Evidence:* network trace showing 302 → 200; screenshot of `/dashboard` post-login; server log line for the redirect.

Add a **Cross-Feature Flows** subsection for end-to-end journeys that span multiple features (e.g., "sign up → create item → log out → log back in → item persists"). ([planning](https://docs.factory.ai/features/missions/planning))

#### D. Milestone & Feature Decomposition
Propose a milestone structure (Droid will refine it). Rules of thumb:

- **Put risky/foundational work early and small**, so errors are caught before they compound — milestones are your validation gates. ([overview](https://docs.factory.ai/features/missions/overview), [planning](https://docs.factory.ai/features/missions/planning))
- **Each feature is bounded, self-describing, and claims specific assertion IDs** so a fresh-context worker can complete it with zero conversation history. The coverage invariant is total: every assertion claimed by exactly one feature, no orphans, no duplicates. ([planning](https://docs.factory.ai/features/missions/planning))
- **Right-size against the cost floor** (`#features + 2*#milestones`): avoid hyper-granular features (validation overhead, run bloat) and giant features (worker spin-out / "Feature retry limit reached"). ([planning](https://docs.factory.ai/features/missions/planning), [troubleshooting](https://docs.factory.ai/features/missions/troubleshooting))

Suggested table form:

| Milestone | Features | Assertions claimed |
|---|---|---|
| M1 — Harness & auth foundation | F1 QA/run harness; F2 session middleware | VC-INFRA-01..03, VC-AUTH-01..05 |
| M2 — Core domain | F3 item CRUD; F4 persistence | VC-ITEM-01..08 |

Note explicit **ordering/dependencies** between features, since execution is serial and workers don't share live context. ([missions-architecture](https://factory.ai/news/missions-architecture))

#### E. Validation Surface / QA Harness (mandatory)
Declare, concretely: "One command to start the app"; how dependencies are stood up or mocked; "a way to send input" programmatically; that logs are "written to the filesystem" and where; and to "keep resource usage modest." If the repo isn't yet exercisable, **task this as the first feature(s) of M1**. If QA genuinely doesn't apply, say so and plan to `skipUserTesting`. **Security caveat:** disk logs can capture secrets/PII — "redact and exclude from VCS/CI." ([planning](https://docs.factory.ai/features/missions/planning), [overview](https://docs.factory.ai/features/missions/overview), [troubleshooting](https://docs.factory.ai/features/missions/troubleshooting))

#### F. Conventions & Shared Truth
Point at durable convention artifacts rather than inlining every rule: an **AGENTS.md** (test commands, build/deploy steps, code style, security requirements, PR rules), a file map/glossary, and any research notes. Workers run fresh from the feature spec plus shared artifacts, so these persist into every run and reduce per-feature restating. ([overview](https://docs.factory.ai/features/missions/overview), [sidbharath](https://sidbharath.com/blog/factory-ai-guide/))

#### G. Definition-of-Done & PM Guidance
State per-milestone exit conditions (so the fix-feature loop has a clear endpoint), priorities and non-negotiables ("what must never break, what can be deferred"), and what to do on ambiguity. This makes mid-mission redirection rare and cheap, and makes your supervision legible. ([troubleshooting](https://docs.factory.ai/features/missions/troubleshooting), [news/missions](https://factory.ai/news/missions))

---

### 4. Config Recommendations

Existing Droid config carries straight into missions: "MCP integrations, skills, hooks, and custom droids all work inside Missions," and Droid "pulls in your existing skills where they apply, and develops specialized skills" mid-mission. Name the relevant ones in the brief so the orchestrator reuses rather than rediscovers them. ([overview](https://docs.factory.ai/features/missions/overview), [cli/features/missions](https://docs.factory.ai/cli/features/missions))

**Per-role models & effort.** The guiding tradeoff: "Pairing a strong orchestrator model with a faster worker model is a common cost-quality tradeoff: planning and validation benefit most from extra reasoning, while routine worker tasks can use a lighter model." ([reference](https://docs.factory.ai/features/missions/reference))

| Key | Meaning | Recommendation |
|---|---|---|
| `missionOrchestratorModel` / `missionOrchestratorReasoningEffort` | Orchestrator model & effort (top-level keys) | Strongest model, high effort — planning/steering is highest-leverage |
| `missionModelSettings.workerModel` / `workerReasoningEffort` | Worker model & effort (`off, none, low, medium, high`) | Balanced/faster model; raise effort only for hard features |
| `missionModelSettings.validationWorkerModel` / `validationWorkerReasoningEffort` | **One** setting covers BOTH scrutiny and user-testing validators | Strong model, higher effort — validation is adversarial and thorough |
| `missionModelSettings.skipScrutiny` | "Skip scrutiny validation milestones" | Keep ON where code-quality/correctness matters |
| `missionModelSettings.skipUserTesting` | "Skip user-testing validation milestones" | Only skip if the app truly has no scriptable QA surface |
| `keepSystemAwakeDuringMissions` | "Prevent the OS from sleeping while a mission is running. Defaults to true" | Leave true for local long runs |
| `missionPolicy.restrictedAccess` / `allowedUserIds` | Enterprise gating — "Only members listed in allowedUserIds can start new missions" | Set per org policy; note Missions rolled out to Enterprise/Max plans |

The headless CLI mirrors these as flags: `-m/--model` (orchestrator), `--worker-model`, `--validator-model`, `--worker-reasoning-effort`, `--validator-reasoning-effort`, plus `--auto`. ([droid-exec overview](https://docs.factory.ai/cli/droid-exec/overview), [reference](https://docs.factory.ai/features/missions/reference))

**Skills / MCP / AGENTS.md.** Name relevant **skills**, **custom droids** (markdown files in `.factory/droids/` with YAML frontmatter: name, model, allowed tools), **MCP integrations** (e.g., Sentry/Datadog/Notion/Jira/Slack — "so context is pulled automatically"), and an **AGENTS.md** (natively supported; "your codebase has conventions that aren't in the code itself"; use layered AGENTS.md for multi-package repos). ([overview](https://docs.factory.ai/features/missions/overview), [sidbharath](https://sidbharath.com/blog/factory-ai-guide/))

---

### 5. Do's & Don'ts / Common Failure Modes

**Do**
- Lead with the validation contract as black-box, user-observable assertions — it's authored before any feature and drives adversarial validation. ([missions-architecture](https://factory.ai/news/missions-architecture))
- Pre-answer the clarifying questions; treat the brief as scoping a project, not issuing a command. ([planning](https://docs.factory.ai/features/missions/planning))
- Specify the QA/run harness (start command, mocks, input path, log location) as a first-class requirement. ([overview](https://docs.factory.ai/features/missions/overview))
- Externalize all shared truth into durable artifacts; write for fresh-context workers and adversarial validators. ([missions-architecture](https://factory.ai/news/missions-architecture))
- Budget for iteration: expect "~1/3 of work to be fixes" (34.4%) and validation "~37.2% of runtime." Flag where quality is paramount (keep validators on) vs. where speed is fine. ([missions-architecture](https://factory.ai/news/missions-architecture))

**Don't**
- Don't treat the brief as fire-and-forget — "Missions are not fire-and-forget." ([news/missions](https://factory.ai/news/missions))
- Don't over-specify implementation — it pulls fresh-context workers off their single goal. ([missions-architecture](https://factory.ai/news/missions-architecture))
- Don't bury success criteria in prose, and don't use vague/unmeasurable adjectives — unclaimable behaviors won't be built. ([planning](https://docs.factory.ai/features/missions/planning))
- Don't assume the app is exercisable — verify or build the harness first. ([troubleshooting](https://docs.factory.ai/features/missions/troubleshooting))
- Don't depend on heavy parallelism; structure features to be independently completable in serial. ([missions-architecture](https://factory.ai/news/missions-architecture))

**Named failure modes & the human levers** ([troubleshooting](https://docs.factory.ai/features/missions/troubleshooting))
- **"Feature retry limit reached" / validation failures** → root cause is almost always "the application cannot be reliably stood up or exercised." Fix: provide the dependency-mocking QA script + filesystem logs (or run `/readiness-report`, `/readiness-fix`). On retry-limit, "Inspect the latest worker for that feature to figure out why it keeps failing."
- **Frozen mission** → "pause the orchestrator and tell it what you are seeing," then ask it to recover.
- **Stuck worker** → "you do not need to wait for it to finish" — pause and tell it to "mark the current item as complete and move on."
- **Blocked milestone** → "ask the orchestrator to re-assess the remaining work and figure out why it has become blocked."
- **Change of direction** → "pause and tell the orchestrator. It can update the plan, re-scope milestones, and continue."

---

### 6. How to Run & Steer It on the Desktop App

**Start.** Use **Mission mode when creating a new session**, run `/enter-mission` (a.k.a. `/missions`, `/mission`) inside a session, or start "directly from the Mission Control page." Then have the planning conversation — paste/attach the brief and let Droid push back and iterate until the plan is solid before you approve it. ([planning](https://docs.factory.ai/features/missions/planning), [web/missions](https://docs.factory.ai/web/missions))

**The Mission Control dashboard.** After approval, Droid enters the "rich, visual Mission Control dashboard": a top bar tracking time and credits; a right sidebar with a live progress log and **per-role model dropdowns** to "configure different models for the Orchestrator, Worker, and Validator agents on the fly"; and a left sidebar listing workers with terminal output, thought process, and sub-tasks. You can "pause the orchestrator directly from the UI, instruct it to re-assess or re-plan, and then resume execution." ([web/missions](https://docs.factory.ai/web/missions), [overview](https://docs.factory.ai/features/missions/overview), [news/missions](https://factory.ai/news/missions))

**For long / unattended runs.** Select a **"Droid Computer"** so "long-running missions execute safely in the background on persistent remote machines without tying up your local workspace." For local runs, leave `keepSystemAwakeDuringMissions` at its default `true`. Missions are **resumable** from the Mission Control tab — "resume missions exactly where you left off." Real missions have run "22+ hours up to 16 days" (median ~2h; 14% exceed 24h), so plan for persistence on anything gigantic. ([web/missions](https://docs.factory.ai/web/missions), [reference](https://docs.factory.ai/features/missions/reference), [news/missions](https://factory.ai/news/missions))

**Other surfaces.** CLI Mission Control lets you "monitor progress, unblock workers, and redirect the orchestrator from the terminal" (desktop/web is "a richer experience"). Headless: `droid exec --mission "<goal>"` "runs droid exec as a multi-agent orchestrator that plans work, delegates to worker agents, and validates results," with the model/effort flags above — **but** a documented limitation (issue #794) is that `--mission` can fail to start the `factoryd` daemon in headless/CI environments, so don't rely on it for unattended CI without accounting for that. ([cli/running-cli](https://docs.factory.ai/cli/features/missions/running-cli), [droid-exec overview](https://docs.factory.ai/cli/droid-exec/overview), [issue #794](https://github.com/Factory-AI/factory/issues/794))

**Your runtime job.** Once execution begins, "the skill is knowing when and how to intervene, not writing the code yourself." Watch the progress log and worker output, let the fix-feature loop run (each milestone typically converges in 2–4 rounds), and reserve intervention for the failure modes in Section 5. ([news/missions](https://factory.ai/news/missions), [troubleshooting](https://docs.factory.ai/features/missions/troubleshooting), [missions-architecture](https://factory.ai/news/missions-architecture))