import { Link, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../utils/helpers';

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartBarIcon },
  { name: 'Docs', href: '/docs', icon: DocumentTextIcon },
  { name: 'Log', href: '/log', icon: ClipboardDocumentListIcon },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-dark-900 border-r border-dark-800 w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-800">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">M</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-dark-100">MosBot</h1>
          <p className="text-xs text-dark-500">Task Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={classNames(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-dark-800">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-medium">
            MB
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark-100 truncate">MosBot</p>
            <p className="text-xs text-dark-500 truncate">Active</p>
          </div>
          <Cog6ToothIcon className="w-5 h-5 text-dark-500" />
        </div>
      </div>
    </div>
  );
}
