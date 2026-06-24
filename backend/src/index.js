require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const networkRoutes = require('./routes/network');
const serverRoutes = require('./routes/servers');
const tollRoutes = require('./routes/tolls');
const weighingRoutes = require('./routes/weighing');
const cameraRoutes = require('./routes/cameras');
const vmsRoutes = require('./routes/vms');
const powerRoutes = require('./routes/power');
const reportRoutes = require('./routes/reports');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/tolls', tollRoutes);
app.use('/api/weighing', weighingRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/vms', vmsRoutes);
app.use('/api/power', powerRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('subscribe', (room) => {
    socket.join(room);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Real-time simulation: push device status updates every 10s
const simulateDeviceUpdates = async () => {
  try {
    const devices = [
      { table: 'cameras', query: `SELECT id, camera_code as code, status FROM cameras ORDER BY RANDOM() LIMIT 3` },
      { table: 'servers', query: `SELECT id, hostname as code, status, cpu_usage, memory_usage FROM servers ORDER BY RANDOM() LIMIT 3` },
    ];

    for (const d of devices) {
      const { rows } = await pool.query(d.query);
      io.emit('device_status_update', { type: d.table, devices: rows });
    }

    // Simulate random metric changes for servers
    const { rows: serverMetrics } = await pool.query(`
      UPDATE servers SET
        cpu_usage = LEAST(GREATEST(cpu_usage + (RANDOM() * 10 - 5), 1), 99),
        memory_usage = LEAST(GREATEST(memory_usage + (RANDOM() * 6 - 3), 10), 99)
      WHERE id IN (SELECT id FROM servers ORDER BY RANDOM() LIMIT 5)
      RETURNING id, hostname, cpu_usage, memory_usage, status
    `);
    if (serverMetrics.length) {
      io.emit('server_metrics_update', serverMetrics);
    }

    // Check for high CPU and emit alert
    const { rows: highCpu } = await pool.query(
      `SELECT id, hostname, cpu_usage FROM servers WHERE cpu_usage > 90 AND status = 'online'`
    );
    if (highCpu.length > 0) {
      io.emit('new_alert', {
        type: 'server_cpu',
        severity: 'warning',
        message: `${highCpu[0].hostname}: CPU sử dụng ${parseFloat(highCpu[0].cpu_usage).toFixed(1)}%`,
        created_at: new Date().toISOString(),
      });
    }

  } catch (err) {
    // Ignore simulation errors
  }
};

// Simulate toll transactions every 5s
const simulateTollTransactions = async () => {
  try {
    const { rows: lanes } = await pool.query(
      `SELECT id FROM toll_lanes WHERE status = 'open' ORDER BY RANDOM() LIMIT 2`
    );

    for (const lane of lanes) {
      const amount = [18000, 30000, 45000, 60000, 90000][Math.floor(Math.random() * 5)];
      const methods = ['rfid', 'rfid', 'rfid', 'cash', 'manual'];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const status = Math.random() < 0.05 ? 'error' : 'success';

      await pool.query(
        `UPDATE toll_lanes SET daily_transactions = daily_transactions + 1, daily_revenue = daily_revenue + $1, last_transaction = NOW() WHERE id = $2`,
        [amount, lane.id]
      );

      io.emit('toll_transaction', {
        lane_id: lane.id,
        amount,
        method,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  } catch {
    // Ignore
  }
};

// VDS event simulation (rare, every 60s)
const simulateVDSEvents = async () => {
  if (Math.random() > 0.3) return;
  const events = [
    'Phát hiện xe đi ngược chiều',
    'Phát hiện người đi bộ trên đường',
    'Phát hiện vật rơi trên mặt đường',
    'Phát hiện khói - có thể có sự cố cháy',
    'Phát hiện xe dừng khẩn cấp',
  ];
  try {
    const { rows } = await pool.query(`SELECT id, camera_code FROM cameras WHERE camera_type = 'vds' AND status = 'online' ORDER BY RANDOM() LIMIT 1`);
    if (rows.length) {
      const event = events[Math.floor(Math.random() * events.length)];
      io.emit('new_alert', {
        type: 'vds_event',
        severity: 'critical',
        source_name: rows[0].camera_code,
        message: `${rows[0].camera_code}: ${event}`,
        created_at: new Date().toISOString(),
      });
    }
  } catch {
    // Ignore
  }
};

setInterval(simulateDeviceUpdates, 10000);
setInterval(simulateTollTransactions, 5000);
setInterval(simulateVDSEvents, 60000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CMS Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
