/**
 * F1.4 — Slop detector with false-positive guard (VC-SLOP-01, load-bearing).
 *
 * Behavior: flag initial-commit-only history / no tests / abandoned as
 * 'looks like…'. CRITICALLY, a repo with SQUASHED history must NOT be flagged
 * as slop on commit count alone. We test a slop fixture (flagged) and a
 * squashed-history fixture (explicitly NOT flagged).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectSlop } from '../slopDetector.js';

const here = dirname(fileURLToPath(import.meta.url));
const MODULE_SRC = readFileSync(resolve(here, '../slopDetector.js'), 'utf8');

/** A genuine slop fixture: one commit, no tests, abandoned, no corroborating health. */
function slopFixture() {
  return {
    commitCount: 1,
    hasTests: false,
    hasReleases: false,
    contributorsCount: 1,
    stars: 0,
    maintenanceState: 'abandoned',
    hasReadme: false,
  };
}

/**
 * A squashed-history fixture: ALSO one commit on the default branch, but every
 * corroborating signal says this is a real, maintained project whose history was
 * squashed — tests present, releases cut, many contributors, lots of stars,
 * actively maintained. It must NOT be flagged as slop on commit count alone.
 */
function squashedHistoryFixture() {
  return {
    commitCount: 1,
    hasTests: true,
    hasReleases: true,
    contributorsCount: 24,
    stars: 5400,
    maintenanceState: 'active',
    hasReadme: true,
  };
}

describe('VC-SLOP-01 — module purity', () => {
  it('references no document/window/fetch', () => {
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/\bdocument\b/);
    expect(code).not.toMatch(/\bwindow\b/);
    expect(code).not.toMatch(/\bfetch\b/);
  });
});

describe('VC-SLOP-01 — flags genuine slop as a likelihood', () => {
  it('flags the slop fixture', () => {
    const r = detectSlop(slopFixture());
    expect(r.level).toBe('flagged');
    expect(r.reasons).toContain('initial-commit-only');
  });

  it('words slop as "looks like…", never "is slop"', () => {
    const r = detectSlop(slopFixture());
    expect(r.summary).toMatch(/looks|shows|appears|signs/i);
    expect(r.summary).not.toMatch(/\bis slop\b/i);
  });

  it('flags initial-commit-only history with the named reason', () => {
    const r = detectSlop({ commitCount: 1, hasTests: false, maintenanceState: 'abandoned' });
    expect(r.reasons).toContain('initial-commit-only');
    expect(r.summary).toMatch(/initial-commit-only/);
  });

  it('captures no-tests and abandoned as additional likelihood reasons', () => {
    const r = detectSlop(slopFixture());
    expect(r.reasons).toEqual(expect.arrayContaining(['no-tests', 'abandoned']));
  });
});

describe('VC-SLOP-01 — false-positive guard: squashed history is NOT slop', () => {
  it('does NOT flag the squashed-history fixture', () => {
    const r = detectSlop(squashedHistoryFixture());
    expect(r.level).not.toBe('flagged');
  });

  it('does NOT attribute "initial-commit-only" to a squashed-history repo', () => {
    const r = detectSlop(squashedHistoryFixture());
    expect(r.reasons).not.toContain('initial-commit-only');
  });

  it('records that the low commit count was explained by a squash', () => {
    const r = detectSlop(squashedHistoryFixture());
    expect(r.signals.squashLikely).toBe(true);
  });

  it('a single health signal (tests) is enough to suppress a commit-count flag', () => {
    const r = detectSlop({
      commitCount: 1,
      hasTests: true,
      hasReleases: false,
      contributorsCount: 1,
      stars: 0,
      maintenanceState: 'stale',
    });
    expect(r.reasons).not.toContain('initial-commit-only');
    expect(r.level).not.toBe('flagged');
  });

  it('commit count ALONE (no other slop signals) never flags', () => {
    // One commit, but actively maintained and starred -> not slop.
    const r = detectSlop({
      commitCount: 1,
      hasTests: undefined,
      hasReleases: false,
      contributorsCount: 8,
      stars: 1200,
      maintenanceState: 'active',
    });
    expect(r.level).not.toBe('flagged');
    expect(r.reasons).not.toContain('initial-commit-only');
  });
});

describe('VC-SLOP-01 — honest unknowns and clean cases', () => {
  it('healthy multi-commit repo with tests is clean', () => {
    const r = detectSlop({
      commitCount: 250,
      hasTests: true,
      hasReleases: true,
      contributorsCount: 12,
      stars: 900,
      maintenanceState: 'active',
    });
    expect(r.level).toBe('clean');
    expect(r.reasons).toEqual([]);
  });

  it('no commit data degrades to unknown, never a fabricated clean', () => {
    const r = detectSlop({});
    expect(r.level).toBe('unknown');
    expect(r.summary).toMatch(/not enough signal/i);
  });

  it('is deterministic for identical input', () => {
    expect(JSON.stringify(detectSlop(slopFixture()))).toBe(JSON.stringify(detectSlop(slopFixture())));
  });

  it('never asserts a fact via "is slop" across all levels', () => {
    const shapes = [
      detectSlop(slopFixture()),
      detectSlop(squashedHistoryFixture()),
      detectSlop({ commitCount: 50, hasTests: false, maintenanceState: 'stale' }),
      detectSlop({}),
    ];
    for (const s of shapes) {
      expect(s.summary).not.toMatch(/\bis slop\b/i);
    }
  });
});
