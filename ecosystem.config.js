// PM2 Ecosystem Configuration
// This file allows you to manage all PM2 processes with environment variables
// DO NOT commit this file with real API keys!

module.exports = {
  apps: [
    {
      name: 'industry',
      script: 'local-server.js',
      env: {
        PORT: 3000,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || 'your_api_key_here',
        SUPABASE_URL: process.env.SUPABASE_URL || 'https://cumodtrxkqakvjandlsw.supabase.co',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW9kdHJ4a3Fha3ZqYW5kbHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM3MzYsImV4cCI6MjA3NTQyOTczNn0.jFdUMilPEv_Yc2EYTFisRzlbFmo_9kcl7A_2xwIQ6cU'
      }
    },
    {
      name: 'agent',
      script: 'autonomous-agent.js',
      env: {
        INDUSTRY_URL: 'http://localhost:3000',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || 'your_api_key_here',
        SUPABASE_URL: process.env.SUPABASE_URL || 'https://cumodtrxkqakvjandlsw.supabase.co',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bW9kdHJ4a3Fha3ZqYW5kbHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM3MzYsImV4cCI6MjA3NTQyOTczNn0.jFdUMilPEv_Yc2EYTFisRzlbFmo_9kcl7A_2xwIQ6cU'
      }
    },
    {
      name: 'defense',
      script: 'autonomous-defense-agent.js',
      env: {
        INDUSTRY_URL: 'http://localhost:3000'
      }
    }
  ]
};



