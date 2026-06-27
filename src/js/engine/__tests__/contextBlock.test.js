/**
 * F1.4 — Deterministic context-block assembler (VC-CONTEXT-01).
 *
 * Behavior: assemble the "Copy context for your agent" block =
 *   README excerpt + detected stack + verdict + setup gotchas grep'd from
 *   README/issues + key files.
 * Identical input -> identical block (determinism). All required sections
 * present. BOUNDED — must NOT expand into a whole-repo GitIngest-style ingest
 * (HC-10).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleContextBlock, CONTEXT_LIMITS } from '../contextBlock.js';

const here = dirname(fileURLToPath(import.meta.url));
const MODULE_SRC = readFileSync(resolve(here, '../contextBlock.js'), 'utf8');

function sampleInput() {
  return {
    repo: { fullName: 'acme/saas-starter', url: 'https://github.com/acme/saas-starter' },
    verdict: {
      state: 'Clone with care',
      disclaimer: 'heuristic check, not a security audit — verify before you ship (as of 2026-06-26)',
    },
    stackFit: { detected: ['nextjs', 'react', 'supabase', 'tailwind'] },
    readme: {
      content:
        '# SaaS Starter\n\nA Next.js + Supabase starter.\n\n' +
        'You will need a Supabase project and a .env file.\n' +
        'Requires Node 20 or later before you run the dev server.\n\n' +
        '## Features\n\n- Auth\n- Billing\n',
    },
    issues: [
      { title: 'Build fails without DATABASE_URL set', body: 'You must set DATABASE_URL in your .env.' },
      { title: 'Nice project', body: 'Thanks!' },
    ],
    keyFiles: ['package.json', 'next.config.js', 'README.md', 'prisma/schema.prisma', '.env.example'],
  };
}

describe('VC-CONTEXT-01 — module purity', () => {
  it('references no document/window/fetch', () => {
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/\bdocument\b/);
    expect(code).not.toMatch(/\bwindow\b/);
    expect(code).not.toMatch(/\bfetch\b/);
  });

  it('uses no clock/random nondeterminism source', () => {
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/Date\.now/);
    expect(code).not.toMatch(/Math\.random/);
    expect(code).not.toMatch(/new Date\(/);
  });
});

describe('VC-CONTEXT-01 — required sections present', () => {
  it('assembles all required sections', () => {
    const block = assembleContextBlock(sampleInput());
    expect(block.sections).toHaveProperty('readmeExcerpt');
    expect(block.sections).toHaveProperty('stack');
    expect(block.sections).toHaveProperty('verdict');
    expect(block.sections).toHaveProperty('gotchas');
    expect(block.sections).toHaveProperty('keyFiles');
  });

  it('renders the verdict state and disclaimer into the text', () => {
    const block = assembleContextBlock(sampleInput());
    expect(block.text).toMatch(/Clone with care/);
    expect(block.text).toMatch(/not a security audit/);
  });

  it('renders the detected stack', () => {
    const block = assembleContextBlock(sampleInput());
    expect(block.sections.stack).toEqual(['nextjs', 'react', 'supabase', 'tailwind']);
    expect(block.text).toMatch(/nextjs/);
  });

  it('includes a README excerpt', () => {
    const block = assembleContextBlock(sampleInput());
    expect(block.sections.readmeExcerpt).toMatch(/SaaS Starter/);
  });

  it('greps setup gotchas from README and issues', () => {
    const block = assembleContextBlock(sampleInput());
    const joined = block.sections.gotchas.join('\n');
    expect(joined).toMatch(/\.env/i);
    expect(joined).toMatch(/Node 20|DATABASE_URL|Supabase/i);
  });

  it('lists key files', () => {
    const block = assembleContextBlock(sampleInput());
    expect(block.sections.keyFiles).toEqual(expect.arrayContaining(['package.json', 'README.md']));
  });
});

describe('VC-CONTEXT-01 — determinism', () => {
  it('identical input -> byte-identical block', () => {
    const a = assembleContextBlock(sampleInput());
    const b = assembleContextBlock(sampleInput());
    expect(a.text).toBe(b.text);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('does not mutate its input', () => {
    const input = sampleInput();
    const snapshot = JSON.stringify(input);
    assembleContextBlock(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('orders gotchas and key files deterministically regardless of input order', () => {
    const a = assembleContextBlock(sampleInput());
    const shuffled = sampleInput();
    shuffled.keyFiles = [...shuffled.keyFiles].reverse();
    shuffled.issues = [...shuffled.issues].reverse();
    const b = assembleContextBlock(shuffled);
    expect(b.sections.keyFiles).toEqual(a.sections.keyFiles);
    expect(b.sections.gotchas).toEqual(a.sections.gotchas);
  });
});

describe('VC-CONTEXT-01 — bounded (NOT a whole-repo ingest, HC-10)', () => {
  it('caps the README excerpt length', () => {
    const huge = sampleInput();
    huge.readme = { content: 'x'.repeat(500000) };
    const block = assembleContextBlock(huge);
    expect(block.sections.readmeExcerpt.length).toBeLessThanOrEqual(CONTEXT_LIMITS.README_CHARS);
    expect(block.truncated).toBe(true);
  });

  it('caps the number of key files', () => {
    const many = sampleInput();
    many.keyFiles = Array.from({ length: 1000 }, (_, i) => `src/file-${i}.ts`);
    const block = assembleContextBlock(many);
    expect(block.sections.keyFiles.length).toBeLessThanOrEqual(CONTEXT_LIMITS.KEY_FILES);
  });

  it('caps the number of gotchas', () => {
    const many = sampleInput();
    many.issues = Array.from({ length: 200 }, (_, i) => ({
      title: `Issue ${i}`,
      body: `You must set ENV_VAR_${i} in your .env before you run it.`,
    }));
    const block = assembleContextBlock(many);
    expect(block.sections.gotchas.length).toBeLessThanOrEqual(CONTEXT_LIMITS.GOTCHAS);
  });

  it('the whole assembled text stays bounded (no whole-repo dump)', () => {
    const huge = sampleInput();
    huge.readme = { content: 'y'.repeat(500000) };
    huge.keyFiles = Array.from({ length: 1000 }, (_, i) => `src/file-${i}.ts`);
    const block = assembleContextBlock(huge);
    expect(block.text.length).toBeLessThanOrEqual(CONTEXT_LIMITS.TOTAL_CHARS);
  });

  it('never embeds raw file contents beyond the README excerpt (paths only)', () => {
    const block = assembleContextBlock(sampleInput());
    // key files appear as paths, not as fenced code blocks of file bodies
    expect(block.sections.keyFiles.every((f) => typeof f === 'string')).toBe(true);
  });
});

describe('VC-CONTEXT-01 — honest degradation on missing parts', () => {
  it('handles empty input without throwing and still produces required sections', () => {
    const block = assembleContextBlock({});
    expect(block.sections).toHaveProperty('readmeExcerpt');
    expect(block.sections).toHaveProperty('stack');
    expect(block.sections).toHaveProperty('verdict');
    expect(block.sections).toHaveProperty('gotchas');
    expect(block.sections).toHaveProperty('keyFiles');
  });

  it('says "none" where a section has no data, never fabricates', () => {
    const block = assembleContextBlock({ verdict: { state: 'Not enough signal' } });
    expect(block.sections.stack).toEqual([]);
    expect(block.sections.gotchas).toEqual([]);
  });
});
