const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stations', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ps.*, s.name as station_name,
        ROUND((ps.current_load_w::numeric / NULLIF(ps.total_capacity_w, 0) * 100), 1) as load_percent
      FROM power_stations ps
      LEFT JOIN stations s ON ps.station_id = s.id
      ORDER BY ps.current_load_w DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/ups', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.*, ps.name as power_station_name, st.name as station_name
      FROM ups_units u
      JOIN power_stations ps ON u.power_station_id = ps.id
      LEFT JOIN stations st ON ps.station_id = st.id
      ORDER BY u.battery_percent ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const [total, ups, critical] = await Promise.all([
      pool.query(`
        SELECT SUM(total_capacity_w) as total_capacity, SUM(current_load_w) as total_load,
          COUNT(*) as station_count, COUNT(CASE WHEN has_generator THEN 1 END) as with_generator
        FROM power_stations
      `),
      pool.query(`
        SELECT COUNT(*) as total,
          COUNT(CASE WHEN battery_percent < 20 THEN 1 END) as low_battery,
          COUNT(CASE WHEN status != 'normal' THEN 1 END) as faults
        FROM ups_units
      `),
      pool.query(`SELECT * FROM power_stations WHERE status != 'normal' ORDER BY current_load_w DESC`),
    ]);
    res.json({
      total: total.rows[0],
      ups: ups.rows[0],
      criticalStations: critical.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
