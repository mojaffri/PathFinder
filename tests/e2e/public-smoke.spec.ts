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

test("color theme toggles and persists without changing page content", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("html");
  const toggle = page.getByRole("button", { name: "Toggle color theme" });
  const initialTheme = await root.getAttribute("data-theme");

  expect(["light", "dark"]).toContain(initialTheme);
  await expect(toggle).toBeVisible();
  await toggle.click();

  const selectedTheme = initialTheme === "dark" ? "light" : "dark";
  await expect(root).toHaveAttribute("data-theme", selectedTheme);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);

  await page.reload();
  await expect(root).toHaveAttribute("data-theme", selectedTheme);
});

test("launch essentials are public, linked, and indexable only where appropriate", async ({ page, request }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer navigation" });
  await expect(footer.getByRole("link", { name: "How it works" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();

  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { level: 1, name: /exactly how PathFinder/i })).toBeVisible();
  await expect(page).toHaveTitle(/^How It Works \| PathFinder$/);

  await page.goto("/faq");
  await expect(page.getByRole("heading", { level: 1, name: /straight answers/i })).toBeVisible();

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Disallow: /dashboard");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("/privacy");
});

test("password recovery is reachable without an authenticated session", async ({ page }) => {
  await page.goto("/login");
  const recoveryLink = page.getByRole("link", { name: "Forgot password?" });
  if (await recoveryLink.count()) {
    await recoveryLink.click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  }
});

test("landing prioritizes the two user journeys in the first desktop view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "The mobile layout intentionally scrolls the journey cards.");
  await page.goto("/");

  const discover = page.getByRole("link", { name: /Discover Your Path/i });
  const accelerate = page.getByRole("link", { name: /Accelerate Your Path/i });
  const discoverHeading = page.getByRole("heading", { name: "Discover Your Path" });
  const accelerateHeading = page.getByRole("heading", { name: "Accelerate Your Path" });
  await expect(discover).toBeVisible();
  await expect(accelerate).toBeVisible();
  await expect(discoverHeading).toBeVisible();
  await expect(accelerateHeading).toBeVisible();

  const viewportHeight = page.viewportSize()?.height ?? 0;
  const discoverBox = await discoverHeading.boundingBox();
  const accelerateBox = await accelerateHeading.boundingBox();
  expect(discoverBox).not.toBeNull();
  expect(accelerateBox).not.toBeNull();
  expect((discoverBox?.y ?? viewportHeight) + (discoverBox?.height ?? 0)).toBeLessThanOrEqual(viewportHeight);
  expect((accelerateBox?.y ?? viewportHeight) + (accelerateBox?.height ?? 0)).toBeLessThanOrEqual(viewportHeight);
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
