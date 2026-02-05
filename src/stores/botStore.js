import { create } from 'zustand';
import api from '../api/client';
import logger from '../utils/logger';

// Mood definitions with labels and styling
export const MOODS = {
  CALM: {
    id: 'calm',
    label: 'Calm',
    emoji: '😌',
    color: 'text-blue-400',
    description: 'Everything is running smoothly',
  },
  FOCUSED: {
    id: 'focused',
    label: 'Focused',
    emoji: '🤔',
    color: 'text-purple-400',
    description: 'Working on tasks',
  },
  FRUSTRATED: {
    id: 'frustrated',
    label: 'Frustrated',
    emoji: '😤',
    color: 'text-red-400',
    description: 'Encountered some issues',
  },
  EXCITED: {
    id: 'excited',
    label: 'Excited',
    emoji: '🎉',
    color: 'text-green-400',
    description: 'Tasks completed successfully',
  },
};

const FRUSTRATION_TIMEOUT = 5000; // Return to calm after 5 seconds
const EXCITEMENT_TIMEOUT = 3000; // Return to calm after 3 seconds

export const useBotStore = create((set, get) => ({
  // Request tracking
  inflightRequests: 0,
  lastErrorAt: null,
  lastSuccessAt: null,
  isConnected: true, // Bot connection status (will be controlled by openclaw integration)
  healthCheckInterval: null, // Interval ID for health checks
  
  // Mood state (activity-driven only)
  currentMood: MOODS.CALM,
  moodTimers: {}, // Track timers for auto-mood changes
  
  // Actions for request tracking
  requestStarted: () => {
    set((state) => {
      const newCount = state.inflightRequests + 1;
      
      // If we just started working (0 -> 1), change mood to focused
      const newMood = newCount === 1 ? MOODS.FOCUSED : state.currentMood;
      
      return {
        inflightRequests: newCount,
        currentMood: newMood,
      };
    });
  },
  
  requestFinished: () => {
    set((state) => {
      const newCount = Math.max(0, state.inflightRequests - 1);
      
      // If we just finished all work (1 -> 0), return to calm
      const newMood = newCount === 0 ? MOODS.CALM : state.currentMood;
      
      return {
        inflightRequests: newCount,
        currentMood: newMood,
        lastSuccessAt: Date.now(),
      };
    });
  },
  
  recordError: () => {
    const now = Date.now();
    const state = get();
    
    // Clear any existing timer
    if (state.moodTimers.frustration) {
      clearTimeout(state.moodTimers.frustration);
    }
    
    // Set frustrated mood temporarily
    set({ 
      lastErrorAt: now,
      currentMood: MOODS.FRUSTRATED,
    });
    
    // Return to calm after timeout
    const timer = setTimeout(() => {
      const currentState = get();
      if (currentState.inflightRequests === 0) {
        set({ currentMood: MOODS.CALM });
      }
    }, FRUSTRATION_TIMEOUT);
    
    set((state) => ({
      moodTimers: { ...state.moodTimers, frustration: timer },
    }));
  },
  
  recordSuccess: () => {
    const now = Date.now();
    const state = get();
    
    // Clear any existing timer
    if (state.moodTimers.excitement) {
      clearTimeout(state.moodTimers.excitement);
    }
    
    // Set excited mood temporarily
    if (state.inflightRequests === 0) {
      set({ 
        lastSuccessAt: now,
        currentMood: MOODS.EXCITED,
      });
      
      // Return to calm after timeout
      const timer = setTimeout(() => {
        const currentState = get();
        if (currentState.inflightRequests === 0) {
          set({ currentMood: MOODS.CALM });
        }
      }, EXCITEMENT_TIMEOUT);
      
      set((state) => ({
        moodTimers: { ...state.moodTimers, excitement: timer },
      }));
    } else {
      set({ lastSuccessAt: now });
    }
  },
  
  // Bot connection tracking (for openclaw bot integration)
  // Call setConnected(true/false) when openclaw bot connects/disconnects
  setConnected: (connected) => set({ isConnected: connected }),
  
  // Check OpenClaw workspace service health
  checkOpenClawHealth: async () => {
    try {
      const response = await api.get('/openclaw/workspace/status');
      const isHealthy = response.data?.data?.accessible === true;
      set({ isConnected: isHealthy });
      return isHealthy;
    } catch (error) {
      logger.warn('OpenClaw health check failed', { error: error.message });
      set({ isConnected: false });
      return false;
    }
  },
  
  // Start periodic health checks
  startHealthChecks: () => {
    const state = get();
    
    // Don't start if already running
    if (state.healthCheckInterval) return;
    
    // Initial check
    get().checkOpenClawHealth();
    
    // Check every 30 seconds
    const interval = setInterval(() => {
      get().checkOpenClawHealth();
    }, 30000);
    
    set({ healthCheckInterval: interval });
  },
  
  // Stop periodic health checks
  stopHealthChecks: () => {
    const state = get();
    if (state.healthCheckInterval) {
      clearInterval(state.healthCheckInterval);
      set({ healthCheckInterval: null });
    }
  },
  
  // Cleanup function to clear all mood timers and health checks
  // Call this when components unmount or store needs to be reset
  cleanupTimers: () => {
    const state = get();
    if (state.moodTimers.frustration) {
      clearTimeout(state.moodTimers.frustration);
    }
    if (state.moodTimers.excitement) {
      clearTimeout(state.moodTimers.excitement);
    }
    if (state.healthCheckInterval) {
      clearInterval(state.healthCheckInterval);
    }
    set({ moodTimers: {}, healthCheckInterval: null });
  },
  
  // Computed properties
  isWorking: () => get().inflightRequests > 0,
  getActivityStatus: () => {
    const state = get();
    if (!state.isConnected) return 'Offline';
    return state.inflightRequests > 0 ? 'Working' : 'Idle';
  },
  getActivityLabel: () => {
    const state = get();
    if (!state.isConnected) return 'Offline - Reconnecting...';
    return state.inflightRequests > 0 ? 'Working on tasks...' : 'Ready for tasks';
  },
}));
