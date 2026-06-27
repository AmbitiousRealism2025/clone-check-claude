/**
 * F1.4 — Stack-fit matcher (VC-STACK-01).
 *
 * Behavior: auto-detect framework chips (Next.js / React / Supabase / Tailwind /
 * shadcn / Stripe / Prisma) from package.json dependencies + config files, and
 * emit a structure that visibly matches detected chips against a saved 3-chip
 * stack. F1.4 owns DETECTION + the MATCH DATA (the highlight render is M3).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStackFit, detectStack, KNOWN_CHIPS, normalizeChipId } from '../stackFit.js';

const here = dirname(fileURLToPath(import.meta.url));
const MODULE_SRC = readFileSync(resolve(here, '../stackFit.js'), 'utf8');

/** A realistic Next.js + Supabase + Tailwind + shadcn starter package.json. */
function sampleNextSupabasePkg() {
  return {
    name: 'saas-starter',
    dependencies: {
      next: '14.2.0',
      react: '18.3.1',
      'react-dom': '18.3.1',
      '@supabase/supabase-js': '2.45.0',
      stripe: '16.0.0',
      '@prisma/client': '5.18.0',
    },
    devDependencies: {
      tailwindcss: '3.4.0',
      prisma: '5.18.0',
      typescript: '5.5.0',
    },
  };
}

describe('VC-STACK-01 — module purity (no DOM, no network)', () => {
  it('references no document/window/fetch', () => {
    const code = MODULE_SRC
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/\bdocument\b/);
    expect(code).not.toMatch(/\bwindow\b/);
    expect(code).not.toMatch(/\bfetch\b/);
  });
});

describe('VC-STACK-01 — chip detection from package.json + config', () => {
  it('detects the full stack from a sample package.json', () => {
    const { detected } = detectStack(sampleNextSupabasePkg(), []);
    expect(detected).toEqual(
      expect.arrayContaining(['nextjs', 'react', 'supabase', 'tailwind', 'stripe', 'prisma'])
    );
  });

  it('detects Next.js from next.config even without the dep', () => {
    const { detected } = detectStack({ dependencies: { react: '18.0.0' } }, ['next.config.mjs']);
    expect(detected).toContain('nextjs');
    expect(detected).toContain('react');
  });

  it('detects Tailwind from a tailwind.config file', () => {
    const { detected } = detectStack({}, ['tailwind.config.ts']);
    expect(detected).toContain('tailwind');
  });

  it('detects shadcn from components.json', () => {
    const { detected } = detectStack({}, ['components.json']);
    expect(detected).toContain('shadcn');
  });

  it('detects Prisma from prisma/schema.prisma', () => {
    const { detected } = detectStack({}, ['prisma/schema.prisma']);
    expect(detected).toContain('prisma');
  });

  it('reads dependencies, devDependencies and peerDependencies', () => {
    const pkg = {
      dependencies: { stripe: '1' },
      devDependencies: { tailwindcss: '1' },
      peerDependencies: { react: '1' },
    };
    const { detected } = detectStack(pkg, []);
    expect(detected).toEqual(expect.arrayContaining(['stripe', 'tailwind', 'react']));
  });

  it('detects nothing from an empty/garbage package.json without crashing', () => {
    expect(detectStack(null, null).detected).toEqual([]);
    expect(detectStack({}, []).detected).toEqual([]);
  });

  it('records evidence of where each chip was detected', () => {
    const { evidence } = detectStack({ dependencies: { next: '14' } }, ['tailwind.config.js']);
    expect(evidence.nextjs).toBe('package.json');
    expect(evidence.tailwind).toBe('config');
  });
});

describe('VC-STACK-01 — visible match against the saved 3-chip stack', () => {
  it('marks saved chips that are detected as matched', () => {
    const result = detectStackFit({
      packageJson: sampleNextSupabasePkg(),
      configFiles: [],
      savedStack: ['nextjs', 'supabase', 'tailwind'],
    });
    expect(result.matched).toEqual(expect.arrayContaining(['nextjs', 'supabase', 'tailwind']));
    expect(result.matchCount).toBe(3);
  });

  it('emits per-chip match data for the highlight layer (M3 consumes this)', () => {
    const result = detectStackFit({
      packageJson: { dependencies: { next: '14', react: '18' } },
      configFiles: [],
      savedStack: ['nextjs', 'supabase', 'tailwind'],
    });
    const byId = Object.fromEntries(result.chips.map((c) => [c.id, c]));
    // nextjs: detected AND in saved stack -> matched (highlight green)
    expect(byId.nextjs).toMatchObject({ detected: true, inStack: true, matched: true });
    // supabase: in saved stack but NOT detected -> a visible gap (not matched)
    expect(byId.supabase).toMatchObject({ detected: false, inStack: true, matched: false });
    // react: detected but NOT in the saved stack -> detected-but-unmatched
    expect(byId.react).toMatchObject({ detected: true, inStack: false, matched: false });
  });

  it('covers every known chip in the chips array (stable render set)', () => {
    const result = detectStackFit({ packageJson: {}, configFiles: [], savedStack: [] });
    expect(result.chips).toHaveLength(KNOWN_CHIPS.length);
  });

  it('normalizes human-entered saved chip labels to canonical ids', () => {
    const result = detectStackFit({
      packageJson: { dependencies: { next: '14' } },
      configFiles: [],
      savedStack: ['Next.js', 'Tailwind CSS', 'shadcn/ui'],
    });
    expect(result.saved).toEqual(expect.arrayContaining(['nextjs', 'tailwind', 'shadcn']));
    expect(result.matched).toContain('nextjs');
  });

  it('normalizeChipId maps common aliases', () => {
    expect(normalizeChipId('Next.js')).toBe('nextjs');
    expect(normalizeChipId('tailwindcss')).toBe('tailwind');
    expect(normalizeChipId('shadcn/ui')).toBe('shadcn');
  });

  it('is deterministic: identical input -> identical output', () => {
    const input = { packageJson: sampleNextSupabasePkg(), configFiles: ['next.config.js'], savedStack: ['nextjs', 'supabase', 'tailwind'] };
    expect(JSON.stringify(detectStackFit(input))).toBe(JSON.stringify(detectStackFit(input)));
  });

  it('matchCount is 0 when none of the saved chips are present', () => {
    const result = detectStackFit({
      packageJson: { dependencies: { vue: '3' } },
      configFiles: [],
      savedStack: ['nextjs', 'supabase', 'tailwind'],
    });
    expect(result.matchCount).toBe(0);
    expect(result.matched).toEqual([]);
  });
});
