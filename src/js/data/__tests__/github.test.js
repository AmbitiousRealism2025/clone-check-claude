/**
 * Clone Check — GitHub data-layer tests.
 *
 * Ported (and trimmed to Clone Check's needs) from the old explorer api tests.
 * Proves the data-trust assertions the data layer owns:
 *   VC-CONTENTS-01 — contents API (package.json / README / file tree / AI-rules)
 *   VC-DATA-01     — headline from <=2 cheap calls
 *   VC-DATA-02     — issues exclude pull requests
 *   VC-DATA-03     — 202 / empty-stats degrade honestly (computing / unknown)
 *   VC-DATA-04     — bus factor shows REAL {login, percentage} rows
 *   VC-DATA-05     — expensive stats are opt-in (not on the headline path)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearCache,
  getRepository,
  getRepositoryCommits,
  getRepositoryReadme,
  getRepositoryPackageJson,
  getFileTree,
  detectAiRulesFiles,
  getAiRulesFiles,
  getIssueTimeline,
  getParticipationStats,
  getContributorStats,
  getCommitActivity,
  normalizeHeadlineSignals,
  fetchHeadlineData,
  normalizeReceiptStat,
  fetchReceiptsData,
  busFactorRows,
} from '../github.js';
import { verdict, STATE_VALUES, STATES } from '../../engine/verdict.js';

const ok = (data, headerVal = '59') => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
  headers: { get: () => headerVal },
});

const status202 = () => ({
  ok: true,
  status: 202,
  json: () => Promise.resolve(null),
  headers: { get: () => '59' },
});

const b64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  const bin = Array.from(bytes).map((x) => String.fromCharCode(x)).join('');
  return btoa(bin);
};

const urlsCalled = () => global.fetch.mock.calls.map((c) => String(c[0]));
const STATS_PATHS = ['stats/participation', 'stats/contributors', 'stats/commit_activity'];
const anyStatsCall = () => urlsCalled().some((u) => STATS_PATHS.some((p) => u.includes(p)));

beforeEach(() => {
  clearCache();
  vi.clearAllMocks();
  global.fetch = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Cheap-tier calls + error handling
// ---------------------------------------------------------------------------
describe('cheap-tier calls', () => {
  it('getRepository fetches repo metadata', async () => {
    global.fetch.mockResolvedValueOnce(ok({ id: 1, full_name: 'owner/repo' }));
    const res = await getRepository('owner', 'repo');
    expect(res.data.full_name).toBe('owner/repo');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/owner/repo'),
      expect.any(Object)
    );
  });

  it('getRepositoryCommits hits the commits endpoint', async () => {
    global.fetch.mockResolvedValueOnce(ok([{ sha: '1' }]));
    const res = await getRepositoryCommits('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/owner/repo/commits?per_page=30'),
      expect.any(Object)
    );
    expect(res.data).toEqual([{ sha: '1' }]);
  });

  it('surfaces an honest rate-limit error (never "Forbidden: check your token")', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: (key) => {
          if (key === 'x-ratelimit-remaining') return '0';
          if (key === 'x-ratelimit-reset') return String(Math.floor(Date.now() / 1000) + 3600);
          return null;
        },
      },
    });
    await expect(getRepository('owner', 'repo')).rejects.toThrow('Rate limit exceeded');
  });

  it('maps 404 to a "Resource not found" error', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found', headers: { get: () => null } });
    await expect(getRepository('owner', 'nope')).rejects.toThrow('Resource not found');
  });

  it('caches responses and clearCache() forces a refetch', async () => {
    global.fetch.mockResolvedValue(ok({ id: 1 }));
    await getRepository('owner', 'repo');
    await getRepository('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    clearCache();
    await getRepository('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// VC-CONTENTS-01 — contents API
// ---------------------------------------------------------------------------
describe('VC-CONTENTS-01 — contents API', () => {
  it('fetches and parses package.json', async () => {
    const pkg = { name: 'cool-starter', dependencies: { next: '14.0.0', '@supabase/supabase-js': '2.0.0' } };
    global.fetch.mockResolvedValueOnce(ok({ content: b64(JSON.stringify(pkg)), encoding: 'base64', path: 'package.json' }));
    const res = await getRepositoryPackageJson('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/owner/repo/contents/package.json'),
      expect.any(Object)
    );
    expect(res.data.parsed).toEqual(pkg);
    expect(res.data.decodedContent).toContain('cool-starter');
  });

  it('returns null data (never fabricated) for a missing package.json', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Resource not found'));
    const res = await getRepositoryPackageJson('owner', 'repo');
    expect(res.data).toBeNull();
  });

  it('parses to null (not a fabricated object) on malformed package.json', async () => {
    global.fetch.mockResolvedValueOnce(ok({ content: b64('{not valid json'), encoding: 'base64' }));
    const res = await getRepositoryPackageJson('owner', 'repo');
    expect(res.data.parsed).toBeNull();
  });

  it('fetches and decodes the README (incl. UTF-8)', async () => {
    const text = '# 日本語 README 🎉';
    global.fetch.mockResolvedValueOnce(ok({ content: b64(text), encoding: 'base64' }));
    const res = await getRepositoryReadme('owner', 'repo');
    expect(res.data.decodedContent).toBe(text);
  });

  it('handles a missing README without throwing', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Resource not found'));
    const res = await getRepositoryReadme('owner', 'repo');
    expect(res.data).toBeNull();
  });

  it('fetches the recursive file tree', async () => {
    const tree = { sha: 'abc', truncated: false, tree: [
      { path: 'src/index.js', type: 'blob' },
      { path: 'package.json', type: 'blob' },
    ] };
    global.fetch.mockResolvedValueOnce(ok(tree));
    const res = await getFileTree('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/owner/repo/git/trees/HEAD?recursive=1'),
      expect.any(Object)
    );
    expect(res.data.tree).toHaveLength(2);
  });

  it('detects AI-rules files (CLAUDE.md / AGENTS.md / .cursor) from a tree', async () => {
    const tree = { truncated: false, tree: [
      { path: 'CLAUDE.md', type: 'blob' },
      { path: 'AGENTS.md', type: 'blob' },
      { path: '.cursor/rules.md', type: 'blob' },
      { path: 'src/app.ts', type: 'blob' },
    ] };
    global.fetch.mockResolvedValueOnce(ok(tree));
    const rules = await getAiRulesFiles('owner', 'repo');
    expect(rules.hasClaudeMd).toBe(true);
    expect(rules.hasAgentsMd).toBe(true);
    expect(rules.hasCursor).toBe(true);
    expect(rules.files).toEqual(expect.arrayContaining(['CLAUDE.md', 'AGENTS.md', '.cursor/rules.md']));
  });

  it('detectAiRulesFiles is pure and reports absence honestly', () => {
    expect(detectAiRulesFiles([{ path: 'src/index.js' }, { path: 'README.md' }])).toEqual({
      hasClaudeMd: false, hasAgentsMd: false, hasCursor: false, files: [],
    });
    expect(detectAiRulesFiles(null).hasClaudeMd).toBe(false);
    expect(detectAiRulesFiles([{ path: '.cursorrules' }]).hasCursor).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VC-DATA-02 — issues exclude pull requests
// ---------------------------------------------------------------------------
describe('VC-DATA-02 — issues exclude pull requests', () => {
  it('strips PRs (items carrying a pull_request field) from issue results', async () => {
    const mixed = [
      { id: 1, title: 'Real issue', state: 'open', created_at: '2024-01-01T00:00:00Z' },
      { id: 2, title: 'A PR masquerading as an issue', state: 'open', pull_request: { url: 'x' } },
      { id: 3, title: 'Another real issue', state: 'closed', created_at: '2024-01-03T00:00:00Z' },
    ];
    global.fetch.mockResolvedValueOnce(ok(mixed));
    const result = await getIssueTimeline('owner', 'repo');
    expect(result.data).toHaveLength(2);
    expect(result.data.every((item) => !('pull_request' in item))).toBe(true);
    expect(result.data.map((i) => i.id)).toEqual([1, 3]);
  });

  it('uses sane default query params and allows overrides', async () => {
    global.fetch.mockResolvedValue(ok([]));
    await getIssueTimeline('owner', 'repo');
    let url = global.fetch.mock.calls[0][0];
    expect(url).toContain('state=all');
    expect(url).toContain('per_page=100');
    clearCache();
    await getIssueTimeline('owner', 'repo', { state: 'open', per_page: '50' });
    url = global.fetch.mock.calls[1][0];
    expect(url).toContain('state=open');
    expect(url).toContain('per_page=50');
  });
});

// ---------------------------------------------------------------------------
// VC-DATA-01 — headline from <=2 cheap calls
// ---------------------------------------------------------------------------
describe('VC-DATA-01 — headline from <=2 cheap calls', () => {
  const wireHeadline = (repoMeta, commits) => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/repos/owner/repo/commits')) return Promise.resolve(ok(commits));
      if (/\/repos\/owner\/repo(\?|$)/.test(u)) return Promise.resolve(ok(repoMeta));
      return Promise.resolve(ok({}));
    });
  };

  it('makes EXACTLY two GitHub calls and NO stats calls', async () => {
    wireHeadline(
      { name: 'repo', license: { spdx_id: 'MIT' }, pushed_at: '2026-06-20T00:00:00Z' },
      [
        { commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } },
        { commit: { author: { date: '2026-06-24T00:00:00Z' } }, author: { login: 'b' } },
      ]
    );
    await fetchHeadlineData('owner', 'repo', { now: Date.parse('2026-06-26T00:00:00Z') });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const urls = urlsCalled();
    expect(urls.some((u) => /\/repos\/owner\/repo(\?|$)/.test(u))).toBe(true);
    expect(urls.some((u) => u.includes('/repos/owner/repo/commits'))).toBe(true);
    expect(anyStatsCall()).toBe(false);
  });

  it('the headline verdict is computable from those two calls alone', async () => {
    const now = Date.parse('2026-06-26T00:00:00Z');
    wireHeadline(
      { name: 'cool', description: 'A starter', owner: { type: 'User' }, license: { spdx_id: 'MIT' }, pushed_at: '2026-06-25T00:00:00Z' },
      [
        { commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } },
        { commit: { author: { date: '2026-06-24T00:00:00Z' } }, author: { login: 'b' } },
        { commit: { author: { date: '2026-06-23T00:00:00Z' } }, author: { login: 'c' } },
      ]
    );
    const { signals } = await fetchHeadlineData('owner', 'repo', { now });
    const v = verdict(signals);
    expect(STATE_VALUES).toContain(v.state);
    expect(v.state).toBe(STATES.CLONEABLE);
    expect(v.disclaimer).toContain('not a security audit');
    expect(v.disclaimer).toContain('2026-06-26');
  });

  it('normalizeHeadlineSignals is pure (deterministic for a fixed now)', () => {
    const repoMeta = { name: 'r', license: { spdx_id: 'MIT' }, pushed_at: '2026-06-25T00:00:00Z' };
    const commits = [{ commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } }];
    const a = normalizeHeadlineSignals(repoMeta, commits, 1000000000000);
    const b = normalizeHeadlineSignals(repoMeta, commits, 1000000000000);
    expect(a).toEqual(b);
  });

  it('a missing license never yields the positive verdict (no false-green)', () => {
    const signals = normalizeHeadlineSignals(
      { name: 'r', license: null, pushed_at: '2026-06-25T00:00:00Z' },
      [
        { commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } },
        { commit: { author: { date: '2026-06-24T00:00:00Z' } }, author: { login: 'b' } },
      ],
      Date.parse('2026-06-26T00:00:00Z')
    );
    expect(verdict(signals).state).not.toBe(STATES.CLONEABLE);
  });
});

// ---------------------------------------------------------------------------
// VC-DATA-05 — expensive stats are opt-in
// ---------------------------------------------------------------------------
describe('VC-DATA-05 — expensive stats are opt-in', () => {
  it('headline render fires NO stats calls; opening receipts fires them', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/repos/owner/repo/commits')) return Promise.resolve(ok([{ commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } }]));
      if (/\/repos\/owner\/repo(\?|$)/.test(u)) return Promise.resolve(ok({ name: 'repo', license: { spdx_id: 'MIT' } }));
      if (u.includes('stats/participation')) return Promise.resolve(ok({ all: [1, 2, 3], owner: [0, 1, 1] }));
      if (u.includes('stats/contributors')) return Promise.resolve(ok([{ author: { login: 'a' }, total: 9 }]));
      if (u.includes('stats/commit_activity')) return Promise.resolve(ok([{ week: 1, total: 5, days: [1, 1, 1, 1, 1, 0, 0] }]));
      return Promise.resolve(ok({}));
    });

    await fetchHeadlineData('owner', 'repo', { now: Date.parse('2026-06-26T00:00:00Z') });
    expect(anyStatsCall()).toBe(false);

    const receipts = await fetchReceiptsData('owner', 'repo');
    const after = urlsCalled();
    expect(after.some((u) => u.includes('stats/participation'))).toBe(true);
    expect(after.some((u) => u.includes('stats/contributors'))).toBe(true);
    expect(after.some((u) => u.includes('stats/commit_activity'))).toBe(true);
    expect(receipts.participation.status).toBe('ok');
  });

  it('caches a successful stats response (second call served from stats cache)', async () => {
    global.fetch.mockResolvedValue(ok({ all: [1, 2, 3], owner: [0, 1, 1] }));
    await getParticipationStats('owner', 'repo');
    await getParticipationStats('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// VC-DATA-03 — 202 / empty-stats degrade honestly
// ---------------------------------------------------------------------------
describe('VC-DATA-03 — honest failure modes (202 / empty)', () => {
  it('normalizeReceiptStat: 202 -> computing, empty -> unknown, never a number/green', () => {
    expect(normalizeReceiptStat({ data: null, processing: true })).toEqual({ status: 'computing', data: null });
    expect(normalizeReceiptStat({ data: {} })).toEqual({ status: 'unknown', data: null });
    expect(normalizeReceiptStat({ data: [] })).toEqual({ status: 'unknown', data: null });
    expect(normalizeReceiptStat(null)).toEqual({ status: 'unknown', data: null });
    const okStat = normalizeReceiptStat({ data: { all: [1, 2] } });
    expect(okStat.status).toBe('ok');
    expect(okStat.data).toEqual({ all: [1, 2] });
  });

  it('stats endpoint retries once on 202 then returns a processing flag', async () => {
    global.fetch.mockResolvedValueOnce(status202()).mockResolvedValueOnce(status202());
    const result = await getCommitActivity('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: null, processing: true, rateLimit: null });
  });

  it('headline still renders while stats return 202 (computing) — no fabricated number', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/repos/owner/repo/commits')) return Promise.resolve(ok([{ commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } }]));
      if (/\/repos\/owner\/repo(\?|$)/.test(u)) return Promise.resolve(ok({ name: 'repo', license: { spdx_id: 'MIT' } }));
      return Promise.resolve(status202());
    });
    const { signals } = await fetchHeadlineData('owner', 'repo', { now: Date.parse('2026-06-26T00:00:00Z') });
    expect(STATE_VALUES).toContain(verdict(signals).state);

    const receipts = await fetchReceiptsData('owner', 'repo');
    expect(receipts.participation.status).toBe('computing');
    expect(receipts.contributors.status).toBe('computing');
    expect(receipts.commitActivity.status).toBe('computing');
    expect(receipts.participation.data).toBeNull();
  });

  it('empty {} stats degrade to Unknown, never a default green', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('stats/participation')) return Promise.resolve(ok({}));
      if (u.includes('stats/contributors')) return Promise.resolve(ok([]));
      if (u.includes('stats/commit_activity')) return Promise.resolve(ok([]));
      return Promise.resolve(ok({}));
    });
    const receipts = await fetchReceiptsData('owner', 'repo');
    for (const key of ['participation', 'contributors', 'commitActivity']) {
      expect(receipts[key].status).toBe('unknown');
      expect(receipts[key].data).toBeNull();
    }
  });

  it('throws on a hard HTTP failure from a stats endpoint', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error', headers: { get: () => null } });
    await expect(getContributorStats('owner', 'repo')).rejects.toThrow('HTTP 500');
  });
});

// ---------------------------------------------------------------------------
// VC-DATA-04 — bus factor shows real contributors
// ---------------------------------------------------------------------------
describe('VC-DATA-04 — bus factor shows real {login, percentage} rows', () => {
  it('builds real rows from contributor stats, never "Unknown 0%"', () => {
    const rows = busFactorRows([
      { author: { login: 'dev1' }, total: 70 },
      { author: { login: 'dev2' }, total: 20 },
      { author: { login: 'dev3' }, total: 10 },
    ]);
    expect(rows).toEqual([
      { login: 'dev1', percentage: 70, commits: 70 },
      { login: 'dev2', percentage: 20, commits: 20 },
      { login: 'dev3', percentage: 10, commits: 10 },
    ]);
    expect(rows.every((r) => r.login && r.login !== 'Unknown')).toBe(true);
  });

  it('returns an empty array (never a fabricated row) for absent contributor data', () => {
    expect(busFactorRows(null)).toEqual([]);
    expect(busFactorRows([])).toEqual([]);
    expect(busFactorRows([{ author: null, total: 0 }])).toEqual([]);
  });

  it('fetchReceiptsData surfaces real bus-factor rows alongside contributor stats', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('stats/contributors')) return Promise.resolve(ok([
        { author: { login: 'alice' }, total: 60 },
        { author: { login: 'bob' }, total: 40 },
      ]));
      return Promise.resolve(ok({ all: [1, 2, 3] }));
    });
    const receipts = await fetchReceiptsData('owner', 'repo');
    expect(receipts.busFactor).toEqual([
      { login: 'alice', percentage: 60, commits: 60 },
      { login: 'bob', percentage: 40, commits: 40 },
    ]);
  });
});
