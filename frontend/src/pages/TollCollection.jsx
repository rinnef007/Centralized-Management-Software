import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatCurrency, formatNumber } from '../utils/format';
import { useSocket } from '../hooks/useSocket';

const LANE_TYPE_LABEL = { manual: 'Thủ công', etc: 'ETC', mixed: 'Hỗn hợp', emergency: 'Khẩn cấp' };
const LANE_STATUS_LABEL = { open: 'Mở', closed: 'Đóng', maintenance: 'Bảo trì', error: 'Lỗi' };

export default function TollCollection() {
  const [stations, setStations] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchData = () => {
    Promise.all([
      axios.get('/api/tolls/stations'),
      axios.get('/api/tolls/lanes' + (selectedStation ? `?station_id=${selectedStation}` : '')),
      axios.get('/api/tolls/stats'),
    ]).then(([st, ln, stats]) => {
      setStations(st.data);
      setLanes(ln.data);
      setStats(stats.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [selectedStation]);

  useEffect(() => {
    const cleanup = on('toll_transaction', (tx) => {
      setLanes(prev => prev.map(l => l.id === tx.lane_id
        ? { ...l, daily_transactions: (l.daily_transactions || 0) + 1, daily_revenue: (l.daily_revenue || 0) + tx.amount }
        : l
      ));
    });
    return cleanup;
  }, []);

  const totalTx = stations.reduce((a, s) => a + parseInt(s.daily_transactions || 0), 0);
  const totalRev = stations.reduce((a, s) => a + parseInt(s.daily_revenue || 0), 0);
  const openLanes = lanes.filter(l => l.status === 'open').length;
  const errorLanes = lanes.filter(l => l.status === 'error').length;

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý Thu phí (TCS)" subtitle="62 làn · 6 trạm thu phí" icon={CreditCard} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Giao dịch hôm nay" value={formatNumber(totalTx)} icon={CreditCard} color="blue" />
        <StatCard label="Doanh thu hôm nay" value={`${(totalRev / 1000000).toFixed(1)}M ₫`} icon={TrendingUp} color="green" />
        <StatCard label="Làn đang mở" value={`${openLanes}/${lanes.length}`} icon={CreditCard} color="cyan" />
        <StatCard label="Làn lỗi" value={errorLanes} icon={AlertCircle} color={errorLanes > 0 ? 'red' : 'green'} />
      </div>

      {/* Chart */}
      {stats?.byStation && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Giao dịch theo trạm (hôm nay)</h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byStation} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v, n) => [n === 'transactions' ? formatNumber(v) : formatCurrency(v), n === 'transactions' ? 'Giao dịch' : 'Doanh thu']}
                />
                <Bar dataKey="transactions" fill="#3b82f6" name="transactions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Station selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedStation(null)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${!selectedStation ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
        >
          Tất cả trạm
        </button>
        {stations.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedStation(s.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${selectedStation === s.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Lanes table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">
            Danh sách làn thu phí {selectedStation ? `- ${stations.find(s => s.id === selectedStation)?.name}` : ''}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Mã làn', 'Trạm', 'Loại làn', 'Chiều', 'Giao dịch hôm nay', 'Doanh thu', 'Trạng thái'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-slate-500 py-8 text-sm">Đang tải...</td></tr>
              ) : lanes.map(l => (
                <tr key={l.id} className="table-row">
                  <td className="table-cell font-mono font-bold text-slate-200">{l.lane_code}</td>
                  <td className="table-cell text-xs">{l.station_name}</td>
                  <td className="table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded ${l.lane_type === 'etc' ? 'bg-blue-900/40 text-blue-300' : l.lane_type === 'mixed' ? 'bg-purple-900/40 text-purple-300' : 'bg-slate-700 text-slate-300'}`}>
                      {LANE_TYPE_LABEL[l.lane_type] || l.lane_type}
                    </span>
                  </td>
                  <td className="table-cell text-xs">{l.direction === 'inbound' ? 'Vào' : l.direction === 'outbound' ? 'Ra' : 'Hai chiều'}</td>
                  <td className="table-cell font-mono">{formatNumber(l.daily_transactions)}</td>
                  <td className="table-cell">{formatCurrency(l.daily_revenue)}</td>
                  <td className="table-cell"><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
