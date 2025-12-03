// Script to clear all Supabase backup and history data
// Run this to reset Supabase tables to empty state

const SupabaseBackupHelper = require('./supabase-backup-helper');

const supabaseUrl = process.env.SUPABASE_URL || 'https://cumodtrxkqakvjandlsw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW9kdHJ4a3Fha3ZqYW5kbHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM3MzYsImV4cCI6MjA3NTQyOTczNn0.jFdUMilPEv_Yc2EYTFisRzlbFmo_9kcl7A_2xwIQ6cU';

const backupHelper = new SupabaseBackupHelper(supabaseUrl, supabaseKey);

async function clearSupabaseData() {
    console.log('🗑️  Clearing Supabase data...\n');
    
    if (!backupHelper.enabled) {
        console.log('❌ Supabase backup helper not enabled');
        console.log('   Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set');
        process.exit(1);
    }
    
    try {
        // Clear agent_metrics_backups table
        console.log('Clearing agent_metrics_backups table...');
        if (backupHelper.supabaseClient) {
            const { error: backupError } = await backupHelper.supabaseClient
                .from('agent_metrics_backups')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all)
            
            if (backupError) throw backupError;
            console.log('✅ Cleared agent_metrics_backups');
        } else {
            // Use fetch API
            const response = await fetch(`${supabaseUrl}/rest/v1/agent_metrics_backups`, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=representation'
                }
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to clear backups: ${error}`);
            }
            console.log('✅ Cleared agent_metrics_backups');
        }
        
        // Clear agent_metrics_history table
        console.log('Clearing agent_metrics_history table...');
        if (backupHelper.supabaseClient) {
            const { error: historyError } = await backupHelper.supabaseClient
                .from('agent_metrics_history')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            
            if (historyError) throw historyError;
            console.log('✅ Cleared agent_metrics_history');
        } else {
            // Use fetch API
            const response = await fetch(`${supabaseUrl}/rest/v1/agent_metrics_history`, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=representation'
                }
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to clear history: ${error}`);
            }
            console.log('✅ Cleared agent_metrics_history');
        }
        
        console.log('\n✅ All Supabase data cleared successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Wait for the agent to run a cycle (~5 minutes)');
        console.log('   2. New backups and history will be created automatically');
        console.log('   3. Check Supabase dashboard to verify tables are empty');
        
    } catch (error) {
        console.error('\n❌ Error clearing Supabase data:', error.message);
        console.error('\n💡 Alternative: Clear data manually in Supabase dashboard:');
        console.error('   1. Go to: https://supabase.com/dashboard');
        console.error('   2. Open your project');
        console.error('   3. Go to Table Editor');
        console.error('   4. Select agent_metrics_backups → Delete all rows');
        console.error('   5. Select agent_metrics_history → Delete all rows');
        process.exit(1);
    }
}

// Run the script
clearSupabaseData();

