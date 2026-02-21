import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  PlayIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  CircleStackIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import SessionList from '../components/SessionList';
import SessionDetailPanel from '../components/SessionDetailPanel';
import { useBotStore } from '../stores/botStore';
import { useAgentStore } from '../stores/agentStore';
import { useUsageStore } from '../stores/usageStore';
import { getCronJobs, deleteCronJob, deleteSession } from '../api/client';
import logger from '../utils/logger';
import { classNames } from '../utils/helpers';
import { useToastStore } from '../stores/toastStore';

const SESSION_TYPES = [
  { id: 'main', label: 'Main' },
  { id: 'subagent', label: 'Subagent' },
  { id: 'cron', label: 'Cron' },
  { id: 'heartbeat', label: 'Heartbeat' },
];

export default function TaskManagerOverview() {
  // Sessions come from the global store (single poller in GlobalSessionPoller)
  const sessions = useBotStore((state) => state.sessions);
  const sessionsLoaded = useBotStore((state) => state.sessionsLoaded);
  const sessionsError = useBotStore((state) => state.sessionsError);
  const fetchSessions = useBotStore((state) => state.fetchSessions);
  const agents = useAgentStore((state) => state.agents).filter((a) => a.id !== 'archived');

  const todaySummary = useUsageStore((state) => state.todaySummary);
  const fetchTodaySummary = useUsageStore((state) => state.fetchTodaySummary);

  const showToast = useToastStore((state) => state.showToast);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('live');
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterAgents, setFilterAgents] = useState([]);

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
      // Match CronJobList: source: 'config' OR payload.kind OR jobId/id prefix OR name
      const jobIdentifier = job.jobId || job.id || '';
      const isHeartbeat =
        job.source === 'config' ||
        job.payload?.kind === 'heartbeat' ||
        String(jobIdentifier).startsWith('heartbeat-') ||
        /heartbeat/i.test(job.name || '');
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

      // For heartbeat jobs, sessionKey may be missing from lastExecution; use agent's main session key
      // since heartbeat runs in the agent's main session (e.g. agent:cmo:main)
      // If agentSession is not found, construct the expected session key from agentId
      let sessionKey = executionData.sessionKey || null;
      if (!sessionKey && isHeartbeat && job.agentId) {
        // Try to get from agent session first, otherwise construct expected key
        // Special case: 'main' agent uses 'main' as session key, others use 'agent:{id}:main'
        sessionKey = agentSession?.key || (job.agentId === 'main' ? 'main' : `agent:${job.agentId}:main`);
      }

      return {
        id: `activity-${job.jobId || job.id || job.name}`,
        jobId: job.jobId || job.id || null,
        isDeletable: !isHeartbeat,
        key: sessionKey,
        label: job.name,
        status,
        kind: isHeartbeat ? 'heartbeat' : 'cron',
        updatedAt: job.lastRunAt ? new Date(job.lastRunAt).getTime() : null,
        agent: job.agentId || null,
        // For cron: use actual execution model only (avoid showing agent config model as session model)
        // For heartbeat: use agent session data (heartbeat runs in the main session)
        model: isHeartbeat 
          ? (agentSession?.model || null)
          : (executionUnavailable ? null : (executionData.model || null)),
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
        cacheReadTokens: isHeartbeat
          ? (agentSession?.cacheReadTokens || 0)
          : (executionUnavailable ? null : (executionData.cacheReadTokens || 0)),
        cacheWriteTokens: isHeartbeat
          ? (agentSession?.cacheWriteTokens || 0)
          : (executionUnavailable ? null : (executionData.cacheWriteTokens || 0)),
        messageCost: isHeartbeat
          ? (agentSession?.messageCost || 0)
          : (executionUnavailable ? null : (executionData.messageCost || 0)),
        todayTotalCost: isHeartbeat
          ? null
          : (executionUnavailable ? null : (executionData.todayTotalCost || null)),
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

  useEffect(() => {
    fetchTodaySummary();
  }, [fetchTodaySummary]);

  const handleRefresh = async () => {
    await Promise.all([fetchSessions(), loadRecentActivity(), fetchTodaySummary()]);
  };

  const handleSessionClick = useCallback((session) => {
    setSelectedSession(session);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedSession(null);
  }, []);

  const handleDeleteSession = useCallback(
    async (session) => {
      if (!session?.jobId || !session?.isDeletable) return;
      const confirmed = window.confirm(
        `Delete cron job "${session.label || session.id}"? This cannot be undone.`
      );
      if (!confirmed) return;
      try {
        await deleteCronJob(session.jobId);
        showToast("Cron job deleted successfully", "success");
      } catch (err) {
        const status = err.response?.status;
        if (status === 404) {
          showToast("Cron job already removed", "info");
        } else {
          showToast(
            err.response?.data?.error?.message || "Failed to delete cron job",
            "error"
          );
          return;
        }
      }
      setSelectedSession((prev) =>
        prev && (prev.jobId === session.jobId || prev.key === session.key) ? null : prev
      );
      await Promise.all([fetchSessions(), loadRecentActivity()]);
    },
    [fetchSessions, loadRecentActivity, showToast]
  );

  // Filter helper: session passes if (no type filter OR kind matches) AND (no agent filter OR agent matches)
  const passesFilters = useCallback((session) => {
    const sessionKind = session.kind || 'main';
    const sessionAgent = session.agent || session.agentId || null;
    const typeMatch = filterTypes.length === 0 || filterTypes.includes(sessionKind);
    const agentMatch =
      filterAgents.length === 0 ||
      (sessionAgent && filterAgents.includes(sessionAgent)) ||
      (sessionAgent === 'main' && filterAgents.includes('main'));
    return typeMatch && agentMatch;
  }, [filterTypes, filterAgents]);

  // Filter sessions for display
  // "Running" = actively processing (updated within 2 min)
  // "Active" = recently used (updated within 30 min)
  // "Idle" = not recently active (updated >30 min ago)
  const runningSessions = useMemo(
    () => sessions.filter((s) => s.status === 'running' && passesFilters(s)),
    [sessions, passesFilters]
  );
  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'active' && passesFilters(s)),
    [sessions, passesFilters]
  );
  const idleSessions = useMemo(
    () => sessions.filter((s) => s.status === 'idle' && passesFilters(s)),
    [sessions, passesFilters]
  );
  const filteredRecentActivitySessions = useMemo(
    () => recentActivitySessions.filter(passesFilters),
    [recentActivitySessions, passesFilters]
  );

  const runningCount = runningSessions.length;
  const activeCount = activeSessions.length;
  const idleCount = idleSessions.length;
  const idleSessionsCount = activeCount + idleCount;

  // KPIs: use filtered counts for display consistency
  const allDisplayedSessionsFiltered = useMemo(() => {
    const sessionMap = new Map();
    [runningSessions, activeSessions, idleSessions].forEach((list) =>
      list.forEach((s) => {
        if (s.key) sessionMap.set(s.key, s);
        else if (s.id) sessionMap.set(s.id, s);
      })
    );
    filteredRecentActivitySessions.forEach((s) => {
      if (s.key && !sessionMap.has(s.key)) sessionMap.set(s.key, s);
      else if (!sessionMap.has(s.id)) sessionMap.set(s.id, s);
    });
    return Array.from(sessionMap.values());
  }, [runningSessions, activeSessions, idleSessions, filteredRecentActivitySessions]);

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
        title="Agent Monitor" 
        subtitle="Live view of all agent sessions, scheduled jobs, and recent activity"
        onRefresh={handleRefresh}
      />
      
      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              label="Running Sessions"
              value={runningCount}
              icon={PlayIcon}
              color="green"
            />
            <StatCard 
              label="Idle Sessions"
              sublabel={`${activeCount} active, ${idleCount} idle`}
              value={idleSessionsCount}
              icon={ClockIcon}
              color="yellow"
            />
            <StatCard 
              label="All Sessions"
              value={allDisplayedSessionsFiltered.length}
              icon={ChartBarIcon}
              color="blue"
            />
            <StatCard 
              label="Today's Tokens"
              sublabel="Input + output"
              value={todaySummary
                ? ((todaySummary.totalTokensInput + todaySummary.totalTokensOutput) || 0).toLocaleString()
                : '—'}
              icon={CircleStackIcon}
              color="purple"
            />
            <StatCard 
              label="Today's Cost"
              sublabel="All sessions"
              value={todaySummary
                ? `$${Number(todaySummary.totalCostUsd).toFixed(4)}`
                : '—'}
              icon={CurrencyDollarIcon}
              color="primary"
            />
          </div>

          {/* Inline filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 py-1">
            {/* Type pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-dark-500 uppercase tracking-wider flex-shrink-0">Type</span>
              {SESSION_TYPES.map(({ id, label }) => {
                const isSelected = filterTypes.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setFilterTypes((prev) =>
                        isSelected ? prev.filter((t) => t !== id) : [...prev, id]
                      )
                    }
                    className={classNames(
                      "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors",
                      isSelected
                        ? "bg-primary-500/20 text-primary-400 border-primary-500/40"
                        : "bg-dark-800 text-dark-400 border-dark-700 hover:border-dark-600 hover:text-dark-200"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:block w-px h-5 bg-dark-700 flex-shrink-0" />

            {/* Agent pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-dark-500 uppercase tracking-wider flex-shrink-0">Agent</span>
              <button
                type="button"
                onClick={() =>
                  setFilterAgents((prev) =>
                    prev.includes("main") ? prev.filter((a) => a !== "main") : [...prev, "main"]
                  )
                }
                className={classNames(
                  "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors",
                  filterAgents.includes("main")
                    ? "bg-primary-500/20 text-primary-400 border-primary-500/40"
                    : "bg-dark-800 text-dark-400 border-dark-700 hover:border-dark-600 hover:text-dark-200"
                )}
              >
                Main
              </button>
              {agents.map((agent) => {
                const isSelected = filterAgents.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() =>
                      setFilterAgents((prev) =>
                        isSelected ? prev.filter((a) => a !== agent.id) : [...prev, agent.id]
                      )
                    }
                    className={classNames(
                      "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors",
                      isSelected
                        ? "bg-primary-500/20 text-primary-400 border-primary-500/40"
                        : "bg-dark-800 text-dark-400 border-dark-700 hover:border-dark-600 hover:text-dark-200"
                    )}
                  >
                    {agent.icon ? `${agent.icon} ` : ""}{agent.name || agent.id}
                  </button>
                );
              })}
            </div>

            {/* Clear — only visible when active */}
            {(filterTypes.length > 0 || filterAgents.length > 0) && (
              <>
                <div className="hidden sm:block w-px h-5 bg-dark-700 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => { setFilterTypes([]); setFilterAgents([]); }}
                  className="flex items-center gap-1 text-xs text-dark-500 hover:text-dark-200 transition-colors flex-shrink-0"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                  Clear
                </button>
              </>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-dark-800">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'live'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              Live Sessions
              {runningCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-500/20 text-green-400">
                  {runningCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              Recent Activity
              {filteredRecentActivitySessions.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-dark-700 text-dark-400">
                  {filteredRecentActivitySessions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'live' && (
            <div className="space-y-6">
              <SessionList
                sessions={runningSessions}
                title="Running Sessions"
                emptyMessage={
                  filterTypes.length > 0 || filterAgents.length > 0
                    ? "No running sessions match the current filters"
                    : "No running sessions"
                }
                onSessionClick={handleSessionClick}
                onDeleteSession={handleDeleteSession}
              />
              <SessionList
                sessions={[...activeSessions, ...idleSessions]}
                title="Idle Sessions"
                emptyMessage={
                  filterTypes.length > 0 || filterAgents.length > 0
                    ? "No idle sessions match the current filters"
                    : "No idle sessions"
                }
                onSessionClick={handleSessionClick}
                onDeleteSession={handleDeleteSession}
                displayActiveAsIdle
              />
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              {!jobsLoaded ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-dark-500">Loading recent activity...</p>
                  </div>
                </div>
              ) : (
                <SessionList
                  sessions={filteredRecentActivitySessions}
                  title="Recent Activity"
                  emptyMessage={
                    filterTypes.length > 0 || filterAgents.length > 0
                      ? "No recent activity matches the current filters"
                      : "No recent cron or heartbeat activity"
                  }
                  onSessionClick={handleSessionClick}
                  onDeleteSession={handleDeleteSession}
                  displayActiveAsIdle
                />
              )}
            </div>
          )}
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
