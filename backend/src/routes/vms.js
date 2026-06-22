const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const VMS_SCENARIOS = [
  { code: 'normal', label: 'Bình thường', hex: '0x01' },
  { code: 'speed_80', label: 'Giới hạn tốc độ 80km/h', hex: '0x10' },
  { code: 'speed_60', label: 'Giới hạn tốc độ 60km/h', hex: '0x11' },
  { code: 'accident', label: 'Tai nạn phía trước', hex: '0x20' },
  { code: 'fog', label: 'Sương mù - Giảm tốc độ', hex: '0x21' },
  { code: 'rain', label: 'Mưa lớn - Lái xe cẩn thận', hex: '0x22' },
  { code: 'toll_500m', label: 'Trạm thu phí 500m', hex: '0x30' },
  { code: 'no_stop', label: 'Cấm dừng đỗ xe', hex: '0x40' },
  { code: 'emergency_run20h', label: 'RUN 20H (Khẩn cấp)', hex: '0xE1' },
  { code: 'emergency_run22h', label: 'RUN 22H (Khẩn cấp)', hex: '0xE2' },
  { code: 'emergency_run23h', label: 'RUN 23H (Khẩn cấp)', hex: '0xE3' },
];

router.get('/signs', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM vms_signs ORDER BY km_marker`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.get('/scenarios', authenticate, (req, res) => {
  res.json(VMS_SCENARIOS);
});

router.get('/messages', authenticate, async (req, res) => {
  try {
    const { sign_id, limit = 50 } = req.query;
    let q = `
      SELECT vm.*, vs.sign_code, vs.name as sign_name, u.full_name as sent_by_name
      FROM vms_messages vm
      JOIN vms_signs vs ON vm.sign_id = vs.id
      LEFT JOIN users u ON vm.sent_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (sign_id) { params.push(parseInt(sign_id)); q += ` AND vm.sign_id = $${params.length}`; }
    params.push(parseInt(limit));
    q += ` ORDER BY vm.sent_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.post('/signs/:id/send', authenticate, authorize('admin', 'cmo_operator'), async (req, res) => {
  const { message_text, scenario } = req.body;
  if (!message_text) return res.status(400).json({ error: 'Nội dung hiển thị không được để trống' });

  try {
    const scenarioData = VMS_SCENARIOS.find(s => s.code === scenario);
    const hexCommand = scenarioData ? scenarioData.hex : '0x00';

    await pool.query(
      `UPDATE vms_signs SET current_message = $1, current_scenario = $2, last_updated = NOW() WHERE id = $3`,
      [message_text, scenario, req.params.id]
    );

    await pool.query(`
      INSERT INTO vms_messages (sign_id, message_text, scenario, hex_command, sent_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.params.id, message_text, scenario, hexCommand, req.user.id]);

    res.json({ message: 'Đã gửi nội dung đến biển VMS', hex_command: hexCommand });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

router.post('/signs/:id/emergency', authenticate, authorize('admin', 'cmo_operator'), async (req, res) => {
  const { command } = req.body;
  const emergencyCommands = {
    'run20h': { hex: '0xE1', port: 1000, label: 'RUN(20H)' },
    'run22h': { hex: '0xE2', port: 1000, label: 'RUN(22H)' },
    'run23h': { hex: '0xE3', port: 1000, label: 'RUN(23H)' },
  };

  if (!emergencyCommands[command]) {
    return res.status(400).json({ error: 'Lệnh khẩn cấp không hợp lệ' });
  }

  const cmd = emergencyCommands[command];
  try {
    const { rows } = await pool.query('SELECT * FROM vms_signs WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy biển VMS' });

    await pool.query(
      `UPDATE vms_signs SET current_scenario = $1, last_updated = NOW() WHERE id = $2`,
      [command, req.params.id]
    );

    await pool.query(`
      INSERT INTO vms_messages (sign_id, message_text, scenario, hex_command, sent_by, status)
      VALUES ($1, $2, $3, $4, $5, 'emergency_sent')
    `, [req.params.id, cmd.label, command, cmd.hex, req.user.id]);

    await pool.query(`
      INSERT INTO system_logs (log_level, source_type, source_id, source_name, message, user_id)
      SELECT 'warning', 'vms', id, sign_code, 'Lệnh khẩn cấp ' || $1 || ' được gửi đến biển VMS (HEX: ' || $2 || ', Port: ' || $3 || ')', $4
      FROM vms_signs WHERE id = $5
    `, [cmd.label, cmd.hex, cmd.port, req.user.id, req.params.id]);

    res.json({
      message: `Đã gửi lệnh khẩn cấp ${cmd.label}`,
      hex_command: cmd.hex,
      port: cmd.port,
      sign_ip: rows[0].ip_address,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

module.exports = router;
