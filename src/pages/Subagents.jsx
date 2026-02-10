import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, CheckCircleIcon, QueueListIcon, PlayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Header from '../components/Header';
import { getSubagents } from '../api/client';
import { useToastStore } from '../stores/toastStore';
import { formatDistanceToNow } from 'date-fns';
import { stripMarkdown, truncateText } from '../utils/helpers';

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
  const [activeFilter, setActiveFilter] = useState(null); // null means auto-select
  const [selectedOutcome, setSelectedOutcome] = useState(null); // For outcome modal

  const fetchSubagents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSubagents();
      setData(response);
      
      // Auto-select filter on first load if not manually set
      if (activeFilter === null) {
        if (response.running.length > 0) {
          setActiveFilter("running");
        } else if (response.queued.length > 0) {
          setActiveFilter("queued");
        } else {
          setActiveFilter("completed");
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch subagents');
      showToast(err.message || 'Failed to fetch subagents', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, activeFilter]);

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

  const formatTaskKey = (taskNumber) => {
    if (!taskNumber) return null;
    return `TASK-${taskNumber}`;
  };

  const formatOutcomePreview = (outcome) => {
    if (!outcome) return null;
    const stripped = stripMarkdown(outcome);
    return truncateText(stripped, 150);
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

  // Determine which data to show based on active filter
  const getFilteredData = () => {
    switch (activeFilter) {
      case "running":
        return data.running;
      case "queued":
        return data.queued;
      case "completed":
        return data.completed;
      default:
        return [];
    }
  };

  const filteredData = getFilteredData();

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

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveFilter("running")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeFilter === "running"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                : "bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600"
            }`}
          >
            <PlayIcon className="w-4 h-4" />
            Running ({data.running.length})
          </button>
          <button
            onClick={() => setActiveFilter("queued")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeFilter === "queued"
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                : "bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600"
            }`}
          >
            <QueueListIcon className="w-4 h-4" />
            Queued ({data.queued.length})
          </button>
          <button
            onClick={() => setActiveFilter("completed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeFilter === "completed"
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : "bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600"
            }`}
          >
            <CheckCircleIcon className="w-4 h-4" />
            Completed ({data.completed.length})
          </button>
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

        {/* Empty state - no running or queued */}
        {activeFilter === "running" && data.running.length === 0 && data.queued.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <PlayIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400 text-lg">No running or queued agents</p>
              <p className="text-dark-500 text-sm mt-2">Subagents will appear here when tasks are executed</p>
            </div>
          </div>
        )}

        {/* Empty state - specific filter has no data */}
        {((activeFilter === "running" && data.running.length === 0 && data.queued.length > 0) ||
          (activeFilter === "queued" && data.queued.length === 0) ||
          (activeFilter === "completed" && data.completed.length === 0)) && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              {activeFilter === "running" && <PlayIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />}
              {activeFilter === "queued" && <QueueListIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />}
              {activeFilter === "completed" && <CheckCircleIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />}
              <p className="text-dark-400 text-lg">No {activeFilter} subagents</p>
            </div>
          </div>
        )}

        {/* Filtered Subagents List */}
        {filteredData.length > 0 && (
          <div className="space-y-3">
            {filteredData.map((agent, index) => {
              const isRunning = activeFilter === "running";
              const isQueued = activeFilter === "queued";
              const isCompleted = activeFilter === "completed";
              const taskKey = formatTaskKey(agent.taskNumber);
              const outcomePreview = formatOutcomePreview(agent.outcome);
              
              return (
                <div 
                  key={agent.sessionKey || agent.sessionLabel || agent.taskId || `${activeFilter}-${index}`} 
                  className={`bg-dark-800 border border-dark-700 rounded-lg p-4 transition-colors ${
                    isRunning ? "hover:border-blue-500/30" : 
                    isQueued ? "hover:border-yellow-500/30" : 
                    "hover:border-green-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-dark-100">
                        {agent.sessionLabel || agent.title || 'Unknown'}
                      </p>
                      {isCompleted && outcomePreview && (
                        <div className="mt-1">
                          <p className="text-xs text-dark-400 line-clamp-2">{outcomePreview}</p>
                          {agent.outcome && agent.outcome.length > 150 && (
                            <button
                              onClick={() => setSelectedOutcome(agent.outcome)}
                              className="text-xs text-primary-400 hover:text-primary-300 mt-1"
                            >
                              View full outcome
                            </button>
                          )}
                        </div>
                      )}
                      {taskKey && (
                        <Link
                          to={`/task/${taskKey}`}
                          className="text-xs text-primary-400 hover:text-primary-300 mt-1 inline-block"
                        >
                          {taskKey}
                        </Link>
                      )}
                    </div>
                    {getStatusBadge(agent.status)}
                  </div>
                  
                  {/* Running agent details */}
                  {isRunning && (
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
                  )}
                  
                  {/* Queued agent details */}
                  {isQueued && (
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
                  )}
                  
                  {/* Completed agent details */}
                  {isCompleted && (
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
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Outcome Modal */}
        {selectedOutcome && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-dark-700 rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <h3 className="text-lg font-semibold text-dark-100">Subagent Outcome</h3>
                <button
                  onClick={() => setSelectedOutcome(null)}
                  className="text-dark-400 hover:text-dark-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono bg-dark-900 p-4 rounded border border-dark-700">
                  {selectedOutcome}
                </pre>
              </div>
              <div className="p-4 border-t border-dark-700">
                <button
                  onClick={() => setSelectedOutcome(null)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
