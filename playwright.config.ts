import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "msedge",
    headless: true,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "msedge",
      use: {
        channel: "msedge",
      },
    },
  ],
  webServer: [
    {
      command: "npx tsx src/server.ts",
      url: "http://127.0.0.1:3001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        PORT: "3001",
        REFORGE_STORE_DIR: "./.reforge/e2e-store",
        REFORGE_SKIP_LISTEN: "false",
        NODE_ENV: "production",
      },
    },
    {
      command: "pnpm --filter reforge-frontend start",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 45000,
      env: {
        PORT: "3000",
        REFORGE_BACKEND_URL: "http://127.0.0.1:3001",
      },
    },
  ],
});
