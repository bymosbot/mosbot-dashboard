import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
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

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  });

  describe('login', () => {
    it('successfully logs in with valid credentials', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockToken = 'test-token';

      api.post.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            token: mockToken,
          },
        },
      });

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().token).toBe(mockToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('handles login failure', async () => {
      api.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Invalid credentials',
            },
          },
        },
      });

      const result = await useAuthStore.getState().login('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().error).toBe('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('clears user data and token', () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { id: 1, email: 'test@example.com' },
        token: 'test-token',
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('validates token and sets user when valid', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      const mockToken = 'valid-token';

      localStorageMock.getItem.mockReturnValue(mockToken);
      api.get.mockResolvedValue({
        data: {
          data: mockUser,
        },
      });

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('clears token when invalid', async () => {
      const mockToken = 'invalid-token';

      localStorageMock.getItem.mockReturnValue(mockToken);
      api.get.mockRejectedValue({ response: { status: 401 } });

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('returns false when no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin user', () => {
      useAuthStore.setState({
        user: { id: 1, email: 'admin@example.com', role: 'admin' },
      });

      expect(useAuthStore.getState().isAdmin()).toBe(true);
    });

    it('returns true for owner user', () => {
      useAuthStore.setState({
        user: { id: 1, email: 'owner@example.com', role: 'owner' },
      });

      expect(useAuthStore.getState().isAdmin()).toBe(true);
    });

    it('returns false for non-admin user', () => {
      useAuthStore.setState({
        user: { id: 1, email: 'user@example.com', role: 'user' },
      });

      expect(useAuthStore.getState().isAdmin()).toBe(false);
    });

    it('returns false when no user', () => {
      useAuthStore.setState({
        user: null,
      });

      expect(useAuthStore.getState().isAdmin()).toBe(false);
    });
  });
});
