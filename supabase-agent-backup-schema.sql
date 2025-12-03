-- Supabase Schema for Agent Metrics Backups
-- Run this SQL in your Supabase SQL editor to enable automatic backups

-- Create agent_metrics_backups table
CREATE TABLE IF NOT EXISTS agent_metrics_backups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('agent_metrics', 'learned_strategies', 'bank_inbox', 'full')),
    backup_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_metrics_history table for trend tracking
CREATE TABLE IF NOT EXISTS agent_metrics_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cycle_number INTEGER NOT NULL,
    total_emails_generated INTEGER DEFAULT 0,
    emails_bypassed INTEGER DEFAULT 0,
    emails_detected INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    bypass_rate DECIMAL(5,2) DEFAULT 0,
    click_rate DECIMAL(5,2) DEFAULT 0,
    successful_generations INTEGER DEFAULT 0,
    failed_generations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_metrics_backups_type ON agent_metrics_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_backups_created_at ON agent_metrics_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_history_cycle ON agent_metrics_history(cycle_number);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_history_created_at ON agent_metrics_history(created_at DESC);

-- Create function to automatically clean old backups (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS void AS $$
BEGIN
    DELETE FROM agent_metrics_backups 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get latest metrics for trends
CREATE OR REPLACE FUNCTION get_metrics_trends(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    cycle_number INTEGER,
    bypass_rate DECIMAL(5,2),
    click_rate DECIMAL(5,2),
    emails_bypassed INTEGER,
    emails_clicked INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        amh.cycle_number,
        amh.bypass_rate,
        amh.click_rate,
        amh.emails_bypassed,
        amh.emails_clicked,
        amh.created_at
    FROM agent_metrics_history amh
    ORDER BY amh.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE agent_metrics_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics_history ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo purposes)
CREATE POLICY "Allow all operations for anonymous users" 
    ON agent_metrics_backups FOR ALL 
    TO anon USING (true);

CREATE POLICY "Allow all operations for anonymous users" 
    ON agent_metrics_history FOR ALL 
    TO anon USING (true);

-- Grant permissions
GRANT ALL ON agent_metrics_backups TO anon;
GRANT ALL ON agent_metrics_history TO anon;

