import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchRepositories,
  getTrendingRepositories,
  getRepository,
  getRepositoryReadme,
  getRepositoryLanguages,
  getRepositoryEvents,
  checkRateLimit,
  getCommitActivity,
  getParticipationStats,
  getContributorStats,
  getIssueTimeline,
  getPullRequestTimeline,
  getReleaseHistory,
  fetchPulseData,
  clearCache,
  getRepositoryCommits,
  getRepositoryPackageJson,
  getFileTree,
  detectAiRulesFiles,
  getAiRulesFiles,
  normalizeHeadlineSignals,
  fetchHeadlineData,
  normalizeReceiptStat,
  fetchReceiptsData
} from '../api.js';
import { verdict, STATE_VALUES, STATES } from '../engine/verdict.js';

const mockFetchResponse = (data, options = {}) => {
  const response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue(data),
    headers: new Map([
      ['x-ratelimit-remaining', options.remaining ?? '59'],
      ['x-ratelimit-limit', options.limit ?? '60'],
      ['x-ratelimit-reset', options.reset ?? String(Math.floor(Date.now() / 1000) + 3600)]
    ])
  };
  response.headers.get = (key) => response.headers.get(key);
  return response;
};

describe('API', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchRepositories', () => {
    it('should search repositories with query', async () => {
      const mockData = { items: [{ id: 1, name: 'test' }], total_count: 1 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: (key) => {
            const headers = {
              'x-ratelimit-remaining': '59',
              'x-ratelimit-limit': '60',
              'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
            };
            return headers[key];
          }
        }
      });

      const result = await searchRepositories('react');
      expect(result.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search/repositories?q=react'),
        expect.any(Object)
      );
    });

    it('should include language filter', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await searchRepositories('react', { language: 'JavaScript' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('language%3AJavaScript'),
        expect.any(Object)
      );
    });

    it('should include minStars filter', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await searchRepositories('react', { minStars: 100 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('stars%3A%3E%3D100'),
        expect.any(Object)
      );
    });

    it('should correctly encode C++ language (single encoding)', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await searchRepositories('game', { language: 'C++' });
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('language%3AC%2B%2B');
      expect(calledUrl).not.toContain('language%3AC%252B%252B');
    });

    it('should correctly encode C# language (single encoding)', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await searchRepositories('dotnet', { language: 'C#' });
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('language%3AC%23');
      expect(calledUrl).not.toContain('language%3AC%2523');
    });
  });

  describe('getTrendingRepositories', () => {
    it('should fetch trending repos from past week', async () => {
      const mockData = { items: [{ id: 1 }], total_count: 1 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getTrendingRepositories();
      expect(result.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('created%3A%3E'),
        expect.any(Object)
      );
    });

    it('should include language filter for trending', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await getTrendingRepositories({ language: 'Python' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('language%3APython'),
        expect.any(Object)
      );
    });

    it('should include category topics in query', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: { get: () => '59' }
      });

      await getTrendingRepositories({ category: 'cli' });
      const calledUrl = global.fetch.mock.calls[0][0];
      
      // Should include topic:cli OR topic:command-line etc
      expect(calledUrl).toMatch(/topic%3Acli/);
    });

    it('should combine category and language filters', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: { get: () => '59' }
      });

      await getTrendingRepositories({ category: 'cli', language: 'Rust' });
      const calledUrl = global.fetch.mock.calls[0][0];
      
      expect(calledUrl).toMatch(/language%3ARust/);
      expect(calledUrl).toMatch(/topic%3Acli/);
    });

    it('should not add category filter for "all" category', async () => {
      const mockData = { items: [], total_count: 0 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: { get: () => '59' }
      });

      await getTrendingRepositories({ category: 'all' });
      const calledUrl = global.fetch.mock.calls[0][0];
      
      expect(calledUrl).not.toMatch(/topic%3A/);
    });
  });

  describe('getRepository', () => {
    it('should fetch repository details', async () => {
      const mockData = { id: 1, full_name: 'owner/repo' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getRepository('owner', 'repo');
      expect(result.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('repos/owner/repo'),
        expect.any(Object)
      );
    });
  });

  describe('getRepositoryReadme', () => {
    it('should fetch and decode readme', async () => {
      const content = btoa('# Hello World');
      const mockData = { content, encoding: 'base64' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getRepositoryReadme('owner', 'repo');
      expect(result.data.decodedContent).toBe('# Hello World');
    });

    it('should handle missing readme', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Resource not found'));

      const result = await getRepositoryReadme('owner', 'repo');
      expect(result.data).toBeNull();
    });

    it('should correctly decode UTF-8 characters in README', async () => {
      const originalText = '# 日本語 README 🎉';
      const encoder = new TextEncoder();
      const bytes = encoder.encode(originalText);
      const binaryString = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      const content = btoa(binaryString);
      
      const mockData = { content, encoding: 'base64' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getRepositoryReadme('owner', 'repo');
      expect(result.data.decodedContent).toBe(originalText);
    });
  });

  describe('getRepositoryLanguages', () => {
    it('should fetch repository languages', async () => {
      const mockData = { JavaScript: 50000, TypeScript: 30000 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getRepositoryLanguages('owner', 'repo');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getRepositoryEvents', () => {
    it('should fetch repository events', async () => {
      const mockData = [{ id: '1', type: 'PushEvent' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getRepositoryEvents('owner', 'repo');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getCommitActivity', () => {
    it('should fetch commit activity', async () => {
      const mockData = [{ week: 1234567890, days: [1, 2, 3, 4, 5, 6, 7], total: 28 }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getCommitActivity('owner', 'repo');
      expect(result.data).toEqual(mockData);
    });

    it('should retry once on 202 status and return processing flag on second 202', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: () => Promise.resolve(null),
          headers: {
            get: () => '59'
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: () => Promise.resolve(null),
          headers: {
            get: () => '59'
          }
        });

      const result = await getCommitActivity('owner', 'repo');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: null, processing: true, rateLimit: null });
    });
  });

  describe('getParticipationStats', () => {
    it('should fetch participation stats', async () => {
      const mockData = { all: [1, 2, 3, 4, 5], owner: [0, 1, 1, 2, 1] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getParticipationStats('owner', 'repo');
      expect(result.data).toEqual(mockData);
      expect(result.processing).toBe(false);
    });

    it('should retry once on 202 status and return processing flag on second 202', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: () => Promise.resolve(null),
          headers: {
            get: () => '59'
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: () => Promise.resolve(null),
          headers: {
            get: () => '59'
          }
        });

      const result = await getParticipationStats('owner', 'repo');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: null, processing: true, rateLimit: null });
    });

    it('should throw error on HTTP failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null
        }
      });

      await expect(getParticipationStats('owner', 'repo')).rejects.toThrow('HTTP 500');
    });
  });

  describe('getContributorStats', () => {
    it('should fetch contributor stats', async () => {
      const mockData = [
        { author: { login: 'user1' }, total: 50, weeks: [] },
        { author: { login: 'user2' }, total: 30, weeks: [] }
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getContributorStats('owner', 'repo');
      expect(result.data).toEqual(mockData);
      expect(result.processing).toBe(false);
    });

    it('should retry once on 202 status and return processing flag on second 202', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: () => Promise.resolve(null),
          headers: {
            get: () => '59'
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: () => Promise.resolve(null),
          headers: {
            get: () => '59'
          }
        });

      const result = await getContributorStats('owner', 'repo');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: null, processing: true, rateLimit: null });
    });

    it('should throw error on HTTP failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null
        }
      });

      await expect(getContributorStats('owner', 'repo')).rejects.toThrow('HTTP 500');
    });
  });

  describe('getIssueTimeline', () => {
    it('should fetch issues with default params', async () => {
      const mockData = [
        { id: 1, title: 'Issue 1', state: 'open', created_at: '2024-01-01T00:00:00Z' },
        { id: 2, title: 'Issue 2', state: 'closed', created_at: '2024-01-02T00:00:00Z' }
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getIssueTimeline('owner', 'repo');
      expect(result.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('repos/owner/repo/issues'),
        expect.any(Object)
      );
      // Verify default params are in URL
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('state=all');
      expect(calledUrl).toContain('per_page=100');
      expect(calledUrl).toContain('sort=created');
      expect(calledUrl).toContain('direction=desc');
    });

    it('should allow params override', async () => {
      const mockData = [{ id: 1, title: 'Open Issue', state: 'open' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await getIssueTimeline('owner', 'repo', { state: 'open', per_page: '50' });
      const calledUrl = global.fetch.mock.calls[0][0];
      // Overridden params should be used
      expect(calledUrl).toContain('state=open');
      expect(calledUrl).toContain('per_page=50');
    });

    // F1.3 / VC-DATA-02 — GitHub's /issues endpoint returns PRs intermingled;
    // they carry a `pull_request` field and must be stripped at the data
    // boundary so issue counts/temperature are not inflated.
    it('should exclude pull requests from issue results (VC-DATA-02)', async () => {
      const mixed = [
        { id: 1, title: 'Real issue', state: 'open', created_at: '2024-01-01T00:00:00Z' },
        { id: 2, title: 'A PR masquerading as an issue', state: 'open', created_at: '2024-01-02T00:00:00Z', pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/2' } },
        { id: 3, title: 'Another real issue', state: 'closed', created_at: '2024-01-03T00:00:00Z' }
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mixed),
        headers: { get: () => '59' }
      });

      const result = await getIssueTimeline('owner', 'repo');

      expect(result.data).toHaveLength(2);
      expect(result.data.every((item) => !('pull_request' in item))).toBe(true);
      expect(result.data.map((i) => i.id)).toEqual([1, 3]);
    });
  });

  describe('getPullRequestTimeline', () => {
    it('should fetch pull requests with default params', async () => {
      const mockData = [
        { id: 1, title: 'PR 1', state: 'open', created_at: '2024-01-01T00:00:00Z' },
        { id: 2, title: 'PR 2', state: 'closed', merged_at: '2024-01-02T00:00:00Z' }
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getPullRequestTimeline('owner', 'repo');
      expect(result.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('repos/owner/repo/pulls'),
        expect.any(Object)
      );
      // Verify default params are in URL
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('state=all');
      expect(calledUrl).toContain('per_page=100');
      expect(calledUrl).toContain('sort=created');
      expect(calledUrl).toContain('direction=desc');
    });

    it('should allow params override', async () => {
      const mockData = [{ id: 1, title: 'Open PR', state: 'open' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await getPullRequestTimeline('owner', 'repo', { state: 'open', per_page: '50' });
      const calledUrl = global.fetch.mock.calls[0][0];
      // Overridden params should be used
      expect(calledUrl).toContain('state=open');
      expect(calledUrl).toContain('per_page=50');
    });
  });

  describe('getReleaseHistory', () => {
    it('should fetch release history', async () => {
      const mockData = [
        { id: 1, tag_name: 'v1.0.0', name: 'Release 1.0.0', published_at: '2024-01-01T00:00:00Z' },
        { id: 2, tag_name: 'v0.9.0', name: 'Release 0.9.0', published_at: '2023-12-01T00:00:00Z' }
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await getReleaseHistory('owner', 'repo');
      expect(result.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('repos/owner/repo/releases'),
        expect.any(Object)
      );
    });
  });

  describe('checkRateLimit', () => {
    it('should fetch rate limit info', async () => {
      const mockData = { resources: { core: { remaining: 59, limit: 60 } } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      const result = await checkRateLimit();
      expect(result.data).toEqual(mockData);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (key) => {
            if (key === 'x-ratelimit-remaining') return '0';
            if (key === 'x-ratelimit-reset') return String(Math.floor(Date.now() / 1000) + 3600);
            return null;
          }
        }
      });

      await expect(searchRepositories('test')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle 404 error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: () => null
        }
      });

      await expect(getRepository('owner', 'nonexistent')).rejects.toThrow('Resource not found');
    });

    it('should handle generic HTTP error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null
        }
      });

      await expect(searchRepositories('test')).rejects.toThrow('HTTP 500');
    });

    it('should handle 403 without rate limit', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: {
          get: (key) => {
            if (key === 'x-ratelimit-remaining') return '10';
            return null;
          }
        }
      });

      await expect(searchRepositories('test')).rejects.toThrow('Forbidden');
    });
  });

  describe('Caching', () => {
    it('should cache responses', async () => {
      const mockData = { items: [{ id: 1 }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await searchRepositories('react');
      await searchRepositories('react');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      const mockData = { items: [{ id: 1 }] };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        headers: {
          get: () => '59'
        }
      });

      await searchRepositories('react');
      clearCache();
      await searchRepositories('react');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchPulseData', () => {
    const mockSuccessResponse = (data) => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
      headers: {
        get: () => '59'
      }
    });

    const mockFailResponse = () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => null }
    });

    const mock202Response = () => ({
      ok: true,
      status: 202,
      json: () => Promise.resolve(null),
      headers: { get: () => '59' }
    });

    it('should fetch all pulse data successfully', async () => {
      const mockParticipation = { all: [1, 2, 3], owner: [0, 1, 1] };
      const mockContributors = [{ author: { login: 'user1' }, total: 50 }];
      const mockIssues = [{ id: 1, title: 'Issue 1', state: 'open' }];
      const mockPullRequests = [{ id: 1, title: 'PR 1', state: 'open' }];
      const mockReleases = [{ id: 1, tag_name: 'v1.0.0' }];
      const mockCommits = [{ week: 1234567890, days: [1, 2, 3, 4, 5, 6, 7], total: 28 }];

      // Mock based on URL to handle parallel execution
      global.fetch.mockImplementation((url) => {
        if (url.includes('stats/participation')) {
          return Promise.resolve(mockSuccessResponse(mockParticipation));
        }
        if (url.includes('stats/contributors')) {
          return Promise.resolve(mockSuccessResponse(mockContributors));
        }
        if (url.includes('/issues')) {
          return Promise.resolve(mockSuccessResponse(mockIssues));
        }
        if (url.includes('/pulls')) {
          return Promise.resolve(mockSuccessResponse(mockPullRequests));
        }
        if (url.includes('/releases')) {
          return Promise.resolve(mockSuccessResponse(mockReleases));
        }
        if (url.includes('stats/commit_activity')) {
          return Promise.resolve(mockSuccessResponse(mockCommits));
        }
        return Promise.resolve(mockSuccessResponse({}));
      });

      const result = await fetchPulseData('owner', 'repo');

      expect(result.participation).toEqual(mockParticipation);
      expect(result.contributors).toEqual(mockContributors);
      expect(result.issues).toEqual(mockIssues);
      expect(result.pullRequests).toEqual(mockPullRequests);
      expect(result.releases).toEqual(mockReleases);
      expect(result.commits).toEqual(mockCommits);
    });

    it('should exclude pull requests from issues in pulse data (VC-DATA-02)', async () => {
      const mixedIssues = [
        { id: 1, title: 'Real issue', state: 'open' },
        { id: 2, title: 'PR in disguise', state: 'open', pull_request: { url: 'x' } }
      ];
      global.fetch.mockImplementation((url) => {
        if (url.includes('/issues')) {
          return Promise.resolve(mockSuccessResponse(mixedIssues));
        }
        return Promise.resolve(mockSuccessResponse([]));
      });

      const result = await fetchPulseData('owner', 'repo');

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].id).toBe(1);
      expect(result.issues.every((i) => !('pull_request' in i))).toBe(true);
    });

    it('should return null for failed endpoints while returning data for successful ones', async () => {
      const mockParticipation = { all: [1, 2, 3], owner: [0, 1, 1] };
      const mockIssues = [{ id: 1, title: 'Issue 1', state: 'open' }];
      const mockReleases = [{ id: 1, tag_name: 'v1.0.0' }];

      // Mock based on URL - some succeed, some fail
      global.fetch.mockImplementation((url) => {
        if (url.includes('stats/participation')) {
          return Promise.resolve(mockSuccessResponse(mockParticipation));
        }
        if (url.includes('stats/contributors')) {
          return Promise.resolve(mockFailResponse());
        }
        if (url.includes('/issues')) {
          return Promise.resolve(mockSuccessResponse(mockIssues));
        }
        if (url.includes('/pulls')) {
          return Promise.resolve(mockFailResponse());
        }
        if (url.includes('/releases')) {
          return Promise.resolve(mockSuccessResponse(mockReleases));
        }
        if (url.includes('stats/commit_activity')) {
          return Promise.resolve(mockFailResponse());
        }
        return Promise.resolve(mockSuccessResponse({}));
      });

      const result = await fetchPulseData('owner', 'repo');

      expect(result.participation).toEqual(mockParticipation);
      expect(result.contributors).toBeNull();
      expect(result.issues).toEqual(mockIssues);
      expect(result.pullRequests).toBeNull();
      expect(result.releases).toEqual(mockReleases);
      expect(result.commits).toBeNull();
    });

    it('should return all null when all endpoints fail', async () => {
      // All endpoints fail
      global.fetch.mockImplementation(() => {
        return Promise.resolve(mockFailResponse());
      });

      const result = await fetchPulseData('owner', 'repo');

      expect(result.participation).toBeNull();
      expect(result.contributors).toBeNull();
      expect(result.issues).toBeNull();
      expect(result.pullRequests).toBeNull();
      expect(result.releases).toBeNull();
      expect(result.commits).toBeNull();
    });

    it('should handle 202 processing status for stats endpoints', async () => {
      const mockIssues = [{ id: 1, title: 'Issue 1' }];
      const mockPullRequests = [{ id: 1, title: 'PR 1' }];
      const mockReleases = [{ id: 1, tag_name: 'v1.0.0' }];

      // Track call counts for stats endpoints to return 202 twice
      const statsCalls = {
        participation: 0,
        contributors: 0,
        commit_activity: 0
      };

      global.fetch.mockImplementation((url) => {
        if (url.includes('stats/participation')) {
          statsCalls.participation++;
          return Promise.resolve(mock202Response());
        }
        if (url.includes('stats/contributors')) {
          statsCalls.contributors++;
          return Promise.resolve(mock202Response());
        }
        if (url.includes('/issues')) {
          return Promise.resolve(mockSuccessResponse(mockIssues));
        }
        if (url.includes('/pulls')) {
          return Promise.resolve(mockSuccessResponse(mockPullRequests));
        }
        if (url.includes('/releases')) {
          return Promise.resolve(mockSuccessResponse(mockReleases));
        }
        if (url.includes('stats/commit_activity')) {
          statsCalls.commit_activity++;
          return Promise.resolve(mock202Response());
        }
        return Promise.resolve(mockSuccessResponse({}));
      });

      const result = await fetchPulseData('owner', 'repo');

      // Stats endpoints that got 202 twice should return null (from processing: true)
      expect(result.participation).toBeNull();
      expect(result.contributors).toBeNull();
      // Non-stats endpoints should succeed
      expect(result.issues).toEqual(mockIssues);
      expect(result.pullRequests).toEqual(mockPullRequests);
      expect(result.releases).toEqual(mockReleases);
      expect(result.commits).toBeNull();
    });

    it('should handle mixed success and rejection errors gracefully', async () => {
      const mockIssues = [{ id: 1, title: 'Issue 1' }];
      const mockReleases = [{ id: 1, tag_name: 'v1.0.0' }];

      // Mix of HTTP errors and network errors
      global.fetch.mockImplementation((url) => {
        if (url.includes('stats/participation')) {
          return Promise.resolve(mockFailResponse());
        }
        if (url.includes('stats/contributors')) {
          return Promise.resolve(mockFailResponse());
        }
        if (url.includes('/issues')) {
          return Promise.resolve(mockSuccessResponse(mockIssues));
        }
        if (url.includes('/pulls')) {
          return Promise.resolve(mockFailResponse());
        }
        if (url.includes('/releases')) {
          return Promise.resolve(mockSuccessResponse(mockReleases));
        }
        if (url.includes('stats/commit_activity')) {
          return Promise.resolve(mockFailResponse());
        }
        return Promise.resolve(mockSuccessResponse({}));
      });

      const result = await fetchPulseData('owner', 'repo');

      expect(result.participation).toBeNull();
      expect(result.contributors).toBeNull();
      expect(result.issues).toEqual(mockIssues);
      expect(result.pullRequests).toBeNull();
      expect(result.releases).toEqual(mockReleases);
      expect(result.commits).toBeNull();
    });
  });
});

// ===========================================================================
// F1.2 — Contents API + tiered cheap-call data layer
// ===========================================================================

const ok = (data, headerVal = '59') => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
  headers: { get: () => headerVal }
});

const status202 = () => ({
  ok: true,
  status: 202,
  json: () => Promise.resolve(null),
  headers: { get: () => '59' }
});

const b64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  const bin = Array.from(bytes).map((x) => String.fromCharCode(x)).join('');
  return btoa(bin);
};

const urlsCalled = () => global.fetch.mock.calls.map((c) => String(c[0]));
const STATS_PATHS = ['stats/participation', 'stats/contributors', 'stats/commit_activity'];
const anyStatsCall = () => urlsCalled().some((u) => STATS_PATHS.some((p) => u.includes(p)));

describe('F1.2 Contents API (VC-CONTENTS-01)', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('fetches and parses package.json (mocked contents response)', async () => {
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

  it('fetches the README via the existing contents-backed reader (mocked)', async () => {
    global.fetch.mockResolvedValueOnce(ok({ content: b64('# Title\nbody'), encoding: 'base64' }));
    const res = await getRepositoryReadme('owner', 'repo');
    expect(res.data.decodedContent).toBe('# Title\nbody');
  });

  it('fetches the recursive file tree (mocked git/trees response)', async () => {
    const tree = { sha: 'abc', truncated: false, tree: [
      { path: 'src/index.js', type: 'blob' },
      { path: 'package.json', type: 'blob' }
    ] };
    global.fetch.mockResolvedValueOnce(ok(tree));
    const res = await getFileTree('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/repos/owner/repo/git/trees/HEAD?recursive=1'),
      expect.any(Object)
    );
    expect(res.data.tree).toHaveLength(2);
  });

  it('detects AI-rules files (CLAUDE.md / AGENTS.md / .cursor) from a mocked tree', async () => {
    const tree = { truncated: false, tree: [
      { path: 'CLAUDE.md', type: 'blob' },
      { path: 'AGENTS.md', type: 'blob' },
      { path: '.cursor/rules.md', type: 'blob' },
      { path: 'src/app.ts', type: 'blob' }
    ] };
    global.fetch.mockResolvedValueOnce(ok(tree));
    const rules = await getAiRulesFiles('owner', 'repo');
    expect(rules.hasClaudeMd).toBe(true);
    expect(rules.hasAgentsMd).toBe(true);
    expect(rules.hasCursor).toBe(true);
    expect(rules.files).toEqual(expect.arrayContaining(['CLAUDE.md', 'AGENTS.md', '.cursor/rules.md']));
  });

  it('detectAiRulesFiles is pure and reports absence honestly', () => {
    const out = detectAiRulesFiles([{ path: 'src/index.js' }, { path: 'README.md' }]);
    expect(out).toEqual({ hasClaudeMd: false, hasAgentsMd: false, hasCursor: false, files: [] });
    // tolerant of junk input
    expect(detectAiRulesFiles(null).hasClaudeMd).toBe(false);
  });

  it('recognizes a root .cursorrules file', () => {
    expect(detectAiRulesFiles([{ path: '.cursorrules' }]).hasCursor).toBe(true);
  });
});

describe('F1.2 Headline data layer — <=2 cheap calls (VC-DATA-01 / HC-5)', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  const wireHeadline = (repoMeta, commits) => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/repos/owner/repo/commits')) return Promise.resolve(ok(commits));
      if (/\/repos\/owner\/repo(\?|$)/.test(u)) return Promise.resolve(ok(repoMeta));
      return Promise.resolve(ok({}));
    });
  };

  it('makes EXACTLY two GitHub calls (repo metadata + one commits list) and NO stats calls', async () => {
    wireHeadline({ name: 'repo', license: { spdx_id: 'MIT' }, pushed_at: '2026-06-20T00:00:00Z' }, [
      { commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } },
      { commit: { author: { date: '2026-06-24T00:00:00Z' } }, author: { login: 'b' } }
    ]);

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
        { commit: { author: { date: '2026-06-23T00:00:00Z' } }, author: { login: 'c' } }
      ]
    );

    const { signals } = await fetchHeadlineData('owner', 'repo', { now });
    const v = verdict(signals);

    expect(STATE_VALUES).toContain(v.state);
    expect(v.state).toBe(STATES.CLONEABLE); // healthy MIT repo, recent, distributed authorship
    expect(v.disclaimer).toContain('not a security audit');
    expect(v.disclaimer).toContain('2026-06-26');
  });

  it('normalizeHeadlineSignals is pure (no clock read; deterministic for fixed now)', () => {
    const repoMeta = { name: 'r', license: { spdx_id: 'MIT' }, pushed_at: '2026-06-25T00:00:00Z' };
    const commits = [{ commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } }];
    const a = normalizeHeadlineSignals(repoMeta, commits, 1000000000000);
    const b = normalizeHeadlineSignals(repoMeta, commits, 1000000000000);
    expect(a).toEqual(b);
  });
});

describe('F1.2 Expensive stats are opt-in (VC-DATA-05)', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

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

    // BEFORE opt-in: headline only
    await fetchHeadlineData('owner', 'repo', { now: Date.parse('2026-06-26T00:00:00Z') });
    expect(anyStatsCall()).toBe(false);

    // AFTER opt-in: receipts
    const receipts = await fetchReceiptsData('owner', 'repo');
    expect(anyStatsCall()).toBe(true);
    const after = urlsCalled();
    expect(after.some((u) => u.includes('stats/participation'))).toBe(true);
    expect(after.some((u) => u.includes('stats/contributors'))).toBe(true);
    expect(after.some((u) => u.includes('stats/commit_activity'))).toBe(true);
    expect(receipts.participation.status).toBe('ok');
  });
});

describe('F1.2 Honest failure modes — 202 / empty {} (VC-DATA-03 / HC-6)', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('normalizeReceiptStat: 202 -> computing, empty -> unknown, never a number/green', () => {
    expect(normalizeReceiptStat({ data: null, processing: true })).toEqual({ status: 'computing', data: null });
    expect(normalizeReceiptStat({ data: {} })).toEqual({ status: 'unknown', data: null });
    expect(normalizeReceiptStat({ data: [] })).toEqual({ status: 'unknown', data: null });
    expect(normalizeReceiptStat(null)).toEqual({ status: 'unknown', data: null });
    const okStat = normalizeReceiptStat({ data: { all: [1, 2] } });
    expect(okStat.status).toBe('ok');
    expect(okStat.data).toEqual({ all: [1, 2] });
  });

  it('headline still renders while stats return 202 (computing) — no fabricated number, no green', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/repos/owner/repo/commits')) return Promise.resolve(ok([{ commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } }]));
      if (/\/repos\/owner\/repo(\?|$)/.test(u)) return Promise.resolve(ok({ name: 'repo', license: { spdx_id: 'MIT' } }));
      // all stats endpoints stuck computing
      return Promise.resolve(status202());
    });

    const { signals } = await fetchHeadlineData('owner', 'repo', { now: Date.parse('2026-06-26T00:00:00Z') });
    const v = verdict(signals);
    // Headline paints a real, valid state independent of stats.
    expect(STATE_VALUES).toContain(v.state);

    const receipts = await fetchReceiptsData('owner', 'repo');
    expect(receipts.participation.status).toBe('computing');
    expect(receipts.contributors.status).toBe('computing');
    expect(receipts.commitActivity.status).toBe('computing');
    // No fabricated numeric value leaked through.
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
    expect(receipts.participation.status).toBe('unknown');
    expect(receipts.contributors.status).toBe('unknown');
    expect(receipts.commitActivity.status).toBe('unknown');
    for (const m of Object.values(receipts)) {
      expect(m.data).toBeNull();
      expect(m.status).not.toBe('ok');
    }
  });

  it('a missing license never yields the positive verdict (no false-green)', () => {
    const signals = normalizeHeadlineSignals(
      { name: 'r', license: null, pushed_at: '2026-06-25T00:00:00Z' },
      [
        { commit: { author: { date: '2026-06-25T00:00:00Z' } }, author: { login: 'a' } },
        { commit: { author: { date: '2026-06-24T00:00:00Z' } }, author: { login: 'b' } }
      ],
      Date.parse('2026-06-26T00:00:00Z')
    );
    const v = verdict(signals);
    expect(v.state).not.toBe(STATES.CLONEABLE);
  });
});

describe('F1.2 Stats endpoints routed through retry+cache envelope (STATS_CACHE_TTL_MS active)', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('caches a successful stats response (second call served from stats cache)', async () => {
    global.fetch.mockResolvedValue(ok({ all: [1, 2, 3], owner: [0, 1, 1] }));
    await getParticipationStats('owner', 'repo');
    await getParticipationStats('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('clearCache also clears the stats cache', async () => {
    global.fetch.mockResolvedValue(ok({ all: [1] }));
    await getContributorStats('owner', 'repo');
    clearCache();
    await getContributorStats('owner', 'repo');
    expect(global.fetch).toHaveBeenCalledTimes(2);
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
});
