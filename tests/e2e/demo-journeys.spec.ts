import { test, expect } from "@playwright/test";

test.describe("configured demo account journeys", () => {
  test.skip(process.env.E2E_DEMO !== "1", "Requires the deployed, seeded demo account.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /try (the )?demo/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/demo account/i).first()).toBeVisible();
  });

  test("authentication, onboarding state, and dashboard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await page.goto("/profile");
    await expect(page.getByRole("button", { name: "Delete account" })).toBeVisible();
    await page.goto("/onboarding");
    await expect(page.locator("main")).toContainText(/profile|basics|onboarding|goal/i);
  });

  test("resume, job analysis, roadmap, assessment, application, and demo surfaces", async ({ page }) => {
    const journeys: Array<[string, RegExp]> = [
      ["/accelerate", /resume|roadmap/i],
      ["/jobs", /job fit/i],
      ["/roadmap", /roadmap|plan/i],
      ["/skillforge", /skillforge/i],
      ["/applications", /application pipeline/i],
      ["/analytics", /progress analytics/i],
    ];
    for (const [path, text] of journeys) {
      await page.goto(path);
      await expect(page.locator("main")).toContainText(text);
    }
  });
});
