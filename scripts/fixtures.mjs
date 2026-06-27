/**
 * F1.5 — deterministic harness fixture.
 *
 * A single, fully in-memory sample repository expressed in raw GitHub API
 * shapes (repo metadata + commits list + contents) so the harness can drive the
 * REAL F1.2 data layer and F1.1 engine with ZERO network calls and NO GitHub
 * token. `FIXED_NOW` pins the clock so the maintenance/recency derivation — and
 * therefore the whole verdict — is byte-deterministic across runs and machines.
 */

/** Pinned reference time so recency-derived signals never read the wall clock. */
export const FIXED_NOW = Date.parse('2026-06-26T12:00:00Z');

const GOOD_README = [
  '# Awesome Next Starter',
  '',
  'A production-ready Next.js + Supabase starter with Tailwind styling.',
  'It ships auth, a typed data layer, and sensible defaults.',
  '',
  '## Setup',
  '',
  'Requires Node 20 and a populated `.env` file before first run.',
  'Run `npm install` then `npm run dev`.',
  '',
  '## Notes',
  '',
  'This README is intentionally substantial so the AI-readiness signal reads '
    + 'as a quality README rather than a stub. '.repeat(8),
].join('\n');

/**
 * The fixture, in the shape `verdictCore.assembleVerdictInput` expects:
 *   - repo / commits        -> fed to the F1.2 `normalizeHeadlineSignals`
 *   - packageJson/config    -> stack-fit detection
 *   - readme / aiRules      -> AI-readiness + context block
 *   - the slop corroboration signals
 */
export const sampleRepo = Object.freeze({
  repo: {
    name: 'awesome-next-starter',
    full_name: 'acme/awesome-next-starter',
    description: 'A Next.js + Supabase starter with Tailwind',
    owner: { type: 'Organization', login: 'acme' },
    html_url: 'https://github.com/acme/awesome-next-starter',
    pushed_at: '2026-06-24T09:00:00Z',
    license: { spdx_id: 'MIT', name: 'MIT License' },
    stargazers_count: 1840,
  },
  // Multiple authors, recent dates -> active maintenance + healthy bus factor.
  commits: [
    { commit: { author: { date: '2026-06-24T09:00:00Z' } }, author: { login: 'alice' } },
    { commit: { author: { date: '2026-06-22T14:00:00Z' } }, author: { login: 'bob' } },
    { commit: { author: { date: '2026-06-20T11:00:00Z' } }, author: { login: 'alice' } },
    { commit: { author: { date: '2026-06-18T08:00:00Z' } }, author: { login: 'carol' } },
    { commit: { author: { date: '2026-06-15T16:00:00Z' } }, author: { login: 'bob' } },
  ],
  packageJson: {
    name: 'awesome-next-starter',
    dependencies: {
      next: '14.2.0',
      react: '18.3.0',
      '@supabase/supabase-js': '2.45.0',
    },
    devDependencies: {
      tailwindcss: '3.4.0',
    },
  },
  configFiles: ['tailwind.config.js', 'next.config.js'],
  savedStack: ['nextjs', 'supabase', 'tailwind'],
  readme: { content: GOOD_README },
  aiRules: { hasClaudeMd: true },
  fileCount: 42,
  stars: 1840,
  hasTests: true,
  hasReleases: true,
  contributorsCount: 3,
});

export default sampleRepo;
