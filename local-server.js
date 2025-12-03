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
                    // Check if email is still bypassed (not blocked/reported) before logging click
                    let emailStillBypassed = true;
                    try {
                        const fs = require('fs');
                        if (fs.existsSync('./bank-inbox.json')) {
                            const inboxData = fs.readFileSync('./bank-inbox.json', 'utf8');
                            const emails = JSON.parse(inboxData);
                            const email = emails.find(e => e.id === emailId);
                            if (email && (email.status === 'blocked' || email.status === 'reported')) {
                                emailStillBypassed = false;
                            }
                        }
                    } catch (error) {
                        // If we can't check, assume it's still bypassed (fail open)
                    }
                    
                    // Only log click if email is still bypassed
                    if (emailStillBypassed) {
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
                        
                        // Persist click to bank-inbox.json
                        try {
                            const inboxFile = './bank-inbox.json';
                            if (fs.existsSync(inboxFile)) {
                                const inboxData = fs.readFileSync(inboxFile, 'utf8');
                                const emails = JSON.parse(inboxData);
                                const email = emails.find(e => e.id === emailId);
                                if (email && (email.status === 'delivered' || !email.status || email.status !== 'blocked' && email.status !== 'reported')) {
                                    email.clicked = true;
                                    email.clickedAt = new Date(clickedEvent.timestamp).toISOString();
                                    if (email.openedAt) {
                                        email.timeToClick = (clickedEvent.timestamp - new Date(email.openedAt).getTime()) / (1000 * 60);
                                    }
                                    fs.writeFileSync(inboxFile, JSON.stringify(emails, null, 2));
                                    console.log(`[Simulation] Persisted click to bank-inbox.json for email ${emailId}`);
                                }
                            }
                        } catch (error) {
                            console.error('[Simulation] Error persisting click to inbox:', error);
                        }
                        
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
                    } // End if emailStillBypassed
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

// Endpoint: GET /coverage/metrics
// Returns phishing coverage metrics
app.get('/coverage/metrics', (req, res) => {
    try {
        const { campaignId, timeWindow } = req.query;
        
        // Load coverage data from localStorage (via file system for server-side)
        // In a real system, this would be in a database
        const coverageFile = './coverage-data.json';
        let coverageData = { emails: {}, campaigns: {}, departments: {} };
        
        if (fs.existsSync(coverageFile)) {
            try {
                const data = fs.readFileSync(coverageFile, 'utf8');
                coverageData = JSON.parse(data);
            } catch (e) {
                console.error('[Coverage] Error reading coverage file:', e);
            }
        }
        
        // Calculate metrics
        let emails = Object.values(coverageData.emails || {});
        
        if (campaignId) {
            emails = emails.filter(e => e.campaignId === campaignId);
        }
        
        if (timeWindow) {
            const cutoffTime = new Date(Date.now() - parseInt(timeWindow) * 60 * 60 * 1000);
            emails = emails.filter(e => e.deliveredAt && new Date(e.deliveredAt) >= cutoffTime);
        }
        
        const total = emails.length;
        const delivered = emails.filter(e => e.delivered).length;
        const opened = emails.filter(e => e.opened).length;
        const clicked = emails.filter(e => e.clicked).length;
        const reported = emails.filter(e => e.reported).length;
        
        // Department breakdown
        const departments = {};
        emails.forEach(email => {
            const dept = email.department || 'Unknown';
            if (!departments[dept]) {
                departments[dept] = { total: 0, opened: 0, clicked: 0, reported: 0 };
            }
            departments[dept].total++;
            if (email.opened) departments[dept].opened++;
            if (email.clicked) departments[dept].clicked++;
            if (email.reported) departments[dept].reported++;
        });
        
        Object.keys(departments).forEach(dept => {
            const deptData = departments[dept];
            deptData.coveragePercent = deptData.total > 0 ? (deptData.opened / deptData.total * 100).toFixed(1) : 0;
            deptData.clickRate = deptData.total > 0 ? (deptData.clicked / deptData.total * 100).toFixed(1) : 0;
        });
        
        res.json({
            success: true,
            metrics: {
                total,
                delivered,
                opened,
                clicked,
                reported,
                coveragePercent: total > 0 ? (opened / total * 100).toFixed(1) : 0,
                clickRate: total > 0 ? (clicked / total * 100).toFixed(1) : 0,
                clickThroughRate: opened > 0 ? (clicked / opened * 100).toFixed(1) : 0,
                reportRate: total > 0 ? (reported / total * 100).toFixed(1) : 0,
                departments,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Coverage] Error calculating coverage metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: POST /coverage/track
// Track email interaction events
app.post('/coverage/track', (req, res) => {
    try {
        const { emailId, event, emailData } = req.body;
        
        if (!emailId || !event) {
            return res.status(400).json({ success: false, error: 'Missing emailId or event' });
        }
        
        // Load and update coverage data
        const coverageFile = './coverage-data.json';
        let coverageData = { emails: {}, campaigns: {}, departments: {} };
        
        if (fs.existsSync(coverageFile)) {
            try {
                const data = fs.readFileSync(coverageFile, 'utf8');
                coverageData = JSON.parse(data);
            } catch (e) {
                console.error('[Coverage] Error reading coverage file:', e);
            }
        }
        
        // Initialize email entry if needed
        if (!coverageData.emails[emailId] && emailData) {
            coverageData.emails[emailId] = {
                emailId,
                campaignId: emailData.campaignId,
                targetPersona: emailData.targetPersona,
                department: emailData.targetPersona?.department || 'Unknown',
                company: emailData.targetPersona?.company || 'Unknown',
                delivered: false,
                opened: false,
                clicked: false,
                reported: false
            };
        }
        
        const email = coverageData.emails[emailId];
        if (!email) {
            return res.status(404).json({ success: false, error: 'Email not found' });
        }
        
        // Update based on event type
        const timestamp = new Date().toISOString();
        switch (event) {
            case 'delivered':
                email.delivered = true;
                email.deliveredAt = timestamp;
                break;
            case 'opened':
                email.opened = true;
                email.openedAt = timestamp;
                if (email.deliveredAt) {
                    email.timeToOpen = (new Date(timestamp) - new Date(email.deliveredAt)) / (1000 * 60);
                }
                break;
            case 'clicked':
                email.clicked = true;
                email.clickedAt = timestamp;
                if (email.openedAt) {
                    email.timeToClick = (new Date(timestamp) - new Date(email.openedAt)) / (1000 * 60);
                }
                break;
            case 'reported':
                email.reported = true;
                email.reportedAt = timestamp;
                break;
        }
        
        // Save coverage data
        coverageData.lastUpdated = timestamp;
        fs.writeFileSync(coverageFile, JSON.stringify(coverageData, null, 2));
        
        res.json({ success: true, message: `Tracked ${event} for email ${emailId}` });
    } catch (error) {
        console.error('[Coverage] Error tracking event:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// API Endpoints for Phishing Coverage Tracking
// ============================================================================

// Endpoint: GET /coverage/metrics
// Returns phishing coverage metrics
app.get('/coverage/metrics', (req, res) => {
    try {
        const { campaignId, timeWindow } = req.query;
        
        // Load coverage data from localStorage (via file system for server-side)
        // In a real system, this would be in a database
        const coverageFile = './coverage-data.json';
        let coverageData = { emails: {}, campaigns: {}, departments: {} };
        
        if (fs.existsSync(coverageFile)) {
            try {
                const data = fs.readFileSync(coverageFile, 'utf8');
                coverageData = JSON.parse(data);
            } catch (e) {
                console.error('[Coverage] Error reading coverage file:', e);
            }
        }
        
        // Also check events for real-time coverage
        let emails = Object.values(coverageData.emails || {});
        
        // Sync with events if available
        const sentEvents = events.filter(e => e.event === 'sent');
        sentEvents.forEach(event => {
            if (!coverageData.emails[event.emailId]) {
                // Try to get email data from bank inbox (localStorage simulation)
                // In production, this would come from a database
                coverageData.emails[event.emailId] = {
                    emailId: event.emailId,
                    campaignId: event.campaignId,
                    department: 'Unknown',
                    company: 'Unknown',
                    delivered: true,
                    deliveredAt: new Date(event.timestamp).toISOString(),
                    opened: false,
                    clicked: false,
                    reported: false
                };
            }
        });
        
        // Update from events
        events.forEach(event => {
            const email = coverageData.emails[event.emailId];
            if (email) {
                if (event.event === 'opened' && !email.opened) {
                    email.opened = true;
                    email.openedAt = new Date(event.timestamp).toISOString();
                    if (email.deliveredAt) {
                        email.timeToOpen = (new Date(event.timestamp) - new Date(email.deliveredAt)) / (1000 * 60);
                    }
                }
                if (event.event === 'clicked' && !email.clicked) {
                    email.clicked = true;
                    email.clickedAt = new Date(event.timestamp).toISOString();
                    if (email.openedAt) {
                        email.timeToClick = (new Date(event.timestamp) - new Date(email.openedAt)) / (1000 * 60);
                    }
                }
                if (event.event === 'reported' && !email.reported) {
                    email.reported = true;
                    email.reportedAt = new Date(event.timestamp).toISOString();
                }
            }
        });
        
        // Filter by campaign if provided
        if (campaignId) {
            emails = Object.values(coverageData.emails).filter(e => e.campaignId === campaignId);
        } else {
            emails = Object.values(coverageData.emails);
        }
        
        // Filter by time window if provided (in hours)
        if (timeWindow) {
            const cutoffTime = new Date(Date.now() - parseInt(timeWindow) * 60 * 60 * 1000);
            emails = emails.filter(e => e.deliveredAt && new Date(e.deliveredAt) >= cutoffTime);
        }
        
        const total = emails.length;
        const delivered = emails.filter(e => e.delivered).length;
        const opened = emails.filter(e => e.opened).length;
        const clicked = emails.filter(e => e.clicked).length;
        const reported = emails.filter(e => e.reported).length;
        
        // Department breakdown
        const departments = {};
        emails.forEach(email => {
            const dept = email.department || 'Unknown';
            if (!departments[dept]) {
                departments[dept] = { total: 0, opened: 0, clicked: 0, reported: 0 };
            }
            departments[dept].total++;
            if (email.opened) departments[dept].opened++;
            if (email.clicked) departments[dept].clicked++;
            if (email.reported) departments[dept].reported++;
        });
        
        Object.keys(departments).forEach(dept => {
            const deptData = departments[dept];
            deptData.coveragePercent = deptData.total > 0 ? (deptData.opened / deptData.total * 100).toFixed(1) : 0;
            deptData.clickRate = deptData.total > 0 ? (deptData.clicked / deptData.total * 100).toFixed(1) : 0;
            deptData.reportRate = deptData.total > 0 ? (deptData.reported / deptData.total * 100).toFixed(1) : 0;
        });
        
        // Calculate average times
        const openedEmails = emails.filter(e => e.opened && e.timeToOpen !== null);
        const avgTimeToOpen = openedEmails.length > 0
            ? openedEmails.reduce((sum, e) => sum + e.timeToOpen, 0) / openedEmails.length
            : null;
        
        const clickedEmails = emails.filter(e => e.clicked && e.timeToClick !== null);
        const avgTimeToClick = clickedEmails.length > 0
            ? clickedEmails.reduce((sum, e) => sum + e.timeToClick, 0) / clickedEmails.length
            : null;
        
        res.json({
            success: true,
            metrics: {
                total,
                delivered,
                opened,
                clicked,
                reported,
                coveragePercent: total > 0 ? (opened / total * 100).toFixed(1) : 0,
                clickRate: total > 0 ? (clicked / total * 100).toFixed(1) : 0,
                clickThroughRate: opened > 0 ? (clicked / opened * 100).toFixed(1) : 0,
                reportRate: total > 0 ? (reported / total * 100).toFixed(1) : 0,
                avgTimeToOpen: avgTimeToOpen ? avgTimeToOpen.toFixed(1) : null,
                avgTimeToClick: avgTimeToClick ? avgTimeToClick.toFixed(1) : null,
                departments,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Coverage] Error calculating coverage metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: POST /coverage/track
// Track email interaction events
app.post('/coverage/track', (req, res) => {
    try {
        const { emailId, event, emailData } = req.body;
        
        if (!emailId || !event) {
            return res.status(400).json({ success: false, error: 'Missing emailId or event' });
        }
        
        // Load and update coverage data
        const coverageFile = './coverage-data.json';
        let coverageData = { emails: {}, campaigns: {}, departments: {} };
        
        if (fs.existsSync(coverageFile)) {
            try {
                const data = fs.readFileSync(coverageFile, 'utf8');
                coverageData = JSON.parse(data);
            } catch (e) {
                console.error('[Coverage] Error reading coverage file:', e);
            }
        }
        
        // Initialize email entry if needed
        if (!coverageData.emails[emailId] && emailData) {
            coverageData.emails[emailId] = {
                emailId,
                campaignId: emailData.campaignId,
                targetPersona: emailData.targetPersona,
                department: emailData.targetPersona?.department || 'Unknown',
                company: emailData.targetPersona?.company || 'Unknown',
                delivered: false,
                opened: false,
                clicked: false,
                reported: false
            };
        }
        
        const email = coverageData.emails[emailId];
        if (!email) {
            return res.status(404).json({ success: false, error: 'Email not found' });
        }
        
        // Update based on event type
        const timestamp = new Date().toISOString();
        switch (event) {
            case 'delivered':
                email.delivered = true;
                email.deliveredAt = timestamp;
                break;
            case 'opened':
                email.opened = true;
                email.openedAt = timestamp;
                if (email.deliveredAt) {
                    email.timeToOpen = (new Date(timestamp) - new Date(email.deliveredAt)) / (1000 * 60);
                }
                break;
            case 'clicked':
                email.clicked = true;
                email.clickedAt = timestamp;
                if (email.openedAt) {
                    email.timeToClick = (new Date(timestamp) - new Date(email.openedAt)) / (1000 * 60);
                }
                break;
            case 'reported':
                email.reported = true;
                email.reportedAt = timestamp;
                break;
        }
        
        // Save coverage data
        coverageData.lastUpdated = timestamp;
        fs.writeFileSync(coverageFile, JSON.stringify(coverageData, null, 2));
        
        console.log(`[Coverage] Tracked ${event} for email ${emailId}`);
        res.json({ success: true, message: `Tracked ${event} for email ${emailId}` });
    } catch (error) {
        console.error('[Coverage] Error tracking event:', error);
        res.status(500).json({ success: false, error: error.message });
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
            } else {
                // File doesn't exist yet - initialize empty array
                // This ensures the file will be created when we write to it
                existingEmails = [];
            }
        } catch (error) {
            console.error('Error reading inbox file:', error);
            existingEmails = []; // Initialize empty array on error
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
            console.log(`[Deploy] Before: ${existingEmails.length} emails in inbox`);
            console.log(`[Deploy] Adding: ${emails.length} new emails`);
            fs.writeFileSync(inboxFile, JSON.stringify(existingEmails, null, 2));
            console.log(`[Deploy] After: ${existingEmails.length} emails in inbox (saved to file)`);
        } catch (error) {
            console.error('[Deploy] Error writing inbox file:', error);
        }

        // Also trigger browser localStorage update via events (if browsers are connected)
        // This is a simulation - in a real system, you'd use WebSockets or Server-Sent Events
        
        console.log(`[Agent] Deployed ${emails.length} emails to bank inbox (total: ${existingEmails.length})`);
        
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
        let trainingStats = null;
        
        // Load agent metrics
        try {
            if (fs.existsSync(agentMetricsFile)) {
                const data = fs.readFileSync(agentMetricsFile, 'utf8');
                // Handle empty file
                if (!data || data.trim().length === 0) {
                    console.log('[Agent Status] agent-metrics.json is empty, using defaults');
                } else {
                    try {
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
                    } catch (parseError) {
                        console.error('[Agent Status] Error parsing agent-metrics.json:', parseError.message);
                        // Continue with default values
                    }
                }
            }
        } catch (error) {
            console.error('[Agent Status] Error reading agent metrics:', error);
            // Continue with default values on error
        }
        
        // Load training stats
        try {
            const trainingFile = './learned-strategies.json';
            if (fs.existsSync(trainingFile)) {
                const data = fs.readFileSync(trainingFile, 'utf8');
                const learned = JSON.parse(data);
                
                // Calculate summary stats
                const strategies = Object.keys(learned.strategyScores || {}).map(key => {
                    const s = learned.strategyScores[key];
                    return { strategy: key, ...s };
                }).sort((a, b) => b.score - a.score);
                
                // Retrieve persona names from learned data if available
                const personaNamesMap = learned.personaNames || {};
                
                const personas = Object.keys(learned.personaVulnerabilities || {}).map(id => {
                    const p = learned.personaVulnerabilities[id];
                    return { 
                        personaId: id,
                        personaName: personaNamesMap[id] || `Persona ${id}`, // Use stored name or fallback
                        ...p 
                    };
                }).sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);
                
                trainingStats = {
                    lastUpdated: learned.lastUpdated,
                    totalStrategies: strategies.length,
                    totalPersonas: personas.length,
                    totalCombinations: Object.keys(learned.combinations || {}).length,
                    topStrategies: strategies.slice(0, 5),
                    topVulnerablePersonas: personas.slice(0, 5),
                    learningParams: learned.learningParams || {}
                };
            }
        } catch (error) {
            console.error('Error reading training stats:', error);
        }
        
        // Load recent emails and calculate REAL-TIME defense interaction metrics
        let realTimeBypassed = 0;
        let realTimeDetected = 0;
        let realTimeClicked = 0;
        try {
            if (fs.existsSync(inboxFile)) {
                const data = fs.readFileSync(inboxFile, 'utf8');
                // Handle empty file
                if (!data || data.trim().length === 0) {
                    console.log('[Agent Status] bank-inbox.json is empty');
                } else {
                    try {
                        const emails = JSON.parse(data);
                        
                        // Get last 10 emails, most recent first
                        recentEmails = emails.slice(-10).reverse();
                        
                        // Calculate REAL-TIME defense interaction metrics from inbox
                        // Bypassed = emails that are delivered OR have no status (not yet analyzed) OR are not blocked/reported
                        const bypassedEmails = emails.filter(e => {
                            // If status is explicitly 'delivered', it's bypassed
                            if (e.status === 'delivered') return true;
                            // If status is undefined/null/empty, it's bypassed (not yet analyzed)
                            if (!e.status || e.status === undefined || e.status === null || e.status === '') return true;
                            // If status exists but is not 'blocked' or 'reported', it's bypassed
                            if (e.status !== 'blocked' && e.status !== 'reported') return true;
                            // Otherwise, it's detected
                            return false;
                        });
                        realTimeBypassed = bypassedEmails.length;
                        realTimeDetected = emails.filter(e => e.status === 'blocked' || e.status === 'reported').length;
                        
                        // Count clicked emails - check both persisted email.clicked property AND events array
                        // email.clicked is persisted to bank-inbox.json, so it survives server restarts
                        // events array is in-memory only, so check both to get complete picture
                        const bypassedEmailIds = new Set(bypassedEmails.map(e => e.id));
                        
                        // First, count emails with clicked property (persisted)
                        const clickedFromEmails = emails.filter(e => 
                            bypassedEmailIds.has(e.id) && e.clicked === true
                        ).length;
                        
                        // Then, count clicked events from events array (in-memory, for clicks that happened after restart)
                        const clickedEvents = events.filter(e => 
                            e.event === 'clicked' && 
                            !e.phantom && 
                            bypassedEmailIds.has(e.emailId)
                        );
                        
                        // Combine both (use Set to avoid double-counting if an email has both)
                        const clickedEmailIds = new Set();
                        emails.forEach(e => {
                            if (bypassedEmailIds.has(e.id) && e.clicked === true) {
                                clickedEmailIds.add(e.id);
                            }
                        });
                        clickedEvents.forEach(e => {
                            if (bypassedEmailIds.has(e.emailId)) {
                                clickedEmailIds.add(e.emailId);
                            }
                        });
                        realTimeClicked = clickedEmailIds.size;
                    } catch (parseError) {
                        console.error('[Agent Status] Error parsing bank-inbox.json:', parseError.message);
                        // Continue with empty arrays on error
                        recentEmails = [];
                    }
                }
            }
        } catch (error) {
            console.error('[Agent Status] Error reading inbox file:', error);
            // Return empty arrays on error to prevent crashes
            recentEmails = [];
        }
        
        // Calculate real-time rates
        const totalEmails = realTimeBypassed + realTimeDetected;
        const realTimeBypassRate = totalEmails > 0 ? ((realTimeBypassed / totalEmails) * 100) : 0;
        const realTimeClickRate = realTimeBypassed > 0 ? ((realTimeClicked / realTimeBypassed) * 100) : 0;
        
        // Debug logging with detailed breakdown
        const totalEmailsInInbox = recentEmails.length > 0 ? (realTimeBypassed + realTimeDetected) : 0;
        console.log(`[Agent Status] Real-time metrics: ${totalEmailsInInbox} total emails in inbox`);
        console.log(`  - Bypassed (delivered/undefined): ${realTimeBypassed}`);
        console.log(`  - Detected (blocked/reported): ${realTimeDetected}`);
        console.log(`  - Clicked: ${realTimeClicked}`);
        console.log(`  - Total analyzed: ${totalEmails}`);
        console.log(`  - Rates: bypass=${realTimeBypassRate.toFixed(1)}%, click=${realTimeClickRate.toFixed(1)}%`);
        
        // Log status breakdown for debugging (only if we have emails)
        if (recentEmails.length > 0) {
            const statusBreakdown = {};
            recentEmails.forEach(e => {
                const status = e.status || 'NO_STATUS';
                statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            });
            console.log(`  - Status breakdown (last 10):`, statusBreakdown);
        }
        
        // Override agent status with REAL-TIME defense interaction metrics
        agentStatus.emailsBypassed = realTimeBypassed;
        agentStatus.emailsDetected = realTimeDetected;
        agentStatus.emailsClicked = realTimeClicked;
        agentStatus.bypassRate = realTimeBypassRate;
        agentStatus.clickRate = realTimeClickRate;
        
        res.json({
            success: true,
            agent: agentStatus,
            training: trainingStats,
            recentEmails: recentEmails || []
        });
    } catch (error) {
        console.error('[Agent] Error getting status:', error);
        console.error('[Agent] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Endpoint: GET /api/agent/trends
// Returns metrics trends for charting
app.get('/api/agent/trends', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const SupabaseBackupHelper = require('./supabase-backup-helper');
        
        const supabaseUrl = process.env.SUPABASE_URL || 'https://cumodtrxkqakvjandlsw.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
        const backupHelper = new SupabaseBackupHelper(supabaseUrl, supabaseKey);
        
        const result = await backupHelper.getMetricsTrends(limit);
        
        if (result.success) {
            res.json({
                success: true,
                trends: result.data
            });
        } else {
            // Fallback: generate trends from local metrics history if available
            const metricsFile = './agent-metrics.json';
            if (fs.existsSync(metricsFile)) {
                const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
                const trends = [{
                    cycle_number: metrics.totalCycles || 0,
                    bypass_rate: metrics.bypassRate || 0,
                    click_rate: metrics.clickRate || 0,
                    emails_bypassed: metrics.emailsBypassed || 0,
                    emails_clicked: metrics.emailsClicked || 0,
                    created_at: new Date().toISOString()
                }];
                res.json({
                    success: true,
                    trends: trends,
                    note: 'Using current metrics (history not available)'
                });
            } else {
                res.json({
                    success: false,
                    trends: [],
                    message: 'No trends data available'
                });
            }
        }
    } catch (error) {
        console.error('[Agent] Error getting trends:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /api/agent/training-stats
// Returns detailed training statistics from the strategy trainer
app.get('/api/agent/training-stats', (req, res) => {
    try {
        const trainingFile = './learned-strategies.json';
        
        if (!fs.existsSync(trainingFile)) {
            return res.json({
                success: true,
                training: null,
                message: 'Training data not available yet (agent needs to run at least one cycle)'
            });
        }
        
        const data = fs.readFileSync(trainingFile, 'utf8');
        const learned = JSON.parse(data);
        
        // Calculate detailed stats
        const strategies = Object.keys(learned.strategyScores || {}).map(key => {
            const s = learned.strategyScores[key];
            return { strategy: key, ...s };
        }).sort((a, b) => b.score - a.score);
        
        const personas = Object.keys(learned.personaVulnerabilities || {}).map(id => {
            const p = learned.personaVulnerabilities[id];
            return { personaId: id, ...p };
        }).sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);
        
        const combinations = Object.keys(learned.combinations || {}).map(key => {
            const c = learned.combinations[key];
            return { combination: key, ...c };
        }).sort((a, b) => {
            const scoreA = (a.bypassRate || 0) * 0.7 + (a.clickRate || 0) * 0.3;
            const scoreB = (b.bypassRate || 0) * 0.7 + (b.clickRate || 0) * 0.3;
            return scoreB - scoreA;
        });
        
        res.json({
            success: true,
            training: {
                lastUpdated: learned.lastUpdated,
                summary: {
                    totalStrategies: strategies.length,
                    totalPersonas: personas.length,
                    totalCombinations: combinations.length
                },
                topStrategies: strategies.slice(0, 10),
                topVulnerablePersonas: personas.slice(0, 10),
                topCombinations: combinations.slice(0, 10),
                allStrategies: strategies,
                allPersonas: personas,
                learningParams: learned.learningParams || {},
                raw: {
                    strategyScores: learned.strategyScores,
                    personaVulnerabilities: learned.personaVulnerabilities,
                    combinations: learned.combinations
                }
            }
        });
    } catch (error) {
        console.error('[Agent] Error getting training stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================================================
// Defense System API Endpoints
// ============================================================================

// Endpoint: POST /api/defense/sync
// Sync emails from browser localStorage to server file
app.post('/api/defense/sync', (req, res) => {
    try {
        const { emails } = req.body;
        
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid emails array'
            });
        }
        
        const inboxFile = './bank-inbox.json';
        
        // Save to file
        try {
            fs.writeFileSync(inboxFile, JSON.stringify(emails, null, 2));
            console.log(`[Defense] Synced ${emails.length} emails from browser to server`);
        } catch (error) {
            console.error('[Defense] Error writing inbox file:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to sync emails',
                message: error.message
            });
        }
        
        res.json({
            success: true,
            message: `Synced ${emails.length} emails`,
            totalEmails: emails.length
        });
    } catch (error) {
        console.error('[Defense] Error syncing emails:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /api/defense/status
// Returns defense agent status (similar to /api/agent/status)
app.get('/api/defense/status', (req, res) => {
    try {
        const metricsFile = './defense-metrics.json';
        const inboxFile = './bank-inbox.json';
        
        let agentStatus = {
            isRunning: false,
            totalCycles: 0,
            totalEmailsAnalyzed: 0,
            totalEmailsBlocked: 0,
            totalEmailsReported: 0,
            totalEmailsBypassed: 0,
            detectionRate: 0,
            bypassRate: 0,
            avgResponseTime: 0,
            avgLeakageRisk: 0,
            mlAccuracy: 0,
            highRiskBlocked: 0,
            mediumRiskReported: 0,
            lowRiskAllowed: 0,
            lastCycleTime: null,
            startTime: null,
            uptime: null
        };
        
        let recentBlocked = [];
        
        // Load defense agent metrics
        try {
            if (fs.existsSync(metricsFile)) {
                const data = fs.readFileSync(metricsFile, 'utf8');
                const metrics = JSON.parse(data);
                
                // Check if metrics file was updated recently (within last 2 minutes = agent is running)
                const lastUpdate = metrics.lastCycleTime ? new Date(metrics.lastCycleTime).getTime() : 0;
                const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
                const isRecentlyActive = lastUpdate > twoMinutesAgo;
                
                if (metrics.startTime) {
                    const startTime = new Date(metrics.startTime);
                    const uptime = Date.now() - startTime.getTime();
                    
                    agentStatus = {
                        isRunning: isRecentlyActive, // Running if recently active
                        totalCycles: metrics.totalCycles || 0,
                        totalEmailsAnalyzed: metrics.totalEmailsAnalyzed || 0,
                        totalEmailsBlocked: metrics.totalEmailsBlocked || 0,
                        totalEmailsReported: metrics.totalEmailsReported || 0,
                        totalEmailsBypassed: metrics.totalEmailsBypassed || 0,
                        detectionRate: parseFloat(metrics.detectionRate || 0),
                        bypassRate: parseFloat(metrics.bypassRate || 0),
                        avgResponseTime: parseFloat(metrics.avgResponseTime || 0),
                        avgLeakageRisk: parseFloat(metrics.avgLeakageRisk || 0),
                        mlAccuracy: parseFloat(metrics.mlAccuracy || 0),
                        highRiskBlocked: metrics.highRiskBlocked || 0,
                        mediumRiskReported: metrics.mediumRiskReported || 0,
                        lowRiskAllowed: metrics.lowRiskAllowed || 0,
                        lastCycleTime: metrics.lastCycleTime,
                        startTime: metrics.startTime,
                        uptime: {
                            days: Math.floor(uptime / (1000 * 60 * 60 * 24)),
                            hours: Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                            minutes: Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
                        }
                    };
                }
            }
        } catch (error) {
            console.error('[Defense] Error reading defense metrics:', error);
            // Continue with default values
        }
        
        // Load recent blocked emails
        try {
            if (fs.existsSync(inboxFile)) {
                const data = fs.readFileSync(inboxFile, 'utf8');
                const emails = JSON.parse(data);
                if (Array.isArray(emails)) {
                    // Get last 10 blocked/reported emails, most recent first
                    recentBlocked = emails
                        .filter(e => e && (e.status === 'blocked' || e.status === 'reported'))
                        .sort((a, b) => {
                            const timeA = new Date(a.detectedAt || a.receivedAt || a.timestamp || 0).getTime();
                            const timeB = new Date(b.detectedAt || b.receivedAt || b.timestamp || 0).getTime();
                            return timeB - timeA;
                        })
                        .slice(0, 10);
                }
            }
        } catch (error) {
            console.error('[Defense] Error reading inbox file:', error);
            // Continue with empty array
        }
        
        res.json({
            success: true,
            agent: agentStatus,
            recentBlocked: recentBlocked
        });
    } catch (error) {
        console.error('[Defense] Error getting status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /api/defense/metrics
// Returns defense system metrics for monitoring
app.get('/api/defense/metrics', (req, res) => {
    try {
        // Load emails from bank inbox
        // First try the file (synced from agent deployments or browser)
        const inboxFile = './bank-inbox.json';
        let emails = [];
        
        try {
            if (fs.existsSync(inboxFile)) {
                const data = fs.readFileSync(inboxFile, 'utf8');
                const fileEmails = JSON.parse(data);
                if (Array.isArray(fileEmails)) {
                    emails = fileEmails;
                }
            }
        } catch (error) {
            console.error('[Defense] Error reading inbox file:', error);
        }
        
        // Note: In a real system, this would come from a database
        // The browser localStorage data can be synced via POST /api/defense/sync
        
        // Calculate metrics
        const totalEmails = emails.length;
        const blockedEmails = emails.filter(e => e.status === 'blocked');
        const reportedEmails = emails.filter(e => e.status === 'reported');
        const autoBlocked = blockedEmails.filter(e => e.autoDetected === true);
        const autoReported = reportedEmails.filter(e => e.autoDetected === true);
        const detectedEmails = [...blockedEmails, ...reportedEmails];
        const bypassedEmails = emails.filter(e => e.status === 'delivered');
        
        const blockedCount = blockedEmails.length;
        const reportedCount = reportedEmails.length;
        const detectedCount = detectedEmails.length;
        const bypassedCount = bypassedEmails.length;
        const autoBlockedCount = autoBlocked.length;
        const autoReportedCount = autoReported.length;
        
        // Detection and bypass rates
        const detectionRate = totalEmails > 0 ? ((detectedCount / totalEmails) * 100).toFixed(1) : 0;
        const bypassRate = totalEmails > 0 ? ((bypassedCount / totalEmails) * 100).toFixed(1) : 0;
        
        // Average risk level of leaked emails (bypassed emails)
        const avgLeakageRisk = bypassedEmails.length > 0
            ? bypassedEmails.reduce((sum, e) => sum + (e.riskScore || 0), 0) / bypassedEmails.length
            : 0;
        
        // Average response time (from detection times)
        const detectedWithTime = detectedEmails.filter(e => e.detectionTime !== undefined);
        const avgResponseTime = detectedWithTime.length > 0
            ? detectedWithTime.reduce((sum, e) => sum + e.detectionTime, 0) / detectedWithTime.length
            : null;
        
        // High risk count
        const highRiskCount = emails.filter(e => e.riskLevel === 'high').length;
        
        // ML accuracy (average confidence from ML classifications)
        const mlClassified = emails.filter(e => e.mlClassification && e.mlClassification.confidence !== undefined);
        const mlAccuracy = mlClassified.length > 0
            ? (mlClassified.reduce((sum, e) => sum + (e.mlClassification.confidence || 0), 0) / mlClassified.length * 100).toFixed(1)
            : 0;
        
        // Department breakdown
        const departments = {};
        emails.forEach(email => {
            const dept = email.targetPersona?.department || 'Unknown';
            if (!departments[dept]) {
                departments[dept] = {
                    total: 0,
                    blocked: 0,
                    reported: 0,
                    bypassed: 0,
                    detected: 0
                };
            }
            departments[dept].total++;
            if (email.status === 'blocked') departments[dept].blocked++;
            else if (email.status === 'reported') departments[dept].reported++;
            else if (email.status === 'delivered') departments[dept].bypassed++;
            
            if (email.status === 'blocked' || email.status === 'reported') {
                departments[dept].detected++;
            }
        });
        
        // Calculate detection rates per department
        Object.keys(departments).forEach(dept => {
            const deptData = departments[dept];
            deptData.detectionRate = deptData.total > 0 
                ? ((deptData.detected / deptData.total) * 100).toFixed(1)
                : 0;
        });
        
        // Timeline data (last 24 hours)
        const now = new Date();
        const timelineData = [];
        const timelineMap = {};
        
        // Initialize 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
            const hourKey = hour.toISOString().substring(0, 13); // YYYY-MM-DDTHH
            timelineMap[hourKey] = { hour: hourKey, blocked: 0, bypassed: 0 };
        }
        
        // Count emails by hour
        emails.forEach(email => {
            const emailTime = new Date(email.receivedAt || email.timestamp || now);
            const hourKey = emailTime.toISOString().substring(0, 13);
            
            if (timelineMap[hourKey]) {
                if (email.status === 'blocked' || email.status === 'reported') {
                    timelineMap[hourKey].blocked++;
                } else if (email.status === 'delivered') {
                    timelineMap[hourKey].bypassed++;
                }
            }
        });
        
        // Convert to array
        Object.values(timelineMap).forEach(data => {
            timelineData.push(data);
        });
        
        // Recent blocked/reported emails (last 20)
        const recentBlocked = [...detectedEmails]
            .sort((a, b) => {
                const timeA = new Date(a.detectedAt || a.receivedAt || a.timestamp || 0);
                const timeB = new Date(b.detectedAt || b.receivedAt || b.timestamp || 0);
                return timeB - timeA;
            })
            .slice(0, 20);
        
        res.json({
            success: true,
            metrics: {
                totalEmails,
                blockedCount,
                reportedCount,
                autoBlockedCount,
                autoReportedCount,
                detectedCount,
                bypassedCount,
                detectionRate: parseFloat(detectionRate),
                bypassRate: parseFloat(bypassRate),
                avgLeakageRisk: parseFloat(avgLeakageRisk.toFixed(1)),
                avgResponseTime,
                highRiskCount,
                mlAccuracy: parseFloat(mlAccuracy),
                departments,
                timelineData,
                recentBlocked,
                bypassedEmails: bypassedEmails.slice(0, 50), // Include for leakage risk calculation
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Defense] Error getting metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Endpoint: GET /api/agent/metrics
// Returns current industry metrics for the agent to monitor
// This should calculate REAL-TIME metrics from bank-inbox.json (same as /api/agent/status)
app.get('/api/agent/metrics', (req, res) => {
    try {
        const inboxFile = './bank-inbox.json';
        let metrics = {
            totalEmails: 0,
            detected: 0,
            bypassed: 0,
            emailsClicked: 0,
            detectionRate: 0,
            bypassRate: 0,
            clickRate: 0
        };

        // Calculate REAL-TIME metrics from bank-inbox.json (same logic as /api/agent/status)
        try {
            if (fs.existsSync(inboxFile)) {
                const data = fs.readFileSync(inboxFile, 'utf8');
                if (data && data.trim().length > 0) {
                    const emails = JSON.parse(data);
                    metrics.totalEmails = emails.length;
                    
                    // Count emails that bypassed (status === 'delivered' or no status/undefined)
                    const bypassedEmails = emails.filter(e => {
                        if (e.status === 'delivered') return true;
                        if (!e.status || e.status === undefined || e.status === null || e.status === '') return true;
                        if (e.status !== 'blocked' && e.status !== 'reported') return true;
                        return false;
                    });
                    metrics.bypassed = bypassedEmails.length;
                    metrics.detected = emails.filter(e => e.status === 'blocked' || e.status === 'reported').length;
                    
                    // Count clicked emails
                    const bypassedEmailIds = new Set(bypassedEmails.map(e => e.id));
                    const clickedEmails = emails.filter(e => 
                        bypassedEmailIds.has(e.id) && e.clicked === true
                    );
                    metrics.emailsClicked = clickedEmails.length;
            }
        } catch (error) {
            // Ignore
        }

        // Get click data from engagement events - ONLY count clicks for emails that bypassed defense
        const bypassedEmailIds = new Set(bypassedEmails.map(e => e.id));
        const clickedEvents = events.filter(e => 
            e.event === 'clicked' && 
            !e.phantom && 
            bypassedEmailIds.has(e.emailId)
        );
        emailsClicked = clickedEvents.length;

        // Calculate rates from inbox data (always calculate, don't rely on evaluation-metrics.json)
        const totalEmails = metrics.totalEmails || 0;
        const bypassRate = totalEmails > 0 
            ? ((metrics.bypassed / totalEmails) * 100).toFixed(2) 
            : 0;
        const detectionRate = totalEmails > 0 
            ? ((metrics.detected / totalEmails) * 100).toFixed(2) 
            : 0;
        const clickRate = metrics.bypassed > 0 
            ? ((emailsClicked / metrics.bypassed) * 100).toFixed(2) 
            : 0;

        res.json({
            success: true,
            metrics: {
                totalEmails: metrics.totalEmails,
                detected: metrics.detected,
                bypassed: metrics.bypassed,
                emailsClicked,
                detectionRate: parseFloat(detectionRate),
                bypassRate: parseFloat(bypassRate),
                clickRate: parseFloat(clickRate)
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
