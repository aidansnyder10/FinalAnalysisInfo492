// Demo 3 - Bank Admin Dashboard Controller
class BankAdminDashboard {
    constructor() {
        this.emails = [];
        this.selectedEmail = null;
        this.autoDetectionEnabled = true; // Enabled by default
        this.detectionSettings = this.loadDetectionSettings();
        this.coverageTracker = new PhishingCoverageTracker();
        this.coverageMetrics = null;
        
        // Initialize Decision Tree Classifier for ML-based risk assessment
        this.decisionTreeClassifier = new DecisionTreeClassifier();
        
        this.init();
    }

    // Detection settings based on real-world statistics
    loadDetectionSettings() {
        const saved = localStorage.getItem('demo3_detection_settings');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Default settings based on real-world phishing statistics:
        // - General phishing: 17.8% success = 82.2% detection
        // - AI-generated spear-phishing: 54% success = 46% detection  
        // - Targeted spear-phishing: 53.2% success = 46.8% detection
        return {
            // Detection rates by attack sophistication
            generalPhishing: 0.822,      // Basic attacks: 82.2% detected
            targetedSpearPhishing: 0.468, // Advanced attacks: 46.8% detected
            aiGeneratedSpearPhishing: 0.46, // Expert attacks: 46% detected (AI-generated)
            humanWritten: 0.88,          // Human-written: 88% detected (12% success)
            
            // Response time ranges (in minutes)
            highRiskResponseTime: { min: 2, max: 5 },
            mediumRiskResponseTime: { min: 5, max: 15 },
            lowRiskResponseTime: { min: 10, max: 30 },
            
            // Model-specific adjustments (some AI models generate better phishing)
            modelAdjustments: {
                'gpt-4': -0.05,      // GPT-4: 5% harder to detect
                'gpt-3.5': -0.02,    // GPT-3.5: 2% harder to detect
                'claude': -0.03,     // Claude: 3% harder to detect
                'llama': 0.02,       // Llama: 2% easier to detect
                'default': 0
            }
        };
    }
    
    saveDetectionSettings() {
        localStorage.setItem('demo3_detection_settings', JSON.stringify(this.detectionSettings));
    }

    init() {
        this.loadEmails();
        this.setupEventListeners();
        this.setupCoverageTracking();
        this.displayEmails();
        this.updateKPIs();
        this.updateSecurityStatus();
        this.addActivityLog('System initialized', 'success');
        this.currentFilter = 'all';
        
        // Start automated security analysis for existing emails
        this.processPendingEmails();
    }
    
    setupCoverageTracking() {
        // Poll for coverage metrics updates
        setInterval(() => {
            this.loadCoverageMetrics();
        }, 5000); // Poll every 5 seconds
        
        // Load initial coverage metrics
        this.loadCoverageMetrics();
    }
    
    // Load coverage metrics from API
    async loadCoverageMetrics() {
        try {
            const response = await fetch('/coverage/metrics');
            if (!response.ok) {
                console.warn('[Coverage] Failed to load coverage metrics');
                return;
            }
            
            const data = await response.json();
            if (data.success && data.metrics) {
                this.coverageMetrics = data.metrics;
                this.updateCoverageDisplay();
                this.checkCoverageAlerts();
                
                // Also sync with local coverage tracker
                if (this.coverageTracker) {
                    // Sync with engagement events from API
                    try {
                        const eventsResponse = await fetch('/events');
                        if (eventsResponse.ok) {
                            const eventsData = await eventsResponse.json();
                            if (eventsData.success && eventsData.events) {
                                this.coverageTracker.syncWithEngagementEvents(eventsData.events);
                            }
                        }
                    } catch (e) {
                        console.warn('[Coverage] Could not sync with events:', e);
                    }
                }
            }
        } catch (error) {
            console.error('[Coverage] Error loading coverage metrics:', error);
        }
    }
    
    // Update coverage display in UI
    updateCoverageDisplay() {
        if (!this.coverageMetrics) return;
        
        const coveragePanel = document.getElementById('coverageMetricsPanel');
        if (!coveragePanel) return;
        
        const metrics = this.coverageMetrics;
        const coveragePercent = parseFloat(metrics.coveragePercent);
        const coverageColor = coveragePercent >= 50 ? '#ff4444' : coveragePercent >= 30 ? '#ff8800' : '#00aa44';
        const coverageStatus = coveragePercent >= 50 ? 'High Risk' : coveragePercent >= 30 ? 'Moderate Risk' : 'Low Risk';
        
        coveragePanel.innerHTML = `
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid ${coverageColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #333; margin: 0;"><i class="fas fa-chart-pie"></i> Phishing Coverage Analysis</h4>
                    <span style="background: ${coverageColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${coverageStatus}
                    </span>
                </div>
                
                <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
                    Coverage shows how many employees have interacted with phishing emails. Higher coverage indicates more employees are seeing and engaging with suspicious emails.
                </p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div>
                        <div style="color: #666; font-size: 12px;">Total Emails</div>
                        <div style="color: #333; font-size: 24px; font-weight: bold;">${metrics.total}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 12px;">Opened</div>
                        <div style="color: #667eea; font-size: 24px; font-weight: bold;">${metrics.opened}</div>
                        <div style="color: #666; font-size: 11px;">${metrics.coveragePercent}% coverage</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 12px;">Clicked</div>
                        <div style="color: ${coverageColor}; font-size: 24px; font-weight: bold;">${metrics.clicked}</div>
                        <div style="color: #666; font-size: 11px;">${metrics.clickRate}% click rate</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 12px;">Reported</div>
                        <div style="color: #00aa44; font-size: 24px; font-weight: bold;">${metrics.reported}</div>
                        <div style="color: #666; font-size: 11px;">${metrics.reportRate}% report rate</div>
                    </div>
                    ${metrics.avgTimeToOpen ? `
                    <div>
                        <div style="color: #666; font-size: 12px;">Avg Time to Open</div>
                        <div style="color: #667eea; font-size: 20px; font-weight: bold;">${metrics.avgTimeToOpen}m</div>
                    </div>
                    ` : ''}
                </div>
                
                ${this.formatDepartmentCoverageHeatmap(metrics.departments)}
            </div>
        `;
    }
    
    formatDepartmentCoverageHeatmap(departments) {
        if (!departments || Object.keys(departments).length === 0) return '';
        
        let html = '<div style="margin-top: 20px;"><h5 style="color: #333; margin-bottom: 10px;">Coverage by Department:</h5>';
        
        Object.entries(departments).forEach(([dept, data]) => {
            const coveragePercent = parseFloat(data.coveragePercent);
            const deptColor = coveragePercent >= 50 ? '#ff4444' : coveragePercent >= 30 ? '#ff8800' : '#00aa44';
            const barWidth = Math.min(100, coveragePercent);
            
            html += `
                <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid ${deptColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: #333;">${dept}</strong>
                        <span style="color: ${deptColor}; font-weight: bold;">${data.coveragePercent}%</span>
                    </div>
                    <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: ${deptColor}; height: 100%; width: ${barWidth}%; transition: width 0.3s;"></div>
                    </div>
                    <div style="color: #666; font-size: 11px; margin-top: 5px;">
                        ${data.opened}/${data.total} opened | ${data.clicked} clicked | ${data.reported} reported
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    // Check coverage alerts
    checkCoverageAlerts() {
        if (!this.coverageMetrics) return;
        
        const coveragePercent = parseFloat(this.coverageMetrics.coveragePercent);
        const threshold = 40; // Alert if coverage is below 40%
        
        if (coveragePercent < threshold) {
            // Show alert in activity log
            this.addActivityLog(
                `⚠️ Low phishing coverage: ${coveragePercent}% (threshold: ${threshold}%)`,
                'warning'
            );
        }
    }

    setupEventListeners() {
        // Listen for new emails from hacker dashboard
        window.addEventListener('newEmailsReceived', (event) => {
            console.log('Bank Admin: Received newEmailsReceived event');
            this.handleNewEmails(event.detail);
        });
        
        // Also listen for storage events (for cross-tab sync)
        window.addEventListener('storage', (event) => {
            if (event.key === 'demo3_bank_inbox' && event.newValue) {
                console.log('Bank Admin: Received storage event for demo3_bank_inbox');
                // Small delay to ensure write has completed
                setTimeout(() => {
                    this.loadEmails();
                }, 100);
            }
        });

        // Poll for new emails (in case event didn't fire)
        // Initialize with current count
        let lastEmailCount = JSON.parse(localStorage.getItem('demo3_bank_inbox') || '[]').length;
        console.log(`Bank Admin: Polling initialized with ${lastEmailCount} emails`);
        
        setInterval(() => {
            const saved = localStorage.getItem('demo3_bank_inbox');
            if (saved && saved !== '[]') {
                const parsed = JSON.parse(saved);
                const currentCount = Array.isArray(parsed) ? parsed.length : 0;
                if (currentCount !== lastEmailCount) {
                    console.log(`Bank Admin: Polling detected email count change: ${lastEmailCount} -> ${currentCount}`);
                    lastEmailCount = currentCount;
                    this.loadEmails();
                }
            }
        }, 2000);
        
        // Check for overdue detections every 10 seconds
        setInterval(() => {
            this.checkOverdueDetections();
        }, 10000);
    }

    loadEmails() {
        // Try multiple times to ensure we get the latest data (in case of localStorage sync delay)
        let saved = localStorage.getItem('demo3_bank_inbox');
        let parsed = null;
        
        // If no data on first try, wait a bit and try again (for cross-tab sync)
        if (!saved || saved === '[]') {
            setTimeout(() => {
                saved = localStorage.getItem('demo3_bank_inbox');
                if (saved && saved !== '[]') {
                    this.loadEmails();
                }
            }, 200);
        }
        
        console.log(`Bank Admin loadEmails: Raw localStorage data length: ${saved ? saved.length : 0}`);
        if (saved && saved !== '[]') {
            try {
                parsed = JSON.parse(saved);
                console.log(`Bank Admin loadEmails: Parsed ${parsed.length} emails from JSON`);
                
                // Verify it's actually an array with valid emails
                if (!Array.isArray(parsed)) {
                    console.error('Bank Admin: localStorage data is not an array!', parsed);
                    this.emails = [];
                    return;
                }
                
                // Remove any invalid entries
                parsed = parsed.filter(e => e && e.id);
                console.log(`Bank Admin loadEmails: After filtering, ${parsed.length} valid emails`);
                
                this.emails = parsed.sort((a, b) => 
                    new Date(b.receivedAt || b.timestamp || 0) - new Date(a.receivedAt || a.timestamp || 0)
                );
                console.log(`Bank Admin: Loaded ${this.emails.length} emails from inbox`);
                console.log('Email IDs:', this.emails.map(e => e.id));
                console.log('Email targets:', this.emails.map(e => e.targetPersona?.name));
                
                // Update email count display
                const countElement = document.getElementById('totalEmailCount');
                if (countElement) {
                    countElement.textContent = this.emails.length;
                }
                
                // Process any pending emails that haven't been analyzed
                this.processPendingEmails();
                // Update metrics after loading
                this.updateEvaluationMetrics();
            } catch (error) {
                console.error('Bank Admin: Error parsing emails from localStorage:', error);
                console.error('Raw data:', saved?.substring(0, 500));
                this.emails = [];
            }
        } else {
            console.log('Bank Admin: No emails in inbox');
            this.emails = [];
            const countElement = document.getElementById('totalEmailCount');
            if (countElement) {
                countElement.textContent = '0';
            }
        }
        this.updateKPIs();
        this.displayEmails();
    }
    
    clearInbox() {
        if (confirm('Are you sure you want to clear all emails from the inbox? This action cannot be undone.')) {
            localStorage.removeItem('demo3_bank_inbox');
            this.emails = [];
            this.displayEmails();
            this.updateKPIs();
            this.updateEvaluationMetrics();
            this.addActivityLog('Inbox cleared by administrator', 'warning');
            
            // Update email count display
            const countElement = document.getElementById('totalEmailCount');
            if (countElement) {
                countElement.textContent = '0';
            }
            
            console.log('Bank Admin: Inbox cleared');
        }
    }
    
    filterEmails(filter) {
        this.currentFilter = filter;
        
        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.displayEmails();
    }
    
    updateKPIs() {
        const highRiskEmails = this.emails.filter(e => e.riskLevel === 'high').length;
        const mediumRiskEmails = this.emails.filter(e => e.riskLevel === 'medium').length;
        const blockedEmails = this.emails.filter(e => e.status === 'blocked' || e.status === 'reported').length;
        const activeIncidents = this.emails.filter(e => e.riskLevel === 'high' && !e.read).length;
        
        // Update KPI cards
        document.getElementById('kpi-threats').textContent = this.emails.filter(e => e.riskLevel === 'high' || e.riskLevel === 'medium').length;
        document.getElementById('kpi-threats-change').textContent = `${highRiskEmails + mediumRiskEmails} in last 24h`;
        
        document.getElementById('kpi-blocked').textContent = blockedEmails;
        document.getElementById('kpi-blocked-change').textContent = `${blockedEmails} total`;
        
        document.getElementById('kpi-incidents').textContent = activeIncidents;
        document.getElementById('kpi-incidents-change').textContent = activeIncidents > 0 ? 'Action Required' : 'All Clear';
        
        // Update card colors based on threat level
        const threatsCard = document.getElementById('kpi-threats-card');
        const incidentsCard = document.getElementById('kpi-incidents-card');
        
        if (activeIncidents > 0) {
            incidentsCard.className = 'bank-kpi-card critical';
        } else if (this.emails.length > 0) {
            incidentsCard.className = 'bank-kpi-card warning';
        } else {
            incidentsCard.className = 'bank-kpi-card';
        }
        
        if (highRiskEmails > 0) {
            threatsCard.className = 'bank-kpi-card critical';
        } else if (mediumRiskEmails > 0) {
            threatsCard.className = 'bank-kpi-card warning';
        } else {
            threatsCard.className = 'bank-kpi-card';
        }
        
        // Calculate average response time from actual detection times
        const detectedEmailsWithTime = this.emails.filter(e => 
            (e.status === 'blocked' || e.status === 'reported') && 
            e.detectionTime !== undefined
        );
        
        if (detectedEmailsWithTime.length > 0) {
            const avgTime = detectedEmailsWithTime.reduce((sum, e) => sum + e.detectionTime, 0) / detectedEmailsWithTime.length;
            document.getElementById('kpi-response').textContent = `${Math.round(avgTime)}m`;
            document.getElementById('kpi-response-change').textContent = 'Within SLA';
        } else if (blockedEmails > 0) {
            // Fallback: simulated time if no actual detection times
            const avgTime = Math.floor(Math.random() * 15 + 5);
            document.getElementById('kpi-response').textContent = `${avgTime}m`;
            document.getElementById('kpi-response-change').textContent = 'Within SLA';
        } else {
            document.getElementById('kpi-response').textContent = '-';
            document.getElementById('kpi-response-change').textContent = 'Monitoring';
        }
    }
    
    updateSecurityStatus() {
        const highRiskCount = this.emails.filter(e => e.riskLevel === 'high' && !e.read).length;
        const statusDot = document.getElementById('securityStatusDot');
        const statusText = document.getElementById('securityStatusText');
        
        if (highRiskCount > 0) {
            statusDot.className = 'status-dot critical';
            statusText.textContent = 'Threats Detected - Action Required';
            statusText.style.color = '#ff4444';
        } else if (this.emails.filter(e => e.riskLevel === 'medium' && !e.read).length > 0) {
            statusDot.className = 'status-dot warning';
            statusText.textContent = 'Elevated Risk - Monitor Closely';
            statusText.style.color = '#ff8800';
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = 'All Systems Operational';
            statusText.style.color = '#00aa44';
        }
        
        // Update last update time
        document.getElementById('lastUpdateTime').textContent = new Date().toLocaleTimeString();
    }
    
    addActivityLog(message, type = 'success') {
        const activityLog = document.getElementById('activityLog');
        if (!activityLog) return;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">${timeStr}</span>
            <span class="log-action ${type}">${message}</span>
        `;
        
        activityLog.insertBefore(logEntry, activityLog.firstChild);
        
        // Keep only last 10 entries
        while (activityLog.children.length > 10) {
            activityLog.removeChild(activityLog.lastChild);
        }
    }
    
    updateThreatFeed(newEmails) {
        const threatFeed = document.getElementById('threatFeed');
        if (!threatFeed || !newEmails || newEmails.length === 0) return;
        
        const highRisk = newEmails.filter(e => e.riskLevel === 'high');
        if (highRisk.length > 0) {
            const threatItem = document.createElement('div');
            threatItem.className = 'threat-item critical';
            threatItem.innerHTML = `
                <strong>Phishing Campaign Detected</strong><br>
                <small>${highRisk.length} high-risk email${highRisk.length > 1 ? 's' : ''} targeting banking admin accounts</small>
                <div class="threat-time">Just now</div>
            `;
            threatFeed.insertBefore(threatItem, threatFeed.firstChild);
            
            // Keep only last 5 threat items
            while (threatFeed.children.length > 5) {
                threatFeed.removeChild(threatFeed.lastChild);
            }
        }
    }

    handleNewEmails(newEmails) {
        console.log(`Bank Admin handleNewEmails: Received ${newEmails?.length || 0} new emails`);
        if (newEmails && newEmails.length > 0) {
            console.log('New email IDs:', newEmails.map(e => e.id));
            console.log('New email targets:', newEmails.map(e => e.targetPersona?.name));
            
            // Small delay to ensure localStorage write has completed (longer delay for cross-tab sync)
            setTimeout(() => {
                // Verify emails are actually in localStorage before processing
                const verify = JSON.parse(localStorage.getItem('demo3_bank_inbox') || '[]');
                console.log(`Bank Admin handleNewEmails: Verified ${verify.length} emails in localStorage before processing`);
                
                // Force a fresh read first to get the actual email objects
                this.loadEmails();
                
                // Run automated security analysis on new emails (use emails from this.emails after load)
                const newEmailIds = new Set(newEmails.map(e => e.id));
                this.emails.forEach(email => {
                    if (newEmailIds.has(email.id) && email.status === 'delivered' && !email.detectionMetadata) {
                        console.log(`Analyzing email ${email.id} with decision tree`);
                        this.automatedSecurityAnalysis(email);
                    }
                });
                
                // Save updated emails back to localStorage
                this.saveEmails();
                
                // Double-check after a short delay (for cross-tab sync issues)
                setTimeout(() => {
                    const doubleCheck = JSON.parse(localStorage.getItem('demo3_bank_inbox') || '[]');
                    console.log(`Bank Admin handleNewEmails: Double-check - ${doubleCheck.length} emails in localStorage`);
                    if (doubleCheck.length !== this.emails.length) {
                        console.log('Bank Admin: Email count mismatch detected, reloading...');
                        this.loadEmails();
                    }
                    
                    // Reload to get updated risk levels
                    this.loadEmails();
                    this.displayEmails();
                    this.updateKPIs(); // Make sure KPIs are updated
                    this.updateSecurityStatus();
                    this.showSecurityAlert(newEmails);
                    this.updateThreatFeed(newEmails);
                    
                    const hasHighRisk = this.emails.some(e => newEmailIds.has(e.id) && e.riskLevel === 'high');
                    this.addActivityLog(`${newEmails.length} new email${newEmails.length > 1 ? 's' : ''} received - ML analysis complete`, 
                        hasHighRisk ? 'critical' : 'warning');
                    
                    // Update evaluation metrics immediately (even with pending emails)
                    setTimeout(() => {
                        this.updateEvaluationMetrics();
                    }, 500);
                }, 300);
            }, 200);
        }
    }

    showSecurityAlert(newEmails) {
        const alertPanel = document.getElementById('alertPanel');
        const alertMessage = document.getElementById('alertMessage');
        
        const highRiskCount = newEmails.filter(e => e.riskLevel === 'high').length;
        const mediumRiskCount = newEmails.filter(e => e.riskLevel === 'medium').length;
        
        if (highRiskCount > 0 || mediumRiskCount > 0) {
            alertMessage.innerHTML = `
                <strong>⚠️ ${newEmails.length} new email${newEmails.length > 1 ? 's' : ''} received</strong><br>
                ${highRiskCount > 0 ? `<span style="color: #ff4444;">${highRiskCount} high-risk email${highRiskCount > 1 ? 's' : ''}</span>` : ''}
                ${mediumRiskCount > 0 ? `<span style="color: #ff8800;">${mediumRiskCount} medium-risk email${mediumRiskCount > 1 ? 's' : ''}</span>` : ''}
                <br><small>Review emails in inbox below</small>
            `;
            alertPanel.style.display = 'block';
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                alertPanel.style.display = 'none';
            }, 10000);
        }
    }

    displayEmails() {
        const emailInbox = document.getElementById('emailInbox');
        
        if (this.emails.length === 0) {
            emailInbox.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No emails received yet. Emails will appear here when generated from the Hacker Dashboard.</p>';
            return;
        }

        // Filter emails based on current filter
        let filteredEmails = this.emails;
        if (this.currentFilter === 'high') {
            filteredEmails = this.emails.filter(e => e.riskLevel === 'high');
        } else if (this.currentFilter === 'medium') {
            filteredEmails = this.emails.filter(e => e.riskLevel === 'medium');
        } else if (this.currentFilter === 'low') {
            filteredEmails = this.emails.filter(e => e.riskLevel === 'low');
        }

        if (filteredEmails.length === 0) {
            emailInbox.innerHTML = `<p style="color: #666; text-align: center; padding: 40px;">No ${this.currentFilter === 'all' ? '' : this.currentFilter + ' risk '}emails found.</p>`;
            return;
        }

        emailInbox.innerHTML = filteredEmails.map(email => {
            const riskClass = email.riskLevel === 'high' ? 'suspicious' : email.riskLevel === 'medium' ? 'high-risk' : '';
            const riskBadgeClass = `risk-${email.riskLevel}`;
            const timeAgo = this.getTimeAgo(email.receivedAt);
            
            return `
                <div class="email-item ${riskClass}" onclick="bankAdminDashboard.selectEmail('${email.id}')">
                    <div class="email-header">
                        <div>
                            <span class="email-sender">${email.sender}</span>
                            <span class="risk-badge ${riskBadgeClass}">${email.riskLevel.toUpperCase()}</span>
                        </div>
                        <span class="email-time">${timeAgo}</span>
                    </div>
                    <div class="email-subject">${email.subject}</div>
                    <div class="email-preview">
                        ${email.content.substring(0, 150)}${email.content.length > 150 ? '...' : ''}
                    </div>
                    ${!email.read ? '<span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-top: 8px; display: inline-block;">NEW</span>' : ''}
                </div>
            `;
        }).join('');
    }

    selectEmail(emailId) {
        this.selectedEmail = this.emails.find(e => e.id === emailId);
        if (this.selectedEmail) {
            if (!this.selectedEmail.read) {
                this.selectedEmail.read = true;
                this.saveEmails();
                this.addActivityLog(`Viewed email: ${this.selectedEmail.subject}`, 'success');
            }
            this.displayEmailDetail();
        }
    }

    displayEmailDetail() {
        if (!this.selectedEmail) return;

        const emailInbox = document.getElementById('emailInbox');
        const emailIndex = this.emails.findIndex(e => e.id === this.selectedEmail.id);
        
        // Replace the email item with detailed view
        const emailItem = emailInbox.children[emailIndex];
        const riskClass = this.selectedEmail.riskLevel === 'high' ? 'suspicious' : this.selectedEmail.riskLevel === 'medium' ? 'high-risk' : '';
        const riskBadgeClass = `risk-${this.selectedEmail.riskLevel}`;
        const timeAgo = this.getTimeAgo(this.selectedEmail.receivedAt);

        emailItem.outerHTML = `
            <div class="email-item ${riskClass}" style="background: white; border: 2px solid ${this.selectedEmail.riskLevel === 'high' ? '#ff4444' : this.selectedEmail.riskLevel === 'medium' ? '#ff8800' : '#667eea'};">
                <div style="margin-bottom: 15px;">
                    <button onclick="bankAdminDashboard.backToInbox()" style="background: #667eea; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; margin-bottom: 15px;">
                        <i class="fas fa-arrow-left"></i> Back to Inbox
                    </button>
                </div>
                
                <div class="email-header">
                    <div>
                        <span class="email-sender">${this.selectedEmail.sender}</span>
                        <span class="risk-badge ${riskBadgeClass}">${this.selectedEmail.riskLevel.toUpperCase()}</span>
                    </div>
                    <span class="email-time">${timeAgo}</span>
                </div>
                
                <div style="color: #666; font-size: 14px; margin-bottom: 10px;">
                    <strong>From:</strong> ${this.selectedEmail.senderEmail}<br>
                    <strong>To:</strong> ${this.selectedEmail.targetPersona.email}<br>
                    <strong>Risk Score:</strong> ${this.selectedEmail.riskScore}/100
                </div>
                
                <div class="email-subject" style="font-size: 18px; margin: 15px 0;">${this.selectedEmail.subject}</div>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 15px 0; white-space: pre-wrap; line-height: 1.6; color: #333;">
                    ${this.selectedEmail.content}
                </div>

                <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff4444;">
                    <h4 style="margin-top: 0; color: #ff4444;"><i class="fas fa-exclamation-triangle"></i> Security Analysis (ML Decision Tree)</h4>
                    ${this.selectedEmail.mlClassification ? `
                        <div style="margin-bottom: 10px;">
                            <strong>ML Classification:</strong> 
                            <span style="padding: 4px 8px; border-radius: 4px; background: ${this.selectedEmail.mlClassification.riskLevel === 'high' ? '#ff4444' : this.selectedEmail.mlClassification.riskLevel === 'medium' ? '#ff8800' : '#00aa44'}; color: white; font-weight: bold;">
                                ${this.selectedEmail.mlClassification.riskLevel.toUpperCase()}
                            </span>
                            <span style="margin-left: 10px; color: #666;">Confidence: ${(this.selectedEmail.mlClassification.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div style="margin-bottom: 10px; color: #666;">
                            <strong>Reasoning:</strong> ${this.selectedEmail.mlClassification.reasoning}
                        </div>
                    ` : ''}
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        ${this.selectedEmail.riskScore > 70 ? '<li><strong>High Risk:</strong> Contains urgent language and credential requests</li>' : ''}
                        ${this.selectedEmail.subject.toLowerCase().includes('urgent') || this.selectedEmail.subject.toLowerCase().includes('critical') ? '<li><strong>Urgency Indicators:</strong> Subject line uses urgent language</li>' : ''}
                        ${this.selectedEmail.content.toLowerCase().includes('credentials') || this.selectedEmail.content.toLowerCase().includes('password') ? '<li><strong>Suspicious:</strong> Requests sensitive information</li>' : ''}
                        ${this.selectedEmail.mlClassification?.features?.urlAuthenticityScore !== undefined ? 
                            `<li><strong>URL Authenticity:</strong> ${this.selectedEmail.mlClassification.features.urlAuthenticityScore.toFixed(0)}/100 ${this.selectedEmail.mlClassification.features.urlAuthenticityScore < 50 ? '(Suspicious)' : '(Authentic)'}</li>` : ''}
                        ${this.selectedEmail.mlClassification?.features?.senderAuthenticityScore !== undefined ? 
                            `<li><strong>Sender Authenticity:</strong> ${this.selectedEmail.mlClassification.features.senderAuthenticityScore.toFixed(0)}/100</li>` : ''}
                        ${this.selectedEmail.mlClassification?.features?.grammarScore !== undefined ? 
                            `<li><strong>Grammar Quality:</strong> ${this.selectedEmail.mlClassification.features.grammarScore.toFixed(0)}/100</li>` : ''}
                    </ul>
                </div>

                <div class="action-buttons">
                    <button class="btn btn-block" onclick="bankAdminDashboard.blockEmail('${this.selectedEmail.id}')">
                        <i class="fas fa-ban"></i> Block Sender
                    </button>
                    <button class="btn btn-report" onclick="bankAdminDashboard.reportPhishing('${this.selectedEmail.id}')">
                        <i class="fas fa-flag"></i> Report Phishing
                    </button>
                    ${this.selectedEmail.riskLevel !== 'low' ? '' : `
                        <button class="btn btn-approve" onclick="bankAdminDashboard.approveEmail('${this.selectedEmail.id}')">
                            <i class="fas fa-check"></i> Mark as Safe
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    backToInbox() {
        this.displayEmails();
        this.selectedEmail = null;
    }

    blockEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email && confirm(`Block emails from ${email.senderEmail}?`)) {
            email.status = 'blocked';
            this.saveEmails();
            this.updateKPIs();
            this.updateSecurityStatus();
            this.addActivityLog(`Blocked sender: ${email.senderEmail}`, 'success');
            this.displayEmails();
            alert(`Emails from ${email.senderEmail} have been blocked.`);
            this.backToInbox();
        }
    }

    reportPhishing(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            email.status = 'reported';
            this.saveEmails();
            
            // Log to security team (simulated)
            const securityLog = JSON.parse(localStorage.getItem('demo3_security_log') || '[]');
            securityLog.push({
                emailId: email.id,
                subject: email.subject,
                sender: email.senderEmail,
                target: email.targetPersona.name,
                reportedAt: new Date().toISOString(),
                riskScore: email.riskScore
            });
            localStorage.setItem('demo3_security_log', JSON.stringify(securityLog));
            
            this.updateKPIs();
            this.updateSecurityStatus();
            this.addActivityLog(`Reported phishing: ${email.subject}`, 'critical');
            this.displayEmails();
            
            alert('Phishing email reported to security team. Incident ticket created.');
            this.backToInbox();
        }
    }

    approveEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email && confirm('Mark this email as safe and legitimate?')) {
            email.status = 'approved';
            this.saveEmails();
            this.addActivityLog(`Approved email: ${email.subject}`, 'success');
            this.displayEmails();
            alert('Email marked as safe.');
            this.backToInbox();
        }
    }

    saveEmails() {
        localStorage.setItem('demo3_bank_inbox', JSON.stringify(this.emails));
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    // Automated security analysis using Decision Tree ML classifier
    automatedSecurityAnalysis(email) {
        if (!this.autoDetectionEnabled) return;
        
        // Use Decision Tree Classifier to classify email risk
        const classification = this.decisionTreeClassifier.classify({
            subject: email.subject || '',
            content: email.content || '',
            sender: email.sender || '',
            senderEmail: email.senderEmail || '',
            urls: email.urls || [],
            attachments: email.attachments || []
        });
        
        // Update email with ML classification results
        email.riskLevel = classification.riskLevel; // 'high', 'medium', or 'low'
        email.riskScore = classification.riskScore; // 0-100 score
        email.mlClassification = {
            riskLevel: classification.riskLevel,
            riskScore: classification.riskScore,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            features: classification.features
        };
        
        // Determine base detection rate based on ML-classified risk level
        // Higher risk = higher detection rate
        let baseDetectionRate;
        switch(classification.riskLevel) {
            case 'high':
                // High risk emails are detected more often
                baseDetectionRate = this.detectionSettings.generalPhishing * 1.2; // Boost for high risk
                baseDetectionRate = Math.min(0.95, baseDetectionRate); // Cap at 95%
                break;
            case 'medium':
                // Medium risk uses base detection rates
                baseDetectionRate = this.detectionSettings.generalPhishing;
                break;
            case 'low':
                // Low risk emails are detected less often
                baseDetectionRate = this.detectionSettings.generalPhishing * 0.6;
                break;
            default:
                baseDetectionRate = this.detectionSettings.generalPhishing;
        }
        
        // Apply model-specific adjustments (AI-generated emails may be harder to detect)
        const modelName = email.model?.toLowerCase() || 'default';
        let modelAdjustment = this.detectionSettings.modelAdjustments.default;
        for (const [key, value] of Object.entries(this.detectionSettings.modelAdjustments)) {
            if (modelName.includes(key) && key !== 'default') {
                modelAdjustment = value;
                break;
            }
        }
        
        // Adjust detection rate (negative adjustment = harder to detect = lower detection rate)
        const adjustedDetectionRate = Math.max(0, Math.min(1, baseDetectionRate + modelAdjustment));
        
        // Add some randomness (real-world security systems aren't 100% consistent)
        const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% variance
        const finalDetectionRate = Math.max(0, Math.min(1, adjustedDetectionRate + randomFactor));
        
        // Determine if email will be detected
        const willBeDetected = Math.random() < finalDetectionRate;
        
        // Calculate response time based on ML-classified risk level
        let responseTimeMinutes;
        if (classification.riskLevel === 'high') {
            const range = this.detectionSettings.highRiskResponseTime;
            responseTimeMinutes = Math.random() * (range.max - range.min) + range.min;
        } else if (classification.riskLevel === 'medium') {
            const range = this.detectionSettings.mediumRiskResponseTime;
            responseTimeMinutes = Math.random() * (range.max - range.min) + range.min;
        } else {
            const range = this.detectionSettings.lowRiskResponseTime;
            responseTimeMinutes = Math.random() * (range.max - range.min) + range.min;
        }
        
        // For high-risk emails, always auto-block (regardless of detection probability)
        // For medium-risk, use scheduled detection based on willBeDetected
        if (classification.riskLevel === 'high') {
            // High-risk emails should be blocked quickly (within 1-3 minutes)
            const highRiskResponseTime = Math.min(responseTimeMinutes, 3); // Cap at 3 minutes for high risk
            const responseTimeMs = highRiskResponseTime * 60 * 1000;
            
            // Always schedule auto-block for high-risk emails
            setTimeout(() => {
                this.autoDetectEmail(email.id);
            }, responseTimeMs);
            
            // Override willBeDetected to true for high-risk emails
            willBeDetected = true;
        } else if (classification.riskLevel === 'medium' && willBeDetected) {
            // Medium-risk emails use normal scheduled detection
            const responseTimeMs = responseTimeMinutes * 60 * 1000;
            setTimeout(() => {
                this.autoDetectEmail(email.id);
            }, responseTimeMs);
        }
        // Low-risk emails are not auto-blocked
        
        // Store detection metadata for evaluation
        email.detectionMetadata = {
            mlClassification: classification,
            baseDetectionRate: baseDetectionRate,
            adjustedRate: adjustedDetectionRate,
            finalRate: finalDetectionRate,
            willBeDetected: willBeDetected,
            scheduledResponseTime: responseTimeMinutes,
            analysisTime: new Date().toISOString(),
            analysisMethod: 'decision_tree_ml'
        };
        
        this.saveEmails();
        return email.detectionMetadata;
    }
    
    // Auto-detect and block/report email
    autoDetectEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (!email || email.status !== 'delivered') return; // Already processed
        
        // Determine action based on ML-classified risk level (use decision tree classification)
        if (email.riskLevel === 'high') {
            // High risk: Auto-block immediately
            email.status = 'blocked';
            email.autoDetected = true;
            email.detectedAt = new Date().toISOString();
            email.detectionTime = (new Date(email.detectedAt) - new Date(email.receivedAt)) / (1000 * 60); // minutes
            this.addActivityLog(`[AUTO] Blocked high-risk email: ${email.subject}`, 'critical');
        } else if (email.riskLevel === 'medium') {
            // Medium risk: Auto-report
            email.status = 'reported';
            email.autoDetected = true;
            email.detectedAt = new Date().toISOString();
            email.detectionTime = (new Date(email.detectedAt) - new Date(email.receivedAt)) / (1000 * 60); // minutes
            
            // Log to security team
            const securityLog = JSON.parse(localStorage.getItem('demo3_security_log') || '[]');
            securityLog.push({
                emailId: email.id,
                subject: email.subject,
                sender: email.senderEmail,
                target: email.targetPersona?.name || 'Unknown',
                reportedAt: email.detectedAt,
                riskScore: email.riskScore,
                riskLevel: email.riskLevel,
                autoDetected: true
            });
            localStorage.setItem('demo3_security_log', JSON.stringify(securityLog));
            
            this.addActivityLog(`[AUTO] Reported phishing: ${email.subject}`, 'warning');
        }
        // Low risk emails remain as 'delivered' and are not auto-blocked
        
        this.saveEmails();
        this.updateKPIs();
        this.updateSecurityStatus();
        this.displayEmails();
        
        // Trigger evaluation metrics update
        this.updateEvaluationMetrics();
    }
    
    // Process emails that haven't been analyzed yet
    processPendingEmails() {
        let analyzedCount = 0;
        this.emails.forEach(email => {
            if (email.status === 'delivered' && !email.detectionMetadata) {
                this.automatedSecurityAnalysis(email);
                analyzedCount++;
            }
        });
        
        if (analyzedCount > 0) {
            // Save emails after analysis
            this.saveEmails();
            // Update KPIs after analyzing emails
            this.updateKPIs();
            console.log(`Processed ${analyzedCount} pending emails with decision tree classifier`);
        }
        
        // Check for overdue emails that should have been detected but haven't been processed yet
        this.checkOverdueDetections();
    }
    
    // Check for emails that should have been detected but haven't been processed
    checkOverdueDetections() {
        const now = new Date();
        this.emails.forEach(email => {
            if (email.status === 'delivered' && 
                email.detectionMetadata?.willBeDetected === true && 
                email.detectionMetadata?.scheduledResponseTime) {
                
                const receivedAt = new Date(email.receivedAt);
                const scheduledMs = email.detectionMetadata.scheduledResponseTime * 60 * 1000;
                const expectedDetectionTime = new Date(receivedAt.getTime() + scheduledMs);
                
                // If the expected detection time has passed, process it immediately
                if (now >= expectedDetectionTime) {
                    console.log('Processing overdue email:', email.id);
                    this.autoDetectEmail(email.id);
                }
            }
        });
    }

    // Calculate and update evaluation metrics for measuring AI phishing success
    updateEvaluationMetrics() {
        // Count ALL emails as total sent
        const totalSent = this.emails.length;
        
        console.log(`Evaluation Metrics: Calculating for ${totalSent} total emails`);
        console.log('All email IDs:', this.emails.map(e => e.id));
        console.log('All email targets:', this.emails.map(e => e.targetPersona?.name));
        
        if (totalSent === 0) {
            return;
        }
        
        // Get analyzed emails (have detectionMetadata)
        const analyzedEmails = this.emails.filter(e => e.detectionMetadata);
        
        // Count detected emails (all emails, not just analyzed ones)
        const detected = this.emails.filter(e => e.status === 'blocked' || e.status === 'reported').length;
        
        // Count pending emails (analyzed and scheduled for detection, but not yet processed)
        const pending = analyzedEmails.filter(e => e.status === 'delivered' && e.detectionMetadata?.willBeDetected === true).length;
        
        // Count bypassed emails (analyzed and won't be detected, OR not analyzed yet but delivered)
        const bypassedAnalyzed = analyzedEmails.filter(e => e.status === 'delivered' && (!e.detectionMetadata?.willBeDetected || e.detectionMetadata.willBeDetected === false)).length;
        const bypassedNotAnalyzed = this.emails.filter(e => e.status === 'delivered' && !e.detectionMetadata).length;
        const bypassed = bypassedAnalyzed + bypassedNotAnalyzed;
        
        // Detection rate (based on detected + expected detections)
        const expectedDetections = analyzedEmails.filter(e => e.detectionMetadata?.willBeDetected === true).length;
        const detectionRate = totalSent > 0 ? ((detected + (pending * (detected / Math.max(1, detected + bypassed)) || 0)) / totalSent * 100).toFixed(1) : 0;
        const actualDetectionRate = totalSent > 0 ? (detected / totalSent * 100).toFixed(1) : 0;
        
        // Bypass rate (successful phishing - emails that weren't detected or won't be detected)
        const bypassRate = totalSent > 0 ? ((bypassed + (pending * (bypassed / Math.max(1, detected + bypassed)) || 0)) / totalSent * 100).toFixed(1) : 0;
        const actualBypassRate = totalSent > 0 ? (bypassed / totalSent * 100).toFixed(1) : 0;
        
        // Average detection time (only from analyzed emails)
        const detectedEmails = analyzedEmails.filter(e => e.detectionTime !== undefined);
        const avgDetectionTime = detectedEmails.length > 0 
            ? (detectedEmails.reduce((sum, e) => sum + e.detectionTime, 0) / detectedEmails.length).toFixed(1)
            : 0;
        
        // Calculate time until next expected detection
        const now = new Date();
        const pendingWithTimes = analyzedEmails
            .filter(e => e.status === 'delivered' && e.detectionMetadata?.willBeDetected === true && e.detectionMetadata?.scheduledResponseTime)
            .map(e => {
                const receivedAt = new Date(e.receivedAt);
                const scheduledMs = e.detectionMetadata.scheduledResponseTime * 60 * 1000;
                const expectedDetectionTime = new Date(receivedAt.getTime() + scheduledMs);
                const minutesUntil = Math.ceil((expectedDetectionTime - now) / (1000 * 60));
                return { email: e, expectedTime: expectedDetectionTime, minutesUntil };
            })
            .sort((a, b) => a.expectedTime - b.expectedTime);
        
        // Check for overdue emails and process them
        const overdueEmails = pendingWithTimes.filter(e => e.minutesUntil <= 0);
        if (overdueEmails.length > 0) {
            // Process overdue emails immediately
            overdueEmails.forEach(({ email }) => {
                if (email.status === 'delivered') {
                    this.autoDetectEmail(email.id);
                }
            });
        }
        
        const nextDetectionIn = pendingWithTimes.length > 0 
            ? pendingWithTimes[0].minutesUntil > 0 
                ? pendingWithTimes[0].minutesUntil
                : -1 // -1 means overdue/processing
            : null;
        
        // Metrics by attack level (use all emails for level/model breakdown)
        const metricsByLevel = {
            basic: this.calculateLevelMetrics(this.emails, 'basic'),
            advanced: this.calculateLevelMetrics(this.emails, 'advanced'),
            expert: this.calculateLevelMetrics(this.emails, 'expert')
        };
        
        // Metrics by model (use all emails)
        const metricsByModel = {};
        const uniqueModels = [...new Set(this.emails.map(e => e.model).filter(Boolean))];
        console.log(`Found ${uniqueModels.length} unique models:`, uniqueModels);
        console.log(`All emails:`, this.emails.map(e => ({ id: e.id, model: e.model, target: e.targetPersona?.name, attackLevel: e.attackLevel })));
        
        uniqueModels.forEach(model => {
            const metrics = this.calculateModelMetrics(this.emails, model);
            if (metrics) {
                // Use the model name from the first matching email for consistency
                const firstMatch = this.emails.find(e => e.model === model || (e.model && (e.model.includes(model) || model.includes(e.model))));
                const displayModel = firstMatch?.model || model;
                metricsByModel[displayModel] = metrics;
            }
        });
        
        // Determine if there are unanalyzed emails
        const unanalyzedEmails = this.emails.filter(e => e.status === 'delivered' && !e.detectionMetadata);
        if (unanalyzedEmails.length > 0) {
            // Try to analyze any unanalyzed emails
            unanalyzedEmails.forEach(email => {
                this.automatedSecurityAnalysis(email);
            });
        }
        
        // Store metrics for hacker dashboard to access
        const evaluationMetrics = {
            timestamp: new Date().toISOString(),
            totalSent,
            detected,
            bypassed,
            pending,
            expectedDetections,
            detectionRate: parseFloat(actualDetectionRate),
            projectedDetectionRate: parseFloat(detectionRate),
            bypassRate: parseFloat(actualBypassRate),
            projectedBypassRate: parseFloat(bypassRate),
            avgDetectionTimeMinutes: parseFloat(avgDetectionTime),
            nextDetectionInMinutes: nextDetectionIn,
            byAttackLevel: metricsByLevel,
            byModel: metricsByModel,
            status: pending > 0 ? 'analyzing' : 'complete'
        };
        
        localStorage.setItem('demo3_evaluation_metrics', JSON.stringify(evaluationMetrics));
        
        // Trigger event for hacker dashboard
        window.dispatchEvent(new CustomEvent('evaluationMetricsUpdated', { detail: evaluationMetrics }));
        
        return evaluationMetrics;
    }
    
    calculateLevelMetrics(emails, level) {
        const levelEmails = emails.filter(e => {
            const emailLevel = e.attackLevel?.toLowerCase();
            const matchLevel = level?.toLowerCase();
            return emailLevel === matchLevel;
        });
        console.log(`Level metrics for "${level}": Found ${levelEmails.length} emails out of ${emails.length} total`);
        console.log(`  All email levels:`, emails.map(e => ({ id: e.id, level: e.attackLevel, target: e.targetPersona?.name })));
        console.log(`  Matching emails:`, levelEmails.map(e => ({ id: e.id, target: e.targetPersona?.name, model: e.model, status: e.status })));
        
        if (levelEmails.length === 0) return null;
        
        const detected = levelEmails.filter(e => e.status === 'blocked' || e.status === 'reported').length;
        const bypassed = levelEmails.length - detected;
        
        return {
            total: levelEmails.length,
            detected,
            bypassed,
            detectionRate: (detected / levelEmails.length * 100).toFixed(1),
            bypassRate: (bypassed / levelEmails.length * 100).toFixed(1)
        };
    }
    
    calculateModelMetrics(emails, model) {
        // Match by exact model or if model string is contained in email.model (handles variations)
        const modelEmails = emails.filter(e => {
            if (!e.model || !model) return false;
            const emailModel = e.model.toLowerCase();
            const matchModel = model.toLowerCase();
            return emailModel === matchModel || emailModel.includes(matchModel) || matchModel.includes(emailModel);
        });
        
        console.log(`Model metrics for "${model}": Found ${modelEmails.length} emails out of ${emails.length} total`);
        console.log(`  All email models:`, emails.map(e => ({ id: e.id, model: e.model, target: e.targetPersona?.name })));
        console.log(`  Matching emails:`, modelEmails.map(e => ({ id: e.id, model: e.model, target: e.targetPersona?.name, status: e.status })));
        
        if (modelEmails.length === 0) return null;
        
        const detected = modelEmails.filter(e => e.status === 'blocked' || e.status === 'reported').length;
        const bypassed = modelEmails.length - detected;
        
        const detectedEmails = modelEmails.filter(e => e.detectionTime !== undefined);
        const avgDetectionTime = detectedEmails.length > 0 
            ? (detectedEmails.reduce((sum, e) => sum + e.detectionTime, 0) / detectedEmails.length).toFixed(1)
            : 0;
        
        return {
            total: modelEmails.length,
            detected,
            bypassed,
            detectionRate: (detected / modelEmails.length * 100).toFixed(1),
            bypassRate: (bypassed / modelEmails.length * 100).toFixed(1),
            avgDetectionTimeMinutes: parseFloat(avgDetectionTime)
        };
    }
}

// Initialize bank admin dashboard
let bankAdminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the bank admin dashboard view
    if (document.getElementById('bank-admin-dashboard')) {
        bankAdminDashboard = new BankAdminDashboard();
        // Make it globally accessible
        window.bankAdminDashboard = bankAdminDashboard;
    }
});
