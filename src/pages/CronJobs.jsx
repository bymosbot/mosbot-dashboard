import { useEffect, useState, useCallback, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import Header from "../components/Header";
import MarkdownRenderer from "../components/MarkdownRenderer";
import SessionDetailPanel from "../components/SessionDetailPanel";
import { api, getCronJobs, createCronJob, updateCronJob, deleteCronJob, setCronJobEnabled, triggerCronJob, getInstanceConfig } from "../api/client";
import { stripMarkdown } from "../utils/helpers";
import { useToastStore } from '../stores/toastStore';
import { useAgentStore } from '../stores/agentStore';
import { useSchedulerStore } from '../stores/schedulerStore';
import logger from '../utils/logger';

// Import the existing CronJobRow component styling logic
import {
  ClockIcon,
  CalendarDaysIcon,
  HeartIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

// Copied and adapted from CronJobList.jsx
function formatSchedule(schedule, job) {
  if (!schedule && !job) return 'Unknown';
  if (schedule?.label) return `Every ${schedule.label}`;
  if (schedule?.kind === 'every') {
    const ms = schedule.everyMs;
    if (!ms) return 'Every ?';
    if (ms < 60000) return `Every ${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `Every ${Math.round(ms / 60000)}m`;
    if (ms < 86400000) {
      const h = Math.floor(ms / 3600000);
      const m = Math.round((ms % 3600000) / 60000);
      return m > 0 ? `Every ${h}h ${m}m` : `Every ${h}h`;
    }
    return `Every ${Math.round(ms / 86400000)}d`;
  }
  if (schedule?.kind === 'cron') {
    const expr = schedule.expr || '';
    const tz = schedule.tz ? ` (${schedule.tz})` : '';
    return `Cron ${expr}${tz}`;
  }
  if (schedule?.kind === 'at') {
    const at = schedule.at;
    if (!at) return 'One-shot';
    try {
      return `At ${new Date(at).toLocaleString()}`;
    } catch {
      return `At ${at}`;
    }
  }
  if (job) {
    if (job.cron) {
      const tz = job.tz || job.timezone;
      return `Cron ${job.cron}${tz ? ` (${tz})` : ''}`;
    }
    if (job.expression) {
      const tz = job.tz || job.timezone;
      return `Cron ${job.expression}${tz ? ` (${tz})` : ''}`;
    }
    if (job.interval || job.every) {
      return `Every ${job.interval || job.every}`;
    }
  }
  return 'Unknown';
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  const minutes = Math.floor(absDiffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let label;
  if (minutes < 1) label = 'just now';
  else if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h ${minutes % 60}m`;
  else label = `${days}d ${hours % 24}h`;

  if (isFuture) return `${label} from now`;
  return `${label} ago`;
}

function formatModel(model) {
  if (!model) return null;
  const modelPart = model.includes('/') ? model.split('/').pop() : model;
  const lower = modelPart.toLowerCase();
  if (lower.includes('kimi-k2')) return 'Kimi K2.5';
  if (lower.includes('opus-4')) return 'Opus 4';
  if (lower.includes('sonnet-4')) return 'Sonnet 4.5';
  if (lower.includes('haiku-4')) return 'Haiku 4.5';
  if (lower.includes('gemini-2.5-flash-lite')) return 'Gemini Flash Lite';
  if (lower.includes('gemini-2.5-flash')) return 'Gemini Flash';
  if (lower.includes('gemini-2.5')) return 'Gemini 2.5';
  if (lower.includes('gpt-5')) return 'GPT-5.2';
  if (lower.includes('deepseek')) return 'DeepSeek';
  return modelPart;
}

// Accept both ms-epoch integers and ISO strings for backwards compat with heartbeat jobs
function toMs(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  const ms = new Date(value).getTime();
  return isNaN(ms) ? null : ms;
}

function getStatusBadge(lastStatus, enabled, nextRunAtMs, lastRunAtMs) {
  if (enabled === false) {
    return {
      classes: 'bg-dark-600/10 text-dark-400 border-dark-600/20',
      icon: XCircleIcon,
      label: 'disabled',
    };
  }
  if (enabled !== false && !nextRunAtMs && !lastRunAtMs) {
    return {
      classes: 'bg-yellow-600/10 text-yellow-500 border-yellow-500/20',
      icon: ExclamationTriangleIcon,
      label: 'not scheduled',
    };
  }
  if (enabled !== false && nextRunAtMs && nextRunAtMs < Date.now()) {
    return {
      classes: 'bg-yellow-600/10 text-yellow-500 border-yellow-500/20',
      icon: ExclamationTriangleIcon,
      label: 'missed',
    };
  }
  if (lastStatus === 'error') {
    return {
      classes: 'bg-red-600/10 text-red-500 border-red-500/20',
      icon: ExclamationTriangleIcon,
      label: 'error',
    };
  }
  return {
    classes: 'bg-green-600/10 text-green-500 border-green-500/20',
    icon: CheckCircleIcon,
    label: 'enabled',
  };
}

function CronJobRow({ job, onEdit, onDelete, onToggleEnabled, onTrigger, onJobClick, agents }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Prefer ms-epoch fields from state object; fall back to legacy top-level ISO strings
  const nextRunAtMs = toMs(job.state?.nextRunAtMs ?? job.nextRunAt);
  const lastRunAtMs = toMs(job.state?.lastRunAtMs ?? job.lastRunAt);
  const lastStatus = job.state?.lastStatus ?? job.status ?? null;

  const badge = getStatusBadge(lastStatus, job.enabled, nextRunAtMs, lastRunAtMs);
  const BadgeIcon = badge.icon;
  const isHeartbeat = job.source === 'config' || job.payload?.kind === 'heartbeat';

  const prompt = job.payload?.message || job.payload?.text || job.payload?.prompt || job.prompt || null;
  const agentId = job.agentId || null;
  
  // Get model: use job-specific model, or fall back to agent's default model
  const agent = agents.find(a => a.id === agentId);
  const jobModel = job.payload?.model || null;
  const agentModel = job.agentModel || agent?.model?.primary || agent?.model || null;
  const displayModel = jobModel || agentModel;

  const IconElement = isHeartbeat ? (
    job.agentEmoji ? (
      <span className="text-xl leading-none" role="img" aria-label={agentId}>
        {job.agentEmoji}
      </span>
    ) : (
      <HeartIcon className="w-5 h-5 text-pink-400" />
    )
  ) : (
    <CalendarDaysIcon className="w-5 h-5 text-dark-400" />
  );

  const handleCardClick = () => {
    if (onJobClick) {
      onJobClick(job);
    }
  };

  return (
    <div 
      className="group p-4 bg-dark-800 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`View run history for ${job.name}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{IconElement}</div>
        
        <div className="flex-1 min-w-0">
          {/* Top line: Name (left), Badge + Actions (right) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <p className="text-base font-semibold text-dark-100">{job.name}</p>
              <span
                className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
                  isHeartbeat
                    ? 'text-pink-400 bg-pink-500/10 border-pink-500/20'
                    : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                }`}
              >
                {isHeartbeat ? 'HEARTBEAT' : 'CRON'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`px-2.5 py-0.5 text-xs font-medium rounded-full border flex items-center gap-1 ${badge.classes}`}
              >
                <BadgeIcon className="w-3 h-3" />
                {badge.label}
              </span>
              {/* Action buttons - visible on hover on desktop, always visible on mobile */}
              <div 
                className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Run Now button - only for enabled jobs */}
                {job.enabled !== false && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrigger(job);
                    }}
                    className="p-1.5 text-dark-400 hover:text-green-400 hover:bg-dark-700 rounded transition-colors"
                    title="Run now"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                )}
                {/* Enable/Disable button - only for gateway jobs */}
                {!isHeartbeat && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleEnabled(job);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-dark-300 hover:text-dark-100 bg-dark-700 hover:bg-dark-600 rounded transition-colors"
                    title={job.enabled ? 'Disable' : 'Enable'}
                  >
                    {job.enabled ? 'Disable' : 'Enable'}
                  </button>
                )}
                {/* Edit button - available for all jobs */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(job);
                  }}
                  className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded transition-colors"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                {/* Delete button - only for gateway jobs */}
                {!isHeartbeat && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(job);
                    }}
                    className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <p className="text-sm text-dark-400 mt-1 line-clamp-1 leading-relaxed">
              {job.description}
            </p>
          )}

          {/* Schedule info with agent and model inline */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-dark-400 flex-wrap">
            <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium">{formatSchedule(job.schedule, job)}</span>
            {agentId && (
              <>
                <span className="text-dark-600">•</span>
                <span className="text-dark-500">Agent:</span>
                <span className="text-primary-400 font-medium">{job.agentName || agent?.name || agentId}</span>
              </>
            )}
            {displayModel && (
              <>
                <span className="text-dark-600">•</span>
                <span className="text-dark-500">Model:</span>
                <span className="text-dark-300 font-mono text-[11px]">
                  {formatModel(displayModel)}
                  {jobModel && (
                    <span className="ml-1 text-primary-400" title="Custom model override">*</span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Next/Last run timing */}
          {((job.enabled !== false && nextRunAtMs) || lastRunAtMs) && (
            <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
              {job.enabled !== false && nextRunAtMs && (
                <div className="flex items-center gap-1.5">
                  <span className="text-dark-500 font-medium uppercase tracking-wide">
                    {badge.label === 'missed' ? 'Missed' : 'Next'}
                  </span>
                  <span className={badge.label === 'missed' ? 'text-yellow-400 font-medium' : 'text-dark-300'}>
                    {formatRelativeTime(nextRunAtMs)}
                  </span>
                </div>
              )}
              {lastRunAtMs && (
                <>
                  {job.enabled !== false && nextRunAtMs && <span className="text-dark-600">•</span>}
                  <div className="flex items-center gap-1.5">
                    <span className="text-dark-500 font-medium uppercase tracking-wide">Last</span>
                    <span className="text-dark-300">{formatRelativeTime(lastRunAtMs)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Collapsible prompt preview */}
          {prompt && (
            <div className="mt-2">
              {!isExpanded ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-dark-400 line-clamp-1 flex-1">
                    {stripMarkdown(prompt)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(true);
                    }}
                    className="text-xs text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap"
                  >
                    Show more
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-dark-900/50 border border-dark-700/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-dark-500 uppercase tracking-wider font-medium">
                      Prompt
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                      }}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                    >
                      Show less
                    </button>
                  </div>
                  <MarkdownRenderer
                    content={prompt}
                    size="sm"
                    className="text-dark-300 leading-relaxed"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mirrors the server-side slugifyJobId — used for the live preview only
function slugifyJobId(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

// Helper function to parse common cron expressions
function parseCronExpression(expr) {
  if (!expr || typeof expr !== 'string') return null;
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Daily patterns
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    if (!isNaN(h) && !isNaN(m)) {
      return `Runs daily at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  // Hourly patterns
  if (minute !== '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const m = parseInt(minute, 10);
    if (!isNaN(m)) {
      return `Runs every hour at ${m} minutes past`;
    }
  }

  // Every X hours
  if (minute !== '*' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const h = parseInt(hour.substring(2), 10);
    const m = parseInt(minute, 10);
    if (!isNaN(h) && !isNaN(m)) {
      return `Runs every ${h} hours at ${m} minutes past`;
    }
  }

  // Weekly patterns
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = { '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' };
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const dayName = days[dayOfWeek];
    if (!isNaN(h) && !isNaN(m) && dayName) {
      return `Runs every ${dayName} at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  return null;
}

function CronJobModal({ isOpen, onClose, job, onSave, timezone = 'UTC' }) {
  const agents = useAgentStore((state) => state.agents);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scheduleKind: 'cron',
    cronExpr: '',
    everyInterval: '30',
    everyUnit: 'm',
    prompt: '',
    agentId: '',
    model: '',
    sessionTarget: 'isolated', // isolated required for agentTurn (default for new jobs)
    wakeMode: 'now', // 'now' or 'next-heartbeat'
    deliveryMode: 'announce', // 'announce' or 'none'
    enabled: true,
    // Heartbeat-specific fields
    target: 'last',
    ackMaxChars: '200',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [jobIdCopied, setJobIdCopied] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  // Fetch available models when modal opens (lazy load)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingModels(true);
    api.get('/models')
      .then((res) => {
        if (!cancelled) {
          setModels(res.data?.data?.models ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          logger.error('Failed to fetch models', err);
          setModels([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingModels(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (job) {
      const schedule = job.schedule || {};

      // Parse schedule: for heartbeats, schedule might be in different format
      let scheduleKind = schedule.kind || 'cron';
      let everyInterval = '30';
      let everyUnit = 'm';
      
      if (schedule.kind === 'every' && schedule.everyMs) {
        everyInterval = Math.floor(schedule.everyMs / 60000).toString();
        everyUnit = 'm';
      } else if (schedule.label) {
        // Parse label like "30m", "1h", etc.
        const match = schedule.label.match(/^(\d+)([smh])$/);
        if (match) {
          everyInterval = match[1];
          everyUnit = match[2];
          scheduleKind = 'every';
        }
      }
      
      // Extract prompt from official format (text for systemEvent, message for agentTurn)
      const promptText = job.payload?.message || job.payload?.text || job.payload?.prompt || job.prompt || '';
      // Extract session target from top-level or payload
      const sessionTargetValue = job.sessionTarget || job.payload?.session || 'main';

      setFormData({
        name: job.name || '',
        description: job.description || '',
        scheduleKind,
        cronExpr: schedule.expr || '',
        everyInterval,
        everyUnit,
        prompt: promptText,
        agentId: job.agentId || '',
        model: job.payload?.model || '',
        sessionTarget: sessionTargetValue,
        wakeMode: job.wakeMode || 'now',
        deliveryMode: job.delivery?.mode || 'announce',
        enabled: job.enabled !== false,
        target: job.payload?.target || 'last',
        ackMaxChars: job.payload?.ackMaxChars?.toString() || '200',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        scheduleKind: 'cron',
        cronExpr: '',
        everyInterval: '30',
        everyUnit: 'm',
        prompt: '',
        agentId: agents.length > 0 ? agents[0].id : '',
        model: '',
        sessionTarget: 'isolated',
        wakeMode: 'now',
        deliveryMode: 'announce',
        enabled: true,
        target: 'last',
        ackMaxChars: '200',
      });
    }
  }, [job, isOpen, agents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const isHeartbeat = job?.source === 'config' || job?.payload?.kind === 'heartbeat';
    const isIsolated = formData.sessionTarget === 'isolated';

    // Client-side validation for schema rules
    if (!isHeartbeat && !formData.agentId) {
      showToast('Agent is required', 'error');
      return;
    }
    if (!isHeartbeat && isIsolated && !formData.model.trim()) {
      showToast('AI Model is required for isolated (agentTurn) sessions', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        enabled: formData.enabled,
        agentId: formData.agentId || undefined,
        wakeMode: formData.wakeMode || 'now',
        schedule: {},
        sessionTarget: formData.sessionTarget || 'isolated',
        payload: {},
      };

      if (formData.scheduleKind === 'cron') {
        payload.schedule = {
          kind: 'cron',
          expr: formData.cronExpr.trim(),
          tz: timezone,
        };
      } else if (formData.scheduleKind === 'every') {
        const intervalValue = parseInt(formData.everyInterval, 10);
        const multiplier = formData.everyUnit === 's' ? 1000 : formData.everyUnit === 'm' ? 60000 : 3600000;
        payload.schedule = {
          kind: 'every',
          everyMs: intervalValue * multiplier,
          label: `${intervalValue}${formData.everyUnit}`,
        };
      }

      if (isHeartbeat) {
        payload.payload.kind = 'heartbeat';
        payload.payload.target = formData.target;
        const ackMaxChars = parseInt(formData.ackMaxChars, 10);
        if (!isNaN(ackMaxChars) && ackMaxChars > 0) {
          payload.payload.ackMaxChars = ackMaxChars;
        }
        if (formData.prompt.trim()) {
          payload.payload.prompt = formData.prompt.trim();
          payload.payload.message = formData.prompt.trim();
        }
        payload.payload.session = formData.sessionTarget;
      } else if (isIsolated) {
        // isolated → agentTurn (schema rule: sessionTarget=isolated required for agentTurn)
        payload.payload.kind = 'agentTurn';
        payload.payload.message = formData.prompt.trim();
        payload.payload.model = formData.model.trim();
      } else {
        // main → systemEvent
        payload.payload.kind = 'systemEvent';
        payload.payload.text = formData.prompt.trim();
      }

      // Delivery config
      if (formData.deliveryMode) {
        payload.delivery = { mode: formData.deliveryMode };
      }

      await onSave(payload);
      onClose();
      showToast(job ? 'Scheduled job updated successfully' : 'Scheduled job created successfully', 'success');
    } catch (error) {
      logger.error('Failed to save scheduled job', error);
      showToast(error.response?.data?.error?.message || 'Failed to save scheduled job', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cronPreview = formData.scheduleKind === 'cron' ? parseCronExpression(formData.cronExpr) : null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-dark-900 border border-dark-700 shadow-xl transition-all">
                {/* Modal Header with X button and Enabled toggle */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-dark-700">
                  <Dialog.Title className="text-lg font-semibold text-dark-100">
                    {job ? 'Edit Scheduled Job' : 'Create Scheduled Job'}
                  </Dialog.Title>
                  <div className="flex items-center gap-3">
                    {/* Enabled Toggle Switch */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-dark-300 font-medium">Enabled</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.enabled}
                        onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.enabled ? 'bg-primary-600' : 'bg-dark-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Daily workspace review"
                    />
                    {/* Job ID — derived preview on create, immutable display on edit */}
                    {(() => {
                      const displayId = job ? (job.jobId || job.id) : slugifyJobId(formData.name);
                      if (!displayId) return null;
                      return (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-dark-500 font-medium shrink-0">
                            {job ? 'Job ID' : 'Will be assigned ID'}
                          </span>
                          <code className="text-xs text-dark-300 font-mono bg-dark-800 border border-dark-700 px-2 py-0.5 rounded flex-1 truncate">
                            {displayId}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(displayId);
                              setJobIdCopied(true);
                              setTimeout(() => setJobIdCopied(false), 1500);
                            }}
                            className="p-1 text-dark-500 hover:text-dark-200 transition-colors shrink-0"
                            title="Copy job ID"
                          >
                            {jobIdCopied
                              ? <span className="text-[10px] text-green-400 font-medium">Copied</span>
                              : <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                            }
                          </button>
                          {!job && (
                            <span className="text-[10px] text-dark-600 shrink-0">auto-generated</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Optional description"
                    />
                  </div>

                  {/* Schedule Section */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1">
                        Schedule Type *
                      </label>
                      <select
                        value={formData.scheduleKind}
                        onChange={(e) => setFormData({ ...formData, scheduleKind: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="cron">Cron Expression</option>
                        <option value="every">Interval</option>
                      </select>
                    </div>

                    {formData.scheduleKind === 'cron' && (
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                          Cron Expression *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.cronExpr}
                          onChange={(e) => setFormData({ ...formData, cronExpr: e.target.value })}
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                          placeholder="0 9 * * *"
                        />
                        {cronPreview ? (
                          <p className="text-xs text-primary-400 mt-1.5 font-medium">
                            {cronPreview}
                            <span className="text-dark-500 font-normal ml-1">({timezone})</span>
                          </p>
                        ) : (
                          <p className="text-xs text-dark-500 mt-1">
                            {`Example: "0 9 * * *" = daily at 9:00 AM (${timezone})`}
                          </p>
                        )}
                      </div>
                    )}

                    {formData.scheduleKind === 'every' && (
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">
                          Run Every *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            required
                            min="1"
                            value={formData.everyInterval}
                            onChange={(e) => setFormData({ ...formData, everyInterval: e.target.value })}
                            className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <select
                            value={formData.everyUnit}
                            onChange={(e) => setFormData({ ...formData, everyUnit: e.target.value })}
                            className="px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="s">seconds</option>
                            <option value="m">minutes</option>
                            <option value="h">hours</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Prompt/Message
                    </label>
                    <textarea
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                      rows={5}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Message to send when this job runs"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1">
                        Agent *
                      </label>
                      <select
                        required
                        value={formData.agentId}
                        onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {agents.length === 0 && <option value="">No agents available</option>}
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.icon} {agent.name} ({agent.id.toUpperCase()})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-dark-500 mt-1">
                        Which agent will run this job
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1">
                        Session *
                      </label>
                      <select
                        value={formData.sessionTarget}
                        onChange={(e) => setFormData({ ...formData, sessionTarget: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="isolated">Isolated — fresh context each run (agentTurn)</option>
                        <option value="main">Main — persistent shared context (systemEvent)</option>
                      </select>
                      <p className="text-xs text-dark-500 mt-1">
                        Isolated: new session per run, requires model. Main: reuses agent&apos;s persistent session
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1">
                        AI Model {formData.sessionTarget === 'isolated' ? '*' : ''}
                      </label>
                      <select
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        disabled={loadingModels}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                      >
                        {formData.sessionTarget !== 'isolated' && (
                          <option value="">Default (use agent model)</option>
                        )}
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.id}){m.isDefault ? ' — default' : ''}
                          </option>
                        ))}
                        {formData.model && !models.some((m) => m.id === formData.model) && (
                          <option value={formData.model}>Current: {formData.model}</option>
                        )}
                      </select>
                      <p className="text-xs text-dark-500 mt-1">
                        {formData.sessionTarget === 'isolated'
                          ? 'Required for isolated sessions'
                          : 'Optional: override agent\u2019s default model'}
                      </p>
                      {loadingModels && (
                        <p className="text-xs text-dark-500 mt-1">Loading models...</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1">
                        Wake Mode *
                      </label>
                      <select
                        value={formData.wakeMode}
                        onChange={(e) => setFormData({ ...formData, wakeMode: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="now">Now — run immediately when scheduled</option>
                        <option value="next-heartbeat">Next heartbeat — wait for agent heartbeat</option>
                      </select>
                      <p className="text-xs text-dark-500 mt-1">
                        Now: fires at the scheduled time. Next heartbeat: defers to the agent&apos;s next heartbeat cycle
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Delivery
                    </label>
                    <select
                      value={formData.deliveryMode}
                      onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="announce">Announce — send summary to configured channels</option>
                      <option value="none">None — run silently without notifications</option>
                    </select>
                  </div>

                  {/* Heartbeat-specific fields */}
                  {(job?.source === 'config' || job?.payload?.kind === 'heartbeat') && (
                    <div className="pt-4 border-t border-dark-700">
                      <h4 className="text-sm font-semibold text-dark-200 mb-3">Heartbeat Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-dark-300 mb-1">
                            Target
                          </label>
                          <select
                            value={formData.target}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="last">Last (most recent session)</option>
                            <option value="main">Main (primary session)</option>
                          </select>
                          <p className="text-xs text-dark-500 mt-1">
                            Which session to target for heartbeat checks
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-dark-300 mb-1">
                            Acknowledgment Max Chars
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={formData.ackMaxChars}
                            onChange={(e) => setFormData({ ...formData, ackMaxChars: e.target.value })}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="200"
                          />
                          <p className="text-xs text-dark-500 mt-1">
                            Maximum characters for heartbeat acknowledgment
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-dark-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : job ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function DeleteConfirmModal({ isOpen, onClose, job, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-dark-900 border border-dark-700 p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-dark-100 mb-2">
                  Delete Scheduled Job
                </Dialog.Title>
                <p className="text-sm text-dark-400 mb-4">
                  Are you sure you want to delete &quot;<span className="font-medium text-dark-200">{job?.name}</span>&quot;? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-dark-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default function CronJobs() {
  const agents = useAgentStore((state) => state.agents);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, enabled, disabled, gateway, config, agent-{id}
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [instanceTimezone, setInstanceTimezone] = useState('UTC');
  const showToast = useToastStore((state) => state.showToast);
  const setAttention = useSchedulerStore((state) => state.setAttention);

  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCronJobs();
      setJobs(data || []);
    } catch (err) {
      logger.error('Failed to fetch cron jobs', err);
      showToast('Failed to load cron jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadJobs();
    getInstanceConfig()
      .then((config) => {
        if (config?.timezone) setInstanceTimezone(config.timezone);
      })
      .catch(() => { /* keep default UTC */ });
  }, [loadJobs]);

  const handleCreate = async (payload) => {
    await createCronJob(payload);
    await loadJobs();
  };

  const handleUpdate = async (payload) => {
    if (!editingJob) return;
    await updateCronJob(editingJob.jobId || editingJob.id, payload);
    await loadJobs();
  };

  const handleDelete = async () => {
    if (!deletingJob) return;
    try {
      await deleteCronJob(deletingJob.jobId || deletingJob.id);
      showToast('Scheduled job deleted successfully', 'success');
      await loadJobs();
    } catch (error) {
      logger.error('Failed to delete cron job', error);
      showToast(error.response?.data?.error?.message || 'Failed to delete scheduled job', 'error');
    }
  };

  const handleToggleEnabled = async (job) => {
    try {
      await setCronJobEnabled(job.jobId || job.id, !job.enabled);
      showToast(`Scheduled job ${job.enabled ? 'disabled' : 'enabled'} successfully`, 'success');
      await loadJobs();
    } catch (error) {
      logger.error('Failed to toggle cron job', error);
      showToast(error.response?.data?.error?.message || 'Failed to toggle scheduled job', 'error');
    }
  };

  const handleTrigger = async (job) => {
    try {
      await triggerCronJob(job.jobId || job.id);
      showToast(`"${job.name}" triggered — it will run within the next 60 seconds`, 'success');
      await loadJobs();
    } catch (error) {
      logger.error('Failed to trigger cron job', error);
      showToast(error.response?.data?.error?.message || 'Failed to trigger scheduled job', 'error');
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'enabled') return job.enabled !== false;
    if (filter === 'disabled') return job.enabled === false;
    if (filter === 'gateway') return job.source === 'gateway';
    if (filter === 'config') return job.source === 'config';
    if (filter.startsWith('agent-')) {
      const agentId = filter.replace('agent-', '');
      return job.agentId === agentId;
    }
    return true;
  });

  // Separate jobs into groups
  const scheduledJobs = filteredJobs.filter(j => j.source === 'gateway');
  const heartbeatJobs = filteredJobs.filter(j => j.source === 'config');

  // Calculate stats — use ms-epoch fields from state; fall back to legacy ISO strings
  const enabledCount = jobs.filter(j => j.enabled !== false).length;
  const disabledCount = jobs.filter(j => j.enabled === false).length;
  const nowMs = Date.now();
  const errorCount = jobs.filter(j => (j.state?.lastStatus ?? j.status) === 'error').length;
  const missedCount = jobs.filter(j => {
    const nxt = toMs(j.state?.nextRunAtMs ?? j.nextRunAt);
    return j.enabled !== false && nxt && nxt < nowMs;
  }).length;

  // Find next upcoming job (only future runs, ignore missed)
  const nextJob = jobs
    .filter(j => {
      const nxt = toMs(j.state?.nextRunAtMs ?? j.nextRunAt);
      return j.enabled !== false && nxt && nxt > nowMs;
    })
    .sort((a, b) => {
      const aMs = toMs(a.state?.nextRunAtMs ?? a.nextRunAt);
      const bMs = toMs(b.state?.nextRunAtMs ?? b.nextRunAt);
      return aMs - bMs;
    })[0];

  // Count jobs per agent
  const agentJobCounts = agents.reduce((acc, agent) => {
    acc[agent.id] = jobs.filter(j => j.agentId === agent.id).length;
    return acc;
  }, {});

  // Sync attention counts to store for sidebar badges (only when done loading to avoid flashing 0)
  useEffect(() => {
    if (!isLoading) {
      setAttention({ errors: errorCount, missed: missedCount });
    }
  }, [isLoading, errorCount, missedCount, setAttention]);

  const FilterChip = ({ label, value, count }) => {
    const isActive = filter === value;
    return (
      <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
          isActive
            ? 'bg-primary-600 text-white'
            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100'
        }`}
      >
        {label} {count !== undefined && `(${count})`}
      </button>
    );
  };

  // Helper: convert job to session-shaped object for SessionDetailPanel
  const toSessionShape = (job) => {
    if (!job) return null;

    const isHeartbeat = job.source === 'config' || job.payload?.kind === 'heartbeat';
    
    // For gateway cron: use lastExecution.sessionKey
    // For heartbeat: use agent:${agentId}:main (main session)
    const sessionKey = job.lastExecution?.sessionKey
      ?? (isHeartbeat && job.agentId ? `agent:${job.agentId}:main` : null);

    return {
      key: sessionKey,
      label: job.name,
      agent: job.agentId,
      status: job.status || (job.enabled !== false ? 'idle' : 'completed'),
      kind: isHeartbeat ? 'heartbeat' : 'cron',
      model: job.lastExecution?.model || job.payload?.model || job.agentModel || null,
      inputTokens: job.lastExecution?.inputTokens || 0,
      outputTokens: job.lastExecution?.outputTokens || 0,
      messageCost: job.lastExecution?.messageCost || 0,
      contextTokens: job.lastExecution?.contextTokens || 0,
      totalTokensUsed: job.lastExecution?.totalTokensUsed || 0,
      contextUsagePercent: job.lastExecution?.contextUsagePercent || 0,
      updatedAt: toMs(job.state?.lastRunAtMs ?? job.lastRunAt),
    };
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Scheduler"
        subtitle="Scheduled jobs, intervals, and heartbeats"
        onRefresh={loadJobs}
      />

      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Stats Bar */}
          {!isLoading && jobs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-dark-800 border border-dark-700 rounded-lg">
                <p className="text-xs text-dark-500 uppercase tracking-wide font-medium mb-1">Total Jobs</p>
                <p className="text-2xl font-bold text-dark-100">{jobs.length}</p>
              </div>
              <div className="p-4 bg-dark-800 border border-dark-700 rounded-lg">
                <p className="text-xs text-dark-500 uppercase tracking-wide font-medium mb-1">Enabled / Disabled</p>
                <p className="text-2xl font-bold text-dark-100">
                  <span className="text-green-400">{enabledCount}</span>
                  <span className="text-dark-600 mx-2">/</span>
                  <span className="text-dark-500">{disabledCount}</span>
                </p>
              </div>
              <div className="p-4 bg-dark-800 border border-dark-700 rounded-lg">
                <p className="text-xs text-dark-500 uppercase tracking-wide font-medium mb-1">Errors / Missed</p>
                <p className="text-2xl font-bold text-dark-100">
                  <span className={errorCount > 0 ? 'text-red-400' : 'text-dark-500'}>{errorCount}</span>
                  <span className="text-dark-600 mx-2">/</span>
                  <span className={missedCount > 0 ? 'text-yellow-400' : 'text-dark-500'}>{missedCount}</span>
                </p>
              </div>
              <div className="p-4 bg-dark-800 border border-dark-700 rounded-lg">
                <p className="text-xs text-dark-500 uppercase tracking-wide font-medium mb-1">Next Run</p>
                {nextJob ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-dark-200 line-clamp-1">{nextJob.name}</p>
                    <p className="text-xs text-primary-400 font-medium">{formatRelativeTime(toMs(nextJob.state?.nextRunAtMs ?? nextJob.nextRunAt))}</p>
                  </div>
                ) : (
                  <p className="text-sm text-dark-500">No upcoming jobs</p>
                )}
              </div>
            </div>
          )}

          {/* Filter Chips */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <FilterChip label="All" value="all" count={jobs.length} />
              <FilterChip label="Enabled" value="enabled" count={enabledCount} />
              <FilterChip label="Disabled" value="disabled" count={disabledCount} />
              <FilterChip label="Scheduled" value="gateway" count={scheduledJobs.length} />
              <FilterChip label="Heartbeats" value="config" count={heartbeatJobs.length} />
              {agents.map((agent) => (
                <FilterChip
                  key={agent.id}
                  label={`${agent.icon} ${agent.name || agent.id}`}
                  value={`agent-${agent.id}`}
                  count={agentJobCounts[agent.id] || 0}
                />
              ))}
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Job
            </button>
          </div>

          {/* Jobs List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-dark-500 ml-3">Loading scheduled jobs...</span>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">No scheduled jobs found</p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-sm text-primary-400 hover:text-primary-300 mt-2"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : filter === 'all' ? (
            /* Sectioned view: Cron (Gateway) vs Heartbeat (Config) */
            <div className="space-y-8">
              {/* When both sections are empty, show a single prominent empty state */}
              {scheduledJobs.length === 0 && heartbeatJobs.length === 0 ? (
                <section className="text-center py-10 px-4 bg-dark-800/50 border border-dark-700 rounded-lg">
                  <CalendarDaysIcon className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                  <p className="text-dark-300 font-medium mb-1">No scheduled jobs yet</p>
                  <p className="text-sm text-dark-500 max-w-md mx-auto mb-4">
                    Create a gateway job with the button above, or configure agent heartbeats in OpenClaw to see them here.
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Job
                  </button>
                </section>
              ) : null}

              {/* Cron (Gateway) Section */}
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wide">
                    Cron (Gateway)
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-dark-700 text-dark-400 rounded">
                    {scheduledJobs.length}
                  </span>
                </div>
                {scheduledJobs.length === 0 ? (
                  <p className="text-sm text-dark-500 py-4">
                    No gateway-scheduled jobs. Use &quot;Create Job&quot; above to add one.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scheduledJobs.map((job) => (
                      <CronJobRow
                        key={job.jobId || job.id || job.name}
                        job={job}
                        agents={agents}
                        onEdit={setEditingJob}
                        onDelete={setDeletingJob}
                        onToggleEnabled={handleToggleEnabled}
                        onTrigger={handleTrigger}
                        onJobClick={setSelectedJob}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Heartbeat (Config) Section */}
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wide">
                    Heartbeat (Config)
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-dark-700 text-dark-400 rounded">
                    {heartbeatJobs.length}
                  </span>
                </div>
                {heartbeatJobs.length === 0 ? (
                  <p className="text-sm text-dark-500 py-4">
                    No agent heartbeats. Configure <code className="text-dark-400 bg-dark-800 px-1 rounded">heartbeat</code> in OpenClaw agent config to see them here.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {heartbeatJobs.map((job) => (
                      <CronJobRow
                        key={job.jobId || job.id || job.name}
                        job={job}
                        agents={agents}
                        onEdit={setEditingJob}
                        onDelete={setDeletingJob}
                        onToggleEnabled={handleToggleEnabled}
                        onTrigger={handleTrigger}
                        onJobClick={setSelectedJob}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            /* Filtered view: single section based on filter */
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-dark-200 uppercase tracking-wide">
                  {filter === 'gateway' ? 'Cron (Gateway)' : filter === 'config' ? 'Heartbeat (Config)' : 'Jobs'}
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-dark-700 text-dark-400 rounded">
                  {filteredJobs.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map((job) => (
                  <CronJobRow
                    key={job.jobId || job.id || job.name}
                    job={job}
                    agents={agents}
                    onEdit={setEditingJob}
                    onDelete={setDeletingJob}
                    onToggleEnabled={handleToggleEnabled}
                    onTrigger={handleTrigger}
                    onJobClick={setSelectedJob}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CronJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        job={null}
        onSave={handleCreate}
        timezone={instanceTimezone}
      />

      <CronJobModal
        isOpen={!!editingJob}
        onClose={() => setEditingJob(null)}
        job={editingJob}
        onSave={handleUpdate}
        timezone={instanceTimezone}
      />

      <DeleteConfirmModal
        isOpen={!!deletingJob}
        onClose={() => setDeletingJob(null)}
        job={deletingJob}
        onConfirm={handleDelete}
      />

      {/* Session Detail Panel for viewing job run history */}
      <SessionDetailPanel
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        session={selectedJob ? toSessionShape(selectedJob) : null}
      />
    </div>
  );
}
