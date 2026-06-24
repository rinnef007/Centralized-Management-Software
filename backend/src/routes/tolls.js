const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stations', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*,
        COUNT(tl.id) as total_lanes,
        COUNT(CASE WHEN tl.status = 'open' THEN 1 END) as open_lanes,
        COALESCE(SUM(tl.daily_transactions), 0) as daily_transactions,
        COALESCE(SUM(tl.daily_revenue), 0) as daily_revenue
      FROM stations s
      LEFT JOIN toll_lanes tl ON s.id = tl.station_id
      WHERE s.type = 'toll'
      GROUP BY s.id
      ORDER BY s.km_marker
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/lanes', authenticate, async (req, res) => {
  try {
    const { station_id } = req.query;
    let q = `
      SELECT tl.*, s.name as station_name
      FROM toll_lanes tl
      LEFT JOIN stations s ON tl.station_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (station_id) { params.push(parseInt(station_id)); q += ` AND tl.station_id = $${params.length}`; }
    q += ' ORDER BY tl.station_id, tl.lane_number';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { lane_id, limit = 50, offset = 0 } = req.query;
    let q = `
      SELECT tt.*, tl.lane_code, s.name as station_name
      FROM toll_transactions tt
      LEFT JOIN toll_lanes tl ON tt.lane_id = tl.id
      LEFT JOIN stations s ON tl.station_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (lane_id) { params.push(parseInt(lane_id)); q += ` AND tt.lane_id = $${params.length}`; }
    params.push(parseInt(limit)); q += ` ORDER BY tt.transaction_time DESC LIMIT $${params.length}`;
    params.push(parseInt(offset)); q += ` OFFSET $${params.length}`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [byStation, byType, errors] = await Promise.all([
      pool.query(`
        SELECT s.name, SUM(tl.daily_transactions) as transactions, SUM(tl.daily_revenue) as revenue
        FROM toll_lanes tl JOIN stations s ON tl.station_id = s.id
        GROUP BY s.id, s.name ORDER BY s.km_marker
      `),
      pool.query(`
        SELECT lane_type, COUNT(*) as count, SUM(daily_transactions) as transactions
        FROM toll_lanes GROUP BY lane_type
      `),
      pool.query(`
        SELECT tl.lane_code, s.name as station_name, COUNT(*) as error_count
        FROM toll_transactions tt
        JOIN toll_lanes tl ON tt.lane_id = tl.id
        JOIN stations s ON tl.station_id = s.id
        WHERE tt.status IN ('error', 'failed') AND tt.transaction_time >= CURRENT_DATE
        GROUP BY tl.lane_code, s.name ORDER BY error_count DESC LIMIT 10
      `),
    ]);
    res.json({ byStation: byStation.rows, byType: byType.rows, topErrors: errors.rows });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
