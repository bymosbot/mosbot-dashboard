import { useState } from "react";
import { ClockIcon, CpuChipIcon, ChatBubbleLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { stripMarkdown } from "../utils/helpers";
import { useAgentStore } from "../stores/agentStore";

/** Extract jobId from cron session key. Format: agent:agentId:cron:jobId or agent:agentId:cron:jobId:run:runId */
function getCronJobIdFromKey(key) {
  if (!key || typeof key !== "string") return null;
  const parts = key.split(":");
  const cronIdx = parts.indexOf("cron");
  if (cronIdx === -1 || cronIdx + 1 >= parts.length) return null;
  const jobId = parts[cronIdx + 1];
  if (jobId && jobId.startsWith("heartbeat-")) return null;
  return jobId || null;
}

export default function SessionRow({ session, onClick, onDelete, statusDisplay }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const jobId = session.jobId ?? (session.kind === "cron" ? getCronJobIdFromKey(session.key) : null);
  const isDeletableCron = session.isDeletable ?? (session.kind === "cron" && !!jobId);
  const canDelete = jobId && isDeletableCron;
  const getAgentById = useAgentStore((state) => state.getAgentById);
  const agent = session.agent ? getAgentById(session.agent) : null;
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

  const formatDuration = (timestamp) => {
    if (!timestamp) return "Unknown";
    const start = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours < 24) return `${hours}h ${mins}m ago`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ago`;
  };

  const formatModelName = (model) => {
    if (!model) return null;
    // Handle provider/model format (e.g., "moonshotai/kimi-k2.5")
    const modelPart = model.includes("/") ? model.split("/").pop() : model;
    // Simplify known model names
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

  const getContextBarColor = (percent) => {
    if (percent >= 80) return "bg-red-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div 
      className="p-5 bg-dark-800 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors cursor-pointer"
      onClick={() => onClick?.(session)}
    >
      {/* Top row: label, agent, model, status */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {agent?.icon ? (
              <div
                className="w-5 h-5 rounded-full bg-dark-700 flex items-center justify-center text-sm"
                title={agent.name || session.agent}
              >
                {agent.icon}
              </div>
            ) : (
              <CpuChipIcon className="w-5 h-5 text-dark-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold text-dark-100 truncate">
                {session.label || session.id}
              </p>
              {(session.kind === 'main' || session.kind === 'heartbeat' || session.kind === 'cron' || session.kind === 'subagent' || session.kind === 'hook') && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border flex-shrink-0 ${
                    session.kind === 'main'
                      ? 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                      : session.kind === 'heartbeat'
                      ? 'text-pink-400 bg-pink-500/10 border-pink-500/20'
                      : session.kind === 'subagent'
                      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                      : session.kind === 'hook'
                      ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                      : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                  }`}
                >
                  {session.kind === 'main' ? 'MAIN' : session.kind === 'heartbeat' ? 'HEARTBEAT' : session.kind === 'subagent' ? 'SUBAGENT' : session.kind === 'hook' ? 'HOOK' : 'CRON'}
                </span>
              )}
              {(session.kind === 'main' || session.kind === 'heartbeat' || session.kind === 'cron' || session.kind === 'subagent' || session.kind === 'hook') && (() => {
                // Prefer explicit sessionMode from API; fall back to kind-based inference
                const isIsolated = session.sessionMode === 'isolated'
                  || (session.sessionMode == null && session.kind !== 'main' && session.kind !== 'heartbeat');
                return (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border flex-shrink-0 ${
                      isIsolated
                        ? 'text-amber-400/80 bg-amber-500/10 border-amber-500/20'
                        : 'text-dark-400 bg-dark-700/50 border-dark-600/30'
                    }`}
                    title={isIsolated ? 'Runs in a fresh isolated context' : "Runs in the agent's persistent shared context"}
                  >
                    {isIsolated ? 'ISOLATED' : 'SHARED'}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
              {session.agent && (
                <div className="flex items-center gap-1.5">
                  <span className="text-dark-500">Agent:</span>
                  <span className="text-dark-200 font-medium">{session.agentName || agent?.name || session.agent}</span>
                </div>
              )}
              {session.model && (
                <>
                  {session.agent && <span className="text-dark-600">•</span>}
                  <div className="flex items-center gap-1.5">
                    <span className="text-dark-500">Model:</span>
                    <span className="text-dark-200 font-medium">
                      {formatModelName(session.model)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {session.updatedAt && (
            <div className="flex items-center gap-1.5 text-xs text-dark-400">
              <ClockIcon className="w-4 h-4" />
              <span className="font-medium">{formatDuration(session.updatedAt)}</span>
            </div>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (isDeleting) return;
                setIsDeleting(true);
                try {
                  await onDelete({ ...session, jobId, isDeletable: isDeletableCron });
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              className="p-1.5 rounded-md text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete cron job"
            >
              {isDeleting ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <TrashIcon className="w-4 h-4" />
              )}
            </button>
          )}
          <span className={`px-3 py-1.5 text-xs font-medium rounded-full border ${getStatusColor(statusDisplay ?? session.status)}`}>
            {statusDisplay ?? session.status}
          </span>
        </div>
      </div>

      {/* Middle row: token usage, cache, cost, context window */}
      {/* Cron jobs have per-run data ("Last"); all other sessions (main, group,
          heartbeat, subagent) show session-level aggregates ("Session"). */}
      {(session.inputTokens > 0 || session.outputTokens > 0 || session.cacheReadTokens > 0 || session.messageCost > 0 || session.contextTokens > 0) && (() => {
        const isPerRun = session.kind === 'cron';
        const inLabel = isPerRun ? 'Last In:' : 'Session In:';
        const outLabel = isPerRun ? 'Last Out:' : 'Session Out:';
        const costLabel = isPerRun ? 'Last Cost:' : 'Session Cost:';
        return (
        <div className="flex items-center gap-3 mt-4 ml-8 flex-wrap text-xs">
          {/* Input / Output tokens */}
          {(session.inputTokens > 0 || session.outputTokens > 0) && (
            <div className="flex items-center gap-2">
              <span className="text-dark-500">{inLabel}</span>
              <span className="text-dark-200 font-mono font-medium">{formatTokens(session.inputTokens)}</span>
              <span className="text-dark-600">•</span>
              <span className="text-dark-500">{outLabel}</span>
              <span className="text-dark-200 font-mono font-medium">{formatTokens(session.outputTokens)}</span>
            </div>
          )}

          {/* Cache read / write tokens */}
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

          {/* Cost */}
          {session.messageCost > 0 && (
            <>
              {(session.inputTokens > 0 || session.outputTokens > 0 || session.cacheReadTokens > 0) && <span className="text-dark-600">•</span>}
              <div className="flex items-center gap-1.5">
                <span className="text-dark-500">{costLabel}</span>
                <span className="text-dark-200 font-mono font-medium">{formatCost(session.messageCost)}</span>
              </div>
            </>
          )}

          {/* Context window usage */}
          {session.contextTokens > 0 && (
            <>
              {(session.inputTokens > 0 || session.outputTokens > 0 || session.cacheReadTokens > 0 || session.messageCost > 0) && <span className="text-dark-600">•</span>}
              <div className="flex items-center gap-2">
                <span className="text-dark-500">Context:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getContextBarColor(session.contextUsagePercent)}`}
                      style={{ width: `${Math.min(session.contextUsagePercent, 100)}%` }}
                    />
                  </div>
                  <span className="text-dark-200 font-mono font-medium">
                    {session.contextUsagePercent}%
                  </span>
                </div>
                <span className="text-dark-500">
                  ({formatTokens(session.totalTokensUsed)} / {formatTokens(session.contextTokens)})
                </span>
              </div>
            </>
          )}
        </div>
        );
      })()}

      {/* Bottom row: last message preview */}
      {session.lastMessage && (
        <div className="mt-4 ml-8 p-3 bg-dark-900/50 border border-dark-700/50 rounded">
          <div className="flex items-start gap-2">
            <ChatBubbleLeftIcon className="w-4 h-4 text-dark-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-dark-400 line-clamp-2 leading-relaxed">
              {stripMarkdown(session.lastMessage)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
