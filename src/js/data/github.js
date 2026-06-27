/**
 * Clone Check — GitHub data layer.
 *
 * A fresh, minimal GitHub REST wrapper that fetches ONLY what Clone Check's
 * verdict engine needs:
 *   - repo metadata + ONE commits-list call (the cheap headline tier),
 *   - the contents API (package.json / README / file tree / AI-rules files),
 *   - issues with pull-requests excluded,
 *   - opt-in "receipts" stats (participation / contributors / commit-activity)
 *     for a real bus factor.
 *
 * Design rules carried over from the brief:
 *   - The pure normalizers (`normalize*`, `derive*`, `detectAiRulesFiles`,
 *     `busFactorRows`) read NO DOM and make NO network call; the clock is
 *     injected so tests are deterministic.
 *   - Failure is honest: 202 → `computing`, empty/missing → `unknown`/`null`,
 *     never a fabricated number and never a default "green".
 *
 * This module performs network I/O (it is the data layer, not the engine).
 * The deterministic `verdict()` engine stays pure and lives in src/js/engine/.
 */

// --- Configuration (re-homed from the old shared constants module) ----------
const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const CACHE_TTL_MS = 5 * 60 * 1000;
const STATS_CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;

const RETRY_CONFIG = { MAX_RETRIES: 3, INITIAL_BACKOFF_MS: 1000, BACKOFF_MULTIPLIER: 2 };
const STATS_202_RETRY_DELAY_MS = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getHeaders = () => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
  };
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gh-token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Caching ----------------------------------------------------------------
const cache = new Map();
const statsCache = new Map();

const getCached = (store, ttl, url) => {
  const cached = store.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttl) {
    store.delete(url);
    return null;
  }
  return cached.data;
};

const setCached = (store, url, data) => {
  store.set(url, { data, timestamp: Date.now() });
  if (store.size > CACHE_MAX_ENTRIES) {
    store.delete(store.keys().next().value);
  }
};

/** Clears the internal API response caches (general + stats). */
export const clearCache = () => {
  cache.clear();
  statsCache.clear();
};

// --- Fetch with retry -------------------------------------------------------
const isHttpError = (error) =>
  error.message.startsWith('HTTP ') ||
  error.message.includes('Rate limit') ||
  error.message.includes('Resource not found') ||
  error.message.includes('Forbidden');

const fetchWithRetry = async (url, retries = RETRY_CONFIG.MAX_RETRIES, backoff = RETRY_CONFIG.INITIAL_BACKOFF_MS) => {
  const cached = getCached(cache, CACHE_TTL_MS, url);
  if (cached) return cached;

  try {
    const response = await fetch(url, { headers: getHeaders() });

    if (response.status === 403) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      const resetTime = response.headers.get('x-ratelimit-reset');
      if (remaining === '0') {
        const resetDate = new Date(parseInt(resetTime) * 1000);
        throw new Error(`Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
      }
      throw new Error('Forbidden: Check your access token');
    }
    if (response.status === 404) throw new Error('Resource not found');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const result = {
      data: await response.json(),
      rateLimit: {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
      },
    };
    setCached(cache, url, result);
    return result;
  } catch (error) {
    if (retries > 0 && !isHttpError(error)) {
      await sleep(backoff + Math.random() * 100);
      return fetchWithRetry(url, retries - 1, backoff * RETRY_CONFIG.BACKOFF_MULTIPLIER);
    }
    throw error;
  }
};

/**
 * Retry/cache envelope for the EXPENSIVE stats endpoints. Adds explicit GitHub
 * `202 Accepted` handling (stats still computing): retry once, then surface
 * `{ data: null, processing: true }` so callers render an honest "computing"
 * state rather than a fabricated number.
 */
const fetchStatsWithRetry = async (url, { retryOn202 = true, retries = RETRY_CONFIG.MAX_RETRIES, backoff = RETRY_CONFIG.INITIAL_BACKOFF_MS } = {}) => {
  const cached = getCached(statsCache, STATS_CACHE_TTL_MS, url);
  if (cached) return cached;

  try {
    const response = await fetch(url, { headers: getHeaders() });

    if (response.status === 202) {
      if (retryOn202) {
        await sleep(STATS_202_RETRY_DELAY_MS);
        return fetchStatsWithRetry(url, { retryOn202: false, retries, backoff });
      }
      return { data: null, processing: true, rateLimit: null };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const result = {
      data: await response.json(),
      processing: false,
      rateLimit: {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
      },
    };
    setCached(statsCache, url, result);
    return result;
  } catch (error) {
    if (retries > 0 && !isHttpError(error)) {
      await sleep(backoff + Math.random() * 100);
      return fetchStatsWithRetry(url, { retryOn202, retries: retries - 1, backoff: backoff * RETRY_CONFIG.BACKOFF_MULTIPLIER });
    }
    throw error;
  }
};

const decodeBase64Utf8 = (base64) => {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

// ===========================================================================
// Cheap-tier calls (headline path): repo metadata + ONE commits-list call.
// ===========================================================================

/** Fetches detailed information for a single repository. */
export const getRepository = async (owner, repo) =>
  fetchWithRetry(`${API_BASE}/repos/${owner}/${repo}`);

/**
 * Fetches the recent commits list for a repository — the second (and final)
 * cheap call on the headline path. A single page; the expensive per-author
 * stats/contributors endpoint stays behind "show the receipts".
 */
export const getRepositoryCommits = async (owner, repo, perPage = 30) =>
  fetchWithRetry(`${API_BASE}/repos/${owner}/${repo}/commits?per_page=${perPage}`);

// ===========================================================================
// Contents API (VC-CONTENTS-01): package.json / README / file tree / AI-rules.
// ===========================================================================

/** Fetches and decodes the README file for a repository (null when absent). */
export const getRepositoryReadme = async (owner, repo) => {
  try {
    const response = await fetchWithRetry(`${API_BASE}/repos/${owner}/${repo}/readme`);
    if (response.data && response.data.content) {
      const decoded = decodeBase64Utf8(response.data.content);
      return { ...response, data: { ...response.data, decodedContent: decoded } };
    }
    return response;
  } catch (error) {
    if (error.message.includes('not found')) return { data: null, rateLimit: null };
    throw error;
  }
};

/**
 * Fetches and parses `package.json` from a repository root. `data` is null when
 * the file is absent (404); `parsed` is null when the file exists but is not
 * valid JSON — never a fabricated object.
 */
export const getRepositoryPackageJson = async (owner, repo) => {
  try {
    const response = await fetchWithRetry(`${API_BASE}/repos/${owner}/${repo}/contents/package.json`);
    if (response.data && response.data.content) {
      const decoded = decodeBase64Utf8(response.data.content);
      let parsed = null;
      try {
        parsed = JSON.parse(decoded);
      } catch {
        parsed = null;
      }
      return { ...response, data: { ...response.data, decodedContent: decoded, parsed } };
    }
    return response;
  } catch (error) {
    if (error.message.includes('not found')) return { data: null, rateLimit: null };
    throw error;
  }
};

/** Fetches the recursive git tree (file list) for a repository. */
export const getFileTree = async (owner, repo, ref = 'HEAD') => {
  try {
    return await fetchWithRetry(`${API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);
  } catch (error) {
    if (error.message.includes('not found')) return { data: null, rateLimit: null };
    throw error;
  }
};

/**
 * Pure: detect AI-rules files from a git-tree entry list. No DOM, no network.
 * Recognizes root-level `CLAUDE.md` / `AGENTS.md` (case-insensitive) and a
 * `.cursor` directory or `.cursorrules` file.
 */
export const detectAiRulesFiles = (treeEntries) => {
  const entries = Array.isArray(treeEntries) ? treeEntries : [];
  const paths = entries
    .map((e) => (e && typeof e.path === 'string' ? e.path : null))
    .filter(Boolean);

  const isRootMatch = (name) => (p) => p.toLowerCase() === name.toLowerCase();
  const hasClaudeMd = paths.some(isRootMatch('CLAUDE.md'));
  const hasAgentsMd = paths.some(isRootMatch('AGENTS.md'));
  const hasCursor = paths.some(
    (p) => p === '.cursorrules' || p.startsWith('.cursor/') || p === '.cursor'
  );

  const files = paths.filter(
    (p) =>
      isRootMatch('CLAUDE.md')(p) ||
      isRootMatch('AGENTS.md')(p) ||
      p === '.cursorrules' ||
      p === '.cursor' ||
      p.startsWith('.cursor/')
  );

  return { hasClaudeMd, hasAgentsMd, hasCursor, files };
};

/** Fetches AI-rules files presence for a repository via a single git-tree call. */
export const getAiRulesFiles = async (owner, repo, ref = 'HEAD') => {
  const response = await getFileTree(owner, repo, ref);
  const tree = response && response.data && Array.isArray(response.data.tree) ? response.data.tree : [];
  return detectAiRulesFiles(tree);
};

// ===========================================================================
// Issues — pull requests excluded (VC-DATA-02).
// ===========================================================================

/**
 * Fetches issues for a repository with pull requests stripped out. GitHub's
 * /issues endpoint intermingles PRs (each carries a `pull_request` field);
 * removing them here, at the data boundary, keeps every downstream issue
 * count/temperature signal from being inflated by PRs.
 */
export const getIssueTimeline = async (owner, repo, params = {}) => {
  const query = new URLSearchParams({
    state: 'all',
    per_page: '100',
    sort: 'created',
    direction: 'desc',
    ...params,
  });
  const result = await fetchWithRetry(`${API_BASE}/repos/${owner}/${repo}/issues?${query}`);
  if (result && Array.isArray(result.data)) {
    result.data = result.data.filter((item) => item && item.pull_request === undefined);
  }
  return result;
};

// ===========================================================================
// Expensive, opt-in stats (receipts): participation / contributors /
// commit-activity. NOT fired on the headline path (VC-DATA-05).
// ===========================================================================

/** Fetches weekly participation stats (commit counts) for the last year. */
export const getParticipationStats = async (owner, repo, retryOnce = true) =>
  fetchStatsWithRetry(`${API_BASE}/repos/${owner}/${repo}/stats/participation`, { retryOn202: retryOnce });

/** Fetches contributor commit activity for a repository. */
export const getContributorStats = async (owner, repo, retryOnce = true) =>
  fetchStatsWithRetry(`${API_BASE}/repos/${owner}/${repo}/stats/contributors`, { retryOn202: retryOnce });

/** Fetches weekly commit activity for the past year (52 weeks). */
export const getCommitActivity = async (owner, repo, retryOnce = true) =>
  fetchStatsWithRetry(`${API_BASE}/repos/${owner}/${repo}/stats/commit_activity`, { retryOn202: retryOnce });

// ===========================================================================
// Pure normalizers feeding the verdict() engine.
// ===========================================================================

const parseDateMs = (value) => {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
};

const toIsoDate = (ms) => new Date(ms).toISOString().split('T')[0];

/**
 * Pure: derive the maintenance signal from the latest commit date (preferred)
 * or repo `pushed_at`. Returns `undefined` when no date is readable so the
 * engine grades it Unknown — never a fabricated "active".
 */
const deriveMaintenance = (repoData, commits, now) => {
  let lastMs = null;
  if (Array.isArray(commits)) {
    for (const c of commits) {
      const d =
        parseDateMs(c && c.commit && c.commit.author && c.commit.author.date) ||
        parseDateMs(c && c.commit && c.commit.committer && c.commit.committer.date);
      if (d !== null && (lastMs === null || d > lastMs)) lastMs = d;
    }
  }
  if (lastMs === null) lastMs = parseDateMs(repoData && repoData.pushed_at);
  if (lastMs === null) return undefined;

  const days = Math.floor((now - lastMs) / DAY_MS);
  let state;
  if (days <= 30) state = 'active';
  else if (days <= 90) state = 'recent';
  else if (days <= 365) state = 'stale';
  else state = 'abandoned';

  const ago = days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  const tail =
    state === 'active' || state === 'recent'
      ? '— looks actively maintained'
      : state === 'stale'
      ? '— looks slow'
      : '— looks abandoned';
  return { state, lastCommitDays: days, summary: `Maintenance: last commit ${ago} ${tail}` };
};

/**
 * Pure: derive the license signal from repo metadata. `NOASSERTION` maps to
 * Unknown (never positive); a missing license object maps to "no license file"
 * (cautionary), never positive.
 */
const deriveLicense = (repoData) => {
  const lic = repoData ? repoData.license : undefined;
  if (lic === undefined) return undefined;
  if (lic === null) return { spdxId: null };
  const spdx = lic.spdx_id;
  if (!spdx || spdx === 'NOASSERTION') return { known: false };
  return { spdxId: spdx, summary: `License: ${spdx} — check it fits how you plan to ship` };
};

/**
 * Pure: derive the cheap-tier bus-factor signal from the commits list
 * (authorship concentration). Returns `undefined` when no commits are readable
 * — never `Unknown 0%`.
 */
const deriveBusFactor = (commits) => {
  if (!Array.isArray(commits) || commits.length === 0) return undefined;
  const counts = new Map();
  for (const c of commits) {
    const login =
      (c && c.author && c.author.login) ||
      (c && c.commit && c.commit.author && c.commit.author.name) ||
      'unknown';
    counts.set(login, (counts.get(login) || 0) + 1);
  }
  let topLogin = null;
  let topCount = 0;
  for (const [login, count] of counts) {
    if (count > topCount) {
      topCount = count;
      topLogin = login;
    }
  }
  const total = commits.length;
  const pct = Math.round((topCount / total) * 100);
  const tail = pct > 60 ? ' — risky if they step away' : '';
  return {
    topAuthorPercent: pct,
    topAuthorLogin: topLogin,
    summary: `Bus factor: ${topLogin} wrote ${pct}% of the last ${total} commits${tail}`,
  };
};

/**
 * Pure: derive a conservative slop signal from the commits list. Single-commit
 * history is flagged as a likelihood ("initial-commit-only") — NOT an assertion
 * — and only at `caution` level so a squashed-history repo is not auto-skipped
 * on commit count alone. No commits → `undefined` (Unknown), never "clean".
 */
const deriveSlop = (commits) => {
  if (!Array.isArray(commits) || commits.length === 0) return undefined;
  if (commits.length === 1) {
    return {
      level: 'caution',
      reasons: ['initial-commit-only'],
      summary: 'Slop check: looks abandoned (initial-commit-only history)',
    };
  }
  return { level: 'clean' };
};

/**
 * Pure: normalize repo metadata + commits list into the headline signal object
 * consumed by `verdict()`. No DOM, no network; the clock is injected for
 * determinism in tests.
 */
export const normalizeHeadlineSignals = (repoData, commits, now = Date.now()) => {
  const repo = repoData && typeof repoData === 'object' ? repoData : {};
  return {
    name: typeof repo.name === 'string' ? repo.name : undefined,
    description: typeof repo.description === 'string' ? repo.description : undefined,
    owner: repo.owner && repo.owner.type ? { type: repo.owner.type } : undefined,
    asOf: toIsoDate(now),
    maintenance: deriveMaintenance(repo, commits, now),
    license: deriveLicense(repo),
    busFactor: deriveBusFactor(commits),
    slop: deriveSlop(commits),
  };
};

/**
 * Pure: turn a GitHub `stats/contributors` payload into real
 * `{login, percentage}` rows for the bus-factor view (VC-DATA-04). Returns an
 * empty array when contributor data is absent — never a fabricated
 * `Unknown 0%` row.
 */
export const busFactorRows = (contributors) => {
  if (!Array.isArray(contributors)) return [];
  const valid = contributors.filter(
    (c) => c && typeof c.total === 'number' && c.total > 0 && c.author && c.author.login
  );
  if (valid.length === 0) return [];
  const totalCommits = valid.reduce((sum, c) => sum + c.total, 0);
  return valid
    .slice()
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      login: c.author.login,
      percentage: Math.round((c.total / totalCommits) * 100),
      commits: c.total,
    }));
};

/**
 * Pure: collapse one stats-endpoint envelope into an explicit, honest status.
 * `processing` → 'computing'; null / empty `{}` / empty `[]` → 'unknown';
 * otherwise 'ok' with the real data. NEVER a fabricated number, NEVER a default
 * "green" (VC-DATA-03).
 */
export const normalizeReceiptStat = (envelope) => {
  if (!envelope) return { status: 'unknown', data: null };
  if (envelope.processing) return { status: 'computing', data: null };
  const d = envelope.data;
  if (d === null || d === undefined) return { status: 'unknown', data: null };
  if (Array.isArray(d)) return d.length === 0 ? { status: 'unknown', data: null } : { status: 'ok', data: d };
  if (typeof d === 'object') {
    return Object.keys(d).length === 0 ? { status: 'unknown', data: null } : { status: 'ok', data: d };
  }
  return { status: 'ok', data: d };
};

// ===========================================================================
// Tiered fetch orchestrators.
// ===========================================================================

/**
 * TIER 1 — Fetch the cheap headline data for a repo: EXACTLY two GitHub calls
 * (repo metadata + one commits-list call), normalized into the signal object
 * the pure `verdict()` engine consumes. Performs NO stats calls (VC-DATA-01,
 * VC-DATA-05).
 */
export const fetchHeadlineData = async (owner, repo, { now = Date.now(), commitsPerPage = 30 } = {}) => {
  const [repoRes, commitsRes] = await Promise.all([
    getRepository(owner, repo),
    getRepositoryCommits(owner, repo, commitsPerPage),
  ]);

  const repoData = repoRes ? repoRes.data : null;
  const commits = commitsRes && Array.isArray(commitsRes.data) ? commitsRes.data : [];

  return {
    signals: normalizeHeadlineSignals(repoData, commits, now),
    repo: repoData,
    commits,
    rateLimit: (commitsRes && commitsRes.rateLimit) || (repoRes && repoRes.rateLimit) || null,
  };
};

/**
 * TIER 2 — Fetch the EXPENSIVE, opt-in stats for "show the receipts". Fires the
 * participation / contributor / commit-activity endpoints (and ONLY those) and
 * normalizes each to an explicit ok/computing/unknown status — never a
 * fabricated number, never a default green (VC-DATA-03 / VC-DATA-05). Must NOT
 * be called on initial headline render.
 */
export const fetchReceiptsData = async (owner, repo) => {
  const results = await Promise.allSettled([
    getParticipationStats(owner, repo),
    getContributorStats(owner, repo),
    getCommitActivity(owner, repo),
  ]);

  const settledEnvelope = (result) => (result.status === 'fulfilled' ? result.value : null);
  const contributors = normalizeReceiptStat(settledEnvelope(results[1]));

  return {
    participation: normalizeReceiptStat(settledEnvelope(results[0])),
    contributors,
    commitActivity: normalizeReceiptStat(settledEnvelope(results[2])),
    // Real {login, percentage} rows for the bus-factor view (VC-DATA-04).
    busFactor: busFactorRows(contributors.data),
  };
};
