/**
 * F1.4 — AI-readiness detector (VC-AIREADY-01).
 *
 * Behavior: derive a badge from presence of AI-rules files
 * (CLAUDE.md / AGENTS.md / .cursor) + README quality + file-count modularity,
 * worded as a LIKELIHOOD ('likely agent-friendly'), NEVER as an assertion
 * ('your agent will grok this').
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAiReadiness } from '../aiReadiness.js';

const here = dirname(fileURLToPath(import.meta.url));
const MODULE_SRC = readFileSync(resolve(here, '../aiReadiness.js'), 'utf8');

const GOOD_README = '# Project\n\n' + 'A clear, substantial readme. '.repeat(40);

describe('VC-AIREADY-01 — module purity', () => {
  it('references no document/window/fetch', () => {
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/\bdocument\b/);
    expect(code).not.toMatch(/\bwindow\b/);
    expect(code).not.toMatch(/\bfetch\b/);
  });
});

describe('VC-AIREADY-01 — badge derived from AI-rules + README + modularity', () => {
  it('repo WITH CLAUDE.md is worded as likely agent-friendly', () => {
    const r = detectAiReadiness({
      aiRules: { hasClaudeMd: true, hasAgentsMd: false, hasCursor: false },
      readme: { content: GOOD_README },
      fileCount: 40,
    });
    expect(r.level).toBe('likely');
    expect(r.summary).toMatch(/has CLAUDE\.md/);
    expect(r.summary).toMatch(/likely agent-friendly/);
  });

  it('repo WITH AGENTS.md is worded as likely agent-friendly', () => {
    const r = detectAiReadiness({
      aiRules: { hasClaudeMd: false, hasAgentsMd: true, hasCursor: false },
      readme: { content: GOOD_README },
      fileCount: 20,
    });
    expect(r.summary).toMatch(/has AGENTS\.md/);
    expect(r.summary).toMatch(/likely agent-friendly/);
  });

  it('repo WITH .cursor rules is worded as likely agent-friendly', () => {
    const r = detectAiReadiness({
      aiRules: { hasClaudeMd: false, hasAgentsMd: false, hasCursor: true },
      readme: { content: GOOD_README },
      fileCount: 20,
    });
    expect(r.summary).toMatch(/\.cursor/);
    expect(r.summary).toMatch(/likely agent-friendly/);
  });

  it('repo WITHOUT any AI-rules files is NOT called agent-friendly, still hedged', () => {
    const r = detectAiReadiness({
      aiRules: { hasClaudeMd: false, hasAgentsMd: false, hasCursor: false },
      readme: { content: GOOD_README },
      fileCount: 40,
    });
    expect(r.summary).not.toMatch(/likely agent-friendly/);
    // still likelihood-worded, not an assertion
    expect(r.summary).toMatch(/likely|may|looks|appears|might/i);
  });

  it('repo with NO rules and a thin README reads as a struggle (hedged)', () => {
    const r = detectAiReadiness({
      aiRules: { hasClaudeMd: false, hasAgentsMd: false, hasCursor: false },
      readme: { content: 'tiny' },
      fileCount: 1,
    });
    expect(r.level).toBe('unlikely');
    expect(r.summary).toMatch(/may|might|struggle|extra context/i);
  });

  it('README quality and modularity influence the level when no rules present', () => {
    const good = detectAiReadiness({
      aiRules: {},
      readme: { content: GOOD_README },
      fileCount: 30,
    });
    const bad = detectAiReadiness({
      aiRules: {},
      readme: { content: '' },
      fileCount: 1,
    });
    expect(good.level).not.toBe(bad.level);
    expect(good.readmeQuality).toBe('good');
    expect(bad.readmeQuality).toBe('none');
  });

  it('NEVER asserts the agent will grok / is guaranteed', () => {
    const variants = [
      detectAiReadiness({ aiRules: { hasClaudeMd: true }, readme: { content: GOOD_README }, fileCount: 40 }),
      detectAiReadiness({ aiRules: {}, readme: { content: 'x' }, fileCount: 1 }),
      detectAiReadiness({ aiRules: {}, readme: { content: GOOD_README }, fileCount: 20 }),
    ];
    for (const v of variants) {
      expect(v.summary).not.toMatch(/will grok/i);
      expect(v.summary).not.toMatch(/guaranteed/i);
      expect(v.summary).not.toMatch(/your agent will/i);
    }
  });

  it('missing inputs degrade to an explicit unknown, never a fabricated badge', () => {
    const r = detectAiReadiness({});
    expect(r.level).toBe('unknown');
    expect(r.summary).toMatch(/not enough signal/i);
  });

  it('is deterministic for identical input', () => {
    const input = { aiRules: { hasClaudeMd: true }, readme: { content: GOOD_README }, fileCount: 12 };
    expect(JSON.stringify(detectAiReadiness(input))).toBe(JSON.stringify(detectAiReadiness(input)));
  });

  it('passes through the rules flags so verdict() can render them', () => {
    const r = detectAiReadiness({ aiRules: { hasClaudeMd: true, hasAgentsMd: false, hasCursor: false }, readme: { content: GOOD_README }, fileCount: 5 });
    expect(r.hasClaudeMd).toBe(true);
    expect(r.hasAgentsMd).toBe(false);
    expect(r.hasCursor).toBe(false);
  });
});
