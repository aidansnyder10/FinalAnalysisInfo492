// Autonomous Defense Agent for Continuous Email Security
// This agent continuously monitors and defends against phishing attacks
// Uses Decision Tree ML classifier to automatically analyze and block emails

// Load environment variables from .env file if it exists
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, that's okay - use environment variables directly
}

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    INDUSTRY_URL: process.env.INDUSTRY_URL || 'http://localhost:3000',
    AGENT_TYPE: 'defense',
    CYCLE_INTERVAL_SECONDS: 30, // Check for new emails every 30 seconds
    METRICS_FILE: './defense-metrics.json',
    LOG_FILE: './defense-agent.log',
    INBOX_FILE: './bank-inbox.json'
};

class AutonomousDefenseAgent {
    constructor() {
        this.stats = {
            startTime: new Date().toISOString(),
            totalCycles: 0,
            totalEmailsAnalyzed: 0,
            totalEmailsBlocked: 0,
            totalEmailsReported: 0,
            totalEmailsBypassed: 0,
            lastCycleTime: null,
            cyclesByDay: {},
            performanceHistory: [],
            // Defense metrics
            detectionRate: 0,
            bypassRate: 0,
            avgResponseTime: 0,
            avgLeakageRisk: 0,
            mlAccuracy: 0,
            highRiskBlocked: 0,
            mediumRiskReported: 0,
            lowRiskAllowed: 0
        };
        this.isRunning = false;
        this.processedEmailIds = new Set(); // Track which emails we've already processed
        
        // Load existing metrics
        this.loadMetrics();
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        
        // Append to log file
        try {
            fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    loadMetrics() {
        try {
            if (fs.existsSync(CONFIG.METRICS_FILE)) {
                const data = fs.readFileSync(CONFIG.METRICS_FILE, 'utf8');
                const saved = JSON.parse(data);
                this.stats = { ...this.stats, ...saved };
                // Restore processed email IDs if saved
                if (saved.processedEmailIds) {
                    this.processedEmailIds = new Set(saved.processedEmailIds);
                }
                this.log(`Loaded metrics: ${this.stats.totalCycles} cycles, ${this.stats.totalEmailsAnalyzed} emails analyzed`);
            }
        } catch (error) {
            this.log(`Failed to load metrics: ${error.message}`, 'WARN');
        }
    }

    saveMetrics() {
        try {
            const toSave = {
                ...this.stats,
                processedEmailIds: Array.from(this.processedEmailIds)
            };
            fs.writeFileSync(CONFIG.METRICS_FILE, JSON.stringify(toSave, null, 2));
        } catch (error) {
            this.log(`Failed to save metrics: ${error.message}`, 'ERROR');
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithRetry(url, options, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(url, options);
                return response;
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await this.sleep(1000 * (i + 1)); // Exponential backoff
            }
        }
    }

    // Load Decision Tree Classifier (simplified version for server-side)
    classifyEmail(email) {
        // Simplified decision tree logic (full version is in decision-tree-classifier.js)
        const subject = (email.subject || '').toLowerCase();
        const content = (email.content || '').toLowerCase();
        const senderEmail = (email.senderEmail || '').toLowerCase();
        const urls = email.urls || this.extractUrls(content) || [];
        
        // Realistic base score: Most emails are legitimate (industry standard)
        let riskScore = 25; // Base score (balanced to allow some sophisticated attacks)
        let riskLevel = 'low';
        
        // URL analysis (balanced penalties)
        if (urls.length > 0) {
            const urlAuthenticity = this.analyzeUrlAuthenticity(urls, senderEmail);
            if (urlAuthenticity < 30) {
                riskScore += 45; // Obvious URL issues (shorteners, IPs, mismatches)
            } else if (urlAuthenticity < 60) {
                riskScore += 30; // Moderate URL concerns
            } else if (urlAuthenticity < 80) {
                riskScore += 15; // Minor URL concerns
            } else if (urlAuthenticity < 100) {
                // Even if URLs match, external domains from unknown senders are slightly suspicious
                riskScore += 5; // Very minor concern for external domains
            }
        }
        
        // Keyword analysis (more nuanced detection)
        const urgencyKeywords = ['urgent', 'immediate', 'critical', 'asap', 'action required'];
        const credentialKeywords = ['password', 'credentials', 'login', 'verify account'];
        const securityKeywords = ['security breach', 'unauthorized access', 'suspicious activity'];
        
        let urgencyCount = 0;
        urgencyKeywords.forEach(kw => {
            if (subject.includes(kw) || content.includes(kw)) urgencyCount++;
        });
        
        let credentialCount = 0;
        credentialKeywords.forEach(kw => {
            if (subject.includes(kw) || content.includes(kw)) credentialCount++;
        });
        
        let securityCount = 0;
        securityKeywords.forEach(kw => {
            if (content.includes(kw)) securityCount++;
        });
        
        // Risk scoring (realistic thresholds - requires multiple indicators)
        // Multiple strong indicators = high risk
        if (urgencyCount >= 2 && credentialCount >= 2) {
            riskScore += 35; // High risk - obvious phishing pattern
        } else if (credentialCount >= 2 && urgencyCount >= 1) {
            riskScore += 30; // High risk
        } else if (credentialCount >= 1 && urgencyCount >= 1) {
            riskScore += 20; // Medium-high risk
        } else if (securityCount >= 1 && urgencyCount >= 1) {
            riskScore += 18; // Medium-high risk
        } else if (securityCount >= 1) {
            riskScore += 12; // Medium risk
        } else if (credentialCount >= 1) {
            riskScore += 8; // Low-medium risk
        } else if (urgencyCount >= 2) {
            riskScore += 10; // Medium risk (urgency alone)
        } else if (urgencyCount >= 1) {
            riskScore += 5; // Low risk (single urgency word)
        }
        
        // Sender analysis
        if (senderEmail.includes('noreply') || senderEmail.includes('no-reply')) {
            riskScore += 3; // Minor risk indicator
        }
        
        // External/unknown sender domains are suspicious (realistic)
        // Legitimate business emails usually come from known/trusted domains
        // External domains requesting actions are a common phishing indicator
        const senderDomain = senderEmail.split('@')[1]?.toLowerCase();
        const knownLegitimateDomains = [
            'securebank.com', 'firstnational.com', 'metrocu.org', 
            'pacifictrust.com', 'communityfirst.com'
        ];
        if (senderDomain && !knownLegitimateDomains.includes(senderDomain)) {
            // External domain requesting action - realistic phishing indicator
            riskScore += 10; // External domains are somewhat suspicious (reduced to allow legitimate external emails)
        }
        
        // Normalize risk score
        riskScore = Math.min(100, Math.max(0, riskScore));
        
        // Realistic risk level thresholds (industry standard)
        // High risk = obvious phishing (blocked)
        // Medium risk = suspicious (reported for review)
        // Low risk = appears safe (bypassed)
        // Balanced to achieve 50-70% detection rate for sophisticated attacks
        if (riskScore >= 75) {
            riskLevel = 'high'; // Blocked - obvious phishing
        } else if (riskScore >= 50) {
            riskLevel = 'medium'; // Reported - suspicious, needs review (raised threshold to allow more bypasses)
        } else {
            riskLevel = 'low'; // Bypassed - appears legitimate
        }
        
        return {
            riskLevel,
            riskScore,
            confidence: riskScore > 70 ? 0.9 : riskScore > 40 ? 0.7 : 0.6,
            reasoning: this.generateReasoning(riskLevel, riskScore, {
                hasUrls: urls.length > 0,
                urgencyCount,
                credentialCount,
                securityCount
            })
        };
    }

    extractUrls(text) {
        if (!text) return [];
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
        return text.match(urlRegex) || [];
    }

    analyzeUrlAuthenticity(urls, senderEmail) {
        if (urls.length === 0) return 100;
        
        let score = 100;
        const senderDomain = senderEmail.split('@')[1]?.toLowerCase();
        
        for (const url of urls) {
            const urlDomain = url.match(/https?:\/\/([^\/]+)/i)?.[1]?.toLowerCase();
            
            // Domain mismatch
            if (senderDomain && urlDomain && urlDomain !== senderDomain) {
                score -= 30;
            }
            
            // URL shorteners
            if (/bit\.ly|tinyurl|t\.co|goo\.gl/i.test(url)) {
                score -= 20;
            }
            
            // IP addresses
            if (/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(url)) {
                score -= 35;
            }
            
            // HTTP (non-secure)
            if (url.startsWith('http://')) {
                score -= 15;
            }
        }
        
        return Math.max(0, Math.min(100, score));
    }

    generateReasoning(riskLevel, riskScore, features) {
        if (riskLevel === 'high') {
            return 'Suspicious or unauthentic URLs detected in email';
        } else if (riskLevel === 'medium') {
            return 'Suspicious sender with risk indicators';
        } else {
            return 'No major risk indicators detected';
        }
    }

    async executeDefenseCycle() {
        this.log(`Starting defense cycle #${this.stats.totalCycles + 1}`);
        const cycleStartTime = Date.now();
        
        try {
            // Load emails from inbox
            let emails = [];
            try {
                if (fs.existsSync(CONFIG.INBOX_FILE)) {
                    const data = fs.readFileSync(CONFIG.INBOX_FILE, 'utf8');
                    emails = JSON.parse(data);
                    if (!Array.isArray(emails)) {
                        emails = [];
                    }
                }
            } catch (error) {
                this.log(`Error reading inbox file: ${error.message}`, 'ERROR');
                return;
            }
            
            // Find new emails that haven't been processed
            const newEmails = emails.filter(email => 
                email.status === 'delivered' && 
                !this.processedEmailIds.has(email.id) &&
                !email.detectionMetadata
            );
            
            if (newEmails.length === 0) {
                this.log(`No new emails to analyze`);
                this.stats.totalCycles++;
                this.stats.lastCycleTime = new Date().toISOString();
                this.saveMetrics();
                return;
            }
            
            this.log(`Analyzing ${newEmails.length} new email(s) with ML decision tree`);
            
            let blockedCount = 0;
            let reportedCount = 0;
            let bypassedCount = 0;
            let analyzedCount = 0;
            
            // Analyze each email
            for (const email of newEmails) {
                try {
                    // Classify email using decision tree
                    const classification = this.classifyEmail(email);
                    
                    // Update email with classification
                    email.riskLevel = classification.riskLevel;
                    email.riskScore = classification.riskScore;
                    email.mlClassification = {
                        riskLevel: classification.riskLevel,
                        riskScore: classification.riskScore,
                        confidence: classification.confidence,
                        reasoning: classification.reasoning,
                        analyzedAt: new Date().toISOString()
                    };
                    
                    // Auto-block or report based on risk level
                    if (classification.riskLevel === 'high') {
                        email.status = 'blocked';
                        email.autoDetected = true;
                        email.detectedAt = new Date().toISOString();
                        if (email.receivedAt) {
                            email.detectionTime = (new Date(email.detectedAt) - new Date(email.receivedAt)) / (1000 * 60); // minutes
                        }
                        blockedCount++;
                        this.stats.highRiskBlocked++;
                        this.log(`✓ Blocked high-risk email: "${email.subject}" (Risk: ${classification.riskScore}/100)`);
                    } else if (classification.riskLevel === 'medium') {
                        email.status = 'reported';
                        email.autoDetected = true;
                        email.detectedAt = new Date().toISOString();
                        if (email.receivedAt) {
                            email.detectionTime = (new Date(email.detectedAt) - new Date(email.receivedAt)) / (1000 * 60); // minutes
                        }
                        reportedCount++;
                        this.stats.mediumRiskReported++;
                        this.log(`✓ Reported medium-risk email: "${email.subject}" (Risk: ${classification.riskScore}/100)`);
                    } else {
                        // Low risk - mark as analyzed but don't block
                        bypassedCount++;
                        this.stats.lowRiskAllowed++;
                        this.log(`- Allowed low-risk email: "${email.subject}" (Risk: ${classification.riskScore}/100)`);
                    }
                    
                    // Mark as processed
                    this.processedEmailIds.add(email.id);
                    analyzedCount++;
                    
                    // Small delay between analyses
                    await this.sleep(100);
                } catch (error) {
                    this.log(`Error analyzing email ${email.id}: ${error.message}`, 'ERROR');
                }
            }
            
            // Save updated emails back to file
            try {
                fs.writeFileSync(CONFIG.INBOX_FILE, JSON.stringify(emails, null, 2));
            } catch (error) {
                this.log(`Error saving inbox file: ${error.message}`, 'ERROR');
            }
            
            // Update stats
            const cycleDuration = Date.now() - cycleStartTime;
            this.stats.totalCycles++;
            this.stats.totalEmailsAnalyzed += analyzedCount;
            this.stats.totalEmailsBlocked += blockedCount;
            this.stats.totalEmailsReported += reportedCount;
            this.stats.totalEmailsBypassed += bypassedCount;
            this.stats.lastCycleTime = new Date().toISOString();
            
            // Track by day
            const today = new Date().toISOString().split('T')[0];
            if (!this.stats.cyclesByDay[today]) {
                this.stats.cyclesByDay[today] = { cycles: 0, analyzed: 0, blocked: 0, reported: 0, bypassed: 0 };
            }
            this.stats.cyclesByDay[today].cycles++;
            this.stats.cyclesByDay[today].analyzed += analyzedCount;
            this.stats.cyclesByDay[today].blocked += blockedCount;
            this.stats.cyclesByDay[today].reported += reportedCount;
            this.stats.cyclesByDay[today].bypassed += bypassedCount;
            
            // Record performance
            this.stats.performanceHistory.push({
                timestamp: new Date().toISOString(),
                cycleNumber: this.stats.totalCycles,
                emailsAnalyzed: analyzedCount,
                emailsBlocked: blockedCount,
                emailsReported: reportedCount,
                emailsBypassed: bypassedCount,
                cycleDuration: cycleDuration
            });
            
            // Keep only last 1000 performance records
            if (this.stats.performanceHistory.length > 1000) {
                this.stats.performanceHistory = this.stats.performanceHistory.slice(-1000);
            }
            
            // Calculate metrics
            this.calculateMetrics(emails);
            
            this.saveMetrics();
            
            this.log(`Cycle complete: ${analyzedCount} analyzed, ${blockedCount} blocked, ${reportedCount} reported, ${bypassedCount} bypassed (${cycleDuration}ms)`);
            
            return {
                success: true,
                analyzed: analyzedCount,
                blocked: blockedCount,
                reported: reportedCount,
                bypassed: bypassedCount,
                cycleDuration
            };
        } catch (error) {
            this.log(`Cycle error: ${error.message}`, 'ERROR');
            this.stats.totalCycles++;
            this.stats.lastCycleTime = new Date().toISOString();
            this.saveMetrics();
            throw error;
        }
    }

    calculateMetrics(emails) {
        const total = emails.length;
        const blocked = emails.filter(e => e.status === 'blocked').length;
        const reported = emails.filter(e => e.status === 'reported').length;
        const detected = blocked + reported;
        const bypassed = emails.filter(e => e.status === 'delivered').length;
        
        // Detection and bypass rates
        this.stats.detectionRate = total > 0 ? ((detected / total) * 100).toFixed(1) : 0;
        this.stats.bypassRate = total > 0 ? ((bypassed / total) * 100).toFixed(1) : 0;
        
        // Average response time
        const detectedWithTime = emails.filter(e => 
            (e.status === 'blocked' || e.status === 'reported') && 
            e.detectionTime !== undefined
        );
        this.stats.avgResponseTime = detectedWithTime.length > 0
            ? detectedWithTime.reduce((sum, e) => sum + e.detectionTime, 0) / detectedWithTime.length
            : 0;
        
        // Average leakage risk (risk of bypassed emails)
        const bypassedEmails = emails.filter(e => e.status === 'delivered' && e.riskScore !== undefined);
        this.stats.avgLeakageRisk = bypassedEmails.length > 0
            ? bypassedEmails.reduce((sum, e) => sum + (e.riskScore || 0), 0) / bypassedEmails.length
            : 0;
        
        // ML accuracy (average confidence)
        const mlClassified = emails.filter(e => e.mlClassification && e.mlClassification.confidence !== undefined);
        this.stats.mlAccuracy = mlClassified.length > 0
            ? (mlClassified.reduce((sum, e) => sum + (e.mlClassification.confidence || 0), 0) / mlClassified.length * 100).toFixed(1)
            : 0;
    }

    async run() {
        if (this.isRunning) {
            this.log('Defense agent is already running', 'WARN');
            return;
        }

        this.isRunning = true;
        this.log(`🛡️ Autonomous Defense Agent started (${CONFIG.AGENT_TYPE})`);
        this.log(`Industry URL: ${CONFIG.INDUSTRY_URL}`);
        this.log(`Cycle interval: ${CONFIG.CYCLE_INTERVAL_SECONDS} seconds`);
        this.log(`Inbox file: ${CONFIG.INBOX_FILE}`);

        // Run initial cycle
        await this.executeDefenseCycle();

        // Set up continuous execution
        const intervalMs = CONFIG.CYCLE_INTERVAL_SECONDS * 1000;
        
        const runCycle = async () => {
            if (!this.isRunning) return;
            
            try {
                await this.executeDefenseCycle();
            } catch (error) {
                this.log(`Cycle error: ${error.message}`, 'ERROR');
            }
        };

        // Run cycles at intervals
        this.cycleInterval = setInterval(runCycle, intervalMs);

        // Handle graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    shutdown() {
        this.log('Shutting down defense agent...');
        this.isRunning = false;
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
        }
        this.saveMetrics();
        this.log('Defense agent stopped');
        process.exit(0);
    }

    getStats() {
        const uptime = Date.now() - new Date(this.stats.startTime).getTime();
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
            ...this.stats,
            uptime: {
                days,
                hours,
                minutes,
                totalMs: uptime
            },
            isRunning: this.isRunning
        };
    }
}

// Start the defense agent
if (require.main === module) {
    const agent = new AutonomousDefenseAgent();
    agent.run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = AutonomousDefenseAgent;

