export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  ARCHIVE: 'archive',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const COLUMNS = [
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

export const PRIORITY_CONFIG = {
  [TASK_PRIORITY.LOW]: {
    label: 'Low',
    color: 'bg-dark-700 text-dark-300',
  },
  [TASK_PRIORITY.MEDIUM]: {
    label: 'Medium',
    color: 'bg-blue-600 text-white',
  },
  [TASK_PRIORITY.HIGH]: {
    label: 'High',
    color: 'bg-yellow-600 text-white',
  },
  [TASK_PRIORITY.URGENT]: {
    label: 'Urgent',
    color: 'bg-red-600 text-white',
  },
};
