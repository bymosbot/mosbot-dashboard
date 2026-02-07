import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useActivityStore } from '../stores/activityStore';
import { parseDatabaseDate } from '../utils/helpers';
import { format } from 'date-fns';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import Header from '../components/Header';
import logger from '../utils/logger';

// Sample activity logs for UI verification (dev-only)
const getSampleActivityLogs = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fourDaysAgo = new Date(now);
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

  return [
    {
      id: 'sample-1',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0),
      title: 'Heartbeat',
      description: 'Checked YouTube dashboard - MVP complete, all phases done except Twitter/X integration (blocked). Dashboard live at youtube.spiritanalysing.com',
      category: 'heartbeat',
      task_id: null,
      task_title: null,
    },
    {
      id: 'sample-2',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 59),
      title: 'Implemented',
      description: 'Implemented Kanban UI improvements: (1) Notes now span full card width instead of being constrained by the row. (2) Added collapse/expand all button to hide/show notes across all cards.',
      category: 'implementation',
      task_id: 'sample-task-1',
      task_title: 'Improve Kanban UI/UX',
    },
    {
      id: 'sample-3',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 54),
      title: 'UX Overhaul',
      description: 'UX overhaul: Redesigned kanban task cards with cleaner minimal design - removed cluttered buttons, simplified layout, better text handling',
      category: 'improvement',
      task_id: 'sample-task-1',
      task_title: 'Improve Kanban UI/UX',
    },
    {
      id: 'sample-4',
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 12, 47),
      title: 'Fixed Dashboard',
      description: 'Fixed dashboard task collapse UX: eliminated glitchy hover behavior with CSS containment, added minimalistic collapse/expand all buttons to column headers, made Show All text toggles smaller and cleaner',
      category: 'bug_fix',
      task_id: 'sample-task-2',
      task_title: 'Fix Dashboard Collapse Bug',
    },
    {
      id: 'sample-5',
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 12, 43),
      title: 'Refactored',
      description: 'Refactored Kanban board, removed column collapse/expand, added individual task expand/collapse behavior with "Show all X tasks" overflow pattern for 5+ tasks',
      category: 'refactor',
      task_id: 'sample-task-1',
      task_title: 'Improve Kanban UI/UX',
    },
    {
      id: 'sample-6',
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 12, 39),
      title: 'Enhanced Dashboard',
      description: 'Enhanced dashboard status with context: Added \'context\' field to status.json that shows additional details about current task. Updated server.js to merge context into status, appjs to render it, and stylecss for styling.',
      category: 'feature',
      task_id: 'sample-task-3',
      task_title: 'Add Dashboard Context Display',
    },
    {
      id: 'sample-7',
      timestamp: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 12, 0),
      title: 'Heartbeat',
      description: 'Heartbeat: Infrastructure healthy, GitHub synced, YouTube dashboard MVP complete - no pending issues',
      category: 'heartbeat',
      task_id: null,
      task_title: null,
    },
    {
      id: 'sample-8',
      timestamp: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 14, 30),
      title: 'Planning',
      description: 'Planning phase complete for task management system. Documented API architecture, database schema, and frontend components.',
      category: 'planning',
      task_id: 'sample-task-4',
      task_title: 'Design Task Management System',
    },
    {
      id: 'sample-9',
      timestamp: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 10, 15),
      title: 'Deployed',
      description: 'Deployed backend API to production environment. All health checks passing, monitoring configured.',
      category: 'deployment',
      task_id: 'sample-task-5',
      task_title: 'Deploy API to Production',
    },
    {
      id: 'sample-10',
      timestamp: new Date(fourDaysAgo.getFullYear(), fourDaysAgo.getMonth(), fourDaysAgo.getDate(), 16, 45),
      title: 'Testing',
      description: 'Completed integration testing for authentication flow. All test cases passing with 100% coverage.',
      category: 'testing',
      task_id: 'sample-task-6',
      task_title: 'Implement Authentication Tests',
    },
    {
      id: 'sample-11',
      timestamp: new Date(fourDaysAgo.getFullYear(), fourDaysAgo.getMonth(), fourDaysAgo.getDate(), 11, 20),
      title: 'Database Migration',
      description: 'Executed database migration for user roles and permissions. Migration completed successfully without data loss.',
      category: 'maintenance',
      task_id: null,
      task_title: null,
    },
  ];
};

// Group logs by date
const groupByDay = (logs) => {
  const groups = {};
  
  logs.forEach((log) => {
    const date = parseDatabaseDate(log.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: date,
        dateLabel: format(date, 'EEEE, MMMM d').toUpperCase(),
        logs: [],
      };
    }
    
    groups[dateKey].logs.push(log);
  });
  
  // Sort groups by date (newest first)
  return Object.values(groups).sort((a, b) => b.date - a.date);
};

// Get category color for timeline dot
const getCategoryColor = (category) => {
  const colors = {
    heartbeat: 'bg-yellow-500',
    implementation: 'bg-blue-500',
    improvement: 'bg-green-500',
    bug_fix: 'bg-red-500',
    refactor: 'bg-purple-500',
    feature: 'bg-green-500',
    planning: 'bg-purple-500',
    deployment: 'bg-yellow-500',
    testing: 'bg-blue-500',
    maintenance: 'bg-green-500',
  };
  
  return colors[category] || 'bg-primary-500';
};

export default function Log() {
  const { logs, isLoading, isLoadingMore, hasMore, fetchActivity, loadMoreActivity } = useActivityStore();
  const [displayLogs, setDisplayLogs] = useState([]);

  useEffect(() => {
    // Fetch activity logs from API with pagination (50 items per page)
    fetchActivity({ limit: 50 }).catch((error) => {
      logger.error('Failed to fetch activity logs', error);
    });
  }, [fetchActivity]);

  const handleLoadMore = () => {
    loadMoreActivity().catch((error) => {
      logger.error('Failed to load more activity logs', error);
    });
  };

  useEffect(() => {
    // If no logs from API and we're in dev mode (but not in test mode), use sample logs
    if (logs.length === 0 && import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      setDisplayLogs(getSampleActivityLogs());
    } else {
      setDisplayLogs(logs);
    }
  }, [logs]);

  const groupedLogs = groupByDay(displayLogs);

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Activity Log" 
        subtitle={`A chronological record of the bot's actions and completed tasks • ${displayLogs.length} ${displayLogs.length === 1 ? 'entry' : 'entries'}`}
      />
      
      <div className="flex-1 p-6 overflow-y-auto bg-dark-950">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="card p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-lg font-medium text-dark-400">Loading activity...</h3>
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-dark-400 mb-2">No Activity Yet</h3>
              <p className="text-dark-500">Bot activity will appear here as it works</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedLogs.map((group) => (
                <div key={group.dateLabel} className="space-y-4">
                  {/* Date header */}
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-dark-700 rounded-sm"></div>
                    <h2 className="text-sm font-semibold text-dark-500 tracking-wider">
                      {group.dateLabel}
                    </h2>
                  </div>
                  
                  {/* Timeline entries */}
                  <div className="ml-1.5 border-l-2 border-dark-800 space-y-0">
                    {group.logs.map((log) => {
                      const date = parseDatabaseDate(log.timestamp);
                      const timeLabel = format(date, 'h:mm a');
                      
                      return (
                        <div key={log.id} className="relative pl-8 pb-6 last:pb-0">
                          {/* Timeline dot */}
                          <div 
                            className={`absolute left-0 top-2 -translate-x-[9px] w-4 h-4 ${getCategoryColor(log.category)} rounded-full border-2 border-dark-950`}
                          ></div>
                          
                          {/* Time label */}
                          <div className="text-xs text-blue-400 font-medium mb-2">
                            {timeLabel}
                          </div>
                          
                          {/* Content card */}
                          <div className="card p-4 hover:bg-dark-800/50 transition-colors">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="text-base font-semibold text-dark-200">
                                {log.title}
                              </h3>
                              {log.task_id && (
                                <Link
                                  to={`/task/${log.task_id}`}
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded text-xs font-medium transition-colors shrink-0"
                                  title={`View task: ${log.task_title || 'Task'}`}
                                >
                                  <span>{log.task_title || 'Task'}</span>
                                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                            <p className="text-sm text-dark-400 leading-relaxed whitespace-pre-line">
                              {log.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Load More button */}
              {hasMore && !isLoading && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="btn-secondary flex items-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  );
}
