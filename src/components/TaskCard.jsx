import { useDrag } from 'react-dnd';
import { ClockIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { PRIORITY_CONFIG } from '../utils/constants';
import { formatRelativeTime, truncateText, classNames } from '../utils/helpers';

const ITEM_TYPE = 'TASK';

export default function TaskCard({ task, onClick }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={classNames(
        'card card-hover p-4 cursor-pointer transition-all duration-200',
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      )}
    >
      {/* Header with priority badge */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark-100 flex-1 pr-2">
          {task.title}
        </h3>
        <span
          className={classNames(
            'px-2 py-0.5 text-xs font-medium rounded',
            priorityConfig.color
          )}
        >
          {priorityConfig.label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-dark-400 mb-3">
          {truncateText(task.description, 120)}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs bg-dark-800 text-dark-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer with metadata */}
      <div className="flex items-center justify-between text-xs text-dark-500">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{formatRelativeTime(task.dueDate)}</span>
            </div>
          )}
          {task.comments && task.comments > 0 && (
            <div className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span>{task.comments}</span>
            </div>
          )}
        </div>
        
        {/* Assignee avatar */}
        {task.assignee && (
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium">
              {task.assignee.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
