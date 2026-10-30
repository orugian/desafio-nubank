import { defineConfig } from '@playwright/test';
// Aponta para uma instância já iniciada: não substitui o servidor do desenvolvedor.
export default defineConfig({
  testDir:'./e2e',testMatch:'ui-refino.spec.ts',workers:1,retries:0,reporter:'list',
  use:{baseURL:process.env.UI_URL ?? 'http://localhost:3000',trace:'retain-on-failure',screenshot:'only-on-failure'},
});
