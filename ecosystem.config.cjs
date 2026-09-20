const fs = require("fs");
const path = require("path");

function readPort() {
  const envPath = [".env.local", ".env"].map((file) => path.join(__dirname, file)).find((file) => fs.existsSync(file));
  if (envPath) {
    const match = fs.readFileSync(envPath, "utf8").split(/\r?\n/).find((line) => /^\s*PORT\s*=/.test(line));
    const value = match ? match.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
    if (value) return value;
  }
  return process.env.PORT || "3004";
}

const port = readPort();

module.exports = {
  apps: [
    {
      name: "create-content",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${port}`,
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};
