// Debug script to check why metrics don't match
// Compares what's in bank-inbox.json vs what the API endpoints return

const fs = require('fs');

console.log('🔍 Debugging Metrics Mismatch\n');

const inboxFile = './bank-inbox.json';

// Read inbox file
let emails = [];
if (fs.existsSync(inboxFile)) {
    try {
        const data = fs.readFileSync(inboxFile, 'utf8');
        if (data && data.trim().length > 0) {
            emails = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading inbox:', error.message);
        process.exit(1);
    }
}

console.log(`📧 Total emails in bank-inbox.json: ${emails.length}\n`);

if (emails.length === 0) {
    console.log('⚠️  Inbox is empty - no emails to analyze');
    process.exit(0);
}

// Calculate what SHOULD be the metrics
const bypassed = emails.filter(e => {
    if (e.status === 'delivered') return true;
    if (!e.status || e.status === undefined || e.status === null || e.status === '') return true;
    if (e.status !== 'blocked' && e.status !== 'reported') return true;
    return false;
});

const detected = emails.filter(e => e.status === 'blocked' || e.status === 'reported');
const clicked = emails.filter(e => bypassed.some(b => b.id === e.id) && e.clicked === true);

const total = bypassed.length + detected.length;
const bypassRate = total > 0 ? ((bypassed.length / total) * 100).toFixed(2) : 0;
const clickRate = bypassed.length > 0 ? ((clicked.length / bypassed.length) * 100).toFixed(2) : 0;

console.log('📊 Calculated Metrics (from bank-inbox.json):');
console.log(`   Bypassed: ${bypassed.length}`);
console.log(`   Detected: ${detected.length}`);
console.log(`   Clicked: ${clicked.length}`);
console.log(`   Total: ${total}`);
console.log(`   Bypass Rate: ${bypassRate}%`);
console.log(`   Click Rate: ${clickRate}%\n`);

// Show status breakdown
console.log('📋 Status Breakdown:');
const statusCounts = {};
emails.forEach(e => {
    const status = e.status || 'NO_STATUS';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
});
Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
});

// Show recent emails with details
console.log('\n📧 Recent Emails (last 10):');
emails.slice(-10).reverse().forEach((email, i) => {
    console.log(`\n   ${i + 1}. ${email.subject || 'No subject'}`);
    console.log(`      ID: ${email.id}`);
    console.log(`      Status: ${email.status || 'NO_STATUS'}`);
    console.log(`      Risk Score: ${email.riskScore || 'N/A'}`);
    console.log(`      Received: ${email.receivedAt || email.timestamp || 'N/A'}`);
    console.log(`      Clicked: ${email.clicked ? 'Yes' : 'No'}`);
    if (email.detectedAt) {
        console.log(`      Detected At: ${email.detectedAt}`);
    }
});

// Check if defense agent processed them
console.log('\n🛡️  Defense Agent Processing Status:');
const unprocessed = emails.filter(e => 
    (e.status === 'delivered' || !e.status) && 
    !e.detectionMetadata &&
    !e.riskScore
);
if (unprocessed.length > 0) {
    console.log(`   ⚠️  ${unprocessed.length} emails not yet processed by defense agent:`);
    unprocessed.forEach(e => {
        console.log(`      - ${e.subject || e.id} (status: ${e.status || 'NO_STATUS'})`);
    });
} else {
    console.log('   ✅ All emails have been processed by defense agent');
}

console.log('\n💡 Next Steps:');
console.log('   1. Check if defense agent is running: pm2 logs defense --lines 20');
console.log('   2. Check industry server logs: pm2 logs industry --lines 20');
console.log('   3. Test API endpoint: curl http://localhost:3000/api/agent/metrics');

