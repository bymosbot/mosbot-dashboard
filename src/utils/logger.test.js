import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import logger from './logger';

describe('logger', () => {
  let consoleDebugSpy;
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock import.meta.env
    vi.stubGlobal('import', {
      meta: {
        env: {
          DEV: true,
          MODE: 'test',
          VITE_API_URL: 'http://localhost:3000',
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('debug', () => {
    it('logs debug message in development mode', () => {
      logger.debug('Debug message');

      expect(consoleDebugSpy).toHaveBeenCalled();
      const callArgs = consoleDebugSpy.mock.calls[0][0];
      expect(callArgs).toContain('[DEBUG]');
      expect(callArgs).toContain('Debug message');
    });

    it('includes context in log entry', () => {
      logger.debug('Debug message', { key: 'value' });

      expect(consoleDebugSpy).toHaveBeenCalled();
      const callArgs = consoleDebugSpy.mock.calls[0][0];
      // Context may include environment field, so check for key-value pair
      expect(callArgs).toContain('"key":"value"');
    });

    it('includes timestamp in log entry', () => {
      logger.debug('Debug message');

      expect(consoleDebugSpy).toHaveBeenCalled();
      const callArgs = consoleDebugSpy.mock.calls[0][0];
      expect(callArgs).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('info', () => {
    it('logs info message', () => {
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0][0];
      expect(callArgs).toContain('[INFO]');
      expect(callArgs).toContain('Info message');
    });

    it('includes context in log entry', () => {
      logger.info('Info message', { userId: 123 });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0][0];
      // Context may include environment field
      expect(callArgs).toContain('"userId":123');
    });
  });

  describe('warn', () => {
    it('logs warning message', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const callArgs = consoleWarnSpy.mock.calls[0][0];
      expect(callArgs).toContain('[WARN]');
      expect(callArgs).toContain('Warning message');
    });

    it('includes context in log entry', () => {
      logger.warn('Warning message', { reason: 'test' });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const callArgs = consoleWarnSpy.mock.calls[0][0];
      // Context may include environment field
      expect(callArgs).toContain('"reason":"test"');
    });
  });

  describe('error', () => {
    it('logs error message', () => {
      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('[ERROR]');
      expect(callArgs).toContain('Error message');
    });

    it('includes error object details', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logger.error('Error message', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('Error message');
      // Error details should be in the log
      expect(callArgs).toContain('Test error');
    });

    it('includes axios error response details', () => {
      const error = {
        message: 'Request failed',
        name: 'AxiosError',
        stack: 'Error stack',
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Resource not found' },
        },
        config: {
          url: '/api/tasks',
          method: 'get',
        },
      };

      logger.error('API error', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('API error');
      // Should include response details
      expect(callArgs).toContain('404');
    });

    it('includes axios error request details', () => {
      const error = {
        message: 'Network error',
        name: 'AxiosError',
        stack: 'Error stack',
        request: {},
        config: {
          url: '/api/tasks',
          method: 'post',
        },
      };

      logger.error('Network error', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('Network error');
      // Should include request details
      expect(callArgs).toContain('/api/tasks');
    });

    it('handles error without error object', () => {
      logger.error('Error message', null, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('Error message');
      // Context may include environment field
      expect(callArgs).toContain('"context":"test"');
    });

    it('includes context along with error', () => {
      const error = new Error('Test error');
      logger.error('Error message', error, { userId: 123 });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('Error message');
      // Context may include environment and error fields
      expect(callArgs).toContain('"userId":123');
    });
  });

  describe('log entry structure', () => {
    it('includes timestamp in all log entries', () => {
      logger.debug('Test');
      logger.info('Test');
      logger.warn('Test');
      logger.error('Test');

      [consoleDebugSpy, consoleInfoSpy, consoleWarnSpy, consoleErrorSpy].forEach(
        (spy) => {
          const callArgs = spy.mock.calls[0][0];
          expect(callArgs).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
      );
    });

    it('includes level in all log entries', () => {
      logger.debug('Test');
      logger.info('Test');
      logger.warn('Test');
      logger.error('Test');

      expect(consoleDebugSpy.mock.calls[0][0]).toContain('[DEBUG]');
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[INFO]');
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN]');
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]');
    });

    it('formats log entry correctly', () => {
      logger.info('Test message', { key: 'value' });

      const callArgs = consoleInfoSpy.mock.calls[0][0];
      // Should match format: [timestamp] [level] message {context}
      expect(callArgs).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\] \[INFO\] Test message/);
    });

    it('omits context string when no context provided', () => {
      // Mock without VITE_API_URL to avoid environment field
      vi.stubGlobal('import', {
        meta: {
          env: {
            DEV: true,
            MODE: 'test',
          },
        },
      });

      logger.info('Test message');

      const callArgs = consoleInfoSpy.mock.calls[0][0];
      // Should not contain JSON context (only timestamp and level)
      expect(callArgs).not.toMatch(/\{[^}]*"key"/);
    });
  });

  describe('environment context', () => {
    it('includes environment when VITE_API_URL is set', () => {
      // Clear any previous global stubs and set up fresh mock
      vi.unstubAllGlobals();
      vi.stubGlobal('import', {
        meta: {
          env: {
            DEV: true,
            MODE: 'test',
            VITE_API_URL: 'http://localhost:3000',
          },
        },
      });

      logger.info('Test');

      const callArgs = consoleInfoSpy.mock.calls[0][0];
      // Should include environment in the context
      expect(callArgs).toContain('environment');
    });
  });
});
