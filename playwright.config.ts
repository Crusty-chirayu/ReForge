import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  reporter: "list",
  use: {
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
});
