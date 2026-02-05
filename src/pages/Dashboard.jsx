import { useEffect, useState, Suspense, lazy } from 'react';
import { useTaskStore } from '../stores/taskStore';
import KanbanBoard from '../components/KanbanBoard';
import Header from '../components/Header';

const TaskModal = lazy(() => import('../components/TaskModal'));

export default function Dashboard() {
  const { fetchTasks, isLoading, error, searchQuery, setSearchQuery } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  if (isLoading && !useTaskStore.getState().tasks.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-dark-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading tasks</p>
          <p className="text-dark-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Dashboard" 
        subtitle="Kanban board for task management and workflow tracking"
        onCreateTask={handleCreateTask}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <div className="flex-1 p-6 overflow-hidden">
        <KanbanBoard onTaskClick={handleTaskClick} />
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
  );
}
