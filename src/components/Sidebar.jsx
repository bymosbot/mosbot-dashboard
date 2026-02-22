import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, Fragment, Suspense, lazy, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  ChartBarIcon,
  FolderIcon,
  FolderOpenIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  ChevronUpDownIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  RectangleGroupIcon,
  ChartPieIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  CubeIcon,
  MegaphoneIcon,
  SparklesIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../utils/helpers';
import { useAuthStore } from '../stores/authStore';
import { useAgentStore } from '../stores/agentStore';
import { useSchedulerStore } from '../stores/schedulerStore';
import { getSchedulerStats } from '../api/client';

const BotAvatar = lazy(() => import('./BotAvatar'));

export default function Sidebar({ onCloseMobile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { getDefaultAgent, fetchAgents, agents } = useAgentStore();
  const attention = useSchedulerStore((state) => state.attention);
  const setAttention = useSchedulerStore((state) => state.setAttention);
  const [expandedItems, setExpandedItems] = useState({});

  // Fetch agents on mount for dynamic navigation
  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents();
    }
  }, [agents.length, fetchAgents]);

  // Fetch scheduler attention stats on mount for sidebar badges (no need to visit Scheduler page)
  useEffect(() => {
    let cancelled = false;
    getSchedulerStats()
      .then((data) => {
        if (!cancelled && data) {
          setAttention({ errors: data.errors ?? 0, missed: data.missed ?? 0 });
        }
      })
      .catch(() => { /* ignore - badges will show 0 or last known values */ });
    return () => { cancelled = true; };
  }, [setAttention]);

  // Dynamic navigation with agent-aware workspace link
  const navigation = [
    {
      items: [
        { name: 'Agent Monitor', href: '/monitor', icon: ChartPieIcon },
        { name: 'Task Board', href: '/tasks', icon: RectangleGroupIcon },
        { name: 'Standups', href: '/standups', icon: MegaphoneIcon },
      ],
    },
    {
      label: 'Org',
      items: [
        { name: 'Org Chart', href: '/org-chart', icon: ChartBarIcon },
        { name: 'Workspaces', href: `/workspaces/${getDefaultAgent()?.id || 'coo'}`, icon: FolderIcon },
        { name: 'Projects', href: '/projects', icon: FolderOpenIcon },
        { name: 'Skills', href: '/skills', icon: SparklesIcon },
        { name: 'Docs', href: '/docs', icon: DocumentTextIcon },
      ],
    },
    {
      label: 'Ops',
      items: [
        { name: 'Scheduler', href: '/scheduler', icon: CalendarDaysIcon },
        { name: 'Usage & Cost', href: '/usage', icon: CurrencyDollarIcon },
        { name: 'Log', href: '/log', icon: ClipboardDocumentListIcon },
      ],
    },
    {
      label: 'System',
      items: [
        { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, subpages: [
          { name: 'Users', href: '/settings/users', icon: UserIcon },
          { name: 'Model Fleet', href: '/settings/model-fleet', icon: CubeIcon },
        ]},
        { name: 'Archived', href: '/archived', icon: ArchiveBoxIcon },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
    onCloseMobile?.();
  };

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  // Get user initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 border-r border-dark-800 w-64">
      {/* Bot Avatar */}
      <Suspense fallback={<div className="h-24 bg-dark-800 animate-pulse" />}>
        <BotAvatar />
      </Suspense>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navigation.map((group, groupIndex) => (
          <div key={groupIndex} className={groupIndex > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-dark-600">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const hasSubpages = item.subpages && item.subpages.length > 0;
                const prefixRoutes = ['/workspaces', '/docs', '/projects', '/skills'];
                const isActive = hasSubpages
                  ? location.pathname === item.href
                  : prefixRoutes.includes(item.href)
                    ? location.pathname.startsWith(item.href)
                    : item.href === '/tasks'
                      ? location.pathname === '/tasks'
                      : location.pathname === item.href;
                const isExpanded = expandedItems[item.name] || (item.subpages && item.subpages.some(sub => location.pathname === sub.href));

                return (
                  <div key={item.name}>
                    {hasSubpages ? (
                      <>
                        <button
                          onClick={() => toggleExpanded(item.name)}
                          className={classNames(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                            isActive
                              ? 'bg-primary-600 text-white'
                              : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronRightIcon
                            className={classNames(
                              'w-4 h-4 transition-transform duration-200',
                              isExpanded ? 'rotate-90' : ''
                            )}
                          />
                        </button>
                        {isExpanded && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.subpages.map((subpage) => {
                              const isSubActive = location.pathname === subpage.href;
                              return (
                                <Link
                                  key={subpage.name}
                                  to={subpage.href}
                                  onClick={onCloseMobile}
                                  className={classNames(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                                    isSubActive
                                      ? 'bg-primary-600 text-white'
                                      : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                                  )}
                                >
                                  <subpage.icon className="w-4 h-4" />
                                  {subpage.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        to={item.href}
                        onClick={onCloseMobile}
                        className={classNames(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                          isActive
                            ? 'bg-primary-600 text-white'
                            : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.href === '/scheduler' && (attention.errors > 0 || attention.missed > 0) && (
                          <span className="flex items-center gap-1.5">
                            {attention.errors > 0 && (
                              <span className="min-w-[1.25rem] px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-500/90 text-white" title="Jobs in error">
                                {attention.errors}
                              </span>
                            )}
                            {attention.missed > 0 && (
                              <span className="min-w-[1.25rem] px-1.5 py-0.5 text-[10px] font-semibold rounded bg-yellow-500/90 text-dark-900" title="Missed runs">
                                {attention.missed}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile with Dropdown */}
      <div className="p-4 border-t border-dark-800">
        <Menu as="div" className="relative">
          <Menu.Button className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-medium">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-dark-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-dark-500 truncate">{user?.email || ''}</p>
            </div>
            <ChevronUpDownIcon className="w-5 h-5 text-dark-500" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute bottom-full left-4 right-4 mb-2 bg-dark-800 border border-dark-700 rounded-lg shadow-xl focus:outline-none">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    to="/settings"
                    className={classNames(
                      'flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-t-lg',
                      active ? 'bg-dark-700 text-dark-100' : 'text-dark-300'
                    )}
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                    Settings
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={classNames(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-b-lg',
                      active ? 'bg-dark-700 text-red-400' : 'text-red-500'
                    )}
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </div>
  );
}
