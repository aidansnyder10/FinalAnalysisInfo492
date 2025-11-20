# PM2 Setup for All Services

## Current PM2 Processes

You should have **3 processes** running:

1. **industry** - Main server (local-server.js)
2. **agent** - Attack agent (autonomous-agent.js) 
3. **defense** - Defense agent (autonomous-defense-agent.js) ⬅️ **NEW**

## Setup Commands (Hetzner Server)

### Full Setup (if starting fresh):

```bash
# Set your API key
export OPENROUTER_API_KEY=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

# Delete all existing PM2 processes
pm2 delete all

# Start all three services
PORT=3000 OPENROUTER_API_KEY=$OPENROUTER_API_KEY pm2 start local-server.js --name "industry"
OPENROUTER_API_KEY=$OPENROUTER_API_KEY INDUSTRY_URL=http://localhost:3000 pm2 start autonomous-agent.js --name "agent"
INDUSTRY_URL=http://localhost:3000 pm2 start autonomous-defense-agent.js --name "defense"

# Save PM2 configuration
pm2 save

# Check status
pm2 status
```

### Adding Defense Agent (if you already have industry and agent running):

```bash
# Just add the defense agent
INDUSTRY_URL=http://localhost:3000 pm2 start autonomous-defense-agent.js --name "defense"
pm2 save
pm2 status
```

## Verify All Services Are Running

```bash
# Check status
pm2 status

# You should see:
# - industry (online)
# - agent (online)  
# - defense (online)

# Check logs
pm2 logs industry --lines 10
pm2 logs agent --lines 10
pm2 logs defense --lines 10
```

## Restart All Services

```bash
pm2 restart all
```

## Stop All Services

```bash
pm2 stop all
```

## View Logs

```bash
# All logs
pm2 logs

# Specific service
pm2 logs defense --lines 50

# Follow logs in real-time
pm2 logs defense --lines 0
```

## Important Notes

- **Defense agent** doesn't need OPENROUTER_API_KEY (it only reads from bank-inbox.json)
- **Defense agent** needs INDUSTRY_URL to know where the server is (for future API calls)
- All three services should be running for Demo 4 to work properly


