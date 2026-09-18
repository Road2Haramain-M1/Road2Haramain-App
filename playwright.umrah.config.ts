import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "umrah-directory.spec.ts",
  workers: 1,
  use: { channel: "msedge", headless: true },
});
