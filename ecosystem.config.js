module.exports = {
  apps: [
    {
      name: 'arayanvar-backend',
      script: './arayanvar-backend/server.js',
      cwd: '/var/www/arayanvar',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Logging
      log_file: '/var/log/arayanvar/combined.log',
      out_file: '/var/log/arayanvar/out.log',
      error_file: '/var/log/arayanvar/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      
      // Auto restart on file changes (sadece development için)
      watch_options: {
        followSymlinks: false
      },
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Environment variables file
      env_file: '.env.production'
    }
  ],
  
  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/main',
      repo: 'YOUR_GIT_REPOSITORY_URL',
      path: '/var/www/arayanvar/arayanvar-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};