import { create } from 'zustand';
import { api } from '../api/client';
import logger from '../utils/logger';

const DEFAULT_FILTERS = {
  startDate: null,
  endDate: null,
  category: null,
  agentId: null,
  source: null,
  event_type: null,
  severity: null,
  job_id: null,
  session_key: null,
};

export const useActivityStore = create((set, get) => ({
  logs: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  currentOffset: 0,
  pageSize: 50,
  filters: { ...DEFAULT_FILTERS },

  // Live sessions for the status bar on /log
  liveSessions: [],
  isLoadingSessions: false,

  // Apply new filters and re-fetch from the top
  setFilters: (newFilters) => {
    const merged = { ...get().filters, ...newFilters };
    set({ filters: merged, currentOffset: 0, logs: [], hasMore: true });
    get().fetchActivity({ limit: get().pageSize, offset: 0, ...merged });
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS }, currentOffset: 0, logs: [], hasMore: true });
    get().fetchActivity({ limit: get().pageSize, offset: 0 });
  },

  // Build query params from a filters object
  _buildParams: (filters, extra = {}) => {
    const params = { ...extra };
    if (filters.category) params.category = filters.category;
    if (filters.agentId) params.agent_id = filters.agentId;
    if (filters.source) params.source = filters.source;
    if (filters.event_type) params.event_type = filters.event_type;
    if (filters.severity) params.severity = filters.severity;
    if (filters.job_id) params.job_id = filters.job_id;
    if (filters.session_key) params.session_key = filters.session_key;
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;
    return params;
  },

  // Fetch the unified feed (replaces existing logs)
  fetchActivity: async ({ limit = 50, offset = 0, ...overrides } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const storeFilters = { ...get().filters, ...overrides };
      const params = get()._buildParams(storeFilters, { limit, offset });

      const response = await api.get('/activity/feed', { params });
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
      logger.error('Failed to fetch activity feed', error);
      throw error;
    }
  },

  // Append next page to existing logs
  loadMoreActivity: async () => {
    const state = get();
    if (state.isLoadingMore || !state.hasMore) return;

    set({ isLoadingMore: true, error: null });
    try {
      const newOffset = state.currentOffset + state.pageSize;
      const f = state.filters;
      const params = get()._buildParams(f, { limit: state.pageSize, offset: newOffset });

      const response = await api.get('/activity/feed', { params });
      const newLogs = response.data.data || [];
      const pagination = response.data.pagination || {};

      set((s) => ({
        logs: [...s.logs, ...newLogs],
        isLoadingMore: false,
        currentOffset: newOffset,
        hasMore: pagination.total
          ? (newOffset + newLogs.length) < pagination.total
          : newLogs.length >= s.pageSize,
      }));
      return newLogs;
    } catch (error) {
      set({ error: error.message, isLoadingMore: false });
      logger.error('Failed to load more activity', error);
      throw error;
    }
  },

  // Fetch activity logs for a specific task (used by TaskModal — kept for backward compat)
  fetchTaskActivity: async (taskId, { limit = 100, offset = 0 } = {}) => {
    try {
      const response = await api.get(`/tasks/${taskId}/activity`, { params: { limit, offset } });
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
      const newLog = response.data.data;
      set((s) => ({
        logs: [newLog, ...s.logs],
        isLoading: false,
      }));
      return newLog;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      logger.error('Failed to create activity log', error);
      throw error;
    }
  },

  // Fetch live agent sessions for the status bar
  fetchLiveSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const response = await api.get('/openclaw/sessions');
      const sessions = response.data?.data || response.data || [];
      set({ liveSessions: Array.isArray(sessions) ? sessions : [], isLoadingSessions: false });
    } catch (error) {
      logger.error('Failed to fetch live sessions', error);
      set({ isLoadingSessions: false });
    }
  },

  clearLogs: () => set({ logs: [], error: null }),
}));
