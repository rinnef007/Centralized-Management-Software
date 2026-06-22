import { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Video, AlertCircle, Plus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import StatCard from '../components/common/StatCard';
import { formatDatetime } from '../utils/format';

const TYPE_LABEL = { cctv: 'CCTV', vds: 'VDS', bridge: 'Cầu vượt', anpr: 'ANPR' };
const TYPE_COLOR = { cctv: 'bg-blue-900/40 text-blue-300', vds: 'bg-purple-900/40 text-purple-300', bridge: 'bg-green-900/40 text-green-300', anpr: 'bg-yellow-900/40 text-yellow-300' };

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [interruptions, setInterruptions] = useState([]);
  const [stats, setStats] = useState({});
  const [typeFilter, setTypeFilter] = useState('');
  const [tab, setTab] = useState('cameras');
  const [loading, setLoading] = useState(true);
  const [showAddInterrupt, setShowAddInterrupt] = useState(false);
  const [form, setForm] = useState({ camera_id: '', start_time: '', end_time: '', reason: '' });

  useEffect(() => {
    Promise.all([
      axios.get('/api/cameras' + (typeFilter ? `?type=${typeFilter}` : '')),
      axios.get('/api/cameras/interruptions'),
      axios.get('/api/cameras/stats'),
    ]).then(([c, i, s]) => {
      setCameras(c.data);
      setInterruptions(i.data);
      setStats(s.data);
    }).finally(() => setLoading(false));
  }, [typeFilter]);

  const logInterrupt = async () => {
    try {
      await axios.post('/api/cameras/interruptions', form);
      setShowAddInterrupt(false);
      const res = await axios.get('/api/cameras/interruptions');
      setInterruptions(res.data);
    } catch { alert('Lỗi ghi nhận'); }
  };

  const totalOnline = Object.values(stats).reduce((a, v) => a + (v.online || 0), 0);
  const totalOffline = Object.values(stats).reduce((a, v) => a + (v.offline || 0), 0);
  const totalAll = Object.values(stats).reduce((a, v) => a + (v.total || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Camera"
        subtitle="CCTV · VDS · Cầu vượt · ANPR"
        icon={Camera}
        actions={
          <button onClick={() => setShowAddInterrupt(true)} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Ghi nhận gián đoạn
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tổng camera" value={totalAll} icon={Camera} color="blue" />
        <StatCard label="Hoạt động" value={totalOnline} icon={Camera} color="green" />
        <StatCard label="Mất tín hiệu" value={totalOffline} icon={AlertCircle} color={totalOffline > 0 ? 'red' : 'green'} />
        <StatCard label="Gián đoạn (tháng)" value={interruptions.length} icon={Video} color="yellow" />
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(stats).map(([type, data]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            className={`card text-left transition-all ${typeFilter === type ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLOR[type]}`}>{TYPE_LABEL[type]}</span>
              <StatusBadge status={data.online > 0 ? 'online' : 'offline'} showDot={false} />
            </div>
            <p className="text-2xl font-bold text-slate-100">{data.total || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">Online: {data.online || 0} · Offline: {data.offline || 0}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {[{ id: 'cameras', label: 'Danh sách camera' }, { id: 'interruptions', label: 'Nhật ký gián đoạn' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cameras' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Mã camera', 'Tên', 'Loại', 'IP Address', 'VLAN', 'Trạm', 'Tọa độ', 'Tín hiệu cuối', 'TT'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center text-slate-500 py-8 text-sm">Đang tải...</td></tr>
                ) : cameras.map(c => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell font-mono text-xs font-bold text-slate-200">{c.camera_code}</td>
                    <td className="table-cell text-xs">{c.name}</td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLOR[c.camera_type]}`}>
                        {TYPE_LABEL[c.camera_type]}
                      </span>
                    </td>
                    <td className="table-cell font-mono text-xs">{c.ip_address}</td>
                    <td className="table-cell">
                      <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{c.vlan_id}</span>
                    </td>
                    <td className="table-cell text-xs">{c.station_name}</td>
                    <td className="table-cell text-xs font-mono text-slate-500">
                      {c.lat ? `${parseFloat(c.lat).toFixed(4)}, ${parseFloat(c.lng).toFixed(4)}` : '—'}
                    </td>
                    <td className="table-cell text-xs">{formatDatetime(c.last_signal)}</td>
                    <td className="table-cell"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'interruptions' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Camera', 'Loại', 'Trạm', 'Bắt đầu', 'Kết thúc', 'Thời gian (phút)', 'Lý do'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {interruptions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-slate-500 py-8 text-sm">Không có gián đoạn được ghi nhận</td></tr>
                ) : interruptions.map(i => (
                  <tr key={i.id} className="table-row">
                    <td className="table-cell font-mono text-xs font-bold">{i.camera_code}</td>
                    <td className="table-cell"><span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLOR[i.camera_type]}`}>{TYPE_LABEL[i.camera_type]}</span></td>
                    <td className="table-cell text-xs">{i.station_name}</td>
                    <td className="table-cell text-xs">{formatDatetime(i.start_time)}</td>
                    <td className="table-cell text-xs">{i.end_time ? formatDatetime(i.end_time) : <span className="text-red-400">Chưa kết thúc</span>}</td>
                    <td className="table-cell text-center">{i.duration_seconds ? Math.round(i.duration_seconds / 60) : '—'}</td>
                    <td className="table-cell text-xs">{i.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add interruption modal */}
      {showAddInterrupt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Ghi nhận gián đoạn video</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Camera</label>
                <select value={form.camera_id} onChange={e => setForm(f => ({ ...f, camera_id: e.target.value }))} className="input-field">
                  <option value="">-- Chọn camera --</option>
                  {cameras.map(c => <option key={c.id} value={c.id}>{c.camera_code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Thời gian bắt đầu</label>
                <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Thời gian kết thúc (nếu có)</label>
                <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Lý do / Ghi chú</label>
                <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input-field" placeholder="Mất điện, đứt cáp..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={logInterrupt} className="btn-primary flex-1">Ghi nhận</button>
              <button onClick={() => setShowAddInterrupt(false)} className="btn-secondary flex-1">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
