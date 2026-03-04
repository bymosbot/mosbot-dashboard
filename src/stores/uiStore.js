import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store - Manages global UI state like sidebar collapse
 *
 * Features:
 * - Sidebar collapsed state (persisted to localStorage)
 */
export const useUIStore = create(
  persist(
    (set, _get) => ({
      // Sidebar state
      sidebarCollapsed: false,

      // File browser state - hide dotfiles (.gitkeep, .gitignore, etc.) by default
      showHiddenFiles: false,

      // Actions
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleShowHiddenFiles: () => {
        set((state) => ({ showHiddenFiles: !state.showHiddenFiles }));
      },
    }),
    {
      name: 'mosbot-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        showHiddenFiles: state.showHiddenFiles,
      }),
    },
  ),
);
