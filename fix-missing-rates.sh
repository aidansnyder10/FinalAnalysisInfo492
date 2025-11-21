#!/bin/bash
# Script to diagnose and fix missing bypass/click rates on Hetzner server

echo "🔍 Diagnosing missing rates issue..."
echo ""

# Check if we're in the right directory
if [ ! -f "local-server.js" ]; then
    echo "❌ Error: Not in project directory. Please run: cd /root/info492"
    exit 1
fi

echo "📂 Current directory: $(pwd)"
echo ""

# Check if files exist
echo "Checking data files..."
if [ -f "bank-inbox.json" ]; then
    EMAIL_COUNT=$(cat bank-inbox.json | grep -o '"id"' | wc -l)
    echo "✅ bank-inbox.json exists ($EMAIL_COUNT emails)"
else
    echo "❌ bank-inbox.json MISSING"
fi

if [ -f "agent-metrics.json" ]; then
    echo "✅ agent-metrics.json exists"
else
    echo "❌ agent-metrics.json MISSING"
fi

if [ -f "learned-strategies.json" ]; then
    echo "✅ learned-strategies.json exists"
else
    echo "❌ learned-strategies.json MISSING"
fi

echo ""
echo "🔧 Running diagnostic script..."
node check-server-data.js

echo ""
echo "💡 If rates are missing, run these commands:"
echo "   1. node restore-click-data.js    (restore 83 clicks)"
echo "   2. node update-strategy-click-rates.js  (update strategy rates)"
echo "   3. pm2 restart all               (restart services)"
echo ""

