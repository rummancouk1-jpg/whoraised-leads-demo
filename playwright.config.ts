import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", fullyParallel: false, workers: 1, timeout: 60000,
  reporter: [["list"], ["json", { outputFile: "evidence/test-results.json" }]],
});
