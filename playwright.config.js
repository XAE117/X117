import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.smoke.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/X117/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'VITE_IOS_CATALOG_BASE=http://127.0.0.1:4173/X117/ npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/X117/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
})
