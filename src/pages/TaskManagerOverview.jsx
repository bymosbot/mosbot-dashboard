import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  PlayIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import SessionList from '../components/SessionList';
import SessionDetailPanel from '../components/SessionDetailPanel';
import { useBotStore } from '../stores/botStore';
import { getCronJobs } from '../api/client';
import logger from '../utils/logger';

export default function TaskManagerOverview() {
  // Sessions come from the global store (single poller in GlobalSessionPoller)
  const sessions = useBotStore((state) => state.sessions);
  const sessionsLoaded = useBotStore((state) => state.sessionsLoaded);
  const sessionsError = useBotStore((state) => state.sessionsError);
  const fetchSessions = useBotStore((state) => state.fetchSessions);

  const [selectedSession, setSelectedSession] = useState(null);

  // Recent cron/heartbeat activity
  const [recentJobs, setRecentJobs] = useState([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);

  const loadRecentActivity = useCallback(async () => {
    try {
      const jobs = await getCronJobs();
      // Filter to jobs that have actually run, sorted by lastRunAt descending
      const ranJobs = (jobs || [])
        .filter(j => j.lastRunAt)
        .sort((a, b) => new Date(b.lastRunAt) - new Date(a.lastRunAt));
      setRecentJobs(ranJobs);
      setJobsLoaded(true);
    } catch (err) {
      logger.error('Failed to load recent cron activity', err);
    }
  }, []);

  // Transform cron/heartbeat jobs into session-shaped objects so they can
  // be rendered by the same SessionRow component used for Active / Idle lists.
  // For cron jobs: use actual execution data from job.lastExecution (queried from cron sessions)
  // For heartbeats: use the agent's main session data (proxy is correct for heartbeats)
  const recentActivitySessions = useMemo(() => {
    // Build a lookup: agentId -> most-recent session for that agent (for heartbeat fallback)
    const agentSessionMap = new Map();
    sessions.forEach(s => {
      if (!s.agent) return;
      const existing = agentSessionMap.get(s.agent);
      if (!existing || (s.updatedAt || 0) > (existing.updatedAt || 0)) {
        agentSessionMap.set(s.agent, s);
      }
    });

    return recentJobs.map(job => {
      // For heartbeat jobs, pull from the agent's main session (correct approach)
      // For cron jobs, prefer lastExecution data (actual cron run), fallback to agent session
      const isHeartbeat = job.source === 'config';
      const agentSession = job.agentId ? agentSessionMap.get(job.agentId) : null;
      const executionData = job.lastExecution || {};

      // Map job status to a session-style status for the badge colour
      let status = 'idle';
      const jobStatus = (job.status || '').toLowerCase();
      if (jobStatus === 'running' || jobStatus === 'pending') {
        status = 'running';
      } else if (jobStatus === 'ok' || jobStatus === 'success' || jobStatus === 'completed') {
        status = 'completed';
      } else if (jobStatus === 'failed' || jobStatus === 'error') {
        status = 'failed';
      } else if (job.lastRunAt) {
        // If it ran recently (within 30 min), show as active
        const age = Date.now() - new Date(job.lastRunAt).getTime();
        if (age < 30 * 60 * 1000) status = 'active';
      }

      // For cron jobs: if execution data is unavailable (isolated sessions not accessible),
      // show a fallback message instead of zeros
      const executionUnavailable = !isHeartbeat && executionData.unavailable;

      return {
        id: `activity-${job.jobId || job.id || job.name}`,
        key: executionData.sessionKey || null,
        label: job.name,
        status,
        kind: job.source === 'config' ? 'heartbeat' : 'cron',
        updatedAt: job.lastRunAt ? new Date(job.lastRunAt).getTime() : null,
        agent: job.agentId || null,
        // For cron: prefer lastExecution data, fallback to agent model
        // For heartbeat: use agent session data
        model: isHeartbeat 
          ? (agentSession?.model || job.agentModel || null)
          : (executionData.model || job.agentModel || agentSession?.model || null),
        // Token / cost / context: prefer execution data for cron, use agent session for heartbeat
        // If execution data is unavailable, use null instead of 0 to trigger fallback display
        contextTokens: isHeartbeat
          ? (agentSession?.contextTokens || 0)
          : (executionUnavailable ? null : (executionData.contextTokens || 0)),
        totalTokensUsed: isHeartbeat
          ? (agentSession?.totalTokensUsed || 0)
          : (executionUnavailable ? null : (executionData.totalTokensUsed || 0)),
        contextUsagePercent: isHeartbeat
          ? (agentSession?.contextUsagePercent || 0)
          : (executionUnavailable ? null : (executionData.contextUsagePercent || 0)),
        inputTokens: isHeartbeat
          ? (agentSession?.inputTokens || 0)
          : (executionUnavailable ? null : (executionData.inputTokens || 0)),
        outputTokens: isHeartbeat
          ? (agentSession?.outputTokens || 0)
          : (executionUnavailable ? null : (executionData.outputTokens || 0)),
        messageCost: isHeartbeat
          ? (agentSession?.messageCost || 0)
          : (executionUnavailable ? null : (executionData.messageCost || 0)),
        lastMessage: isHeartbeat
          ? (agentSession?.lastMessage || null)
          : (executionUnavailable 
              ? `Status: ${executionData.status || 'unknown'} (Duration: ${executionData.durationMs ? Math.round(executionData.durationMs / 1000) + 's' : 'N/A'})`
              : (executionData.lastMessage || null)),
        lastMessageRole: isHeartbeat
          ? (agentSession?.lastMessageRole || null)
          : (executionData.lastMessageRole || null),
      };
    });
  }, [recentJobs, sessions]);

  useEffect(() => {
    loadRecentActivity();
  }, [loadRecentActivity]);

  // Calculate metrics from sessions
  const metrics = useMemo(() => {
    const totalTokens = sessions.reduce((sum, session) => {
      return sum + (session.inputTokens || 0) + (session.outputTokens || 0);
    }, 0);

    const totalCost = sessions.reduce((sum, session) => {
      return sum + (session.messageCost || 0);
    }, 0);

    return { totalTokens, totalCost };
  }, [sessions]);

  const handleRefresh = async () => {
    await Promise.all([fetchSessions(), loadRecentActivity()]);
  };

  const handleSessionClick = useCallback((session) => {
    setSelectedSession(session);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedSession(null);
  }, []);

  // Calculate session KPIs
  const runningCount = sessions.filter(s => s.status === 'running').length;
  const activeCount = sessions.filter(s => s.status === 'active').length;
  const idleCount = sessions.filter(s => s.status === 'idle').length;

  // Filter sessions for display
  // "Running" = actively processing (updated within 2 min)
  // "Active" = recently used (updated within 30 min)
  // "Idle" = not recently active (updated >30 min ago)
  const runningSessions = sessions.filter(s => s.status === 'running');
  const activeSessions = sessions.filter(s => s.status === 'active');
  const idleSessions = sessions.filter(s => s.status === 'idle');

  if (!sessionsLoaded && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-dark-400">Loading overview...</p>
        </div>
      </div>
    );
  }

  if (sessionsError && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading overview</p>
          <p className="text-dark-500 text-sm">{sessionsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Task Manager Overview" 
        subtitle="Real-time monitoring of agent sessions and task metrics"
        onRefresh={handleRefresh}
      />
      
      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              label="Running"
              value={runningCount}
              icon={PlayIcon}
              color="green"
            />
            <StatCard 
              label="Active"
              value={activeCount}
              icon={ChartBarIcon}
              color="blue"
            />
            <StatCard 
              label="Idle"
              value={idleCount}
              icon={ClockIcon}
              color="yellow"
            />
            <StatCard 
              label="Recent Tokens"
              sublabel="Last message per session"
              value={metrics.totalTokens.toLocaleString()}
              icon={CircleStackIcon}
              color="purple"
            />
            <StatCard 
              label="Recent Cost"
              sublabel="Last message per session"
              value={`$${metrics.totalCost.toFixed(4)}`}
              icon={CurrencyDollarIcon}
              color="primary"
            />
          </div>

          {/* Active Sessions — only shown when sessions are running */}
          {runningSessions.length > 0 && (
            <SessionList 
              sessions={runningSessions}
              title="Active Sessions"
              emptyMessage="No active sessions"
              onSessionClick={handleSessionClick}
            />
          )}

          {/* Recent Activity — cron and heartbeat job runs */}
          {jobsLoaded && recentActivitySessions.length > 0 && (
            <SessionList
              sessions={recentActivitySessions}
              title="Recent Activity"
              emptyMessage="No recent activity"
              onSessionClick={handleSessionClick}
              displayActiveAsIdle
            />
          )}

          {/* Idle Sessions — active + idle (non-running); fallback when none are running */}
          <SessionList 
            sessions={[...activeSessions, ...idleSessions]}
            title="Idle Sessions"
            emptyMessage="No idle sessions"
            onSessionClick={handleSessionClick}
            displayActiveAsIdle
          />
        </div>
      </div>

      {/* Session Detail Panel */}
      <SessionDetailPanel 
        isOpen={!!selectedSession}
        onClose={handleClosePanel}
        session={selectedSession}
      />
    </div>
  );
}
