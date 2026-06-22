import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileBarChart, Download, Calendar, AlertCircle, Video, Server, CreditCard } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { formatCurrency, formatNumber, formatDatetime } from '../utils/format';

const REPORT_TYPES = [
  { id: 'weekly', label: 'Báo cáo tuần (Phụ lục 3)', icon: Calendar },
  { id: 'monthly', label: 'Báo cáo tháng (Phụ lục 4)', icon: Calendar },
  { id: 'annual', label: 'Báo cáo năm (Phụ lục 5)', icon: Calendar },
];

export default function Reports() {
  const [activeType, setActiveType] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ date: '', year: new Date().getFullYear() });

  const fetchReport = () => {
    setLoading(true);
    const query = activeType === 'annual'
      ? `?year=${params.year}`
      : params.date ? `?date=${params.date}` : '';
    axios.get(`/api/reports/${activeType}${query}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, [activeType]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Báo cáo', activeType, data.from || data.year, data.to || '']];
    if (data.faults) {
      rows.push([]);
      rows.push(['I. THIẾT BỊ HỎng/SỰ CỐ']);
      rows.push(['Nguồn', 'Tên thiết bị', 'Mức độ', 'Thông điệp', 'Thời gian', 'Đã giải quyết']);
      data.faults.forEach(f => rows.push([f.source_type, f.source_name, f.severity, f.message, f.created_at, f.resolved_at || 'Chưa']));
    }
    if (data.videoInterruptions) {
      rows.push([]);
      rows.push(['II. GIÁN ĐOẠN VIDEO']);
      rows.push(['Camera', 'Loại', 'Trạm', 'Bắt đầu', 'Kết thúc', 'Thời gian (giây)']);
      data.videoInterruptions.forEach(v => rows.push([v.camera_code, v.camera_type, v.station_name, v.start_time, v.end_time, v.duration_seconds]));
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${activeType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Báo cáo"
        subtitle="Phụ lục 3 · 4 · 5 - Xuất báo cáo định kỳ"
        icon={FileBarChart}
        actions={
          <button onClick={exportCSV} disabled={!data} className="btn-secondary flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
        }
      />

      {/* Report type tabs */}
      <div className="flex gap-2 flex-wrap">
        {REPORT_TYPES.map(r => (
          <button
            key={r.id}
            onClick={() => { setActiveType(r.id); setData(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeType === r.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            <r.icon className="w-4 h-4" />
            {r.label}
          </button>
        ))}
      </div>

      {/* Params */}
      <div className="flex items-center gap-3 flex-wrap">
        {activeType !== 'annual' ? (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Từ ngày:</label>
            <input type="date" value={params.date} onChange={e => setParams(p => ({ ...p, date: e.target.value }))} className="input-field w-40 py-1.5 text-xs" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Năm:</label>
            <input type="number" value={params.year} onChange={e => setParams(p => ({ ...p, year: e.target.value }))} min={2020} max={2030} className="input-field w-24 py-1.5 text-xs" />
          </div>
        )}
        <button onClick={fetchReport} className="btn-primary py-1.5 text-xs">Tạo báo cáo</button>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          Đang tạo báo cáo...
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          {/* Summary banner */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-6 py-4">
            <div className="flex items-center gap-3">
              <FileBarChart className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {REPORT_TYPES.find(r => r.id === activeType)?.label}
                </p>
                <p className="text-xs text-slate-400">
                  Kỳ báo cáo: {data.from ? `${data.from} đến ${data.to}` : `Năm ${data.year}`}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly/Monthly faults */}
          {data.faults && data.faults.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-slate-200">I. Thiết bị hỏng / Sự cố</h3>
                <span className="ml-auto text-xs text-slate-500">{data.faults.length} sự kiện</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Nguồn', 'Tên thiết bị', 'Mức độ', 'Mô tả', 'Thời gian', 'Xử lý'].map(h => (
                        <th key={h} className="table-header">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.faults.slice(0, 20).map((f, i) => (
                      <tr key={i} className="table-row">
                        <td className="table-cell text-xs">{f.source_type}</td>
                        <td className="table-cell text-xs font-mono">{f.source_name}</td>
                        <td className="table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded ${f.severity === 'critical' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                            {f.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                          </span>
                        </td>
                        <td className="table-cell text-xs max-w-48 truncate">{f.message}</td>
                        <td className="table-cell text-xs">{formatDatetime(f.created_at)}</td>
                        <td className="table-cell text-xs">
                          {f.resolved_at ? <span className="text-green-400">Đã xử lý ({Math.round(f.duration_hours)}h)</span> : <span className="text-red-400">Chưa xử lý</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Video interruptions */}
          {data.videoInterruptions && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
                <Video className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">II. Gián đoạn tín hiệu video</h3>
                <span className="ml-auto text-xs text-slate-500">{data.videoInterruptions.length} sự kiện</span>
              </div>
              {data.videoInterruptions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Không có gián đoạn</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {['Camera', 'Loại', 'Trạm', 'Bắt đầu', 'Kết thúc', 'Thời gian', 'Lý do'].map(h => (
                          <th key={h} className="table-header">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.videoInterruptions.map((v, i) => (
                        <tr key={i} className="table-row">
                          <td className="table-cell text-xs font-mono">{v.camera_code}</td>
                          <td className="table-cell text-xs">{v.camera_type?.toUpperCase()}</td>
                          <td className="table-cell text-xs">{v.station_name}</td>
                          <td className="table-cell text-xs">{formatDatetime(v.start_time)}</td>
                          <td className="table-cell text-xs">{v.end_time ? formatDatetime(v.end_time) : '—'}</td>
                          <td className="table-cell text-xs">{v.duration_seconds ? `${Math.round(v.duration_seconds / 60)}p` : '—'}</td>
                          <td className="table-cell text-xs">{v.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* System status (Phụ lục 3 - Trạng thái 9 hệ thống) */}
          {data.systemStatus && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
                <Server className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-slate-200">III. Trạng thái hệ thống</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Hệ thống', 'Tổng', 'Hoạt động', 'Offline', 'Tỷ lệ'].map(h => (
                        <th key={h} className="table-header">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.systemStatus.map((s, i) => {
                      const pct = s.total > 0 ? (s.online / s.total * 100).toFixed(1) : 0;
                      return (
                        <tr key={i} className="table-row">
                          <td className="table-cell font-medium capitalize">{s.system.replace('_', ' ')}</td>
                          <td className="table-cell text-center">{s.total}</td>
                          <td className="table-cell text-center text-green-400">{s.online}</td>
                          <td className="table-cell text-center text-red-400">{s.offline}</td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${pct >= 95 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-300 w-10">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly toll */}
          {data.toll && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">IV. Tổng hợp thu phí</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Trạm', 'Giao dịch', 'Doanh thu'].map(h => <th key={h} className="table-header">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.toll.map((t, i) => (
                      <tr key={i} className="table-row">
                        <td className="table-cell">{t.station_name}</td>
                        <td className="table-cell font-mono">{formatNumber(t.transactions)}</td>
                        <td className="table-cell">{formatCurrency(t.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
