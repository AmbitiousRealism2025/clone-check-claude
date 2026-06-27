/**
 * F1.1 — pure verdict() engine + trust safeguards.
 *
 * Each describe block maps to a validation-contract assertion:
 *   VC-ENGINE-01  determinism (deep-equality) + static DOM/network-free grep
 *   VC-ENGINE-02  never positive on missing data
 *   VC-ENGINE-03  no safety-guarantee language ("Safe")
 *   VC-ENGINE-04  exactly four states, no bare in-app score field
 *   VC-ENGINE-05  gameable signals worded as likelihoods
 *   VC-ENGINE-06  dated heuristic disclaimer on every verdict shape
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verdict, STATES, STATE_VALUES, HEADLINE_SIGNALS } from '../verdict.js';

const here = dirname(fileURLToPath(import.meta.url));
const MODULE_SRC = readFileSync(resolve(here, '../verdict.js'), 'utf8');

/** A fully-populated, all-good repo that SHOULD reach the positive label. */
function cloneableInput() {
  return {
    name: 'awesome-starter',
    description: 'A Next.js + Supabase starter',
    asOf: '2026-06-26',
    maintenance: { state: 'active', summary: 'Maintenance: last commit 2 days ago' },
    license: { spdxId: 'MIT' },
    busFactor: { topAuthorPercent: 40, topAuthorLogin: 'alice' },
    slop: { level: 'clean' },
    depsAlive: { alive: true, pinned: true },
    aiReady: { hasClaudeMd: true },
  };
}

describe('VC-ENGINE-01 — verdict() is a pure, deterministic function', () => {
  it('produces deep-equal output across two runs with identical input', () => {
    const input = cloneableInput();
    const a = verdict(input);
    const b = verdict(input);
    expect(a).toEqual(b);
  });

  it('produces byte-identical JSON across two runs', () => {
    const input = cloneableInput();
    expect(JSON.stringify(verdict(input))).toBe(JSON.stringify(verdict(input)));
  });

  it('does not mutate its input', () => {
    const input = cloneableInput();
    const snapshot = JSON.stringify(input);
    verdict(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('is stable for distinct-but-equal input objects', () => {
    expect(verdict(cloneableInput())).toEqual(verdict(cloneableInput()));
  });

  it('static grep: the engine module references no DOM and no network', () => {
    // Strip comments so a stray word in prose cannot trip the guard, then assert
    // the executable source never touches document/window/fetch.
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/\bdocument\b/);
    expect(code).not.toMatch(/\bwindow\b/);
    expect(code).not.toMatch(/\bfetch\b/);
    expect(code).not.toMatch(/\bXMLHttpRequest\b/);
  });

  it('static grep: no clock/random nondeterminism sources', () => {
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/Date\.now/);
    expect(code).not.toMatch(/Math\.random/);
    expect(code).not.toMatch(/new Date\(/);
    expect(code).not.toMatch(/performance\.now/);
  });
});

describe('VC-ENGINE-02 — never positive on missing data', () => {
  it('empty input collapses to "Not enough signal"', () => {
    expect(verdict({}).state).toBe(STATES.INSUFFICIENT);
    expect(verdict(undefined).state).toBe(STATES.INSUFFICIENT);
  });

  it('the positive label is reachable only with every headline signal present', () => {
    expect(verdict(cloneableInput()).state).toBe(STATES.CLONEABLE);
  });

  // Drop each required headline signal in turn; the positive label must vanish.
  for (const signal of HEADLINE_SIGNALS) {
    it(`dropping "${signal}" makes "Looks clone-able" unreachable`, () => {
      const input = cloneableInput();
      delete input[signal];
      expect(verdict(input).state).not.toBe(STATES.CLONEABLE);
    });

    it(`setting "${signal}" to Unknown makes "Looks clone-able" unreachable`, () => {
      const input = cloneableInput();
      input[signal] = { grade: 'unknown' };
      expect(verdict(input).state).not.toBe(STATES.CLONEABLE);
    });

    it(`nulling "${signal}" makes "Looks clone-able" unreachable`, () => {
      const input = cloneableInput();
      input[signal] = null;
      expect(verdict(input).state).not.toBe(STATES.CLONEABLE);
    });
  }

  it('a known-bad signal among Unknowns yields "Skip it", never positive', () => {
    const v = verdict({ asOf: '2026-06-26', maintenance: { state: 'abandoned' } });
    expect(v.state).toBe(STATES.SKIP);
  });

  it('a known-warn signal among Unknowns yields a cautionary state, never positive', () => {
    const v = verdict({ asOf: '2026-06-26', slop: { level: 'caution' } });
    expect([STATES.CARE, STATES.INSUFFICIENT]).toContain(v.state);
    expect(v.state).not.toBe(STATES.CLONEABLE);
  });

  it('no partial input across every single-signal-present case ever returns positive', () => {
    for (const signal of HEADLINE_SIGNALS) {
      const onlyOne = { asOf: '2026-06-26', [signal]: cloneableInput()[signal] };
      expect(verdict(onlyOne).state).not.toBe(STATES.CLONEABLE);
    }
  });
});

describe('VC-ENGINE-03 — no safety-guarantee language', () => {
  it('the maximum positive label is exactly "Looks clone-able"', () => {
    expect(STATES.CLONEABLE).toBe('Looks clone-able');
  });

  it('no enumerated state contains "Safe" / "Safe to clone"', () => {
    for (const value of STATE_VALUES) {
      expect(value).not.toMatch(/safe/i);
    }
  });

  it('grep: the module declares no "Safe"/"Safe to clone" verdict value', () => {
    // Strip comments first — prose may legitimately reference the banned phrase
    // while documenting the invariant; the guard is about emitted values.
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/Safe to clone/i);
    // No string literal in executable code equals or contains "Safe".
    const stringLiterals = code.match(/'[^']*'|"[^"]*"|`[^`]*`/g) || [];
    const safeVerdict = stringLiterals.filter((s) => /\bsafe\b/i.test(s));
    expect(safeVerdict).toEqual([]);
  });

  it('no rendered field on any verdict shape emits "Safe" as a value', () => {
    const shapes = [
      verdict(cloneableInput()),
      verdict({ asOf: '2026-06-26', maintenance: { state: 'abandoned' } }),
      verdict({ asOf: '2026-06-26', slop: { level: 'caution' } }),
      verdict({}),
    ];
    for (const shape of shapes) {
      const flat = JSON.stringify(shape);
      expect(flat).not.toMatch(/\bsafe to clone\b/i);
    }
  });
});

describe('VC-ENGINE-04 — four explicit states, no bare in-app score', () => {
  it('exposes exactly the four allowed states and no others', () => {
    expect(STATE_VALUES).toHaveLength(4);
    expect(new Set(STATE_VALUES)).toEqual(new Set([
      'Looks clone-able', 'Clone with care', 'Skip it', 'Not enough signal',
    ]));
  });

  it('every verdict.state is one of the four enum values', () => {
    const shapes = [
      verdict(cloneableInput()),
      verdict({ asOf: '2026-06-26', maintenance: { state: 'stale' }, license: { spdxId: 'MIT' }, busFactor: { topAuthorPercent: 10 }, slop: { level: 'clean' } }),
      verdict({ asOf: '2026-06-26', maintenance: { state: 'abandoned' }, license: { spdxId: 'MIT' }, busFactor: { topAuthorPercent: 10 }, slop: { level: 'clean' } }),
      verdict({}),
    ];
    for (const shape of shapes) {
      expect(STATE_VALUES).toContain(shape.state);
    }
  });

  it('carries no bare numeric score / grade field intended for in-app display', () => {
    const v = verdict(cloneableInput());
    expect(v).not.toHaveProperty('score');
    expect(v).not.toHaveProperty('healthScore');
    expect(v).not.toHaveProperty('numericScore');
    expect(v).not.toHaveProperty('grade');
    expect(v).not.toHaveProperty('letterGrade');
    expect(v).not.toHaveProperty('rating');
    // Defensive: no top-level value is a bare 0..100 number.
    for (const value of Object.values(v)) {
      if (typeof value === 'number') {
        throw new Error('verdict exposes a bare numeric field intended for display');
      }
    }
  });

  it('exposes the documented shared verdict shape', () => {
    const v = verdict(cloneableInput());
    for (const key of [
      'state', 'whatThisIs', 'stackFit', 'trustInWords', 'aiReady',
      'slop', 'contextBlock', 'disclaimer', 'receipts',
    ]) {
      expect(v).toHaveProperty(key);
    }
  });
});

describe('VC-ENGINE-05 — gameable signals worded as likelihoods', () => {
  it('slop is likelihood-worded, never an asserted fact', () => {
    const flagged = verdict({
      asOf: '2026-06-26',
      slop: { level: 'flagged', reasons: ['initial-commit-only'] },
    });
    expect(flagged.slop).toMatch(/looks abandoned \(initial-commit-only history\)/);
    expect(flagged.slop).not.toMatch(/\bis slop\b/i);
  });

  it('slop caution uses hedged language', () => {
    const caution = verdict({ asOf: '2026-06-26', slop: { level: 'caution' } });
    expect(caution.slop).toMatch(/looks|shows|appears|likely|signs/i);
    expect(caution.slop).not.toMatch(/\bis slop\b/i);
  });

  it('ai-ready badge is likelihood-worded, never a grok assertion', () => {
    const withClaude = verdict({ ...cloneableInput(), aiReady: { hasClaudeMd: true } });
    expect(withClaude.aiReady).toMatch(/has CLAUDE\.md — likely agent-friendly/);
    expect(withClaude.aiReady).not.toMatch(/will grok/i);
    expect(withClaude.aiReady).not.toMatch(/your agent will/i);
  });

  it('absent slop/ai signals say "not enough signal", not a fabricated claim', () => {
    const v = verdict({});
    expect(v.slop).toMatch(/not enough signal/i);
    expect(v.aiReady).toMatch(/not enough signal/i);
  });

  it('no slop or ai-ready string asserts a fact via "is slop"/"will grok"', () => {
    const shapes = [
      verdict({ asOf: '2026-06-26', slop: { level: 'flagged', reasons: ['initial-commit-only'] } }),
      verdict({ asOf: '2026-06-26', slop: { level: 'caution' } }),
      verdict({ asOf: '2026-06-26', slop: { level: 'clean' } }),
      verdict({ asOf: '2026-06-26', aiReady: { hasClaudeMd: false } }),
    ];
    for (const s of shapes) {
      expect(s.slop).not.toMatch(/\bis slop\b/i);
      expect(s.aiReady).not.toMatch(/will grok|guaranteed/i);
    }
  });
});

describe('VC-ENGINE-06 — dated heuristic disclaimer on every verdict shape', () => {
  const DATE_RE = /\d{4}-\d{2}-\d{2}/;

  it('positive verdict carries the dated disclaimer', () => {
    const v = verdict(cloneableInput());
    expect(v.disclaimer).toContain('heuristic check, not a security audit');
    expect(v.disclaimer).toMatch(DATE_RE);
  });

  it('every state shape carries the dated disclaimer (including Not-enough-signal)', () => {
    const shapes = [
      verdict(cloneableInput()),                                              // clone-able
      verdict({ asOf: '2026-06-26', maintenance: { state: 'stale' }, license: { spdxId: 'MIT' }, busFactor: { topAuthorPercent: 10 }, slop: { level: 'clean' } }), // care
      verdict({ asOf: '2026-06-26', maintenance: { state: 'abandoned' }, license: { spdxId: 'MIT' }, busFactor: { topAuthorPercent: 10 }, slop: { level: 'clean' } }), // skip
      verdict({}),                                                            // not enough signal
    ];
    const seenStates = new Set(shapes.map((s) => s.state));
    expect(seenStates).toEqual(new Set(STATE_VALUES));
    for (const s of shapes) {
      expect(s.disclaimer).toContain('heuristic check, not a security audit');
      expect(s.disclaimer).toMatch(DATE_RE);
    }
  });

  it('uses the caller-provided as-of date deterministically', () => {
    const v = verdict({ ...cloneableInput(), asOf: '2025-01-15' });
    expect(v.disclaimer).toContain('2025-01-15');
  });

  it('still carries a date when asOf is omitted (pure, no clock read)', () => {
    const v = verdict({ name: 'x' });
    expect(v.disclaimer).toMatch(DATE_RE);
  });
});
