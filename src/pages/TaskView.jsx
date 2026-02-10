import { useEffect, useState, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import logger from '../utils/logger';

const TaskModal = lazy(() => import('../components/TaskModal'));

export default function TaskView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fetchTaskById = useTaskStore((state) => state.fetchTaskById);
  const [task, setTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Use local loading/error state to avoid React hooks mismatch caused by
  // the global store's isLoading toggling early returns while TaskModal is mounted
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadTask = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // Check if task is already in store (by id or by task key e.g. TASK-23)
        const tasks = useTaskStore.getState().tasks;
        const existingTask = tasks.find(
          (t) =>
            t.id === id ||
            (t.task_number && `TASK-${t.task_number}` === id)
        );
        if (existingTask) {
          if (!cancelled) {
            setTask(existingTask);
            setIsModalOpen(true);
            setLoading(false);
          }
        } else {
          // Fetch from API
          const fetchedTask = await fetchTaskById(id);
          if (!cancelled) {
            setTask(fetchedTask);
            setIsModalOpen(true);
            setLoading(false);
          }
        }
      } catch (err) {
        logger.error('Failed to load task', err);
        if (!cancelled) {
          setLoadError(err.response?.data?.error?.message || err.message || 'Failed to load task');
          setLoading(false);
        }
      }
    };

    if (id) {
      loadTask();
    }

    return () => {
      cancelled = true;
    };
  }, [id, fetchTaskById]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Navigate back to dashboard after modal close animation
    setTimeout(() => {
      navigate('/');
    }, 300);
  };

  // Render loading/error states alongside the modal area so that
  // the component tree stays consistent and hooks are never skipped
  return (
    <>
      {loading && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-dark-400">Loading task...</p>
          </div>
        </div>
      )}

      {!loading && loadError && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-2">Error loading task</p>
            <p className="text-dark-500 text-sm mb-4">{loadError}</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

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
