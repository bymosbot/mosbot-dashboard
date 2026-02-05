/**
 * Structured logging utility
 * 
 * Provides consistent logging format and can be extended to integrate
 * with external logging services (e.g., Sentry, LogRocket, etc.)
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = import.meta.env.DEV 
  ? LOG_LEVELS.DEBUG 
  : LOG_LEVELS.INFO;

/**
 * Create a structured log entry
 */
const createLogEntry = (level, message, context = {}) => {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...context,
  };

  // Add environment context
  if (import.meta.env.VITE_API_URL) {
    entry.environment = import.meta.env.MODE || 'development';
  }

  return entry;
};

/**
 * Format log entry for console output
 */
const formatForConsole = (entry) => {
  const { timestamp, level, message, ...rest } = entry;
  const contextStr = Object.keys(rest).length > 0 
    ? ` ${JSON.stringify(rest)}` 
    : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
};

/**
 * Send log entry to external service (placeholder for future integration)
 */
const sendToExternalService = async (_entry) => {
  // Placeholder for external logging service integration
  // Example: Sentry, LogRocket, DataDog, etc.
  // if (window.Sentry) {
  //   window.Sentry.captureMessage(entry.message, {
  //     level: entry.level.toLowerCase(),
  //     extra: entry,
  //   });
  // }
};

const logger = {
  debug: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const entry = createLogEntry('DEBUG', message, context);
      // eslint-disable-next-line no-console
      console.debug(formatForConsole(entry));
      sendToExternalService(entry);
    }
  },

  info: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const entry = createLogEntry('INFO', message, context);
      // eslint-disable-next-line no-console
      console.info(formatForConsole(entry));
      sendToExternalService(entry);
    }
  },

  warn: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const entry = createLogEntry('WARN', message, context);
      console.warn(formatForConsole(entry));
      sendToExternalService(entry);
    }
  },

  error: (message, error = null, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const errorContext = {
        ...context,
      };

      if (error) {
        errorContext.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };

        // Include response data if it's an axios error
        if (error.response) {
          errorContext.error.response = {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          };
        }

        // Include request info if available
        if (error.request) {
          errorContext.error.request = {
            url: error.config?.url,
            method: error.config?.method,
          };
        }
      }

      const entry = createLogEntry('ERROR', message, errorContext);
      console.error(formatForConsole(entry));
      sendToExternalService(entry);
    }
  },
};

export default logger;
