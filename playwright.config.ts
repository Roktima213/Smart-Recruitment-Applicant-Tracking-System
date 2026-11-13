import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for Smart ATS Full-Stack Recruitment Journey
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 7000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: [
    {
      command: 'npm --prefix backend run dev',
      port: 5000,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm --prefix frontend run dev',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
