import { useDrop } from 'react-dnd';
import TaskCard from './TaskCard';
import { classNames } from '../utils/helpers';

const ITEM_TYPE = 'TASK';

export default function Column({ column, tasks, onTaskClick, onTaskDrop }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item) => {
      if (item.status !== column.id) {
        onTaskDrop(item.id, column.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const isActive = isOver && canDrop;

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={classNames(
        'flex items-center justify-between px-4 py-3 border-b-2',
        column.color
      )}>
        <h2 className="text-sm font-bold text-dark-200 uppercase tracking-wide">
          {column.title}
        </h2>
        <span className="px-2 py-0.5 text-xs font-medium bg-dark-800 text-dark-400 rounded">
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={drop}
        className={classNames(
          'flex-1 p-4 space-y-3 overflow-y-auto transition-colors duration-200',
          isActive ? 'bg-dark-800/50' : 'bg-transparent'
        )}
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-dark-600 text-sm">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}
