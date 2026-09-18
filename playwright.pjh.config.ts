import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "pjh-list.spec.ts",
  use: { channel: "msedge", headless: true },
});
