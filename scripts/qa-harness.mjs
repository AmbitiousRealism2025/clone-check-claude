#!/usr/bin/env node
/**
 * F1.5 — scriptable end-to-end QA harness (VC-QA-02).
 *
 * Drives a verdict end-to-end TWO ways and proves they agree:
 *   1. WEB/ENGINE PATH — input repo -> F1.2 data layer -> F1.1 verdict()
 *   2. MCP clone_check PATH — the programmatic `clone_check(repo)` stub
 *      (M1 stand-in wired to the same pure core; real server lands in M2/F2.3)
 *
 * It is thin and deterministic: it uses an in-memory fixture (no network, no
 * GitHub token) and a pinned clock, so the verdict is byte-identical on every
 * run and every machine. When run as a script it also writes a REDACTED log to
 * a documented on-disk path (VC-QA-01 evidence pairing).
 *
 *   Run it:   npm run qa     (or: node scripts/qa-harness.mjs)
 *   Log path: logs/qa-harness.log   (gitignored, secrets redacted)
 */
import { writeFileSync, mkdirSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { computeVerdict } from './verdictCore.mjs';
import { cloneCheck } from './mcp-stub.mjs';
import { redact, secretsFromEnv } from './redact.mjs';
import { sampleRepo, FIXED_NOW } from './fixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

/** Documented, known-on-disk log path (gitignored, redacted). */
export const LOG_DIR = join(REPO_ROOT, 'logs');
export const LOG_PATH = join(LOG_DIR, 'qa-harness.log');

/** The only four legal verdict states (mirrors engine STATE_VALUES). */
export const VALID_STATES = Object.freeze([
  'Looks clone-able',
  'Clone with care',
  'Skip it',
  'Not enough signal',
]);

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function section(title) {
  return `\n=== ${title} ===`;
}

function renderVerdict(v) {
  return [
    `state:        ${v.state}`,
    `whatThisIs:   ${v.whatThisIs}`,
    `aiReady:      ${v.aiReady}`,
    `slop:         ${v.slop}`,
    `stackFit:     ${v.stackFit ? v.stackFit.summary : 'n/a'}`,
    `disclaimer:   ${v.disclaimer}`,
  ].join('\n');
}

function renderReport({ web, mcp, parity, repoName }) {
  const lines = [];
  lines.push('Clone Check — QA harness (F1.5, VC-QA-02)');
  lines.push(`input repo:   ${repoName}`);

  lines.push(section('WEB/ENGINE VERDICT PATH'));
  lines.push('input repo -> F1.2 data layer (normalizeHeadlineSignals) -> F1.1 verdict()');
  lines.push(renderVerdict(web));

  lines.push(section('MCP clone_check PATH'));
  lines.push(`tool: ${mcp.tool}  (stub: ${mcp.stub === true})`);
  lines.push(renderVerdict(mcp.verdict));

  lines.push(section('PARITY'));
  lines.push(parity
    ? 'PASS — web/engine and MCP clone_check returned an identical verdict.'
    : 'FAIL — web/engine and MCP clone_check verdicts diverged.');

  return lines.join('\n');
}

/** Diagnostic auth line included BEFORE redaction to prove redaction works. */
function authDiagnostics(env) {
  const token = env.GH_TOKEN || env.GITHUB_TOKEN || '';
  const shown = token ? token : '(none — core path needs no token)';
  return `# auth token (raw, redacted before write): ${shown}`;
}

/**
 * Run the harness.
 * @param {object} [opts]
 * @param {number} [opts.now=FIXED_NOW]
 * @param {object} [opts.repo=sampleRepo]
 * @param {boolean} [opts.write=false] - Write the redacted log file to disk.
 * @param {NodeJS.ProcessEnv} [opts.env=process.env]
 * @returns {{web:object, mcp:object, parity:boolean, report:string, logPath:(string|null)}}
 */
export function runHarness({ now = FIXED_NOW, repo = sampleRepo, write = false, env = process.env } = {}) {
  // 1) WEB/ENGINE PATH
  const web = computeVerdict(repo, now);
  // 2) MCP clone_check PATH (same pure core, programmatic invocation)
  const mcp = cloneCheck(repo, { now });

  const parity = deepEqual(web, mcp.verdict);
  const repoName = (repo && repo.repo && (repo.repo.full_name || repo.repo.name)) || 'unknown';
  const report = renderReport({ web, mcp, parity, repoName });

  let logPath = null;
  if (write) {
    mkdirSync(LOG_DIR, { recursive: true });
    const raw = `${authDiagnostics(env)}\n${report}\n`;
    writeFileSync(LOG_PATH, redact(raw, secretsFromEnv(env)), 'utf8');
    logPath = LOG_PATH;
  }

  return { web, mcp, parity, report, logPath };
}

// --- CLI entrypoint ----------------------------------------------------------

function isMain() {
  try {
    return Boolean(process.argv[1]) &&
      realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) {
  const { report, parity, web, mcp, logPath } = runHarness({ write: true });
  process.stdout.write(report + '\n');
  process.stdout.write(`\nLog written to: ${logPath}\n`);

  const ok =
    parity &&
    VALID_STATES.includes(web.state) &&
    VALID_STATES.includes(mcp.verdict.state);
  process.exit(ok ? 0 : 1);
}

export default runHarness;
