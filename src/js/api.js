import { API_BASE, API_VERSION, CACHE_TTL_MS, CACHE_MAX_ENTRIES, STATS_CACHE_TTL_MS, TRENDING_DAYS_BACK, TRENDING_CATEGORIES } from './constants.js';

const RETRY_CONFIG = { MAX_RETRIES: 3, INITIAL_BACKOFF_MS: 1000, BACKOFF_MULTIPLIER: 2 };

const getHeaders = () => {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION
  };
  
  const token = localStorage.getItem('gh-token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const cache = new Map();

const getCachedResponse = (url) => {
  const cached = cache.get(url);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    cache.delete(url);
    return null;
  }
  
  console.log(`[Cache] HIT: ${url.substring(0, 60)}...`);
  return cached.data;
};

const setCachedResponse = (url, data) => {
  cache.set(url, { data, timestamp: Date.now() });
  
  if (cache.size > CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

/**
 * Dedicated cache for the EXPENSIVE stats endpoints (participation /
 * contributors / commit_activity). These have a longer TTL than the general
 * cache because GitHub recomputes them lazily and they are opt-in ("show the
 * receipts") rather than on the headline path. This activates the
 * STATS_CACHE_TTL_MS constant (previously dead).
 */
const statsCache = new Map();

const getCachedStats = (url) => {
  const cached = statsCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > STATS_CACHE_TTL_MS) {
    statsCache.delete(url);
    return null;
  }
  console.log(`[StatsCache] HIT: ${url.substring(0, 60)}...`);
  return cached.data;
};

const setCachedStats = (url, data) => {
  statsCache.set(url, { data, timestamp: Date.now() });
  if (statsCache.size > CACHE_MAX_ENTRIES) {
    const firstKey = statsCache.keys().next().value;
    statsCache.delete(firstKey);
  }
};

/**
 * Clears the internal API response caches (general + stats)
 * @returns {void}
 */
export const clearCache = () => {
  cache.clear();
  statsCache.clear();
  console.log('[Cache] Cleared');
};

const fetchWithRetry = async (url, retries = RETRY_CONFIG.MAX_RETRIES, backoff = RETRY_CONFIG.INITIAL_BACKOFF_MS, useCache = true) => {
  if (useCache) {
    const cached = getCachedResponse(url);
    if (cached) return cached;
  }

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
    
    if (response.status === 404) {
      throw new Error('Resource not found');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = {
      data: await response.json(),
      rateLimit: {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0')
      }
    };

    if (useCache) {
      setCachedResponse(url, result);
    }

    return result;
  } catch (error) {
    const isHttpError = error.message.startsWith('HTTP ') ||
      error.message.includes('Rate limit') ||
      error.message.includes('Resource not found') ||
      error.message.includes('Forbidden');
    
    if (retries > 0 && !isHttpError) {
      const jitter = Math.random() * 100;
      await sleep(backoff + jitter);
      return fetchWithRetry(url, retries - 1, backoff * RETRY_CONFIG.BACKOFF_MULTIPLIER, useCache);
    }
    throw error;
  }
};

const STATS_202_RETRY_DELAY_MS = 2000;

/**
 * Retry/cache envelope for the expensive stats endpoints. Routes the
 * participation / contributor / commit-activity calls through the same
 * backoff + jitter machinery as {@link fetchWithRetry}, plus:
 *   - a dedicated stats cache (STATS_CACHE_TTL_MS),
 *   - explicit GitHub `202 Accepted` handling (stats still computing): retry
 *     once, then surface `{ data: null, processing: true }` so callers can
 *     render an honest "computing" state rather than a fabricated number.
 *
 * The envelope NEVER invents a value: 202 → processing flag, HTTP errors throw,
 * and an empty body is passed through untouched for the normalizer to label
 * "Unknown". This is the data-layer half of HC-6 (honest failure modes).
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {boolean} [opts.retryOn202=true]
 * @returns {Promise<{data: any, processing: boolean, rateLimit: object|null}>}
 */
const fetchStatsWithRetry = async (url, { retryOn202 = true, retries = RETRY_CONFIG.MAX_RETRIES, backoff = RETRY_CONFIG.INITIAL_BACKOFF_MS } = {}) => {
  const cached = getCachedStats(url);
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = {
      data: await response.json(),
      processing: false,
      rateLimit: {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0')
      }
    };

    setCachedStats(url, result);
    return result;
  } catch (error) {
    const isHttpError = error.message.startsWith('HTTP ') ||
      error.message.includes('Rate limit') ||
      error.message.includes('Resource not found') ||
      error.message.includes('Forbidden');

    if (retries > 0 && !isHttpError) {
      const jitter = Math.random() * 100;
      await sleep(backoff + jitter);
      return fetchStatsWithRetry(url, { retryOn202, retries: retries - 1, backoff: backoff * RETRY_CONFIG.BACKOFF_MULTIPLIER });
    }
    throw error;
  }
};

/**
 * Searches GitHub repositories with optional filters
 * @param {string} query - Search query string
 * @param {Object} [options={}] - Search options
 * @param {string} [options.language=''] - Filter by programming language
 * @param {number} [options.minStars=0] - Minimum star count filter
 * @param {string} [options.sort='stars'] - Sort field (stars, forks, updated)
 * @param {string} [options.order='desc'] - Sort order (asc, desc)
 * @param {number} [options.page=1] - Page number for pagination
 * @param {number} [options.perPage=30] - Results per page (max 100)
 * @returns {Promise<{data: {items: Array, total_count: number}, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails after retries or rate limit exceeded
 */
export const searchRepositories = async (query, options = {}) => {
  const {
    language = '',
    minStars = 0,
    sort = 'stars',
    order = 'desc',
    page = 1,
    perPage = 30
  } = options;
  
  let q = query;
  if (language) q += `+language:${language}`;
  if (minStars > 0) q += `+stars:>=${minStars}`;
  
  const url = `${API_BASE}/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=${order}&page=${page}&per_page=${perPage}`;
  
  return fetchWithRetry(url);
};

/**
 * Fetches trending repositories created within the last 7 days
 * @param {Object} [options={}] - Filter options
 * @param {string} [options.language=''] - Filter by programming language
 * @param {string} [options.category='all'] - Filter by category (matches TRENDING_CATEGORIES keys)
 * @param {number} [options.page=1] - Page number for pagination
 * @param {number} [options.perPage=30] - Results per page (max 100)
 * @returns {Promise<{data: {items: Array, total_count: number}, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails after retries
 */
export const getTrendingRepositories = async (options = {}) => {
  const {
    language = '',
    category = 'all',
    page = 1,
    perPage = 30
  } = options;
  
  const date = new Date();
  date.setDate(date.getDate() - TRENDING_DAYS_BACK);
  const dateStr = date.toISOString().split('T')[0];
  
  let q = `created:>${dateStr}`;
  
  if (language) {
    q += ` language:${language}`;
  }
  
  if (category && category !== 'all') {
    const categoryConfig = TRENDING_CATEGORIES[category];
    if (categoryConfig && categoryConfig.topics.length > 0) {
      const topicFilters = categoryConfig.topics.map(t => `topic:${t}`);
      q += ` (${topicFilters.join(' OR ')})`;
    }
  }
  
  const url = `${API_BASE}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&page=${page}&per_page=${perPage}`;
  
  return fetchWithRetry(url);
};

/**
 * Fetches detailed information for a single repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @returns {Promise<{data: Object, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When repository not found or API request fails
 */
export const getRepository = async (owner, repo) => {
  const url = `${API_BASE}/repos/${owner}/${repo}`;
  return fetchWithRetry(url);
};

/**
 * Fetches the recent commits list for a repository. This is the SECOND (and
 * final) cheap call on the headline path — together with repo metadata it is
 * everything the headline verdict needs (HC-5 / VC-DATA-01). It is deliberately
 * a single page; the expensive per-author `stats/contributors` endpoint stays
 * behind "show the receipts".
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {number} [perPage=30] - Number of commits to fetch (max 100)
 * @returns {Promise<{data: Array, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails
 */
export const getRepositoryCommits = async (owner, repo, perPage = 30) => {
  const url = `${API_BASE}/repos/${owner}/${repo}/commits?per_page=${perPage}`;
  return fetchWithRetry(url);
};

const decodeBase64Utf8 = (base64) => {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};

/**
 * Fetches and decodes the README file for a repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @returns {Promise<{data: {content: string, decodedContent: string, ...} | null, rateLimit: Object | null}>}
 */
export const getRepositoryReadme = async (owner, repo) => {
  try {
    const url = `${API_BASE}/repos/${owner}/${repo}/readme`;
    const response = await fetchWithRetry(url);
    
    if (response.data.content) {
      const decoded = decodeBase64Utf8(response.data.content);
      return { ...response, data: { ...response.data, decodedContent: decoded } };
    }
    
    return response;
  } catch (error) {
    if (error.message.includes('not found')) {
      return { data: null, rateLimit: null };
    }
    throw error;
  }
};

/**
 * Fetches programming language breakdown for a repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @returns {Promise<{data: Object<string, number>, rateLimit: {remaining: number, limit: number, reset: number}}>} Language names as keys, byte counts as values
 * @throws {Error} When API request fails
 */
export const getRepositoryLanguages = async (owner, repo) => {
  const url = `${API_BASE}/repos/${owner}/${repo}/languages`;
  return fetchWithRetry(url);
};

/**
 * Fetches recent events/activity for a repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {number} [perPage=10] - Number of events to fetch (max 100)
 * @returns {Promise<{data: Array, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails
 */
export const getRepositoryEvents = async (owner, repo, perPage = 10) => {
  const url = `${API_BASE}/repos/${owner}/${repo}/events?per_page=${perPage}`;
  return fetchWithRetry(url);
};

/**
 * Checks current GitHub API rate limit status
 * @returns {Promise<{data: {resources: Object, rate: Object}, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails
 */
export const checkRateLimit = async () => {
  const url = `${API_BASE}/rate_limit`;
  return fetchWithRetry(url);
};

/**
 * Fetches weekly commit activity for the past year (52 weeks)
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {boolean} [retryOnce=true] - Whether to retry once if GitHub returns 202 (processing)
 * @returns {Promise<{data: Array<{week: number, days: number[], total: number}> | null, processing: boolean, rateLimit: Object | null}>}
 * @throws {Error} When API request fails
 */
export const getCommitActivity = async (owner, repo, retryOnce = true) => {
  const url = `${API_BASE}/repos/${owner}/${repo}/stats/commit_activity`;
  return fetchStatsWithRetry(url, { retryOn202: retryOnce });
};

/**
 * Fetches weekly participation stats (commit counts) for the last year
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {boolean} [retryOnce=true] - Whether to retry once if GitHub returns 202 (processing)
 * @returns {Promise<{data: {all: number[], owner: number[]} | null, processing: boolean, rateLimit: Object | null}>}
 * @throws {Error} When API request fails
 */
export const getParticipationStats = async (owner, repo, retryOnce = true) => {
  const url = `${API_BASE}/repos/${owner}/${repo}/stats/participation`;
  return fetchStatsWithRetry(url, { retryOn202: retryOnce });
};

/**
 * Fetches contributor commit activity for a repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {boolean} [retryOnce=true] - Whether to retry once if GitHub returns 202 (processing)
 * @returns {Promise<{data: Array<{author: Object, total: number, weeks: Array}> | null, processing: boolean, rateLimit: Object | null}>}
 * @throws {Error} When API request fails
 */
export const getContributorStats = async (owner, repo, retryOnce = true) => {
  const url = `${API_BASE}/repos/${owner}/${repo}/stats/contributors`;
  return fetchStatsWithRetry(url, { retryOn202: retryOnce });
};

/**
 * Fetches issues with created/closed timestamps for a repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {Object} [params={}] - Optional query parameters to override defaults
 * @param {string} [params.state='all'] - Issue state filter (open, closed, all)
 * @param {string} [params.sort='created'] - Sort field (created, updated, comments)
 * @param {string} [params.direction='desc'] - Sort direction (asc, desc)
 * @param {number} [params.per_page=100] - Results per page (max 100)
 * @returns {Promise<{data: Array, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails
 */
export const getIssueTimeline = async (owner, repo, params = {}) => {
  const query = new URLSearchParams({
    state: 'all',
    per_page: '100',
    sort: 'created',
    direction: 'desc',
    ...params
  });
  const url = `${API_BASE}/repos/${owner}/${repo}/issues?${query}`;
  return fetchWithRetry(url);
};

/**
 * Fetches pull requests with merge timestamps for a repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {Object} [params={}] - Optional query parameters to override defaults
 * @param {string} [params.state='all'] - PR state filter (open, closed, all)
 * @param {string} [params.sort='created'] - Sort field (created, updated, popularity, long-running)
 * @param {string} [params.direction='desc'] - Sort direction (asc, desc)
 * @param {number} [params.per_page=100] - Results per page (max 100)
 * @returns {Promise<{data: Array, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails
 */
export const getPullRequestTimeline = async (owner, repo, params = {}) => {
  const query = new URLSearchParams({
    state: 'all',
    per_page: '100',
    sort: 'created',
    direction: 'desc',
    ...params
  });
  const url = `${API_BASE}/repos/${owner}/${repo}/pulls?${query}`;
  return fetchWithRetry(url);
};

/**
 * Fetches release history for a repository
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {number} [perPage=30] - Number of releases to fetch (max 100)
 * @returns {Promise<{data: Array, rateLimit: {remaining: number, limit: number, reset: number}}>}
 * @throws {Error} When API request fails
 */
export const getReleaseHistory = async (owner, repo, perPage = 30) => {
  const url = `${API_BASE}/repos/${owner}/${repo}/releases?per_page=${perPage}`;
  return fetchWithRetry(url);
};

/**
 * Fetches all pulse-related data for a repository in parallel
 * Uses Promise.allSettled for error resilience - failed endpoints return null
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @returns {Promise<{participation: Object|null, contributors: Array|null, issues: Array|null, pullRequests: Array|null, releases: Array|null, commits: Array|null}>}
 */
export const fetchPulseData = async (owner, repo) => {
  const results = await Promise.allSettled([
    getParticipationStats(owner, repo),
    getContributorStats(owner, repo),
    getIssueTimeline(owner, repo),
    getPullRequestTimeline(owner, repo),
    getReleaseHistory(owner, repo),
    getCommitActivity(owner, repo)
  ]);

  const extractData = (result) => {
    if (result.status === 'fulfilled' && result.value) {
      return result.value.data;
    }
    return null;
  };

  return {
    participation: extractData(results[0]),
    contributors: extractData(results[1]),
    issues: extractData(results[2]),
    pullRequests: extractData(results[3]),
    releases: extractData(results[4]),
    commits: extractData(results[5])
  };
};

// ===========================================================================
// CONTENTS API (F1.2 / VC-CONTENTS-01)
// ---------------------------------------------------------------------------
// Fetch package.json, README, the file tree, and AI-rules files
// (CLAUDE.md / AGENTS.md / .cursor) for a repo. These feed the stack-fit,
// AI-readiness, and context-block detectors (sibling features). No DOM here.
// ===========================================================================

/**
 * Fetches and parses `package.json` from a repository root.
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @returns {Promise<{data: {decodedContent: string, parsed: object|null, ...}|null, rateLimit: object|null}>}
 *   `data` is `null` when the file is absent (404). `parsed` is `null` when the
 *   file exists but is not valid JSON — never a fabricated object.
 */
export const getRepositoryPackageJson = async (owner, repo) => {
  try {
    const url = `${API_BASE}/repos/${owner}/${repo}/contents/package.json`;
    const response = await fetchWithRetry(url);

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
    if (error.message.includes('not found')) {
      return { data: null, rateLimit: null };
    }
    throw error;
  }
};

/**
 * Fetches the recursive git tree (file list) for a repository.
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {string} [ref='HEAD'] - Branch, tag, or commit SHA to read the tree at
 * @returns {Promise<{data: {tree: Array<{path: string, type: string}>, truncated: boolean}|null, rateLimit: object|null}>}
 */
export const getFileTree = async (owner, repo, ref = 'HEAD') => {
  try {
    const url = `${API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
    return await fetchWithRetry(url);
  } catch (error) {
    if (error.message.includes('not found')) {
      return { data: null, rateLimit: null };
    }
    throw error;
  }
};

/**
 * Pure: detect AI-rules files from a git-tree entry list. No DOM, no network.
 * Recognizes root-level `CLAUDE.md` / `AGENTS.md` (case-insensitive) and a
 * `.cursor` directory or `.cursorrules` file anywhere in the tree.
 * @param {Array<{path: string, type?: string}>} treeEntries
 * @returns {{hasClaudeMd: boolean, hasAgentsMd: boolean, hasCursor: boolean, files: string[]}}
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
    (p) => p === '.cursorrules' || p.toLowerCase() === '.cursorrules' || p.startsWith('.cursor/') || p === '.cursor'
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

/**
 * Fetches AI-rules files presence for a repository by reading its file tree.
 * Uses a single git-tree call (kept off the headline path).
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {string} [ref='HEAD']
 * @returns {Promise<{hasClaudeMd: boolean, hasAgentsMd: boolean, hasCursor: boolean, files: string[]}>}
 */
export const getAiRulesFiles = async (owner, repo, ref = 'HEAD') => {
  const response = await getFileTree(owner, repo, ref);
  const tree = response && response.data && Array.isArray(response.data.tree) ? response.data.tree : [];
  return detectAiRulesFiles(tree);
};

// ===========================================================================
// TIERED CHEAP-CALL DATA LAYER (F1.2 / VC-DATA-01, VC-DATA-03, VC-DATA-05)
// ---------------------------------------------------------------------------
// Tier 1 (headline): repo metadata + ONE commits-list call → normalized signals
//   that feed the pure verdict() engine. At most TWO GitHub calls (HC-5).
// Tier 2 (receipts): expensive participation/contributor/commit-activity stats,
//   fired ONLY on "show the receipts", degrading honestly on 202/empty (HC-6).
// These are pure normalizers + thin fetch orchestrators. No DOM.
// ===========================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

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
      const d = parseDateMs(c && c.commit && c.commit.author && c.commit.author.date) ||
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
 * Pure: derive the license signal from repo metadata. `NOASSERTION` / `Other`
 * map to Unknown (never positive); a missing license object maps to "no license
 * file → all rights reserved" (cautionary), never positive.
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
 * Pure: derive the bus-factor signal from the commits list (cheap approximation
 * of authorship concentration). Returns `undefined` when no commits are
 * readable — never `Unknown 0%`.
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
 * on commit count alone (the richer false-positive guard is a sibling feature).
 * Multiple commits clear the basic slop signal. No commits → `undefined`
 * (Unknown), never a fabricated "clean".
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
 * @param {object} repoData - GitHub repo metadata object
 * @param {Array} commits - Commits-list payload
 * @param {number} [now=Date.now()] - Reference time (ms) for recency
 * @returns {object} Signal object suitable for the verdict() engine
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
 * TIER 1 — Fetch the cheap headline data for a repo: EXACTLY two GitHub calls
 * (repo metadata + one commits-list call), normalized into the signal object
 * the pure `verdict()` engine consumes. Performs NO stats calls (HC-5,
 * VC-DATA-01, VC-DATA-05).
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @param {object} [opts]
 * @param {number} [opts.now=Date.now()]
 * @param {number} [opts.commitsPerPage=30]
 * @returns {Promise<{signals: object, repo: object, commits: Array, rateLimit: object|null}>}
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
 * Pure: collapse one stats-endpoint envelope into an explicit, honest status.
 * `processing` → 'computing'; null / empty `{}` / empty `[]` → 'unknown';
 * otherwise 'ok' with the real data. NEVER returns a fabricated number and
 * NEVER a default "green" / positive value (HC-6 / VC-DATA-03).
 * @param {{data: any, processing?: boolean}|null} envelope
 * @returns {{status: 'ok'|'computing'|'unknown', data: any|null}}
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

/**
 * TIER 2 — Fetch the EXPENSIVE, opt-in stats for "show the receipts". Fires the
 * participation / contributor / commit-activity endpoints (and ONLY those) and
 * normalizes each to an explicit ok/computing/unknown status — never a
 * fabricated number, never a default green (HC-6 / VC-DATA-03 / VC-DATA-05).
 * Must NOT be called on initial headline render.
 * @param {string} owner - Repository owner's username
 * @param {string} repo - Repository name
 * @returns {Promise<{participation: object, contributors: object, commitActivity: object}>}
 */
export const fetchReceiptsData = async (owner, repo) => {
  const results = await Promise.allSettled([
    getParticipationStats(owner, repo),
    getContributorStats(owner, repo),
    getCommitActivity(owner, repo),
  ]);

  const settledEnvelope = (result) =>
    result.status === 'fulfilled' ? result.value : null;

  return {
    participation: normalizeReceiptStat(settledEnvelope(results[0])),
    contributors: normalizeReceiptStat(settledEnvelope(results[1])),
    commitActivity: normalizeReceiptStat(settledEnvelope(results[2])),
  };
};
