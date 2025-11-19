// Demo 3 - Hacker Dashboard Controller
class HackerDashboard {
    constructor() {
        this.campaigns = [];
        this.currentCampaign = null;
        this.selectedTargets = [];
        this.generatedEmails = [];
        this.personas = [];
        this.coverageTracker = new PhishingCoverageTracker();
        this.coverageMetrics = null;
        
        this.init();
    }

    init() {
        this.loadPersonas();
        this.loadCampaigns();
        this.setupEventListeners();
        this.setupEvaluationMetricsListener();
        this.setupCoverageTracking();
        this.updateKPIs();
        this.updateQuickStats();
    }
    
    setupCoverageTracking() {
        // Poll for coverage metrics updates
        setInterval(() => {
            this.loadCoverageMetrics();
        }, 5000); // Poll every 5 seconds
        
        // Load initial coverage metrics
        this.loadCoverageMetrics();
    }
    
    // Track email delivery for coverage
    trackEmailDelivery(email) {
        if (this.coverageTracker) {
            this.coverageTracker.trackDelivery(email.id, {
                campaignId: email.campaignId,
                targetPersona: email.targetPersona
            });
        }
        
        // Also track via API
        fetch('/coverage/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailId: email.id,
                event: 'delivered',
                emailData: {
                    campaignId: email.campaignId,
                    targetPersona: email.targetPersona
                }
            })
        }).catch(err => console.error('[Coverage] Error tracking delivery:', err));
    }
    
    // Load coverage metrics from API
    async loadCoverageMetrics() {
        try {
            const campaignId = this.currentCampaign ? this.currentCampaign.id.toString() : null;
            const url = campaignId 
                ? `/coverage/metrics?campaignId=${campaignId}`
                : '/coverage/metrics';
            
            const response = await fetch(url);
            if (!response.ok) {
                console.warn('[Coverage] Failed to load coverage metrics');
                return;
            }
            
            const data = await response.json();
            if (data.success && data.metrics) {
                this.coverageMetrics = data.metrics;
                this.updateCoverageDisplay();
                
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
        const coverageColor = coveragePercent >= 50 ? '#00ff88' : coveragePercent >= 30 ? '#ffaa00' : '#ff4444';
        
        coveragePanel.innerHTML = `
            <div style="background: #1a1f35; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #667eea; margin: 0;"><i class="fas fa-bullseye"></i> Phishing Coverage Metrics</h4>
                    <span style="background: ${coverageColor}; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${coveragePercent}% Coverage
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div>
                        <div style="color: #888; font-size: 12px;">Total Sent</div>
                        <div style="color: #fff; font-size: 24px; font-weight: bold;">${metrics.total}</div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 12px;">Opened</div>
                        <div style="color: #667eea; font-size: 24px; font-weight: bold;">${metrics.opened}</div>
                        <div style="color: #888; font-size: 11px;">${metrics.coveragePercent}% coverage</div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 12px;">Clicked</div>
                        <div style="color: ${coverageColor}; font-size: 24px; font-weight: bold;">${metrics.clicked}</div>
                        <div style="color: #888; font-size: 11px;">${metrics.clickRate}% click rate</div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 12px;">Reported</div>
                        <div style="color: #ff4444; font-size: 24px; font-weight: bold;">${metrics.reported}</div>
                        <div style="color: #888; font-size: 11px;">${metrics.reportRate}% report rate</div>
                    </div>
                    ${metrics.avgTimeToOpen ? `
                    <div>
                        <div style="color: #888; font-size: 12px;">Avg Time to Open</div>
                        <div style="color: #667eea; font-size: 20px; font-weight: bold;">${metrics.avgTimeToOpen}m</div>
                    </div>
                    ` : ''}
                </div>
                
                ${this.formatDepartmentCoverage(metrics.departments)}
            </div>
        `;
    }
    
    formatDepartmentCoverage(departments) {
        if (!departments || Object.keys(departments).length === 0) return '';
        
        let html = '<div style="margin-top: 20px;"><h5 style="color: #fff; margin-bottom: 10px;">Coverage by Department:</h5>';
        
        Object.entries(departments).forEach(([dept, data]) => {
            const coveragePercent = parseFloat(data.coveragePercent);
            const deptColor = coveragePercent >= 50 ? '#00ff88' : coveragePercent >= 30 ? '#ffaa00' : '#ff4444';
            
            html += `
                <div style="background: #0f1529; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #ffaa00;">${dept}:</strong>
                        <span style="color: ${deptColor}; font-weight: bold;">${data.coveragePercent}%</span>
                    </div>
                    <div style="color: #888; font-size: 12px; margin-top: 5px;">
                        ${data.opened}/${data.total} opened | ${data.clicked} clicked | ${data.reported} reported
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    setupEvaluationMetricsListener() {
        // Listen for evaluation metrics updates from bank admin dashboard
        window.addEventListener('evaluationMetricsUpdated', (event) => {
            this.updateKPIs();
            this.updateEvaluationDisplay(event.detail);
        });
        
        // Poll for evaluation metrics updates (detection metrics)
        setInterval(() => {
            this.loadEvaluationMetrics();
        }, 3000);
        
        // Poll for engagement metrics updates (user behavior)
        setInterval(() => {
            this.loadEngagementMetricsAndUpdate();
        }, 5000); // Poll every 5 seconds
    }
    
    // Load engagement metrics and update display
    async loadEngagementMetricsAndUpdate() {
        const engagementMetrics = await this.loadEngagementMetrics();
        if (engagementMetrics) {
            this.updateEngagementMetrics(engagementMetrics);
        }
    }
    
    // Update engagement metrics display
    updateEngagementMetrics(metrics) {
        // Store metrics for display
        this.engagementMetrics = metrics;
        
        // Update evaluation display if it exists
        const evalPanel = document.getElementById('evaluationMetricsPanel');
        if (evalPanel && this.lastEvaluationMetrics) {
            // Re-render with engagement metrics
            this.updateEvaluationDisplay(this.lastEvaluationMetrics);
        }
    }
    
    loadEvaluationMetrics() {
        const saved = localStorage.getItem('demo3_evaluation_metrics');
        if (saved) {
            const metrics = JSON.parse(saved);
            this.lastEvaluationMetrics = metrics; // Store for engagement metrics integration
            this.updateKPIs(metrics);
            this.updateEvaluationDisplay(metrics);
        }
    }

    loadPersonas() {
        // Use the same personas from the phishing demo
        this.personas = [
            {
                id: 1,
                name: "John Doe",
                role: "System Administrator",
                department: "Information Technology",
                company: "First National Bank",
                email: "john.doe@firstnational.com",
                location: "New York HQ",
                phone: "x3201",
                accessLevel: "High"
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
                accessLevel: "High"
            },
            {
                id: 3,
                name: "Michael Chen",
                role: "Database Administrator",
                department: "Information Technology",
                company: "Regional Financial Corp",
                email: "m.chen@regionalfinance.com",
                location: "San Francisco HQ",
                phone: "x3185",
                accessLevel: "Critical"
            },
            {
                id: 4,
                name: "Sarah Williams",
                role: "Security Administrator",
                department: "Information Security",
                company: "Prestige Investment Group",
                email: "s.williams@prestige-invest.com",
                location: "Boston HQ",
                phone: "x4102",
                accessLevel: "Critical"
            },
            {
                id: 5,
                name: "David Rodriguez",
                role: "IT Operations Administrator",
                department: "Operations",
                company: "Community Trust Bank",
                email: "d.rodriguez@communitytrust.com",
                location: "Miami Branch",
                phone: "x3055",
                accessLevel: "High"
            },
            {
                id: 6,
                name: "Lisa Thompson",
                role: "Application Administrator",
                department: "Information Technology",
                company: "Capital City Bank",
                email: "l.thompson@capitalcity.bank",
                location: "Washington DC HQ",
                phone: "x3250",
                accessLevel: "High"
            },
            {
                id: 7,
                name: "Robert Kim",
                role: "Infrastructure Administrator",
                department: "Information Technology",
                company: "United Financial Services",
                email: "r.kim@unitedfinancial.com",
                location: "Seattle HQ",
                phone: "x3301",
                accessLevel: "High"
            },
            {
                id: 8,
                name: "Amanda Foster",
                role: "Compliance Administrator",
                department: "Risk & Compliance",
                company: "Heritage Bank & Trust",
                email: "a.foster@heritagebank.com",
                location: "Atlanta Branch",
                phone: "x4205",
                accessLevel: "Medium"
            },
            {
                id: 9,
                name: "James Wilson",
                role: "Security Operations Administrator",
                department: "Information Security",
                company: "SecureFirst Bank",
                email: "j.wilson@securefirst.com",
                location: "Dallas HQ",
                phone: "x4150",
                accessLevel: "Critical"
            },
            {
                id: 10,
                name: "Maria Garcia",
                role: "User Access Administrator",
                department: "Information Technology",
                company: "Friendly Neighborhood Bank",
                email: "m.garcia@friendlybank.com",
                location: "Los Angeles HQ",
                phone: "x3105",
                accessLevel: "High"
            }
        ];

        this.displayTargets();
    }

    displayTargets() {
        const targetGrid = document.getElementById('targetGrid');
        targetGrid.innerHTML = '';

        this.personas.forEach(persona => {
            const targetCard = document.createElement('div');
            targetCard.className = 'target-persona';
            targetCard.innerHTML = `
                <input type="checkbox" id="target_${persona.id}" onchange="hackerDashboard.toggleTarget(${persona.id})">
                <label for="target_${persona.id}" style="cursor: pointer; color: #e0e0e0;">
                    <strong>${persona.name}</strong><br>
                    <small>${persona.role}</small><br>
                    <small style="color: #888;">${persona.department}</small><br>
                    <small style="color: #888;">${persona.company}</small><br>
                    <small style="color: #aaa; font-size: 0.85em;">${persona.email}</small><br>
                    <small style="color: #aaa; font-size: 0.85em;">📍 ${persona.location || 'N/A'}</small><br>
                    <small style="color: #aaa; font-size: 0.85em;">📞 ${persona.phone || 'N/A'}</small><br>
                    <small style="color: ${persona.accessLevel === 'Critical' ? '#ff4444' : persona.accessLevel === 'High' ? '#ff8800' : '#00aa44'}; font-weight: 600;">🔐 ${persona.accessLevel || 'N/A'}</small>
                </label>
            `;
            targetGrid.appendChild(targetCard);
        });
    }

    toggleTarget(personaId) {
        const checkbox = document.getElementById(`target_${personaId}`);
        const persona = this.personas.find(p => p.id === personaId);
        
        if (checkbox.checked) {
            if (!this.selectedTargets.find(t => t.id === personaId)) {
                this.selectedTargets.push(persona);
                document.querySelector(`#target_${personaId}`).closest('.target-persona').classList.add('selected');
            }
        } else {
            this.selectedTargets = this.selectedTargets.filter(t => t.id !== personaId);
            document.querySelector(`#target_${personaId}`).closest('.target-persona').classList.remove('selected');
        }

        this.updateSelectedCount();
        this.updateExecuteButton();
    }

    updateSelectedCount() {
        document.getElementById('selectedCount').textContent = this.selectedTargets.length;
        this.updateKPIs();
    }

    updateExecuteButton() {
        const executeBtn = document.getElementById('executeBtn');
        executeBtn.disabled = this.selectedTargets.length === 0 || !this.currentCampaign;
        
        const statusEl = document.getElementById('campaignStatus');
        if (statusEl) {
            if (this.currentCampaign) {
                statusEl.textContent = this.currentCampaign.emails.length > 0 ? 'Deployed' : 'Ready';
                statusEl.style.color = this.currentCampaign.emails.length > 0 ? '#00ff88' : '#ffaa00';
            } else {
                statusEl.textContent = 'No Active Campaign';
                statusEl.style.color = '#888';
            }
        }
    }
    
    updateKPIs(evaluationMetrics = null) {
        const activeCampaigns = this.campaigns.filter(c => c.emails.length > 0 || c === this.currentCampaign).length;
        const totalEmails = this.campaigns.reduce((sum, c) => sum + c.emails.length, 0);
        const targets = this.selectedTargets.length;
        
        document.getElementById('kpi-active-campaigns').textContent = activeCampaigns;
        document.getElementById('kpi-emails-sent').textContent = totalEmails;
        document.getElementById('kpi-targets').textContent = targets;
        
        // Update change indicators
        document.getElementById('kpi-campaigns-change').textContent = `+${activeCampaigns} active`;
        document.getElementById('kpi-emails-change').textContent = `${totalEmails} total`;
        document.getElementById('kpi-targets-change').textContent = targets > 0 ? `${targets} selected` : '0 active';
        
        // Success rate - use real evaluation metrics if available
        if (evaluationMetrics && evaluationMetrics.totalSent > 0) {
            const bypassRate = evaluationMetrics.bypassRate || 0; // Bypass rate = success rate
            document.getElementById('kpi-success-rate').textContent = `${bypassRate.toFixed(1)}%`;
            const detected = evaluationMetrics.detected || 0;
            document.getElementById('kpi-success-change').textContent = `${detected} detected, ${evaluationMetrics.bypassed} bypassed`;
        } else {
            // Load from storage if not provided
            const saved = localStorage.getItem('demo3_evaluation_metrics');
            if (saved) {
                const metrics = JSON.parse(saved);
                if (metrics.totalSent > 0) {
                    document.getElementById('kpi-success-rate').textContent = `${metrics.bypassRate.toFixed(1)}%`;
                    document.getElementById('kpi-success-change').textContent = `${metrics.detected} detected, ${metrics.bypassed} bypassed`;
                } else {
                    document.getElementById('kpi-success-rate').textContent = '0%';
                    document.getElementById('kpi-success-change').textContent = totalEmails > 0 ? 'Monitoring...' : 'Pending';
                }
            } else {
                document.getElementById('kpi-success-rate').textContent = '0%';
                document.getElementById('kpi-success-change').textContent = totalEmails > 0 ? 'Monitoring...' : 'Pending';
            }
        }
    }
    
    updateEvaluationDisplay(metrics) {
        // Update detailed evaluation metrics display if element exists
        const evalPanel = document.getElementById('evaluationMetricsPanel');
        if (!evalPanel || !metrics) return;
        
        const isAnalyzing = metrics.status === 'analyzing' || metrics.pending > 0;
        const statusBadge = isAnalyzing 
            ? `<span style="background: #ffaa00; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;"><i class="fas fa-spinner fa-spin"></i> Analyzing...</span>`
            : `<span style="background: #00ff88; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;"><i class="fas fa-check"></i> Complete</span>`;
        
        const pendingInfo = metrics.pending > 0 
            ? `<div style="background: #ffaa0033; border-left: 3px solid #ffaa00; padding: 10px; border-radius: 6px; margin: 10px 0;">
                <strong style="color: #ffaa00;">${metrics.pending} email${metrics.pending > 1 ? 's' : ''} pending detection</strong>
                ${metrics.nextDetectionInMinutes !== null 
                    ? metrics.nextDetectionInMinutes === -1
                        ? '<div style="color: #ffaa00; font-size: 12px; margin-top: 5px;"><i class="fas fa-spinner fa-spin"></i> Processing overdue detections...</div>'
                        : metrics.nextDetectionInMinutes >= 0
                            ? `<div style="color: #888; font-size: 12px; margin-top: 5px;">Next detection expected in ~${metrics.nextDetectionInMinutes} minute${metrics.nextDetectionInMinutes !== 1 ? 's' : ''}</div>`
                            : '<div style="color: #888; font-size: 12px; margin-top: 5px;">Detection in progress...</div>'
                    : '<div style="color: #888; font-size: 12px; margin-top: 5px;">Detection in progress...</div>'}
            </div>`
            : '';
        
        // Format metrics display
        evalPanel.innerHTML = `
            <div style="background: #1a1f35; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #00ff88; margin: 0;"><i class="fas fa-chart-line"></i> Attack Effectiveness Metrics</h4>
                    ${statusBadge}
                </div>
                
                ${pendingInfo}
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <div style="color: #888; font-size: 12px;">Total Emails Sent</div>
                        <div style="color: #fff; font-size: 24px; font-weight: bold;">${metrics.totalSent}</div>
                        ${metrics.pending > 0 ? `<div style="color: #ffaa00; font-size: 11px;">${metrics.pending} analyzing</div>` : ''}
                    </div>
                    <div>
                        <div style="color: #888; font-size: 12px;">Detected (Blocked/Reported)</div>
                        <div style="color: #ff4444; font-size: 24px; font-weight: bold;">${metrics.detected}</div>
                        <div style="color: #888; font-size: 12px;">
                            ${metrics.detectionRate.toFixed(1)}% detected
                            ${metrics.projectedDetectionRate && metrics.projectedDetectionRate > metrics.detectionRate 
                                ? `<span style="color: #ffaa00;">(projected: ${metrics.projectedDetectionRate.toFixed(1)}%)</span>` 
                                : ''}
                        </div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 12px;">Bypassed (Successful)</div>
                        <div style="color: #00ff88; font-size: 24px; font-weight: bold;">${metrics.bypassed}</div>
                        <div style="color: #888; font-size: 12px;">
                            ${metrics.bypassRate.toFixed(1)}% success rate
                            ${metrics.projectedBypassRate && metrics.projectedBypassRate > metrics.bypassRate 
                                ? `<span style="color: #ffaa00;">(projected: ${metrics.projectedBypassRate.toFixed(1)}%)</span>` 
                                : ''}
                        </div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 12px;">Avg Detection Time</div>
                        <div style="color: #ffaa00; font-size: 24px; font-weight: bold;">
                            ${metrics.avgDetectionTimeMinutes > 0 ? metrics.avgDetectionTimeMinutes.toFixed(1) + 'm' : '-'}
                        </div>
                        ${metrics.nextDetectionInMinutes !== null && metrics.nextDetectionInMinutes > 0 && metrics.avgDetectionTimeMinutes === 0
                            ? `<div style="color: #888; font-size: 11px;">First detection: ~${metrics.nextDetectionInMinutes}m</div>`
                            : metrics.nextDetectionInMinutes === -1 && metrics.avgDetectionTimeMinutes === 0
                            ? '<div style="color: #ffaa00; font-size: 11px;">Processing...</div>'
                            : ''}
                    </div>
                </div>
                
                ${this.formatMetricsByLevel(metrics.byAttackLevel)}
                ${this.formatMetricsByModel(metrics.byModel)}
                
                ${this.engagementMetrics ? this.formatEngagementMetrics(this.engagementMetrics) : ''}
            </div>
        `;
    }
    
    formatEngagementMetrics(engagement) {
        if (!engagement || engagement.sent === 0) return '';
        
        // Determine success threshold
        const clickRate = engagement.clickRate || 0;
        const successLevel = clickRate > 15 ? 'high' : clickRate > 7 ? 'moderate' : 'low';
        const successColor = successLevel === 'high' ? '#00ff88' : successLevel === 'moderate' ? '#ffaa00' : '#ff4444';
        
        return `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #333;">
                <h4 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-mouse-pointer"></i> User Engagement Metrics (Simulated)</h4>
                <div style="background: #0f1529; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">
                        Simulated user behavior based on real-world phishing statistics. Metrics update in real-time as simulated users interact with emails.
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div>
                            <div style="color: #888; font-size: 12px;">Emails Sent</div>
                            <div style="color: #fff; font-size: 20px; font-weight: bold;">${engagement.sent}</div>
                        </div>
                        <div>
                            <div style="color: #888; font-size: 12px;">Opened</div>
                            <div style="color: #667eea; font-size: 20px; font-weight: bold;">${engagement.opened}</div>
                            <div style="color: #888; font-size: 11px;">${engagement.openRate}% open rate</div>
                        </div>
                        <div>
                            <div style="color: #888; font-size: 12px;">Clicked</div>
                            <div style="color: ${successColor}; font-size: 20px; font-weight: bold;">${engagement.clicked}</div>
                            <div style="color: #888; font-size: 11px;">${engagement.clickRate}% click rate</div>
                        </div>
                        <div>
                            <div style="color: #888; font-size: 12px;">Click-Through Rate</div>
                            <div style="color: #ffaa00; font-size: 20px; font-weight: bold;">${engagement.clickThroughRate}%</div>
                            <div style="color: #888; font-size: 11px;">${engagement.clicked}/${engagement.opened} clicked after open</div>
                        </div>
                        <div>
                            <div style="color: #888; font-size: 12px;">Reported</div>
                            <div style="color: #ff4444; font-size: 20px; font-weight: bold;">${engagement.reported}</div>
                            <div style="color: #888; font-size: 11px;">${engagement.reportRate}% report rate</div>
                        </div>
                        <div>
                            <div style="color: #888; font-size: 12px;">Avg Time to Open</div>
                            <div style="color: #667eea; font-size: 20px; font-weight: bold;">${engagement.avgTimeToOpen.toFixed(1)}m</div>
                        </div>
                        <div>
                            <div style="color: #888; font-size: 12px;">Median Time to Click</div>
                            <div style="color: ${successColor}; font-size: 20px; font-weight: bold;">${engagement.medianTimeToClick > 0 ? engagement.medianTimeToClick.toFixed(1) + 'm' : '-'}</div>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 10px; background: #1a1f35; border-radius: 6px; border-left: 3px solid ${successColor};">
                        <div style="color: #fff; font-size: 13px; font-weight: bold; margin-bottom: 5px;">
                            Campaign Effectiveness: <span style="color: ${successColor}; text-transform: capitalize;">${successLevel}</span>
                        </div>
                        <div style="color: #888; font-size: 11px;">
                            ${successLevel === 'high' 
                                ? '✓ High click rate indicates effective phishing campaign' 
                                : successLevel === 'moderate' 
                                ? '⚠ Moderate click rate - campaign is partially effective' 
                                : '✗ Low click rate - campaign needs improvement'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    formatMetricsByLevel(byLevel) {
        if (!byLevel || Object.keys(byLevel).length === 0) return '';
        
        let html = '<div style="margin-top: 20px;"><h5 style="color: #fff; margin-bottom: 10px;">By Attack Level:</h5>';
        ['basic', 'advanced', 'expert'].forEach(level => {
            const metrics = byLevel[level];
            if (metrics) {
                html += `
                    <div style="background: #0f1529; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                        <strong style="color: #ffaa00; text-transform: capitalize;">${level}:</strong>
                        <span style="color: #888; margin-left: 10px;">${metrics.total} sent</span>
                        <span style="color: #ff4444; margin-left: 10px;">${metrics.detected} detected (${metrics.detectionRate}%)</span>
                        <span style="color: #00ff88; margin-left: 10px;">${metrics.bypassed} bypassed (${metrics.bypassRate}%)</span>
                    </div>
                `;
            }
        });
        html += '</div>';
        return html;
    }
    
    formatMetricsByModel(byModel) {
        if (!byModel || Object.keys(byModel).length === 0) return '';
        
        let html = '<div style="margin-top: 20px;"><h5 style="color: #fff; margin-bottom: 10px;">By AI Model:</h5>';
        Object.entries(byModel).forEach(([model, metrics]) => {
            if (metrics) {
                const modelName = model.split('/').pop() || model;
                html += `
                    <div style="background: #0f1529; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                        <strong style="color: #667eea;">${modelName}:</strong>
                        <span style="color: #888; margin-left: 10px;">${metrics.total} sent</span>
                        <span style="color: #ff4444; margin-left: 10px;">${metrics.detected} detected (${metrics.detectionRate}%)</span>
                        <span style="color: #00ff88; margin-left: 10px;">${metrics.bypassed} bypassed (${metrics.bypassRate}%)</span>
                        ${metrics.avgDetectionTimeMinutes > 0 ? `<span style="color: #ffaa00; margin-left: 10px;">Avg: ${metrics.avgDetectionTimeMinutes.toFixed(1)}m</span>` : ''}
                    </div>
                `;
            }
        });
        html += '</div>';
        return html;
    }
    
    updateQuickStats() {
        const totalEmails = this.campaigns.reduce((sum, c) => sum + c.emails.length, 0);
        document.getElementById('stat-total-emails').textContent = totalEmails;
        
        if (totalEmails > 0) {
            const allEmails = this.campaigns.flatMap(c => c.emails);
            // Calculate average risk score using dataset-based risk scores
            // Risk scores are calculated using patterns from Seven Phishing Email Datasets:
            // https://figshare.com/articles/dataset/Seven_Phishing_Email_Datasets/25432108
            // Each email's riskScore is computed by PhishingRiskScorer based on subject, content, URLs, sender, etc.
            const avgRisk = Math.round(allEmails.reduce((sum, e) => sum + (e.riskScore || 50), 0) / allEmails.length);
            document.getElementById('stat-avg-risk').textContent = `${avgRisk}/100`;
            
            const lastEmail = allEmails[allEmails.length - 1];
            if (lastEmail && lastEmail.timestamp) {
                const lastDeploy = new Date(lastEmail.timestamp);
                const now = new Date();
                const diffMinutes = Math.floor((now - lastDeploy) / 60000);
                let timeText;
                if (diffMinutes < 1) timeText = 'Just now';
                else if (diffMinutes < 60) timeText = `${diffMinutes}m ago`;
                else if (diffMinutes < 1440) timeText = `${Math.floor(diffMinutes/60)}h ago`;
                else timeText = lastDeploy.toLocaleDateString();
                document.getElementById('stat-last-deploy').textContent = timeText;
            }
        } else {
            document.getElementById('stat-avg-risk').textContent = '-';
            document.getElementById('stat-last-deploy').textContent = 'Never';
        }
    }

    setupEventListeners() {
        // Campaign name input
        document.getElementById('campaignName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createCampaign();
            }
        });
    }

    createCampaign() {
        const campaignName = document.getElementById('campaignName').value.trim();
        
        if (!campaignName) {
            alert('Please enter a campaign name');
            return;
        }

        const campaign = {
            id: Date.now(),
            name: campaignName,
            createdAt: new Date().toISOString(),
            status: 'active',
            targets: [],
            emails: []
        };

        this.campaigns.push(campaign);
        this.currentCampaign = campaign;
        this.saveCampaigns();
        this.displayCampaigns();
        document.getElementById('campaignName').value = '';
        this.updateExecuteButton();
        this.updateKPIs();
    }

    loadCampaigns() {
        const saved = localStorage.getItem('demo3_campaigns');
        if (saved) {
            this.campaigns = JSON.parse(saved);
            if (this.campaigns.length > 0) {
                this.currentCampaign = this.campaigns.find(c => c.status === 'active') || this.campaigns[0];
            }
            this.displayCampaigns();
        }
    }

    saveCampaigns() {
        localStorage.setItem('demo3_campaigns', JSON.stringify(this.campaigns));
    }

    displayCampaigns() {
        const campaignList = document.getElementById('campaignList');
        campaignList.innerHTML = '';

        if (this.campaigns.length === 0) {
            campaignList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No campaigns yet. Create one above.</p>';
            return;
        }

        this.campaigns.forEach(campaign => {
            const status = campaign.emails.length > 0 ? 'completed' : 'pending';
            const statusClass = campaign.emails.length > 0 ? 'status-completed' : 'status-pending';
            const statusText = campaign.emails.length > 0 ? 'Deployed' : 'Ready';
            
            const campaignItem = document.createElement('div');
            campaignItem.className = `campaign-item ${campaign.id === this.currentCampaign?.id ? 'active' : ''}`;
            campaignItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <strong style="color: #ff4444;">${campaign.name}</strong>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <div style="font-size: 12px; color: #888; margin-bottom: 5px;">
                            <i class="fas fa-calendar"></i> ${new Date(campaign.createdAt).toLocaleDateString()} 
                            <span style="margin-left: 15px;"><i class="fas fa-envelope"></i> ${campaign.emails.length} emails</span>
                        </div>
                        <div style="font-size: 11px; color: #666;">
                            Created: ${new Date(campaign.createdAt).toLocaleTimeString()}
                        </div>
                    </div>
                    <button onclick="hackerDashboard.selectCampaign(${campaign.id})" style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;">
                        <i class="fas fa-check"></i> Select
                    </button>
                </div>
            `;
            campaignList.appendChild(campaignItem);
        });
        
        this.updateKPIs();
    }

    selectCampaign(campaignId) {
        this.currentCampaign = this.campaigns.find(c => c.id === campaignId);
        this.displayCampaigns();
        this.updateExecuteButton();
    }

    async executeAttack() {
        if (this.selectedTargets.length === 0) {
            alert('Please select at least one target');
            return;
        }

        if (!this.currentCampaign) {
            alert('Please create or select a campaign first');
            return;
        }

        const model = document.getElementById('attackModel').value;
        const attackLevel = document.getElementById('attackLevel').value;
        const urgencyLevel = document.getElementById('urgencyLevel').value;

        const statusDiv = document.getElementById('attackStatus');
        statusDiv.textContent = 'Generating phishing emails...';
        statusDiv.style.color = '#ffaa00';

        const executeBtn = document.getElementById('executeBtn');
        executeBtn.disabled = true;

        this.generatedEmails = [];
        let successCount = 0;
        let failCount = 0;

        // Generate email for each selected target
        for (let i = 0; i < this.selectedTargets.length; i++) {
            const persona = this.selectedTargets[i];
            statusDiv.textContent = `Generating email ${i + 1}/${this.selectedTargets.length} for ${persona.name}...`;

            try {
                const email = await this.generateEmailForPersona(persona, model, attackLevel, urgencyLevel);
                if (email) {
                    console.log(`✓ Successfully generated email ${i + 1}/${this.selectedTargets.length} for ${persona.name} (ID: ${email.id}, Persona ID: ${persona.id})`);
                    this.generatedEmails.push(email);
                    successCount++;
                } else {
                    console.log(`✗ Failed to generate email ${i + 1}/${this.selectedTargets.length} for ${persona.name} - returned null`);
                    failCount++;
                }
            } catch (error) {
                console.error(`✗ Error generating email ${i + 1}/${this.selectedTargets.length} for ${persona.name}:`, error);
                failCount++;
            }

            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`Loop complete. this.generatedEmails.length = ${this.generatedEmails.length}, successCount = ${successCount}, failCount = ${failCount}`);

        // Save emails to campaign and localStorage
        console.log(`=== EXECUTE ATTACK COMPLETE ===`);
        console.log(`Successfully generated: ${successCount}, Failed: ${failCount}`);
        console.log(`this.generatedEmails.length: ${this.generatedEmails.length}`);
        console.log('All generated emails:', this.generatedEmails.map(e => ({
            id: e?.id,
            target: e?.targetPersona?.name,
            personaId: e?.targetPersona?.id,
            subject: e?.subject
        })));
        
        if (this.generatedEmails.length > 0) {
            this.currentCampaign.emails.push(...this.generatedEmails);
            this.saveCampaigns();
            console.log('About to save emails to bank inbox...');
            this.saveEmailsToBankInbox();
            this.displayResults();
            this.updateKPIs();
            this.updateQuickStats();
            
            // Load evaluation metrics immediately and then keep refreshing
            setTimeout(() => {
                this.loadEvaluationMetrics();
            }, 500);
            
            // Set up continuous refresh while analyzing (every 5 seconds)
            if (this.metricsRefreshInterval) {
                clearInterval(this.metricsRefreshInterval);
            }
            this.metricsRefreshInterval = setInterval(() => {
                this.loadEvaluationMetrics();
                // Stop refreshing after 35 minutes (longer than max detection time)
                const checkTime = Date.now() - (new Date(this.generatedEmails[0]?.timestamp || Date.now())).getTime();
                if (checkTime > 35 * 60 * 1000) {
                    clearInterval(this.metricsRefreshInterval);
                    this.metricsRefreshInterval = null;
                }
            }, 5000);
        }

        statusDiv.textContent = `Attack completed! Generated ${successCount} emails successfully.${failCount > 0 ? ` ${failCount} failed.` : ''}`;
        statusDiv.style.color = successCount > 0 ? '#00ff88' : '#ff4444';

        executeBtn.disabled = false;
        this.updateExecuteButton();
    }

    async generateEmailForPersona(persona, model, attackLevel, urgencyLevel) {
        const urgencyText = {
            'low': 'slight',
            'medium': 'moderate',
            'high': 'high',
            'critical': 'extreme'
        }[urgencyLevel] || 'moderate';

        const attackLevelText = {
            'basic': 'Create a basic professional email',
            'advanced': 'Create a sophisticated, convincing professional email with detailed context',
            'expert': 'Create an expertly crafted, highly personalized email with advanced social engineering techniques'
        }[attackLevel] || 'Create a professional email';

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
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'openrouter',
                    model: model,
                    inputs: prompt
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error?.message || data.message || `API error: ${response.status}`;
                console.error('API Error Response:', data);
                throw new Error(errorMessage);
            }

            const aiResponse = data.response || data.choices?.[0]?.message?.content || data.content || '';
            
            if (!aiResponse || aiResponse.trim().length < 10) {
                console.error('Empty or invalid AI response:', data);
                throw new Error('Empty response from AI');
            }

            // Parse JSON response with multiple fallback strategies
            let emailData = null;
            let parseError = null;
            
            // Strategy 1: Direct JSON parse
            try {
                emailData = JSON.parse(aiResponse.trim());
            } catch (e) {
                parseError = e;
            }
            
            // Strategy 2: Extract JSON from markdown code blocks
            if (!emailData) {
                try {
                    const markdownMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (markdownMatch) {
                        emailData = JSON.parse(markdownMatch[1].trim());
                    }
                } catch (e) {
                    parseError = e;
                }
            }
            
            // Strategy 3: Find JSON object in the response (handle nested braces)
            if (!emailData) {
                try {
                    // Find the first { and match until the last } (handles nested objects)
                    const firstBrace = aiResponse.indexOf('{');
                    const lastBrace = aiResponse.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        const jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
                        emailData = JSON.parse(jsonStr);
                    }
                } catch (e) {
                    parseError = e;
                }
            }
            
            // Strategy 4: Try to extract fields manually if JSON parsing fails
            if (!emailData) {
                console.warn('Could not parse JSON, attempting manual extraction:', aiResponse);
                // Try to match JSON fields with escaped strings (handles multi-line content)
                const subjectMatch = aiResponse.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/) || 
                                   aiResponse.match(/subject["\s]*:["\s]*([^\n,"}]+)/i);
                
                // For content, try to match the full string including escaped newlines
                let contentMatch = aiResponse.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (!contentMatch) {
                    // Try without quotes (in case quotes are missing)
                    contentMatch = aiResponse.match(/"content"\s*:\s*([^,}]+)/);
                }
                if (!contentMatch) {
                    // Try case-insensitive
                    contentMatch = aiResponse.match(/content["\s]*:["\s]*([^\n,"}]+)/i);
                }
                
                const senderMatch = aiResponse.match(/"sender"\s*:\s*"((?:[^"\\]|\\.)*)"/) || 
                                  aiResponse.match(/sender["\s]*:["\s]*([^\n,"}]+)/i);
                
                if (subjectMatch && contentMatch) {
                    emailData = {
                        subject: subjectMatch[1].trim().replace(/\\"/g, '"').replace(/\\n/g, '\n'),
                        content: contentMatch[1].trim().replace(/\\"/g, '"').replace(/\\n/g, '\n'),
                        sender: senderMatch ? senderMatch[1].trim().replace(/\\"/g, '"') : 'IT Operations'
                    };
                }
            }
            
            // Strategy 5: If still no emailData, create a fallback from the raw response
            if (!emailData) {
                console.warn('Using fallback email generation from raw response');
                console.log('Raw AI response:', aiResponse);
                
                // Try to extract subject from the response
                const lines = aiResponse.split('\n').filter(l => l.trim());
                let subject = 'System Maintenance Required';
                let content = aiResponse;
                
                // Look for subject line
                const subjectLine = lines.find(l => 
                    l.toLowerCase().includes('subject') || 
                    l.includes('Subject:') ||
                    l.match(/^subject\s*:/i)
                );
                
                if (subjectLine) {
                    subject = subjectLine.replace(/.*subject.*:.*/i, '').trim().replace(/^["']|["']$/g, '');
                    // Remove subject line from content
                    content = aiResponse.replace(/.*subject.*:.*\n/i, '').trim();
                } else if (lines.length > 0) {
                    // Use first line as subject if it's short
                    const firstLine = lines[0].trim();
                    if (firstLine.length < 100 && !firstLine.includes('{') && !firstLine.includes('}')) {
                        subject = firstLine.replace(/^["']|["']$/g, '');
                        content = lines.slice(1).join('\n').trim() || aiResponse;
                    }
                }
                
                // Clean up content
                content = content
                    .replace(/^\{.*?\}/s, '') // Remove JSON wrapper if present
                    .replace(/```json?/gi, '') // Remove markdown code blocks
                    .replace(/```/g, '')
                    .trim();
                
                // If content is still too long or empty, use a default
                if (!content || content.length < 10) {
                    content = `Dear ${persona.name},\n\nThis is a system maintenance notification from ${persona.company}. Please review the attached documentation.\n\nBest regards,\nIT Operations Team`;
                }
                
                emailData = {
                    subject: subject || 'System Maintenance Required',
                    content: content.substring(0, 1000), // Limit to 1000 chars
                    sender: 'IT Operations Team'
                };
            }

            if (!emailData || !emailData.subject || !emailData.content) {
                console.error('Failed to parse email data. Raw response:', aiResponse);
                console.error('Parse error:', parseError);
                throw new Error(`Invalid email format. Could not extract subject and content from AI response.`);
            }

            // Extract URLs from content for risk analysis
            const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
            const urls = emailData.content.match(urlRegex) || [];
            
            // Calculate risk score using dataset-based patterns
            // Based on Seven Phishing Email Datasets: https://figshare.com/articles/dataset/Seven_Phishing_Email_Datasets/25432108
            const riskScore = this.calculateRiskScore({
                ...emailData,
                urls: urls
            });

            // Generate unique ID with timestamp, persona ID, and random component
            const uniqueId = `email_${Date.now()}_${persona.id}_${Math.random().toString(36).substring(2, 9)}`;
            
            const email = {
                id: uniqueId,
                campaignId: this.currentCampaign.id,
                targetPersona: persona,
                subject: emailData.subject,
                content: emailData.content,
                sender: emailData.sender || 'Unknown Sender',
                senderEmail: this.generateSenderEmail(emailData.sender || 'IT Operations'),
                timestamp: new Date().toISOString(),
                model: model,
                attackLevel: attackLevel,
                urgencyLevel: urgencyLevel,
                riskScore: riskScore,
                urls: urls, // Store URLs for analysis
                status: 'delivered'
            };
            
            // Log email generation event to backend for user engagement simulation
            this.logEmailGenerated(email.id, this.currentCampaign.id, email.attackLevel, {
                subject: email.subject,
                target: persona.name,
                model: model
            });
            
            // Track email delivery for coverage metrics
            this.trackEmailDelivery(email);
            
            return email;

        } catch (error) {
            console.error('Email generation error:', error);
            return null;
        }
    }

    calculateRiskScore(emailData) {
        // Use the PhishingRiskScorer based on patterns from Seven Phishing Email Datasets
        // https://figshare.com/articles/dataset/Seven_Phishing_Email_Datasets/25432108
        if (!this.phishingRiskScorer) {
            this.phishingRiskScorer = new PhishingRiskScorer();
        }
        
        // Calculate risk score using dataset-based patterns
        return this.phishingRiskScorer.calculateRiskScore(emailData, {
            senderEmail: emailData.senderEmail || emailData.sender
        });
    }

    generateSenderEmail(senderName) {
        const domains = ['operations@securebank.com', 'it-support@banking-services.com', 'security@firstnational.com', 'compliance@financialcorp.com'];
        return domains[Math.floor(Math.random() * domains.length)];
    }
    
    // Log email generation event to backend for user engagement simulation
    async logEmailGenerated(emailId, campaignId, attackLevel, metadata = {}) {
        try {
            const response = await fetch('/events/generated', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emailId,
                    userId: 'hacker-dashboard',
                    campaignId: campaignId.toString(),
                    attackLevel,
                    subject: metadata.subject,
                    metadata
                })
            });
            
            if (response.ok) {
                console.log(`[Engagement] Logged email ${emailId} for user engagement simulation`);
            } else {
                console.warn(`[Engagement] Failed to log email ${emailId}:`, await response.text());
            }
        } catch (error) {
            console.error(`[Engagement] Error logging email ${emailId}:`, error);
            // Don't throw - this is not critical for email generation
        }
    }
    
    // Load engagement metrics from backend
    async loadEngagementMetrics() {
        try {
            const campaignId = this.currentCampaign ? this.currentCampaign.id.toString() : null;
            const url = campaignId 
                ? `/metrics/latest?campaignId=${campaignId}`
                : '/metrics/latest';
            
            const response = await fetch(url);
            if (!response.ok) {
                console.warn('[Engagement] Failed to load engagement metrics:', await response.text());
                return null;
            }
            
            const data = await response.json();
            if (data.success && data.metrics) {
                return data.metrics;
            }
            
            return null;
        } catch (error) {
            console.error('[Engagement] Error loading engagement metrics:', error);
            return null;
        }
    }

    saveEmailsToBankInbox() {
        console.log('=== SAVE EMAILS TO BANK INBOX ===');
        console.log(`this.generatedEmails array has ${this.generatedEmails.length} emails`);
        console.log('Generated emails details:', this.generatedEmails.map(e => ({
            id: e.id,
            target: e.targetPersona?.name,
            personaId: e.targetPersona?.id,
            subject: e.subject
        })));
        
        // Save emails to localStorage so bank admin dashboard can access them
        const existingEmails = JSON.parse(localStorage.getItem('demo3_bank_inbox') || '[]');
        const existingIds = new Set(existingEmails.map(e => e.id));
        
        console.log(`Existing emails in inbox: ${existingEmails.length}`);
        console.log('Existing email IDs:', Array.from(existingIds));
        
        const newEmails = this.generatedEmails
            .filter(email => {
                const isNew = !existingIds.has(email.id);
                if (!isNew) {
                    console.log(`Skipping duplicate email ID: ${email.id} for ${email.targetPersona?.name}`);
                }
                return isNew;
            })
            .map(email => ({
                ...email,
                receivedAt: new Date().toISOString(),
                read: false,
                riskLevel: email.riskScore > 70 ? 'high' : email.riskScore > 40 ? 'medium' : 'low'
            }));
        
        console.log(`Saving ${newEmails.length} new emails to bank inbox (total in generatedEmails array: ${this.generatedEmails.length})`);
        console.log('New email IDs:', newEmails.map(e => e.id));
        console.log('New email targets:', newEmails.map(e => ({ id: e.id, target: e.targetPersona?.name, personaId: e.targetPersona?.id })));
        
        const allEmails = [...existingEmails, ...newEmails];
        localStorage.setItem('demo3_bank_inbox', JSON.stringify(allEmails));
        
        console.log('Total emails in bank inbox after save:', allEmails.length);
        console.log('Final email list:', allEmails.map(e => ({ id: e.id, target: e.targetPersona?.name })));
        
        // Verify the save by reading back from localStorage
        const verifySaved = JSON.parse(localStorage.getItem('demo3_bank_inbox') || '[]');
        console.log('Verification: Read back from localStorage:', verifySaved.length, 'emails');
        console.log('Verification: Email IDs:', verifySaved.map(e => e.id));
        
        console.log('=== END SAVE ===');
        
        // Trigger event for bank admin dashboard to refresh
        window.dispatchEvent(new CustomEvent('newEmailsReceived', { detail: newEmails }));
        
        // Also trigger a storage event manually for cross-tab sync (if in different tabs)
        // This ensures the bank admin dashboard picks up changes even if CustomEvent doesn't propagate
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'demo3_bank_inbox',
            newValue: JSON.stringify(allEmails),
            oldValue: JSON.stringify(existingEmails)
        }));
    }

    displayResults() {
        const resultsPanel = document.getElementById('resultsPanel');
        const resultsDiv = document.getElementById('campaignResults');
        const resultsTable = document.getElementById('campaignResultsTable');
        
        resultsPanel.style.display = 'block';
        
        // Populate results table
        resultsTable.innerHTML = this.generatedEmails.map(email => {
            const time = new Date(email.timestamp).toLocaleTimeString();
            const riskColor = email.riskScore > 70 ? '#ff4444' : email.riskScore > 40 ? '#ff8800' : '#00aa44';
            return `
                <tr>
                    <td><strong style="color: #ff4444;">${email.targetPersona.name}</strong><br><small style="color: #666;">${email.targetPersona.company}</small></td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${email.subject}</td>
                    <td><span style="color: ${riskColor}; font-weight: bold;">${email.riskScore}</span>/100</td>
                    <td><span class="status-badge status-active">Deployed</span></td>
                    <td style="color: #888; font-size: 12px;">${time}</td>
                </tr>
            `;
        }).join('');
        
        // Detailed results view
        resultsDiv.innerHTML = `
            <div style="margin-top: 20px;">
                <h4 style="color: #ff6b6b; margin-bottom: 15px;"><i class="fas fa-list"></i> Email Details</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                    ${this.generatedEmails.map(email => `
                        <div class="email-result">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                                <strong style="color: #ff4444;">Target: ${email.targetPersona.name}</strong>
                                <span style="background: ${email.riskScore > 70 ? '#ff4444' : email.riskScore > 40 ? '#ff8800' : '#00aa44'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                    Risk: ${email.riskScore}
                                </span>
                            </div>
                            <div style="color: #aaa; font-size: 14px; margin-bottom: 10px;">
                                <strong>From:</strong> ${email.senderEmail}<br>
                                <strong>Subject:</strong> ${email.subject}<br>
                                <strong>Model:</strong> ${email.model.split('/').pop()}<br>
                                <strong>Level:</strong> ${email.attackLevel}
                            </div>
                            <div style="color: #888; font-size: 12px; max-height: 100px; overflow-y: auto; white-space: pre-wrap;">
                                ${email.content.substring(0, 200)}...
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #0f1529; border-radius: 8px; border-left: 4px solid #00ff88;">
                <p style="color: #00ff88; margin: 0;">
                    <i class="fas fa-check-circle"></i> <strong>Deployment Complete:</strong> ${this.generatedEmails.length} new emails generated and delivered to Bank Admin inbox. 
                    <span style="color: #888; font-size: 12px;">(Note: New emails are added to existing emails in the inbox. Use "Clear Inbox" in Bank Admin Dashboard to start fresh.)</span><br>
                    Automated security analysis is running. Metrics will update in real-time as emails are detected.
                </p>
            </div>
        `;
        
        // Load evaluation metrics immediately
        setTimeout(() => {
            this.loadEvaluationMetrics();
        }, 500);
    }
}

// Initialize hacker dashboard
let hackerDashboard;
document.addEventListener('DOMContentLoaded', () => {
    hackerDashboard = new HackerDashboard();
    
    // Global functions for onclick handlers
    window.createCampaign = () => hackerDashboard.createCampaign();
    window.executeAttack = () => hackerDashboard.executeAttack();
});
