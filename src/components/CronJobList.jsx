import {
  ClockIcon,
  CalendarDaysIcon,
  HeartIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
function formatSchedule(schedule, job) {
  if (!schedule && !job) return "Unknown";

  // Handle heartbeat-style label (e.g. "30m")
  if (schedule?.label) return `Every ${schedule.label}`;

  if (schedule?.kind === "every") {
    const ms = schedule.everyMs;
    if (!ms) return "Every ?";
    if (ms < 60000) return `Every ${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `Every ${Math.round(ms / 60000)}m`;
    if (ms < 86400000) {
      const h = Math.floor(ms / 3600000);
      const m = Math.round((ms % 3600000) / 60000);
      return m > 0 ? `Every ${h}h ${m}m` : `Every ${h}h`;
    }
    return `Every ${Math.round(ms / 86400000)}d`;
  }

  if (schedule?.kind === "cron") {
    const expr = schedule.expr || "";
    const tz = schedule.tz ? ` (${schedule.tz})` : "";
    return `Cron ${expr}${tz}`;
  }

  if (schedule?.kind === "at") {
    const at = schedule.at;
    if (!at) return "One-shot";
    try {
      return `At ${new Date(at).toLocaleString()}`;
    } catch {
      return `At ${at}`;
    }
  }

  // Fallback: check for raw cron/expression/interval fields on the job itself
  if (job) {
    if (job.cron) {
      const tz = job.tz || job.timezone;
      return `Cron ${job.cron}${tz ? ` (${tz})` : ""}`;
    }
    if (job.expression) {
      const tz = job.tz || job.timezone;
      return `Cron ${job.expression}${tz ? ` (${tz})` : ""}`;
    }
    if (job.interval || job.every) {
      return `Every ${job.interval || job.every}`;
    }
  }

  return "Unknown";
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
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h ${minutes % 60}m`;
  else label = `${days}d ${hours % 24}h`;

  if (isFuture) return `${label} from now`;
  return `${label} ago`;
}

function formatModel(model) {
  if (!model) return null;
  const modelPart = model.includes("/") ? model.split("/").pop() : model;
  const lower = modelPart.toLowerCase();
  if (lower.includes("kimi-k2")) return "Kimi K2.5";
  if (lower.includes("opus-4")) return "Opus 4";
  if (lower.includes("sonnet-4")) return "Sonnet 4.5";
  if (lower.includes("haiku-4")) return "Haiku 4.5";
  if (lower.includes("gemini-2.5-flash-lite")) return "Gemini Flash Lite";
  if (lower.includes("gemini-2.5-flash")) return "Gemini Flash";
  if (lower.includes("gemini-2.5")) return "Gemini 2.5";
  if (lower.includes("gpt-5")) return "GPT-5.2";
  if (lower.includes("deepseek")) return "DeepSeek";
  return modelPart;
}

function getStatusBadge(status, enabled, nextRunAt, lastRunAt) {
  if (enabled === false) {
    return {
      classes: "bg-dark-600/10 text-dark-400 border-dark-600/20",
      icon: XCircleIcon,
      label: "disabled",
    };
  }

  // Check if enabled but has never been scheduled (no next or last run)
  if (enabled !== false && !nextRunAt && !lastRunAt) {
    return {
      classes: "bg-yellow-600/10 text-yellow-500 border-yellow-500/20",
      icon: ExclamationTriangleIcon,
      label: "not scheduled",
    };
  }

  // Check if enabled but next run is in the past (missed/stale)
  if (enabled !== false && nextRunAt) {
    const nextRunDate = new Date(nextRunAt);
    const now = new Date();
    if (nextRunDate < now) {
      return {
        classes: "bg-yellow-600/10 text-yellow-500 border-yellow-500/20",
        icon: ExclamationTriangleIcon,
        label: "missed",
      };
    }
  }

  if (status === "error") {
    return {
      classes: "bg-red-600/10 text-red-500 border-red-500/20",
      icon: ExclamationTriangleIcon,
      label: "error",
    };
  }

  return {
    classes: "bg-green-600/10 text-green-500 border-green-500/20",
    icon: CheckCircleIcon,
    label: "enabled",
  };
}

function CronJobRow({ job }) {
  const badge = getStatusBadge(job.status, job.enabled, job.nextRunAt, job.lastRunAt);
  const BadgeIcon = badge.icon;
  const isHeartbeat = job.source === "config" || job.payload?.kind === "heartbeat";

  // Extract prompt from payload
  const prompt =
    job.payload?.message || job.payload?.text || job.prompt || null;

  // Delivery info
  const deliveryMode = job.delivery?.mode || "none";
  const deliveryChannel = job.delivery?.channel || null;
  const agentId = job.agentId || null;
  const model = job.payload?.model || null;

  // Icon: use agent emoji for heartbeats, calendar icon for gateway jobs
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

  return (
    <div className="p-5 bg-dark-800 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors">
      {/* Top row: name, schedule, status */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">{IconElement}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold text-dark-100">{job.name}</p>
              {job.source && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
                    job.source === "config"
                      ? "text-pink-400 bg-pink-500/10 border-pink-500/20"
                      : "text-purple-400 bg-purple-500/10 border-purple-500/20"
                  }`}
                >
                  {job.source === "config" ? "HEARTBEAT" : "CRON"}
                </span>
              )}
            </div>
            {job.description && (
              <p className="text-sm text-dark-400 mt-1.5 line-clamp-2 leading-relaxed">
                {job.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-dark-400">
              <ClockIcon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{formatSchedule(job.schedule, job)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={`px-3 py-1.5 text-xs font-medium rounded-full border flex items-center gap-1.5 ${badge.classes}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Next / Last run timing */}
      {((job.enabled !== false && job.nextRunAt) || job.lastRunAt) && (
        <div className="flex items-center gap-4 mt-3 ml-8 text-xs flex-wrap">
          {job.enabled !== false && job.nextRunAt && (
            <div className="flex items-center gap-1.5">
              <span className="text-dark-500 font-medium uppercase tracking-wide">
                {badge.label === "missed" ? "Missed" : "Next"}
              </span>
              <span className={badge.label === "missed" ? "text-yellow-400 font-medium" : "text-dark-300"}>
                {formatRelativeTime(job.nextRunAt)}
              </span>
            </div>
          )}
          {job.lastRunAt && (
            <>
              {job.enabled !== false && job.nextRunAt && <span className="text-dark-600">•</span>}
              <div className="flex items-center gap-1.5">
                <span className="text-dark-500 font-medium uppercase tracking-wide">Last</span>
                <span className="text-dark-300">{formatRelativeTime(job.lastRunAt)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Prompt preview (gateway jobs only — heartbeats don't need it) */}
      {prompt && (
        <div className="mt-4 ml-8 p-3 bg-dark-900/50 border border-dark-700/50 rounded">
          <p className="text-[10px] text-dark-500 uppercase tracking-wider font-medium mb-1.5">
            Prompt
          </p>
          <p className="text-sm text-dark-300 line-clamp-2 leading-relaxed">
            {prompt}
          </p>
        </div>
      )}

      {/* Detail row: delivery, agent, session target, model */}
      {(deliveryMode !== "none" || agentId || job.sessionTarget || model) && (
        <div className="flex items-center gap-3 mt-4 ml-8 flex-wrap text-xs">
          {deliveryMode !== "none" && (
            <div className="flex items-center gap-1.5">
              <span className="text-dark-500">Delivery:</span>
              <span className="text-dark-200 font-medium">
                {deliveryMode}
                {deliveryChannel ? ` (${deliveryChannel})` : ""}
              </span>
            </div>
          )}
          {agentId && (
            <>
              {deliveryMode !== "none" && <span className="text-dark-600">•</span>}
              <div className="flex items-center gap-1.5">
                <span className="text-dark-500">Agent:</span>
                <span className="text-dark-200 font-medium">
                  {job.agentName || agentId}
                </span>
              </div>
            </>
          )}
          {job.sessionTarget && (
            <>
              {(deliveryMode !== "none" || agentId) && <span className="text-dark-600">•</span>}
              <div className="flex items-center gap-1.5">
                <span className="text-dark-500">Session:</span>
                <span className="text-dark-200 font-mono">
                  {job.sessionTarget}
                </span>
              </div>
            </>
          )}
          {model && (
            <>
              {(deliveryMode !== "none" || agentId || job.sessionTarget) && <span className="text-dark-600">•</span>}
              <div className="flex items-center gap-1.5">
                <span className="text-dark-500">Model:</span>
                <span className="text-dark-200 font-medium">{formatModel(model)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CronJobList({ jobs, isLoading }) {
  return (
    <div className="bg-dark-900 border border-dark-800 rounded-lg p-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-dark-500 ml-3">
            Loading cron jobs...
          </span>
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-dark-500 text-center py-8">
          No cron jobs configured
        </p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <CronJobRow key={job.jobId || job.id || job.name} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
