// Supabase Backup Helper
// Handles automatic backups of agent data to Supabase

const fs = require('fs');
const path = require('path');

class SupabaseBackupHelper {
    constructor(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.supabaseClient = null;
        this.enabled = false;
        
        // Initialize Supabase client if credentials are provided
        if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
            try {
                // Use dynamic import for Supabase (Node.js)
                this.initSupabase();
            } catch (error) {
                console.warn('[Backup] Supabase not available:', error.message);
            }
        }
    }

    async initSupabase() {
        try {
            // Try to use @supabase/supabase-js if available
            const { createClient } = require('@supabase/supabase-js');
            this.supabaseClient = createClient(this.supabaseUrl, this.supabaseKey);
            this.enabled = true;
            console.log('[Backup] Supabase backup enabled');
        } catch (error) {
            // Fallback: use fetch API if package not installed
            this.enabled = true;
            console.log('[Backup] Using fetch API for Supabase (package not installed)');
        }
    }

    /**
     * Backup agent metrics to Supabase
     */
    async backupAgentMetrics(metricsData, metadata = {}) {
        if (!this.enabled || !this.supabaseUrl) {
            return { success: false, reason: 'Backup not enabled' };
        }

        try {
            const backupPayload = {
                backup_type: 'agent_metrics',
                backup_data: metricsData,
                metadata: {
                    ...metadata,
                    timestamp: new Date().toISOString(),
                    version: '1.0'
                }
            };

            if (this.supabaseClient) {
                // Use Supabase client
                const { data, error } = await this.supabaseClient
                    .from('agent_metrics_backups')
                    .insert([backupPayload])
                    .select();

                if (error) throw error;
                return { success: true, data };
            } else {
                // Use fetch API as fallback
                const response = await fetch(`${this.supabaseUrl}/rest/v1/agent_metrics_backups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(backupPayload)
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Backup failed: ${error}`);
                }

                const data = await response.json();
                return { success: true, data };
            }
        } catch (error) {
            console.error('[Backup] Error backing up agent metrics:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Backup learned strategies to Supabase
     */
    async backupLearnedStrategies(strategiesData, metadata = {}) {
        if (!this.enabled || !this.supabaseUrl) {
            return { success: false, reason: 'Backup not enabled' };
        }

        try {
            const backupPayload = {
                backup_type: 'learned_strategies',
                backup_data: strategiesData,
                metadata: {
                    ...metadata,
                    timestamp: new Date().toISOString()
                }
            };

            if (this.supabaseClient) {
                const { data, error } = await this.supabaseClient
                    .from('agent_metrics_backups')
                    .insert([backupPayload])
                    .select();

                if (error) throw error;
                return { success: true, data };
            } else {
                const response = await fetch(`${this.supabaseUrl}/rest/v1/agent_metrics_backups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(backupPayload)
                });

                if (!response.ok) throw new Error(`Backup failed: ${await response.text()}`);
                return { success: true, data: await response.json() };
            }
        } catch (error) {
            console.error('[Backup] Error backing up learned strategies:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save metrics history for trend tracking
     */
    async saveMetricsHistory(metrics) {
        if (!this.enabled || !this.supabaseUrl) {
            return { success: false, reason: 'Backup not enabled' };
        }

        try {
            const historyPayload = {
                cycle_number: metrics.totalCycles || 0,
                total_emails_generated: metrics.totalEmailsGenerated || 0,
                emails_bypassed: metrics.emailsBypassed || 0,
                emails_detected: metrics.emailsDetected || 0,
                emails_clicked: metrics.emailsClicked || 0,
                bypass_rate: metrics.bypassRate || 0,
                click_rate: metrics.clickRate || 0,
                successful_generations: metrics.successfulGenerations || 0,
                failed_generations: metrics.failedGenerations || 0
            };

            if (this.supabaseClient) {
                const { data, error } = await this.supabaseClient
                    .from('agent_metrics_history')
                    .insert([historyPayload])
                    .select();

                if (error) throw error;
                return { success: true, data };
            } else {
                const response = await fetch(`${this.supabaseUrl}/rest/v1/agent_metrics_history`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(historyPayload)
                });

                if (!response.ok) throw new Error(`History save failed: ${await response.text()}`);
                return { success: true, data: await response.json() };
            }
        } catch (error) {
            console.error('[Backup] Error saving metrics history:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get metrics trends for charting
     */
    async getMetricsTrends(limit = 20) {
        if (!this.enabled || !this.supabaseUrl) {
            return { success: false, data: [], reason: 'Backup not enabled' };
        }

        try {
            if (this.supabaseClient) {
                const { data, error } = await this.supabaseClient
                    .from('agent_metrics_history')
                    .select('cycle_number, bypass_rate, click_rate, emails_bypassed, emails_clicked, created_at')
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return { success: true, data: data.reverse() || [] }; // Reverse to show chronological order
            } else {
                const response = await fetch(
                    `${this.supabaseUrl}/rest/v1/agent_metrics_history?select=cycle_number,bypass_rate,click_rate,emails_bypassed,emails_clicked,created_at&order=created_at.desc&limit=${limit}`,
                    {
                        headers: {
                            'apikey': this.supabaseKey,
                            'Authorization': `Bearer ${this.supabaseKey}`
                        }
                    }
                );

                if (!response.ok) throw new Error(`Trend fetch failed: ${await response.text()}`);
                const data = await response.json();
                return { success: true, data: data.reverse() || [] };
            }
        } catch (error) {
            console.error('[Backup] Error fetching trends:', error.message);
            return { success: false, data: [], error: error.message };
        }
    }
}

module.exports = SupabaseBackupHelper;

