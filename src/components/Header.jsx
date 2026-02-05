import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Header({ title, subtitle, onCreateTask, searchValue, onSearchChange }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-dark-900 border-b border-dark-800">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-dark-100">{title}</h1>
        {subtitle && (
          <p className="text-sm text-dark-500">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        )}

        {/* Create Task Button */}
        {onCreateTask && (
          <button onClick={onCreateTask} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            New Task
          </button>
        )}
      </div>
    </div>
  );
}
