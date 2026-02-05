import { useEffect, useState, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { api } from '../api/client';
import { useTaskStore } from '../stores/taskStore';
import TaskCard from '../components/TaskCard';
import logger from '../utils/logger';

const TaskModal = lazy(() => import('../components/TaskModal'));

export default function Archived() {
  const location = useLocation();
  const { isLoading, error } = useTaskStore();
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchArchivedTasks();
  }, [location]); // Refresh when navigating to this page

  const fetchArchivedTasks = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/tasks', { params: { status: 'ARCHIVE' } });
      setArchivedTasks(response.data.data || []);
      logger.info('Fetched archived tasks', { count: response.data.data?.length || 0 });
    } catch (error) {
      logger.error('Failed to fetch archived tasks', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    // Refresh archived tasks after modal closes (in case task was restored)
    fetchArchivedTasks();
  };

  if (isLoading && archivedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-dark-400">Loading archived tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading archived tasks</p>
          <p className="text-dark-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-800">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-dark-100">Archived Tasks</h1>
            <p className="text-sm text-dark-500">View and restore completed tasks that have been archived</p>
          </div>
          <button
            onClick={fetchArchivedTasks}
            disabled={isRefreshing}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {isRefreshing && archivedTasks.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-dark-400">Loading archived tasks...</p>
              </div>
            </div>
          ) : archivedTasks.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-dark-400 text-lg mb-2">No archived tasks</p>
                <p className="text-dark-500 text-sm">Tasks that have been done for 7+ days will appear here</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {archivedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task)}
                />
              ))}
            </div>
          )}
        </div>

        {isModalOpen && (
          <Suspense fallback={null}>
            <TaskModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              task={selectedTask}
            />
          </Suspense>
        )}
      </div>
    </DndProvider>
  );
}
