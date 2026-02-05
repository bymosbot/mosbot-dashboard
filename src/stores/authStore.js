import { create } from 'zustand';
import { api } from '../api/client';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to prevent race conditions
  isInitialized: false,
  error: null,
  
  // Initialize from localStorage
  initialize: async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      set({ token, isLoading: true });
      await get().checkAuth();
    } else {
      set({ isLoading: false, isInitialized: true });
    }
  },
  
  // Login with email and password
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data.data;
      
      // Store token in localStorage
      localStorage.setItem('auth_token', token);
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },
  
  // Logout
  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
      error: null
    });
  },
  
  // Check if current token is valid
  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      set({ 
        isAuthenticated: false, 
        isLoading: false, 
        isInitialized: true,
        token: null 
      });
      return false;
    }
    
    set({ isLoading: true });
    
    try {
      const response = await api.get('/auth/me');
      const user = response.data.data;
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null
      });
      
      return true;
    } catch (error) {
      // Token is invalid, clear it
      localStorage.removeItem('auth_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null
      });
      return false;
    }
  },
  
  // Update user data (after profile edit, etc.)
  updateUser: (userData) => {
    set((state) => ({
      user: { ...state.user, ...userData }
    }));
  },
  
  // Check if current user is admin or owner
  isAdmin: () => {
    const { user } = get();
    return user?.role === 'admin' || user?.role === 'owner';
  }
}));
