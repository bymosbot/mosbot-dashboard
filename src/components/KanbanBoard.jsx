import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTaskStore } from '../stores/taskStore';
import Column from './Column';
import { KANBAN_COLUMNS } from '../utils/constants';

export default function KanbanBoard({ onTaskClick }) {
  const { moveTask, getFilteredTasks } = useTaskStore();
  const tasks = getFilteredTasks();

  const handleTaskDrop = async (taskId, newStatus) => {
    await moveTask(taskId, newStatus);
  };

  // Ensure tasks is always an array
  const tasksArray = Array.isArray(tasks) ? tasks : [];

  return (
    <DndProvider backend={HTML5Backend}>
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
    </DndProvider>
  );
}
