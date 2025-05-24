module.exports = {
  apps: [{
    name: 'seka-game',
    script: 'server.py',
    interpreter: 'python',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_test: {
      NODE_ENV: 'test',
      PORT: 3001
    }
  }],

  deploy: {
    production: {
      user: 'seka',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/seka-card-game.git',
      path: '/var/www/seka-game',
      'post-deploy': 'source venv/bin/activate && pip install -r requirements.txt && python scripts/init_db.py && pm2 reload ecosystem.config.js --env production'
    },
    staging: {
      user: 'seka',
      host: 'staging.your-server.com',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/seka-card-game.git',
      path: '/var/www/seka-game-staging',
      'post-deploy': 'source venv/bin/activate && pip install -r requirements.txt && python scripts/init_db.py && pm2 reload ecosystem.config.js --env staging'
    }
  }
}; 