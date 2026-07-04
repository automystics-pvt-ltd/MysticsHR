// PM2 ecosystem file for MysticsHR VPS deployment.
// deploy.sh writes secrets from the shell into .env.pm2 (gitignored).
// This file reads .env.pm2 and merges it into the process env so pm2
// always starts with the correct secrets regardless of shell inheritance.

const fs = require("fs");
const path = require("path");

// Parse .env.pm2 written by deploy.sh
const envFilePath = path.join(__dirname, ".env.pm2");
const fileEnv = {};
if (fs.existsSync(envFilePath)) {
  fs.readFileSync(envFilePath, "utf8")
    .split("\n")
    .forEach((line) => {
      const eq = line.indexOf("=");
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key) fileEnv[key] = val;
    });
} else {
  console.warn("[ecosystem] WARNING: .env.pm2 not found — run deploy.sh first");
}

module.exports = {
  apps: [
    {
      name: "mysticshr-api",
      script: "artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      interpreter_args: "--enable-source-maps",
      cwd: "/home/automystics-mysticshr/htdocs/mysticshr.automystics.tech",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "/var/log/pm2/mysticshr-api-error.log",
      out_file:   "/var/log/pm2/mysticshr-api-out.log",
      env: {
        NODE_ENV: "production",
        PORT: "8090",
        SERVE_SPA: "true",
        ...fileEnv,
      },
    },
  ],
};
