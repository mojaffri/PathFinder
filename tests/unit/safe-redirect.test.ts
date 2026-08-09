import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/security/safe-redirect";

describe("safeRedirectPath", () => {
  it("accepts same-site paths and query strings", () => expect(safeRedirectPath("/jobs/123?tab=fit", "/dashboard")).toBe("/jobs/123?tab=fit"));
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"])("rejects unsafe redirect %s", (value) => expect(safeRedirectPath(value, "/dashboard")).toBe("/dashboard"));
});
