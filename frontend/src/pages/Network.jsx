import { useState, useEffect } from 'react';
import axios from 'axios';
import { Network as NetworkIcon, Layers, Server } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';

const VLANS = [
  { id: 110, name: 'VLAN 110 - CCTV', color: 'bg-blue-500' },
  { id: 111, name: 'VLAN 111 - VDS', color: 'bg-purple-500' },
  { id: 113, name: 'VLAN 113 - VMS', color: 'bg-yellow-500' },
  { id: 116, name: 'VLAN 116 - Cầu vượt', color: 'bg-green-500' },
];

export default function Network() {
  const [switches, setSwitches] = useState([]);
  const [vlans, setVlans] = useState([]);
  const [mpls, setMpls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('switches');

  useEffect(() => {
    Promise.all([
      axios.get('/api/network/switches'),
      axios.get('/api/network/vlans'),
      axios.get('/api/network/mpls'),
    ]).then(([sw, vl, ml]) => {
      setSwitches(sw.data);
      setVlans(vl.data);
      setMpls(ml.data);
    }).finally(() => setLoading(false));
  }, []);

  const onlineSwitches = switches.filter(s => s.status === 'online').length;

  return (
    <div className="space-y-5">
      <PageHeader title="Mạng & Thiết bị" subtitle="SNMS/NMS - Quản lý mạng và thiết bị đầu cuối" icon={NetworkIcon} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Switch online" value={`${onlineSwitches}/${switches.length}`} icon={Layers} color="green" />
        <StatCard label="VLAN hoạt động" value={VLANS.length} icon={Server} color="blue" />
        {mpls.map(m => (
          <div key={m.id} className="card">
            <p className="text-xs text-slate-400 uppercase tracking-wider">{m.name} ({m.channel_type === 'primary' ? 'Kênh chính' : 'Dự phòng'})</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{m.bandwidth_mbps} Mbps</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">{m.provider} · {m.latency_ms}ms</p>
              <StatusBadge status={m.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-0">
        {[
          { id: 'switches', label: 'Switches' },
          { id: 'vlans', label: 'VLAN' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'switches' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Tên switch', 'Model', 'IP Address', 'Lớp', 'Trạm', 'Số port', 'Trạng thái'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center text-slate-500 py-8 text-sm">Đang tải...</td></tr>
                ) : switches.map(sw => (
                  <tr key={sw.id} className="table-row">
                    <td className="table-cell font-medium text-slate-200">{sw.name}</td>
                    <td className="table-cell">{sw.model}</td>
                    <td className="table-cell font-mono text-xs">{sw.ip_address}</td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${sw.layer === 'L3' ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                        {sw.layer}
                      </span>
                    </td>
                    <td className="table-cell">{sw.station_name}</td>
                    <td className="table-cell">{sw.port_count}</td>
                    <td className="table-cell"><StatusBadge status={sw.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'vlans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vlans.map(v => (
            <div key={v.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${VLANS.find(vl => vl.id === v.id)?.color || 'bg-slate-500'}`} />
                <h3 className="text-sm font-semibold text-slate-200">{v.name}</h3>
                <span className="ml-auto text-xs text-slate-500">ID: {v.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: 'online', label: 'Hoạt động', color: 'text-green-400' },
                  { k: 'offline', label: 'Offline', color: 'text-red-400' },
                  { k: 'warning', label: 'Cảnh báo', color: 'text-yellow-400' },
                ].map(({ k, label, color }) => (
                  <div key={k} className="text-center">
                    <p className={`text-xl font-bold ${color}`}>{v.devices?.[k] || 0}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 w-full bg-slate-600 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${v.devices?.total ? (v.devices.online / v.devices.total * 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Tổng: {v.devices?.total || 0} thiết bị</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
