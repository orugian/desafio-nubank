import { defineConfig, devices } from '@playwright/test';
// Usa um servidor de produção já iniciado (sem conflitar com `next dev` em execução).
export default defineConfig({
  testDir: './e2e', workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: process.env.UI_URL ?? 'http://localhost:3191', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
