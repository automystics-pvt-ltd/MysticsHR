// PM2 ecosystem file for MysticsHR VPS deployment.
// Used by deploy.sh — do NOT start processes manually with `pm2 start <file>`.
// Run: pm2 start ecosystem.config.cjs  (first time)
//      pm2 reload ecosystem.config.cjs (zero-downtime reload on redeploy)

module.exports = {
  apps: [
    {
      name: "mysticshr-api",
      script: "artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      interpreter_args: "--enable-source-maps",
      cwd: "/home/automystics-mysticshr/htdocs/mysticshr.automystics.tech",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "/var/log/pm2/mysticshr-api-error.log",
      out_file: "/var/log/pm2/mysticshr-api-out.log",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
        // Serve MysticsHR + Platform Admin SPAs from their dist/ directories.
        // The API server checks this flag in index.ts before mounting SPA routes.
        SERVE_SPA: "true",
      },
    },
  ],
};
