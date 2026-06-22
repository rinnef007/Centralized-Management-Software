import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { formatDatetime } from '../../utils/format';

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/40', label: 'Nghiêm trọng' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/40', label: 'Cảnh báo' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/40', label: 'Thông tin' },
};

export default function AlertsFeed() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchAlerts = () => {
    setLoading(true);
    axios.get('/api/dashboard/alerts?limit=15')
      .then(res => setAlerts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
    const cleanup = on('new_alert', (alert) => {
      setAlerts(prev => [{ ...alert, id: `rt-${Date.now()}`, created_at: new Date().toISOString() }, ...prev].slice(0, 15));
    });
    return cleanup;
  }, []);

  const acknowledge = async (id) => {
    if (typeof id === 'string' && id.startsWith('rt-')) return;
    await axios.patch(`/api/dashboard/alerts/${id}/acknowledge`);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_acknowledged: true } : a));
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Cảnh báo thời gian thực</h3>
        <button onClick={fetchAlerts} className="text-slate-500 hover:text-slate-300 p-1 rounded">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && !alerts.length ? (
          <div className="text-xs text-slate-500 text-center py-8">Đang tải...</div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <CheckCircle className="w-8 h-8 mb-2 text-green-500/50" />
            <p className="text-xs">Không có cảnh báo</p>
          </div>
        ) : alerts.map(a => {
          const cfg = severityConfig[a.severity] || severityConfig.info;
          const Icon = cfg.icon;
          return (
            <div
              key={a.id}
              className={`flex gap-2.5 p-2.5 rounded-lg border ${cfg.bg} ${!a.is_acknowledged ? 'alert-flash' : ''}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 leading-tight">{a.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500">{a.station_name || a.source_name} · {formatDatetime(a.created_at)}</p>
                  {!a.is_acknowledged && (
                    <button
                      onClick={() => acknowledge(a.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 ml-2 flex-shrink-0"
                    >
                      Xác nhận
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
