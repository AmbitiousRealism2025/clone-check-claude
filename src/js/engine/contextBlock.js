/**
 * Clone Check — Deterministic context-block assembler (F1.4 / VC-CONTEXT-01).
 *
 * A PURE module (no DOM, no network, no clock, no randomness). It assembles the
 * "Copy context for your agent" block from already-fetched inputs:
 *   README excerpt + detected stack + verdict + setup gotchas (grep'd from
 *   README/issues) + key files.
 *
 * INVARIANTS:
 *   - Deterministic: identical input -> byte-identical block (sorted, no clock).
 *   - BOUNDED (HC-10): this is a small paste-ready brief, NOT a whole-repo
 *     GitIngest-style ingest. The README excerpt, gotcha list, key-file list,
 *     and the total output are all hard-capped, and key files are listed as
 *     PATHS only — never their contents.
 */

/** Hard caps that keep the block a bounded brief (HC-10). */
export const CONTEXT_LIMITS = Object.freeze({
  README_CHARS: 1200,
  GOTCHAS: 5,
  KEY_FILES: 8,
  GOTCHA_LINE_CHARS: 200,
  TOTAL_CHARS: 4000,
});

/** Patterns that mark a line as a setup gotcha worth surfacing to the agent. */
const GOTCHA_PATTERNS = [
  /\.env\b/i,
  /environment variable/i,
  /\bapi[\s-]?key/i,
  /requires?\s+node/i,
  /\bnode\s*(>=|version|\d{2})/i,
  /prerequisite/i,
  /you'?ll need|you will need/i,
  /must (set|have|configure|provide)/i,
  /before you (run|start|begin)/i,
];

/** Files worth calling out when deriving key files from a raw file list. */
const IMPORTANT_FILE = [
  /^package\.json$/i,
  /^readme(\.md)?$/i,
  /^next\.config\.(js|cjs|mjs|ts)$/i,
  /^tailwind\.config\.(js|cjs|mjs|ts)$/i,
  /^tsconfig\.json$/i,
  /^vite\.config\.(js|ts)$/i,
  /^components\.json$/i,
  /^\.env\.example$/i,
  /^docker-compose\.ya?ml$/i,
  /(^|\/)prisma\/schema\.prisma$/i,
];

function clip(str, max) {
  if (typeof str !== 'string') return '';
  return str.length > max ? str.slice(0, max) : str;
}

function readmeContent(readme) {
  if (!readme || typeof readme !== 'object') return '';
  if (typeof readme.content === 'string') return readme.content;
  if (typeof readme.text === 'string') return readme.text;
  return '';
}

/** Grep gotcha lines from README + issue titles/bodies. Deterministic + sorted. */
function collectGotchas(readme, issues) {
  const lines = [];
  const push = (text) => {
    if (typeof text !== 'string') return;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line && GOTCHA_PATTERNS.some((re) => re.test(line))) {
        lines.push(clip(line, CONTEXT_LIMITS.GOTCHA_LINE_CHARS));
      }
    }
  };

  push(readmeContent(readme));
  if (Array.isArray(issues)) {
    for (const issue of issues) {
      if (!issue || typeof issue !== 'object') continue;
      push(issue.title);
      push(issue.body);
    }
  }

  // Dedupe case-insensitively, then sort for input-order independence.
  const seen = new Set();
  const unique = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(line);
    }
  }
  unique.sort();
  return unique.slice(0, CONTEXT_LIMITS.GOTCHAS);
}

/** Resolve the key-files list (paths only), bounded + sorted. */
function collectKeyFiles(input) {
  let candidates = [];
  if (Array.isArray(input.keyFiles)) {
    candidates = input.keyFiles.filter((p) => typeof p === 'string');
  } else if (Array.isArray(input.files)) {
    candidates = input.files
      .filter((p) => typeof p === 'string')
      .filter((p) => IMPORTANT_FILE.some((re) => re.test(p)));
  }
  const unique = Array.from(new Set(candidates));
  unique.sort();
  return unique.slice(0, CONTEXT_LIMITS.KEY_FILES);
}

function resolveVerdict(v) {
  if (!v || typeof v !== 'object') {
    return { state: 'Not enough signal', disclaimer: '' };
  }
  return {
    state: typeof v.state === 'string' ? v.state : 'Not enough signal',
    disclaimer: typeof v.disclaimer === 'string' ? v.disclaimer : '',
  };
}

function resolveRepoName(repo) {
  if (repo && typeof repo === 'object') {
    if (typeof repo.fullName === 'string' && repo.fullName) return repo.fullName;
    if (typeof repo.full_name === 'string' && repo.full_name) return repo.full_name;
    if (typeof repo.name === 'string' && repo.name) return repo.name;
  }
  return 'this repository';
}

/**
 * Assemble the deterministic, bounded context block.
 *
 * @param {object} input
 * @param {object} [input.repo] - { fullName | full_name | name, url }
 * @param {object} [input.verdict] - { state, disclaimer } (or a verdict result)
 * @param {object} [input.stackFit] - stack-fit result; its `.detected` is used
 * @param {object} [input.readme] - { content }
 * @param {Array}  [input.issues] - issue list to grep gotchas from
 * @param {string[]} [input.keyFiles] - explicit key-file paths
 * @param {string[]} [input.files] - raw file list (derives key files if no keyFiles)
 * @returns {{text:string, sections:object, truncated:boolean}}
 */
export function assembleContextBlock(input) {
  const data = input && typeof input === 'object' ? input : {};

  const repoName = resolveRepoName(data.repo);
  const url = data.repo && typeof data.repo.url === 'string' ? data.repo.url : '';
  const verdict = resolveVerdict(data.verdict);

  const stack =
    data.stackFit && Array.isArray(data.stackFit.detected)
      ? data.stackFit.detected.filter((s) => typeof s === 'string')
      : [];

  const fullReadme = readmeContent(data.readme).trim();
  const readmeExcerpt = clip(fullReadme, CONTEXT_LIMITS.README_CHARS);

  const gotchas = collectGotchas(data.readme, data.issues);
  const keyFiles = collectKeyFiles(data);

  const readmeTruncated = fullReadme.length > CONTEXT_LIMITS.README_CHARS;
  const keyFilesCapped =
    (Array.isArray(data.keyFiles) ? data.keyFiles.length : Array.isArray(data.files) ? data.files.length : 0) >
    keyFiles.length;

  const sections = {
    readmeExcerpt,
    stack,
    verdict,
    gotchas,
    keyFiles,
  };

  let text = renderText({ repoName, url, verdict, stack, readmeExcerpt, gotchas, keyFiles });

  let totalClamped = false;
  if (text.length > CONTEXT_LIMITS.TOTAL_CHARS) {
    text = text.slice(0, CONTEXT_LIMITS.TOTAL_CHARS);
    totalClamped = true;
  }

  return {
    text,
    sections,
    truncated: readmeTruncated || keyFilesCapped || totalClamped,
  };
}

function renderText({ repoName, url, verdict, stack, readmeExcerpt, gotchas, keyFiles }) {
  const lines = [];
  lines.push(`# Clone Check — context for ${repoName}`);
  if (url) lines.push(`Source: ${url}`);
  lines.push('');

  lines.push('## Verdict');
  lines.push(verdict.state);
  if (verdict.disclaimer) lines.push(verdict.disclaimer);
  lines.push('');

  lines.push('## Stack detected');
  lines.push(stack.length ? stack.join(', ') : 'none detected');
  lines.push('');

  lines.push('## What this is (README excerpt)');
  lines.push(readmeExcerpt || 'No README found.');
  lines.push('');

  lines.push('## Setup gotchas');
  if (gotchas.length) {
    for (const g of gotchas) lines.push(`- ${g}`);
  } else {
    lines.push('None found in README/issues.');
  }
  lines.push('');

  lines.push('## Key files');
  if (keyFiles.length) {
    for (const f of keyFiles) lines.push(`- ${f}`);
  } else {
    lines.push('None identified.');
  }
  lines.push('');

  lines.push('— Bounded context block (not a full repository dump). —');
  return lines.join('\n');
}

export default assembleContextBlock;
