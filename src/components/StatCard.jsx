/**
 * StatCard — consistent KPI display across pages.
 * Semantic icon/color mapping:
 * - Cost: CurrencyDollarIcon, primary
 * - Tokens: CircleStackIcon, blue (input) / purple (output or total)
 * - Sessions: UserGroupIcon, blue
 * - Running: PlayIcon, green
 * - Idle: ClockIcon, yellow
 * - Attention/Errors: ExclamationTriangleIcon, red
 */
export default function StatCard({ label, sublabel, value, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-600/10 text-primary-500',
    green: 'bg-green-600/10 text-green-500',
    blue: 'bg-blue-600/10 text-blue-500',
    yellow: 'bg-yellow-600/10 text-yellow-500',
    purple: 'bg-purple-600/10 text-purple-500',
    red: 'bg-red-600/10 text-red-500',
  };

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-lg p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-dark-400 mb-1 font-medium">{label}</p>
          {sublabel && (
            <p className="text-xs text-dark-500 mb-2">{sublabel}</p>
          )}
          <p className="text-2xl font-bold text-dark-100">{value}</p>
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.primary}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
