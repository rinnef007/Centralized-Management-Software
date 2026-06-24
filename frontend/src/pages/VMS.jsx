import { useState, useEffect } from 'react';
import axios from 'axios';
import { MonitorPlay, Send, AlertTriangle, Zap } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { formatDatetime } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

export default function VMS() {
  const [signs, setSigns] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ message_text: '', scenario: 'normal' });
  const [sending, setSending] = useState(false);
  const [emergencySign, setEmergencySign] = useState(null);
  const { hasRole } = useAuth();
  const canControl = hasRole('admin', 'cmo_operator');

  useEffect(() => {
    Promise.all([
      axios.get('/api/vms/signs'),
      axios.get('/api/vms/scenarios'),
      axios.get('/api/vms/messages'),
    ]).then(([s, sc, m]) => {
      setSigns(s.data);
      setScenarios(sc.data);
      setMessages(m.data);
    });
  }, []);

  const sendMessage = async () => {
    if (!selected || !form.message_text) return;
    setSending(true);
    try {
      await axios.post(`/api/vms/signs/${selected.id}/send`, form);
      setSigns(prev => prev.map(s => s.id === selected.id ? { ...s, current_message: form.message_text, current_scenario: form.scenario } : s));
      const res = await axios.get('/api/vms/messages');
      setMessages(res.data);
      alert('Đã gửi nội dung đến biển VMS thành công');
    } catch { alert('Lỗi gửi lệnh'); }
    finally { setSending(false); }
  };

  const sendEmergency = async (signId, command) => {
    if (!confirm(`Xác nhận gửi lệnh khẩn cấp ${command.toUpperCase()} đến biển?`)) return;
    try {
      const res = await axios.post(`/api/vms/signs/${signId}/emergency`, { command });
      alert(`${res.data.message}\nHEX: ${res.data.hex_command} | Port: ${res.data.port} | IP: ${res.data.sign_ip}`);
    } catch { alert('Lỗi gửi lệnh khẩn cấp'); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý Biển báo VMS" subtitle="8 biển VMS dọc tuyến" icon={MonitorPlay} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Signs list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Danh sách biển VMS</h3>
          {signs.map(sign => (
            <div
              key={sign.id}
              onClick={() => canControl && setSelected(sign)}
              className={`card cursor-pointer transition-all ${canControl ? 'hover:border-blue-600/50' : ''} ${selected?.id === sign.id ? 'ring-2 ring-blue-500 border-blue-600/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-200">{sign.sign_code}</span>
                <StatusBadge status={sign.status} />
              </div>
              <p className="text-xs text-slate-400 mb-1">{sign.name}</p>
              <div className="bg-slate-900 rounded p-2 mb-2">
                <p className="text-xs font-mono text-green-400 text-center">{sign.current_message || '---'}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">IP: {sign.ip_address} · Port: {sign.ipc_port}</p>
                {canControl && (
                  <div className="flex gap-1">
                    {['run20h', 'run22h', 'run23h'].map(cmd => (
                      <button
                        key={cmd}
                        onClick={(e) => { e.stopPropagation(); sendEmergency(sign.id, cmd); }}
                        className="text-xs px-1.5 py-0.5 bg-red-900/40 text-red-400 border border-red-800/40 rounded hover:bg-red-900/60 transition-colors"
                        title={`Gửi lệnh khẩn cấp ${cmd.toUpperCase()}`}
                      >
                        {cmd.replace('run', 'R').replace('h', 'H')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message editor + history */}
        <div className="lg:col-span-2 space-y-4">
          {canControl && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">
                {selected ? `Chỉnh sửa nội dung: ${selected.sign_code}` : 'Chọn biển để chỉnh sửa'}
              </h3>
              {selected ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Kịch bản hiển thị</label>
                    <select
                      value={form.scenario}
                      onChange={e => setForm(f => ({ ...f, scenario: e.target.value }))}
                      className="input-field"
                    >
                      {scenarios.filter(s => !s.code.startsWith('emergency')).map(s => (
                        <option key={s.code} value={s.code}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Nội dung hiển thị</label>
                    <textarea
                      value={form.message_text}
                      onChange={e => setForm(f => ({ ...f, message_text: e.target.value }))}
                      rows={3}
                      className="input-field resize-none font-mono uppercase"
                      placeholder="NHẬP NỘI DUNG HIỂN THỊ..."
                      maxLength={200}
                    />
                    <p className="text-xs text-slate-500 text-right">{form.message_text.length}/200</p>
                  </div>

                  {/* Preview */}
                  <div className="bg-slate-950 border border-slate-600 rounded-lg p-4 min-h-16 flex items-center justify-center">
                    <p className="text-lg font-bold font-mono text-amber-400 text-center tracking-wider uppercase">
                      {form.message_text || '---'}
                    </p>
                  </div>

                  <button
                    onClick={sendMessage}
                    disabled={sending || !form.message_text}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Đang gửi...' : `Gửi đến ${selected.sign_code}`}
                  </button>

                  {/* Emergency section */}
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Lệnh khẩn cấp (VNHP-CTL1.1)
                    </p>
                    <div className="flex gap-2">
                      {[
                        { cmd: 'run20h', label: 'RUN(20H)', hex: '0xE1' },
                        { cmd: 'run22h', label: 'RUN(22H)', hex: '0xE2' },
                        { cmd: 'run23h', label: 'RUN(23H)', hex: '0xE3' },
                      ].map(({ cmd, label, hex }) => (
                        <button
                          key={cmd}
                          onClick={() => sendEmergency(selected.id, cmd)}
                          className="flex-1 flex flex-col items-center gap-0.5 py-2 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          <span className="text-xs font-bold">{label}</span>
                          <span className="text-xs text-red-600">{hex}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">Chọn một biển VMS từ danh sách bên trái</p>
              )}
            </div>
          )}

          {/* Message history */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-slate-200">Lịch sử lệnh gửi</h3>
            </div>
            <div className="divide-y divide-slate-700 max-h-72 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Chưa có lịch sử</p>
              ) : messages.map(m => (
                <div key={m.id} className={`px-4 py-3 ${m.status === 'emergency_sent' ? 'bg-red-900/10' : ''}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-slate-300">{m.sign_code}</span>
                    <span className="text-xs text-slate-500">{formatDatetime(m.sent_at)}</span>
                  </div>
                  <p className="text-xs font-mono text-green-400">{m.message_text}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.sent_by_name} · HEX: {m.hex_command}
                    {m.status === 'emergency_sent' && <span className="ml-2 text-red-400 font-semibold">KHẨN CẤP</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
