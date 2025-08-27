-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- Create device types lookup table
CREATE TABLE IF NOT EXISTS device_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  device_type_id INTEGER NOT NULL REFERENCES device_types(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create telemetry data table (will be converted to hypertable)
CREATE TABLE IF NOT EXISTS telemetry_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  energy_watts DOUBLE PRECISION NOT NULL,
  voltage DOUBLE PRECISION,
  current DOUBLE PRECISION,
  power_factor DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_device
    FOREIGN KEY(device_id) 
    REFERENCES devices(id)
    ON DELETE CASCADE
);

-- Convert the table to a hypertable
SELECT create_hypertable('telemetry_data', 'timestamp', if_not_exists => TRUE);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry_data(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_timestamp ON telemetry_data(device_id, timestamp DESC);

-- Create a continuous aggregate for daily device metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_device_metrics
WITH (timescaledb.continuous) AS
SELECT
  device_id,
  time_bucket('1 day', timestamp) as day,
  AVG(energy_watts) as avg_energy,
  MAX(energy_watts) as max_energy,
  MIN(energy_watts) as min_energy,
  SUM(energy_watts) as total_energy,
  COUNT(*) as readings_count
FROM telemetry_data
GROUP BY device_id, day;

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telemetry_data_updated_at
BEFORE UPDATE ON telemetry_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
