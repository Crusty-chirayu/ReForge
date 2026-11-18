import { test, expect } from "@playwright/test";

test("browser launches successfully and can render an HTML document", async ({ page }) => {
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head><title>ReForge E2E</title></head>
      <body>
        <main>
          <h1>ReForge Intelligence Platform</h1>
          <p id="status">Operational</p>
        </main>
      </body>
    </html>
  `);

  await expect(page.locator("h1")).toHaveText("ReForge Intelligence Platform");
  await expect(page.locator("#status")).toHaveText("Operational");
});
