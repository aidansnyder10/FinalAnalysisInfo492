-- SQL script to clear all Supabase backup and history data
-- Run this in Supabase SQL Editor to reset tables to empty state

-- Clear agent_metrics_backups table
DELETE FROM agent_metrics_backups;

-- Clear agent_metrics_history table  
DELETE FROM agent_metrics_history;

-- Verify tables are empty
SELECT COUNT(*) as backup_count FROM agent_metrics_backups;
SELECT COUNT(*) as history_count FROM agent_metrics_history;

-- Expected result: Both should return 0

