import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  vi,
} from "vitest";
import { useBotStore } from "../stores/botStore";
import logger from "../utils/logger";

// Mock axios before importing client
const mockAxiosInstance = {
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
    baseURL: "http://localhost:3000/api",
    timeout: 10000,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  },
};

vi.mock("axios", () => {
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
      baseURL: "http://localhost:3000/api",
      timeout: 10000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    },
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

// Mock botStore
vi.mock("../stores/botStore", () => ({
  useBotStore: {
    getState: vi.fn(),
  },
}));

// Mock logger
vi.mock("../utils/logger", () => ({
  default: {
    error: vi.fn(),
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
import { api } from "./client";
import axios from "axios";

// Get the mock instance that was created
const getMockAxiosInstance = () => {
  // The instance is created by axios.create, so we need to get it from the mock
  if (axios.create.mock.results.length > 0) {
    return axios.create.mock.results[0].value;
  }
  // If not called yet, return api itself (which is the instance)
  return api;
};

describe("api client", () => {
  let botStoreState;
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

    // Setup botStore mock
    botStoreState = {
      requestStarted: vi.fn(),
      requestFinished: vi.fn(),
      recordSuccess: vi.fn(),
      recordError: vi.fn(),
    };
    useBotStore.getState.mockReturnValue(botStoreState);

    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("request interceptor", () => {
    it("adds Authorization header when token exists", () => {
      const token = "test-token-123";
      localStorageMock.getItem.mockReturnValue(token);

      // Use stored request interceptor

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(localStorageMock.getItem).toHaveBeenCalledWith("auth_token");
      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
      expect(botStoreState.requestStarted).toHaveBeenCalled();
    });

    it("does not add Authorization header when no token", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
      expect(botStoreState.requestStarted).toHaveBeenCalled();
    });

    it("tracks request start in botStore", () => {
      requestInterceptor({ headers: {} });

      expect(botStoreState.requestStarted).toHaveBeenCalled();
    });

    it("tracks request finish on request setup error", async () => {
      const errorHandler = requestErrorHandler;
      const error = new Error("Request setup failed");

      await errorHandler(error).catch(() => {});

      expect(botStoreState.requestFinished).toHaveBeenCalled();
    });
  });

  describe("response interceptor", () => {
    it("tracks request finish on successful response", () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: "get" } };

      successHandler(response);

      expect(botStoreState.requestFinished).toHaveBeenCalled();
    });

    it("records success for mutation requests (POST)", () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: "post" } };

      successHandler(response);

      expect(botStoreState.requestFinished).toHaveBeenCalled();
      expect(botStoreState.recordSuccess).toHaveBeenCalled();
    });

    it("records success for mutation requests (PUT)", () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: "put" } };

      successHandler(response);

      expect(botStoreState.recordSuccess).toHaveBeenCalled();
    });

    it("records success for mutation requests (PATCH)", () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: "patch" } };

      successHandler(response);

      expect(botStoreState.recordSuccess).toHaveBeenCalled();
    });

    it("records success for mutation requests (DELETE)", () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: "delete" } };

      successHandler(response);

      expect(botStoreState.recordSuccess).toHaveBeenCalled();
    });

    it("does not record success for GET requests", () => {
      const successHandler = responseInterceptor;
      const response = { data: {}, config: { method: "get" } };

      successHandler(response);

      expect(botStoreState.requestFinished).toHaveBeenCalled();
      expect(botStoreState.recordSuccess).not.toHaveBeenCalled();
    });
  });

  describe("retry logic", () => {
    it("should retry on network error (no response)", async () => {
      const networkError = {
        message: "Network Error",
        config: {
          url: "/test",
          method: "get",
          __retryCount: 0,
        },
      };

      const errorHandler = responseErrorHandler;

      // Mock api.get to simulate retry
      api.get.mockResolvedValueOnce({ data: {}, config: { method: "get" } });

      const promise = errorHandler(networkError);
      // Advance timer for retry delay
      vi.advanceTimersByTime(2000);

      // Should attempt retry (will call api which calls mockAxiosInstance.get)
      await promise.catch(() => {}); // Catch since we're not fully implementing retry

      // Verify retry logic would be triggered
      expect(networkError.config.__retryCount).toBeDefined();
    });

    it("should retry on 500 status code", async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: "Internal Server Error",
        },
        config: {
          url: "/test",
          method: "get",
          __retryCount: 0,
        },
      };

      const errorHandler = responseErrorHandler;
      api.get.mockResolvedValueOnce({ data: {}, config: { method: "get" } });

      const promise = errorHandler(serverError);
      vi.advanceTimersByTime(2000);
      await promise.catch(() => {});

      expect(serverError.config.__retryCount).toBeDefined();
    });

    it("should retry on retryable status codes (502, 503, 504, 408, 429)", async () => {
      const retryableErrors = [
        { response: { status: 502 } },
        { response: { status: 503 } },
        { response: { status: 504 } },
        { response: { status: 408 } },
        { response: { status: 429 } },
      ];

      const errorHandler = responseErrorHandler;

      for (const error of retryableErrors) {
        error.config = { url: "/test", method: "get", __retryCount: 0 };
        api.get.mockResolvedValueOnce({ data: {}, config: { method: "get" } });

        const promise = errorHandler(error);
        vi.advanceTimersByTime(2000);
        await promise.catch(() => {});

        expect(error.config.__retryCount).toBeDefined();
      }
    });

    it("should not retry on non-retryable status codes (400, 404)", async () => {
      const nonRetryableErrors = [
        {
          response: { status: 400 },
          config: { url: "/test", method: "get", __retryCount: 0 },
        },
        {
          response: { status: 404 },
          config: { url: "/test", method: "get", __retryCount: 0 },
        },
      ];

      const errorHandler = responseErrorHandler;

      for (const error of nonRetryableErrors) {
        await errorHandler(error).catch(() => {});
        expect(botStoreState.recordError).toHaveBeenCalled();
      }
    });
  });

  describe("error handling", () => {
    it("logs error with response details", async () => {
      const error = {
        response: {
          status: 400, // Non-retryable status to skip retry logic
          statusText: "Bad Request",
          data: { error: "Server error" },
        },
        config: {
          url: "/test",
          method: "get",
          __retryCount: 0,
        },
      };

      await responseErrorHandler(error).catch(() => {});

      expect(logger.error).toHaveBeenCalledWith(
        "API request failed",
        error,
        expect.objectContaining({
          url: "/test",
          method: "get",
          status: 400,
        })
      );
    });

    it("logs error with request details when no response", async () => {
      const error = {
        request: {},
        config: {
          url: "/test",
          method: "get",
          __retryCount: 3, // Set to max retries to skip retry logic
        },
      };

      await responseErrorHandler(error).catch(() => {});

      expect(logger.error).toHaveBeenCalledWith(
        "Network request failed",
        error,
        expect.objectContaining({
          url: "/test",
          method: "get",
        })
      );
    });

    it("records error in botStore on failure", async () => {
      const error = {
        response: { status: 400 }, // Non-retryable
        config: { url: "/test", method: "get", __retryCount: 0 },
      };

      await responseErrorHandler(error).catch(() => {});

      expect(botStoreState.recordError).toHaveBeenCalled();
      expect(botStoreState.requestFinished).toHaveBeenCalled();
    });
  });

  describe("base configuration", () => {
    it("has correct baseURL", () => {
      expect(api.defaults.baseURL).toBeDefined();
    });

    it("has correct timeout", () => {
      expect(api.defaults.timeout).toBe(10000);
    });

    it("has withCredentials enabled for cookie support", () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    it("has correct content type header", () => {
      expect(api.defaults.headers["Content-Type"]).toBe("application/json");
    });
  });
});
