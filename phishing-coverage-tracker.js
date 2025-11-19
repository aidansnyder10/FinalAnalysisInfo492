// Phishing Coverage Tracker
// Tracks how many people interact/see phishing emails within a network

class PhishingCoverageTracker {
    constructor() {
        this.coverageData = this.loadCoverageData();
        this.snapshots = this.loadSnapshots();
    }

    // Load coverage data from localStorage
    loadCoverageData() {
        const saved = localStorage.getItem('phishing_coverage_data');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading coverage data:', e);
            }
        }
        return {
            emails: {}, // emailId -> coverage data
            campaigns: {}, // campaignId -> campaign coverage
            departments: {}, // department -> coverage stats
            lastUpdated: null
        };
    }

    // Save coverage data to localStorage
    saveCoverageData() {
        this.coverageData.lastUpdated = new Date().toISOString();
        localStorage.setItem('phishing_coverage_data', JSON.stringify(this.coverageData));
    }

    // Load historical snapshots
    loadSnapshots() {
        const saved = localStorage.getItem('phishing_coverage_snapshots');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading snapshots:', e);
            }
        }
        return [];
    }

    // Save snapshot
    saveSnapshots() {
        localStorage.setItem('phishing_coverage_snapshots', JSON.stringify(this.snapshots));
    }

    // Track email delivery
    trackDelivery(emailId, emailData) {
        if (!this.coverageData.emails[emailId]) {
            this.coverageData.emails[emailId] = {
                emailId,
                campaignId: emailData.campaignId,
                targetPersona: emailData.targetPersona,
                department: emailData.targetPersona?.department || 'Unknown',
                company: emailData.targetPersona?.company || 'Unknown',
                delivered: true,
                deliveredAt: new Date().toISOString(),
                opened: false,
                clicked: false,
                reported: false,
                openedAt: null,
                clickedAt: null,
                reportedAt: null,
                timeToOpen: null,
                timeToClick: null
            };
            this.updateCampaignCoverage(emailData.campaignId);
            this.updateDepartmentCoverage(emailData.targetPersona?.department);
            this.saveCoverageData();
        }
    }

    // Track email open
    trackOpen(emailId, timestamp = null) {
        const email = this.coverageData.emails[emailId];
        if (email && !email.opened) {
            email.opened = true;
            email.openedAt = timestamp || new Date().toISOString();
            if (email.deliveredAt) {
                const deliveredTime = new Date(email.deliveredAt);
                const openedTime = new Date(email.openedAt);
                email.timeToOpen = (openedTime - deliveredTime) / (1000 * 60); // minutes
            }
            this.updateCampaignCoverage(email.campaignId);
            this.updateDepartmentCoverage(email.department);
            this.saveCoverageData();
        }
    }

    // Track email click
    trackClick(emailId, timestamp = null) {
        const email = this.coverageData.emails[emailId];
        if (email && !email.clicked) {
            email.clicked = true;
            email.clickedAt = timestamp || new Date().toISOString();
            if (email.openedAt) {
                const openedTime = new Date(email.openedAt);
                const clickedTime = new Date(email.clickedAt);
                email.timeToClick = (clickedTime - openedTime) / (1000 * 60); // minutes
            }
            this.updateCampaignCoverage(email.campaignId);
            this.updateDepartmentCoverage(email.department);
            this.saveCoverageData();
        }
    }

    // Track email report
    trackReport(emailId, timestamp = null) {
        const email = this.coverageData.emails[emailId];
        if (email && !email.reported) {
            email.reported = true;
            email.reportedAt = timestamp || new Date().toISOString();
            this.updateCampaignCoverage(email.campaignId);
            this.updateDepartmentCoverage(email.department);
            this.saveCoverageData();
        }
    }

    // Update campaign coverage metrics
    updateCampaignCoverage(campaignId) {
        if (!campaignId) return;

        const campaignEmails = Object.values(this.coverageData.emails)
            .filter(e => e.campaignId === campaignId);

        if (campaignEmails.length === 0) return;

        const total = campaignEmails.length;
        const delivered = campaignEmails.filter(e => e.delivered).length;
        const opened = campaignEmails.filter(e => e.opened).length;
        const clicked = campaignEmails.filter(e => e.clicked).length;
        const reported = campaignEmails.filter(e => e.reported).length;

        const avgTimeToOpen = campaignEmails
            .filter(e => e.timeToOpen !== null)
            .map(e => e.timeToOpen)
            .reduce((sum, time, _, arr) => sum + time / arr.length, 0);

        const avgTimeToClick = campaignEmails
            .filter(e => e.timeToClick !== null)
            .map(e => e.timeToClick)
            .reduce((sum, time, _, arr) => sum + time / arr.length, 0);

        this.coverageData.campaigns[campaignId] = {
            campaignId,
            total,
            delivered,
            opened,
            clicked,
            reported,
            coveragePercent: (opened / total * 100).toFixed(1),
            clickRate: (clicked / total * 100).toFixed(1),
            clickThroughRate: opened > 0 ? (clicked / opened * 100).toFixed(1) : 0,
            reportRate: (reported / total * 100).toFixed(1),
            avgTimeToOpen: avgTimeToOpen > 0 ? avgTimeToOpen.toFixed(1) : null,
            avgTimeToClick: avgTimeToClick > 0 ? avgTimeToClick.toFixed(1) : null,
            lastUpdated: new Date().toISOString()
        };
    }

    // Update department coverage metrics
    updateDepartmentCoverage(department) {
        if (!department || department === 'Unknown') return;

        const deptEmails = Object.values(this.coverageData.emails)
            .filter(e => e.department === department);

        if (deptEmails.length === 0) return;

        const total = deptEmails.length;
        const opened = deptEmails.filter(e => e.opened).length;
        const clicked = deptEmails.filter(e => e.clicked).length;
        const reported = deptEmails.filter(e => e.reported).length;

        this.coverageData.departments[department] = {
            department,
            total,
            opened,
            clicked,
            reported,
            coveragePercent: (opened / total * 100).toFixed(1),
            clickRate: (clicked / total * 100).toFixed(1),
            reportRate: (reported / total * 100).toFixed(1),
            lastUpdated: new Date().toISOString()
        };
    }

    // Calculate overall coverage metrics
    calculateCoverageMetrics(campaignId = null, timeWindow = null) {
        let emails = Object.values(this.coverageData.emails);

        // Filter by campaign if provided
        if (campaignId) {
            emails = emails.filter(e => e.campaignId === campaignId);
        }

        // Filter by time window if provided (in hours)
        if (timeWindow) {
            const cutoffTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
            emails = emails.filter(e => new Date(e.deliveredAt) >= cutoffTime);
        }

        if (emails.length === 0) {
            return {
                total: 0,
                delivered: 0,
                opened: 0,
                clicked: 0,
                reported: 0,
                coveragePercent: 0,
                clickRate: 0,
                clickThroughRate: 0,
                reportRate: 0,
                avgTimeToOpen: null,
                avgTimeToClick: null,
                departments: {},
                companies: {}
            };
        }

        const total = emails.length;
        const delivered = emails.filter(e => e.delivered).length;
        const opened = emails.filter(e => e.opened).length;
        const clicked = emails.filter(e => e.clicked).length;
        const reported = emails.filter(e => e.reported).length;

        const openedEmails = emails.filter(e => e.opened && e.timeToOpen !== null);
        const avgTimeToOpen = openedEmails.length > 0
            ? openedEmails.reduce((sum, e) => sum + e.timeToOpen, 0) / openedEmails.length
            : null;

        const clickedEmails = emails.filter(e => e.clicked && e.timeToClick !== null);
        const avgTimeToClick = clickedEmails.length > 0
            ? clickedEmails.reduce((sum, e) => sum + e.timeToClick, 0) / clickedEmails.length
            : null;

        // Department breakdown
        const departments = {};
        emails.forEach(email => {
            const dept = email.department || 'Unknown';
            if (!departments[dept]) {
                departments[dept] = {
                    total: 0,
                    opened: 0,
                    clicked: 0,
                    reported: 0
                };
            }
            departments[dept].total++;
            if (email.opened) departments[dept].opened++;
            if (email.clicked) departments[dept].clicked++;
            if (email.reported) departments[dept].reported++;
        });

        // Calculate department percentages
        Object.keys(departments).forEach(dept => {
            const deptData = departments[dept];
            deptData.coveragePercent = (deptData.opened / deptData.total * 100).toFixed(1);
            deptData.clickRate = (deptData.clicked / deptData.total * 100).toFixed(1);
            deptData.reportRate = (deptData.reported / deptData.total * 100).toFixed(1);
        });

        // Company breakdown
        const companies = {};
        emails.forEach(email => {
            const company = email.company || 'Unknown';
            if (!companies[company]) {
                companies[company] = {
                    total: 0,
                    opened: 0,
                    clicked: 0,
                    reported: 0
                };
            }
            companies[company].total++;
            if (email.opened) companies[company].opened++;
            if (email.clicked) companies[company].clicked++;
            if (email.reported) companies[company].reported++;
        });

        // Calculate company percentages
        Object.keys(companies).forEach(company => {
            const compData = companies[company];
            compData.coveragePercent = (compData.opened / compData.total * 100).toFixed(1);
            compData.clickRate = (compData.clicked / compData.total * 100).toFixed(1);
            compData.reportRate = (compData.reported / compData.total * 100).toFixed(1);
        });

        return {
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
            companies,
            timestamp: new Date().toISOString()
        };
    }

    // Create a snapshot for historical tracking
    createSnapshot(campaignId = null) {
        const snapshot = {
            timestamp: new Date().toISOString(),
            campaignId,
            metrics: this.calculateCoverageMetrics(campaignId)
        };
        this.snapshots.push(snapshot);
        
        // Keep only last 100 snapshots
        if (this.snapshots.length > 100) {
            this.snapshots = this.snapshots.slice(-100);
        }
        
        this.saveSnapshots();
        return snapshot;
    }

    // Get coverage trend over time
    getCoverageTrend(campaignId = null, hours = 24) {
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        const relevantSnapshots = this.snapshots
            .filter(s => {
                if (campaignId && s.campaignId !== campaignId) return false;
                return new Date(s.timestamp) >= cutoffTime;
            })
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return relevantSnapshots.map(s => ({
            timestamp: s.timestamp,
            coveragePercent: parseFloat(s.metrics.coveragePercent),
            clickRate: parseFloat(s.metrics.clickRate),
            opened: s.metrics.opened,
            clicked: s.metrics.clicked
        }));
    }

    // Check if coverage is below threshold and needs alerting
    checkCoverageThreshold(campaignId = null, threshold = 40) {
        const metrics = this.calculateCoverageMetrics(campaignId);
        const coveragePercent = parseFloat(metrics.coveragePercent);
        return {
            belowThreshold: coveragePercent < threshold,
            coveragePercent,
            threshold,
            alert: coveragePercent < threshold
        };
    }

    // Sync with engagement events from local-server.js
    syncWithEngagementEvents(events) {
        events.forEach(event => {
            const emailId = event.emailId;
            
            switch (event.event) {
                case 'sent':
                    // Track delivery if not already tracked
                    if (!this.coverageData.emails[emailId]) {
                        // Try to get email data from localStorage
                        const bankEmails = JSON.parse(localStorage.getItem('demo3_bank_inbox') || '[]');
                        const emailData = bankEmails.find(e => e.id === emailId);
                        if (emailData) {
                            this.trackDelivery(emailId, emailData);
                        }
                    }
                    break;
                case 'opened':
                    this.trackOpen(emailId, event.timestamp ? new Date(event.timestamp) : null);
                    break;
                case 'clicked':
                    this.trackClick(emailId, event.timestamp ? new Date(event.timestamp) : null);
                    break;
                case 'reported':
                    this.trackReport(emailId, event.timestamp ? new Date(event.timestamp) : null);
                    break;
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhishingCoverageTracker;
}

