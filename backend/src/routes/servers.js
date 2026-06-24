const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT sv.*, st.name as station_name
      FROM servers sv
      LEFT JOIN stations st ON sv.station_id = st.id
      ORDER BY sv.status, sv.role, sv.hostname
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/storage', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *, ROUND((used_tb / total_tb * 100)::numeric, 1) as usage_percent
      FROM storage_systems ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [status, types, highCpu, highDisk] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM servers GROUP BY status`),
      pool.query(`SELECT server_type, COUNT(*) as count FROM servers GROUP BY server_type`),
      pool.query(`SELECT hostname, role, cpu_usage, memory_usage FROM servers WHERE cpu_usage > 80 ORDER BY cpu_usage DESC LIMIT 5`),
      pool.query(`SELECT hostname, role, disk_usage, disk_total_gb FROM servers WHERE disk_usage > 80 ORDER BY disk_usage DESC LIMIT 5`),
    ]);
    res.json({
      byStatus: status.rows,
      byType: types.rows,
      highCpuAlerts: highCpu.rows,
      highDiskAlerts: highDisk.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sv.*, st.name as station_name FROM servers sv LEFT JOIN stations st ON sv.station_id = st.id WHERE sv.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy máy chủ' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.post('/:id/clear-junk', authenticate, authorize('admin', 'cmo_operator'), async (req, res) => {
  try {
    const freed = Math.random() * 10 + 2;
    await pool.query(
      `UPDATE servers SET disk_usage = GREATEST(disk_usage - $1, 0) WHERE id = $2`,
      [freed.toFixed(2), req.params.id]
    );

    await pool.query(`
      INSERT INTO system_logs (log_level, source_type, source_id, source_name, message, user_id)
      SELECT 'info', 'server', id, hostname, 'Đã dọn rác - giải phóng ' || $1 || '% dung lượng', $2
      FROM servers WHERE id = $3
    `, [freed.toFixed(1), req.user.id, req.params.id]);

    res.json({ message: `Đã giải phóng ${freed.toFixed(1)}% dung lượng ổ đĩa`, freed_percent: freed.toFixed(1) });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
