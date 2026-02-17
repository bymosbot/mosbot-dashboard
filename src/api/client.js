import axios from 'axios';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Retry configuration
const MAX_RETRIES = 3;
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
  }
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
  }
);

// Instance config — non-sensitive server settings (timezone, etc.)
export const getInstanceConfig = async () => {
  const response = await api.get('/config');
  return response.data.data;
};

// OpenClaw Agents API - auto-discover agents from OpenClaw configuration
export const getAgents = async () => {
  const response = await api.get('/openclaw/agents');
  return response.data.data;
};

// OpenClaw Org Chart Config API - get organization chart structure
export const getOrgChartConfig = async () => {
  const response = await api.get('/openclaw/org-chart');
  return response.data.data;
};

// OpenClaw Subagents API - returns object with { running, queued, completed, retention }
export const getSubagents = async () => {
  const response = await api.get('/openclaw/subagents');
  return response.data.data;
};

// Get active subagent sessions as a flat array - combines running and queued sessions
// This is useful for components that need to iterate over sessions (e.g., OrgChart, TaskManagerOverview)
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
    ...(data.running || []).map(s => normalizeSession(s, 'running')),
    ...(data.queued || []).map(s => normalizeSession(s, 'queued')),
  ];
  
  return sessions;
};

// OpenClaw Cron Jobs API - get configured scheduled jobs from OpenClaw
export const getCronJobs = async () => {
  const response = await api.get("/openclaw/cron-jobs");
  return response.data.data;
};

// Create a new cron job (admin only)
export const createCronJob = async (payload) => {
  const response = await api.post("/openclaw/cron-jobs", payload);
  return response.data.data;
};

// Update an existing cron job (admin only)
export const updateCronJob = async (jobId, payload) => {
  const response = await api.put(`/openclaw/cron-jobs/${jobId}`, payload);
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
  const response = await api.post(`/openclaw/cron-jobs/${jobId}/trigger`);
  return response.data;
};

// Task-scoped subagents API
export const getTaskSubagents = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/subagents`);
  return response.data;
};

// OpenClaw Sessions API - get active sessions from OpenClaw Gateway
export const getOpenClawSessions = async () => {
  const response = await api.get('/openclaw/sessions');
  return response.data.data;
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
      includeTools
    }
  });
  return response.data.data;
};

export default api;
