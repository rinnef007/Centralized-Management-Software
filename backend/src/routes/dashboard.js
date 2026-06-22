const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', authenticate, async (req, res) => {
  try {
    const [devices, cameras, servers, storage, alerts, lanes, weighLanes, vms, mpls] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM devices GROUP BY status`),
      pool.query(`SELECT status, COUNT(*) as count FROM cameras GROUP BY status`),
      pool.query(`SELECT status, COUNT(*) as count FROM servers GROUP BY status`),
      pool.query(`SELECT * FROM storage_systems ORDER BY id`),
      pool.query(`SELECT severity, COUNT(*) as count FROM alerts WHERE is_resolved = false GROUP BY severity`),
      pool.query(`SELECT status, COUNT(*) as count FROM toll_lanes GROUP BY status`),
      pool.query(`SELECT status, COUNT(*) as count FROM weigh_lanes GROUP BY status`),
      pool.query(`SELECT status, COUNT(*) as count FROM vms_signs GROUP BY status`),
      pool.query(`SELECT * FROM mpls_channels ORDER BY channel_type`),
    ]);

    const totalTransactions = await pool.query(
      `SELECT COALESCE(SUM(daily_transactions), 0) as total FROM toll_lanes`
    );
    const totalRevenue = await pool.query(
      `SELECT COALESCE(SUM(daily_revenue), 0) as total FROM toll_lanes`
    );
    const overloadCount = await pool.query(
      `SELECT COUNT(*) as count FROM weigh_sessions WHERE is_overloaded = true AND weigh_time >= CURRENT_DATE`
    );

    const toMap = (rows) => {
      const m = { online: 0, offline: 0, warning: 0, total: 0 };
      rows.forEach(r => {
        m[r.status] = parseInt(r.count);
        m.total += parseInt(r.count);
      });
      return m;
    };

    res.json({
      devices: toMap(devices.rows),
      cameras: toMap(cameras.rows),
      servers: toMap(servers.rows),
      lanes: toMap(lanes.rows),
      weighLanes: toMap(weighLanes.rows),
      vms: toMap(vms.rows),
      storage: storage.rows,
      alerts: alerts.rows.reduce((a, r) => { a[r.severity] = parseInt(r.count); return a; }, { critical: 0, warning: 0, info: 0 }),
      kpis: {
        totalTransactions: parseInt(totalTransactions.rows[0].total),
        totalRevenue: parseInt(totalRevenue.rows[0].total),
        overloadCount: parseInt(overloadCount.rows[0].count),
      },
      mpls: mpls.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/gis', authenticate, async (req, res) => {
  try {
    const [cameras, vms, stations] = await Promise.all([
      pool.query(`SELECT id, camera_code, name, camera_type, lat, lng, status, vlan_id FROM cameras WHERE lat IS NOT NULL`),
      pool.query(`SELECT id, sign_code, name, lat, lng, status, current_message FROM vms_signs WHERE lat IS NOT NULL`),
      pool.query(`SELECT id, code, name, lat, lng, type, lane_count FROM stations WHERE lat IS NOT NULL`),
    ]);

    res.json({
      cameras: cameras.rows,
      vms: vms.rows,
      stations: stations.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/alerts', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { rows } = await pool.query(`
      SELECT a.*, s.name as station_name
      FROM alerts a
      LEFT JOIN stations s ON a.station_id = s.id
      WHERE a.is_resolved = false
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.patch('/alerts/:id/acknowledge', authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE alerts SET is_acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW() WHERE id = $2`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Đã xác nhận cảnh báo' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.patch('/alerts/:id/resolve', authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE alerts SET is_resolved = true, resolved_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Đã giải quyết cảnh báo' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
