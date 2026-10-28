import { defineConfig, devices } from "@playwright/test";

// Porta 3101 é da Sessão 1; a Sessão 2 usa 3102 (`PORTA_E2E=3102`).
const porta = Number(process.env.PORTA_E2E ?? 3101);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${porta}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${porta}`,
    url: `http://localhost:${porta}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
