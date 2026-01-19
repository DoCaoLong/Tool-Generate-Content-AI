module.exports = {
  apps: [
    {
      name: "content-writer-ui",
      cwd: __dirname,

      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",

      exec_mode: "fork",
      instances: 1,

      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,

      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    }
  ]
};
