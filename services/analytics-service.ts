import type { DashboardOverview } from "@/types";

export async function getAnalyticsOverview(): Promise<DashboardOverview | null> {
  const response = await fetch("/api/analytics/overview");
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body ? String(body.error) : "Could not load your analytics.");
  return (body as { overview: DashboardOverview | null }).overview;
}
