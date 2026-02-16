import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlayIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import SessionList from '../components/SessionList';
import SessionDetailPanel from '../components/SessionDetailPanel';
import CronJobList from '../components/CronJobList';
import { getCronJobs } from '../api/client';
import { useBotStore } from '../stores/botStore';
import logger from '../utils/logger';

export default function TaskManagerOverview() {
  const navigate = useNavigate();
  // Sessions come from the global store (single poller in GlobalSessionPoller)
  const sessions = useBotStore((state) => state.sessions);
  const sessionsLoaded = useBotStore((state) => state.sessionsLoaded);
  const sessionsError = useBotStore((state) => state.sessionsError);
  const fetchSessions = useBotStore((state) => state.fetchSessions);

  const [cronJobs, setCronJobs] = useState([]);
  const [cronJobsLoading, setCronJobsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  // Fetch cron job configuration (one-time, no polling needed)
  const loadCronJobs = useCallback(async () => {
    try {
      setCronJobsLoading(true);
      const data = await getCronJobs();
      setCronJobs(data || []);
    } catch (err) {
      logger.error('Failed to fetch cron jobs', err);
    } finally {
      setCronJobsLoading(false);
    }
  }, []);

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

  // Initial load for cron jobs only (sessions are polled globally)
  useEffect(() => {
    loadCronJobs();
  }, [loadCronJobs]);

  const handleRefresh = async () => {
    await fetchSessions();
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

  // Calculate cron job health metrics
  const cronJobIssues = useMemo(() => {
    let issueCount = 0;
    cronJobs.forEach(job => {
      // Skip disabled jobs
      if (job.enabled === false) return;
      
      // Check if not scheduled (no nextRunAt or lastRunAt)
      if (!job.nextRunAt && !job.lastRunAt) {
        issueCount++;
        return;
      }
      
      // Check if missed (nextRunAt in the past)
      if (job.nextRunAt) {
        const nextRunDate = new Date(job.nextRunAt);
        const now = new Date();
        if (nextRunDate < now) {
          issueCount++;
          return;
        }
      }
      
      // Check explicit error status
      if (job.status === "error") {
        issueCount++;
      }
    });
    return issueCount;
  }, [cronJobs]);

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
              label="Cron Jobs"
              sublabel={cronJobIssues > 0 ? `${cronJobIssues} issue${cronJobIssues !== 1 ? 's' : ''}` : 'All healthy'}
              value={cronJobs.length}
              icon={cronJobIssues > 0 ? ExclamationTriangleIcon : CalendarDaysIcon}
              color={cronJobIssues > 0 ? "yellow" : "primary"}
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

          {/* Active Sessions (running + active, differentiated by label) */}
          <SessionList 
            sessions={[...runningSessions, ...activeSessions]}
            title="Active Sessions"
            emptyMessage="No active sessions"
            onSessionClick={handleSessionClick}
          />

          {/* Idle Sessions */}
          <SessionList 
            sessions={idleSessions}
            title="Idle Sessions"
            emptyMessage="No idle sessions"
            onSessionClick={handleSessionClick}
          />

          {/* Cron Jobs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-100">Cron Jobs</h3>
              <button
                onClick={() => navigate('/cron-jobs')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-400 hover:text-primary-300 hover:bg-dark-800 rounded transition-colors"
              >
                Manage Jobs
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
            <CronJobList jobs={cronJobs} isLoading={cronJobsLoading} />
          </div>
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
