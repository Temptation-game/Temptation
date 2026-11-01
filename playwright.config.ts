// Browser (end-to-end) tests: test/e2e/<category>.spec.ts against a production build served by vite preview.
// Usage: npm run test:e2e   (update screenshot baselines: npm run test:e2e -- --update-snapshots)
import { defineConfig, devices } from "@playwright/test";

const PORT = 4174;

export default defineConfig({
  testDir: "test/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate: "test/e2e/__screenshots__/{testFileName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1400, height: 900 },
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
