import { defineConfig } from "@playwright/test";

const PORT = 3210;

// End-to-end tests against the dev server on mock data. The microphone is Chromium's fake device (a beep), so the
// recorder runs the real getUserMedia + Web Audio path. CHROME_PATH lets CI use a system Chrome.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [{
    name: "chromium",
    use: {
      browserName: "chromium", viewport: { width: 1440, height: 900 }, colorScheme: "light",
      permissions: ["microphone"],
      launchOptions: {
        executablePath: process.env.CHROME_PATH || undefined,
        args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
      },
    },
  }],
  webServer: { command: `pnpm exec next dev -p ${PORT}`, port: PORT, reuseExistingServer: true, timeout: 120_000 },
});
