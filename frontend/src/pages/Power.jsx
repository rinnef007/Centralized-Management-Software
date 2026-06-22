import { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Battery, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { formatNumber } from '../utils/format';

function CapacityBar({ current, total }) {
  const pct = total ? (current / total * 100) : 0;
  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{formatNumber(current)}W</span>
        <span className={`font-bold ${pct > 90 ? 'text-red-400' : pct > 75 ? 'text-yellow-400' : 'text-green-400'}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-0.5">/{formatNumber(total)}W</p>
    </div>
  );
}

export default function Power() {
  const [stations, setStations] = useState([]);
  const [ups, setUps] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/power/stations'),
      axios.get('/api/power/ups'),
      axios.get('/api/power/summary'),
    ]).then(([st, u, s]) => {
      setStations(st.data);
      setUps(u.data);
      setSummary(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const totalLoadKW = summary ? (parseInt(summary.total.total_load) / 1000).toFixed(1) : 0;
  const totalCapKW = summary ? (parseInt(summary.total.total_capacity) / 1000).toFixed(1) : 0;
  const loadPct = summary && summary.total.total_capacity > 0
    ? (summary.total.total_load / summary.total.total_capacity * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Hạ tầng Điện (PSS)" subtitle="23 trạm biến áp · Máy phát điện · UPS" icon={Zap} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tổng tải hiện tại" value={`${totalLoadKW} kW`} icon={Zap} color="yellow" sub={`${loadPct}% công suất`} />
        <StatCard label="Tổng công suất" value={`${totalCapKW} kW`} icon={Zap} color="blue" />
        <StatCard label="Trạm có máy phát" value={summary?.total?.with_generator || 0} icon={Zap} color="green" />
        <StatCard label="UPS pin yếu (<20%)" value={summary?.ups?.low_battery || 0} icon={Battery} color={summary?.ups?.low_battery > 0 ? 'red' : 'green'} />
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Công suất tiêu thụ theo khu vực</h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stations.map(s => ({ name: s.name.replace('Trạm thu phí ', '').replace('Trung tâm ', 'CMO'), load: Math.round(s.current_load_w / 1000), capacity: Math.round(s.total_capacity_w / 1000) }))} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} unit=" kW" />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v) => [`${v} kW`]}
              />
              <Bar dataKey="capacity" fill="#334155" name="Công suất" radius={[2, 2, 0, 0]} />
              <Bar dataKey="load" fill="#f59e0b" name="Tải hiện tại" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Power stations */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200">Trạm điện</h3>
          </div>
          <div className="divide-y divide-slate-700">
            {stations.map(s => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.transformer_count} MBA · {s.ups_count} UPS</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.has_generator && (
                      <span className={`text-xs px-2 py-0.5 rounded ${s.generator_status === 'running' ? 'bg-green-900/40 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {s.generator_status === 'running' ? 'Máy phát chạy' : 'Máy phát dự phòng'}
                      </span>
                    )}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
                <CapacityBar current={s.current_load_w} total={s.total_capacity_w} />
              </div>
            ))}
          </div>
        </div>

        {/* UPS */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-200">Tình trạng UPS</h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
            <table className="w-full">
              <thead className="sticky top-0">
                <tr>
                  {['UPS', 'Trạm', 'Công suất', 'Tải', 'Pin', 'TT'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ups.map(u => (
                  <tr key={u.id} className={`table-row ${parseFloat(u.battery_percent) < 20 ? 'bg-red-900/10' : ''}`}>
                    <td className="table-cell text-xs font-mono">{u.name}</td>
                    <td className="table-cell text-xs">{u.station_name}</td>
                    <td className="table-cell text-xs">{u.capacity_kva}kVA</td>
                    <td className="table-cell text-xs">
                      <div className="w-16 bg-slate-600 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-yellow-500" style={{ width: `${Math.min(parseFloat(u.load_percent), 100)}%` }} />
                      </div>
                    </td>
                    <td className={`table-cell text-xs font-bold ${parseFloat(u.battery_percent) < 20 ? 'text-red-400' : parseFloat(u.battery_percent) < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {parseFloat(u.battery_percent).toFixed(0)}%
                    </td>
                    <td className="table-cell"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
