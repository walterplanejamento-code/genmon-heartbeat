-- Add serial configuration columns to equipamentos_hf
ALTER TABLE equipamentos_hf 
ADD COLUMN IF NOT EXISTS baud_rate INTEGER DEFAULT 19200,
ADD COLUMN IF NOT EXISTS data_bits INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS parity TEXT DEFAULT 'None',
ADD COLUMN IF NOT EXISTS stop_bits INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_connection_ip TEXT,
ADD COLUMN IF NOT EXISTS last_connection_port INTEGER;