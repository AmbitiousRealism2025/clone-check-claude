/**
 * F1.4 — integration: the four greenfield differentiators consumed by verdict().
 *
 * The detectors are pure modules that produce the exact payload shapes the
 * pure verdict() engine already consumes (slop, aiReady, stackFit, contextBlock).
 * This file proves they compose correctly THROUGH verdict() and that the
 * load-bearing squashed-history guard survives the full pipeline.
 *
 * Covers: VC-STACK-01, VC-AIREADY-01, VC-SLOP-01, VC-CONTEXT-01 (integration).
 */
import { describe, it, expect } from 'vitest';
import { verdict, STATES } from '../verdict.js';
import { detectStackFit } from '../stackFit.js';
import { detectAiReadiness } from '../aiReadiness.js';
import { detectSlop } from '../slopDetector.js';
import { assembleContextBlock } from '../contextBlock.js';

const GOOD_README = '# Project\n\n' + 'A clear, substantial readme. '.repeat(40);

/** Compose all four detectors into a single verdict() input. */
function buildInput(overrides = {}) {
  const slop = detectSlop(overrides.slopInput || {
    commitCount: 300, hasTests: true, hasReleases: true,
    contributorsCount: 10, stars: 800, maintenanceState: 'active',
  });
  const aiReady = detectAiReadiness(overrides.aiInput || {
    aiRules: { hasClaudeMd: true }, readme: { content: GOOD_README }, fileCount: 40,
  });
  const stackFit = detectStackFit(overrides.stackInput || {
    packageJson: { dependencies: { next: '14', react: '18', '@supabase/supabase-js': '2' } },
    configFiles: ['tailwind.config.js'],
    savedStack: ['nextjs', 'supabase', 'tailwind'],
  });
  const base = {
    name: 'awesome-starter',
    description: 'A Next.js + Supabase starter',
    asOf: '2026-06-26',
    maintenance: { state: 'active' },
    license: { spdxId: 'MIT' },
    busFactor: { topAuthorPercent: 35, topAuthorLogin: 'alice' },
    slop,
    aiReady,
    stackFit,
  };
  const contextBlock = assembleContextBlock({
    repo: { fullName: 'acme/awesome-starter' },
    verdict: { state: 'Clone with care', disclaimer: 'd' },
    stackFit,
    readme: { content: GOOD_README + '\nRequires Node 20 and a .env file.' },
    issues: [],
    keyFiles: ['package.json', 'README.md'],
  });
  return { ...base, contextBlock, ...(overrides.base || {}) };
}

describe('VC-STACK-01 (integration) — stack-fit flows through verdict()', () => {
  it('verdict carries the detected chips + match data', () => {
    const v = verdict(buildInput());
    expect(v.stackFit.matched).toEqual(expect.arrayContaining(['nextjs', 'supabase']));
    expect(v.stackFit.chips.length).toBeGreaterThan(0);
  });
});

describe('VC-AIREADY-01 (integration) — badge flows through verdict()', () => {
  it('verdict renders the likelihood-worded AI badge', () => {
    const v = verdict(buildInput());
    expect(v.aiReady).toMatch(/likely agent-friendly/);
    expect(v.aiReady).not.toMatch(/will grok/i);
  });

  it('a repo without rules files is not called agent-friendly in the verdict', () => {
    const v = verdict(buildInput({
      aiInput: { aiRules: {}, readme: { content: 'tiny' }, fileCount: 1 },
    }));
    expect(v.aiReady).not.toMatch(/likely agent-friendly/);
  });
});

describe('VC-SLOP-01 (integration) — slop + false-positive guard through verdict()', () => {
  it('a genuine slop repo drives the verdict to "Skip it"', () => {
    const v = verdict(buildInput({
      slopInput: {
        commitCount: 1, hasTests: false, hasReleases: false,
        contributorsCount: 1, stars: 0, maintenanceState: 'abandoned',
      },
      base: { maintenance: { state: 'abandoned' } },
    }));
    expect(v.slop).toMatch(/looks abandoned \(initial-commit-only history\)/);
    expect(v.state).toBe(STATES.SKIP);
  });

  it('a SQUASHED-history repo is NOT skipped on commit count alone', () => {
    const v = verdict(buildInput({
      slopInput: {
        commitCount: 1, hasTests: true, hasReleases: true,
        contributorsCount: 24, stars: 5400, maintenanceState: 'active',
      },
    }));
    // squashed history must not surface as a slop flag, and must not by itself
    // push the verdict to Skip it.
    expect(v.slop).not.toMatch(/initial-commit-only/);
    expect(v.state).not.toBe(STATES.SKIP);
    expect(v.state).toBe(STATES.CLONEABLE);
  });
});

describe('VC-CONTEXT-01 (integration) — context block flows through verdict()', () => {
  it('verdict carries a deterministic, bounded context block', () => {
    const a = verdict(buildInput());
    const b = verdict(buildInput());
    expect(a.contextBlock.text).toBe(b.contextBlock.text);
    expect(a.contextBlock.sections).toHaveProperty('keyFiles');
  });
});

describe('F1.4 (integration) — pipeline determinism', () => {
  it('the whole composed verdict is byte-identical across runs', () => {
    expect(JSON.stringify(verdict(buildInput()))).toBe(JSON.stringify(verdict(buildInput())));
  });
});
