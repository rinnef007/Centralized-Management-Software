export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatNumber = (n) => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('vi-VN').format(n);
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatUptime = (seconds) => {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatDatetime = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('vi-VN', { hour12: false });
};

export const formatDate = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('vi-VN');
};

export const formatPercent = (v) => {
  if (v === null || v === undefined) return '—';
  return `${parseFloat(v).toFixed(1)}%`;
};
