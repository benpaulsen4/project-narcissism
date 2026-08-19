import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:4321", trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14 Pro"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Astro 7's CLI auto-detects agentic/CLI-driven environments (via
    // am-i-vibing) and silently daemonizes `astro preview` in that case —
    // the command prints its "server running" message and exits 0
    // immediately, with the actual server left as a detached background
    // process. Playwright's webServer expects the command to stay in the
    // foreground and treats that immediate exit as "Process from
    // config.webServer exited early." Setting this env var disables Astro's
    // agent auto-detection so `astro preview` blocks normally, which is
    // what Playwright's process lifecycle management requires.
    env: { ASTRO_PREVIEW_BACKGROUND: "1" },
  },
});
