import { create } from 'zustand';
import api from '../api/client';
import { getOpenClawSessions } from '../api/client';
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

// Session polling interval: 30 seconds
// Each poll triggers ~6 requests to the OpenClaw gateway (1 config read + 5 agent queries
// via /tools/invoke). A shorter interval risks flooding the gateway and starving cron jobs.
const SESSION_POLLING_INTERVAL = 30000;

export const useBotStore = create((set, get) => ({
  // Request tracking
  inflightRequests: 0,
  lastErrorAt: null,
  lastSuccessAt: null,
  isConnected: true, // Bot connection status (will be controlled by openclaw integration)
  healthCheckInterval: null, // Interval ID for health checks
  connectionStableTimer: null, // Timer to stabilize connection state changes
  
  // OpenClaw session data (single source of truth, polled globally)
  sessions: [],
  sessionsLoaded: false,
  sessionsError: null,
  sessionCounts: { running: 0, active: 0, idle: 0, total: 0 },
  sessionPollingInterval: null, // Interval ID for session polling
  
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
  
  // Update session counts from OpenClaw Gateway data
  setSessionCounts: (counts) => set({ sessionCounts: counts }),
  
  // Fetch sessions from OpenClaw Gateway and update store
  // This is the single source of truth for session data across the app
  fetchSessions: async () => {
    try {
      const data = await getOpenClawSessions();
      const sessions = data || [];
      
      set({
        sessions,
        sessionsLoaded: true,
        sessionsError: null,
        sessionCounts: {
          running: sessions.filter(s => s.status === 'running').length,
          active: sessions.filter(s => s.status === 'active').length,
          idle: sessions.filter(s => s.status === 'idle').length,
          total: sessions.length,
        },
      });
      
      return sessions;
    } catch (err) {
      logger.error('Failed to fetch sessions', err);
      set({ sessionsError: err.message });
      return get().sessions; // Return stale data on error
    }
  },
  
  // Start global session polling (called once from Layout)
  startSessionPolling: () => {
    const state = get();
    
    // Don't start if already running
    if (state.sessionPollingInterval) return;
    
    // Initial fetch
    get().fetchSessions();
    
    const interval = setInterval(() => {
      get().fetchSessions();
    }, SESSION_POLLING_INTERVAL);
    
    set({ sessionPollingInterval: interval });
  },
  
  // Stop global session polling
  stopSessionPolling: () => {
    const state = get();
    if (state.sessionPollingInterval) {
      clearInterval(state.sessionPollingInterval);
      set({ sessionPollingInterval: null });
    }
  },
  
  // Check OpenClaw workspace service health
  checkOpenClawHealth: async () => {
    try {
      const response = await api.get('/openclaw/workspace/status');
      const isHealthy = response.data?.data?.accessible === true;
      const currentState = get();
      
      // Only update if the state actually changed to prevent unnecessary re-renders
      if (currentState.isConnected !== isHealthy) {
        // Clear any pending stabilization timer
        if (currentState.connectionStableTimer) {
          clearTimeout(currentState.connectionStableTimer);
        }
        
        // For going offline, apply immediately (user should know right away)
        // For going online, add a small delay to ensure it's stable
        if (!isHealthy) {
          set({ isConnected: false, connectionStableTimer: null });
        } else {
          // Wait 1 second before marking as online to ensure stability
          const timer = setTimeout(() => {
            set({ isConnected: true, connectionStableTimer: null });
          }, 1000);
          set({ connectionStableTimer: timer });
        }
      }
      return isHealthy;
    } catch (error) {
      logger.warn('OpenClaw health check failed', { error: error.message });
      const currentState = get();
      
      // Only update if currently showing as connected
      if (currentState.isConnected) {
        set({ isConnected: false });
      }
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
  
  // Cleanup function to clear all mood timers, health checks, and session polling
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
    if (state.connectionStableTimer) {
      clearTimeout(state.connectionStableTimer);
    }
    if (state.sessionPollingInterval) {
      clearInterval(state.sessionPollingInterval);
    }
    set({ moodTimers: {}, healthCheckInterval: null, connectionStableTimer: null, sessionPollingInterval: null });
  },
  
  // Computed properties
  isWorking: () => get().inflightRequests > 0,
  getActivityStatus: () => {
    const state = get();
    if (!state.isConnected) return 'Offline';
    // If OpenClaw agents are actively running (updated within 2 min), show Working
    if (state.sessionCounts.running > 0) return 'Working';
    // If dashboard has in-flight requests, show Working
    if (state.inflightRequests > 0) return 'Working';
    // If agents have recent activity (within 30 min), show Active
    if (state.sessionCounts.active > 0) return 'Active';
    return 'Idle';
  },
  getActivityLabel: () => {
    const state = get();
    if (!state.isConnected) return 'Offline - Reconnecting...';
    if (state.sessionCounts.running > 0) {
      const count = state.sessionCounts.running;
      return `${count} agent${count > 1 ? 's' : ''} running`;
    }
    if (state.inflightRequests > 0) return 'Working on tasks...';
    if (state.sessionCounts.active > 0) {
      const count = state.sessionCounts.active;
      return `${count} agent${count > 1 ? 's' : ''} active`;
    }
    return 'Ready for tasks';
  },
}));
