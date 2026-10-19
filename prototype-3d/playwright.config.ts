import { defineConfig } from "@playwright/test";
// Local server checks must stay local even in environments with an HTTP proxy.
process.env.NO_PROXY = [
  process.env.NO_PROXY,
  process.env.no_proxy,
  "localhost",
  "127.0.0.1",
  "::1",
]
  .filter(Boolean)
  .join(",");
process.env.no_proxy = process.env.NO_PROXY;
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  timeout: 120000,
  expect: { timeout: 10000 },
  use: {
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 400, height: 712 },
    hasTouch: true,
    baseURL: "http://localhost:5174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:5174",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "npm run preview",
      url: "http://localhost:4174",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
