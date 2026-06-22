import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Network, Server, CreditCard, Weight, Camera,
  MonitorPlay, Zap, FileBarChart, Settings, ChevronLeft, ChevronRight,
  Radio
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Bảng điều khiển', exact: true },
  { to: '/network', icon: Network, label: 'Mạng & Thiết bị', roles: ['admin', 'cmo_operator'] },
  { to: '/servers', icon: Server, label: 'Máy chủ & CSDL', roles: ['admin', 'cmo_operator'] },
  { to: '/tolls', icon: CreditCard, label: 'Thu phí (TCS)' },
  { to: '/weighing', icon: Weight, label: 'Cân tải trọng (OMS)' },
  { to: '/cameras', icon: Camera, label: 'Camera CCTV & VDS' },
  { to: '/vms', icon: MonitorPlay, label: 'Biển báo VMS', roles: ['admin', 'cmo_operator'] },
  { to: '/power', icon: Zap, label: 'Hạ tầng điện (PSS)', roles: ['admin', 'cmo_operator'] },
  { to: '/reports', icon: FileBarChart, label: 'Báo cáo', roles: ['admin', 'cmo_operator'] },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, hasRole } = useAuth();

  const roleLabel = {
    admin: 'Quản trị viên',
    cmo_operator: 'Nhân viên CMO',
    station_operator: 'Nhân viên Trạm',
    night_shift: 'Kíp trực đêm',
  };

  return (
    <aside className={`flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Radio className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-100 leading-tight">CMS-ITS</p>
            <p className="text-xs text-slate-500">v1.0.0</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          if (item.roles && !hasRole(...item.roles)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user.full_name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500">{roleLabel[user.role]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-2 border-t border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
