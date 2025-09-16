module.exports = {
  apps: [
    {
      name: 'smart-grocery-assistant',
      script: 'dist/smart-grocery-assistant/server/server.mjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PM2: true,
      },
    },
  ],
};
