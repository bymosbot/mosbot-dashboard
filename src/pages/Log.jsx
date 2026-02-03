import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useTaskStore } from '../stores/taskStore';
import { formatDateTime } from '../utils/helpers';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function Log() {
  const { tasks } = useTaskStore();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Generate activity logs from tasks
    const activityLogs = tasks.flatMap(task => {
      const entries = [];
      
      if (task.createdAt) {
        entries.push({
          id: `${task.id}-created`,
          taskId: task.id,
          taskTitle: task.title,
          action: 'created',
          timestamp: task.createdAt,
          description: `Task "${task.title}" was created`,
        });
      }
      
      if (task.updatedAt && task.updatedAt !== task.createdAt) {
        entries.push({
          id: `${task.id}-updated`,
          taskId: task.id,
          taskTitle: task.title,
          action: 'updated',
          timestamp: task.updatedAt,
          description: `Task "${task.title}" was updated`,
        });
      }
      
      return entries;
    });

    // Sort by timestamp (newest first)
    activityLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setLogs(activityLogs);
  }, [tasks]);

  const getActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'text-green-500';
      case 'updated':
        return 'text-blue-500';
      case 'deleted':
        return 'text-red-500';
      default:
        return 'text-dark-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity Log" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {logs.length === 0 ? (
            <div className="card p-12 text-center">
              <ClockIcon className="w-12 h-12 mx-auto text-dark-600 mb-4" />
              <h3 className="text-lg font-medium text-dark-400 mb-2">No Activity Yet</h3>
              <p className="text-dark-500">Task activity will appear here as you work</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="card p-4 hover:bg-dark-800/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-500"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium capitalize ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-dark-600">•</span>
                        <span className="text-sm text-dark-500">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-dark-300">{log.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
