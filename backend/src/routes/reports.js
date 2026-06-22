const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/weekly', authenticate, async (req, res) => {
  try {
    const weekStart = req.query.date || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const [faults, videoInterruptions, systemStatus, security] = await Promise.all([
      pool.query(`
        SELECT a.source_type, a.source_name, a.message, a.severity, a.created_at,
          a.resolved_at, EXTRACT(EPOCH FROM (COALESCE(a.resolved_at, NOW()) - a.created_at))/3600 as duration_hours
        FROM alerts a
        WHERE a.created_at >= $1
        ORDER BY a.severity, a.created_at DESC
      `, [weekStart]),
      pool.query(`
        SELECT vi.*, c.camera_code, c.name as camera_name, s.name as station_name
        FROM video_interruptions vi
        JOIN cameras c ON vi.camera_id = c.id
        LEFT JOIN stations s ON c.station_id = s.id
        WHERE vi.start_time >= $1
        ORDER BY vi.start_time DESC
      `, [weekStart]),
      pool.query(`
        SELECT 'devices' as system, COUNT(*) as total,
          COUNT(CASE WHEN status = 'online' THEN 1 END) as online,
          COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline
        FROM devices
        UNION ALL
        SELECT 'cameras', COUNT(*), COUNT(CASE WHEN status='online' THEN 1 END), COUNT(CASE WHEN status='offline' THEN 1 END) FROM cameras
        UNION ALL
        SELECT 'servers', COUNT(*), COUNT(CASE WHEN status='online' THEN 1 END), COUNT(CASE WHEN status='offline' THEN 1 END) FROM servers
        UNION ALL
        SELECT 'toll_lanes', COUNT(*), COUNT(CASE WHEN status='open' THEN 1 END), COUNT(CASE WHEN status IN ('closed','maintenance') THEN 1 END) FROM toll_lanes
      `),
      pool.query(`
        SELECT log_level, COUNT(*) as count, source_type
        FROM system_logs WHERE created_at >= $1 AND log_level IN ('error', 'critical', 'warning')
        GROUP BY log_level, source_type ORDER BY log_level, count DESC
      `, [weekStart]),
    ]);

    res.json({
      period: 'weekly',
      from: weekStart,
      to: new Date().toISOString().split('T')[0],
      faults: faults.rows,
      videoInterruptions: videoInterruptions.rows,
      systemStatus: systemStatus.rows,
      securityLogs: security.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/monthly', authenticate, async (req, res) => {
  try {
    const monthStart = req.query.date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const [tollSummary, weighSummary, faults] = await Promise.all([
      pool.query(`
        SELECT s.name as station_name, SUM(tl.daily_transactions) as transactions,
          SUM(tl.daily_revenue) as revenue
        FROM toll_lanes tl JOIN stations s ON tl.station_id = s.id
        GROUP BY s.id, s.name ORDER BY s.km_marker
      `),
      pool.query(`
        SELECT s.name as station_name, COUNT(*) as total_weighed,
          COUNT(CASE WHEN ws.is_overloaded THEN 1 END) as overloaded,
          SUM(ws.fine_amount) as total_fines
        FROM weigh_sessions ws
        JOIN weigh_lanes wl ON ws.lane_id = wl.id
        JOIN stations s ON wl.station_id = s.id
        WHERE ws.weigh_time >= $1
        GROUP BY s.id, s.name
      `, [monthStart]),
      pool.query(`
        SELECT severity, COUNT(*) as count, source_type,
          COUNT(CASE WHEN is_resolved THEN 1 END) as resolved
        FROM alerts WHERE created_at >= $1
        GROUP BY severity, source_type ORDER BY severity
      `, [monthStart]),
    ]);

    res.json({
      period: 'monthly',
      from: monthStart,
      toll: tollSummary.rows,
      weighing: weighSummary.rows,
      faults: faults.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/annual', authenticate, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const [monthlyTrend, deviceHealth, overallStats] = await Promise.all([
      pool.query(`
        SELECT TO_CHAR(transaction_time, 'YYYY-MM') as month,
          COUNT(*) as transactions, SUM(amount) as revenue
        FROM toll_transactions WHERE transaction_time >= $1
        GROUP BY month ORDER BY month
      `, [yearStart]),
      pool.query(`
        SELECT source_type,
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN severity='critical' THEN 1 END) as critical,
          COUNT(CASE WHEN severity='warning' THEN 1 END) as warnings,
          COUNT(CASE WHEN is_resolved THEN 1 END) as resolved
        FROM alerts WHERE created_at >= $1
        GROUP BY source_type
      `, [yearStart]),
      pool.query(`
        SELECT COUNT(*) as total_weighed,
          COUNT(CASE WHEN is_overloaded THEN 1 END) as overloaded,
          SUM(fine_amount) as total_fines
        FROM weigh_sessions WHERE weigh_time >= $1
      `, [yearStart]),
    ]);

    res.json({
      period: 'annual',
      year,
      monthlyTrend: monthlyTrend.rows,
      deviceHealth: deviceHealth.rows,
      overallStats: overallStats.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
