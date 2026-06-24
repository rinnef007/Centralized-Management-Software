import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Weight, Camera, Server, Wifi, HardDrive, AlertTriangle, Network } from 'lucide-react';
import GISMap from '../components/dashboard/GISMap';
import AlertsFeed from '../components/dashboard/AlertsFeed';
import SystemHealth from '../components/dashboard/SystemHealth';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';
import { useSocket } from '../hooks/useSocket';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchSummary = () => {
    axios.get('/api/dashboard/summary')
      .then(res => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    const cleanup = on('toll_transaction', () => {
      setSummary(prev => prev ? {
        ...prev,
        kpis: { ...prev.kpis, totalTransactions: prev.kpis.totalTransactions + 1 }
      } : prev);
    });
    return () => { clearInterval(interval); cleanup?.(); };
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const storage = summary?.storage || [];
  const mpls = summary?.mpls || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Bảng điều khiển trung tâm</h1>
          <p className="text-sm text-slate-400 mt-0.5">Trung tâm điều hành - Tuyến đường cao tốc</p>
        </div>
        <div className="flex items-center gap-3">
          {mpls.map(m => (
            <div key={m.id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <Network className="w-3.5 h-3.5 text-slate-400" />
              <div>
                <p className="text-xs font-medium text-slate-300">{m.name} ({m.provider})</p>
                <p className="text-xs text-slate-500">{m.bandwidth_mbps}Mbps · {m.latency_ms}ms</p>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Giao dịch hôm nay"
          value={formatNumber(summary?.kpis?.totalTransactions)}
          icon={CreditCard} color="blue"
          sub="Tổng làn thu phí"
        />
        <StatCard
          label="Doanh thu hôm nay"
          value={formatCurrency(summary?.kpis?.totalRevenue)?.replace('₫', '').trim()}
          icon={CreditCard} color="green"
          sub="VND"
        />
        <StatCard
          label="Xe quá tải"
          value={formatNumber(summary?.kpis?.overloadCount)}
          icon={Weight} color="red"
          sub="Phát hiện hôm nay"
        />
        <StatCard
          label="Camera hoạt động"
          value={`${summary?.cameras?.online || 0}/${summary?.cameras?.total || 0}`}
          icon={Camera} color="cyan"
          sub={`Offline: ${summary?.cameras?.offline || 0}`}
        />
        <StatCard
          label="Máy chủ online"
          value={`${summary?.servers?.online || 0}/${summary?.servers?.total || 0}`}
          icon={Server} color="purple"
          sub={`Warning: ${summary?.servers?.warning || 0}`}
        />
        <StatCard
          label="Cảnh báo chưa xử lý"
          value={`${(summary?.alerts?.critical || 0) + (summary?.alerts?.warning || 0)}`}
          icon={AlertTriangle} color={summary?.alerts?.critical > 0 ? 'red' : 'yellow'}
          sub={`Nghiêm trọng: ${summary?.alerts?.critical || 0}`}
        />
      </div>

      {/* Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {storage.map(s => {
          const pct = s.total_tb ? (parseFloat(s.used_tb) / parseFloat(s.total_tb) * 100) : 0;
          const color = pct > 85 ? 'text-red-400' : pct > 70 ? 'text-yellow-400' : 'text-green-400';
          return (
            <div key={s.id} className="card flex items-center gap-4">
              <HardDrive className="w-8 h-8 text-slate-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">{s.name}</span>
                  <span className={`text-sm font-bold ${color}`}>{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mb-1">
                  <div
                    className={`h-2 rounded-full transition-all ${pct > 85 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Đã dùng: {parseFloat(s.used_tb).toFixed(1)} TB / {parseFloat(s.total_tb).toFixed(0)} TB · {s.location}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </div>
          );
        })}
      </div>

      {/* Main grid: Map + Alerts + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2" style={{ minHeight: '500px' }}>
          <GISMap />
        </div>
        <div className="flex flex-col gap-5">
          <div style={{ height: '250px' }}>
            <AlertsFeed />
          </div>
          <div className="flex-1">
            <SystemHealth data={summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
