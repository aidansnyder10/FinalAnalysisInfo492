#!/bin/bash
# Script to copy bank-inbox.json to Hetzner server

# Replace with your Hetzner server IP
HETZNER_IP="${1:-YOUR_HETZNER_IP}"
HETZNER_USER="${2:-root}"
REMOTE_PATH="${3:-/root/info492}"

if [ "$HETZNER_IP" = "YOUR_HETZNER_IP" ]; then
    echo "Usage: ./copy-to-hetzner.sh YOUR_HETZNER_IP [username] [remote_path]"
    echo ""
    echo "Example:"
    echo "  ./copy-to-hetzner.sh 123.45.67.89"
    echo "  ./copy-to-hetzner.sh 123.45.67.89 root /root/info492"
    exit 1
fi

LOCAL_FILE="./bank-inbox.json"
REMOTE_FILE="${REMOTE_PATH}/bank-inbox.json"

if [ ! -f "$LOCAL_FILE" ]; then
    echo "❌ Error: $LOCAL_FILE not found in current directory"
    exit 1
fi

echo "📤 Copying bank-inbox.json to Hetzner server..."
echo "   From: $LOCAL_FILE"
echo "   To: $HETZNER_USER@$HETZNER_IP:$REMOTE_FILE"
echo ""

# Backup existing file on server
echo "📦 Creating backup on server..."
ssh "$HETZNER_USER@$HETZNER_IP" "cd $REMOTE_PATH && cp bank-inbox.json bank-inbox.json.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# Copy the file
scp "$LOCAL_FILE" "$HETZNER_USER@$HETZNER_IP:$REMOTE_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ File copied successfully!"
    echo ""
    echo "📋 Next steps on Hetzner server:"
    echo "   1. ssh $HETZNER_USER@$HETZNER_IP"
    echo "   2. cd $REMOTE_PATH"
    echo "   3. node check-inbox-size.js  # Verify it has 901 emails"
    echo "   4. node restore-all-data-hetzner.js  # Restore all data"
    echo "   5. pm2 restart all  # Restart services"
    echo "   6. ./verify-restore.sh  # Verify it worked"
else
    echo ""
    echo "❌ Error copying file. Check:"
    echo "   - Server IP is correct"
    echo "   - SSH key is set up"
    echo "   - Server is accessible"
fi

