export default function StatCard({ label, value, sub, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue: 'from-blue-600/20 to-blue-900/10 border-blue-700/50 text-blue-400',
    green: 'from-green-600/20 to-green-900/10 border-green-700/50 text-green-400',
    red: 'from-red-600/20 to-red-900/10 border-red-700/50 text-red-400',
    yellow: 'from-yellow-600/20 to-yellow-900/10 border-yellow-700/50 text-yellow-400',
    purple: 'from-purple-600/20 to-purple-900/10 border-purple-700/50 text-purple-400',
    cyan: 'from-cyan-600/20 to-cyan-900/10 border-cyan-700/50 text-cyan-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center opacity-70`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
