# Supabase Backup Setup Guide

This guide explains how to set up automatic backups of agent metrics to Supabase.

## Features Implemented

1. **Automatic Data Backups** - Agent metrics are automatically backed up to Supabase
2. **Trend Visualization** - Charts showing bypass/click rates over time
3. **Email Preview Modal** - Click any email in the dashboard to see full content

## Setup Steps

### 1. Create Supabase Tables

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-agent-backup-schema.sql`
4. Run the SQL to create the necessary tables:
   - `agent_metrics_backups` - Stores backups of agent data
   - `agent_metrics_history` - Stores historical metrics for trend charts

### 2. Configure Environment Variables

Add these to your `.env` file or set them as environment variables:

```bash
SUPABASE_URL=https://cumodtrxkqakvjandlsw.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

Or set them when running the agent:

```bash
SUPABASE_URL=https://cumodtrxkqakvjandlsw.supabase.co SUPABASE_ANON_KEY=your_key node autonomous-agent.js
```

### 3. Install Supabase Package (Optional)

The backup helper works with or without the `@supabase/supabase-js` package:

**With package (recommended):**
```bash
npm install @supabase/supabase-js
```

**Without package:**
The helper will automatically use the fetch API as a fallback.

### 4. Verify Setup

1. Start your agent: `node autonomous-agent.js`
2. Wait for at least one cycle to complete
3. Check Supabase dashboard → Table Editor → `agent_metrics_backups`
4. You should see backup entries appearing

## How It Works

### Automatic Backups

- **When**: Every time `saveMetrics()` is called (after each cycle)
- **What**: Agent metrics, learned strategies, and metrics history
- **Where**: Supabase `agent_metrics_backups` and `agent_metrics_history` tables
- **Failure Handling**: Backup failures are logged but don't block the agent

### Trend Charts

- **Data Source**: `agent_metrics_history` table in Supabase
- **Display**: Line chart showing bypass rate and click rate over time
- **Access**: Dashboard automatically loads trends via `/api/agent/trends` endpoint
- **Fallback**: If Supabase is unavailable, shows current metrics only

### Email Preview

- **How to Use**: Click any email in the "Recent Emails Deployed" section
- **Shows**: Full email content, metadata, risk score, status
- **Features**: Modal popup with all email details

## API Endpoints

### GET `/api/agent/trends?limit=20`

Returns metrics trends for charting.

**Response:**
```json
{
  "success": true,
  "trends": [
    {
      "cycle_number": 1,
      "bypass_rate": 67.7,
      "click_rate": 13.61,
      "emails_bypassed": 610,
      "emails_clicked": 83,
      "created_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

## Troubleshooting

### Backups Not Working

1. Check environment variables are set correctly
2. Verify Supabase tables exist (run the SQL schema)
3. Check Supabase RLS policies allow writes
4. Look for error messages in agent logs

### Charts Not Showing

1. Ensure at least 2 cycles have completed (need history)
2. Check browser console for errors
3. Verify `/api/agent/trends` endpoint returns data
4. Check Supabase `agent_metrics_history` table has entries

### Email Preview Not Working

1. Check browser console for JavaScript errors
2. Ensure emails have `body` or `content` field
3. Verify recent emails are loaded in dashboard

## Benefits

1. **Data Persistence**: Metrics survive server restarts
2. **Historical Analysis**: Track performance over time
3. **Visual Insights**: See trends and patterns in charts
4. **Better Debugging**: Preview actual generated emails

## Notes

- Backups are **non-blocking** - agent continues even if backup fails
- Old backups are automatically cleaned after 30 days (via SQL function)
- Charts update automatically every 5 seconds with dashboard refresh
- Email preview works offline (uses data already loaded)

