/**
 * F1.5 — secret redaction (VC-QA-01, HC-12).
 *
 * A tiny, dependency-free redactor shared by the start command (which pipes the
 * dev-server's stdout/stderr through it) and the QA harness (which redacts its
 * own log file before writing). The goal is narrow and defensive: a token must
 * NEVER reach a log file on disk, because those logs live at a documented,
 * fresh-validator-readable path.
 *
 * It runs in two modes:
 *   - as a library:  `import { redact, secretsFromEnv } from './redact.mjs'`
 *   - as a CLI filter: `... | node scripts/redact.mjs`  (reads stdin -> stdout,
 *                       redacting line-by-line so logs stream live)
 */

const PLACEHOLDER = '***REDACTED***';

/** Known GitHub credential shapes (PATs, OAuth, app tokens) + bearer headers. */
const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/g, // classic PAT
  /github_pat_[A-Za-z0-9_]{20,}/g, // fine-grained PAT
  /gh[oushr]_[A-Za-z0-9]{20,}/g, // oauth/user/server/refresh tokens
  /\b[Bb]earer\s+[A-Za-z0-9._\-]+/g, // Authorization: Bearer <token>
];

/** Env var names that may carry a credential we must never log raw. */
export const SECRET_ENV_VARS = Object.freeze([
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'GH_PAT',
  'GITHUB_PAT',
  'CLONE_CHECK_TOKEN',
]);

/** Escape a literal string for safe use inside a RegExp. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Collect the raw values of any credential-bearing environment variables that
 * are currently set, so they can be redacted as exact-match secrets.
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {string[]}
 */
export function secretsFromEnv(env = process.env) {
  const out = [];
  for (const name of SECRET_ENV_VARS) {
    const v = env[name];
    if (typeof v === 'string' && v.trim().length > 0) out.push(v.trim());
  }
  return out;
}

/**
 * Redact secrets from a string.
 * @param {string} text - The text to scrub.
 * @param {string[]} [extraSecrets=[]] - Exact-match secret values to mask.
 * @returns {string}
 */
export function redact(text, extraSecrets = []) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let out = text;

  // 1) Exact-match secrets (e.g. the live token value from the environment).
  for (const secret of extraSecrets) {
    if (typeof secret === 'string' && secret.length >= 4) {
      out = out.replace(new RegExp(escapeRegExp(secret), 'g'), PLACEHOLDER);
    }
  }

  // 2) Bearer headers -> keep the scheme word, mask the credential.
  out = out.replace(/\b([Bb]earer)\s+[A-Za-z0-9._\-]+/g, `$1 ${PLACEHOLDER}`);

  // 3) Known token shapes.
  for (const re of TOKEN_PATTERNS) {
    out = out.replace(re, PLACEHOLDER);
  }

  return out;
}

// --- CLI stream filter -------------------------------------------------------

async function runStreamFilter() {
  const secrets = secretsFromEnv();
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line) => {
    process.stdout.write(redact(line, secrets) + '\n');
  });
  // Resolve when stdin closes so the process exits cleanly.
  await new Promise((resolve) => rl.on('close', resolve));
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('redact.mjs');

if (invokedDirectly) {
  runStreamFilter();
}

export default redact;
