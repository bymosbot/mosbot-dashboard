import { useState, useEffect, useCallback } from 'react';
import { ClockIcon, CheckCircleIcon, QueueListIcon, PlayIcon } from '@heroicons/react/24/outline';
import Header from '../components/Header';
import { getSubagents } from '../api/client';
import { useToastStore } from '../stores/toastStore';
import { formatDistanceToNow } from 'date-fns';

export default function Subagents() {
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    running: [],
    queued: [],
    completed: [],
    retention: null
  });
  const [error, setError] = useState(null);

  const fetchSubagents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSubagents();
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch subagents');
      showToast(err.message || 'Failed to fetch subagents', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSubagents();

    // Refresh every 30 seconds
    const interval = setInterval(fetchSubagents, 30000);
    return () => clearInterval(interval);
  }, [fetchSubagents]);

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <PlayIcon className="w-3 h-3" />
            Running
          </span>
        );
      case 'SPAWN_QUEUED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <QueueListIcon className="w-3 h-3" />
            Queued
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircleIcon className="w-3 h-3" />
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-dark-700 text-dark-300">
            {status}
          </span>
        );
    }
  };

  if (loading && !data.running.length && !data.queued.length && !data.completed.length) {
    return (
      <div className="flex flex-col h-full">
        <Header 
          title="Subagents" 
          subtitle="Monitor running, queued, and completed subagents"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-dark-400">Loading subagents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data.running.length && !data.queued.length && !data.completed.length) {
    return (
      <div className="flex flex-col h-full">
        <Header 
          title="Subagents" 
          subtitle="Monitor running, queued, and completed subagents"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchSubagents}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasData = data.running.length > 0 || data.queued.length > 0 || data.completed.length > 0;

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Subagents" 
        subtitle="Monitor running, queued, and completed subagents"
      />
      
      <div className="flex-1 p-3 md:p-6 overflow-y-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Running</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{data.running.length}</p>
              </div>
              <PlayIcon className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          
          <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Queued</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{data.queued.length}</p>
              </div>
              <QueueListIcon className="w-8 h-8 text-yellow-400/50" />
            </div>
          </div>
          
          <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{data.completed.length}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-400/50" />
            </div>
          </div>
        </div>

        {/* Retention Info */}
        {data.retention && (
          <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <ClockIcon className="w-5 h-5 text-dark-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-dark-200 mb-1">Data Retention Policy</p>
                <p className="text-xs text-dark-400">
                  Completed subagents are retained for <span className="text-dark-200 font-medium">{data.retention.completedRetentionDays} days</span>.
                  Activity logs are retained for <span className="text-dark-200 font-medium">{data.retention.activityLogRetentionDays} days</span>.
                  Next purge: {formatTimestamp(data.retention.nextPurgeAt)}.
                </p>
              </div>
            </div>
          </div>
        )}

        {!hasData && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <QueueListIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400 text-lg">No subagents found</p>
              <p className="text-dark-500 text-sm mt-2">Subagents will appear here when tasks are executed</p>
            </div>
          </div>
        )}

        {/* Running Subagents */}
        {data.running.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-dark-100 mb-3 flex items-center gap-2">
              <PlayIcon className="w-5 h-5 text-blue-400" />
              Running ({data.running.length})
            </h2>
            <div className="space-y-3">
              {data.running.map((agent, index) => (
                <div key={agent.sessionKey || agent.taskId || `running-${index}`} className="bg-dark-800 border border-dark-700 rounded-lg p-4 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-dark-100">{agent.sessionLabel || 'Unknown'}</p>
                      {agent.taskId && (
                        <p className="text-xs text-dark-400 mt-1">Task ID: {agent.taskId}</p>
                      )}
                    </div>
                    {getStatusBadge(agent.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                    <div>
                      <p className="text-dark-500">Model</p>
                      <p className="text-dark-300 mt-1">{agent.model || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Started</p>
                      <p className="text-dark-300 mt-1">{formatTimestamp(agent.startedAt)}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Timeout</p>
                      <p className="text-dark-300 mt-1">{agent.timeoutMinutes ? `${agent.timeoutMinutes}m` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Session Key</p>
                      <p className="text-dark-300 mt-1 truncate">{agent.sessionKey || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queued Subagents */}
        {data.queued.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-dark-100 mb-3 flex items-center gap-2">
              <QueueListIcon className="w-5 h-5 text-yellow-400" />
              Queued ({data.queued.length})
            </h2>
            <div className="space-y-3">
              {data.queued.map((agent, index) => (
                <div key={agent.taskId || `queued-${index}`} className="bg-dark-800 border border-dark-700 rounded-lg p-4 hover:border-yellow-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-dark-100">{agent.title || 'Untitled'}</p>
                      {agent.taskId && (
                        <p className="text-xs text-dark-400 mt-1">Task ID: {agent.taskId}</p>
                      )}
                    </div>
                    {getStatusBadge(agent.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                    <div>
                      <p className="text-dark-500">Model</p>
                      <p className="text-dark-300 mt-1">{agent.model || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Queued</p>
                      <p className="text-dark-300 mt-1">{formatTimestamp(agent.queuedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Subagents */}
        {data.completed.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-dark-100 mb-3 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
              Completed ({data.completed.length})
            </h2>
            <div className="space-y-3">
              {data.completed.map((agent, index) => (
                <div key={agent.sessionLabel || agent.taskId || `completed-${index}`} className="bg-dark-800 border border-dark-700 rounded-lg p-4 hover:border-green-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-dark-100">{agent.sessionLabel || 'Unknown'}</p>
                      {agent.outcome && (
                        <p className="text-xs text-dark-400 mt-1">{agent.outcome}</p>
                      )}
                      {agent.taskId && (
                        <p className="text-xs text-dark-500 mt-1">Task ID: {agent.taskId}</p>
                      )}
                    </div>
                    {getStatusBadge(agent.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                    <div>
                      <p className="text-dark-500">Started</p>
                      <p className="text-dark-300 mt-1">{formatTimestamp(agent.startedAt)}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Completed</p>
                      <p className="text-dark-300 mt-1">{formatTimestamp(agent.completedAt)}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Duration</p>
                      <p className="text-dark-300 mt-1">{formatDuration(agent.durationSeconds)}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Status</p>
                      <p className="text-dark-300 mt-1">Complete</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
