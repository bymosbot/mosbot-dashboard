import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTaskStore } from '../stores/taskStore';
import { useToastStore } from '../stores/toastStore';
import Column from './Column';
import { KANBAN_COLUMNS } from '../utils/constants';

export default function KanbanBoard({ onTaskClick }) {
  const { moveTask, getFilteredTasks, isRefreshing } = useTaskStore();
  const { showToast } = useToastStore();
  const tasks = getFilteredTasks();

  const handleTaskDrop = async (taskId, newStatus) => {
    try {
      await moveTask(taskId, newStatus);
    } catch (error) {
      // Handle dependency blocking (409 Conflict)
      if (error.response?.status === 409) {
        const blockingTasks = error.response?.data?.error?.blocking_tasks || [];
        const taskKeys = blockingTasks
          .map(t => t.key || t.task_number ? `TASK-${t.task_number}` : t.id || 'Unknown task')
          .filter(Boolean)
          .join(', ');
        showToast(
          `Task is blocked by: ${taskKeys || 'unfinished dependencies'}`,
          'error'
        );
      } else {
        showToast(
          error.response?.data?.error?.message || 'Failed to move task',
          'error'
        );
      }
    }
  };

  // Ensure tasks is always an array
  const tasksArray = Array.isArray(tasks) ? tasks : [];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="relative">
        {/* Background refresh indicator */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary-600/20 overflow-hidden z-10">
            <div className="h-full bg-primary-600 animate-pulse-slow"></div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = tasksArray.filter((task) => task.status === column.id);
            return (
              <div key={column.id} className="card flex flex-col min-h-0">
                <Column
                  column={column}
                  tasks={columnTasks}
                  onTaskClick={onTaskClick}
                  onTaskDrop={handleTaskDrop}
                />
              </div>
            );
          })}
        </div>
      </div>
    </DndProvider>
  );
}
