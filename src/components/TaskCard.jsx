import { useDrag } from 'react-dnd';
import { 
  ClockIcon, 
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { PRIORITY_CONFIG, TASK_PRIORITY, TASK_TYPE_CONFIG, TASK_TYPE } from '../utils/constants';
import { formatRelativeTime, truncateText, classNames } from '../utils/helpers';

const ITEM_TYPE = 'TASK';

// Icon component mapping
const ICON_MAP = {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  BoltIcon,
};

export default function TaskCard({ task, onClick }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[TASK_PRIORITY.MEDIUM];
  const taskType = task.type || TASK_TYPE.TASK;
  const typeConfig = TASK_TYPE_CONFIG[taskType] || TASK_TYPE_CONFIG[TASK_TYPE.TASK];
  const TypeIcon = ICON_MAP[typeConfig.icon];

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={classNames(
        'card card-hover p-4 cursor-pointer transition-all duration-200 border-l-4',
        priorityConfig.borderColor,
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      )}
    >
      {/* Header with task key and type icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {task.task_number && (
              <span className="text-xs font-mono text-dark-500">
                TASK-{task.task_number}
              </span>
            )}
            {task.parent_task_number && (
              <span className="text-xs text-dark-600">
                Epic: TASK-{task.parent_task_number}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-dark-100">
            {task.title}
          </h3>
        </div>
        {TypeIcon && (
          <TypeIcon 
            className={classNames('w-5 h-5 flex-shrink-0', typeConfig.color)} 
            title={typeConfig.label}
          />
        )}
      </div>

      {/* Description/Summary */}
      {(task.summary || task.description) && (
        <p className="text-sm text-dark-400 mb-3">
          {truncateText(task.summary || task.description, 120)}
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
          {(task.due_date || task.dueDate) && (
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{formatRelativeTime(task.due_date || task.dueDate)}</span>
            </div>
          )}
          {task.comments && task.comments > 0 && (
            <div className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span>{task.comments}</span>
            </div>
          )}
        </div>
        
        {/* Reporter and Assignee avatars */}
        <div className="flex items-center gap-1">
          {task.reporter_name && (
            <div 
              className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 text-xs font-medium border border-dark-600"
              title={`Reporter: ${task.reporter_name}`}
            >
              {task.reporter_name.charAt(0).toUpperCase()}
            </div>
          )}
          {(task.assignee_name || task.assignee) && (
            <div 
              className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium"
              title={`Assignee: ${task.assignee_name || task.assignee}`}
            >
              {(task.assignee_name || task.assignee).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
