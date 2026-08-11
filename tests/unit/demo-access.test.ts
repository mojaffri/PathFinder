import { describe, expect, it } from "vitest";
import { isReadOnlyDemoMutation } from "@/lib/auth/demo-access";

describe("isReadOnlyDemoMutation", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("blocks %s writes from the shared demo account", (method) => {
    expect(isReadOnlyDemoMutation({ pathname: "/api/profile", method, userEmail: "demo@example.com", demoEmail: "DEMO@example.com" })).toBe(true);
  });

  it("allows reads, real users, and the demo login request", () => {
    expect(isReadOnlyDemoMutation({ pathname: "/api/profile", method: "GET", userEmail: "demo@example.com", demoEmail: "demo@example.com" })).toBe(false);
    expect(isReadOnlyDemoMutation({ pathname: "/api/profile", method: "POST", userEmail: "student@example.com", demoEmail: "demo@example.com" })).toBe(false);
    expect(isReadOnlyDemoMutation({ pathname: "/api/demo/login", method: "POST", userEmail: null, demoEmail: "demo@example.com" })).toBe(false);
  });
});
