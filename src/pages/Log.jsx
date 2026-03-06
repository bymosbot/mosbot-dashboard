import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useActivityStore } from '../stores/activityStore';
import { parseDatabaseDate } from '../utils/helpers';
import { format } from 'date-fns';
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  BoltIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  FolderIcon,
  UserGroupIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import ActivityFeedFilters from '../components/ActivityFeedFilters';
import ResetConfirmationModal from '../components/ResetConfirmationModal';
import { resetActivityLogs } from '../api/client';
import logger from '../utils/logger';

const REFRESH_INTERVAL_MS = 60_000; // 1 minute

// ============================================================================
// Event type metadata — icon, color, label
// ============================================================================

const EVENT_META = {
  task_executed: {
    icon: CheckCircleIcon,
    color: 'text-green-400',
    dot: 'bg-green-500',
    badge: 'text-green-400 bg-green-500/10 border-green-500/20',
    label: 'Task',
  },
  cron_run: {
    icon: ClockIcon,
    color: 'text-purple-400',
    dot: 'bg-purple-500',
    badge: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    label: 'Cron',
  },
  heartbeat_run: {
    icon: HeartIcon,
    color: 'text-blue-400',
    dot: 'bg-blue-500',
    badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    label: 'Heartbeat',
  },
  heartbeat_attention: {
    icon: ExclamationTriangleIcon,
    color: 'text-amber-400',
    dot: 'bg-amber-500',
    badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    label: 'Attention',
  },
  adhoc_request: {
    icon: ChatBubbleLeftRightIcon,
    color: 'text-cyan-400',
    dot: 'bg-cyan-500',
    badge: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    label: 'Adhoc',
  },
  subagent_request: {
    icon: CpuChipIcon,
    color: 'text-indigo-400',
    dot: 'bg-indigo-500',
    badge: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    label: 'Subagent',
  },
  subagent_completed: {
    icon: CpuChipIcon,
    color: 'text-indigo-400',
    dot: 'bg-indigo-500',
    badge: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    label: 'Subagent',
  },
  workspace_file_created: {
    icon: FolderIcon,
    color: 'text-teal-400',
    dot: 'bg-teal-500',
    badge: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    label: 'Workspace',
  },
  workspace_file_updated: {
    icon: FolderIcon,
    color: 'text-teal-400',
    dot: 'bg-teal-500',
    badge: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    label: 'Workspace',
  },
  workspace_file_deleted: {
    icon: FolderIcon,
    color: 'text-red-400',
    dot: 'bg-red-500',
    badge: 'text-red-400 bg-red-500/10 border-red-500/20',
    label: 'Workspace',
  },
  agent_created: {
    icon: UserGroupIcon,
    color: 'text-violet-400',
    dot: 'bg-violet-500',
    badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    label: 'Agents',
  },
  agent_updated: {
    icon: UserGroupIcon,
    color: 'text-violet-400',
    dot: 'bg-violet-500',
    badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    label: 'Agents',
  },
  cron_job_created: {
    icon: BoltIcon,
    color: 'text-yellow-400',
    dot: 'bg-yellow-500',
    badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    label: 'Scheduler',
  },
  cron_job_updated: {
    icon: BoltIcon,
    color: 'text-yellow-400',
    dot: 'bg-yellow-500',
    badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    label: 'Scheduler',
  },
  cron_job_deleted: {
    icon: BoltIcon,
    color: 'text-red-400',
    dot: 'bg-red-500',
    badge: 'text-red-400 bg-red-500/10 border-red-500/20',
    label: 'Scheduler',
  },
  cron_job_triggered: {
    icon: BoltIcon,
    color: 'text-yellow-400',
    dot: 'bg-yellow-500',
    badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    label: 'Triggered',
  },
  legacy: {
    icon: InformationCircleIcon,
    color: 'text-dark-400',
    dot: 'bg-dark-500',
    badge: 'text-dark-400 bg-dark-500/10 border-dark-500/20',
    label: 'Legacy',
  },
  system: {
    icon: InformationCircleIcon,
    color: 'text-dark-400',
    dot: 'bg-dark-500',
    badge: 'text-dark-400 bg-dark-500/10 border-dark-500/20',
    label: 'System',
  },
};

const SEVERITY_META = {
  info: { icon: InformationCircleIcon, color: 'text-dark-400' },
  warning: { icon: ExclamationTriangleIcon, color: 'text-amber-400' },
  attention: { icon: ExclamationTriangleIcon, color: 'text-amber-400' },
  error: { icon: XCircleIcon, color: 'text-red-400' },
};

function getEventMeta(eventType) {
  return EVENT_META[eventType] || EVENT_META.system;
}

// ============================================================================
// Helpers
// ============================================================================

const groupByDay = (logs) => {
  const groups = {};

  logs.forEach((log) => {
    const date = parseDatabaseDate(log.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        dateLabel: format(date, 'EEEE, MMMM d').toUpperCase(),
        logs: [],
      };
    }

    groups[dateKey].logs.push(log);
  });

  return Object.values(groups).sort((a, b) => b.date - a.date);
};

function formatModel(model) {
  if (!model) return null;
  const modelPart = model.includes('/') ? model.split('/').pop() : model;
  const lower = modelPart.toLowerCase();
  if (lower.includes('kimi-k2')) return 'Kimi K2.5';
  if (lower.includes('opus-4')) return 'Opus 4';
  if (lower.includes('sonnet-4')) return 'Sonnet 4.5';
  if (lower.includes('haiku-4')) return 'Haiku 4.5';
  if (lower.includes('gemini-2.5-flash-lite')) return 'Gemini Flash Lite';
  if (lower.includes('gemini-2.5-flash')) return 'Gemini Flash';
  if (lower.includes('gemini-2.5')) return 'Gemini 2.5';
  if (lower.includes('gpt-5')) return 'GPT-5.2';
  if (lower.includes('deepseek')) return 'DeepSeek';
  return modelPart;
}

// ============================================================================
// Action pills — clickthrough links derived from the `links` object or raw fields
// ============================================================================

function ActionPills({ log }) {
  const pills = [];

  if (log.task_id) {
    pills.push(
      <Link
        key="task"
        to={`/task/${log.task_id}`}
        className="flex items-center gap-1 px-2 py-0.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded text-[11px] font-medium transition-colors border border-primary-500/20"
        title={`View task: ${log.task_title || 'Task'}`}
      >
        <span>{log.task_title || 'Task'}</span>
        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
      </Link>,
    );
  }

  if (log.session_key) {
    pills.push(
      <Link
        key="session"
        to={`/monitor?sessionKey=${encodeURIComponent(log.session_key)}`}
        className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded text-[11px] font-medium transition-colors border border-cyan-500/20"
        title="Open in Agent Monitor"
      >
        <span>Monitor</span>
        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
      </Link>,
    );
  }

  if (log.job_id) {
    pills.push(
      <Link
        key="job"
        to={`/scheduler?jobId=${encodeURIComponent(log.job_id)}`}
        className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded text-[11px] font-medium transition-colors border border-purple-500/20"
        title="Open in Scheduler"
      >
        <span>Scheduler</span>
        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
      </Link>,
    );
  }

  if (log.workspace_path) {
    const isProject =
      log.workspace_path.startsWith('/projects') ||
      log.workspace_path.startsWith('/shared/projects');
    const isOpenClawConfig = log.workspace_path === '/openclaw.json';

    let linkTo, linkLabel;
    if (isOpenClawConfig) {
      linkTo = '/settings/openclaw-config';
      linkLabel = 'Config';
    } else if (isProject) {
      linkTo = '/projects';
      linkLabel = 'Projects';
    } else {
      linkTo = '/workspaces';
      linkLabel = 'Workspace';
    }

    pills.push(
      <Link
        key="workspace"
        to={linkTo}
        className="flex items-center gap-1 px-2 py-0.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 rounded text-[11px] font-medium transition-colors border border-teal-500/20"
        title={log.workspace_path}
      >
        <span>{linkLabel}</span>
        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
      </Link>,
    );
  }

  if (pills.length === 0) return null;
  return <div className="flex items-center gap-1.5 flex-wrap">{pills}</div>;
}

// ============================================================================
// Severity badge
// ============================================================================

function SeverityBadge({ severity }) {
  if (!severity || severity === 'info') return null;
  const meta = SEVERITY_META[severity] || SEVERITY_META.info;
  const Icon = meta.icon;
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ============================================================================
// Unified entry component
// ============================================================================

function ActivityEntry({ log }) {
  const timestamp = parseDatabaseDate(log.timestamp);
  const timeLabel = format(timestamp, 'h:mm a');
  const meta = getEventMeta(log.event_type);
  const Icon = meta.icon;

  const displayModel = log.meta?.model ? formatModel(log.meta.model) : null;

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Event type dot */}
      <div
        className={`absolute left-0 top-2 -translate-x-[9px] w-4 h-4 ${meta.dot} rounded-full border-2 border-dark-950 flex items-center justify-center`}
      >
        <Icon className="w-2.5 h-2.5 text-white" />
      </div>

      <div className="text-xs text-dark-500 font-medium mb-2">{timeLabel}</div>

      <div className="card p-4 hover:bg-dark-800/50 transition-colors border-dark-700/50">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <h3 className="text-sm font-medium text-dark-200 truncate">{log.title}</h3>
            <span
              className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${meta.badge}`}
            >
              {meta.label}
            </span>
            <SeverityBadge severity={log.severity} />
          </div>
          <ActionPills log={log} />
        </div>

        {/* Description */}
        {log.description && (
          <p className="text-sm text-dark-400 leading-relaxed whitespace-pre-line mb-2">
            {log.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-dark-500 flex-wrap">
          {log.agent_name && (
            <span>
              <span className="text-dark-600">Agent:</span>{' '}
              <span className="text-primary-400 font-medium">{log.agent_name}</span>
            </span>
          )}
          {log.actor_name && (
            <span>
              <span className="text-dark-600">By:</span>{' '}
              <span className="text-dark-300">{log.actor_name}</span>
            </span>
          )}
          {displayModel && (
            <span>
              <span className="text-dark-600">Model:</span>{' '}
              <span className="text-dark-300 font-mono text-[11px]">{displayModel}</span>
            </span>
          )}
          {log.workspace_path && (
            <span
              className="font-mono text-[11px] text-dark-500 truncate max-w-xs"
              title={log.workspace_path}
            >
              {log.workspace_path}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function Log() {
  const { logs, isLoading, isLoadingMore, hasMore, fetchActivity, loadMoreActivity } =
    useActivityStore();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchActivity({ limit: 50 }).catch((error) => {
      logger.error('Failed to fetch activity feed', error);
    });
    intervalRef.current = setInterval(() => {
      fetchActivity({ limit: 50 }).catch((error) => {
        logger.error('Failed to refresh activity feed', error);
      });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchActivity]);

  const handleLoadMore = () => {
    loadMoreActivity().catch((error) => {
      logger.error('Failed to load more activity', error);
    });
  };

  const handleReset = async (password) => {
    await resetActivityLogs(password);
    // Refresh the activity feed after reset
    await fetchActivity({ limit: 50 });
  };

  const groupedLogs = groupByDay(logs);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Activity Log"
        subtitle={`Workspace-wide agent activity, cron runs, and events • ${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`}
      >
        {!isLoading && logs.length > 0 && (
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            title="Reset all activity logs"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </Header>

      <ActivityFeedFilters />

      <div className="flex-1 p-3 md:p-6 overflow-y-auto bg-dark-950">
        <div>
          {isLoading ? (
            <div className="card p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <h3 className="text-lg font-medium text-dark-400">Loading activity...</h3>
            </div>
          ) : logs.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-dark-400 mb-2">No Activity Yet</h3>
              <p className="text-dark-500">Agent activity will appear here as it works</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedLogs.map((group) => (
                <div key={group.dateLabel} className="space-y-4">
                  {/* Date header */}
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-dark-700 rounded-sm" />
                    <h2 className="text-sm font-semibold text-dark-500 tracking-wider">
                      {group.dateLabel}
                    </h2>
                  </div>

                  {/* Timeline entries */}
                  <div className="ml-1.5 border-l-2 border-dark-800 space-y-0">
                    {group.logs.map((log) => (
                      <ActivityEntry key={log.id} log={log} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && !isLoading && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="btn-secondary flex items-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Load More</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleReset}
        title="Reset Activity Logs"
        dataType="activity logs"
        description="Are you sure you want to permanently delete all activity logs? This includes all workspace-wide agent activity, cron runs, events, and task executions. This action cannot be undone and the data cannot be recovered."
        confirmButtonText="Reset All Logs"
      />
    </div>
  );
}
