const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/switches', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ns.*, s.name as station_name
      FROM network_switches ns
      LEFT JOIN stations s ON ns.station_id = s.id
      ORDER BY ns.layer DESC, ns.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/devices', authenticate, async (req, res) => {
  try {
    const { vlan, station_id, status } = req.query;
    let q = `SELECT d.*, s.name as station_name FROM devices d LEFT JOIN stations s ON d.station_id = s.id WHERE 1=1`;
    const params = [];
    if (vlan) { params.push(parseInt(vlan)); q += ` AND d.vlan_id = $${params.length}`; }
    if (station_id) { params.push(parseInt(station_id)); q += ` AND d.station_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND d.status = $${params.length}`; }
    q += ` ORDER BY d.vlan_id, d.station_id, d.name`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/vlans', authenticate, async (req, res) => {
  const vlans = [
    { id: 110, name: 'VLAN 110 - CCTV', device_type: 'cctv', color: '#3b82f6' },
    { id: 111, name: 'VLAN 111 - VDS', device_type: 'vds', color: '#8b5cf6' },
    { id: 113, name: 'VLAN 113 - VMS', device_type: 'vms', color: '#f59e0b' },
    { id: 116, name: 'VLAN 116 - Camera cầu vượt', device_type: 'bridge', color: '#10b981' },
  ];

  try {
    for (const v of vlans) {
      const { rows } = await pool.query(
        `SELECT status, COUNT(*) as count FROM cameras WHERE vlan_id = $1 GROUP BY status`,
        [v.id]
      );
      v.devices = rows.reduce((a, r) => { a[r.status] = parseInt(r.count); a.total = (a.total || 0) + parseInt(r.count); return a; }, {});
    }
    res.json(vlans);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/mpls', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM mpls_channels ORDER BY channel_type');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.patch('/switches/:id/status', authenticate, authorize('admin', 'cmo_operator'), async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE network_switches SET status = $1, last_seen = NOW() WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
