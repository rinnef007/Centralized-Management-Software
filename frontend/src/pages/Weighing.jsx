import { useState, useEffect } from 'react';
import axios from 'axios';
import { Weight, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatNumber, formatDatetime } from '../utils/format';

export default function Weighing() {
  const [lanes, setLanes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [overloadOnly, setOverloadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/weighing/lanes'),
      axios.get(`/api/weighing/sessions?limit=30${overloadOnly ? '&overloaded_only=true' : ''}`),
      axios.get('/api/weighing/stats'),
    ]).then(([ln, ss, st]) => {
      setLanes(ln.data);
      setSessions(ss.data);
      setStats(st.data);
    }).finally(() => setLoading(false));
  }, [overloadOnly]);

  return (
    <div className="space-y-5">
      <PageHeader title="Cân tải trọng (OMS)" subtitle="13 làn cân WIM · Cảm biến Quartz" icon={Weight} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Đã cân hôm nay" value={formatNumber(stats?.daily?.total)} icon={Weight} color="blue" />
        <StatCard label="Xe quá tải" value={formatNumber(stats?.daily?.overloaded)} icon={AlertTriangle} color="red" sub="Hôm nay" />
        <StatCard
          label="Tỷ lệ quá tải"
          value={stats?.daily?.total > 0 ? `${(stats.daily.overloaded / stats.daily.total * 100).toFixed(1)}%` : '0%'}
          icon={TrendingUp} color="yellow"
        />
        <StatCard label="Cảm biến online" value={`${lanes.filter(l => l.status === 'online').length}/${lanes.length}`} icon={CheckCircle} color="green" />
      </div>

      {/* Lanes grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {lanes.map(l => (
          <div key={l.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-200">{l.lane_code}</span>
              <StatusBadge status={l.status} />
            </div>
            <p className="text-xs text-slate-400">{l.station_name}</p>
            <p className="text-xs text-slate-500 mt-1">Cảm biến: {l.sensor_type}</p>
            <p className="text-xs text-slate-500">Hôm nay: <span className="text-slate-300 font-medium">{l.daily_count}</span> lượt</p>
            <p className="text-xs text-slate-500">Hiệu chuẩn: {l.last_calibration}</p>
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">Lịch sử cân gần đây</h3>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={overloadOnly} onChange={e => setOverloadOnly(e.target.checked)} className="rounded" />
            Chỉ hiển thị quá tải
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Làn', 'Thời gian', 'Biển số', 'Loại xe', 'Số trục', 'Tổng tải (kg)', 'Tải cho phép (kg)', 'Quá tải', 'Trạng thái'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center text-slate-500 py-8 text-sm">Đang tải...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-slate-500 py-8 text-sm">Chưa có dữ liệu</td></tr>
              ) : sessions.map(s => (
                <tr key={s.id} className={`table-row ${s.is_overloaded ? 'bg-red-900/10' : ''}`}>
                  <td className="table-cell font-mono text-xs">{s.lane_code}</td>
                  <td className="table-cell text-xs">{formatDatetime(s.weigh_time)}</td>
                  <td className="table-cell font-mono text-sm font-bold">{s.plate_number || '—'}</td>
                  <td className="table-cell text-xs">{s.vehicle_type || '—'}</td>
                  <td className="table-cell text-center">{s.axle_count || '—'}</td>
                  <td className="table-cell font-mono">{formatNumber(s.gross_weight)}</td>
                  <td className="table-cell font-mono">{formatNumber(s.allowed_weight)}</td>
                  <td className="table-cell">
                    {s.is_overloaded ? (
                      <span className="text-xs text-red-400 font-bold">+{formatNumber(s.overload_kg)} kg ({parseFloat(s.overload_percent).toFixed(1)}%)</span>
                    ) : (
                      <span className="text-xs text-green-400">Đạt chuẩn</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded ${s.is_overloaded ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                      {s.is_overloaded ? 'Quá tải' : 'Đạt'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
