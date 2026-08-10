import { describe, expect, it } from "vitest";
import { isProtectedRoute } from "@/lib/auth/route-access";

describe("isProtectedRoute", () => {
  it.each([
    "/dashboard",
    "/applications",
    "/applications/application-1",
    "/analytics?range=month",
    "/jobs/job-1",
    "/reset-password",
  ])("protects private product route %s", (pathname) => {
    expect(isProtectedRoute(pathname.split("?")[0])).toBe(true);
  });

  it.each(["/", "/discover", "/login", "/signup", "/forgot-password", "/dashboard-preview", "/jobs-market"])(
    "does not overmatch public route %s",
    (pathname) => expect(isProtectedRoute(pathname)).toBe(false),
  );
});
