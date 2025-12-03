# Hetzner Server - Supabase Setup

After pushing your code to Hetzner, you need to configure the Supabase keys on the server.

## Option 1: Using PM2 with Environment Variables (Recommended)

SSH into your Hetzner server and run:

```bash
# Set Supabase environment variables
export SUPABASE_URL=https://cumodtrxkqakvjandlsw.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW9kdHJ4a3Fha3ZqYW5kbHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM3MzYsImV4cCI6MjA3NTQyOTczNn0.jFdUMilPEv_Yc2EYTFisRzlbFmo_9kcl7A_2xwIQ6cU

# Restart PM2 processes with new environment variables
pm2 delete all

# Start all services with Supabase keys
PORT=3000 OPENROUTER_API_KEY=$OPENROUTER_API_KEY SUPABASE_URL=$SUPABASE_URL SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY pm2 start local-server.js --name "industry"
OPENROUTER_API_KEY=$OPENROUTER_API_KEY SUPABASE_URL=$SUPABASE_URL SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY INDUSTRY_URL=http://localhost:3000 pm2 start autonomous-agent.js --name "agent"
INDUSTRY_URL=http://localhost:3000 pm2 start autonomous-defense-agent.js --name "defense"

# Save PM2 configuration
pm2 save
```

## Option 2: Create .env File on Server (Alternative)

SSH into Hetzner and create a `.env` file:

```bash
cd ~/info492-demo  # or wherever your project is

# Create .env file
cat > .env << 'EOF'
OPENROUTER_API_KEY=your_openrouter_key_here
SUPABASE_URL=https://cumodtrxkqakvjandlsw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW9kdHJ4a3Fha3ZqYW5kbHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM3MzYsImV4cCI6MjA3NTQyOTczNn0.jFdUMilPEv_Yc2EYTFisRzlbFmo_9kcl7A_2xwIQ6cU
EOF

# Then restart PM2 (it will pick up .env automatically)
pm2 restart all
```

## Option 3: Use ecosystem.config.js (If you're using it)

If you're using `pm2 start ecosystem.config.js`:

```bash
# The keys are already in ecosystem.config.js as fallbacks
# Just restart PM2
pm2 restart all
```

## Quick Setup Script

Save this as `setup-supabase-hetzner.sh` and run it on Hetzner:

```bash
#!/bin/bash

export SUPABASE_URL=https://cumodtrxkqakvjandlsw.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW9kdHJ4a3Fha3ZqYW5kbHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM3MzYsImV4cCI6MjA3NTQyOTczNn0.jFdUMilPEv_Yc2EYTFisRzlbFmo_9kcl7A_2xwIQ6cU

# Restart with new env vars
pm2 restart all --update-env

echo "✅ Supabase keys configured!"
echo "Check logs: pm2 logs agent"
```

## Verify It's Working

After setting up, check the logs:

```bash
# Check agent logs for backup messages
pm2 logs agent --lines 20

# You should see messages like:
# [Backup] Supabase backup enabled
# [Backup] Backing up agent metrics...
```

## Important Notes

1. **The keys are already in ecosystem.config.js** as fallback values, so if you're using that file, it should work automatically
2. **Make sure you've run the SQL schema** in Supabase first (see `supabase-agent-backup-schema.sql`)
3. **Backups are non-blocking** - if Supabase is unavailable, the agent continues running
4. **Check Supabase dashboard** after a cycle completes to verify backups are working

