const STATUS_CONFIG = {
  online: { class: 'badge-online', label: 'Hoạt động', dot: 'bg-green-400' },
  offline: { class: 'badge-offline', label: 'Mất kết nối', dot: 'bg-red-400' },
  warning: { class: 'badge-warning', label: 'Cảnh báo', dot: 'bg-yellow-400' },
  maintenance: { class: 'badge-maintenance', label: 'Bảo trì', dot: 'bg-blue-400' },
  open: { class: 'badge-online', label: 'Mở', dot: 'bg-green-400' },
  closed: { class: 'badge-offline', label: 'Đóng', dot: 'bg-red-400' },
  error: { class: 'badge-offline', label: 'Lỗi', dot: 'bg-red-400' },
  active: { class: 'badge-online', label: 'Kênh chính', dot: 'bg-green-400' },
  standby: { class: 'badge-warning', label: 'Dự phòng', dot: 'bg-yellow-400' },
  normal: { class: 'badge-online', label: 'Bình thường', dot: 'bg-green-400' },
  critical: { class: 'badge-offline', label: 'Nguy hiểm', dot: 'bg-red-400' },
};

export default function StatusBadge({ status, showDot = true }) {
  const cfg = STATUS_CONFIG[status] || { class: 'badge-maintenance', label: status, dot: 'bg-slate-400' };
  return (
    <span className={cfg.class}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} pulse-dot`} />}
      {cfg.label}
    </span>
  );
}
