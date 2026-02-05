import { create } from 'zustand';
import { api } from '../api/client';
import logger from '../utils/logger';

export const useActivityStore = create((set, get) => ({
  logs: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  currentOffset: 0,
  pageSize: 50,
  
  // Fetch activity logs with optional filters (replaces existing logs)
  fetchActivity: async ({ limit = 50, offset = 0, category, taskId, startDate, endDate } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = {};
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;
      if (category) params.category = category;
      if (taskId) params.task_id = taskId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await api.get('/activity', { params });
      // API returns { data: [...], pagination: {...} }
      const logs = response.data.data || [];
      const pagination = response.data.pagination || {};
      
      set({ 
        logs, 
        isLoading: false,
        currentOffset: offset,
        hasMore: pagination.total ? (offset + logs.length) < pagination.total : logs.length >= limit,
      });
      return logs;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      logger.error('Failed to fetch activity logs', error);
      throw error;
    }
  },
  
  // Load more activity logs (appends to existing logs)
  loadMoreActivity: async ({ category, taskId, startDate, endDate } = {}) => {
    const state = get();
    if (state.isLoadingMore || !state.hasMore) return;
    
    set({ isLoadingMore: true, error: null });
    try {
      const newOffset = state.currentOffset + state.pageSize;
      const params = {
        limit: state.pageSize,
        offset: newOffset,
      };
      if (category) params.category = category;
      if (taskId) params.task_id = taskId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await api.get('/activity', { params });
      const newLogs = response.data.data || [];
      const pagination = response.data.pagination || {};
      
      set((state) => ({ 
        logs: [...state.logs, ...newLogs],
        isLoadingMore: false,
        currentOffset: newOffset,
        hasMore: pagination.total ? (newOffset + newLogs.length) < pagination.total : newLogs.length >= state.pageSize,
      }));
      return newLogs;
    } catch (error) {
      set({ error: error.message, isLoadingMore: false });
      logger.error('Failed to load more activity logs', error);
      throw error;
    }
  },
  
  // Fetch activity logs for a specific task
  fetchTaskActivity: async (taskId, { limit = 100, offset = 0 } = {}) => {
    try {
      const response = await api.get(`/tasks/${taskId}/activity`, {
        params: { limit, offset }
      });
      // API returns { data: [...], pagination: {...} }
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to fetch task activity logs', error);
      throw error;
    }
  },
  
  // Create a new activity log entry
  createActivity: async (activityData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/activity', activityData);
      // API returns { data: {...} }
      const newLog = response.data.data;
      set((state) => ({
        logs: [newLog, ...state.logs],
        isLoading: false,
      }));
      return newLog;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      logger.error('Failed to create activity log', error);
      throw error;
    }
  },
  
  // Clear all logs (useful for testing)
  clearLogs: () => set({ logs: [], error: null }),
}));
