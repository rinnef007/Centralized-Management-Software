import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = { online: '#22c55e', offline: '#ef4444', warning: '#f59e0b', open: '#22c55e', closed: '#ef4444', maintenance: '#3b82f6' };

function SystemCard({ label, data, total }) {
  const entries = Object.entries(data).filter(([k]) => k !== 'total' && data[k] > 0);
  const pct = total ? Math.round((data.online || data.open || 0) / total * 100) : 0;

  return (
    <div className="bg-slate-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <span className="text-xs font-bold text-slate-200">{pct}%</span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-1.5 mb-2">
        <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[k] || '#94a3b8' }} />
            <span className="text-xs text-slate-400">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SystemHealth({ data }) {
  if (!data) return null;

  const barData = [
    { name: 'Thiết bị', online: data.devices?.online || 0, offline: data.devices?.offline || 0, warning: data.devices?.warning || 0 },
    { name: 'Camera', online: data.cameras?.online || 0, offline: data.cameras?.offline || 0, warning: data.cameras?.warning || 0 },
    { name: 'Máy chủ', online: data.servers?.online || 0, offline: data.servers?.offline || 0, warning: data.servers?.warning || 0 },
    { name: 'Làn thu phí', online: data.lanes?.open || 0, offline: (data.lanes?.closed || 0) + (data.lanes?.maintenance || 0), warning: 0 },
  ];

  return (
    <div className="card h-full">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">Sức khỏe hệ thống</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <SystemCard label="Thiết bị" data={data.devices || {}} total={data.devices?.total} />
        <SystemCard label="Camera" data={data.cameras || {}} total={data.cameras?.total} />
        <SystemCard label="Máy chủ" data={data.servers || {}} total={data.servers?.total} />
        <SystemCard label="Làn thu phí" data={{ ...data.lanes, online: data.lanes?.open }} total={data.lanes?.total} />
      </div>

      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ left: -20 }}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="online" fill="#22c55e" stackId="a" name="Hoạt động" />
            <Bar dataKey="warning" fill="#f59e0b" stackId="a" name="Cảnh báo" />
            <Bar dataKey="offline" fill="#ef4444" stackId="a" name="Mất kết nối" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
