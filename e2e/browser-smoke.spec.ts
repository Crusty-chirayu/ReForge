import { test, expect } from "@playwright/test";

test("browser launches successfully and connects to live ReForge application", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ReForge/i);
  // Verify real application elements render
  await expect(page.locator("h1")).toContainText("ReForge Engineering System");
  await expect(page.getByRole("navigation", { name: "Console sections" })).toBeVisible();
});
