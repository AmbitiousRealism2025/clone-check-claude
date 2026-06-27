// Clone Check — Claude Team build workflow (one milestone per run).
// Mirrors Factory's orchestrator -> worker -> validator -> fix-loop, judged by the
// brief's §2 validation contract. Launch with:
//   Workflow({ scriptPath: ".claude-team/build-milestone.workflow.js", args: { milestone: "M1" } })
// STAGED — review before launching; do not run until the race begins.

export const meta = {
  name: 'clone-check-build',
  description: "Claude-team build of Clone Check for ONE milestone: lead plans the milestone's features -> workers implement (tests-first, commit per feature) -> adversarial validators check the milestone's VC assertions -> bounded fix loop. Targets the independent clone-check-claude repo.",
  phases: [
    { title: 'Plan', detail: "Lead reads the brief + repo state, returns this milestone's ordered features + claimed assertions" },
    { title: 'Build', detail: 'Workers implement each feature serially (tests-first), commit per feature' },
    { title: 'Validate', detail: "Adversarial validators check the milestone's VC assertions" },
    { title: 'Fix', detail: "Bounded fix-feature loop until the milestone's assertions pass" },
  ],
}

const WS = '/Users/ambrealismwork/Desktop/coding-projects/clone-check-claude'
const BRIEF = WS + '/FACTORY-MISSION-PROMPT.md'
const milestone = (args && args.milestone) || 'M1'
const maxFixRounds = (args && args.maxFixRounds) || 2

const INVARIANTS = 'HARD INVARIANTS (never violate): TRUE GREENFIELD — this is a from-scratch project; do NOT import, copy, fork, or transform the github-repo-explorer codebase (any file/line references in the brief are PATTERNS to implement correctly from scratch, never files to edit/reuse/carry over); never output the word "Safe" as a verdict; never render a positive verdict on missing data (fall back to "Not enough signal"/cautionary); the verdict() engine is a PURE function (no DOM, no fetch) that all surfaces wrap; build ONLY what this feature/assertion claims. A false-green is the defining failure mode.'

const PLAN_SCHEMA = {
  type: 'object', required: ['milestone', 'intent', 'features'],
  properties: {
    milestone: { type: 'string' }, intent: { type: 'string' },
    exitCriteria: { type: 'array', items: { type: 'string' } },
    features: { type: 'array', items: { type: 'object', required: ['id', 'name', 'spec', 'assertions'], properties: {
      id: { type: 'string' }, name: { type: 'string' }, spec: { type: 'string' },
      assertions: { type: 'array', items: { type: 'string' } },
      keyFiles: { type: 'array', items: { type: 'string' } },
      dependsOn: { type: 'array', items: { type: 'string' } } } } },
  },
}
const WORK_SCHEMA = {
  type: 'object', required: ['feature', 'status', 'summary'],
  properties: {
    feature: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    testsAdded: { type: 'boolean' }, committed: { type: 'boolean' }, commitSha: { type: 'string' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}
const VERDICT_ITEM = {
  type: 'object', required: ['assertion', 'pass'],
  properties: { assertion: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string' }, issues: { type: 'array', items: { type: 'string' } } },
}
const VERDICTS_SCHEMA = { type: 'object', required: ['verdicts'], properties: { verdicts: { type: 'array', items: VERDICT_ITEM } } }

const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o }

// ---------- Plan ----------
phase('Plan')
const plan = await agent(
  `You are the LEAD ORCHESTRATOR of the Claude team building "Clone Check". Read the brief at ${BRIEF} (focus on §2 Validation Contract, §4 Existing Codebase & Required Fixes, §5 Milestone & Feature Execution Plan, §7 Guardrails). Inspect the current repo with \`ls\`/\`git -C ${WS} status\` and \`cat\` of any existing files.\n\nReturn the ordered feature list to build for milestone ${milestone}, faithful to the brief's §5 plan for that milestone. For each feature give: id, name, a concrete implementation spec, the exact VC-assertion IDs it claims (from §2), key files, and dependsOn. If the repo has NO project scaffolding yet and this is the first milestone, include a project-setup feature FIRST (npm init + Vite + Vitest + the directory layout the brief implies). Order features so dependencies come first. ${INVARIANTS}`,
  { schema: PLAN_SCHEMA, phase: 'Plan', effort: 'high', label: `plan:${milestone}` }
)
log(`Planned ${plan.features.length} features for ${milestone}: ${plan.features.map(f => f.id).join(', ')}`)

// ---------- Build (serial — features share the codebase) ----------
phase('Build')
const built = []
for (const f of plan.features) {
  const r = await agent(
    `You are a WORKER on the Claude team building Clone Check. Work ONLY inside ${WS} (use absolute paths; never touch ../clone-check). Read the brief at ${BRIEF} for context and the precise definitions of the assertions you must satisfy.\n\nImplement feature ${f.id} — "${f.name}".\nSPEC: ${f.spec}\nIT MUST SATISFY these validation-contract assertions: ${(f.assertions || []).join(', ')} (full definitions in ${BRIEF} §2).\nKEY FILES: ${(f.keyFiles || []).join(', ') || '(use judgment)'}\n\nWork TESTS-FIRST: write the tests that encode the claimed assertions, then implement until \`npm test\` is green (set up the test harness first if this is project setup). Then \`git -C ${WS} add -A && git -C ${WS} commit -m "${f.id}: <summary>"\`. Stay strictly within this feature's scope. ${INVARIANTS}\n\nReport what you did, files touched, whether tests were added and committed, and any blockers.`,
    { schema: WORK_SCHEMA, phase: 'Build', effort: 'high', label: `build:${f.id}` }
  )
  built.push(r)
  log(`Built ${f.id}: ${r ? r.status : 'null'}`)
}

// ---------- Validate (adversarial, parallel over assertion groups) ----------
phase('Validate')
const assertions = [...new Set(plan.features.flatMap(f => f.assertions || []))]
const vGroups = chunk(assertions, Math.max(3, Math.ceil(assertions.length / 3)))
let verdicts = (await parallel(vGroups.map((g, i) => () => agent(
  `You are an ADVERSARIAL VALIDATOR on the Claude team. Work in ${WS}. For milestone ${milestone}, verify these validation-contract assertions and actively try to BREAK them (full definitions in ${BRIEF} §2): ${g.join(', ')}.\n\nRun the tests, run the app/QA harness, and inspect the code/output. Mark pass=true ONLY if you independently verified it holds, with evidence. DEFAULT TO pass=false on any doubt — a false-green is the failure mode of this product. For each failing assertion, list concrete issues a fix-worker can act on.`,
  { schema: VERDICTS_SCHEMA, phase: 'Validate', effort: 'high', label: `validate:${i + 1}` }
)))).filter(Boolean).flatMap(v => v.verdicts || [])

// ---------- Fix loop (bounded) ----------
phase('Fix')
let round = 0
let failed = verdicts.filter(v => !v.pass)
while (failed.length && round < maxFixRounds) {
  round++
  log(`Fix round ${round}: ${failed.length} failing — ${failed.map(v => v.assertion).join(', ')}`)
  await agent(
    `You are a FIX worker on the Claude team. Work in ${WS}. These milestone-${milestone} assertions are FAILING validation:\n${failed.map(v => `- ${v.assertion}: ${(v.issues || []).join('; ')}`).join('\n')}\n\nFix them tests-first, keep the whole suite green (\`npm test\`), and commit. Definitions in ${BRIEF} §2. ${INVARIANTS}`,
    { phase: 'Fix', effort: 'high', label: `fix:r${round}` }
  )
  const reIds = failed.map(v => v.assertion)
  const reGroups = chunk(reIds, Math.max(3, Math.ceil(reIds.length / 2)))
  const rev = (await parallel(reGroups.map((g, i) => () => agent(
    `Adversarial RE-VALIDATION in ${WS}. Verify these assertions now hold (definitions in ${BRIEF} §2): ${g.join(', ')}. Run tests + inspect. pass=true ONLY with evidence; default false on doubt.`,
    { schema: VERDICTS_SCHEMA, phase: 'Fix', effort: 'high', label: `revalidate:r${round}.${i + 1}` }
  )))).filter(Boolean).flatMap(v => v.verdicts || [])
  const revMap = new Map(rev.map(v => [v.assertion, v]))
  verdicts = verdicts.map(v => revMap.get(v.assertion) || v)
  failed = verdicts.filter(v => !v.pass)
}

// ---------- Report ----------
return {
  milestone,
  intent: plan.intent,
  featuresPlanned: plan.features.map(f => f.id),
  featuresBuilt: built.filter(Boolean).map(b => ({ id: b.feature, status: b.status, committed: b.committed })),
  assertionsTotal: assertions.length,
  assertionsGreen: verdicts.filter(v => v.pass).map(v => v.assertion),
  assertionsRed: verdicts.filter(v => !v.pass).map(v => ({ assertion: v.assertion, issues: v.issues })),
  passRate: assertions.length ? Math.round((verdicts.filter(v => v.pass).length / assertions.length) * 100) : 0,
  fixRounds: round,
  blockers: built.filter(Boolean).flatMap(b => b.blockers || []),
}
