/**
 * Clone Check — pure verdict() engine (F1.1).
 *
 * The single deterministic core every surface (web, MCP, cache, OG, share
 * card) wraps and NEVER recomputes. This module is intentionally free of any
 * DOM access and any network I/O so it can run identically in a browser, a
 * Node serverless handler, and an MCP tool process.
 *
 * HARD INVARIANTS encoded structurally here (see AGENTS.md HC-1..HC-4):
 *   - PURE: no DOM, no network. Same input -> byte-identical output.
 *   - Never emit the word "Safe" / "Safe to clone" as a state value. The
 *     maximum positive label is exactly `Looks clone-able`.
 *   - Never reach the positive label when any headline signal
 *     (maintenance / license / bus factor / slop) is missing or Unknown.
 *   - Gameable signals (slop, ai-readiness) are worded as likelihoods, not
 *     asserted facts.
 *   - Every verdict shape carries a dated "heuristic check, not a security
 *     audit" disclaimer.
 *
 * This feature owns the SHAPE, the STATE MACHINE, and the SAFEGUARDS. Detector
 * payloads (stackFit, contextBlock, richer receipts, ai-readiness specifics)
 * are populated by sibling features and passed through unchanged; when they are
 * absent the engine emits honest Unknown-shaped defaults rather than fabricating.
 */

/**
 * The four — and only four — allowed verdict states.
 * Frozen so no caller can mutate the enum at runtime.
 */
export const STATES = Object.freeze({
  CLONEABLE: 'Looks clone-able',
  CARE: 'Clone with care',
  SKIP: 'Skip it',
  INSUFFICIENT: 'Not enough signal',
});

/** The complete enumeration of legal state strings, in display order. */
export const STATE_VALUES = Object.freeze([
  STATES.CLONEABLE,
  STATES.CARE,
  STATES.SKIP,
  STATES.INSUFFICIENT,
]);

/** The four headline signals that gate the positive label. */
export const HEADLINE_SIGNALS = Object.freeze([
  'maintenance',
  'license',
  'busFactor',
  'slop',
]);

const DISCLAIMER_TEXT = 'heuristic check, not a security audit — verify before you ship';

/**
 * Epoch sentinel used only when a caller omits `asOf`. Production data layers
 * always stamp the real as-of date; this keeps the disclaimer dated and the
 * function pure (never reads the clock) even for malformed input.
 */
const FALLBACK_AS_OF = '1970-01-01';

const PERMISSIVE_LICENSES = Object.freeze(new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense',
  '0BSD', 'MPL-2.0', 'Zlib', 'BSL-1.0',
]));

const COPYLEFT_LICENSES = Object.freeze(new Set([
  'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'EPL-2.0',
]));

const GRADE = Object.freeze({ GOOD: 'good', WARN: 'warn', BAD: 'bad', UNKNOWN: 'unknown' });

// --- Signal grading (each returns one of GRADE.*) ----------------------------

function gradeMaintenance(m) {
  if (!m) return GRADE.UNKNOWN;
  if (m.grade && Object.values(GRADE).includes(m.grade)) return m.grade;
  switch (m.state) {
    case 'active':
    case 'recent':
      return GRADE.GOOD;
    case 'stale':
      return GRADE.WARN;
    case 'abandoned':
      return GRADE.BAD;
    default:
      return GRADE.UNKNOWN;
  }
}

function gradeLicense(l) {
  if (!l) return GRADE.UNKNOWN;
  if (l.grade && Object.values(GRADE).includes(l.grade)) return l.grade;
  if (l.known === false) return GRADE.UNKNOWN;
  const id = l.spdxId;
  if (id === undefined) return GRADE.UNKNOWN;
  if (id === null) return GRADE.WARN; // no license file -> all rights reserved
  if (PERMISSIVE_LICENSES.has(id)) return GRADE.GOOD;
  if (COPYLEFT_LICENSES.has(id)) return GRADE.WARN;
  return GRADE.WARN; // recognized-but-unclassified license -> stay cautious
}

function gradeBusFactor(b) {
  if (!b) return GRADE.UNKNOWN;
  if (b.grade && Object.values(GRADE).includes(b.grade)) return b.grade;
  const pct = b.topAuthorPercent;
  if (typeof pct !== 'number' || Number.isNaN(pct)) return GRADE.UNKNOWN;
  if (pct <= 60) return GRADE.GOOD;
  return GRADE.WARN; // heavy concentration is a risk, not an auto-skip on its own
}

function gradeSlop(s) {
  if (!s) return GRADE.UNKNOWN;
  if (s.grade && Object.values(GRADE).includes(s.grade)) return s.grade;
  switch (s.level) {
    case 'clean':
      return GRADE.GOOD;
    case 'caution':
      return GRADE.WARN;
    case 'flagged':
      return GRADE.BAD;
    default:
      return GRADE.UNKNOWN;
  }
}

// --- State machine -----------------------------------------------------------

/**
 * Resolve the single verdict state from the four headline grades.
 *
 * It is structurally impossible to return CLONEABLE unless ALL four headline
 * signals are present (no UNKNOWN) AND none are WARN/BAD. Any missing signal
 * collapses to a cautionary state or, absent any known concern, to INSUFFICIENT.
 */
function resolveState(grades) {
  const list = [grades.maintenance, grades.license, grades.busFactor, grades.slop];
  const unknown = list.filter((g) => g === GRADE.UNKNOWN).length;
  const bad = list.filter((g) => g === GRADE.BAD).length;
  const warn = list.filter((g) => g === GRADE.WARN).length;

  if (bad > 0) return STATES.SKIP;
  if (unknown > 0) {
    // A missing headline signal can NEVER be positive.
    if (warn > 0) return STATES.CARE;
    return STATES.INSUFFICIENT;
  }
  if (warn > 0) return STATES.CARE;
  return STATES.CLONEABLE;
}

// --- Plain-language renderers (honest Unknowns, likelihood wording) -----------

function maintenanceWords(m, grade) {
  if (grade === GRADE.UNKNOWN) return 'Maintenance: not enough signal yet';
  if (m && typeof m.summary === 'string' && m.summary) return m.summary;
  if (grade === GRADE.GOOD) return 'Maintenance: recent commits — looks actively maintained';
  if (grade === GRADE.WARN) return 'Maintenance: no commits in a while — looks slow';
  return 'Maintenance: looks abandoned';
}

function licenseWords(l, grade) {
  if (grade === GRADE.UNKNOWN) return 'License: not enough signal yet';
  if (l && typeof l.summary === 'string' && l.summary) return l.summary;
  if (l && l.spdxId === null) return 'License: no license file found — all rights reserved by default';
  const id = l && l.spdxId ? l.spdxId : 'unknown';
  if (grade === GRADE.GOOD) return `License: ${id} — permissive, generally fine to ship`;
  return `License: ${id} — check the obligations before you ship`;
}

function busFactorWords(b, grade) {
  if (grade === GRADE.UNKNOWN) return 'Bus factor: not enough signal yet';
  if (b && typeof b.summary === 'string' && b.summary) return b.summary;
  const pct = b && typeof b.topAuthorPercent === 'number' ? b.topAuthorPercent : null;
  const who = b && b.topAuthorLogin ? b.topAuthorLogin : 'one author';
  if (pct === null) return 'Bus factor: not enough signal yet';
  const tail = grade === GRADE.WARN ? ' — risky if they step away' : '';
  return `Bus factor: ${who} wrote ${pct}% of recent commits${tail}`;
}

function depsAliveWords(d) {
  if (!d) return 'Deps: not enough signal yet';
  if (typeof d.summary === 'string' && d.summary) return d.summary;
  if (d.alive === true && d.pinned === true) return 'Deps: headline deps look alive and pinned';
  if (d.alive === true) return 'Deps: headline deps look alive, but versions are loose';
  if (d.alive === false) return 'Deps: some headline deps look stale';
  return 'Deps: not enough signal yet';
}

/** Likelihood-worded slop caution. Never asserts "is slop". */
function slopWords(s, grade) {
  if (grade === GRADE.UNKNOWN) return 'Slop check: not enough signal to judge';
  if (s && typeof s.summary === 'string' && s.summary) return s.summary;
  if (grade === GRADE.GOOD) return 'Slop check: no obvious slop signals';
  const reasons = s && Array.isArray(s.reasons) ? s.reasons : [];
  if (reasons.includes('initial-commit-only')) {
    return 'Slop check: looks abandoned (initial-commit-only history)';
  }
  if (grade === GRADE.BAD) return 'Slop check: shows signs of low-effort scaffolding';
  return 'Slop check: shows a few slop signals — worth a closer look';
}

/** Likelihood-worded AI-readiness badge. Never asserts "your agent will grok this". */
function aiReadyWords(ai) {
  if (!ai) return 'AI-ready: not enough signal to judge';
  if (typeof ai.summary === 'string' && ai.summary) return ai.summary;
  if (ai.hasClaudeMd) return 'has CLAUDE.md — likely agent-friendly';
  if (ai.hasAgentsMd) return 'has AGENTS.md — likely agent-friendly';
  if (ai.hasCursor) return 'has .cursor rules — likely agent-friendly';
  return 'no agent rules files found — your agent may need extra context';
}

function whatThisIs(repoData, state) {
  const name = (repoData && typeof repoData.name === 'string' && repoData.name) || 'This repo';
  const desc = repoData && typeof repoData.description === 'string' && repoData.description
    ? ` ${repoData.description.trim().replace(/\s+/g, ' ')}`
    : '';
  let clause;
  switch (state) {
    case STATES.CLONEABLE:
      clause = 'On the signals we could read, it looks like a reasonable starting point.';
      break;
    case STATES.CARE:
      clause = 'On the signals we could read, it is worth a closer look before you commit a weekend to it.';
      break;
    case STATES.SKIP:
      clause = 'On the signals we could read, there are reasons to look elsewhere first.';
      break;
    default:
      clause = 'We could not read enough to form a confident view yet.';
      break;
  }
  const lead = desc ? `${name} —${desc}` : name;
  return `${lead}. ${clause}`;
}

function buildDisclaimer(asOf) {
  const date = typeof asOf === 'string' && /^\d{4}-\d{2}-\d{2}/.test(asOf) ? asOf : FALLBACK_AS_OF;
  return `${DISCLAIMER_TEXT} (as of ${date})`;
}

// --- Public API --------------------------------------------------------------

/**
 * Compute the structured verdict for a repository.
 *
 * @param {object} [repoData] Normalized repo signals. Recognized fields:
 *   - name, description, owner          : plain metadata for `whatThisIs`
 *   - asOf                              : 'YYYY-MM-DD' as-of stamp for the disclaimer
 *   - maintenance {state|grade,summary} : headline signal
 *   - license {spdxId|grade,known,summary}
 *   - busFactor {topAuthorPercent,topAuthorLogin,grade,summary}
 *   - slop {level|grade,reasons,summary}
 *   - depsAlive {alive,pinned,summary}  : trust-row detail (not a gate signal)
 *   - aiReady {hasClaudeMd,hasAgentsMd,hasCursor,summary}
 *   - stackFit, contextBlock, receipts  : pass-through detector payloads (F1.2/F1.4)
 * @returns {object} A frozen, deterministic verdict object.
 */
export function verdict(repoData) {
  const data = repoData && typeof repoData === 'object' ? repoData : {};

  const grades = {
    maintenance: gradeMaintenance(data.maintenance),
    license: gradeLicense(data.license),
    busFactor: gradeBusFactor(data.busFactor),
    slop: gradeSlop(data.slop),
  };

  const state = resolveState(grades);

  const result = {
    state,
    whatThisIs: whatThisIs(data, state),
    stackFit: data.stackFit !== undefined ? data.stackFit : null,
    trustInWords: {
      maintenance: maintenanceWords(data.maintenance, grades.maintenance),
      license: licenseWords(data.license, grades.license),
      busFactor: busFactorWords(data.busFactor, grades.busFactor),
      depsAlive: depsAliveWords(data.depsAlive),
    },
    aiReady: aiReadyWords(data.aiReady),
    slop: slopWords(data.slop, grades.slop),
    contextBlock: data.contextBlock !== undefined ? data.contextBlock : null,
    disclaimer: buildDisclaimer(data.asOf),
    receipts: data.receipts !== undefined ? data.receipts : null,
  };

  return Object.freeze(result);
}

export default verdict;
