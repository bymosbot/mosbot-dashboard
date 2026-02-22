import { useEffect, useCallback, useState, useRef } from 'react';
import {
  CurrencyDollarIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CircleStackIcon,
  UserGroupIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import CostChart from '../components/CostChart';
import ResetConfirmationModal from '../components/ResetConfirmationModal';
import { useUsageStore, VALID_RANGES } from '../stores/usageStore';
import { useToastStore } from '../stores/toastStore';
import { resetUsageData } from '../api/client';
import logger from '../utils/logger';
import { formatTokens } from '../utils/helpers';

const REFRESH_INTERVAL_MS = 60_000; // 1 minute

const RANGE_LABELS = {
  today: 'Today',
  '24h': '24h',
  '3d': '3d',
  '7d': '7d',
  '14d': '14d',
  '30d': '30d',
  '3m': '3m',
  '6m': '6m',
};

function formatCost(value) {
  if (value == null) return '—';
  if (value === 0) return '$0.00';
  if (value < 0.0001) return `$${value.toFixed(6)}`;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(4)}`;
}

function formatModelName(model) {
  if (!model) return 'Unknown';
  // Strip "openrouter/" prefix for display
  return model.replace(/^openrouter\//, '');
}

function AgentTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-dark-500 text-sm py-4 text-center">No agent data for this period</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-dark-500 text-xs uppercase tracking-wide border-b border-dark-700">
            <th className="pb-2 pr-4 font-medium">Agent</th>
            <th className="pb-2 pr-4 font-medium text-right">Cost</th>
            <th className="pb-2 pr-4 font-medium text-right">Input</th>
            <th className="pb-2 pr-4 font-medium text-right">Output</th>
            <th className="pb-2 font-medium text-right">Sessions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-700/50">
          {rows.map((row) => (
            <tr key={row.agentKey} className="hover:bg-dark-700/30 transition-colors">
              <td className="py-2.5 pr-4">
                <span className="font-mono text-primary-400 font-medium">{row.agentKey || 'unknown'}</span>
              </td>
              <td className="py-2.5 pr-4 text-right font-semibold text-dark-100">
                {formatCost(row.costUsd)}
              </td>
              <td className="py-2.5 pr-4 text-right text-dark-300">{formatTokens(row.tokensInput)}</td>
              <td className="py-2.5 pr-4 text-right text-dark-300">{formatTokens(row.tokensOutput)}</td>
              <td className="py-2.5 text-right text-dark-400">{row.sessionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-dark-500 text-sm py-4 text-center">No model data for this period</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-dark-500 text-xs uppercase tracking-wide border-b border-dark-700">
            <th className="pb-2 pr-4 font-medium">Model</th>
            <th className="pb-2 pr-4 font-medium text-right">Cost</th>
            <th className="pb-2 pr-4 font-medium text-right">Input</th>
            <th className="pb-2 font-medium text-right">Output</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-700/50">
          {rows.map((row, i) => (
            <tr key={row.model || i} className="hover:bg-dark-700/30 transition-colors">
              <td className="py-2.5 pr-4">
                <span className="text-dark-200 font-medium text-xs">{formatModelName(row.model)}</span>
              </td>
              <td className="py-2.5 pr-4 text-right font-semibold text-dark-100">
                {formatCost(row.costUsd)}
              </td>
              <td className="py-2.5 pr-4 text-right text-dark-300">{formatTokens(row.tokensInput)}</td>
              <td className="py-2.5 text-right text-dark-300">{formatTokens(row.tokensOutput)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-dark-500 text-sm py-4 text-center">No cron job data for this period</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-dark-500 text-xs uppercase tracking-wide border-b border-dark-700">
            <th className="pb-2 pr-4 font-medium">Job</th>
            <th className="pb-2 pr-4 font-medium text-right">Cost</th>
            <th className="pb-2 pr-4 font-medium text-right">Runs</th>
            <th className="pb-2 pr-4 font-medium text-right">Input</th>
            <th className="pb-2 font-medium text-right">Output</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-700/50">
          {rows.map((row) => (
            <tr key={row.jobId} className="hover:bg-dark-700/30 transition-colors">
              <td className="py-2.5 pr-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-dark-200 font-medium text-xs">
                    {row.jobLabel || 'Unknown job'}
                  </span>
                  <span className="font-mono text-dark-600 text-[10px]">{row.agentKey}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right font-semibold text-dark-100">
                {formatCost(row.costUsd)}
              </td>
              <td className="py-2.5 pr-4 text-right text-dark-400">{row.runCount}</td>
              <td className="py-2.5 pr-4 text-right text-dark-300">{formatTokens(row.tokensInput)}</td>
              <td className="py-2.5 text-right text-dark-300">{formatTokens(row.tokensOutput)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsageAnalytics() {
  const { data, isLoading, error, range, fetchUsage, setRange } = useUsageStore();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchUsage();
    intervalRef.current = setInterval(() => {
      fetchUsage(range);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchUsage, range]);

  const handleRefresh = useCallback(async () => {
    try {
      await fetchUsage(range);
      showToast('Usage data refreshed', 'success');
    } catch (err) {
      logger.error('Failed to refresh usage data', err);
      showToast('Failed to refresh usage data', 'error');
    }
  }, [fetchUsage, range, showToast]);

  const handleReset = async (password) => {
    await resetUsageData(password);
    // Refresh the usage data after reset
    await fetchUsage(range);
  };

  const summary = data?.summary;
  const timeSeries = data?.timeSeries || [];
  const byAgent = data?.byAgent || [];
  const byModel = data?.byModel || [];
  const byJob = data?.byJob || [];
  const groupBy = data?.groupBy || 'hour';

  const hasData = data && (data.timeSeries?.length > 0 || data.byAgent?.length > 0 || data.byModel?.length > 0);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Usage & Cost"
        subtitle="Token consumption and cost breakdown across agents and models"
        onRefresh={handleRefresh}
      >
        {!isLoading && hasData && (
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            title="Reset all usage data"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </Header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Range selector */}
        <div className="flex flex-wrap gap-1.5">
          {VALID_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 border border-dark-700 text-dark-400 hover:text-dark-200 hover:border-dark-600'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !data && (
          <div className="flex items-center justify-center py-24">
            <div className="inline-block w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-dark-400 text-sm">Loading usage data...</span>
          </div>
        )}

        {/* Content */}
        {(data || (isLoading && data)) && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Cost"
                sublabel={range === 'today' ? "Today's sessions" : `${RANGE_LABELS[range]} period`}
                value={formatCost(summary?.totalCostUsd)}
                icon={CurrencyDollarIcon}
                color="primary"
              />
              <StatCard
                label="Input Tokens"
                sublabel={range === 'today' ? "Today's sessions" : `${RANGE_LABELS[range]} period`}
                value={formatTokens(summary?.totalTokensInput)}
                icon={CircleStackIcon}
                color="blue"
              />
              <StatCard
                label="Output Tokens"
                sublabel={range === 'today' ? "Today's sessions" : `${RANGE_LABELS[range]} period`}
                value={formatTokens(summary?.totalTokensOutput)}
                icon={CircleStackIcon}
                color="purple"
              />
              <StatCard
                label="Sessions"
                sublabel={range === 'today' ? "Today's sessions" : `${RANGE_LABELS[range]} period`}
                value={summary?.sessionCount ?? '—'}
                icon={UserGroupIcon}
                color="blue"
              />
            </div>

            {/* Cost over time chart */}
            <div className="bg-dark-800 border border-dark-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-dark-200 uppercase tracking-wide">
                  Cost Over Time
                </h2>
                {isLoading && (
                  <ArrowPathIcon className="w-4 h-4 text-dark-500 animate-spin" />
                )}
              </div>
              <CostChart data={timeSeries} groupBy={groupBy} />
            </div>

            {/* Breakdown tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* By Agent */}
              <div className="bg-dark-800 border border-dark-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-dark-200 uppercase tracking-wide mb-4">
                  By Agent
                </h2>
                <AgentTable rows={byAgent} />
              </div>

              {/* By Model */}
              <div className="bg-dark-800 border border-dark-700 rounded-lg p-5">
                <h2 className="text-sm font-semibold text-dark-200 uppercase tracking-wide mb-4">
                  By Model
                </h2>
                <ModelTable rows={byModel} />
              </div>
            </div>

            {/* By Cron Job */}
            <div className="bg-dark-800 border border-dark-700 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-dark-200 uppercase tracking-wide mb-4">
                By Cron Job
              </h2>
              <JobTable rows={byJob} />
            </div>
          </>
        )}

        {/* Empty state — loaded but no data */}
        {!isLoading && !error && data && timeSeries.length === 0 && byAgent.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CurrencyDollarIcon className="w-12 h-12 text-dark-600 mb-3" />
            <p className="text-dark-400 mb-1">No usage data for this period</p>
            <p className="text-sm text-dark-500">
              Usage is tracked once sessions start generating tokens.
            </p>
          </div>
        )}
      </div>

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleReset}
        title="Reset Usage & Cost Data"
        dataType="usage data"
        description="Are you sure you want to permanently delete all usage and cost data? This includes all token consumption records, cost breakdowns, session usage data, and hourly aggregations. This action cannot be undone and the data cannot be recovered."
        confirmButtonText="Reset Usage Data"
      />
    </div>
  );
}
