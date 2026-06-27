/**
 * F1.0 scaffold guards.
 *
 * F1.0 claims ZERO validation-contract assertions — it is pure scaffolding.
 * These tests encode the durable-trust artifacts the feature is responsible
 * for, so a future context reset cannot silently delete them and stay green:
 *   - the greenfield pure-engine directory exists,
 *   - validation-contract.md enumerates all 51 assertion IDs,
 *   - AGENTS.md carries the hard invariants (never "Safe", never positive on
 *     missing data, deterministic pure engine, redact secrets),
 *   - the QA-log path F1.5 writes to is git-ignored.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

// The full 51-assertion roster from the coverage ledger.
const ALL_ASSERTION_IDS = [
  // Group A — Data Trust (12)
  'VC-ENGINE-01', 'VC-ENGINE-02', 'VC-ENGINE-03', 'VC-ENGINE-04', 'VC-ENGINE-05', 'VC-ENGINE-06',
  'VC-DATA-01', 'VC-DATA-02', 'VC-DATA-03', 'VC-DATA-04', 'VC-DATA-05',
  'VC-CONTENTS-01',
  // Group B — Due-Diligence Core (6)
  'VC-STACK-01', 'VC-AIREADY-01', 'VC-SLOP-01', 'VC-CONTEXT-01', 'VC-MCP-01', 'VC-MCP-02',
  // Group C — Vibe-Coder Mode (7)
  'VC-SHELL-01', 'VC-WEB-01', 'VC-WEB-02', 'VC-WEB-03', 'VC-WEB-04', 'VC-WEB-05', 'VC-WEB-06',
  // Group D — Accessibility (5)
  'VC-A11Y-01', 'VC-A11Y-02', 'VC-A11Y-03', 'VC-A11Y-04', 'VC-A11Y-05',
  // Group E — Design (5)
  'VC-DESIGN-01', 'VC-DESIGN-02', 'VC-DESIGN-03', 'VC-SHARE-01', 'VC-SHARE-02',
  // Group F — Platform / Deploy (9)
  'VC-QA-01', 'VC-QA-02', 'VC-PLATFORM-01', 'VC-PLATFORM-02', 'VC-PLATFORM-03', 'VC-PLATFORM-04',
  'VC-CACHE-01', 'VC-CACHE-02', 'VC-HYGIENE-01',
  // Group G — Cross-Feature Flows (3)
  'VC-FLOW-01', 'VC-FLOW-02', 'VC-FLOW-03',
  // Group H — Trust-Incident Containment (4)
  'VC-CONTAIN-01', 'VC-CONTAIN-02', 'VC-CONTAIN-03', 'VC-CONTAIN-04',
];

describe('F1.0 — greenfield engine directory', () => {
  it('src/js/engine/ exists as a committed directory', () => {
    const dir = resolve(root, 'src/js/engine');
    expect(existsSync(dir)).toBe(true);
    expect(statSync(dir).isDirectory()).toBe(true);
  });
});

describe('F1.0 — validation-contract.md', () => {
  const contract = read('validation-contract.md');

  it('exists at the repo root and is non-trivial', () => {
    expect(contract.length).toBeGreaterThan(2000);
  });

  it('enumerates exactly the 51 assertion IDs from the coverage ledger', () => {
    expect(ALL_ASSERTION_IDS).toHaveLength(51);
    for (const id of ALL_ASSERTION_IDS) {
      expect(contract, `missing assertion ${id}`).toContain(id);
    }
  });

  it('states the coverage total of 51', () => {
    expect(contract).toContain('**Total**');
    expect(contract).toContain('51');
  });
});

describe('F1.0 — AGENTS.md hard invariants', () => {
  const agents = read('AGENTS.md');

  it('carries the never-"Safe" invariant (HC-1)', () => {
    expect(agents).toContain('HC-1');
    expect(agents).toContain('Never assert "Safe."');
    expect(agents).toContain('Looks clone-able');
  });

  it('carries never-positive-on-missing-data (HC-2)', () => {
    expect(agents).toContain('HC-2');
    expect(agents).toContain('Never positive on missing data.');
  });

  it('carries the dated heuristic disclaimer (HC-3)', () => {
    expect(agents).toContain('HC-3');
    expect(agents).toContain('not a security audit');
  });

  it('carries likelihood-wording for gameable signals (HC-4)', () => {
    expect(agents).toContain('HC-4');
    expect(agents).toContain('worded as likelihoods');
  });

  it('carries redact-secrets-from-disk-logs (HC-12)', () => {
    expect(agents).toContain('HC-12');
    expect(agents).toContain('redact');
  });

  it('declares the engine a PURE function (no DOM, no fetch)', () => {
    expect(agents).toMatch(/PURE function/);
    expect(agents).toContain('no DOM');
  });

  it('forbids React/Vue/router/state-library drift', () => {
    expect(agents).toContain('Do NOT introduce React / Vue');
  });
});

describe('F1.0 — QA log path is git-ignored (HC-12 / VC-QA-01)', () => {
  const gitignore = read('.gitignore');
  it('ignores the logs/ directory the harness writes to', () => {
    expect(gitignore).toMatch(/^logs\/$/m);
  });
});
