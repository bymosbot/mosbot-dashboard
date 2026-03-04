import axios from 'axios';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Retry configuration
const MAX_RETRIES = 3;
// OpenClaw gateway proxy endpoints can be slow; use longer timeout than default (10s)
const OPENCLAW_TIMEOUT = 30000;
const RETRY_DELAY_BASE = 1000; // Base delay in milliseconds
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]; // Status codes that should be retried

// Calculate exponential backoff delay with jitter
const getRetryDelay = (attempt) => {
  const exponentialDelay = RETRY_DELAY_BASE * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return exponentialDelay + jitter;
};

// Check if error should be retried
const shouldRetry = (error, retryCount) => {
  // Don't retry if we've exceeded max retries
  if (retryCount >= MAX_RETRIES) {
    return false;
  }

  // Don't retry if request config explicitly disables retries
  if (error.config?.__retryDisabled === true) {
    return false;
  }

  // Retry on network errors (no response received)
  if (!error.response) {
    return true;
  }

  // Retry on specific server errors (5xx) and some client errors (408, 429)
  const status = error.response.status;
  return RETRYABLE_STATUS_CODES.includes(status);
};

const shouldSuppressErrorLogging = (error) => {
  const config = error.config || {};
  if (config.__suppressErrorLogging === true) {
    return true;
  }

  const status = error.response?.status;
  const suppressedStatuses = config.__suppressErrorStatuses;
  return (
    Number.isInteger(status) &&
    Array.isArray(suppressedStatuses) &&
    suppressedStatuses.includes(status)
  );
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Required to send cookies (including Cloudflare Access auth cookie)
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;

    // Initialize retry count if not present
    if (!config.__retryCount) {
      config.__retryCount = 0;
    }

    // Check if we should retry this request
    if (shouldRetry(error, config.__retryCount)) {
      config.__retryCount += 1;
      const delay = getRetryDelay(config.__retryCount - 1);

      // Wait for the calculated delay before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry the request
      return api(config);
    }

    if (shouldSuppressErrorLogging(error)) {
      return Promise.reject(error);
    }

    // Use structured logging
    if (error.response) {
      // Server responded with error
      logger.error('API request failed', error, {
        url: config?.url,
        method: config?.method,
        status: error.response.status,
        retryCount: config.__retryCount || 0,
      });
    } else if (error.request) {
      // Request made but no response
      logger.error('Network request failed', error, {
        url: config?.url,
        method: config?.method,
        retryCount: config.__retryCount || 0,
      });
    } else {
      // Error setting up request
      logger.error('Request setup failed', error, {
        url: config?.url,
        method: config?.method,
      });
    }
    return Promise.reject(error);
  },
);

// Instance config — non-sensitive server settings (timezone, etc.)
export const getInstanceConfig = async () => {
  const response = await api.get('/config');
  return response.data.data;
};

// Models API - get available models from OpenClaw config
export const getModels = async () => {
  try {
    const response = await api.get('/models');
    return response.data.data.models || [];
  } catch (error) {
    logger.warn('Failed to fetch models from API, using fallback', { error: error.message });
    return []; // Return empty array, component will use AVAILABLE_MODELS fallback
  }
};

// OpenClaw Agents API - auto-discover agents from OpenClaw configuration
export const getAgents = async () => {
  const response = await api.get('/openclaw/agents');
  return response.data.data;
};

// OpenClaw Agents Config API - get agent hierarchy and configuration
export const getAgentsConfig = async () => {
  const response = await api.get('/openclaw/agents/config');
  return response.data.data;
};

// OpenClaw Subagents API - returns object with { running, queued, completed, retention }
export const getSubagents = async () => {
  const response = await api.get('/openclaw/subagents');
  return response.data.data;
};

// Get active subagent sessions as a flat array - combines running and queued sessions
// This is useful for components that need to iterate over sessions (e.g., Agents, TaskManagerOverview)
// Normalizes field names: sessionLabel → label, status values to lowercase
export const getActiveSubagentSessions = async () => {
  const response = await api.get('/openclaw/subagents');
  const data = response.data.data;

  // Normalize field names for UI consumption
  const normalizeSession = (session, statusOverride) => ({
    ...session,
    // Normalize sessionLabel to label for UI matching
    label: session.sessionLabel || session.label || null,
    // Normalize status to lowercase strings (running, queued)
    status: statusOverride || (session.status || '').toLowerCase(),
    // Keep original fields for debugging/future use
    sessionLabel: session.sessionLabel,
    taskId: session.taskId || null,
    taskNumber: session.taskNumber || null,
    startedAt: session.startedAt || session.queuedAt || null,
  });

  // Combine running and queued into a single array with normalized fields
  const sessions = [
    ...(data.running || []).map((s) => normalizeSession(s, 'running')),
    ...(data.queued || []).map((s) => normalizeSession(s, 'queued')),
  ];

  return sessions;
};

// OpenClaw Cron Jobs API - get configured scheduled jobs from OpenClaw
export const getCronJobs = async () => {
  const response = await api.get('/openclaw/cron-jobs', { timeout: OPENCLAW_TIMEOUT });
  // Response shape: { data: { version: number, jobs: CronJob[] } }
  return response.data.data?.jobs ?? response.data.data ?? [];
};

export const getSchedulerStats = async () => {
  const response = await api.get('/openclaw/cron-jobs/stats', { timeout: 15000 });
  return response.data.data;
};

// Get run history for a cron job (from workspace /cron/runs/{jobId}.jsonl)
export const getCronJobRuns = async (jobId, { limit = 50 } = {}) => {
  const response = await api.get(`/openclaw/cron-jobs/${jobId}/runs`, {
    params: { limit },
    timeout: OPENCLAW_TIMEOUT,
  });
  return response.data; // { runs: [...], total: number }
};

// Create a new cron job (admin only)
export const createCronJob = async (payload) => {
  const response = await api.post('/openclaw/cron-jobs', payload);
  return response.data.data;
};

// Update an existing cron job (admin only) — PATCH for partial updates
export const updateCronJob = async (jobId, payload) => {
  const response = await api.patch(`/openclaw/cron-jobs/${jobId}`, payload);
  return response.data.data;
};

// Delete a cron job (admin only)
export const deleteCronJob = async (jobId) => {
  await api.delete(`/openclaw/cron-jobs/${jobId}`);
};

// Set enabled state for a cron job (admin only)
export const setCronJobEnabled = async (jobId, enabled) => {
  const response = await api.patch(`/openclaw/cron-jobs/${jobId}/enabled`, { enabled });
  return response.data.data;
};

// Manually trigger a cron job to run now (admin only)
export const triggerCronJob = async (jobId) => {
  const response = await api.post(`/openclaw/cron-jobs/${jobId}/run`);
  return response.data.data;
};

// Task-scoped subagents API
export const getTaskSubagents = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/subagents`);
  return response.data;
};

// Lightweight session counts for the sidebar avatar (no cost/usage enrichment).
// Much faster than getOpenClawSessions — only calls sessions.list on the gateway.
export const getOpenClawSessionStatus = async () => {
  const response = await api.get('/openclaw/sessions/status', { timeout: OPENCLAW_TIMEOUT });
  return response.data.data; // { running, active, idle, total }
};

// OpenClaw Sessions API - full session list with cost/token enrichment.
// Used by Agent Monitor; too slow for global polling.
export const getOpenClawSessions = async () => {
  const response = await api.get('/openclaw/sessions', { timeout: OPENCLAW_TIMEOUT });
  return {
    sessions: response.data.data,
    dailyCost: response.data.dailyCost || 0,
  };
};

// Delete an OpenClaw session by session key (admin only)
export const deleteSession = async (sessionKey) => {
  await api.delete('/openclaw/sessions', {
    params: { key: sessionKey },
  });
};

// Get full message history for a specific session
export const getSessionMessages = async (sessionKey, { limit = 50, includeTools = false } = {}) => {
  // Extract sessionId from sessionKey for the URL path
  // sessionKey format: "agent:coo:main" or similar
  // We'll use the full key as sessionId since the endpoint accepts it
  const sessionId = encodeURIComponent(sessionKey);

  const response = await api.get(`/openclaw/sessions/${sessionId}/messages`, {
    params: {
      key: sessionKey,
      limit,
      includeTools,
    },
  });
  return response.data.data;
};

// Usage & Cost Analytics API
export const getUsageAnalytics = async (range = '7d', customRange = null) => {
  // Get user's timezone for accurate "today" calculation
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const params = { timezone };

  // If custom range is provided, use startDate/endDate instead of range
  if (customRange && customRange.startDate && customRange.endDate) {
    params.startDate = customRange.startDate.toISOString();
    params.endDate = customRange.endDate.toISOString();
  } else {
    params.range = range;
  }

  const response = await api.get('/openclaw/usage', { params });
  return response.data.data;
};

// Reset Usage Data (admin only, requires password confirmation)
export const resetUsageData = async (password) => {
  const response = await api.post('/openclaw/usage/reset', { password });
  return response.data.data;
};

// Reset Activity Logs (admin only, requires password confirmation)
export const resetActivityLogs = async (password) => {
  const response = await api.post('/activity/reset', { password });
  return response.data.data;
};

// OpenClaw Config Editor API (admin/owner only)
export const getOpenClawConfig = async () => {
  const response = await api.get('/openclaw/config', { timeout: OPENCLAW_TIMEOUT });
  return response.data.data;
};

export const updateOpenClawConfig = async ({ raw, baseHash, note }) => {
  const response = await api.put(
    '/openclaw/config',
    { raw, baseHash, note },
    { timeout: OPENCLAW_TIMEOUT },
  );
  return response.data.data;
};

export const listOpenClawConfigBackups = async () => {
  const response = await api.get('/openclaw/config/backups', { timeout: OPENCLAW_TIMEOUT });
  return response.data.data;
};

export const getOpenClawConfigBackupContent = async (path) => {
  const response = await api.get('/openclaw/config/backups/content', {
    params: { path },
    timeout: OPENCLAW_TIMEOUT,
  });
  return response.data.data;
};

// Standups API
export const getStandups = async ({ limit = 50, offset = 0 } = {}) => {
  const response = await api.get('/standups', {
    params: { limit, offset },
  });
  return response.data;
};

export const getLatestStandup = async () => {
  const response = await api.get('/standups/latest');
  return response.data.data;
};

export const getStandupById = async (id) => {
  const response = await api.get(`/standups/${id}`);
  return response.data.data;
};

// Reset Standups (admin only, requires password confirmation)
export const resetStandups = async (password) => {
  const response = await api.post('/standups/reset', { password });
  return response.data.data;
};

export default api;
