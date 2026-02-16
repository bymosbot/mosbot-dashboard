import { useEffect } from 'react';
import { useBotStore } from '../stores/botStore';

/**
 * GlobalSessionPoller - Starts session polling via the botStore.
 *
 * Mounts once inside Layout so every authenticated page shares a single
 * polling loop (30 s interval).  Each poll fires ~6 requests to the
 * OpenClaw gateway (1 config read + 5 agent tool invocations), so keeping
 * the interval reasonable avoids starving cron jobs and heartbeats.
 *
 * Components that need session data should read from the botStore directly
 * (sessions, sessionCounts, sessionsLoaded, sessionsError) instead of
 * fetching independently.
 */
export default function GlobalSessionPoller() {
  const startSessionPolling = useBotStore((state) => state.startSessionPolling);
  const stopSessionPolling = useBotStore((state) => state.stopSessionPolling);

  useEffect(() => {
    startSessionPolling();
    return () => stopSessionPolling();
  }, [startSessionPolling, stopSessionPolling]);

  // Refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        useBotStore.getState().fetchSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return null;
}
