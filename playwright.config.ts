import { defineConfig, devices } from "@playwright/test";

// Browser tests for layout rules that only show up in a real engine. They run
// against the production build of whatever is in static/movies.json; CI copies
// tests/fixtures/movies.json there first.
export default defineConfig({
  testDir: "tests",
  testMatch: "*.e2e.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "iphone", use: { ...devices["iPhone 15"] } }],
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
