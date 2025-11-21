// Diagnostic script to check server data files and identify why rates disappeared

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking server data files...\n');

// Check bank-inbox.json
const inboxFile = './bank-inbox.json';
let inboxExists = fs.existsSync(inboxFile);
console.log(`bank-inbox.json: ${inboxExists ? '✅ EXISTS' : '❌ MISSING'}`);

if (inboxExists) {
    try {
        const emails = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
        const bypassed = emails.filter(e => 
            e.status === 'delivered' || 
            !e.status || 
            (e.status !== 'blocked' && e.status !== 'reported')
        );
        const detected = emails.filter(e => 
            e.status === 'blocked' || e.status === 'reported'
        );
        const clicked = emails.filter(e => e.clicked === true);
        const clickedBypassed = emails.filter(e => 
            e.clicked === true && 
            (e.status === 'delivered' || !e.status || (e.status !== 'blocked' && e.status !== 'reported'))
        );
        
        console.log(`  Total emails: ${emails.length}`);
        console.log(`  Bypassed: ${bypassed.length}`);
        console.log(`  Detected: ${detected.length}`);
        console.log(`  Clicked: ${clicked.length}`);
        console.log(`  Clicked (bypassed only): ${clickedBypassed.length}`);
        console.log(`  Bypass rate: ${emails.length > 0 ? (bypassed.length / emails.length * 100).toFixed(2) : 0}%`);
        console.log(`  Click rate: ${bypassed.length > 0 ? (clickedBypassed.length / bypassed.length * 100).toFixed(2) : 0}%`);
    } catch (error) {
        console.log(`  ❌ ERROR reading file: ${error.message}`);
    }
} else {
    console.log('  ⚠️  File does not exist - this will cause rates to show as 0');
}

// Check agent-metrics.json
const metricsFile = './agent-metrics.json';
let metricsExists = fs.existsSync(metricsFile);
console.log(`\nagent-metrics.json: ${metricsExists ? '✅ EXISTS' : '❌ MISSING'}`);

if (metricsExists) {
    try {
        const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        console.log(`  Total cycles: ${metrics.totalCycles || 0}`);
        console.log(`  Total emails generated: ${metrics.totalEmailsGenerated || 0}`);
        console.log(`  Emails bypassed: ${metrics.emailsBypassed || 0}`);
        console.log(`  Emails detected: ${metrics.emailsDetected || 0}`);
        console.log(`  Emails clicked: ${metrics.emailsClicked || 0}`);
        console.log(`  Bypass rate: ${metrics.bypassRate || 0}%`);
        console.log(`  Click rate: ${metrics.clickRate || 0}%`);
    } catch (error) {
        console.log(`  ❌ ERROR reading file: ${error.message}`);
    }
} else {
    console.log('  ⚠️  File does not exist - will be created on next agent cycle');
}

// Check learned-strategies.json
const strategiesFile = './learned-strategies.json';
let strategiesExists = fs.existsSync(strategiesFile);
console.log(`\nlearned-strategies.json: ${strategiesExists ? '✅ EXISTS' : '❌ MISSING'}`);

if (strategiesExists) {
    try {
        const strategies = JSON.parse(fs.readFileSync(strategiesFile, 'utf8'));
        const strategyCount = Object.keys(strategies.strategyScores || {}).length;
        const personaCount = Object.keys(strategies.personaVulnerabilities || {}).length;
        console.log(`  Strategies tracked: ${strategyCount}`);
        console.log(`  Personas tracked: ${personaCount}`);
    } catch (error) {
        console.log(`  ❌ ERROR reading file: ${error.message}`);
    }
}

// Check file permissions
console.log('\n📁 File permissions:');
[inboxFile, metricsFile, strategiesFile].forEach(file => {
    if (fs.existsSync(file)) {
        try {
            const stats = fs.statSync(file);
            console.log(`  ${path.basename(file)}: ${stats.mode.toString(8)} (readable: ${(stats.mode & parseInt('444', 8)) !== 0})`);
        } catch (error) {
            console.log(`  ${path.basename(file)}: ❌ Cannot read stats`);
        }
    }
});

// Check current working directory
console.log(`\n📂 Current working directory: ${process.cwd()}`);

// Recommendations
console.log('\n💡 Recommendations:');
if (!inboxExists) {
    console.log('  - Run: node restore-click-data.js (if you have emails)');
    console.log('  - Or wait for agent to generate new emails');
}
if (!metricsExists) {
    console.log('  - This is normal if agent hasn\'t run yet');
    console.log('  - Will be created automatically on first cycle');
}
if (inboxExists && fs.existsSync(inboxFile)) {
    try {
        const emails = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
        const clicked = emails.filter(e => e.clicked === true).length;
        if (clicked === 0) {
            console.log('  - No clicks found in inbox - run: node restore-click-data.js');
        }
    } catch (e) {}
}

