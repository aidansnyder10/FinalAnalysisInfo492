// Reset All Data Script for Hetzner
// Resets all agent metrics, defense metrics, and email data to zero/fresh state

const fs = require('fs');
const path = require('path');

console.log('🔄 Resetting all agent data to fresh state...\n');
console.log(`📂 Current directory: ${process.cwd()}\n`);

// File paths
const agentMetricsFile = './agent-metrics.json';
const defenseMetricsFile = './defense-metrics.json';
const inboxFile = './bank-inbox.json';
const learnedStrategiesFile = './learned-strategies.json';

// Check if we're in the right directory
if (!fs.existsSync('./local-server.js')) {
    console.log('❌ ERROR: local-server.js not found!');
    console.log('   Please run this script from the project root directory.');
    process.exit(1);
}

// Step 1: Reset agent-metrics.json
console.log('Step 1: Resetting agent-metrics.json...');
try {
    const freshAgentMetrics = {
        startTime: new Date().toISOString(),
        totalCycles: 0,
        totalEmailsGenerated: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        lastCycleTime: null,
        cyclesByDay: {},
        performanceHistory: [],
        emailsBypassed: 0,
        emailsDetected: 0,
        emailsClicked: 0,
        bypassRate: 0,
        clickRate: 0
    };
    
    fs.writeFileSync(agentMetricsFile, JSON.stringify(freshAgentMetrics, null, 2));
    console.log('✅ Reset agent-metrics.json to fresh state');
} catch (error) {
    console.log(`❌ Error resetting agent-metrics.json: ${error.message}`);
}

// Step 2: Reset defense-metrics.json
console.log('\nStep 2: Resetting defense-metrics.json...');
try {
    const freshDefenseMetrics = {
        startTime: new Date().toISOString(),
        totalEmailsAnalyzed: 0,
        emailsBlocked: 0,
        emailsReported: 0,
        emailsDelivered: 0,
        totalRiskScore: 0,
        averageRiskScore: 0,
        lastAnalysisTime: null
    };
    
    fs.writeFileSync(defenseMetricsFile, JSON.stringify(freshDefenseMetrics, null, 2));
    console.log('✅ Reset defense-metrics.json to fresh state');
} catch (error) {
    console.log(`❌ Error resetting defense-metrics.json: ${error.message}`);
}

// Step 3: Clear bank-inbox.json
console.log('\nStep 3: Clearing bank-inbox.json...');
try {
    if (fs.existsSync(inboxFile)) {
        // Create backup before clearing
        const backupFile = `./bank-inbox.json.backup.${Date.now()}`;
        fs.copyFileSync(inboxFile, backupFile);
        console.log(`   📦 Backup created: ${backupFile}`);
    }
    
    // Reset to empty array
    fs.writeFileSync(inboxFile, JSON.stringify([], null, 2));
    console.log('✅ Cleared bank-inbox.json (empty inbox)');
} catch (error) {
    console.log(`❌ Error clearing bank-inbox.json: ${error.message}`);
}

// Step 4: Reset learned-strategies.json (optional - comment out if you want to keep learning)
console.log('\nStep 4: Resetting learned-strategies.json...');
try {
    const freshLearnedStrategies = {
        lastUpdated: new Date().toISOString(),
        strategyScores: {},
        personaVulnerabilities: {},
        combinations: {},
        personaNames: {}
    };
    
    fs.writeFileSync(learnedStrategiesFile, JSON.stringify(freshLearnedStrategies, null, 2));
    console.log('✅ Reset learned-strategies.json to fresh state');
    console.log('   ⚠️  Note: All learning data has been cleared');
} catch (error) {
    console.log(`❌ Error resetting learned-strategies.json: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ RESET COMPLETE!');
console.log('='.repeat(50));
console.log('\n📊 All metrics reset to:');
console.log('   • Total Cycles: 0');
console.log('   • Emails Generated: 0');
console.log('   • Emails Bypassed: 0');
console.log('   • Emails Detected: 0');
console.log('   • Emails Clicked: 0');
console.log('   • Inbox: Empty');
console.log('   • Learning Data: Cleared');
console.log('\n🔄 Next steps:');
console.log('   1. Restart PM2 processes: pm2 restart all');
console.log('   2. Wait for the agent to run a cycle (~5 minutes)');
console.log('   3. Check dashboard to see fresh metrics');
console.log('\n💡 Tip: A backup of bank-inbox.json was created before clearing');
console.log('');

