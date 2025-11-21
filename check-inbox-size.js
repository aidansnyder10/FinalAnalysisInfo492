// Quick script to check inbox size
const fs = require('fs');

const inboxFile = './bank-inbox.json';

if (!fs.existsSync(inboxFile)) {
    console.log('❌ bank-inbox.json not found');
    process.exit(1);
}

const emails = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
console.log(`📧 Total emails in bank-inbox.json: ${emails.length}`);

if (emails.length < 100) {
    console.log('\n⚠️  WARNING: Very few emails found!');
    console.log('   Expected: ~901 emails');
    console.log('   Found: ' + emails.length);
    console.log('\n   The bank-inbox.json file may have been reset or is incomplete.');
    console.log('   You need to restore the full email data.');
    console.log('\n   Options:');
    console.log('   1. Copy bank-inbox.json from your local machine to the server');
    console.log('   2. Wait for the agent to generate more emails (will take time)');
    console.log('   3. If you have a backup, restore it');
}

