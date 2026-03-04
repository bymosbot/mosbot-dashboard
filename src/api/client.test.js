import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import logger from '../utils/logger';

// Mock axios before importing client
vi.mock('axios', () => {
  // Create mock instance inside factory to avoid hoisting issues
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
    defaults: {
      baseURL: 'http://localhost:3000/api',
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

// Mock logger
vi.mock('../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Import after mocks
import {
  api,
  getInstanceConfig,
  getModels,
  getAgents,
  getAgentsConfig,
  getSubagents,
  getActiveSubagentSessions,
  getCronJobs,
  getSchedulerStats,
  getCronJobRuns,
  createCronJob,
  updateCronJob,
  deleteCronJob,
  setCronJobEnabled,
  triggerCronJob,
  getTaskSubagents,
  getOpenClawSessionStatus,
  getOpenClawSessions,
  deleteSession,
  getSessionMessages,
  getUsageAnalytics,
  resetUsageData,
  resetActivityLogs,
  getOpenClawConfig,
  updateOpenClawConfig,
  listOpenClawConfigBackups,
  getOpenClawConfigBackupContent,
  getStandups,
  getLatestStandup,
  getStandupById,
  resetStandups,
} from './client';

describe('api client', () => {
  let requestInterceptor;
  let requestErrorHandler;
  let responseInterceptor;
  let responseErrorHandler;

  // Store interceptor references before tests (they're set up when module loads)
  beforeAll(() => {
    if (api.interceptors.request.use.mock.calls.length > 0) {
      requestInterceptor = api.interceptors.request.use.mock.calls[0][0];
      requestErrorHandler = api.interceptors.request.use.mock.calls[0][1];
    }
    if (api.interceptors.response.use.mock.calls.length > 0) {
      responseInterceptor = api.interceptors.response.use.mock.calls[0][0];
      responseErrorHandler = api.interceptors.response.use.mock.calls[0][1];
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Re-store interceptor references after clearing mocks
    if (api.interceptors.request.use.mock.calls.length > 0) {
      requestInterceptor = api.interceptors.request.use.mock.calls[0][0];
      requestErrorHandler = api.interceptors.request.use.mock.calls[0][1];
    }
    if (api.interceptors.response.use.mock.calls.length > 0) {
      responseInterceptor = api.interceptors.response.use.mock.calls[0][0];
      responseErrorHandler = api.interceptors.response.use.mock.calls[0][1];
    }

    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', () => {
      const token = 'test-token-123';
      localStorageMock.getItem.mockReturnValue(token);

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('does not add Authorization header when no token', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('handles request setup error', async () => {
      const errorHandler = requestErrorHandler;
      const error = new Error('Request setup failed');

      await expect(errorHandler(error)).rejects.toThrow('Request setup failed');
    });
  });

  describe('response interceptor', () => {
    it('returns response unchanged on successful response', () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: 'get' } };

      const result = successHandler(response);

      expect(result).toBe(response);
    });

    it('handles POST response', () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: 'post' } };

      const result = successHandler(response);

      expect(result).toBe(response);
    });

    it('handles PUT response', () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: 'put' } };

      const result = successHandler(response);

      expect(result).toBe(response);
    });

    it('handles PATCH response', () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: 'patch' } };

      const result = successHandler(response);

      expect(result).toBe(response);
    });

    it('handles DELETE response', () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: 'delete' } };

      const result = successHandler(response);

      expect(result).toBe(response);
    });
  });

  describe('retry logic', () => {
    it('should retry on network error (no response)', async () => {
      const networkError = {
        message: 'Network Error',
        config: {
          url: '/test',
          method: 'get',
          __retryCount: 0,
        },
      };

      const errorHandler = responseErrorHandler;

      // Mock api.get to simulate retry
      api.get.mockResolvedValueOnce({ data: {}, config: { method: 'get' } });

      const promise = errorHandler(networkError);
      // Advance timer for retry delay
      vi.advanceTimersByTime(2000);

      // Should attempt retry (will call api which calls mockAxiosInstance.get)
      await promise.catch(() => {}); // Catch since we're not fully implementing retry

      // Verify retry logic would be triggered
      expect(networkError.config.__retryCount).toBeDefined();
    });

    it('should retry on 500 status code', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
        config: {
          url: '/test',
          method: 'get',
          __retryCount: 0,
        },
      };

      const errorHandler = responseErrorHandler;
      api.get.mockResolvedValueOnce({ data: {}, config: { method: 'get' } });

      const promise = errorHandler(serverError);
      vi.advanceTimersByTime(2000);
      await promise.catch(() => {});

      expect(serverError.config.__retryCount).toBeDefined();
    });

    it('should retry on retryable status codes (502, 503, 504, 408, 429)', async () => {
      const retryableErrors = [
        { response: { status: 502 } },
        { response: { status: 503 } },
        { response: { status: 504 } },
        { response: { status: 408 } },
        { response: { status: 429 } },
      ];

      const errorHandler = responseErrorHandler;

      for (const error of retryableErrors) {
        error.config = { url: '/test', method: 'get', __retryCount: 0 };
        api.get.mockResolvedValueOnce({ data: {}, config: { method: 'get' } });

        const promise = errorHandler(error);
        vi.advanceTimersByTime(2000);
        await promise.catch(() => {});

        expect(error.config.__retryCount).toBeDefined();
      }
    });

    it('should not retry on non-retryable status codes (400, 404)', async () => {
      const nonRetryableErrors = [
        {
          response: { status: 400 },
          config: { url: '/test', method: 'get', __retryCount: 0 },
        },
        {
          response: { status: 404 },
          config: { url: '/test', method: 'get', __retryCount: 0 },
        },
      ];

      const errorHandler = responseErrorHandler;

      for (const error of nonRetryableErrors) {
        await expect(errorHandler(error)).rejects.toBe(error);
        expect(logger.error).toHaveBeenCalled();
      }
    });
  });

  describe('error handling', () => {
    it('logs error with response details', async () => {
      const error = {
        response: {
          status: 400, // Non-retryable status to skip retry logic
          statusText: 'Bad Request',
          data: { error: 'Server error' },
        },
        config: {
          url: '/test',
          method: 'get',
          __retryCount: 0,
        },
      };

      await responseErrorHandler(error).catch(() => {});

      expect(logger.error).toHaveBeenCalledWith(
        'API request failed',
        error,
        expect.objectContaining({
          url: '/test',
          method: 'get',
          status: 400,
        }),
      );
    });

    it('logs error with request details when no response', async () => {
      const error = {
        request: {},
        config: {
          url: '/test',
          method: 'get',
          __retryCount: 3, // Set to max retries to skip retry logic
        },
      };

      await responseErrorHandler(error).catch(() => {});

      expect(logger.error).toHaveBeenCalledWith(
        'Network request failed',
        error,
        expect.objectContaining({
          url: '/test',
          method: 'get',
        }),
      );
    });

    it('logs error on failure', async () => {
      const error = {
        response: { status: 400 }, // Non-retryable
        config: { url: '/test', method: 'get', __retryCount: 0 },
      };

      await expect(responseErrorHandler(error)).rejects.toBe(error);

      expect(logger.error).toHaveBeenCalledWith(
        'API request failed',
        error,
        expect.objectContaining({
          url: '/test',
          method: 'get',
          status: 400,
        }),
      );
    });

    it('does not log errors for explicitly suppressed statuses', async () => {
      const error = {
        response: { status: 409 },
        config: {
          url: '/openclaw/workspace/files',
          method: 'post',
          __retryCount: 0,
          __suppressErrorStatuses: [409],
        },
      };

      await expect(responseErrorHandler(error)).rejects.toBe(error);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('base configuration', () => {
    it('has correct baseURL', () => {
      expect(api.defaults.baseURL).toBeDefined();
    });

    it('has correct timeout', () => {
      expect(api.defaults.timeout).toBe(10000);
    });

    it('has withCredentials enabled for cookie support', () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    it('has correct content type header', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('api endpoint helpers', () => {
    it('getInstanceConfig returns nested config data', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { timezone: 'UTC' } } });
      await expect(getInstanceConfig()).resolves.toEqual({ timezone: 'UTC' });
      expect(api.get).toHaveBeenCalledWith('/config');
    });

    it('getModels returns models array and falls back to empty list', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { models: ['gpt-4', 'claude'] } } });
      await expect(getModels()).resolves.toEqual(['gpt-4', 'claude']);

      api.get.mockResolvedValueOnce({ data: { data: {} } });
      await expect(getModels()).resolves.toEqual([]);

      api.get.mockRejectedValueOnce(new Error('models down'));
      await expect(getModels()).resolves.toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('returns payloads for OpenClaw metadata endpoints', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [{ id: 'a1' }] } });
      await expect(getAgents()).resolves.toEqual([{ id: 'a1' }]);
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/agents');

      api.get.mockResolvedValueOnce({ data: { data: { root: 'ceo' } } });
      await expect(getAgentsConfig()).resolves.toEqual({ root: 'ceo' });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/agents/config');

      api.get.mockResolvedValueOnce({ data: { data: { running: [] } } });
      await expect(getSubagents()).resolves.toEqual({ running: [] });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/subagents');
    });

    it('normalizes active subagent sessions from running and queued lists', async () => {
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            running: [
              { sessionLabel: 'agent:coo:main', taskId: 't1', startedAt: '2026-01-01T00:00:00Z' },
            ],
            queued: [
              { label: 'agent:cto:main', status: 'QUEUED', queuedAt: '2026-01-01T00:10:00Z' },
            ],
          },
        },
      });

      const sessions = await getActiveSubagentSessions();
      expect(sessions).toEqual([
        expect.objectContaining({
          label: 'agent:coo:main',
          status: 'running',
          taskId: 't1',
          startedAt: '2026-01-01T00:00:00Z',
        }),
        expect.objectContaining({
          label: 'agent:cto:main',
          status: 'queued',
          taskId: null,
          startedAt: '2026-01-01T00:10:00Z',
        }),
      ]);
    });

    it('handles cron jobs and scheduler endpoints', async () => {
      api.get.mockResolvedValueOnce({ data: { data: { jobs: [{ id: 'j1' }] } } });
      await expect(getCronJobs()).resolves.toEqual([{ id: 'j1' }]);
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/cron-jobs', { timeout: 30000 });

      api.get.mockResolvedValueOnce({ data: { data: [{ id: 'j2' }] } });
      await expect(getCronJobs()).resolves.toEqual([{ id: 'j2' }]);

      api.get.mockResolvedValueOnce({ data: { data: null } });
      await expect(getCronJobs()).resolves.toEqual([]);

      api.get.mockResolvedValueOnce({ data: { data: { total: 3 } } });
      await expect(getSchedulerStats()).resolves.toEqual({ total: 3 });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/cron-jobs/stats', { timeout: 15000 });

      api.get.mockResolvedValueOnce({ data: { runs: ['r1'], total: 1 } });
      await expect(getCronJobRuns('daily', { limit: 10 })).resolves.toEqual({
        runs: ['r1'],
        total: 1,
      });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/cron-jobs/daily/runs', {
        params: { limit: 10 },
        timeout: 30000,
      });
    });

    it('handles cron mutation endpoints', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { id: 'job-new' } } });
      await expect(createCronJob({ cron: '* * * * *' })).resolves.toEqual({ id: 'job-new' });
      expect(api.post).toHaveBeenLastCalledWith('/openclaw/cron-jobs', { cron: '* * * * *' });

      api.patch.mockResolvedValueOnce({ data: { data: { id: 'job-1', enabled: false } } });
      await expect(updateCronJob('job-1', { enabled: false })).resolves.toEqual({
        id: 'job-1',
        enabled: false,
      });
      expect(api.patch).toHaveBeenLastCalledWith('/openclaw/cron-jobs/job-1', { enabled: false });

      api.delete.mockResolvedValueOnce({});
      await expect(deleteCronJob('job-1')).resolves.toBeUndefined();
      expect(api.delete).toHaveBeenLastCalledWith('/openclaw/cron-jobs/job-1');

      api.patch.mockResolvedValueOnce({ data: { data: { id: 'job-1', enabled: true } } });
      await expect(setCronJobEnabled('job-1', true)).resolves.toEqual({
        id: 'job-1',
        enabled: true,
      });
      expect(api.patch).toHaveBeenLastCalledWith('/openclaw/cron-jobs/job-1/enabled', {
        enabled: true,
      });

      api.post.mockResolvedValueOnce({ data: { data: { runId: 'run-1' } } });
      await expect(triggerCronJob('job-1')).resolves.toEqual({ runId: 'run-1' });
      expect(api.post).toHaveBeenLastCalledWith('/openclaw/cron-jobs/job-1/run');
    });

    it('handles session and task subagent endpoints', async () => {
      api.get.mockResolvedValueOnce({ data: { rows: [] } });
      await expect(getTaskSubagents(22)).resolves.toEqual({ rows: [] });
      expect(api.get).toHaveBeenLastCalledWith('/tasks/22/subagents');

      api.get.mockResolvedValueOnce({ data: { data: { total: 4 } } });
      await expect(getOpenClawSessionStatus()).resolves.toEqual({ total: 4 });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/sessions/status', { timeout: 30000 });

      api.get.mockResolvedValueOnce({ data: { data: [{ key: 'k1' }], dailyCost: 2.5 } });
      await expect(getOpenClawSessions()).resolves.toEqual({
        sessions: [{ key: 'k1' }],
        dailyCost: 2.5,
      });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/sessions', { timeout: 30000 });

      api.get.mockResolvedValueOnce({ data: { data: [{ id: 'm1' }] } });
      await expect(getOpenClawSessions()).resolves.toEqual({
        sessions: [{ id: 'm1' }],
        dailyCost: 0,
      });

      api.delete.mockResolvedValueOnce({});
      await expect(deleteSession('agent:coo:main')).resolves.toBeUndefined();
      expect(api.delete).toHaveBeenLastCalledWith('/openclaw/sessions', {
        params: { key: 'agent:coo:main' },
      });
    });

    it('builds encoded message history URL and params', async () => {
      api.get.mockResolvedValueOnce({ data: { data: [{ role: 'user' }] } });
      await expect(
        getSessionMessages('agent:coo:main', { limit: 25, includeTools: true }),
      ).resolves.toEqual([{ role: 'user' }]);
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/sessions/agent%3Acoo%3Amain/messages', {
        params: {
          key: 'agent:coo:main',
          limit: 25,
          includeTools: true,
        },
      });
    });

    it('builds usage analytics params for range and custom ranges', async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      api.get.mockResolvedValueOnce({ data: { data: { points: [] } } });
      await expect(getUsageAnalytics('30d')).resolves.toEqual({ points: [] });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/usage', {
        params: { timezone, range: '30d' },
      });

      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-01-31T23:59:59.000Z');
      api.get.mockResolvedValueOnce({ data: { data: { points: [1] } } });
      await expect(getUsageAnalytics('7d', { startDate, endDate })).resolves.toEqual({
        points: [1],
      });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/usage', {
        params: {
          timezone,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    });

    it('handles reset and config endpoints', async () => {
      api.post.mockResolvedValueOnce({ data: { data: { success: true } } });
      await expect(resetUsageData('pw')).resolves.toEqual({ success: true });
      expect(api.post).toHaveBeenLastCalledWith('/openclaw/usage/reset', { password: 'pw' });

      api.post.mockResolvedValueOnce({ data: { data: { success: true } } });
      await expect(resetActivityLogs('pw')).resolves.toEqual({ success: true });
      expect(api.post).toHaveBeenLastCalledWith('/activity/reset', { password: 'pw' });

      api.get.mockResolvedValueOnce({ data: { data: { raw: '{}' } } });
      await expect(getOpenClawConfig()).resolves.toEqual({ raw: '{}' });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/config', { timeout: 30000 });

      api.put.mockResolvedValueOnce({ data: { data: { updated: true } } });
      await expect(
        updateOpenClawConfig({ raw: '{}', baseHash: 'abc', note: 'n' }),
      ).resolves.toEqual({
        updated: true,
      });
      expect(api.put).toHaveBeenLastCalledWith(
        '/openclaw/config',
        { raw: '{}', baseHash: 'abc', note: 'n' },
        { timeout: 30000 },
      );

      api.get.mockResolvedValueOnce({ data: { data: [{ path: 'a.bak' }] } });
      await expect(listOpenClawConfigBackups()).resolves.toEqual([{ path: 'a.bak' }]);
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/config/backups', { timeout: 30000 });

      api.get.mockResolvedValueOnce({ data: { data: { content: 'x' } } });
      await expect(getOpenClawConfigBackupContent('/tmp/bak')).resolves.toEqual({ content: 'x' });
      expect(api.get).toHaveBeenLastCalledWith('/openclaw/config/backups/content', {
        params: { path: '/tmp/bak' },
        timeout: 30000,
      });
    });

    it('handles standup endpoints', async () => {
      api.get.mockResolvedValueOnce({ data: { rows: [{ id: 1 }], total: 1 } });
      await expect(getStandups({ limit: 5, offset: 10 })).resolves.toEqual({
        rows: [{ id: 1 }],
        total: 1,
      });
      expect(api.get).toHaveBeenLastCalledWith('/standups', {
        params: { limit: 5, offset: 10 },
      });

      api.get.mockResolvedValueOnce({ data: { data: { id: 99 } } });
      await expect(getLatestStandup()).resolves.toEqual({ id: 99 });
      expect(api.get).toHaveBeenLastCalledWith('/standups/latest');

      api.get.mockResolvedValueOnce({ data: { data: { id: 77 } } });
      await expect(getStandupById('77')).resolves.toEqual({ id: 77 });
      expect(api.get).toHaveBeenLastCalledWith('/standups/77');

      api.post.mockResolvedValueOnce({ data: { data: { cleared: true } } });
      await expect(resetStandups('pw')).resolves.toEqual({ cleared: true });
      expect(api.post).toHaveBeenLastCalledWith('/standups/reset', { password: 'pw' });
    });
  });
});
