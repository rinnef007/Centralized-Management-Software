const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/lanes', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT wl.*, s.name as station_name
      FROM weigh_lanes wl
      LEFT JOIN stations s ON wl.station_id = s.id
      ORDER BY wl.station_id, wl.lane_code
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { lane_id, overloaded_only, limit = 50, offset = 0 } = req.query;
    let q = `
      SELECT ws.*, wl.lane_code, s.name as station_name
      FROM weigh_sessions ws
      LEFT JOIN weigh_lanes wl ON ws.lane_id = wl.id
      LEFT JOIN stations s ON wl.station_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (lane_id) { params.push(parseInt(lane_id)); q += ` AND ws.lane_id = $${params.length}`; }
    if (overloaded_only === 'true') { q += ` AND ws.is_overloaded = true`; }
    params.push(parseInt(limit)); q += ` ORDER BY ws.weigh_time DESC LIMIT $${params.length}`;
    params.push(parseInt(offset)); q += ` OFFSET $${params.length}`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [daily, overloadByStation, topOffenders] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as total, COUNT(CASE WHEN is_overloaded THEN 1 END) as overloaded,
          ROUND(AVG(gross_weight)::numeric, 0) as avg_weight
        FROM weigh_sessions WHERE weigh_time >= CURRENT_DATE
      `),
      pool.query(`
        SELECT s.name, COUNT(*) as total, COUNT(CASE WHEN ws.is_overloaded THEN 1 END) as overloaded
        FROM weigh_sessions ws
        JOIN weigh_lanes wl ON ws.lane_id = wl.id
        JOIN stations s ON wl.station_id = s.id
        WHERE ws.weigh_time >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY s.id, s.name
      `),
      pool.query(`
        SELECT plate_number, COUNT(*) as violations, MAX(overload_percent) as max_overload
        FROM weigh_sessions WHERE is_overloaded = true AND weigh_time >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY plate_number ORDER BY violations DESC LIMIT 10
      `),
    ]);
    res.json({
      daily: daily.rows[0],
      byStation: overloadByStation.rows,
      topOffenders: topOffenders.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
