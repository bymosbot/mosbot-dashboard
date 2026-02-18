import { Fragment, useEffect, useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useStandupStore } from '../stores/standupStore';
import { useToastStore } from '../stores/toastStore';
import { useAgentStore } from '../stores/agentStore';
import Header from '../components/Header';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import logger from '../utils/logger';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function AgentAvatar({ agentId, userName, avatarUrl, size = 'md' }) {
  const getAgentById = useAgentStore((state) => state.getAgentById);
  const agent = agentId ? getAgentById(agentId) : null;
  const icon = agent?.icon;

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-sm' : 'w-10 h-10 text-xl';

  if (icon) {
    return (
      <div className={`flex-shrink-0 ${sizeClass} rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center leading-none`}>
        {icon}
      </div>
    );
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={userName || agentId}
        className={`flex-shrink-0 ${sizeClass} rounded-full object-cover`}
      />
    );
  }

  // Fallback: coloured initials
  const initials = (userName || agentId || '?')[0].toUpperCase();
  return (
    <div className={`flex-shrink-0 ${sizeClass} rounded-full bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center text-white font-semibold`}>
      {size === 'sm' ? (
        <span className="text-xs">{initials}</span>
      ) : (
        <span className="text-sm">{initials}</span>
      )}
    </div>
  );
}

function StandupCard({ standup, onClick, isActive }) {
  const statusIcon = {
    completed: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
    running:   <ArrowPathIcon className="w-5 h-5 text-yellow-500 animate-spin" />,
    error:     <ExclamationCircleIcon className="w-5 h-5 text-red-500" />,
  }[standup.status];

  const statusText = {
    completed: 'Completed',
    running:   'In Progress',
    error:     'Error',
  }[standup.status];

  const participants = standup.participants || [];

  return (
    <div
      onClick={onClick}
      className={`group p-4 border rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'bg-primary-600/10 border-primary-500'
          : 'bg-dark-800 border-dark-700 hover:border-dark-600 hover:bg-dark-750'
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-dark-100 mb-1 line-clamp-1">
            {standup.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatRelativeTime(standup.standup_date)}</span>
            <span className="text-dark-600">•</span>
            <ClockIcon className="w-4 h-4" />
            <span>{formatTime(standup.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {statusIcon}
          <span className="text-xs text-dark-400 font-medium">{statusText}</span>
        </div>
      </div>

          {participants.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {participants.map((p, idx) => {
            const pName = p.user_name || p.agent_id;
            return (
              <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-dark-700 rounded text-xs">
                <AgentAvatar agentId={p.agent_id} userName={pName} avatarUrl={p.avatar_url} size="sm" />
                <span className="text-dark-300 font-medium">{pName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EntrySection({ label, value, className = '' }) {
  if (value == null || String(value).trim() === '') return null;
  return (
    <div className={className}>
      <span className="text-xs font-semibold text-dark-500 uppercase tracking-wide block mb-1">
        {label}
      </span>
      <p className="text-sm text-dark-300 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function EntryTasks({ tasks }) {
  if (!tasks) return null;
  let list = tasks;
  if (typeof tasks === 'string') {
    try {
      list = JSON.parse(tasks);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    <div className="mt-3">
      <span className="text-xs font-semibold text-dark-500 uppercase tracking-wide block mb-1">
        Tasks
      </span>
      <ul className="space-y-1">
        {list.map((t, i) => (
          <li key={i} className="text-sm text-dark-300 flex items-start gap-2">
            {t.id && (
              <span className="flex-shrink-0 font-mono text-dark-500">{t.id}</span>
            )}
            <span>{typeof t === 'object' ? (t.title || t.name || JSON.stringify(t)) : t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StandupNotesDrawer({ isOpen, onClose, standup }) {
  const entries = (standup?.entries || []).slice().sort((a, b) => (a.turn_order ?? 0) - (b.turn_order ?? 0));
  const hasStructuredEntry = (e) =>
    (e.yesterday && e.yesterday.trim() !== '') ||
    (e.today && e.today.trim() !== '') ||
    (e.blockers && e.blockers.trim() !== '');

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-dark-950/60" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-xl">
                  <div className="flex h-full flex-col bg-dark-900 shadow-xl border-l border-dark-700">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-800">
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-primary-400" />
                        <Dialog.Title className="text-lg font-semibold text-dark-100">
                          Standup Notes
                        </Dialog.Title>
                      </div>
                      <button
                        type="button"
                        className="p-2 rounded-md text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      {entries.length === 0 ? (
                        <p className="text-dark-500 text-sm">No structured notes for this standup.</p>
                      ) : (
                        <div className="space-y-6">
                          {entries.map((entry) => {
                            const entryName = entry.user_name || entry.agent_id;
                            const displayName = entry.agent_title
                              ? `${entryName} (${entry.agent_title})`
                              : entryName;
                            const showStructured = hasStructuredEntry(entry);
                            const fallbackContent = entry.raw;

                            return (
                              <section key={entry.id} className="border-b border-dark-700 pb-6 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2 mb-3">
                                  <AgentAvatar
                                    agentId={entry.agent_id}
                                    userName={entryName}
                                    avatarUrl={entry.avatar_url || null}
                                    size="sm"
                                  />
                                  <h3 className="text-base font-semibold text-dark-100">{displayName}</h3>
                                </div>
                                <div className="pl-8 text-dark-300">
                                  {showStructured ? (
                                    <>
                                      <EntrySection label="Yesterday" value={entry.yesterday} className="mb-3" />
                                      <EntrySection label="Today" value={entry.today} className="mb-3" />
                                      <EntrySection label="Blockers" value={entry.blockers} className="mb-3" />
                                      <EntryTasks tasks={entry.tasks} />
                                    </>
                                  ) : fallbackContent ? (
                                    <p className="text-sm whitespace-pre-wrap">{fallbackContent}</p>
                                  ) : (
                                    <p className="text-sm text-dark-500 italic">No report</p>
                                  )}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function StandupDetail({ standup, onBack }) {
  if (!standup) return null;

  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const messages = (standup.messages || []).filter((m) => m.kind === 'agent');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-700 bg-dark-800">
        <button
          onClick={onBack}
          className="p-2 hover:bg-dark-700 rounded transition-colors"
          title="Back to archive"
        >
          <ChevronLeftIcon className="w-5 h-5 text-dark-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-dark-100 mb-1 line-clamp-1">
            {standup.title}
          </h2>
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatDate(standup.standup_date)}</span>
            <span className="text-dark-600">•</span>
            <ClockIcon className="w-4 h-4" />
            <span>{formatTime(standup.started_at)}</span>
            {standup.completed_at && (
              <>
                <span className="text-dark-600">→</span>
                <span>{formatTime(standup.completed_at)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotesDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100 hover:border-dark-500 transition-colors"
            title="Standup Notes"
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Standup Notes</span>
          </button>
          {standup.status === 'completed' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/10 border border-green-500/20 rounded-full">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-500 font-medium">Completed</span>
            </div>
          )}
          {standup.status === 'running' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600/10 border border-yellow-500/20 rounded-full">
              <ArrowPathIcon className="w-4 h-4 text-yellow-500 animate-spin" />
              <span className="text-xs text-yellow-500 font-medium">In Progress</span>
            </div>
          )}
          {standup.status === 'error' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-500/20 rounded-full">
              <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-500 font-medium">Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Agent messages (transcript) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-500">No reports in this standup</p>
          </div>
        ) : (
          messages.map((message) => {
            const agentEntry = standup.entries?.find((e) => e.agent_id === message.agent_id);
            const agentName = agentEntry?.user_name || message.agent_id;
            const displayName = agentEntry?.agent_title
              ? `${agentName} (${agentEntry.agent_title})`
              : agentName;
            const avatarUrl = agentEntry?.avatar_url || null;

            return (
              <div key={message.id} className="flex gap-3">
                <AgentAvatar
                  agentId={message.agent_id}
                  userName={agentName}
                  avatarUrl={avatarUrl}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold text-dark-100">
                      {displayName}
                    </span>
                    <span className="text-xs text-dark-500">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <div className="p-3 bg-dark-800 border border-dark-700 rounded-lg">
                    <div className="text-sm text-dark-300 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <StandupNotesDrawer
        isOpen={notesDrawerOpen}
        onClose={() => setNotesDrawerOpen(false)}
        standup={standup}
      />
    </div>
  );
}

export default function Standup() {
  const {
    standups,
    isLoadingList,
    errorList,
    activeStandup,
    isLoadingDetail,
    errorDetail,
    fetchStandups,
    fetchStandupById,
    clearActiveStandup,
  } = useStandupStore();

  const showToast = useToastStore((state) => state.showToast);
  const [selectedStandupId, setSelectedStandupId] = useState(null);

  useEffect(() => {
    fetchStandups();
  }, [fetchStandups]);

  // Auto-select latest standup
  useEffect(() => {
    if (!selectedStandupId && standups.length > 0 && !isLoadingList) {
      const latest = standups[0];
      if (latest) {
        setSelectedStandupId(latest.id);
        fetchStandupById(latest.id);
      }
    }
  }, [selectedStandupId, standups, isLoadingList, fetchStandupById]);

  const handleSelectStandup = useCallback((standup) => {
    setSelectedStandupId(standup.id);
    fetchStandupById(standup.id);
  }, [fetchStandupById]);

  const handleBack = useCallback(() => {
    setSelectedStandupId(null);
    clearActiveStandup();
  }, [clearActiveStandup]);

  const handleRefresh = useCallback(async () => {
    try {
      await fetchStandups({ silent: false });
      showToast('Standups refreshed', 'success');
    } catch (error) {
      logger.error('Failed to refresh standups', error);
      showToast('Failed to refresh standups', 'error');
    }
  }, [fetchStandups, showToast]);

  const showDetail = selectedStandupId && activeStandup;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Executive Standup"
        subtitle="Daily reports from all agents"
        onRefresh={handleRefresh}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Archive list */}
        <div
          className={`${
            showDetail ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-96 border-r border-dark-700 bg-dark-900`}
        >
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wide">
              Meeting Archive
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-dark-700 text-dark-400 rounded">
              {standups.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingList ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-dark-500 ml-3">Loading standups...</span>
              </div>
            ) : errorList ? (
              <div className="text-center py-12">
                <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-dark-400 mb-2">Failed to load standups</p>
                <p className="text-sm text-dark-500 mb-4">{errorList}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : standups.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400 mb-2">No standups yet</p>
                <p className="text-sm text-dark-500">
                  Standups are generated automatically at 8am daily
                </p>
              </div>
            ) : (
              standups.map((standup) => (
                <StandupCard
                  key={standup.id}
                  standup={standup}
                  onClick={() => handleSelectStandup(standup)}
                  isActive={selectedStandupId === standup.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail view */}
        <div
          className={`${
            showDetail ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-dark-900`}
        >
          {isLoadingDetail ? (
            <div className="flex items-center justify-center h-full">
              <div className="inline-block w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-dark-500 ml-3">Loading standup...</span>
            </div>
          ) : errorDetail ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-dark-400 mb-2">Failed to load standup</p>
                <p className="text-sm text-dark-500">{errorDetail}</p>
              </div>
            </div>
          ) : activeStandup ? (
            <StandupDetail standup={activeStandup} onBack={handleBack} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <CalendarIcon className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">Select a standup to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
