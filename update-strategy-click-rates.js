// Script to update strategy and persona click rates based on actual email data in bank-inbox.json
// This recalculates click rates from the restored click data

const fs = require('fs');
const path = require('path');

const inboxFile = './bank-inbox.json';
const learnedStrategiesFile = './learned-strategies.json';

try {
    // Load inbox
    const emails = JSON.parse(fs.readFileSync(inboxFile, 'utf8'));
    
    // Load learned strategies
    let learnedData = {
        strategyScores: {},
        personaVulnerabilities: {},
        combinations: {}
    };
    
    if (fs.existsSync(learnedStrategiesFile)) {
        learnedData = JSON.parse(fs.readFileSync(learnedStrategiesFile, 'utf8'));
    }
    
    // Group emails by strategy
    const strategyStats = {};
    const personaStats = {};
    const combinationStats = {};
    
    emails.forEach(email => {
        // Get strategy key
        const strategyKey = `${email.model || 'unknown'}|${email.attackLevel || 'unknown'}|${email.urgencyLevel || 'unknown'}`;
        
        // Get persona ID
        const personaId = email.targetPersona?.id != null ? String(email.targetPersona.id) : null;
        
        // Get combination key
        const combinationKey = personaId ? `${strategyKey}|${personaId}` : null;
        
        // Check if bypassed
        const bypassed = email.status === 'delivered' || 
                        !email.status || 
                        (email.status !== 'blocked' && email.status !== 'reported');
        
        // Check if clicked
        const clicked = email.clicked === true;
        
        // Update strategy stats
        if (!strategyStats[strategyKey]) {
            strategyStats[strategyKey] = {
                attempts: 0,
                bypassed: 0,
                clicked: 0
            };
        }
        strategyStats[strategyKey].attempts++;
        if (bypassed) strategyStats[strategyKey].bypassed++;
        if (clicked && bypassed) strategyStats[strategyKey].clicked++;
        
        // Update persona stats
        if (personaId) {
            if (!personaStats[personaId]) {
                personaStats[personaId] = {
                    attempts: 0,
                    bypassed: 0,
                    clicked: 0
                };
            }
            personaStats[personaId].attempts++;
            if (bypassed) personaStats[personaId].bypassed++;
            if (clicked && bypassed) personaStats[personaId].clicked++;
        }
        
        // Update combination stats
        if (combinationKey) {
            if (!combinationStats[combinationKey]) {
                combinationStats[combinationKey] = {
                    attempts: 0,
                    bypassed: 0,
                    clicked: 0
                };
            }
            combinationStats[combinationKey].attempts++;
            if (bypassed) combinationStats[combinationKey].bypassed++;
            if (clicked && bypassed) combinationStats[combinationKey].clicked++;
        }
    });
    
    // Update learned strategies with recalculated click rates
    Object.keys(strategyStats).forEach(strategyKey => {
        const stats = strategyStats[strategyKey];
        if (!learnedData.strategyScores[strategyKey]) {
            learnedData.strategyScores[strategyKey] = {
                attempts: 0,
                successes: 0,
                bypassRate: 0,
                clickRate: 0,
                score: 0,
                lastUpdated: new Date().toISOString()
            };
        }
        
        const strategy = learnedData.strategyScores[strategyKey];
        strategy.attempts = stats.attempts;
        strategy.successes = stats.bypassed;
        strategy.bypassRate = stats.attempts > 0 ? (stats.bypassed / stats.attempts) * 100 : 0;
        strategy.clickRate = stats.bypassed > 0 ? (stats.clicked / stats.bypassed) * 100 : 0;
        
        // Recalculate score (weighted: 60% bypass rate, 40% click rate)
        strategy.score = (strategy.bypassRate * 0.6) + (strategy.clickRate * 0.4);
        strategy.lastUpdated = new Date().toISOString();
    });
    
    // Update persona vulnerabilities
    Object.keys(personaStats).forEach(personaId => {
        const stats = personaStats[personaId];
        if (!learnedData.personaVulnerabilities[personaId]) {
            learnedData.personaVulnerabilities[personaId] = {
                attempts: 0,
                successes: 0,
                bypassRate: 0,
                clickRate: 0,
                vulnerabilityScore: 0,
                lastUpdated: new Date().toISOString()
            };
        }
        
        const persona = learnedData.personaVulnerabilities[personaId];
        persona.attempts = stats.attempts;
        persona.successes = stats.bypassed;
        persona.bypassRate = stats.attempts > 0 ? (stats.bypassed / stats.attempts) * 100 : 0;
        persona.clickRate = stats.bypassed > 0 ? (stats.clicked / stats.bypassed) * 100 : 0;
        
        // Recalculate vulnerability score
        persona.vulnerabilityScore = (persona.bypassRate * 0.6) + (persona.clickRate * 0.4);
        persona.lastUpdated = new Date().toISOString();
    });
    
    // Update combinations
    Object.keys(combinationStats).forEach(combinationKey => {
        const stats = combinationStats[combinationKey];
        if (!learnedData.combinations[combinationKey]) {
            learnedData.combinations[combinationKey] = {
                attempts: 0,
                bypassRate: 0,
                clickRate: 0,
                lastUpdated: new Date().toISOString()
            };
        }
        
        const combination = learnedData.combinations[combinationKey];
        combination.attempts = stats.attempts;
        combination.bypassRate = stats.attempts > 0 ? (stats.bypassed / stats.attempts) * 100 : 0;
        combination.clickRate = stats.bypassed > 0 ? (stats.clicked / stats.bypassed) * 100 : 0;
        combination.lastUpdated = new Date().toISOString();
    });
    
    // Save updated learned strategies
    fs.writeFileSync(learnedStrategiesFile, JSON.stringify(learnedData, null, 2));
    
    console.log('✅ Updated strategy and persona click rates from inbox data');
    console.log(`\nStrategy click rates:`);
    Object.keys(strategyStats).slice(0, 5).forEach(key => {
        const stats = strategyStats[key];
        const clickRate = stats.bypassed > 0 ? (stats.clicked / stats.bypassed * 100).toFixed(2) : '0.00';
        console.log(`  ${key}: ${clickRate}% (${stats.clicked}/${stats.bypassed} clicked/bypassed, ${stats.attempts} attempts)`);
    });
    
    console.log(`\nPersona click rates:`);
    Object.keys(personaStats).slice(0, 5).forEach(key => {
        const stats = personaStats[key];
        const clickRate = stats.bypassed > 0 ? (stats.clicked / stats.bypassed * 100).toFixed(2) : '0.00';
        console.log(`  Persona ${key}: ${clickRate}% (${stats.clicked}/${stats.bypassed} clicked/bypassed, ${stats.attempts} attempts)`);
    });
    
} catch (error) {
    console.error('Error updating strategy click rates:', error);
    process.exit(1);
}

