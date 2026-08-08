import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubError, fetchRepo, fetchUser } from "@/lib/github/client";

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("github client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on a successful request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ login: "octocat", id: 1, name: "The Octocat" })));
    const user = await fetchUser("octocat");
    expect(user.login).toBe("octocat");
  });

  it("throws a clean 'not found' GithubError on a 404, not a raw parse error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Not Found" }, { status: 404 })));
    await expect(fetchUser("does-not-exist")).rejects.toThrow(GithubError);
    await expect(fetchUser("does-not-exist")).rejects.toMatchObject({ status: 404, isRateLimit: false });
  });

  it("recognizes a rate-limit response (403 + remaining=0) and surfaces retryAfterSeconds", async () => {
    const resetEpoch = Math.floor(Date.now() / 1000) + 120;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { message: "API rate limit exceeded" },
          { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(resetEpoch) } },
        ),
      ),
    );
    try {
      await fetchRepo("octocat", "hello-world");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(GithubError);
      const githubError = error as GithubError;
      expect(githubError.isRateLimit).toBe(true);
      expect(githubError.retryAfterSeconds).toBeGreaterThan(0);
      expect(githubError.message).toMatch(/rate limit/i);
    }
  });

  it("treats a 403 with remaining > 0 as a normal error, not a rate limit (e.g. genuinely forbidden)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Forbidden" }, { status: 403, headers: { "x-ratelimit-remaining": "10" } })),
    );
    await expect(fetchRepo("octocat", "private-repo")).rejects.toMatchObject({ isRateLimit: false });
  });

  it("wraps a network failure in a GithubError instead of letting a raw fetch rejection propagate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network error")));
    await expect(fetchUser("octocat")).rejects.toThrow(GithubError);
  });
});
