# How to Copy bank-inbox.json to Hetzner Server

Your Hetzner server only has 7 emails, but you need 901 emails to restore the correct data.

## Option 1: Copy from Local Machine (Recommended)

### On your local machine:

```bash
# From your local Info492Demo directory
scp bank-inbox.json root@your-hetzner-ip:/root/info492/
```

Replace `your-hetzner-ip` with your actual Hetzner server IP address.

### Then on Hetzner server:

```bash
cd /root/info492
node restore-all-data-hetzner.js
pm2 restart all
```

## Option 2: Create a Backup Script

If you want to backup the current file first:

```bash
# On Hetzner server
cd /root/info492
cp bank-inbox.json bank-inbox.json.backup
# Then copy new file
```

## Option 3: Check if PM2 is Using Different Directory

Sometimes PM2 might be reading from a different location:

```bash
# Check PM2 working directory
pm2 info industry | grep "exec cwd"

# If it's different, check that location
ls -la /path/to/other/directory/bank-inbox.json
```

## Verify After Copying

```bash
cd /root/info492
node check-inbox-size.js
# Should show: Total emails in bank-inbox.json: 901

# Then restore
node restore-all-data-hetzner.js
pm2 restart all
```

