import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, LogOut, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { formatDatetime } from '../utils/format';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const { logout, user } = useAuth();
  const { connected, on } = useSocket();

  useEffect(() => {
    const cleanup = on('new_alert', (alert) => {
      setAlerts(prev => [{ ...alert, id: Date.now() }, ...prev].slice(0, 10));
    });
    return cleanup;
  }, [on]);

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {connected ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-green-400" />
                  Kết nối thời gian thực
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-red-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  Mất kết nối
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">{new Date().toLocaleString('vi-VN')}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Alert bell */}
            <div className="relative">
              <button
                onClick={() => setShowAlerts(s => !s)}
                className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center alert-flash">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showAlerts && (
                <div className="absolute right-0 top-10 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <span className="text-sm font-semibold text-slate-200">Cảnh báo mới</span>
                    <button onClick={() => { setAlerts([]); setShowAlerts(false); }} className="text-xs text-slate-500 hover:text-slate-300">Xóa tất cả</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-700">
                    {alerts.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-6">Không có cảnh báo mới</p>
                    ) : alerts.map(a => (
                      <div key={a.id} className="px-4 py-3 hover:bg-slate-700/50">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} />
                          <div>
                            <p className="text-xs text-slate-300 font-medium">{a.message}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{formatDatetime(a.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs text-slate-400">{user?.full_name}</span>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
