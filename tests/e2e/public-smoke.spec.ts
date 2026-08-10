import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing and authentication entry points render without serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expect(page.getByText(/NEXT_PUBLIC_SUPABASE/i)).toHaveCount(0);
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  await expect(page.getByText(/NEXT_PUBLIC_SUPABASE/i)).toHaveCount(0);
  await expect(page.getByText(/no credit card|recruiter friction/i)).toHaveCount(0);
});

test("protected product routes redirect to sign in without exposing API errors", async ({ page }) => {
  for (const path of ["/dashboard", "/onboarding", "/accelerate", "/jobs", "/roadmap", "/skillforge", "/applications", "/analytics"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText("Not authenticated.")).toHaveCount(0);
  }
});

test("mobile navigation is keyboard and screen-reader discoverable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile navigation only renders at mobile width.");
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Toggle menu" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByText("Workspace", { exact: true })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Applications" })).toBeVisible();
});

test("desktop workspace navigation supports disclosure, escape, and navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop workspace disclosure is replaced by the mobile menu.");
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Workspace" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const workspaceNavigation = page.getByRole("navigation", { name: "Workspace navigation" });
  await expect(workspaceNavigation).toBeVisible();
  await expect(workspaceNavigation.getByRole("link")).toHaveCount(4);

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();

  await trigger.click();
  await workspaceNavigation.getByRole("link", { name: /Applications/ }).click();
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fapplications/);
});
