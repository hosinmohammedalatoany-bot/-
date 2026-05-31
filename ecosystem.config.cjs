/** PM2 — Baraa Raed Car Showroom (single Next.js app + JSON DB) */
module.exports = {
  apps: [
    {
      name: "baraa-raed",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0"
      },
      env_production: {
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://app.your-domain.com"
      },
      max_memory_restart: "800M",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      autorestart: true
    }
  ]
};
