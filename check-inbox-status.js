// Quick diagnostic script to check email statuses in bank-inbox.json

const fs = require('fs');

const inboxFile = './bank-inbox.json';

console.log('📧 Checking bank-inbox.json statuses...\n');

if (!fs.existsSync(inboxFile)) {
    console.log('❌ bank-inbox.json not found!');
    process.exit(1);
}

try {
    const data = fs.readFileSync(inboxFile, 'utf8');
    const emails = JSON.parse(data);
    
    console.log(`Total emails: ${emails.length}\n`);
    
    if (emails.length === 0) {
        console.log('⚠️  Inbox is empty');
        process.exit(0);
    }
    
    // Count by status
    const statusCounts = {};
    emails.forEach(email => {
        const status = email.status || 'NO STATUS';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
    });
    
    console.log('\nDetailed breakdown:');
    const delivered = emails.filter(e => e.status === 'delivered' || !e.status || e.status === undefined || e.status === null || (e.status !== 'blocked' && e.status !== 'reported'));
    const detected = emails.filter(e => e.status === 'blocked' || e.status === 'reported');
    
    console.log(`  Bypassed (delivered/undefined): ${delivered.length}`);
    console.log(`  Detected (blocked/reported): ${detected.length}`);
    
    console.log('\nRecent emails (last 10):');
    emails.slice(-10).reverse().forEach((email, i) => {
        console.log(`  ${i + 1}. ${email.subject || 'No subject'}`);
        console.log(`     Status: ${email.status || 'NO STATUS'}`);
        console.log(`     Risk Score: ${email.riskScore || 'N/A'}`);
        console.log(`     ID: ${email.id}`);
        console.log('');
    });
    
} catch (error) {
    console.error('❌ Error reading bank-inbox.json:', error.message);
    process.exit(1);
}

