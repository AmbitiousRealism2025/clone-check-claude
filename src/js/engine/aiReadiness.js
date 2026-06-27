/**
 * Clone Check — AI-readiness detector (F1.4 / VC-AIREADY-01).
 *
 * A PURE module (no DOM, no network). It derives a likelihood-worded badge from
 * three already-fetched signals:
 *   1. presence of AI-rules files — CLAUDE.md / AGENTS.md / .cursor
 *      (from the F1.2 contents API `detectAiRulesFiles`),
 *   2. README quality (length-based proxy), and
 *   3. file-count modularity (a single-file dump is harder for an agent than a
 *      well-factored tree).
 *
 * HARD INVARIANT (HC-4 / VC-AIREADY-01): the badge is a LIKELIHOOD, never an
 * assertion. We say "likely agent-friendly" / "an agent may struggle" — never
 * "your agent will grok this".
 */

/** README length thresholds (chars) for the quality proxy. */
const README_GOOD_CHARS = 300;

/** File-count threshold above which a repo is treated as well-factored. */
const MODULAR_FILE_COUNT = 8;

function readmeQuality(readme) {
  const content =
    readme && typeof readme.content === 'string'
      ? readme.content
      : typeof (readme && readme.text) === 'string'
      ? readme.text
      : null;
  const len = typeof (readme && readme.length) === 'number'
    ? readme.length
    : content !== null
    ? content.length
    : null;
  if (len === null) return 'unknown';
  if (len === 0) return 'none';
  if (len >= README_GOOD_CHARS) return 'good';
  return 'thin';
}

function modularity(fileCount) {
  if (typeof fileCount !== 'number' || Number.isNaN(fileCount)) return 'unknown';
  if (fileCount >= MODULAR_FILE_COUNT) return 'modular';
  return 'compact';
}

/**
 * Derive the AI-readiness badge.
 *
 * @param {object} input
 * @param {{hasClaudeMd?:boolean,hasAgentsMd?:boolean,hasCursor?:boolean}} [input.aiRules]
 * @param {{content?:string,length?:number}} [input.readme]
 * @param {number} [input.fileCount]
 * @returns {{
 *   hasClaudeMd:boolean, hasAgentsMd:boolean, hasCursor:boolean,
 *   readmeQuality:'good'|'thin'|'none'|'unknown',
 *   modularity:'modular'|'compact'|'unknown',
 *   level:'likely'|'partial'|'unlikely'|'unknown',
 *   summary:string,
 *   signals:object
 * }}
 */
export function detectAiReadiness(input) {
  const { aiRules, readme, fileCount } = input && typeof input === 'object' ? input : {};
  const rules = aiRules && typeof aiRules === 'object' ? aiRules : {};
  const hasClaudeMd = rules.hasClaudeMd === true;
  const hasAgentsMd = rules.hasAgentsMd === true;
  const hasCursor = rules.hasCursor === true;
  const hasAnyRules = hasClaudeMd || hasAgentsMd || hasCursor;

  const quality = readmeQuality(readme);
  const mod = modularity(fileCount);

  // Honest unknown: when we have NO signal at all, do not fabricate a badge.
  const haveAnySignal = hasAnyRules || quality !== 'unknown' || mod !== 'unknown';
  if (!haveAnySignal) {
    return {
      hasClaudeMd, hasAgentsMd, hasCursor,
      readmeQuality: quality,
      modularity: mod,
      level: 'unknown',
      summary: 'AI-ready: not enough signal to judge',
      signals: { hasAnyRules, quality, modularity: mod },
    };
  }

  let level;
  if (hasAnyRules) {
    level = 'likely';
  } else if (quality === 'good' && mod !== 'compact') {
    level = 'partial';
  } else if (quality === 'none' || (quality !== 'good' && mod === 'compact')) {
    level = 'unlikely';
  } else {
    level = 'partial';
  }

  const summary = buildSummary({ hasClaudeMd, hasAgentsMd, hasCursor, quality, mod, level });

  return {
    hasClaudeMd, hasAgentsMd, hasCursor,
    readmeQuality: quality,
    modularity: mod,
    level,
    summary,
    signals: { hasAnyRules, quality, modularity: mod },
  };
}

function rulesFileName({ hasClaudeMd, hasAgentsMd, hasCursor }) {
  if (hasClaudeMd) return 'CLAUDE.md';
  if (hasAgentsMd) return 'AGENTS.md';
  if (hasCursor) return '.cursor rules';
  return null;
}

function buildSummary({ hasClaudeMd, hasAgentsMd, hasCursor, quality, mod, level }) {
  if (level === 'likely') {
    const file = rulesFileName({ hasClaudeMd, hasAgentsMd, hasCursor });
    const readmeNote =
      quality === 'good' ? ' and a solid README' : quality === 'thin' || quality === 'none' ? ' (README is thin, though)' : '';
    return `has ${file}${readmeNote} — likely agent-friendly`;
  }
  if (level === 'partial') {
    if (quality === 'good') {
      return 'no agent rules files, but a solid README — likely workable for an agent with a little context';
    }
    return 'no agent rules files — an agent may need extra context to get oriented';
  }
  // unlikely
  if (quality === 'none') {
    return 'no agent rules files and barely a README — an agent may struggle without extra context';
  }
  if (mod === 'compact') {
    return 'no agent rules files and a thin/compact layout — an agent might need extra context';
  }
  return 'no agent rules files and a thin README — an agent may need extra context';
}

export default detectAiReadiness;
