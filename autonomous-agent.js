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

Requirements:
- Use the recipient's actual name: ${persona.name}
- Reference their specific admin role: ${persona.role}
- Mention their company: ${persona.company}
- Create ${urgencyText} urgency around system security or compliance
- Include admin-specific technical details
- Keep it professional and believable
- Include a clear call-to-action (clicking links, providing credentials, approving invoices)

IMPORTANT: You must respond with ONLY valid JSON, no additional text before or after. Use this exact format:
{
    "subject": "Urgent: System Maintenance Required - ${persona.company}",
    "content": "Dear ${persona.name},\\n\\nAs ${persona.role} at ${persona.company}, we need immediate access to your admin systems for critical maintenance. Please review the attached documentation and provide your administrative credentials.\\n\\nBest regards,\\nIT Operations Team",
    "sender": "IT Operations Team"
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

            // Calculate risk score (simplified version)
            const riskScore = this.calculateRiskScore(emailData, strategy);

            return {
                id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                subject: emailData.subject,
                content: emailData.content,
                sender: emailData.sender || 'IT Operations Team',
                senderEmail: this.generateSenderEmail(strategy),
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
        const domains = [
            'it-ops-support.com',
            'system-maintenance.net',
            'security-alerts.org',
            'vendor-services.com',
            'tech-support-solutions.net'
        ];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        return `support@${randomDomain}`;
    }

    async executeAttackCycle() {
        this.log(`Starting attack cycle #${this.stats.totalCycles + 1}`);
        const cycleStartTime = Date.now();
        
        // Select random targets
        const shuffled = [...TARGET_PERSONAS].sort(() => 0.5 - Math.random());
        const selectedTargets = shuffled.slice(0, CONFIG.MAX_TARGETS_PER_CYCLE);
        
        // Get current strategy
        const strategy = ATTACK_STRATEGIES[this.currentStrategyIndex];
        this.currentStrategyIndex = (this.currentStrategyIndex + 1) % ATTACK_STRATEGIES.length;
        
        this.log(`Targeting ${selectedTargets.length} personas with ${strategy.attackLevel} attack using ${strategy.model}`);
        
        const generatedEmails = [];
        let successCount = 0;
        let failCount = 0;

        for (const persona of selectedTargets) {
            try {
                const email = await this.generatePhishingEmail(persona, strategy);
                generatedEmails.push(email);
                successCount++;
                this.log(`✓ Generated email for ${persona.name}: "${email.subject}"`);
                
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

        // Record performance
        this.stats.performanceHistory.push({
            timestamp: new Date().toISOString(),
            cycleNumber: this.stats.totalCycles,
            emailsGenerated: generatedEmails.length,
            successRate: selectedTargets.length > 0 ? (successCount / selectedTargets.length * 100).toFixed(2) : 0,
            cycleDuration: cycleDuration,
            strategy: strategy
        });

        // Keep only last 1000 performance records
        if (this.stats.performanceHistory.length > 1000) {
            this.stats.performanceHistory = this.stats.performanceHistory.slice(-1000);
        }

        this.saveMetrics();

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
                    // Update agent stats with attack success metrics
                    this.stats.emailsBypassed = data.metrics.bypassed || 0;
                    this.stats.emailsDetected = data.metrics.detected || 0;
                    this.stats.emailsClicked = data.metrics.emailsClicked || 0;
                    
                    // Calculate rates
                    const totalEmails = data.metrics.totalEmails || 0;
                    if (totalEmails > 0) {
                        this.stats.bypassRate = parseFloat(((data.metrics.bypassed / totalEmails) * 100).toFixed(2));
                        this.stats.clickRate = parseFloat(data.metrics.clickRate || 0);
                    }
                    
                    // Save updated metrics
                    this.saveMetrics();
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

