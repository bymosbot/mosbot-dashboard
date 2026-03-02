import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAgentStore } from '../stores/agentStore';
import { getSessionMessages, getCronJobRuns } from '../api/client';
import MarkdownRenderer from './MarkdownRenderer';
import logger from '../utils/logger';

// Gap threshold for detecting a new isolated run boundary
const RUN_GAP_MS = 5 * 60 * 1000;

/** Short hash display with copy-on-click for UUIDs/IDs. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function CopyableId({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const isUuid = UUID_RE.test(value);
  const display = isUuid ? `${value.slice(0, 8)}…` : value;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`${label} ID: ${value}`}
      className="group flex items-center gap-1 text-xs rounded px-1.5 py-0.5 bg-dark-700/50 hover:bg-dark-700 border border-dark-600/50 hover:border-dark-600 transition-colors"
    >
      <span className="text-dark-500">{label}:</span>
      <span className="text-dark-400 font-mono">{display}</span>
      {copied ? (
        <CheckIcon className="w-3 h-3 text-green-400 flex-shrink-0" />
      ) : (
        <ClipboardDocumentIcon className="w-3 h-3 text-dark-600 group-hover:text-dark-400 flex-shrink-0 transition-colors" />
      )}
    </button>
  );
}

/** Extract jobId from cron session key. Format: agent:agentId:cron:jobId or agent:agentId:cron:jobId:run:runId */
function getCronJobIdFromKey(key) {
  if (!key || typeof key !== 'string') return null;
  const parts = key.split(':');
  const cronIdx = parts.indexOf('cron');
  if (cronIdx === -1 || cronIdx + 1 >= parts.length) return null;
  const jobId = parts[cronIdx + 1];
  if (jobId && jobId.startsWith('heartbeat-')) return null;
  return jobId || null;
}

/** Groups a flat message array into runs based on timestamp gaps. */
function groupMessagesIntoRuns(messages) {
  const runs = [];
  messages.forEach((message) => {
    const curTs = message.timestamp ? new Date(message.timestamp).getTime() : null;
    const lastRun = runs[runs.length - 1];
    const lastMsg = lastRun?.messages[lastRun.messages.length - 1];
    const prevTs = lastMsg?.timestamp ? new Date(lastMsg.timestamp).getTime() : null;
    const isNewRun =
      runs.length === 0 || (prevTs !== null && curTs !== null && curTs - prevTs >= RUN_GAP_MS);
    if (isNewRun) {
      runs.push({ startTimestamp: message.timestamp, messages: [] });
    }
    runs[runs.length - 1].messages.push(message);
  });
  return runs;
}

/** Helper to format tool call summary for display. */
function toolCallSummary(tc) {
  const args = tc.arguments || {};
  const firstVal = Object.values(args)[0];
  const preview = typeof firstVal === 'string' ? firstVal : JSON.stringify(firstVal ?? '');
  const short = preview.length > 48 ? `${preview.slice(0, 48)}…` : preview;
  return short ? `${tc.name}(${short})` : tc.name;
}

/** Tool call chip component with expandable arguments. */
function ToolCallChip({ tc }) {
  const [open, setOpen] = useState(false);
  const hasArgs = tc.arguments && Object.keys(tc.arguments).length > 0;
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => hasArgs && setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-dark-700/60 border border-dark-600/50 text-dark-400 ${hasArgs ? 'hover:bg-dark-700 hover:text-dark-300 cursor-pointer' : 'cursor-default'} transition-colors`}
      >
        <span className="text-dark-500">→</span>
        {toolCallSummary(tc)}
        {hasArgs &&
          (open ? (
            <ChevronDownIcon className="w-2.5 h-2.5 ml-0.5 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-2.5 h-2.5 ml-0.5 flex-shrink-0" />
          ))}
      </button>
      {open && (
        <pre className="text-[11px] font-mono text-dark-300 bg-dark-900/60 border border-dark-700/50 rounded px-3 py-2 whitespace-pre-wrap break-all leading-relaxed">
          {JSON.stringify(tc.arguments, null, 2)}
        </pre>
      )}
    </span>
  );
}

/** Renders the messages inside a run group. */
function RunMessages({ messages, getRoleBadgeColor, formatModelName, getDisplayRole }) {
  return (
    <div className="space-y-3">
      {messages.map((message, idx) => {
        const displayRole = getDisplayRole(message);

        // Extract blocks and content, handling both string and array formats
        const blocks = Array.isArray(message.blocks)
          ? message.blocks
          : Array.isArray(message.content)
            ? message.content
            : [];
        const content =
          message.content && typeof message.content === 'string'
            ? message.content.trim()
            : blocks
                .filter((b) => b.type === 'text')
                .map((b) => b.text)
                .join('')
                .trim();
        const toolCalls = blocks.filter((b) => b.type === 'toolCall');

        // Skip assistant messages with truly nothing to show
        if (!content && !toolCalls.length && message.role === 'assistant') return null;

        return (
          <div key={idx} className="bg-dark-800/50 border border-dark-700/50 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(displayRole)}`}
                >
                  {displayRole}
                </span>
                {message.model && (
                  <span className="text-xs text-dark-400">{formatModelName(message.model)}</span>
                )}
              </div>
              {message.timestamp && (
                <span className="text-xs text-dark-400 flex-shrink-0">
                  {new Date(message.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </span>
              )}
            </div>
            {content && (
              <div className="prose prose-invert prose-sm max-w-none">
                <MarkdownRenderer content={content} />
              </div>
            )}
            {toolCalls.length > 0 && (
              <div className={`flex flex-wrap gap-1.5 ${content ? 'mt-3' : ''}`}>
                {toolCalls.map((tc, i) => (
                  <ToolCallChip key={i} tc={tc} />
                ))}
              </div>
            )}
            {!content && !toolCalls.length && (
              <p className="text-sm text-dark-500 italic">No content</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Collapsible run group used for isolated cron sessions (Scheduler view). */
function RunGroup({
  run,
  runNumber,
  totalRuns,
  getRoleBadgeColor,
  formatModelName,
  getDisplayRole,
}) {
  const isLatest = runNumber === totalRuns;
  const [isOpen, setIsOpen] = useState(isLatest);

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        isLatest ? 'border-amber-500/20' : 'border-dark-700/60'
      }`}
    >
      {/* Run header / toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
          isLatest ? 'bg-amber-500/8 hover:bg-amber-500/12' : 'bg-dark-800/60 hover:bg-dark-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOpen ? (
            <ChevronDownIcon
              className={`w-4 h-4 flex-shrink-0 ${isLatest ? 'text-amber-400' : 'text-dark-500'}`}
            />
          ) : (
            <ChevronRightIcon
              className={`w-4 h-4 flex-shrink-0 ${isLatest ? 'text-amber-400' : 'text-dark-500'}`}
            />
          )}
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isLatest ? 'text-amber-400' : 'text-dark-400'
            }`}
          >
            {isLatest ? 'Latest Run' : `Run ${runNumber}`}
          </span>
          {run.startTimestamp && (
            <span
              className={`text-xs font-normal ${isLatest ? 'text-amber-400/60' : 'text-dark-500'}`}
            >
              {new Date(run.startTimestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          )}
        </div>
        <span
          className={`text-xs flex-shrink-0 ${isLatest ? 'text-amber-400/60' : 'text-dark-500'}`}
        >
          {run.messages.length} {run.messages.length === 1 ? 'message' : 'messages'}
        </span>
      </button>

      {isOpen && (
        <div className="p-3 bg-dark-900/40">
          <RunMessages
            messages={run.messages}
            getRoleBadgeColor={getRoleBadgeColor}
            formatModelName={formatModelName}
            getDisplayRole={getDisplayRole}
          />
        </div>
      )}
    </div>
  );
}

export default function SessionDetailPanel({ isOpen, onClose, session, latestRunOnly = false }) {
  const [messages, setMessages] = useState([]);
  const [sessionMetadata, setSessionMetadata] = useState(null);
  const [sessionNotLoaded, setSessionNotLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestRun, setLatestRun] = useState(null);
  const scrollContainerRef = useRef(null);

  const getAgentById = useAgentStore((state) => state.getAgentById);
  const agent = session?.agent ? getAgentById(session.agent) : null;

  // Treat cron and heartbeat sessions as multi-run: both accumulate messages from
  // multiple isolated runs in the same history stream.
  // sessionTarget may not be present on sessions coming from the live sessions store.
  const isGroupedSession = session?.kind === 'cron' || session?.kind === 'heartbeat';
  const allRuns = isGroupedSession ? groupMessagesIntoRuns(messages) : null;
  // latestRunOnly: only show the last run's messages (used by Task Manager)
  const runs = latestRunOnly && allRuns ? allRuns.slice(-1) : allRuns;

  // For cron sessions, fetch the latest run history first, then load its messages
  useEffect(() => {
    if (isOpen && session?.kind === 'cron') {
      loadCronRunHistory();
    } else if (isOpen && session?.key) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMessages/loadCronRunHistory depend on session, which is in deps
  }, [isOpen, session?.key, session?.kind]);

  // Scroll to bottom when messages finish loading
  useEffect(() => {
    if (!isLoading && !error && messages.length > 0 && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [isLoading, error, messages.length]);

  // Load cron run history and fetch messages from the latest run
  const loadCronRunHistory = async () => {
    setIsLoading(true);
    setError(null);
    setSessionNotLoaded(false);
    setLatestRun(null);
    setMessages([]);

    try {
      const jobId = session?.jobId || getCronJobIdFromKey(session?.key);
      if (!jobId) {
        setError('Could not determine cron job ID from session.');
        setIsLoading(false);
        return;
      }

      logger.info('Fetching cron run history', { jobId });
      const runsData = await getCronJobRuns(jobId, { limit: 25 });
      const runs = runsData.runs || [];

      if (runs.length === 0) {
        setError('No run history found for this cron job.');
        setIsLoading(false);
        return;
      }

      // Get the latest run (last in array, as runs are in chronological order)
      const latest = runs[runs.length - 1];
      setLatestRun(latest);

      // If the latest run has a sessionKey, fetch its messages
      if (latest.sessionKey) {
        logger.info('Fetching latest run messages', { sessionKey: latest.sessionKey });
        const messagesData = await getSessionMessages(latest.sessionKey, {
          limit: 200,
          includeTools: true,
        });
        setMessages(messagesData.messages || []);
        logger.info('Latest run messages loaded', {
          messageCount: messagesData.messages?.length || 0,
        });
      } else {
        setMessages([]);
        logger.warn('Latest run has no sessionKey', { run: latest });
      }
    } catch (err) {
      logger.error('Failed to load cron run history', err);
      setError('Failed to load cron run history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    setIsLoading(true);
    setError(null);
    setSessionNotLoaded(false);

    try {
      logger.info('Fetching session messages', { sessionKey: session.key });
      const data = await getSessionMessages(session.key, { limit: 100, includeTools: true });
      setMessages(data.messages || []);
      setSessionMetadata(data.session || null);
      setSessionNotLoaded(data.sessionNotLoaded === true);
      logger.info('Session messages loaded', { messageCount: data.messages?.length || 0 });
    } catch (err) {
      logger.error('Failed to load session messages', err);

      // Check for agent-to-agent access error
      if (
        err.response?.status === 403 &&
        err.response?.data?.error?.code === 'AGENT_TO_AGENT_DISABLED'
      ) {
        setError(
          'Agent session history is not accessible. Agent-to-agent access is disabled in OpenClaw Gateway. ' +
            'Contact your administrator to enable this feature.',
        );
      } else {
        setError('Failed to load session messages. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-600/10 text-green-500 border-green-500/20';
      case 'active':
        return 'bg-blue-600/10 text-blue-500 border-blue-500/20';
      case 'idle':
        return 'bg-yellow-600/10 text-yellow-500 border-yellow-500/20';
      case 'completed':
        return 'bg-dark-600/10 text-dark-400 border-dark-600/20';
      case 'failed':
        return 'bg-red-600/10 text-red-500 border-red-500/20';
      default:
        return 'bg-dark-700 text-dark-400 border-dark-600';
    }
  };

  /**
   * Detects if a message is from an agent/subagent based on content patterns.
   * Agent-to-agent messages often contain markers like "[Subagent Context]" or "[Subagent Task]".
   */
  const detectAgentMessage = (message) => {
    if (!message.content || typeof message.content !== 'string') return false;
    const content = message.content.toLowerCase();
    return (
      content.includes('[subagent context]') ||
      content.includes('[subagent task]') ||
      content.includes('you are running as a subagent') ||
      content.includes('subagent context') ||
      content.includes('subagent task')
    );
  };

  /**
   * Gets the display role for a message, detecting agent messages even if role is "user".
   */
  const getDisplayRole = (message) => {
    // If role is "user" but content suggests it's from an agent, show as "agent"
    if (message.role === 'user' && detectAgentMessage(message)) {
      return 'agent';
    }
    return message.role || 'unknown';
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'user':
        return 'bg-blue-600/10 text-blue-400 border-blue-500/20';
      case 'assistant':
        return 'bg-purple-600/10 text-purple-400 border-purple-500/20';
      case 'system':
        return 'bg-dark-600/10 text-dark-400 border-dark-600/20';
      case 'agent':
        return 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-dark-700 text-dark-400 border-dark-600';
    }
  };

  const formatTokens = (count) => {
    if (!count || count === 0) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toLocaleString();
  };

  const formatCost = (cost) => {
    if (!cost || cost === 0) return null;
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatModelName = (model) => {
    if (!model) return null;
    const modelPart = model.includes('/') ? model.split('/').pop() : model;
    const lower = modelPart.toLowerCase();
    if (lower.includes('kimi-k2')) return 'Kimi K2.5';
    if (lower.includes('opus-4-6') || lower.includes('opus-4')) return 'Opus 4';
    if (lower.includes('sonnet-4-5') || lower.includes('sonnet-4')) return 'Sonnet 4.5';
    if (lower.includes('haiku-4')) return 'Haiku 4.5';
    if (lower.includes('gemini-2.5-flash-lite')) return 'Gemini Flash Lite';
    if (lower.includes('gemini-2.5-flash')) return 'Gemini Flash';
    if (lower.includes('gemini-2.5')) return 'Gemini 2.5';
    if (lower.includes('gpt-5')) return 'GPT-5.2';
    if (lower.includes('deepseek')) return 'DeepSeek';
    return modelPart;
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-dark-950/75 backdrop-blur-sm transition-opacity" />
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
                <Dialog.Panel className="pointer-events-auto w-full sm:w-screen sm:max-w-3xl">
                  <div className="flex h-full flex-col bg-dark-900 shadow-xl border-l border-dark-800">
                    {/* Header */}
                    <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-dark-800 bg-dark-800/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 mt-1">
                            {agent?.icon ? (
                              <div
                                className="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-base"
                                title={session?.agentName || agent?.name || session?.agent}
                              >
                                {agent.icon}
                              </div>
                            ) : (
                              <CpuChipIcon className="w-6 h-6 text-dark-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Dialog.Title className="text-lg font-semibold text-dark-100 truncate">
                              {session?.label || 'Session Details'}
                            </Dialog.Title>
                            {(session?.id ||
                              (session?.kind === 'cron' && getCronJobIdFromKey(session?.key))) && (
                              <div className="mt-0.5 flex items-center gap-3 flex-wrap">
                                {session?.id && <CopyableId label="Session" value={session.id} />}
                                {(session?.jobId ||
                                  (session?.kind === 'cron' &&
                                    getCronJobIdFromKey(session?.key))) && (
                                  <CopyableId
                                    label="Job"
                                    value={session.jobId ?? getCronJobIdFromKey(session.key)}
                                  />
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-3">
                                {session?.agent && (
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <span className="text-dark-500">Agent:</span>
                                    <span className="text-dark-200 font-medium">
                                      {session.agentName || agent?.name || session.agent}
                                    </span>
                                  </div>
                                )}
                                {session?.status && (
                                  <span
                                    className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                      session.status,
                                    )}`}
                                  >
                                    {session.status}
                                  </span>
                                )}
                              </div>

                              {/* Usage information on the right */}
                              {(() => {
                                const detailCost =
                                  session?.messageCost ?? session?.todayTotalCost ?? 0;
                                const isCumul = session?.isCumulative === true;
                                const costLbl = isCumul ? 'Total Cost:' : 'Cost:';
                                return session?.inputTokens > 0 ||
                                  session?.outputTokens > 0 ||
                                  session?.cacheReadTokens > 0 ||
                                  session?.cacheWriteTokens > 0 ||
                                  detailCost > 0 ? (
                                  <div className="flex items-center gap-3 text-xs">
                                    {(session.inputTokens > 0 || session.outputTokens > 0) && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-dark-500">In:</span>
                                        <span className="text-dark-200 font-mono font-medium">
                                          {formatTokens(session.inputTokens)}
                                        </span>
                                        <span className="text-dark-600">•</span>
                                        <span className="text-dark-500">Out:</span>
                                        <span className="text-dark-200 font-mono font-medium">
                                          {formatTokens(session.outputTokens)}
                                        </span>
                                      </div>
                                    )}
                                    {(session.cacheReadTokens > 0 ||
                                      session.cacheWriteTokens > 0) && (
                                      <>
                                        {(session.inputTokens > 0 || session.outputTokens > 0) && (
                                          <span className="text-dark-600">•</span>
                                        )}
                                        <div className="flex items-center gap-2">
                                          {session.cacheReadTokens > 0 && (
                                            <>
                                              <span className="text-dark-500">Cache Read:</span>
                                              <span className="text-emerald-400/80 font-mono font-medium">
                                                {formatTokens(session.cacheReadTokens)}
                                              </span>
                                            </>
                                          )}
                                          {session.cacheWriteTokens > 0 && (
                                            <>
                                              {session.cacheReadTokens > 0 && (
                                                <span className="text-dark-600">•</span>
                                              )}
                                              <span className="text-dark-500">Cache Write:</span>
                                              <span className="text-amber-400/80 font-mono font-medium">
                                                {formatTokens(session.cacheWriteTokens)}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </>
                                    )}
                                    {detailCost > 0 && (
                                      <>
                                        {(session.inputTokens > 0 ||
                                          session.outputTokens > 0 ||
                                          session.cacheReadTokens > 0) && (
                                          <span className="text-dark-600">•</span>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-dark-500">{costLbl}</span>
                                          <span className="text-dark-200 font-mono font-medium">
                                            {formatCost(detailCost)}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ml-3 flex-shrink-0 rounded-md bg-dark-800 p-2 text-dark-400 hover:text-dark-300 hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close panel</span>
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div
                      ref={scrollContainerRef}
                      className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
                    >
                      {isLoading && (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p className="mt-3 text-sm text-dark-400">Loading messages...</p>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="rounded-lg bg-red-900/20 border border-red-800/30 p-4">
                          <p className="text-sm text-red-400">{error}</p>
                          <button
                            onClick={session?.kind === 'cron' ? loadCronRunHistory : loadMessages}
                            className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {!isLoading && !error && session?.kind === 'cron' && !latestRun && (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-dark-600" />
                            <p className="mt-3 text-sm text-dark-400">
                              No run history found for this cron job
                            </p>
                            <p className="mt-1 text-xs text-dark-500">
                              Run records are written to the workspace after each completed
                              execution.
                            </p>
                          </div>
                        </div>
                      )}

                      {!isLoading && !error && session?.kind !== 'cron' && !session?.key && (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-dark-600" />
                            <p className="mt-3 text-sm text-dark-400">
                              Session history is not available for this session
                            </p>
                            <p className="mt-1 text-xs text-dark-500">
                              Cron or ephemeral sessions may not expose message history
                            </p>
                          </div>
                        </div>
                      )}

                      {!isLoading &&
                        !error &&
                        session?.kind !== 'cron' &&
                        session?.key &&
                        messages.length === 0 && (
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-dark-600" />
                              {sessionNotLoaded ? (
                                <>
                                  <p className="mt-3 text-sm text-dark-400">Session not loaded</p>
                                  <p className="mt-1 text-xs text-dark-500">
                                    This agent&apos;s session isn&apos;t active in the gateway. It
                                    will appear once the agent runs.
                                  </p>
                                </>
                              ) : (
                                <p className="mt-3 text-sm text-dark-400">
                                  No messages in this session
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                      {!isLoading &&
                        !error &&
                        session?.kind === 'cron' &&
                        latestRun &&
                        messages.length === 0 &&
                        !latestRun.sessionKey && (
                          <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-dark-600" />
                              <p className="mt-3 text-sm text-dark-400">
                                No messages available for this run
                              </p>
                              <p className="mt-1 text-xs text-dark-500">
                                The gateway session may no longer be active.
                              </p>
                            </div>
                          </div>
                        )}

                      {!isLoading && !error && messages.length > 0 && session?.kind === 'main' && (
                        <div className="mb-4 rounded-lg bg-dark-800/60 border border-dark-700/50 px-4 py-3 flex items-start gap-2.5">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-dark-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-dark-400">
                            This job runs inside the agent&apos;s main session. Messages shown are
                            the full shared session history — individual cron runs are not isolated.
                          </p>
                        </div>
                      )}

                      {!isLoading && !error && (messages.length > 0 || latestRun) && (
                        <div className="space-y-4">
                          {/* For cron sessions: show error and summary from latest run */}
                          {session?.kind === 'cron' && latestRun && (
                            <>
                              {/* Error detail */}
                              {latestRun.error && (
                                <div className="rounded-lg bg-red-900/20 border border-red-800/30 p-4">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-1">
                                    Error
                                  </p>
                                  <p className="text-sm text-red-400 whitespace-pre-wrap">
                                    {latestRun.error}
                                  </p>
                                </div>
                              )}

                              {/* Summary */}
                              {latestRun.summary && (
                                <>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
                                    Summary
                                  </p>
                                  <div className="rounded-lg bg-dark-800/50 border border-dark-700/50 p-4">
                                    <div className="prose prose-invert prose-sm max-w-none">
                                      <MarkdownRenderer content={latestRun.summary} />
                                    </div>
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {/* Messages */}
                          {messages.length > 0 && (
                            <>
                              {session?.kind === 'cron' && latestRun && (
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
                                    Messages
                                  </p>
                                  {latestRun.sessionKey && (
                                    <p
                                      className="text-[10px] font-mono text-dark-600 truncate max-w-[60%]"
                                      title={latestRun.sessionKey}
                                    >
                                      {latestRun.sessionKey}
                                    </p>
                                  )}
                                </div>
                              )}
                              <div className="space-y-3">
                                {isGroupedSession && runs ? (
                                  latestRunOnly ? (
                                    // Task Manager: show only the latest run's messages, flat (no wrapper)
                                    <RunMessages
                                      messages={runs[0].messages}
                                      getRoleBadgeColor={getRoleBadgeColor}
                                      formatModelName={formatModelName}
                                      getDisplayRole={getDisplayRole}
                                    />
                                  ) : (
                                    // Scheduler: all runs as collapsible groups, latest expanded
                                    runs.map((run, i) => (
                                      <RunGroup
                                        key={i}
                                        run={run}
                                        runNumber={i + 1}
                                        totalRuns={runs.length}
                                        getRoleBadgeColor={getRoleBadgeColor}
                                        formatModelName={formatModelName}
                                        getDisplayRole={getDisplayRole}
                                      />
                                    ))
                                  )
                                ) : (
                                  // All other session types: flat message list
                                  messages.map((message, index) => {
                                    const displayRole = getDisplayRole(message);

                                    // Extract blocks and content, handling both string and array formats
                                    const blocks = Array.isArray(message.blocks)
                                      ? message.blocks
                                      : Array.isArray(message.content)
                                        ? message.content
                                        : [];
                                    const content =
                                      message.content && typeof message.content === 'string'
                                        ? message.content.trim()
                                        : blocks
                                            .filter((b) => b.type === 'text')
                                            .map((b) => b.text)
                                            .join('')
                                            .trim();
                                    const toolCalls = blocks.filter((b) => b.type === 'toolCall');

                                    // Skip assistant messages with truly nothing to show
                                    if (
                                      !content &&
                                      !toolCalls.length &&
                                      message.role === 'assistant'
                                    )
                                      return null;

                                    return (
                                      <div
                                        key={index}
                                        className="bg-dark-800/50 border border-dark-700/50 rounded-lg p-4"
                                      >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(displayRole)}`}
                                            >
                                              {displayRole}
                                            </span>
                                            {message.model && (
                                              <span className="text-xs text-dark-400">
                                                {formatModelName(message.model)}
                                              </span>
                                            )}
                                          </div>
                                          {message.timestamp && (
                                            <span className="text-xs text-dark-400">
                                              {new Date(message.timestamp).toLocaleString(
                                                undefined,
                                                {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  hour: 'numeric',
                                                  minute: '2-digit',
                                                  second: '2-digit',
                                                  hour12: true,
                                                },
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        {content && (
                                          <div className="prose prose-invert prose-sm max-w-none">
                                            <MarkdownRenderer content={content} />
                                          </div>
                                        )}
                                        {toolCalls.length > 0 && (
                                          <div
                                            className={`flex flex-wrap gap-1.5 ${content ? 'mt-3' : ''}`}
                                          >
                                            {toolCalls.map((tc, i) => (
                                              <ToolCallChip key={i} tc={tc} />
                                            ))}
                                          </div>
                                        )}
                                        {!content && !toolCalls.length && (
                                          <p className="text-sm text-dark-500 italic">No content</p>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer with session metadata */}
                    {sessionMetadata && sessionMetadata.contextTokens > 0 && (
                      <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-dark-800 bg-dark-800/50">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-dark-500">Context:</span>
                              <span className="text-dark-200 font-mono">
                                {formatTokens(sessionMetadata.totalTokensUsed)} /{' '}
                                {formatTokens(sessionMetadata.contextTokens)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    sessionMetadata.contextUsagePercent >= 80
                                      ? 'bg-red-500'
                                      : sessionMetadata.contextUsagePercent >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                  }`}
                                  style={{
                                    width: `${Math.min(sessionMetadata.contextUsagePercent, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-dark-400 font-mono">
                                {sessionMetadata.contextUsagePercent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
