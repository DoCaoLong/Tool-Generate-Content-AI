module.exports = {
  apps: [
    {
      name: "create-content",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3004",                 
      instances: "max",                      
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3004
      }
    }
  ]
};