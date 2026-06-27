/**
 * F1.5 — QA / run harness (black-box testability from M1).
 *
 * Tests-first encoding of the two validation-contract assertions this feature
 * owns:
 *
 *   VC-QA-01 — One-command scriptable startup with disk logs.
 *     A single documented command starts the app for black-box testing and
 *     writes logs to a known filesystem path (secrets REDACTED, excluded from
 *     VCS).
 *
 *   VC-QA-02 — Programmatic end-to-end harness.
 *     A scriptable harness drives a verdict end-to-end (input repo -> rendered
 *     verdict via the F1.1 engine fed by the F1.2 data layer) AND invokes the
 *     MCP `clone_check` tool programmatically. Output shows BOTH paths.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { redact, secretsFromEnv } from '../../../scripts/redact.mjs';
import { runHarness, LOG_PATH, VALID_STATES } from '../../../scripts/qa-harness.mjs';
import { cloneCheck } from '../../../scripts/mcp-stub.mjs';
import { computeVerdict } from '../../../scripts/verdictCore.mjs';
import { sampleRepo, FIXED_NOW } from '../../../scripts/fixtures.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const FAKE_TOKEN = 'ghp_FAKEsecret0123456789ABCDEFabcdef9999';

// ---------------------------------------------------------------------------
// VC-QA-01 — one documented start command + redacted on-disk logs out of VCS
// ---------------------------------------------------------------------------
describe('VC-QA-01 — one-command startup + redacted disk logs', () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

  it('package.json exposes ONE documented start command', () => {
    expect(pkg.scripts).toBeTruthy();
    expect(typeof pkg.scripts.start).toBe('string');
    expect(pkg.scripts.start).toMatch(/start\.sh/);
  });

  it('the start script exists and is executable', () => {
    const startPath = join(REPO_ROOT, 'scripts/start.sh');
    expect(existsSync(startPath)).toBe(true);
    const mode = statSync(startPath).mode;
    // owner-execute bit set
    expect(mode & 0o100).toBe(0o100);
  });

  it('start.sh writes to a KNOWN log path and routes output through the redactor', () => {
    const sh = readFileSync(join(REPO_ROOT, 'scripts/start.sh'), 'utf8');
    expect(sh).toMatch(/logs\/app\.log/);
    expect(sh).toMatch(/redact\.mjs/);
  });

  it('the known log directory is excluded from VCS (HC-12)', () => {
    const gi = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8');
    expect(gi).toMatch(/^logs\/$/m);
  });

  it('redact() masks GitHub tokens, Bearer headers, and env-provided secrets', () => {
    const raw = [
      `token=${FAKE_TOKEN}`,
      'Authorization: Bearer abc123.def456-ghi',
      'github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz',
      'plain-secret-value-xyz',
    ].join('\n');
    const out = redact(raw, ['plain-secret-value-xyz']);
    expect(out).not.toContain(FAKE_TOKEN);
    expect(out).not.toContain('abc123.def456-ghi');
    expect(out).not.toContain('github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz');
    expect(out).not.toContain('plain-secret-value-xyz');
    expect(out).toMatch(/REDACTED/);
  });

  it('secretsFromEnv() collects known token env vars when present', () => {
    const prev = process.env.GH_TOKEN;
    process.env.GH_TOKEN = FAKE_TOKEN;
    try {
      expect(secretsFromEnv()).toContain(FAKE_TOKEN);
    } finally {
      if (prev === undefined) delete process.env.GH_TOKEN;
      else process.env.GH_TOKEN = prev;
    }
  });

  it('README documents the start command and the log path', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    expect(readme).toMatch(/npm (run )?start/);
    expect(readme).toMatch(/logs\/app\.log/);
    expect(readme).toMatch(/logs\/qa-harness\.log/);
  });
});

// ---------------------------------------------------------------------------
// VC-QA-02 — programmatic end-to-end harness (web/engine path + MCP path)
// ---------------------------------------------------------------------------
describe('VC-QA-02 — programmatic end-to-end harness', () => {
  it('drives a verdict via the engine + data layer AND the MCP stub, in parity', () => {
    const res = runHarness({ now: FIXED_NOW, repo: sampleRepo });
    // web/engine path produced a structured verdict
    expect(VALID_STATES).toContain(res.web.state);
    expect(typeof res.web.disclaimer).toBe('string');
    // MCP clone_check path produced a structured verdict
    expect(res.mcp.tool).toBe('clone_check');
    expect(VALID_STATES).toContain(res.mcp.verdict.state);
    // both surfaces wrap the SAME pure core -> identical verdict
    expect(res.parity).toBe(true);
  });

  it('never emits the banned "Safe" verdict on either path', () => {
    const res = runHarness({ now: FIXED_NOW, repo: sampleRepo });
    expect(res.web.state).not.toMatch(/safe/i);
    expect(res.mcp.verdict.state).not.toMatch(/safe/i);
  });

  it('the MCP stub calls the same pure core as the web/engine path', () => {
    const web = computeVerdict(sampleRepo, FIXED_NOW);
    const mcp = cloneCheck(sampleRepo, { now: FIXED_NOW });
    expect(mcp.verdict).toEqual(web);
  });

  it('the core path runs WITHOUT a GitHub token in the environment', () => {
    const prevGh = process.env.GH_TOKEN;
    const prevGithub = process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      const res = runHarness({ now: FIXED_NOW, repo: sampleRepo });
      expect(VALID_STATES).toContain(res.web.state);
    } finally {
      if (prevGh !== undefined) process.env.GH_TOKEN = prevGh;
      if (prevGithub !== undefined) process.env.GITHUB_TOKEN = prevGithub;
    }
  });

  it('run as a script: exits 0, prints BOTH paths, writes a REDACTED log file', () => {
    if (existsSync(LOG_PATH)) rmSync(LOG_PATH);
    const stdout = execFileSync('node', ['scripts/qa-harness.mjs'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, GH_TOKEN: FAKE_TOKEN },
    });
    // terminal output shows both invocation paths (VC-QA-02 evidence)
    expect(stdout).toMatch(/WEB\/ENGINE VERDICT PATH/);
    expect(stdout).toMatch(/MCP clone_check PATH/);

    // log file appears at the documented path with the injected secret redacted
    expect(existsSync(LOG_PATH)).toBe(true);
    const log = readFileSync(LOG_PATH, 'utf8');
    expect(log).not.toContain(FAKE_TOKEN);
    expect(log).toMatch(/REDACTED/);
    expect(log).toMatch(/WEB\/ENGINE VERDICT PATH/);
    expect(log).toMatch(/MCP clone_check PATH/);
  });
});
