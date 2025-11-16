// Load environment variables from .env file if it exists
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, that's okay - use environment variables directly
}

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000; // Default to 3000, override with PORT env var

// ============================================================================
// User Engagement Simulation Engine
// ============================================================================

// Store events in memory (for demo purposes)
// In production, use a database (SQLite, PostgreSQL, etc.)
const events = [];

// Simulation parameters (based on real-world phishing statistics)
const SIMULATION_PARAMS = {
    // Probability an email will be opened
    pOpen: {
        basic: 0.25,      // 25% for basic phishing
        advanced: 0.45,   // 45% for advanced (spear-phishing)
        expert: 0.54      // 54% for expert (AI-generated spear-phishing)
    },
    // Probability a link will be clicked IF email was opened
    pClickIfOpen: {
        basic: 0.18,      // 18% click if opened (basic)
        advanced: 0.35,   // 35% click if opened (advanced)
        expert: 0.54      // 54% click if opened (expert) - matches AI-generated stat
    },
    // Probability user reports email BEFORE clicking (security-conscious)
    pReportBeforeClick: 0.08,  // 8% report before clicking
    // Probability user reports email AFTER clicking (realized it's phishing)
    pReportAfterClick: 0.12, // 12% report after clicking
    // Phantom click probability (scanner/bot clicks)
    pPhantomClick: 0.01,
    // Time delays (in minutes, exponential distribution)
    meanOpenDelay: 10,   // Mean 10 minutes to open
    meanClickDelay: 6,   // Mean 6 minutes after open to click
    meanReportDelay: 4   // Mean 4 minutes to report
};

// Generate exponential delay (realistic user behavior timing)
function getExponentialDelay(meanMinutes) {
    // Exponential distribution: -mean * ln(1 - random)
    // This gives realistic delays where most actions happen quickly, but some take longer
    return -meanMinutes * Math.log(1 - Math.random());
}

// Simulate user engagement flow
function simulateUserFlow(emailId, userId, campaignId, attackLevel, metadata = {}) {
    const level = attackLevel || 'advanced';
    const pOpen = SIMULATION_PARAMS.pOpen[level] || SIMULATION_PARAMS.pOpen.advanced;
    const pClickIfOpen = SIMULATION_PARAMS.pClickIfOpen[level] || SIMULATION_PARAMS.pClickIfOpen.advanced;
    
    // Log "sent" event immediately
    const sentEvent = {
        event: 'sent',
        emailId,
        userId,
        campaignId,
        attackLevel: level,
        timestamp: Date.now(),
        simulated: true,
        metadata
    };
    events.push(sentEvent);
    console.log(`[Simulation] Logged sent event for email ${emailId}`);
    
    // Decide if user will open email
    if (Math.random() < pOpen) {
        // Calculate open delay (exponential distribution)
        const openDelayMs = getExponentialDelay(SIMULATION_PARAMS.meanOpenDelay) * 60 * 1000;
        
        setTimeout(() => {
            // Log "opened" event
            const openedEvent = {
                event: 'opened',
                emailId,
                userId,
                campaignId,
                timestamp: Date.now(),
                simulated: true,
                timeSinceSent: (Date.now() - sentEvent.timestamp) / 1000 / 60 // minutes
            };
            events.push(openedEvent);
            console.log(`[Simulation] Logged opened event for email ${emailId} after ${openedEvent.timeSinceSent.toFixed(1)} minutes`);
            
            // Decide if user will click link (only if opened)
            if (Math.random() < pClickIfOpen) {
                // Calculate click delay (exponential distribution, after open)
                const clickDelayMs = getExponentialDelay(SIMULATION_PARAMS.meanClickDelay) * 60 * 1000;
                
                setTimeout(() => {
                    // Log "clicked" event
                    const clickedEvent = {
                        event: 'clicked',
                        emailId,
                        userId,
                        campaignId,
                        timestamp: Date.now(),
                        simulated: true,
                        timeSinceOpened: clickDelayMs / 1000 / 60, // minutes
                        timeSinceSent: (Date.now() - sentEvent.timestamp) / 1000 / 60 // minutes
                    };
                    events.push(clickedEvent);
                    console.log(`[Simulation] Logged clicked event for email ${emailId} after ${clickedEvent.timeSinceSent.toFixed(1)} minutes`);
                    
                    // Some users report after clicking (realized it's phishing)
                    if (Math.random() < SIMULATION_PARAMS.pReportAfterClick) {
                        const reportDelayMs = getExponentialDelay(SIMULATION_PARAMS.meanReportDelay) * 60 * 1000;
                        
                        setTimeout(() => {
                            const reportedEvent = {
                                event: 'reported',
                                emailId,
                                userId,
                                campaignId,
                                timestamp: Date.now(),
                                simulated: true,
                                reportedAfterClick: true,
                                timeSinceSent: (Date.now() - sentEvent.timestamp) / 1000 / 60 // minutes
                            };
                            events.push(reportedEvent);
                            console.log(`[Simulation] Logged reported event for email ${emailId} after click`);
                        }, reportDelayMs);
                    }
                }, clickDelayMs);
            } else {
                // User opened but didn't click - some may report before clicking
                if (Math.random() < SIMULATION_PARAMS.pReportBeforeClick) {
                    const reportDelayMs = getExponentialDelay(SIMULATION_PARAMS.meanReportDelay) * 60 * 1000;
                    
                    setTimeout(() => {
                        const reportedEvent = {
                            event: 'reported',
                            emailId,
                            userId,
                            campaignId,
                            timestamp: Date.now(),
                            simulated: true,
                            reportedBeforeClick: true,
                            timeSinceSent: (Date.now() - sentEvent.timestamp) / 1000 / 60 // minutes
                        };
                        events.push(reportedEvent);
                        console.log(`[Simulation] Logged reported event for email ${emailId} before click`);
                    }, reportDelayMs);
                }
            }
        }, openDelayMs);
    } else {
        // User didn't open - but might have phantom click (scanner/bot)
        if (Math.random() < SIMULATION_PARAMS.pPhantomClick) {
            const phantomDelayMs = 1000 + Math.random() * 30000; // 1-30 seconds
            
            setTimeout(() => {
                const phantomEvent = {
                    event: 'clicked',
                    emailId,
                    userId,
                    campaignId,
                    timestamp: Date.now(),
                    simulated: true,
                    phantom: true, // Mark as phantom click
                    timeSinceSent: (Date.now() - sentEvent.timestamp) / 1000 / 60 // minutes
                };
                events.push(phantomEvent);
                console.log(`[Simulation] Logged phantom click event for email ${emailId}`);
            }, phantomDelayMs);
        }
    }
}

// Calculate metrics from events
function calculateMetrics(campaignId = null) {
    let filteredEvents = events;
    
    // Filter by campaign if provided
    if (campaignId) {
        filteredEvents = events.filter(e => e.campaignId === campaignId);
    }
    
    const sent = filteredEvents.filter(e => e.event === 'sent').length;
    const opened = filteredEvents.filter(e => e.event === 'opened').length;
    const clicked = filteredEvents.filter(e => e.event === 'clicked').length;
    const reported = filteredEvents.filter(e => e.event === 'reported').length;
    
    // Calculate rates
    const openRate = sent > 0 ? (opened / sent * 100) : 0;
    const clickRate = sent > 0 ? (clicked / sent * 100) : 0;
    const clickThroughRate = opened > 0 ? (clicked / opened * 100) : 0;
    const reportRate = sent > 0 ? (reported / sent * 100) : 0;
    
    // Calculate median time-to-click
    const clickedEvents = filteredEvents.filter(e => e.event === 'clicked' && e.timeSinceSent !== undefined);
    const clickTimes = clickedEvents.map(e => e.timeSinceSent).sort((a, b) => a - b);
    const medianTimeToClick = clickTimes.length > 0 
        ? clickTimes.length % 2 === 0
            ? (clickTimes[clickTimes.length / 2 - 1] + clickTimes[clickTimes.length / 2]) / 2
            : clickTimes[Math.floor(clickTimes.length / 2)]
        : 0;
    
    // Calculate average time-to-open
    const openedEvents = filteredEvents.filter(e => e.event === 'opened' && e.timeSinceSent !== undefined);
    const avgTimeToOpen = openedEvents.length > 0
        ? openedEvents.reduce((sum, e) => sum + e.timeSinceSent, 0) / openedEvents.length
        : 0;
    
    return {
        sent,
        opened,
        clicked,
        reported,
        openRate: parseFloat(openRate.toFixed(1)),
        clickRate: parseFloat(clickRate.toFixed(1)),
        clickThroughRate: parseFloat(clickThroughRate.toFixed(1)),
        reportRate: parseFloat(reportRate.toFixed(1)),
        medianTimeToClick: parseFloat(medianTimeToClick.toFixed(1)),
        avgTimeToOpen: parseFloat(avgTimeToOpen.toFixed(1)),
        timestamp: Date.now()
    };
}

// ============================================================================
// Middleware (must be before routes)
// ============================================================================

// Simple CORS for local testing
app.use((req, res, next) => {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// Parse JSON bodies
app.use(express.json());

// ============================================================================
// API Endpoints for User Engagement Simulation
// ============================================================================

// Endpoint: POST /events/generated
// Logs when an email is generated and starts user engagement simulation
app.post('/events/generated', (req, res) => {
    try {
        const { emailId, userId, campaignId, subject, attackLevel, metadata } = req.body;
        
        if (!emailId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: emailId'
            });
        }
        
        console.log(`[Events] Received generated event for email ${emailId}`);
        
        // Start simulation
        simulateUserFlow(
            emailId,
            userId || 'anonymous',
            campaignId || 'default',
            attackLevel || 'advanced',
            metadata || {}
        );
        
        res.json({
            success: true,
            message: 'Event logged and simulation started',
            emailId
        });
    } catch (error) {
        console.error('[Events] Error logging generated event:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /metrics/latest
// Returns current engagement metrics
app.get('/metrics/latest', (req, res) => {
    try {
        const campaignId = req.query.campaignId || null;
        const metrics = calculateMetrics(campaignId);
        
        res.json({
            success: true,
            metrics,
            totalEvents: events.length
        });
    } catch (error) {
        console.error('[Metrics] Error calculating metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /events
// Returns all events (for debugging)
app.get('/events', (req, res) => {
    try {
        const campaignId = req.query.campaignId || null;
        let filteredEvents = events;
        
        if (campaignId) {
            filteredEvents = events.filter(e => e.campaignId === campaignId);
        }
        
        res.json({
            success: true,
            events: filteredEvents,
            total: filteredEvents.length
        });
    } catch (error) {
        console.error('[Events] Error retrieving events:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: DELETE /events
// Clear all events (for testing/reset)
app.delete('/events', (req, res) => {
    try {
        const count = events.length;
        events.length = 0; // Clear array
        console.log(`[Events] Cleared ${count} events`);
        
        res.json({
            success: true,
            message: `Cleared ${count} events`
        });
    } catch (error) {
        console.error('[Events] Error clearing events:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================================================
// Agent API Endpoints (for autonomous agent communication)
// ============================================================================

// Endpoint: POST /api/agent/deploy-emails
// Allows the autonomous agent to deploy emails to the bank inbox
app.post('/api/agent/deploy-emails', (req, res) => {
    try {
        const { emails } = req.body;
        
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid emails array'
            });
        }

        // Load existing emails from localStorage simulation (using a JSON file)
        const inboxFile = './bank-inbox.json';
        let existingEmails = [];
        
        try {
            if (fs.existsSync(inboxFile)) {
                const data = fs.readFileSync(inboxFile, 'utf8');
                existingEmails = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading inbox file:', error);
        }

        // Add new emails and trigger user engagement simulation
        emails.forEach(email => {
            existingEmails.push(email);
            
            // Trigger user engagement simulation to track clicks
            if (email.id) {
                const userId = email.targetPersona?.name || 'admin';
                const campaignId = `agent-${Date.now()}`;
                const attackLevel = email.attackLevel || 'advanced';
                
                simulateUserFlow(
                    email.id,
                    userId,
                    campaignId,
                    attackLevel,
                    {
                        model: email.model,
                        strategy: email.strategy,
                        subject: email.subject
                    }
                );
            }
        });

        // Save back to file
        try {
            fs.writeFileSync(inboxFile, JSON.stringify(existingEmails, null, 2));
        } catch (error) {
            console.error('Error writing inbox file:', error);
        }

        // Also trigger browser localStorage update via events (if browsers are connected)
        // This is a simulation - in a real system, you'd use WebSockets or Server-Sent Events
        
        console.log(`[Agent] Deployed ${emails.length} emails to bank inbox`);
        
        res.json({
            success: true,
            message: `Deployed ${emails.length} emails`,
            totalEmails: existingEmails.length
        });
    } catch (error) {
        console.error('[Agent] Error deploying emails:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /api/agent/status
// Returns agent status and recent activity
app.get('/api/agent/status', (req, res) => {
    try {
        const agentMetricsFile = './agent-metrics.json';
        const inboxFile = './bank-inbox.json';
        
        let agentStatus = {
            isRunning: false,
            totalCycles: 0,
            totalEmailsGenerated: 0,
            lastCycleTime: null,
            uptime: null
        };
        
        let recentEmails = [];
        
        // Load agent metrics
        try {
            if (fs.existsSync(agentMetricsFile)) {
                const data = fs.readFileSync(agentMetricsFile, 'utf8');
                const metrics = JSON.parse(data);
                const startTime = new Date(metrics.startTime);
                const uptime = Date.now() - startTime.getTime();
                
                agentStatus = {
                    isRunning: true, // Assume running if metrics file exists and was recently updated
                    totalCycles: metrics.totalCycles || 0,
                    totalEmailsGenerated: metrics.totalEmailsGenerated || 0,
                    successfulGenerations: metrics.successfulGenerations || 0,
                    failedGenerations: metrics.failedGenerations || 0,
                    lastCycleTime: metrics.lastCycleTime,
                    startTime: metrics.startTime,
                    uptime: {
                        days: Math.floor(uptime / (1000 * 60 * 60 * 24)),
                        hours: Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                        minutes: Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
                    },
                    // Attack success metrics
                    emailsBypassed: metrics.emailsBypassed || 0,
                    emailsDetected: metrics.emailsDetected || 0,
                    emailsClicked: metrics.emailsClicked || 0,
                    bypassRate: metrics.bypassRate || 0,
                    clickRate: metrics.clickRate || 0
                };
            }
        } catch (error) {
            console.error('Error reading agent metrics:', error);
        }
        
        // Load recent emails
        try {
            if (fs.existsSync(inboxFile)) {
                const data = fs.readFileSync(inboxFile, 'utf8');
                const emails = JSON.parse(data);
                // Get last 10 emails, most recent first
                recentEmails = emails.slice(-10).reverse();
            }
        } catch (error) {
            console.error('Error reading inbox file:', error);
        }
        
        res.json({
            success: true,
            agent: agentStatus,
            recentEmails: recentEmails
        });
    } catch (error) {
        console.error('[Agent] Error getting status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /api/agent/metrics
// Returns current industry metrics for the agent to monitor
app.get('/api/agent/metrics', (req, res) => {
    try {
        // Load evaluation metrics (simulated from localStorage)
        const metricsFile = './evaluation-metrics.json';
        let metrics = {
            totalEmails: 0,
            detected: 0,
            bypassed: 0,
            detectionRate: 0,
            bypassRate: 0
        };

        try {
            if (fs.existsSync(metricsFile)) {
                const data = fs.readFileSync(metricsFile, 'utf8');
                const savedMetrics = JSON.parse(data);
                metrics = {
                    totalEmails: savedMetrics.totalSent || 0,
                    detected: savedMetrics.detected || 0,
                    bypassed: savedMetrics.bypassed || 0,
                    detectionRate: savedMetrics.detectionRate || 0,
                    bypassRate: savedMetrics.bypassRate || 0,
                    timestamp: savedMetrics.timestamp
                };
            }
        } catch (error) {
            console.error('Error reading metrics file:', error);
        }

        // Also check inbox file for total count and bypass/detection status
        const inboxFile = './bank-inbox.json';
        let emailsClicked = 0;
        try {
            if (fs.existsSync(inboxFile)) {
                const data = fs.readFileSync(inboxFile, 'utf8');
                const emails = JSON.parse(data);
                metrics.totalEmails = emails.length;
                
                // Count emails that bypassed (status !== 'blocked' or no status)
                metrics.bypassed = emails.filter(e => e.status !== 'blocked' && e.status !== 'reported').length;
                metrics.detected = emails.filter(e => e.status === 'blocked' || e.status === 'reported').length;
                
                // Count emails that were clicked (read === true indicates engagement)
                emailsClicked = emails.filter(e => e.read === true).length;
            }
        } catch (error) {
            // Ignore
        }

        // Get click data from engagement events
        const clickedEvents = events.filter(e => e.event === 'clicked' && !e.phantom);
        emailsClicked = clickedEvents.length;

        res.json({
            success: true,
            metrics: {
                ...metrics,
                emailsClicked,
                clickRate: metrics.totalEmails > 0 ? ((emailsClicked / metrics.totalEmails) * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error('[Agent] Error getting metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================================================
// Static Files and API Proxy
// ============================================================================

// Serve static files
app.use(express.static('.'));

// Create a proxy for both Hugging Face and Claude APIs
app.use('/api/proxy', async (req, res) => {
    try {
        const { provider, model, inputs, parameters, token, claudeToken } = req.body;
        
        // Handle Claude API requests
        if (provider === 'claude') {
            if (!claudeToken) {
                return res.status(401).json({
                    success: false,
                    error: 'Claude API token required',
                    message: 'Please add your Claude API token in the token manager.',
                    status: 401
                });
            }

            console.log('Proxying request to Claude API');
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': claudeToken,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-haiku-20240307',
                    max_tokens: 150,
                    messages: [
                        {
                            role: 'user',
                            content: inputs
                        }
                    ]
                })
            });

            const data = await response.json();
            
            return res.status(response.status).json({
                success: response.ok,
                response: data.content?.[0]?.text || data.error?.message || 'No response',
                content: data.content?.[0]?.text,
                error: data.error,
                status: response.status
            });
        }

        // Handle OpenRouter API requests
        if (provider === 'openrouter') {
            console.log('OpenRouter request received');
            const openRouterKey = process.env.OPENROUTER_API_KEY;
            if (!openRouterKey) {
                console.log('Server missing OPENROUTER_API_KEY');
                return res.status(500).json({
                    success: false,
                    error: 'Server missing OpenRouter API key',
                    message: 'Set OPENROUTER_API_KEY in the server environment.',
                    status: 500
                });
            }

            console.log('Proxying request to OpenRouter API');
            const refererHeader = req.headers.origin || process.env.APP_REFERER || `http://localhost:${PORT}`;
            const appTitle = process.env.APP_TITLE || 'AI Phishing Demo';
            
            const requestBody = {
                model: model || 'meta-llama/llama-3.1-8b-instruct',
                messages: [{
                    role: 'user',
                    content: inputs
                }],
                max_tokens: 500,
                temperature: 0.7
            };
            
            console.log('Request body:', JSON.stringify(requestBody, null, 2));
            
            let response;
            try {
                response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openRouterKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': refererHeader,
                        'X-Title': appTitle
                    },
                    body: JSON.stringify(requestBody)
                });
            } catch (fetchError) {
                console.error('Fetch error:', fetchError);
                return res.status(500).json({
                    success: false,
                    error: 'Network error',
                    message: fetchError.message,
                    status: 500
                });
            }

            let data;
            try {
                const responseText = await response.text();
                if (responseText.trim()) {
                    data = JSON.parse(responseText);
                } else {
                    data = { error: { message: 'Empty response from OpenRouter' } };
                }
            } catch (parseError) {
                console.error('Failed to parse OpenRouter response:', parseError);
                return res.status(500).json({
                    success: false,
                    error: 'Parse error',
                    message: 'Failed to parse response from OpenRouter API',
                    status: 500
                });
            }
            
            // Log error details for debugging
            if (!response.ok) {
                console.error('OpenRouter API error response:', JSON.stringify(data, null, 2));
            }
            
            return res.status(response.status).json({
                success: response.ok,
                response: data.choices?.[0]?.message?.content || data.error?.message || 'No response',
                content: data.choices?.[0]?.message?.content,
                error: data.error,
                data: data,
                status: response.status
            });
        }
        
        // Handle Hugging Face API requests (original logic)
        if (!model || !inputs) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const requestBody = {
            inputs: inputs,
            ...(parameters && { parameters })
        };
        
        console.log(`Proxying request to Hugging Face: ${model}`);
        
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        let data;
        let responseText;
        try {
            responseText = await response.text();
            if (responseText.trim()) {
                data = JSON.parse(responseText);
            } else {
                data = { error: 'Empty response' };
            }
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            data = { 
                error: 'Invalid JSON response',
                rawResponse: responseText || 'Could not read response'
            };
        }
        
        res.status(response.status).json({
            success: response.ok,
            data: data,
            status: response.status
        });
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    const host = process.env.HOST || '0.0.0.0';
    const serverUrl = `http://is-info492.ischool.uw.edu:${PORT}`;
    console.log(`🚀 Server running on ${host}:${PORT}`);
    console.log(`📁 Serving static files from current directory`);
    console.log(`🔗 API proxy available at ${serverUrl}/api/proxy`);
    console.log(`📊 User engagement simulation endpoints:`);
    console.log(`   - POST /events/generated - Log email generation events`);
    console.log(`   - GET /metrics/latest - Get engagement metrics`);
    console.log(`   - GET /events - Get all events (debugging)`);
    console.log(`   - DELETE /events - Clear all events (testing)`);
    console.log(`\n✅ Demo URL: ${serverUrl}/demo3.html`);
    console.log(`✅ Local access: http://localhost:${PORT}/demo3.html`);
});
