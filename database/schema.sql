-- Centralized Management Software - ITS Highway Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & RBAC
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'cmo_operator', 'station_operator', 'night_shift')),
  station_id INTEGER,
  email VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STATIONS (Trạm thu phí)
-- ============================================================
CREATE TABLE IF NOT EXISTS stations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  km_marker DECIMAL(6,2),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  lane_count INTEGER DEFAULT 0,
  type VARCHAR(30) CHECK (type IN ('toll', 'weighing', 'control_center', 'depot')),
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- DEVICES (Thiết bị đầu cuối)
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  mac_address VARCHAR(17),
  vlan_id INTEGER,
  station_id INTEGER REFERENCES stations(id),
  switch_id INTEGER,
  port_number VARCHAR(10),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'warning', 'maintenance')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  firmware_version VARCHAR(50),
  serial_number VARCHAR(100),
  installed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NETWORK SWITCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS network_switches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  layer VARCHAR(5) CHECK (layer IN ('L2', 'L3')),
  station_id INTEGER REFERENCES stations(id),
  port_count INTEGER DEFAULT 24,
  uptime_seconds BIGINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'online',
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TOLL LANES (Làn thu phí)
-- ============================================================
CREATE TABLE IF NOT EXISTS toll_lanes (
  id SERIAL PRIMARY KEY,
  lane_code VARCHAR(20) UNIQUE NOT NULL,
  lane_number INTEGER NOT NULL,
  station_id INTEGER REFERENCES stations(id),
  direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound', 'both')),
  lane_type VARCHAR(30) CHECK (lane_type IN ('manual', 'etc', 'mixed', 'emergency')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'maintenance', 'error')),
  daily_transactions INTEGER DEFAULT 0,
  daily_revenue BIGINT DEFAULT 0,
  last_transaction TIMESTAMPTZ
);

-- ============================================================
-- TOLL TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS toll_transactions (
  id BIGSERIAL PRIMARY KEY,
  lane_id INTEGER REFERENCES toll_lanes(id),
  transaction_time TIMESTAMPTZ DEFAULT NOW(),
  amount INTEGER NOT NULL,
  vehicle_class INTEGER,
  plate_number VARCHAR(20),
  payment_method VARCHAR(20) CHECK (payment_method IN ('rfid', 'cash', 'manual')),
  rfid_tag VARCHAR(50),
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'error', 'no_tag')),
  error_code VARCHAR(20),
  operator_id INTEGER REFERENCES users(id)
);

-- ============================================================
-- WEIGH STATIONS (Trạm cân)
-- ============================================================
CREATE TABLE IF NOT EXISTS weigh_lanes (
  id SERIAL PRIMARY KEY,
  lane_code VARCHAR(20) UNIQUE NOT NULL,
  station_id INTEGER REFERENCES stations(id),
  sensor_type VARCHAR(50) DEFAULT 'quartz',
  status VARCHAR(20) DEFAULT 'online',
  last_calibration DATE,
  daily_count INTEGER DEFAULT 0
);

-- ============================================================
-- WEIGH SESSIONS (Phiên cân)
-- ============================================================
CREATE TABLE IF NOT EXISTS weigh_sessions (
  id BIGSERIAL PRIMARY KEY,
  lane_id INTEGER REFERENCES weigh_lanes(id),
  weigh_time TIMESTAMPTZ DEFAULT NOW(),
  plate_number VARCHAR(20),
  vehicle_type VARCHAR(50),
  axle_count INTEGER,
  gross_weight DECIMAL(8,2),
  axle_data JSONB,
  allowed_weight DECIMAL(8,2),
  overload_kg DECIMAL(8,2) DEFAULT 0,
  overload_percent DECIMAL(5,2) DEFAULT 0,
  is_overloaded BOOLEAN DEFAULT FALSE,
  fine_amount BIGINT DEFAULT 0,
  ticket_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'completed'
);

-- ============================================================
-- CAMERAS
-- ============================================================
CREATE TABLE IF NOT EXISTS cameras (
  id SERIAL PRIMARY KEY,
  camera_code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  camera_type VARCHAR(30) CHECK (camera_type IN ('cctv', 'vds', 'bridge', 'anpr')),
  ip_address VARCHAR(45),
  rtsp_url VARCHAR(255),
  vlan_id INTEGER,
  station_id INTEGER REFERENCES stations(id),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  resolution VARCHAR(20),
  is_ptz BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'online',
  last_signal TIMESTAMPTZ DEFAULT NOW(),
  recording_server_id INTEGER
);

-- ============================================================
-- VIDEO INTERRUPTIONS (Gián đoạn video)
-- ============================================================
CREATE TABLE IF NOT EXISTS video_interruptions (
  id SERIAL PRIMARY KEY,
  camera_id INTEGER REFERENCES cameras(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  reason VARCHAR(100),
  resolved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VMS SIGNS (Biển VMS)
-- ============================================================
CREATE TABLE IF NOT EXISTS vms_signs (
  id SERIAL PRIMARY KEY,
  sign_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  ipc_port INTEGER DEFAULT 1000,
  km_marker DECIMAL(6,2),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  direction VARCHAR(20),
  display_width INTEGER,
  display_height INTEGER,
  current_message TEXT,
  current_scenario VARCHAR(50),
  status VARCHAR(20) DEFAULT 'online',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VMS MESSAGES LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS vms_messages (
  id SERIAL PRIMARY KEY,
  sign_id INTEGER REFERENCES vms_signs(id),
  message_text TEXT NOT NULL,
  scenario VARCHAR(50),
  hex_command TEXT,
  sent_by INTEGER REFERENCES users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent'
);

-- ============================================================
-- SERVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  hostname VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  server_type VARCHAR(30) CHECK (server_type IN ('physical', 'virtual', 'cluster')),
  os VARCHAR(50),
  ip_address VARCHAR(45),
  role VARCHAR(50),
  station_id INTEGER REFERENCES stations(id),
  cpu_cores INTEGER,
  ram_gb INTEGER,
  cpu_usage DECIMAL(5,2) DEFAULT 0,
  memory_usage DECIMAL(5,2) DEFAULT 0,
  disk_usage DECIMAL(5,2) DEFAULT 0,
  disk_total_gb INTEGER,
  status VARCHAR(20) DEFAULT 'online',
  uptime_seconds BIGINT DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  hypervisor VARCHAR(30)
);

-- ============================================================
-- STORAGE SYSTEMS (SAN)
-- ============================================================
CREATE TABLE IF NOT EXISTS storage_systems (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  total_tb DECIMAL(8,2),
  used_tb DECIMAL(8,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'online',
  location VARCHAR(100),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POWER INFRASTRUCTURE (Hạ tầng điện)
-- ============================================================
CREATE TABLE IF NOT EXISTS power_stations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  station_id INTEGER REFERENCES stations(id),
  transformer_count INTEGER DEFAULT 1,
  total_capacity_w INTEGER DEFAULT 0,
  current_load_w INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'normal',
  has_generator BOOLEAN DEFAULT FALSE,
  generator_status VARCHAR(20),
  ups_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ups_units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  power_station_id INTEGER REFERENCES power_stations(id),
  capacity_kva INTEGER,
  load_percent DECIMAL(5,2) DEFAULT 0,
  battery_percent DECIMAL(5,2) DEFAULT 100,
  status VARCHAR(20) DEFAULT 'normal',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERTS (Cảnh báo)
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('critical', 'warning', 'info')) DEFAULT 'warning',
  source_type VARCHAR(50),
  source_id INTEGER,
  source_name VARCHAR(100),
  message TEXT NOT NULL,
  details JSONB,
  station_id INTEGER REFERENCES stations(id),
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by INTEGER REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  log_level VARCHAR(20) CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
  source_type VARCHAR(50),
  source_id INTEGER,
  source_name VARCHAR(100),
  message TEXT NOT NULL,
  details JSONB,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MPLS NETWORK CHANNELS
-- ============================================================
CREATE TABLE IF NOT EXISTS mpls_channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  provider VARCHAR(100),
  channel_type VARCHAR(10) CHECK (channel_type IN ('primary', 'backup')),
  bandwidth_mbps INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  latency_ms DECIMAL(6,2),
  packet_loss DECIMAL(5,2) DEFAULT 0,
  last_checked TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_toll_transactions_time ON toll_transactions(transaction_time DESC);
CREATE INDEX IF NOT EXISTS idx_weigh_sessions_time ON weigh_sessions(weigh_time DESC);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_interruptions_camera ON video_interruptions(camera_id, start_time DESC);
