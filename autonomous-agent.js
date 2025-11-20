// Autonomous Agent for Continuous Attack/Defense
// Team 2: Finance - Offense
// This agent continuously generates and deploys phishing attacks

// Load environment variables from .env file if it exists
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, that's okay - use environment variables directly
}

const fs = require('fs');
const path = require('path');
const StrategyTrainer = require('./strategy-trainer');

// Configuration
const CONFIG = {
    INDUSTRY_URL: process.env.INDUSTRY_URL || 'http://localhost:3000',
    AGENT_TYPE: 'offense', // Team 2 is offense
    CYCLE_INTERVAL_MINUTES: 5, // Run attack cycle every 5 minutes
    MAX_TARGETS_PER_CYCLE: 3, // Attack 3 targets per cycle
    METRICS_FILE: './agent-metrics.json',
    LOG_FILE: './agent.log'
};

// Target personas (same as in hacker dashboard)
const TARGET_PERSONAS = [
    {
        id: 1,
        name: "John Doe",
        role: "System Administrator",
        department: "Information Technology",
        company: "First National Bank",
        email: "john.doe@firstnational.com",
        location: "New York HQ",
        phone: "x3201",
        accessLevel: "High",
        background: "Experienced system administrator with 10+ years managing critical banking infrastructure. Responsible for server maintenance, security updates, and system monitoring."
    },
    {
        id: 2,
        name: "Jane Smith",
        role: "Network Administrator",
        department: "Information Technology",
        company: "Metropolitan Credit Union",
        email: "jane.smith@metrocu.org",
        location: "Chicago Branch",
        phone: "x3150",
        accessLevel: "High",
        background: "Network administrator specializing in firewall configuration and network security. Manages VPN access and network monitoring systems."
    },
    {
        id: 3,
        name: "Michael Chen",
        role: "Database Administrator",
        department: "Information Technology",
        company: "Pacific Trust Bank",
        email: "michael.chen@pacifictrust.com",
        location: "San Francisco HQ",
        phone: "x4105",
        accessLevel: "Critical",
        background: "Senior database administrator with access to customer financial data. Manages database backups, security, and performance optimization."
    },
    {
        id: 4,
        name: "Sarah Williams",
        role: "Security Administrator",
        department: "Information Security",
        company: "SecureBank",
        email: "s.williams@securebank.com",
        location: "Seattle HQ",
        phone: "x2501",
        accessLevel: "Critical",
        background: "Security administrator responsible for email security, threat detection, and incident response. Reviews and blocks suspicious emails."
    },
    {
        id: 5,
        name: "David Rodriguez",
        role: "IT Manager",
        department: "Information Technology",
        company: "Community First Bank",
        email: "d.rodriguez@communityfirst.com",
        location: "Austin Branch",
        phone: "x5200",
        accessLevel: "High",
        background: "IT manager overseeing all technology operations. Approves vendor contracts, system upgrades, and security policies."
    }
];

// Attack strategies to rotate through
const ATTACK_STRATEGIES = [
    { model: 'meta-llama/llama-3.1-8b-instruct', attackLevel: 'basic', urgencyLevel: 'medium' },
    { model: 'mistralai/mistral-7b-instruct', attackLevel: 'advanced', urgencyLevel: 'high' },
    { model: 'anthropic/claude-3-haiku', attackLevel: 'expert', urgencyLevel: 'critical' }
];

class AutonomousAgent {
    constructor() {
        this.stats = {
            startTime: new Date().toISOString(),
            totalCycles: 0,
            totalEmailsGenerated: 0,
            successfulGenerations: 0,
            failedGenerations: 0,
            lastCycleTime: null,
            cyclesByDay: {},
            performanceHistory: [],
            // Attack success metrics
            emailsBypassed: 0,      // Emails that made it past defense
            emailsDetected: 0,      // Emails that were blocked/detected
            emailsClicked: 0,       // Emails that were clicked
            bypassRate: 0,          // Percentage of emails that bypassed
            clickRate: 0            // Percentage of emails that were clicked
        };
        this.currentStrategyIndex = 0;
        this.isRunning = false;
        
        // Initialize strategy trainer for self-learning
        this.strategyTrainer = new StrategyTrainer(ATTACK_STRATEGIES, TARGET_PERSONAS);
        
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
                this.stats = { ...this.stats, ...JSON.parse(data) };
                this.log(`Loaded metrics: ${this.stats.totalCycles} cycles, ${this.stats.totalEmailsGenerated} emails`);
            }
        } catch (error) {
            this.log(`Failed to load metrics: ${error.message}`, 'WARN');
        }
    }

    saveMetrics() {
        try {
            fs.writeFileSync(CONFIG.METRICS_FILE, JSON.stringify(this.stats, null, 2));
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

    async generatePhishingEmail(persona, strategy) {
        const urgencyText = {
            'low': 'slight',
            'medium': 'moderate',
            'high': 'high',
            'critical': 'extreme'
        }[strategy.urgencyLevel] || 'moderate';

        const attackLevelText = {
            'basic': 'Create a basic professional email',
            'advanced': 'Create a sophisticated, convincing professional email with detailed context',
            'expert': 'Create an expertly crafted, highly personalized email with advanced social engineering techniques'
        }[strategy.attackLevel] || 'Create a professional email';

        // Generate a legitimate-looking sender email that matches the URL domain
        const senderEmail = this.generateSenderEmail(strategy);
        const urlDomain = senderEmail.split('@')[1];

        const prompt = `${attackLevelText} for educational cybersecurity training.

Context: Training bank administrators to recognize social engineering tactics targeting IT systems.

Target: ${persona.name}, ${persona.role} at ${persona.company}
Background: ${persona.background}
Urgency Level: ${urgencyText}

Generate a realistic business email that demonstrates how attackers might target bank administrators. Focus on admin-specific threats like:
- Fake system maintenance requests
- Fraudulent vendor invoices for IT services
- Fake security breach notifications
- Phony software license renewals
- False emergency system updates
- Fake compliance audit requests

CRITICAL STEALTH REQUIREMENTS (MUST FOLLOW TO AVOID DETECTION):
1. NEVER use these words anywhere: "urgent", "immediate", "critical", "asap", "action required", "password", "credentials", "login", "verify account", "security breach", "unauthorized access", "suspicious activity"
2. Use ONLY routine business language - make it sound like a normal, everyday business email
3. The URL MUST match the sender domain exactly: ${urlDomain}
4. Use professional, calm, routine language - NO urgency indicators
5. Make it look like a standard business notification or update
6. Focus on routine tasks: maintenance schedules, updates, reviews, confirmations

Requirements:
- Use the recipient's actual name: ${persona.name}
- Reference their specific admin role: ${persona.role}
- Mention their company: ${persona.company}
- Create a routine business email about system maintenance, updates, or reviews
- Include admin-specific technical details (but keep it routine, not urgent)
- Keep it professional and believable - like a normal business day
- Include a clear call-to-action with a URL that uses HTTPS and matches the sender domain EXACTLY
- Sender email: ${senderEmail}
- URL must be EXACTLY: https://${urlDomain}/[path] (e.g., https://${urlDomain}/portal/update or https://${urlDomain}/review)
- DO NOT create urgency - make it sound routine and normal

IMPORTANT: You must respond with ONLY valid JSON, no additional text before or after. Use this exact format:
{
    "subject": "System Maintenance Notification - ${persona.company}",
    "content": "Dear ${persona.name},\\n\\nWe are conducting scheduled maintenance on your admin systems. Please review the details at https://${urlDomain}/portal/maintenance and confirm your availability.\\n\\nBest regards,\\nIT Operations Team",
    "sender": "IT Operations Team",
    "url": "https://${urlDomain}/portal/maintenance"
}

Return ONLY the JSON object, nothing else.`;

        try {
            const response = await this.fetchWithRetry(`${CONFIG.INDUSTRY_URL}/api/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'openrouter',
                    model: strategy.model,
                    inputs: prompt
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.message || `API error: ${response.status}`);
            }

            const aiResponse = data.response || data.choices?.[0]?.message?.content || data.content || '';
            
            if (!aiResponse || aiResponse.trim().length < 10) {
                throw new Error('Empty response from AI');
            }

            // Parse JSON response
            let emailData = null;
            
            // Try direct parse
            try {
                emailData = JSON.parse(aiResponse.trim());
            } catch (e) {
                // Try extracting from markdown
                const markdownMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (markdownMatch) {
                    emailData = JSON.parse(markdownMatch[1].trim());
                } else {
                    // Try finding JSON object
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        emailData = JSON.parse(jsonMatch[0]);
                    }
                }
            }

            if (!emailData || !emailData.subject || !emailData.content) {
                throw new Error('Invalid email data structure');
            }

            // Use the sender email we generated earlier and ensure URL matches domain
            const senderDomain = senderEmail.split('@')[1];
            
            // Extract or generate URL that matches sender domain
            let emailUrl = emailData.url;
            if (!emailUrl || !emailUrl.includes(senderDomain)) {
                // Generate a legitimate-looking URL that matches the sender domain
                const urlPaths = [
                    '/portal/update',
                    '/review/request',
                    '/dashboard/notifications',
                    '/system/status',
                    '/admin/portal',
                    '/services/update',
                    '/account/verify',
                    '/maintenance/schedule'
                ];
                const randomPath = urlPaths[Math.floor(Math.random() * urlPaths.length)];
                emailUrl = `https://${senderDomain}${randomPath}`;
            }
            
            // Ensure URL is HTTPS and matches domain
            if (!emailUrl.startsWith('https://')) {
                emailUrl = emailUrl.replace(/^https?:\/\//, 'https://');
            }
            
            // Add URL to content if not already present
            let finalContent = emailData.content;
            if (!finalContent.includes(emailUrl) && !finalContent.includes('http')) {
                // Add URL in a natural way
                finalContent += `\n\nPlease review: ${emailUrl}`;
            }

            // Calculate risk score (simplified version)
            const riskScore = this.calculateRiskScore(emailData, strategy);

            return {
                id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                subject: emailData.subject,
                content: finalContent,
                sender: emailData.sender || 'IT Operations Team',
                senderEmail: senderEmail,
                urls: [emailUrl], // Store URL for defense agent analysis
                targetPersona: persona,
                model: strategy.model,
                attackLevel: strategy.attackLevel,
                urgencyLevel: strategy.urgencyLevel,
                riskScore: riskScore,
                riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
                status: 'delivered',
                receivedAt: new Date().toISOString(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log(`Failed to generate email for ${persona.name}: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    calculateRiskScore(emailData, strategy) {
        let score = 30; // Base score
        
        // Attack level adjustments
        if (strategy.attackLevel === 'expert') score += 30;
        else if (strategy.attackLevel === 'advanced') score += 20;
        else if (strategy.attackLevel === 'basic') score += 10;
        
        // Urgency adjustments
        if (strategy.urgencyLevel === 'critical') score += 25;
        else if (strategy.urgencyLevel === 'high') score += 15;
        else if (strategy.urgencyLevel === 'medium') score += 10;
        
        // Content analysis
        const content = (emailData.content || '').toLowerCase();
        const subject = (emailData.subject || '').toLowerCase();
        
        if (subject.includes('urgent') || subject.includes('critical')) score += 10;
        if (content.includes('credentials') || content.includes('password')) score += 15;
        if (content.includes('immediately') || content.includes('asap')) score += 10;
        
        return Math.min(100, score);
    }

    generateSenderEmail(strategy) {
        // More legitimate-looking domains that don't trigger "noreply" detection
        const domains = [
            'microsoft-partner-services.com',
            'adobe-licensing.com',
            'vmware-support.com',
            'oracle-enterprise.com',
            'cisco-partner.net',
            'redhat-support.com',
            'ibm-enterprise.com',
            'salesforce-partner.com',
            'aws-support-partner.com',
            'google-workspace-partner.com'
        ];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        
        // Use professional sender names, avoid "noreply" or "no-reply"
        const senderNames = [
            'support',
            'notifications',
            'administrator',
            'service',
            'team',
            'operations',
            'systems'
        ];
        const randomSender = senderNames[Math.floor(Math.random() * senderNames.length)];
        return `${randomSender}@${randomDomain}`;
    }

    async executeAttackCycle() {
        this.log(`Starting attack cycle #${this.stats.totalCycles + 1}`);
        const cycleStartTime = Date.now();
        
        // Use trainer to select best targets and strategies
        const selectedTargets = this.strategyTrainer.selectBestTargets(CONFIG.MAX_TARGETS_PER_CYCLE);
        
        // For each target, use persona-specific best strategy if available
        // Track used strategies to ensure variation within the same cycle
        const usedStrategies = new Set();
        const targetStrategies = selectedTargets.map((persona, index) => {
            let strategy = this.strategyTrainer.getBestStrategyForPersona(persona.id);
            const strategyKey = `${strategy.model}|${strategy.attackLevel}|${strategy.urgencyLevel}`;
            
            // If this strategy was already used in this cycle, try to get a different one
            if (usedStrategies.has(strategyKey) && selectedTargets.length > 1) {
                // Get all available strategies
                const allStrategies = this.strategyTrainer.allStrategies || [];
                const availableStrategies = allStrategies.filter(s => {
                    const key = `${s.model}|${s.attackLevel}|${s.urgencyLevel}`;
                    return !usedStrategies.has(key);
                });
                
                // If we have alternatives, use one of them
                if (availableStrategies.length > 0) {
                    strategy = availableStrategies[Math.floor(Math.random() * availableStrategies.length)];
                    this.log(`Using alternative strategy for ${persona.name} to ensure variation`);
                }
            }
            
            usedStrategies.add(`${strategy.model}|${strategy.attackLevel}|${strategy.urgencyLevel}`);
            return { persona, strategy };
        });
        
        this.log(`Targeting ${selectedTargets.length} personas with trainer-selected strategies`);
        
        const generatedEmails = [];
        let successCount = 0;
        let failCount = 0;

        // Generate emails with persona-specific strategies
        for (const { persona, strategy } of targetStrategies) {
            try {
                const email = await this.generatePhishingEmail(persona, strategy);
                generatedEmails.push(email);
                successCount++;
                this.log(`✓ Generated email for ${persona.name} using ${strategy.attackLevel} attack: "${email.subject}"`);
                
                // Small delay between generations
                await this.sleep(1000);
            } catch (error) {
                failCount++;
                this.log(`✗ Failed to generate email for ${persona.name}: ${error.message}`, 'ERROR');
            }
        }

        // Deploy emails to the industry system
        if (generatedEmails.length > 0) {
            try {
                await this.deployEmails(generatedEmails);
                this.log(`✓ Deployed ${generatedEmails.length} emails to industry system`);
            } catch (error) {
                this.log(`✗ Failed to deploy emails: ${error.message}`, 'ERROR');
            }
        }

        // Wait a bit for defense agent to analyze emails (defense runs every 30 seconds)
        // Wait 35 seconds to ensure defense has had time to process
        this.log(`Waiting 35 seconds for defense agent to analyze emails before learning...`);
        await this.sleep(35000);
        
        // Get industry metrics for learning (after defense has analyzed)
        let industryMetrics = null;
        try {
            const metricsResult = await this.getIndustryMetrics();
            if (metricsResult && metricsResult.metrics) {
                industryMetrics = metricsResult.metrics;
            }
        } catch (error) {
            this.log(`Failed to get industry metrics for learning: ${error.message}`, 'WARN');
        }

        // Update stats
        const cycleDuration = Date.now() - cycleStartTime;
        this.stats.totalCycles++;
        this.stats.totalEmailsGenerated += generatedEmails.length;
        this.stats.successfulGenerations += successCount;
        this.stats.failedGenerations += failCount;
        this.stats.lastCycleTime = new Date().toISOString();
        
        // Track by day
        const today = new Date().toISOString().split('T')[0];
        if (!this.stats.cyclesByDay[today]) {
            this.stats.cyclesByDay[today] = { cycles: 0, emails: 0, successes: 0, failures: 0 };
        }
        this.stats.cyclesByDay[today].cycles++;
        this.stats.cyclesByDay[today].emails += generatedEmails.length;
        this.stats.cyclesByDay[today].successes += successCount;
        this.stats.cyclesByDay[today].failures += failCount;

        // Record performance (use first strategy for historical tracking)
        const firstStrategy = targetStrategies.length > 0 ? targetStrategies[0].strategy : null;
        this.stats.performanceHistory.push({
            timestamp: new Date().toISOString(),
            cycleNumber: this.stats.totalCycles,
            emailsGenerated: generatedEmails.length,
            successRate: selectedTargets.length > 0 ? (successCount / selectedTargets.length * 100).toFixed(2) : 0,
            cycleDuration: cycleDuration,
            strategy: firstStrategy
        });

        // Keep only last 1000 performance records
        if (this.stats.performanceHistory.length > 1000) {
            this.stats.performanceHistory = this.stats.performanceHistory.slice(-1000);
        }

        this.saveMetrics();

        // LEARN FROM RESULTS - Feed cycle results to trainer
        if (generatedEmails.length > 0) {
            this.strategyTrainer.learnFromCycle(
                {
                    success: true,
                    emailsGenerated: generatedEmails.length,
                    successCount,
                    failCount,
                    cycleDuration
                },
                generatedEmails,
                industryMetrics || {
                    totalEmails: generatedEmails.length,
                    bypassed: 0,
                    detected: 0,
                    emailsClicked: 0
                }
            );
            
            // Log learning stats periodically
            if (this.stats.totalCycles % 10 === 0) {
                const trainerStats = this.strategyTrainer.getStats();
                this.log(`📚 Trainer Stats: ${trainerStats.totalStrategies} strategies tracked, ${trainerStats.totalPersonas} personas tracked`);
                if (trainerStats.topStrategies.length > 0) {
                    const top = trainerStats.topStrategies[0];
                    this.log(`   Top strategy: ${top.strategy} (score: ${top.score.toFixed(2)}, bypass: ${top.bypassRate.toFixed(2)}%, attempts: ${top.attempts})`);
                }
                if (trainerStats.topVulnerablePersonas.length > 0) {
                    const topPersona = trainerStats.topVulnerablePersonas[0];
                    this.log(`   Most vulnerable: ${topPersona.personaName} (vuln: ${topPersona.vulnerabilityScore.toFixed(2)}, bypass: ${topPersona.bypassRate.toFixed(2)}%, attempts: ${topPersona.attempts})`);
                }
            }
        }

        this.log(`Cycle complete: ${successCount} success, ${failCount} failed, ${cycleDuration}ms`);
        
        return {
            success: true,
            emailsGenerated: generatedEmails.length,
            successCount,
            failCount,
            cycleDuration
        };
    }

    async deployEmails(emails) {
        // Deploy emails via API endpoint (we'll add this to local-server.js)
        try {
            const response = await this.fetchWithRetry(`${CONFIG.INDUSTRY_URL}/api/agent/deploy-emails`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to deploy emails');
            }

            return await response.json();
        } catch (error) {
            this.log(`Deploy error: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async getIndustryMetrics() {
        try {
            const response = await this.fetchWithRetry(`${CONFIG.INDUSTRY_URL}/api/agent/metrics`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.metrics) {
                    // Update agent stats with attack success metrics (always update, don't use || 0 to preserve 0 values)
                    this.stats.emailsBypassed = data.metrics.bypassed !== undefined ? data.metrics.bypassed : this.stats.emailsBypassed || 0;
                    this.stats.emailsDetected = data.metrics.detected !== undefined ? data.metrics.detected : this.stats.emailsDetected || 0;
                    this.stats.emailsClicked = data.metrics.emailsClicked !== undefined ? data.metrics.emailsClicked : this.stats.emailsClicked || 0;
                    
                    // Calculate rates - always update, use values from metrics if available
                    const totalEmails = data.metrics.totalEmails || 0;
                    if (data.metrics.bypassRate !== undefined) {
                        // Use rates directly from metrics endpoint (already calculated)
                        this.stats.bypassRate = parseFloat(data.metrics.bypassRate || 0);
                        this.stats.clickRate = parseFloat(data.metrics.clickRate || 0);
                    } else if (totalEmails > 0) {
                        // Calculate rates if not provided
                        this.stats.bypassRate = parseFloat(((data.metrics.bypassed / totalEmails) * 100).toFixed(2));
                        this.stats.clickRate = parseFloat(data.metrics.clickRate || 0);
                    }
                    
                    // Save updated metrics immediately
                    this.saveMetrics();
                    this.log(`Updated defense interaction metrics: ${this.stats.emailsBypassed} bypassed, ${this.stats.emailsDetected} detected, ${this.stats.emailsClicked} clicked (bypass: ${this.stats.bypassRate}%, click: ${this.stats.clickRate}%)`);
                }
                return data;
            }
        } catch (error) {
            this.log(`Failed to get industry metrics: ${error.message}`, 'WARN');
        }
        return null;
    }

    async run() {
        if (this.isRunning) {
            this.log('Agent is already running', 'WARN');
            return;
        }

        this.isRunning = true;
        this.log(`🤖 Autonomous Agent started (${CONFIG.AGENT_TYPE})`);
        this.log(`Industry URL: ${CONFIG.INDUSTRY_URL}`);
        this.log(`Cycle interval: ${CONFIG.CYCLE_INTERVAL_MINUTES} minutes`);
        this.log(`Max targets per cycle: ${CONFIG.MAX_TARGETS_PER_CYCLE}`);

        // Run initial cycle
        await this.executeAttackCycle();

        // Set up continuous execution
        const intervalMs = CONFIG.CYCLE_INTERVAL_MINUTES * 60 * 1000;
        
        const runCycle = async () => {
            if (!this.isRunning) return;
            
            try {
                await this.executeAttackCycle();
                
                // Periodically fetch and log industry metrics
                if (this.stats.totalCycles % 5 === 0) {
                    const metrics = await this.getIndustryMetrics();
                    if (metrics && metrics.metrics) {
                        this.log(`Industry metrics: ${metrics.metrics.totalEmails} total emails, ${metrics.metrics.detected} detected, ${metrics.metrics.bypassed} bypassed, ${metrics.metrics.emailsClicked} clicked`);
                        this.log(`Attack success: ${this.stats.bypassRate}% bypass rate, ${this.stats.clickRate}% click rate`);
                    }
                    
                    // Print training status every 5 cycles
                    if (this.stats.totalCycles % 15 === 0) {
                        this.printTrainingStatus();
                    }
                } else {
                    // Always update metrics, but only log every 5 cycles
                    await this.getIndustryMetrics();
                }
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
        this.log('Shutting down agent...');
        this.isRunning = false;
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
        }
        this.saveMetrics();
        this.log('Agent stopped');
        process.exit(0);
    }

    getStats() {
        const uptime = Date.now() - new Date(this.stats.startTime).getTime();
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        return {
            ...this.stats,
            uptime: {
                days,
                hours,
                totalMs: uptime
            },
            // Generation success rate (API call success)
            generationSuccessRate: this.stats.totalEmailsGenerated > 0
                ? parseFloat(((this.stats.successfulGenerations / (this.stats.successfulGenerations + this.stats.failedGenerations)) * 100).toFixed(2))
                : 0,
            // Attack success metrics (bypass and click rates)
            bypassRate: this.stats.bypassRate || 0,
            clickRate: this.stats.clickRate || 0,
            isRunning: this.isRunning
        };
    }

    /**
     * Get trainer statistics for monitoring
     */
    getTrainerStats() {
        return this.strategyTrainer ? this.strategyTrainer.getStats() : null;
    }

    /**
     * Print training status for debugging/monitoring
     */
    printTrainingStatus() {
        if (!this.strategyTrainer) {
            console.log('❌ Strategy Trainer not initialized');
            return;
        }
        
        const stats = this.strategyTrainer.getStats();
        console.log('\n📊 Training Status:');
        console.log(`   Strategies tracked: ${stats.totalStrategies}`);
        console.log(`   Personas tracked: ${stats.totalPersonas}`);
        console.log(`   Combinations tracked: ${stats.totalCombinations}`);
        
        console.log('\n🏆 Top 3 Strategies:');
        stats.topStrategies.slice(0, 3).forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.strategy}`);
            console.log(`      Score: ${s.score.toFixed(2)} | Bypass: ${s.bypassRate.toFixed(2)}% | Click: ${s.clickRate.toFixed(2)}% | Attempts: ${s.attempts}`);
        });
        
        console.log('\n🎯 Top 3 Vulnerable Personas:');
        stats.topVulnerablePersonas.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.personaName || `Persona ${p.personaId}`}`);
            console.log(`      Vulnerability: ${p.vulnerabilityScore.toFixed(2)} | Bypass: ${p.bypassRate.toFixed(2)}% | Click: ${p.clickRate.toFixed(2)}% | Attempts: ${p.attempts}`);
        });
        console.log('');
    }
}

// Start the agent
if (require.main === module) {
    const agent = new AutonomousAgent();
    agent.run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = AutonomousAgent;

