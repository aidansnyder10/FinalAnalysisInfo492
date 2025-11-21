#!/bin/bash
# Script to verify data was restored correctly on Hetzner

echo "🔍 Verifying data restoration..."
echo ""

cd /root/info492 || { echo "❌ Cannot find /root/info492 directory"; exit 1; }

echo "📂 Current directory: $(pwd)"
echo ""

# Check files exist
echo "Checking files..."
[ -f "bank-inbox.json" ] && echo "✅ bank-inbox.json exists" || echo "❌ bank-inbox.json missing"
[ -f "agent-metrics.json" ] && echo "✅ agent-metrics.json exists" || echo "❌ agent-metrics.json missing"
[ -f "defense-metrics.json" ] && echo "✅ defense-metrics.json exists" || echo "❌ defense-metrics.json missing"
[ -f "learned-strategies.json" ] && echo "✅ learned-strategies.json exists" || echo "❌ learned-strategies.json missing"
echo ""

# Check API response
echo "Checking API response..."
API_RESPONSE=$(curl -s http://localhost:3000/api/agent/status 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ API is responding"
    echo ""
    echo "Key metrics from API:"
    echo "$API_RESPONSE" | grep -o '"emailsBypassed":[0-9]*' | head -1
    echo "$API_RESPONSE" | grep -o '"emailsClicked":[0-9]*' | head -1
    echo "$API_RESPONSE" | grep -o '"bypassRate":[0-9.]*' | head -1
    echo "$API_RESPONSE" | grep -o '"clickRate":[0-9.]*' | head -1
else
    echo "❌ API is not responding - is the server running?"
    echo "   Try: pm2 status"
fi

echo ""
echo "📋 Next steps if data is missing:"
echo "   1. node restore-all-data-hetzner.js"
echo "   2. pm2 restart all"
echo "   3. Wait 5 seconds, then run this script again"

