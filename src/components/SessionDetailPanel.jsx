import { Fragment, useState, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useAgentStore } from "../stores/agentStore";
import { getSessionMessages } from "../api/client";
import MarkdownRenderer from "./MarkdownRenderer";
import logger from "../utils/logger";

// Gap threshold for detecting a new isolated run boundary
const RUN_GAP_MS = 5 * 60 * 1000;

/** Groups a flat message array into runs based on timestamp gaps. */
function groupMessagesIntoRuns(messages) {
  const runs = [];
  messages.forEach((message) => {
    const curTs = message.timestamp ? new Date(message.timestamp).getTime() : null;
    const lastRun = runs[runs.length - 1];
    const lastMsg = lastRun?.messages[lastRun.messages.length - 1];
    const prevTs = lastMsg?.timestamp ? new Date(lastMsg.timestamp).getTime() : null;
    const isNewRun =
      runs.length === 0 ||
      (prevTs !== null && curTs !== null && curTs - prevTs >= RUN_GAP_MS);
    if (isNewRun) {
      runs.push({ startTimestamp: message.timestamp, messages: [] });
    }
    runs[runs.length - 1].messages.push(message);
  });
  return runs;
}

/** Renders the messages inside a run group. */
function RunMessages({ messages, getRoleBadgeColor, formatModelName }) {
  return (
    <div className="space-y-3">
      {messages.map((message, idx) => (
        <div
          key={idx}
          className="bg-dark-800/50 border border-dark-700/50 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(message.role)}`}>
                {message.role}
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
          {message.content ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={message.content} />
            </div>
          ) : (
            <p className="text-sm text-dark-500 italic">No content</p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Collapsible run group used for isolated cron sessions (Scheduler view). */
function RunGroup({ run, runNumber, totalRuns, getRoleBadgeColor, formatModelName }) {
  const isLatest = runNumber === totalRuns;
  const [isOpen, setIsOpen] = useState(isLatest);

  return (
    <div className={`rounded-lg border overflow-hidden ${
      isLatest ? 'border-amber-500/20' : 'border-dark-700/60'
    }`}>
      {/* Run header / toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
          isLatest
            ? 'bg-amber-500/8 hover:bg-amber-500/12'
            : 'bg-dark-800/60 hover:bg-dark-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isOpen
            ? <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ${isLatest ? 'text-amber-400' : 'text-dark-500'}`} />
            : <ChevronRightIcon className={`w-4 h-4 flex-shrink-0 ${isLatest ? 'text-amber-400' : 'text-dark-500'}`} />
          }
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            isLatest ? 'text-amber-400' : 'text-dark-400'
          }`}>
            {isLatest ? 'Latest Run' : `Run ${runNumber}`}
          </span>
          {run.startTimestamp && (
            <span className={`text-xs font-normal ${isLatest ? 'text-amber-400/60' : 'text-dark-500'}`}>
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
        <span className={`text-xs flex-shrink-0 ${isLatest ? 'text-amber-400/60' : 'text-dark-500'}`}>
          {run.messages.length} {run.messages.length === 1 ? 'message' : 'messages'}
        </span>
      </button>

      {isOpen && (
        <div className="p-3 bg-dark-900/40">
          <RunMessages
            messages={run.messages}
            getRoleBadgeColor={getRoleBadgeColor}
            formatModelName={formatModelName}
          />
        </div>
      )}
    </div>
  );
}

export default function SessionDetailPanel({ isOpen, onClose, session, latestRunOnly = false }) {
  const [messages, setMessages] = useState([]);
  const [sessionMetadata, setSessionMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
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

  // Fetch messages when panel opens
  useEffect(() => {
    if (isOpen && session?.key) {
      loadMessages();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMessages depends on session, which is in deps
  }, [isOpen, session?.key]);

  // Scroll to bottom when messages finish loading
  useEffect(() => {
    if (!isLoading && !error && messages.length > 0 && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [isLoading, error, messages.length]);

  const loadMessages = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info('Fetching session messages', { sessionKey: session.key });
      const data = await getSessionMessages(session.key, { limit: 100, includeTools: true });
      setMessages(data.messages || []);
      setSessionMetadata(data.session || null);
      logger.info('Session messages loaded', { messageCount: data.messages?.length || 0 });
    } catch (err) {
      logger.error('Failed to load session messages', err);
      
      // Check for agent-to-agent access error
      if (err.response?.status === 403 && err.response?.data?.error?.code === 'AGENT_TO_AGENT_DISABLED') {
        setError(
          'Agent session history is not accessible. Agent-to-agent access is disabled in OpenClaw Gateway. ' +
          'Contact your administrator to enable this feature.'
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
      case "running":
        return "bg-green-600/10 text-green-500 border-green-500/20";
      case "active":
        return "bg-blue-600/10 text-blue-500 border-blue-500/20";
      case "idle":
        return "bg-yellow-600/10 text-yellow-500 border-yellow-500/20";
      case "completed":
        return "bg-dark-600/10 text-dark-400 border-dark-600/20";
      case "failed":
        return "bg-red-600/10 text-red-500 border-red-500/20";
      default:
        return "bg-dark-700 text-dark-400 border-dark-600";
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "user":
        return "bg-blue-600/10 text-blue-400 border-blue-500/20";
      case "assistant":
        return "bg-purple-600/10 text-purple-400 border-purple-500/20";
      case "system":
        return "bg-dark-600/10 text-dark-400 border-dark-600/20";
      default:
        return "bg-dark-700 text-dark-400 border-dark-600";
    }
  };

  const formatTokens = (count) => {
    if (!count || count === 0) return "0";
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
    const modelPart = model.includes("/") ? model.split("/").pop() : model;
    const lower = modelPart.toLowerCase();
    if (lower.includes("kimi-k2")) return "Kimi K2.5";
    if (lower.includes("opus-4-6") || lower.includes("opus-4")) return "Opus 4";
    if (lower.includes("sonnet-4-5") || lower.includes("sonnet-4")) return "Sonnet 4.5";
    if (lower.includes("haiku-4")) return "Haiku 4.5";
    if (lower.includes("gemini-2.5-flash-lite")) return "Gemini Flash Lite";
    if (lower.includes("gemini-2.5-flash")) return "Gemini Flash";
    if (lower.includes("gemini-2.5")) return "Gemini 2.5";
    if (lower.includes("gpt-5")) return "GPT-5.2";
    if (lower.includes("deepseek")) return "DeepSeek";
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
                <Dialog.Panel className="pointer-events-auto w-screen max-w-3xl">
                  <div className="flex h-full flex-col bg-dark-900 shadow-xl border-l border-dark-800">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-dark-800 bg-dark-800/50">
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
                              {session?.label || "Session Details"}
                            </Dialog.Title>
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
                                      session.status
                                    )}`}
                                  >
                                    {session.status}
                                  </span>
                                )}
                              </div>
                              
                              {/* Usage information on the right */}
                              {(session?.inputTokens > 0 || session?.outputTokens > 0 || session?.cacheReadTokens > 0 || session?.cacheWriteTokens > 0 || session?.messageCost > 0) && (
                                <div className="flex items-center gap-3 text-xs">
                                  {isGroupedSession && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border text-amber-400/80 bg-amber-500/10 border-amber-500/20 uppercase tracking-wider">
                                      Last run
                                    </span>
                                  )}
                                  {(session.inputTokens > 0 || session.outputTokens > 0) && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-dark-500">In:</span>
                                      <span className="text-dark-200 font-mono font-medium">{formatTokens(session.inputTokens)}</span>
                                      <span className="text-dark-600">•</span>
                                      <span className="text-dark-500">Out:</span>
                                      <span className="text-dark-200 font-mono font-medium">{formatTokens(session.outputTokens)}</span>
                                    </div>
                                  )}
                                  {(session.cacheReadTokens > 0 || session.cacheWriteTokens > 0) && (
                                    <>
                                      {(session.inputTokens > 0 || session.outputTokens > 0) && <span className="text-dark-600">•</span>}
                                      <div className="flex items-center gap-2">
                                        {session.cacheReadTokens > 0 && (
                                          <>
                                            <span className="text-dark-500">Cache Read:</span>
                                            <span className="text-emerald-400/80 font-mono font-medium">{formatTokens(session.cacheReadTokens)}</span>
                                          </>
                                        )}
                                        {session.cacheWriteTokens > 0 && (
                                          <>
                                            {session.cacheReadTokens > 0 && <span className="text-dark-600">•</span>}
                                            <span className="text-dark-500">Cache Write:</span>
                                            <span className="text-amber-400/80 font-mono font-medium">{formatTokens(session.cacheWriteTokens)}</span>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {session.messageCost > 0 && (
                                    <>
                                      {(session.inputTokens > 0 || session.outputTokens > 0 || session.cacheReadTokens > 0) && <span className="text-dark-600">•</span>}
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-dark-500">Cost:</span>
                                        <span className="text-dark-200 font-mono font-medium">{formatCost(session.messageCost)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
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
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-6">
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
                            onClick={loadMessages}
                            className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {!isLoading && !error && !session?.key && (
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

                      {!isLoading && !error && session?.key && messages.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-dark-600" />
                            <p className="mt-3 text-sm text-dark-400">No messages in this session</p>
                          </div>
                        </div>
                      )}

                      {!isLoading && !error && messages.length > 0 && (
                        <div className="space-y-3">
                          {isGroupedSession && runs ? (
                            latestRunOnly ? (
                              // Task Manager: show only the latest run's messages, flat (no wrapper)
                              <RunMessages
                                messages={runs[0].messages}
                                getRoleBadgeColor={getRoleBadgeColor}
                                formatModelName={formatModelName}
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
                                />
                              ))
                            )
                          ) : (
                            // All other session types: flat message list
                            messages.map((message, index) => (
                              <div
                                key={index}
                                className="bg-dark-800/50 border border-dark-700/50 rounded-lg p-4"
                              >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(message.role)}`}>
                                      {message.role}
                                    </span>
                                    {message.model && (
                                      <span className="text-xs text-dark-400">{formatModelName(message.model)}</span>
                                    )}
                                  </div>
                                  {message.timestamp && (
                                    <span className="text-xs text-dark-400">
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
                                {message.content ? (
                                  <div className="prose prose-invert prose-sm max-w-none">
                                    <MarkdownRenderer content={message.content} />
                                  </div>
                                ) : (
                                  <p className="text-sm text-dark-500 italic">No content</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer with session metadata */}
                    {sessionMetadata && (sessionMetadata.contextTokens > 0) && (
                      <div className="px-6 py-4 border-t border-dark-800 bg-dark-800/50">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-dark-500">Context:</span>
                              <span className="text-dark-200 font-mono">
                                {formatTokens(sessionMetadata.totalTokensUsed)} / {formatTokens(sessionMetadata.contextTokens)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    sessionMetadata.contextUsagePercent >= 80
                                      ? "bg-red-500"
                                      : sessionMetadata.contextUsagePercent >= 50
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{ width: `${Math.min(sessionMetadata.contextUsagePercent, 100)}%` }}
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
