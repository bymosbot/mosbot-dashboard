import { useEffect, useState, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import logger from '../utils/logger';

const TaskModal = lazy(() => import('../components/TaskModal'));

export default function TaskView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchTaskById, tasks, isLoading, error } = useTaskStore();
  const [task, setTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadTask = async () => {
      try {
        // Check if task is already in store
        const existingTask = tasks.find(t => t.id === id);
        if (existingTask) {
          setTask(existingTask);
          setIsModalOpen(true);
        } else {
          // Fetch from API
          const fetchedTask = await fetchTaskById(id);
          setTask(fetchedTask);
          setIsModalOpen(true);
        }
      } catch (err) {
        logger.error('Failed to load task', err);
      }
    };

    if (id) {
      loadTask();
    }
  }, [id, fetchTaskById, tasks]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Navigate back to dashboard after modal close animation
    setTimeout(() => {
      navigate('/');
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-dark-400">Loading task...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading task</p>
          <p className="text-dark-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isModalOpen && (
        <Suspense fallback={null}>
          <TaskModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            task={task}
          />
        </Suspense>
      )}
    </>
  );
}
