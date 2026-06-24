import { useState, useEffect } from 'react';
import axios from 'axios';
import { Server, HardDrive, Cpu, MemoryStick, Trash2, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatPercent, formatUptime } from '../utils/format';
import { useSocket } from '../hooks/useSocket';

function UsageBar({ value, danger = 85, warn = 70 }) {
  const v = parseFloat(value) || 0;
  const color = v >= danger ? 'bg-red-500' : v >= warn ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-600 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(v, 100)}%` }} />
      </div>
      <span className={`text-xs font-mono w-12 text-right ${v >= danger ? 'text-red-400' : v >= warn ? 'text-yellow-400' : 'text-slate-300'}`}>
        {v.toFixed(1)}%
      </span>
    </div>
  );
}

export default function Servers() {
  const [servers, setServers] = useState([]);
  const [storage, setStorage] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(null);
  const { on } = useSocket();

  useEffect(() => {
    Promise.all([
      axios.get('/api/servers'),
      axios.get('/api/servers/storage'),
      axios.get('/api/servers/stats'),
    ]).then(([s, st, stats]) => {
      setServers(s.data);
      setStorage(st.data);
      setStats(stats.data);
    }).finally(() => setLoading(false));

    const cleanup = on('server_metrics_update', (metrics) => {
      setServers(prev => prev.map(s => {
        const update = metrics.find(m => m.id === s.id);
        return update ? { ...s, ...update } : s;
      }));
    });
    return cleanup;
  }, []);

  const clearJunk = async (server) => {
    setClearing(server.id);
    try {
      const res = await axios.post(`/api/servers/${server.id}/clear-junk`);
      setServers(prev => prev.map(s => s.id === server.id
        ? { ...s, disk_usage: Math.max(parseFloat(s.disk_usage) - parseFloat(res.data.freed_percent), 0).toFixed(2) }
        : s
      ));
      alert(`Đã giải phóng ${res.data.freed_percent}% dung lượng từ ${server.hostname}`);
    } catch { alert('Không thể thực hiện thao tác'); }
    finally { setClearing(null); }
  };

  const filtered = filter
    ? servers.filter(s => s.hostname.toLowerCase().includes(filter.toLowerCase()) || s.role.toLowerCase().includes(filter.toLowerCase()))
    : servers;

  const onlineCount = servers.filter(s => s.status === 'online').length;

  return (
    <div className="space-y-5">
      <PageHeader title="Máy chủ & CSDL" subtitle={`${servers.length} máy chủ - Virtual & Physical`} icon={Server} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Online" value={`${onlineCount}/${servers.length}`} icon={Server} color="green" />
        <StatCard label="CPU cao (>80%)" value={stats?.highCpuAlerts?.length || 0} icon={Cpu} color={stats?.highCpuAlerts?.length > 0 ? 'red' : 'green'} />
        <StatCard label="Disk cao (>80%)" value={stats?.highDiskAlerts?.length || 0} icon={HardDrive} color={stats?.highDiskAlerts?.length > 0 ? 'yellow' : 'green'} />
        <StatCard label="Offline" value={servers.filter(s => s.status === 'offline').length} icon={AlertTriangle} color="red" />
      </div>

      {/* Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {storage.map(s => (
          <div key={s.id} className="card flex items-center gap-4">
            <HardDrive className="w-8 h-8 text-slate-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-semibold text-slate-200">{s.name}</span>
                <span className={`text-sm font-bold ${parseFloat(s.usage_percent) > 85 ? 'text-red-400' : 'text-green-400'}`}>
                  {s.usage_percent}%
                </span>
              </div>
              <UsageBar value={s.usage_percent} />
              <p className="text-xs text-slate-500 mt-1">
                {parseFloat(s.used_tb).toFixed(1)} TB / {parseFloat(s.total_tb).toFixed(0)} TB · {s.location}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Servers table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">Danh sách máy chủ</h3>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="input-field w-48 py-1.5 text-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Hostname', 'Vai trò', 'Loại', 'IP', 'CPU', 'RAM', 'Disk', 'Uptime', 'TT', 'Thao tác'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center text-slate-500 py-8 text-sm">Đang tải...</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell font-mono text-xs font-bold text-slate-200">{s.hostname}</td>
                  <td className="table-cell text-xs">{s.role}</td>
                  <td className="table-cell">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${s.server_type === 'physical' ? 'bg-slate-600 text-slate-300' : 'bg-blue-900/40 text-blue-300'}`}>
                      {s.server_type === 'physical' ? 'Physical' : s.server_type === 'virtual' ? 'Virtual' : 'Cluster'}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs">{s.ip_address}</td>
                  <td className="table-cell w-28"><UsageBar value={s.cpu_usage} /></td>
                  <td className="table-cell w-28"><UsageBar value={s.memory_usage} /></td>
                  <td className="table-cell w-28"><UsageBar value={s.disk_usage} /></td>
                  <td className="table-cell text-xs">{formatUptime(s.uptime_seconds)}</td>
                  <td className="table-cell"><StatusBadge status={s.status} /></td>
                  <td className="table-cell">
                    <button
                      onClick={() => clearJunk(s)}
                      disabled={clearing === s.id || s.status !== 'online'}
                      className="text-xs text-slate-400 hover:text-blue-400 disabled:opacity-30 flex items-center gap-1"
                      title="Dọn rác disk"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
