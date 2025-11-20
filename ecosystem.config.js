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
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || 'your_api_key_here'
      }
    },
    {
      name: 'agent',
      script: 'autonomous-agent.js',
      env: {
        INDUSTRY_URL: 'http://localhost:3000',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || 'your_api_key_here'
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

