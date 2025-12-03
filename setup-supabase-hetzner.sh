#!/bin/bash
# Quick setup script for Supabase on Hetzner server
# Run this on your Hetzner server after pulling the latest code

echo "🔧 Setting up Supabase on Hetzner server..."

# Set Supabase environment variables
export SUPABASE_URL=https://cumodtrxkqakvjandlsw.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW9kdHJ4a3Fha3ZqYW5kbHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM3MzYsImV4cCI6MjA3NTQyOTczNn0.jFdUMilPEv_Yc2EYTFisRzlbFmo_9kcl7A_2xwIQ6cU

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Please install PM2 first."
    exit 1
fi

# Restart PM2 processes with new environment variables
echo "🔄 Restarting PM2 processes with Supabase keys..."
pm2 restart all --update-env

# Save PM2 configuration
pm2 save

echo ""
echo "✅ Supabase setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Check logs: pm2 logs agent --lines 20"
echo "   2. Look for: '[Backup] Supabase backup enabled'"
echo "   3. Wait for one cycle to complete (~5 minutes)"
echo "   4. Check Supabase dashboard → Table Editor → agent_metrics_backups"
echo ""
echo "💡 Note: Make sure you've run the SQL schema in Supabase first!"
echo "   See: supabase-agent-backup-schema.sql"

