const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { type, station_id, status } = req.query;
    let q = `SELECT c.*, s.name as station_name FROM cameras c LEFT JOIN stations s ON c.station_id = s.id WHERE 1=1`;
    const params = [];
    if (type) { params.push(type); q += ` AND c.camera_type = $${params.length}`; }
    if (station_id) { params.push(parseInt(station_id)); q += ` AND c.station_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND c.status = $${params.length}`; }
    q += ` ORDER BY c.camera_type, c.camera_code`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT camera_type, status, COUNT(*) as count
      FROM cameras GROUP BY camera_type, status ORDER BY camera_type, status
    `);
    const stats = {};
    rows.forEach(r => {
      if (!stats[r.camera_type]) stats[r.camera_type] = { online: 0, offline: 0, warning: 0, total: 0 };
      stats[r.camera_type][r.status] = parseInt(r.count);
      stats[r.camera_type].total += parseInt(r.count);
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/interruptions', authenticate, async (req, res) => {
  try {
    const { camera_id, limit = 50 } = req.query;
    let q = `
      SELECT vi.*, c.camera_code, c.name as camera_name, c.camera_type, s.name as station_name
      FROM video_interruptions vi
      JOIN cameras c ON vi.camera_id = c.id
      LEFT JOIN stations s ON c.station_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (camera_id) { params.push(parseInt(camera_id)); q += ` AND vi.camera_id = $${params.length}`; }
    params.push(parseInt(limit));
    q += ` ORDER BY vi.start_time DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.post('/interruptions', authenticate, async (req, res) => {
  const { camera_id, start_time, end_time, reason } = req.body;
  try {
    const duration = end_time
      ? Math.floor((new Date(end_time) - new Date(start_time)) / 1000)
      : null;
    const { rows } = await pool.query(`
      INSERT INTO video_interruptions (camera_id, start_time, end_time, duration_seconds, reason, resolved_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [camera_id, start_time, end_time, duration, reason, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
