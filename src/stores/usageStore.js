import { create } from 'zustand';
import { getUsageAnalytics } from '../api/client';
import logger from '../utils/logger';

export const VALID_RANGES = ['today', '24h', '3d', '7d', '14d', '30d', '3m', '6m'];

export const useUsageStore = create((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  range: 'today',

  // Lightweight today-only summary used by dashboard stat cards.
  // Fetched independently so it is always "today" regardless of the
  // range the user has selected on the Usage & Cost page.
  todaySummary: null,
  todaySummaryLoading: false,

  fetchUsage: async (range) => {
    const activeRange = range || get().range;
    set({ isLoading: true, error: null });

    try {
      const data = await getUsageAnalytics(activeRange);
      set({ data, isLoading: false, range: activeRange });
    } catch (error) {
      logger.error('Failed to fetch usage analytics', error);
      set({
        error: error.response?.data?.error?.message || 'Failed to load usage data',
        isLoading: false,
      });
    }
  },

  fetchTodaySummary: async () => {
    if (get().todaySummaryLoading) return;
    set({ todaySummaryLoading: true });
    try {
      const data = await getUsageAnalytics('today');
      set({ todaySummary: data?.summary ?? null, todaySummaryLoading: false });
    } catch (error) {
      logger.error('Failed to fetch today usage summary', error);
      set({ todaySummaryLoading: false });
    }
  },

  setRange: (range) => {
    if (!VALID_RANGES.includes(range)) return;
    set({ range, data: null });
    get().fetchUsage(range);
  },
}));
