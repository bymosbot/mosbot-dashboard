import { create } from 'zustand';
import { getStandups, getLatestStandup, getStandupById } from '../api/client';
import logger from '../utils/logger';

export const useStandupStore = create((set, get) => ({
  // List state
  standups: [],
  isLoadingList: false,
  errorList: null,
  pagination: {
    limit: 50,
    offset: 0,
    total: 0,
  },

  // Detail state
  activeStandup: null,
  isLoadingDetail: false,
  errorDetail: null,

  // Fetch standups list
  fetchStandups: async ({ limit = 50, offset = 0, silent = false } = {}) => {
    if (!silent) {
      set({ isLoadingList: true, errorList: null });
    }

    try {
      const response = await getStandups({ limit, offset });
      set({
        standups: response.data || [],
        pagination: response.pagination || { limit, offset, total: 0 },
        isLoadingList: false,
      });
    } catch (error) {
      logger.error('Failed to fetch standups', error);
      set({
        errorList: error.response?.data?.error?.message || 'Failed to load standups',
        isLoadingList: false,
      });
    }
  },

  // Fetch latest standup
  fetchLatestStandup: async () => {
    set({ isLoadingDetail: true, errorDetail: null });

    try {
      const standup = await getLatestStandup();
      set({
        activeStandup: standup,
        isLoadingDetail: false,
      });
      return standup;
    } catch (error) {
      logger.error('Failed to fetch latest standup', error);
      set({
        errorDetail: error.response?.data?.error?.message || 'Failed to load standup',
        isLoadingDetail: false,
      });
      return null;
    }
  },

  // Fetch standup by ID
  fetchStandupById: async (id) => {
    if (!id) {
      set({ activeStandup: null });
      return null;
    }

    set({ isLoadingDetail: true, errorDetail: null });

    try {
      const standup = await getStandupById(id);
      set({
        activeStandup: standup,
        isLoadingDetail: false,
      });
      return standup;
    } catch (error) {
      logger.error('Failed to fetch standup', error, { standupId: id });
      set({
        errorDetail: error.response?.data?.error?.message || 'Failed to load standup',
        isLoadingDetail: false,
      });
      return null;
    }
  },

  // Clear active standup
  clearActiveStandup: () => {
    set({ activeStandup: null, errorDetail: null });
  },

  // Refresh current standup
  refreshActiveStandup: async () => {
    const { activeStandup } = get();
    if (activeStandup?.id) {
      await get().fetchStandupById(activeStandup.id);
    }
  },
}));
