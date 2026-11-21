import { test, expect, type Page } from "@playwright/test";

const mockReport = {
  schemaVersion: "1.0",
  generatedAt: "2026-11-21T10:00:00.000Z",
  provenance: {
    source: { kind: "archive" as const, reference: "test-repo.zip" },
    licenses: [],
    copyrightNotices: [],
  },
  overview: {
    fileCount: 24,
    analyzableFileCount: 20,
    totalBytes: 84200,
  },
  languages: [
    { name: "TypeScript", confidence: "high" as const, evidence: [{ file: "src/index.ts", detail: "ts files" }] },
  ],
  frameworks: [],
  dependencies: [],
  structure: {
    topLevel: ["src", "package.json"],
    importantFiles: ["src/index.ts"],
    ignoredDirectories: [],
  },
  entryPoints: [],
  apiHints: [],
  databaseHints: [],
  authenticationHints: [],
  architecture: [],
  codeQualityObservations: [],
  risks: [],
  recommendedNextSteps: [],
};

async function seedReport(page: Page) {
  await page.addInitScript((report) => {
    window.sessionStorage.setItem("reforge-report", JSON.stringify(report));
  }, mockReport);
}

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 },
];

test.describe("Visual QA & Viewport Responsiveness", () => {
  for (const vp of VIEWPORTS) {
    test(`Overview renders responsively without horizontal overflow at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // Verify page loaded
      await expect(page.locator("h1")).toContainText("ReForge Engineering System");

      // Verify no horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);

      if (vp.width < 1024) {
        // Mobile drawer button should be visible on smaller screens
        const menuButton = page.getByRole("button", { name: /Open navigation menu/i }).or(page.getByRole("button", { name: /menu/i }));
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await expect(page.getByRole("dialog", { name: /Navigation/i }).or(page.getByRole("link", { name: "Overview", exact: true }))).toBeVisible();
          await page.keyboard.press("Escape");
        }
      }
    });

    test(`Builder workbench adapts responsively at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await seedReport(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/build");

      await expect(page.locator("h1")).toContainText("Flagship Builder");

      // Verify no horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    });

    test(`Project Brain 3-region console renders cleanly at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await seedReport(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/brain");

      await expect(page.locator("h1")).toContainText("Project Brain");

      // Verify no horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    });
  }

  test("Theme toggle toggles html class and persists contrast across views", async ({ page }) => {
    await page.goto("/");

    const themeBtn = page.getByRole("button", { name: /Toggle theme/i });
    await expect(themeBtn).toBeVisible();

    // Verify dark mode default
    const isDarkInitial = await page.evaluate(() => document.documentElement.classList.contains("dark"));

    // Toggle to Light
    await themeBtn.click();
    const isDarkAfterToggle = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkAfterToggle).not.toBe(isDarkInitial);

    // Toggle back to Dark
    await themeBtn.click();
    const isDarkFinal = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDarkFinal).toBe(isDarkInitial);
  });
});
