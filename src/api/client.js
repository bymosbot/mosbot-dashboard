import axios from 'axios';
import { useBotStore } from '../stores/botStore';
import logger from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
    
    // Track request start in bot store
    useBotStore.getState().requestStarted();
    
    return config;
  },
  (error) => {
    // Request setup failed, decrement counter
    useBotStore.getState().requestFinished();
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    // Request completed successfully
    useBotStore.getState().requestFinished();
    
    // For successful task completions, show excited mood briefly
    // (only for POST/PUT/PATCH/DELETE - mutations, not GET requests)
    if (['post', 'put', 'patch', 'delete'].includes(response.config.method?.toLowerCase())) {
      useBotStore.getState().recordSuccess();
    }
    
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

    // Request failed and won't be retried
    useBotStore.getState().requestFinished();
    useBotStore.getState().recordError();
    
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

export default api;
