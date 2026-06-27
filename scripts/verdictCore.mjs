/**
 * F1.5 — shared verdict core for the QA harness.
 *
 * This is the SINGLE assembly path that turns an "input repo" (raw GitHub-shaped
 * data) into a structured verdict by composing the real M1 building blocks:
 *
 *   raw repo + commits  --(F1.2 data layer: normalizeHeadlineSignals)-->  signals
 *   package.json/config -------------(F1.4 stackFit)------------------->  stackFit
 *   aiRules + readme ----------------(F1.4 aiReadiness)---------------->  aiReady
 *   commit count + health -----------(F1.4 slopDetector w/ guard)------>  slop
 *   readme + issues -----------------(F1.4 contextBlock)--------------->  contextBlock
 *   all of the above ----------------(F1.1 PURE verdict())------------->  verdict
 *
 * Both harness surfaces (the web/engine path AND the MCP `clone_check` stub)
 * call THIS module, which is exactly the M1-acceptable "stub MCP target that
 * calls the same pure engine core" — in M2/F2.3 the real MCP server is wired to
 * the same core, preserving parity by construction.
 *
 * Nothing here performs network I/O or touches the DOM; the only impurity a
 * caller can introduce is the injected `now`, which is pinned by the fixture.
 */
import { verdict } from '../src/js/engine/verdict.js';
import { detectStackFit } from '../src/js/engine/stackFit.js';
import { detectAiReadiness } from '../src/js/engine/aiReadiness.js';
import { detectSlop } from '../src/js/engine/slopDetector.js';
import { assembleContextBlock } from '../src/js/engine/contextBlock.js';
import { normalizeHeadlineSignals } from '../src/js/data/github.js';

/**
 * Compose the full verdict() input object from a raw repo fixture.
 * @param {object} repoFixture - See scripts/fixtures.mjs for the shape.
 * @param {number} now - Reference time (ms) for recency-derived signals.
 * @returns {object} The input object consumed by the pure verdict() engine.
 */
export function assembleVerdictInput(repoFixture, now) {
  const fx = repoFixture && typeof repoFixture === 'object' ? repoFixture : {};
  const commits = Array.isArray(fx.commits) ? fx.commits : [];

  // F1.2 — cheap-tier headline signals (maintenance / license / busFactor).
  const headline = normalizeHeadlineSignals(fx.repo, commits, now);

  // F1.4 — the four greenfield differentiators.
  const stackFit = detectStackFit({
    packageJson: fx.packageJson,
    configFiles: fx.configFiles,
    savedStack: fx.savedStack,
  });

  const aiReady = detectAiReadiness({
    aiRules: fx.aiRules,
    readme: fx.readme,
    fileCount: fx.fileCount,
  });

  // The richer slop detector (with the squashed-history false-positive guard)
  // supersedes the data layer's conservative slop hint.
  const slop = detectSlop({
    commitCount: commits.length,
    hasTests: fx.hasTests,
    hasReleases: fx.hasReleases,
    contributorsCount: fx.contributorsCount,
    stars: fx.stars,
    maintenanceState: headline.maintenance && headline.maintenance.state,
  });

  const input = { ...headline, stackFit, aiReady, slop };

  // The context block embeds the resolved verdict state, so compute a base
  // verdict first, assemble the bounded block, then attach it. Deterministic
  // because `now` is fixed and every detector is pure.
  const base = verdict(input);
  const contextBlock = assembleContextBlock({
    repo: { fullName: fx.repo && fx.repo.full_name, url: fx.repo && fx.repo.html_url },
    verdict: base,
    stackFit,
    readme: fx.readme,
    issues: [],
    keyFiles: ['package.json', 'README.md'],
  });

  return { ...input, contextBlock };
}

/**
 * Drive an input repo all the way to a structured verdict.
 * @param {object} repoFixture
 * @param {number} now
 * @returns {object} A frozen verdict object (see engine/verdict.js).
 */
export function computeVerdict(repoFixture, now) {
  return verdict(assembleVerdictInput(repoFixture, now));
}

export default computeVerdict;
