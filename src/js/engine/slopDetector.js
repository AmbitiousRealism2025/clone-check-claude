/**
 * Clone Check — Slop detector with false-positive guard (F1.4 / VC-SLOP-01).
 *
 * A PURE module (no DOM, no network). It takes already-fetched/derived repo
 * signals and emits a likelihood-worded slop caution in the exact shape the
 * pure verdict() engine consumes ({ level, reasons, summary }).
 *
 * LOAD-BEARING INVARIANT (VC-SLOP-01): a low commit count NEVER flags slop on
 * its own. A repo whose history was SQUASHED (one commit on the default branch)
 * but which is otherwise healthy — tests present, releases cut, many
 * contributors, lots of stars, actively maintained — must NOT be flagged. The
 * `initial-commit-only` reason is only attributed when the low commit count is
 * UNCORROBORATED by any of those health signals.
 *
 * HARD INVARIANT (HC-4): every emitted string is a likelihood ("looks like…"),
 * never an assertion ("is slop").
 */

/** Stars at/above which a repo is treated as a credible, real project. */
const CREDIBLE_STARS = 100;

const REASON_PHRASES = Object.freeze({
  'initial-commit-only': 'initial-commit-only history',
  abandoned: 'looks abandoned',
  'no-tests': 'no tests found',
});

/**
 * Count the "health" signals that explain a low commit count as a squash rather
 * than slop. Any one of these suppresses a commit-count-based flag.
 */
function countHealthSignals({ hasTests, hasReleases, contributorsCount, stars, maintenanceState }) {
  return [
    hasTests === true,
    hasReleases === true,
    typeof contributorsCount === 'number' && contributorsCount > 1,
    typeof stars === 'number' && stars >= CREDIBLE_STARS,
    maintenanceState === 'active' || maintenanceState === 'recent',
  ].filter(Boolean).length;
}

/**
 * Detect slop with the squashed-history false-positive guard.
 *
 * @param {object} input
 * @param {number} [input.commitCount] - Observed commit count (the gate signal).
 * @param {boolean} [input.hasTests]
 * @param {boolean} [input.hasReleases]
 * @param {number} [input.contributorsCount]
 * @param {number} [input.stars]
 * @param {'active'|'recent'|'stale'|'abandoned'} [input.maintenanceState]
 * @param {boolean} [input.hasReadme]
 * @returns {{level:'clean'|'caution'|'flagged'|'unknown', reasons:string[], summary:string, signals:object}}
 */
export function detectSlop(input) {
  const data = input && typeof input === 'object' ? input : {};
  const { commitCount, hasTests, maintenanceState } = data;

  // Slop is fundamentally a judgement about history. With no commit data we
  // cannot judge — degrade to an explicit Unknown, never a fabricated "clean".
  if (typeof commitCount !== 'number' || Number.isNaN(commitCount)) {
    return {
      level: 'unknown',
      reasons: [],
      summary: 'Slop check: not enough signal to judge',
      signals: { lowCommits: null, squashLikely: false, healthSignals: 0 },
    };
  }

  const lowCommits = commitCount <= 1;
  const abandoned = maintenanceState === 'abandoned';
  const noTests = hasTests === false;
  const healthSignals = countHealthSignals(data);

  // The guard: a low commit count is attributed to a squash (NOT slop) the
  // moment ANY health signal corroborates that this is a real project.
  const squashLikely = lowCommits && healthSignals >= 1;

  const reasons = [];
  if (lowCommits && !squashLikely) reasons.push('initial-commit-only');
  if (abandoned) reasons.push('abandoned');
  // "no tests" only counts as a slop reason when it co-occurs with another
  // concern — a healthy active project that simply lacks tests is not slop.
  if (noTests && (lowCommits || abandoned)) reasons.push('no-tests');

  let level;
  if (reasons.length === 0) level = 'clean';
  else if (reasons.includes('initial-commit-only') || reasons.length >= 2) level = 'flagged';
  else level = 'caution';

  const summary = buildSummary(level, reasons);

  return {
    level,
    reasons,
    summary,
    signals: { lowCommits, squashLikely, healthSignals },
  };
}

function buildSummary(level, reasons) {
  if (level === 'clean') return 'Slop check: no obvious slop signals';

  if (reasons.includes('initial-commit-only')) {
    return 'Slop check: looks abandoned (initial-commit-only history)';
  }

  const phrases = reasons.map((r) => REASON_PHRASES[r] || r);
  if (level === 'flagged') {
    return `Slop check: shows several slop signals (${phrases.join(', ')}) — looks low-effort`;
  }
  // caution: exactly one soft signal
  return `Slop check: shows a slop signal (${phrases[0]}) — worth a closer look`;
}

export default detectSlop;
