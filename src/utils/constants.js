// Status values match API format
export const TASK_STATUS = {
  PLANNING: 'PLANNING',
  TODO: 'TO DO',
  IN_PROGRESS: 'IN PROGRESS',
  DONE: 'DONE',
  ARCHIVE: 'ARCHIVE',
};

// Priority values match API format (capitalized)
export const TASK_PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'High', // API doesn't support 'Urgent', map to 'High'
};

// Task types
export const TASK_TYPE = {
  TASK: 'task',
  BUG: 'bug',
  FEATURE: 'feature',
  IMPROVEMENT: 'improvement',
  RESEARCH: 'research',
  EPIC: 'epic',
};

export const COLUMNS = [
  {
    id: TASK_STATUS.PLANNING,
    title: 'PLANNING',
    color: 'border-purple-600',
  },
  {
    id: TASK_STATUS.TODO,
    title: 'TO DO',
    color: 'border-dark-700',
  },
  {
    id: TASK_STATUS.IN_PROGRESS,
    title: 'IN PROGRESS',
    color: 'border-blue-600',
  },
  {
    id: TASK_STATUS.DONE,
    title: 'DONE',
    color: 'border-green-600',
  },
  {
    id: TASK_STATUS.ARCHIVE,
    title: 'ARCHIVE',
    color: 'border-dark-600',
  },
];

// Kanban board columns (excludes ARCHIVE - archived tasks shown on separate page)
export const KANBAN_COLUMNS = [
  {
    id: TASK_STATUS.PLANNING,
    title: 'PLANNING',
    color: 'border-purple-600',
  },
  {
    id: TASK_STATUS.TODO,
    title: 'TO DO',
    color: 'border-dark-700',
  },
  {
    id: TASK_STATUS.IN_PROGRESS,
    title: 'IN PROGRESS',
    color: 'border-blue-600',
  },
  {
    id: TASK_STATUS.DONE,
    title: 'DONE',
    color: 'border-green-600',
  },
];

export const PRIORITY_CONFIG = {
  [TASK_PRIORITY.LOW]: {
    label: 'Low',
    color: 'bg-dark-700 text-dark-300',
    borderColor: 'border-l-dark-600',
  },
  [TASK_PRIORITY.MEDIUM]: {
    label: 'Medium',
    color: 'bg-blue-600 text-white',
    borderColor: 'border-l-blue-500',
  },
  [TASK_PRIORITY.HIGH]: {
    label: 'High',
    color: 'bg-yellow-600 text-white',
    borderColor: 'border-l-yellow-500',
  },
  // Note: Urgent maps to High in API
};

export const STATUS_CONFIG = {
  [TASK_STATUS.PLANNING]: {
    label: 'Planning',
    color: 'bg-purple-600 text-white',
  },
  [TASK_STATUS.TODO]: {
    label: 'To Do',
    color: 'bg-dark-700 text-dark-300',
  },
  [TASK_STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'bg-blue-600 text-white',
  },
  [TASK_STATUS.DONE]: {
    label: 'Done',
    color: 'bg-green-600 text-white',
  },
  [TASK_STATUS.ARCHIVE]: {
    label: 'Archived',
    color: 'bg-dark-600 text-dark-400',
  },
};

export const TASK_TYPE_CONFIG = {
  [TASK_TYPE.TASK]: {
    label: 'Task',
    icon: 'CheckCircleIcon',
    color: 'text-dark-400',
  },
  [TASK_TYPE.BUG]: {
    label: 'Bug',
    icon: 'ExclamationTriangleIcon',
    color: 'text-red-500',
  },
  [TASK_TYPE.FEATURE]: {
    label: 'Feature',
    icon: 'SparklesIcon',
    color: 'text-purple-500',
  },
  [TASK_TYPE.IMPROVEMENT]: {
    label: 'Improvement',
    icon: 'ArrowTrendingUpIcon',
    color: 'text-blue-500',
  },
  [TASK_TYPE.RESEARCH]: {
    label: 'Research',
    icon: 'MagnifyingGlassIcon',
    color: 'text-yellow-500',
  },
  [TASK_TYPE.EPIC]: {
    label: 'Epic',
    icon: 'BoltIcon',
    color: 'text-amber-500',
  },
};
