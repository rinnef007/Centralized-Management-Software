require('dotenv').config();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const cmoHash = await bcrypt.hash('Cmo@123', 10);
    const stationHash = await bcrypt.hash('Station@123', 10);
    const nightHash = await bcrypt.hash('Night@123', 10);

    await client.query(`
      INSERT INTO users (username, password_hash, full_name, role, email) VALUES
      ('admin', $1, 'Quản trị viên hệ thống', 'admin', 'admin@highway.vn'),
      ('cmo01', $2, 'Nhân viên CMO - Ca sáng', 'cmo_operator', 'cmo01@highway.vn'),
      ('station01', $3, 'Nhân viên Trạm đầu tuyến', 'station_operator', 'station01@highway.vn'),
      ('night01', $4, 'Nhân viên trực kíp đêm', 'night_shift', 'night01@highway.vn')
      ON CONFLICT (username) DO NOTHING
    `, [adminHash, cmoHash, stationHash, nightHash]);

    // Stations
    await client.query(`
      INSERT INTO stations (code, name, km_marker, lat, lng, lane_count, type) VALUES
      ('CMO', 'Trung tâm điều hành CMO', 0, 20.8449, 106.6881, 0, 'control_center'),
      ('S01', 'Trạm thu phí đầu tuyến', 0.5, 20.8501, 106.6945, 12, 'toll'),
      ('S02', 'Trạm thu phí QL39', 15.2, 20.7823, 106.5412, 10, 'toll'),
      ('S03', 'Trạm thu phí QL38B', 28.7, 20.6934, 106.4123, 10, 'toll'),
      ('S04', 'Trạm thu phí QL10', 42.1, 20.5876, 106.2987, 10, 'toll'),
      ('S05', 'Trạm thu phí cuối tuyến', 58.3, 20.4521, 106.1234, 12, 'toll'),
      ('S06', 'Trạm thu phí TL353', 35.6, 20.6123, 106.3456, 8, 'toll'),
      ('W01', 'Trạm cân tải trọng KM15', 15.0, 20.7800, 106.5380, 3, 'weighing'),
      ('W02', 'Trạm cân tải trọng KM42', 42.0, 20.5850, 106.2960, 4, 'weighing'),
      ('W03', 'Trạm cân tải trọng KM58', 58.0, 20.4500, 106.1200, 6, 'weighing')
      ON CONFLICT (code) DO NOTHING
    `);

    // Network Switches
    await client.query(`
      INSERT INTO network_switches (name, model, ip_address, layer, station_id, port_count, status) VALUES
      ('Core-SW-01', 'Cisco Catalyst 9500', '10.0.0.1', 'L3', 1, 48, 'online'),
      ('Core-SW-02', 'Cisco Catalyst 9500', '10.0.0.2', 'L3', 1, 48, 'online'),
      ('Access-SW-S01-01', 'Cisco Catalyst 2960', '10.1.1.1', 'L2', 2, 24, 'online'),
      ('Access-SW-S01-02', 'Cisco Catalyst 2960', '10.1.1.2', 'L2', 2, 24, 'online'),
      ('Access-SW-S02-01', 'Cisco Catalyst 2960', '10.1.2.1', 'L2', 3, 24, 'online'),
      ('Access-SW-S03-01', 'Cisco Catalyst 2960', '10.1.3.1', 'L2', 4, 24, 'warning'),
      ('Access-SW-S04-01', 'Cisco Catalyst 2960', '10.1.4.1', 'L2', 5, 24, 'online'),
      ('Access-SW-S05-01', 'Cisco Catalyst 2960', '10.1.5.1', 'L2', 6, 24, 'online'),
      ('Access-SW-S06-01', 'Cisco Catalyst 2960', '10.1.6.1', 'L2', 7, 24, 'online')
      ON CONFLICT (ip_address) DO NOTHING
    `);

    // CCTV Cameras (58 cameras)
    const cctvInserts = [];
    const cctvStations = [2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 7];
    const cctvLats = [20.8501, 20.8502, 20.8503, 20.8504, 20.7823, 20.7824, 20.7825, 20.6934, 20.6935, 20.6936, 20.5876, 20.5877, 20.5878, 20.4521, 20.4522, 20.6123, 20.6124, 20.6125];
    const cctvLngs = [106.6945, 106.6946, 106.6947, 106.6948, 106.5412, 106.5413, 106.5414, 106.4123, 106.4124, 106.4125, 106.2987, 106.2988, 106.2989, 106.1234, 106.1235, 106.3456, 106.3457, 106.3458];

    for (let i = 1; i <= 58; i++) {
      const stIdx = Math.min(Math.floor((i - 1) / 4), cctvStations.length - 1);
      const lat = cctvLats[stIdx] + (Math.random() - 0.5) * 0.002;
      const lng = cctvLngs[stIdx] + (Math.random() - 0.5) * 0.002;
      const status = i % 15 === 0 ? 'offline' : (i % 8 === 0 ? 'warning' : 'online');
      cctvInserts.push(`('CCTV-${String(i).padStart(3,'0')}', 'Camera CCTV ${i}', 'cctv', '192.168.110.${i}', 110, ${cctvStations[stIdx] || 2}, ${lat.toFixed(7)}, ${lng.toFixed(7)}, '${status}')`);
    }

    await client.query(`
      INSERT INTO cameras (camera_code, name, camera_type, ip_address, vlan_id, station_id, lat, lng, status)
      VALUES ${cctvInserts.join(',\n')}
      ON CONFLICT (camera_code) DO NOTHING
    `);

    // VDS Cameras (12 cameras)
    for (let i = 1; i <= 12; i++) {
      const km = (i * 5).toFixed(1);
      const lat = (20.8449 - i * 0.035).toFixed(7);
      const lng = (106.6881 - i * 0.05).toFixed(7);
      const status = i === 7 ? 'offline' : 'online';
      await client.query(`
        INSERT INTO cameras (camera_code, name, camera_type, ip_address, vlan_id, station_id, lat, lng, status)
        VALUES ('VDS-${String(i).padStart(3,'0')}', 'Camera VDS KM${km}', 'vds', '192.168.111.${i}', 111, ${Math.min(i % 7 + 2, 7)}, ${lat}, ${lng}, '${status}')
        ON CONFLICT (camera_code) DO NOTHING
      `);
    }

    // Bridge Cameras (11 cameras)
    for (let i = 1; i <= 11; i++) {
      const lat = (20.8449 - i * 0.04).toFixed(7);
      const lng = (106.6881 - i * 0.06).toFixed(7);
      await client.query(`
        INSERT INTO cameras (camera_code, name, camera_type, ip_address, vlan_id, station_id, lat, lng, status)
        VALUES ('BRIDGE-${String(i).padStart(3,'0')}', 'Camera cầu vượt ${i}', 'bridge', '192.168.116.${i}', 116, ${Math.min(i % 6 + 2, 7)}, ${lat}, ${lng}, 'online')
        ON CONFLICT (camera_code) DO NOTHING
      `);
    }

    // VMS Signs (8 signs)
    const vmsData = [
      { code: 'VMS-001', name: 'Biển VMS KM2+500', km: 2.5, lat: 20.8420, lng: 106.6750, msg: 'TỐC ĐỘ TỐI ĐA 80KM/H' },
      { code: 'VMS-002', name: 'Biển VMS KM8+200', km: 8.2, lat: 20.8120, lng: 106.6320, msg: 'CHÀO MỪNG QUÝ KHÁCH' },
      { code: 'VMS-003', name: 'Biển VMS KM15+000', km: 15.0, lat: 20.7800, lng: 106.5400, msg: 'TRẠM THU PHÍ QL39 500M' },
      { code: 'VMS-004', name: 'Biển VMS KM22+500', km: 22.5, lat: 20.7300, lng: 106.4800, msg: 'THỜI TIẾT TỐT - LÁI XE AN TOÀN' },
      { code: 'VMS-005', name: 'Biển VMS KM29+000', km: 29.0, lat: 20.6900, lng: 106.4100, msg: 'TRẠM THU PHÍ QL38B 1KM' },
      { code: 'VMS-006', name: 'Biển VMS KM36+500', km: 36.5, lat: 20.6200, lng: 106.3500, msg: 'CẤM DỪNG ĐỖ XE TRÊN ĐƯỜNG CAO TỐC' },
      { code: 'VMS-007', name: 'Biển VMS KM43+000', km: 43.0, lat: 20.5800, lng: 106.2900, msg: 'TRẠM THU PHÍ QL10 500M' },
      { code: 'VMS-008', name: 'Biển VMS KM55+000', km: 55.0, lat: 20.4800, lng: 106.1500, msg: 'GẦN ĐẾN TRẠM CUỐI TUYẾN' },
    ];

    for (const v of vmsData) {
      await client.query(`
        INSERT INTO vms_signs (sign_code, name, ip_address, ipc_port, km_marker, lat, lng, direction, current_message, status)
        VALUES ($1, $2, $3, 1000, $4, $5, $6, 'outbound', $7, 'online')
        ON CONFLICT (sign_code) DO NOTHING
      `, [v.code, v.name, `192.168.113.${vmsData.indexOf(v) + 1}`, v.km, v.lat, v.lng, v.msg]);
    }

    // Servers (53+ servers)
    const serverRoles = [
      { hostname: 'TMS1', role: 'TMS Primary', type: 'physical', ip: '10.10.1.1', ram: 64, disk: 2048 },
      { hostname: 'TMS2', role: 'TMS Secondary', type: 'physical', ip: '10.10.1.2', ram: 64, disk: 2048 },
      { hostname: 'DB1', role: 'Database Primary', type: 'physical', ip: '10.10.1.3', ram: 128, disk: 4096 },
      { hostname: 'DB2', role: 'Database Secondary', type: 'physical', ip: '10.10.1.4', ram: 128, disk: 4096 },
      { hostname: 'BACKUP-SVR', role: 'Backup Server', type: 'physical', ip: '10.10.1.5', ram: 64, disk: 8192 },
      { hostname: 'OMS-SVR1', role: 'OMS Server', type: 'physical', ip: '10.10.2.1', ram: 32, disk: 1024 },
      { hostname: 'OMS-SVR2', role: 'OMS Backup', type: 'virtual', ip: '10.10.2.2', ram: 16, disk: 512 },
      { hostname: 'ETC-SVR1', role: 'ETC Primary', type: 'physical', ip: '10.10.2.3', ram: 64, disk: 2048 },
      { hostname: 'ETC-SVR2', role: 'ETC Secondary', type: 'physical', ip: '10.10.2.4', ram: 64, disk: 2048 },
      { hostname: 'VDS-SVR1', role: 'VDS Analytics', type: 'physical', ip: '10.10.2.5', ram: 128, disk: 4096 },
      { hostname: 'VMS-SVR1', role: 'VMS Controller', type: 'physical', ip: '10.10.3.1', ram: 32, disk: 512 },
      { hostname: 'VMS-BACKUP', role: 'VMS Backup', type: 'virtual', ip: '10.10.3.2', ram: 16, disk: 512 },
      { hostname: 'NVR-SVR1', role: 'Video Recording 1', type: 'physical', ip: '10.10.3.3', ram: 32, disk: 16384 },
      { hostname: 'NVR-SVR2', role: 'Video Recording 2', type: 'physical', ip: '10.10.3.4', ram: 32, disk: 16384 },
      { hostname: 'NVR-SVR3', role: 'Video Recording 3', type: 'physical', ip: '10.10.3.5', ram: 32, disk: 16384 },
      { hostname: 'VMS-MGT', role: 'Video Management', type: 'physical', ip: '10.10.3.6', ram: 64, disk: 4096 },
      { hostname: 'WALL-CTL1', role: 'Video Wall 1', type: 'physical', ip: '10.10.4.1', ram: 16, disk: 512 },
      { hostname: 'WALL-CTL2', role: 'Video Wall 2', type: 'physical', ip: '10.10.4.2', ram: 16, disk: 512 },
      { hostname: 'WALL-CTL3', role: 'Video Wall 3', type: 'physical', ip: '10.10.4.3', ram: 16, disk: 512 },
      { hostname: 'SNMS-SVR', role: 'SNMS Server', type: 'physical', ip: '10.10.4.4', ram: 32, disk: 1024 },
    ];

    // Add virtual servers for each station
    for (let i = 1; i <= 6; i++) {
      serverRoles.push({ hostname: `STATION${i}-SVR`, role: `Station ${i} Server`, type: 'virtual', ip: `10.10.${i + 10}.1`, ram: 16, disk: 512 });
      serverRoles.push({ hostname: `STATION${i}-BACKUP`, role: `Station ${i} Backup`, type: 'virtual', ip: `10.10.${i + 10}.2`, ram: 8, disk: 256 });
    }

    // Add more virtual servers to reach 53+
    const extraRoles = ['LDAP-SVR', 'NTP-SVR', 'DNS-SVR', 'SIEM-SVR', 'LOG-SVR', 'MON-SVR', 'API-GW', 'MSG-BROKER', 'CACHE-SVR', 'REPORT-SVR', 'BATCH-SVR', 'FTP-SVR', 'MAIL-SVR', 'ANTIVIRUS-SVR'];
    for (const r of extraRoles) {
      serverRoles.push({ hostname: r, role: r.replace('-SVR', '').replace('-', ' ') + ' Server', type: 'virtual', ip: `10.20.1.${serverRoles.length + 1}`, ram: 8, disk: 256 });
    }

    for (const s of serverRoles) {
      const cpuUsage = Math.random() * 60 + 5;
      const memUsage = Math.random() * 50 + 20;
      const diskUsage = Math.random() * 60 + 10;
      const status = cpuUsage > 85 ? 'warning' : (Math.random() < 0.05 ? 'offline' : 'online');
      await client.query(`
        INSERT INTO servers (hostname, display_name, server_type, ip_address, role, station_id, ram_gb, disk_total_gb, cpu_usage, memory_usage, disk_usage, status, uptime_seconds)
        VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (hostname) DO NOTHING
      `, [s.hostname, s.hostname, s.type, s.ip, s.role, s.ram, s.disk, cpuUsage.toFixed(2), memUsage.toFixed(2), diskUsage.toFixed(2), status, Math.floor(Math.random() * 2592000)]);
    }

    // Storage Systems
    await client.query(`
      INSERT INTO storage_systems (name, ip_address, total_tb, used_tb, status, location) VALUES
      ('Stogera1', '10.10.5.1', 9, 6.5, 'online', 'Server Room - Rack A'),
      ('Stogera2', '10.10.5.2', 112, 78.4, 'online', 'Server Room - Rack B')
      ON CONFLICT DO NOTHING
    `);

    // Toll Lanes (62 lanes)
    const stationLanes = [
      { stationId: 2, count: 12 }, { stationId: 3, count: 10 }, { stationId: 4, count: 10 },
      { stationId: 5, count: 10 }, { stationId: 6, count: 12 }, { stationId: 7, count: 8 }
    ];
    let laneNum = 1;
    for (const st of stationLanes) {
      for (let i = 1; i <= st.count; i++) {
        const laneType = i % 3 === 0 ? 'etc' : (i % 4 === 0 ? 'mixed' : 'manual');
        const status = Math.random() < 0.08 ? 'maintenance' : (Math.random() < 0.05 ? 'closed' : 'open');
        await client.query(`
          INSERT INTO toll_lanes (lane_code, lane_number, station_id, direction, lane_type, status, daily_transactions, daily_revenue)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (lane_code) DO NOTHING
        `, [`L${String(laneNum).padStart(3,'0')}`, i, st.stationId, i % 2 === 0 ? 'outbound' : 'inbound', laneType, status, Math.floor(Math.random() * 800 + 200), Math.floor(Math.random() * 5000000 + 1000000)]);
        laneNum++;
      }
    }

    // Weigh Lanes (13 lanes)
    const weighStations = [{ id: 8, count: 3 }, { id: 9, count: 4 }, { id: 10, count: 6 }];
    let wlaneNum = 1;
    for (const ws of weighStations) {
      for (let i = 1; i <= ws.count; i++) {
        await client.query(`
          INSERT INTO weigh_lanes (lane_code, station_id, sensor_type, status, last_calibration, daily_count)
          VALUES ($1, $2, 'quartz', 'online', '2024-01-15', $3)
          ON CONFLICT (lane_code) DO NOTHING
        `, [`WL${String(wlaneNum).padStart(3,'0')}`, ws.id, Math.floor(Math.random() * 200 + 50)]);
        wlaneNum++;
      }
    }

    // Power Stations
    const powerData = [
      { name: 'Trung tâm điều hành', stationId: 1, capacity: 60072, load: 45000, transformers: 3, ups: 5, hasGen: true },
      { name: 'Trạm cuối tuyến', stationId: 6, capacity: 86296, load: 72000, transformers: 4, ups: 6, hasGen: true },
      { name: 'Trạm đầu tuyến', stationId: 2, capacity: 45000, load: 32000, transformers: 2, ups: 4, hasGen: true },
      { name: 'Trạm QL39', stationId: 3, capacity: 38000, load: 28000, transformers: 2, ups: 3, hasGen: true },
      { name: 'Trạm QL38B', stationId: 4, capacity: 38000, load: 25000, transformers: 2, ups: 3, hasGen: false },
      { name: 'Trạm QL10', stationId: 5, capacity: 38000, load: 30000, transformers: 2, ups: 3, hasGen: true },
      { name: 'Trạm TL353', stationId: 7, capacity: 32000, load: 24000, transformers: 2, ups: 2, hasGen: false },
    ];

    for (const p of powerData) {
      const { rows } = await client.query(`
        INSERT INTO power_stations (name, station_id, transformer_count, total_capacity_w, current_load_w, status, has_generator, generator_status, ups_count)
        VALUES ($1, $2, $3, $4, $5, 'normal', $6, $7, $8)
        ON CONFLICT DO NOTHING RETURNING id
      `, [p.name, p.stationId, p.transformers, p.capacity, p.load, p.hasGen, p.hasGen ? 'standby' : null, p.ups]);

      if (rows.length > 0) {
        for (let u = 0; u < p.ups; u++) {
          const capacity = u === 0 ? 40 : (u < 3 ? 20 : 10);
          await client.query(`
            INSERT INTO ups_units (name, power_station_id, capacity_kva, load_percent, battery_percent, status)
            VALUES ($1, $2, $3, $4, $5, 'normal')
          `, [`UPS-${p.stationId}-${u + 1}`, rows[0].id, capacity, Math.random() * 60 + 20, Math.random() * 30 + 70]);
        }
      }
    }

    // MPLS Channels
    await client.query(`
      INSERT INTO mpls_channels (name, provider, channel_type, bandwidth_mbps, status, latency_ms, packet_loss) VALUES
      ('MPLS-A', 'VNPT', 'primary', 100, 'active', 2.5, 0.0),
      ('MPLS-B', 'Viettel', 'backup', 100, 'standby', 3.1, 0.0)
      ON CONFLICT DO NOTHING
    `);

    // Sample alerts
    await client.query(`
      INSERT INTO alerts (alert_type, severity, source_type, source_name, message, station_id, is_resolved) VALUES
      ('camera_offline', 'warning', 'camera', 'CCTV-015', 'Camera CCTV-015 mất kết nối', 2, false),
      ('vds_event', 'critical', 'camera', 'VDS-003', 'VDS-003: Phát hiện xe đi ngược chiều tại KM15', 3, false),
      ('server_disk', 'warning', 'server', 'OMS-SVR1', 'Ổ đĩa OMS-SVR1 đạt 85% dung lượng', 1, false),
      ('network_switch', 'warning', 'network', 'Access-SW-S03-01', 'Switch Access-SW-S03-01 báo lỗi port', 4, true),
      ('vds_event', 'critical', 'camera', 'VDS-007', 'VDS-007 mất tín hiệu video', 4, false),
      ('toll_error', 'warning', 'toll', 'L012', 'Làn L012 lỗi đọc thẻ RFID liên tiếp', 3, false)
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Seed data inserted successfully!');
    console.log('');
    console.log('Test accounts:');
    console.log('  admin / Admin@123 (Full access)');
    console.log('  cmo01 / Cmo@123 (CMO Operator)');
    console.log('  station01 / Station@123 (Station Operator)');
    console.log('  night01 / Night@123 (Night Shift)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seed();
