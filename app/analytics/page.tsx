import type { Metadata } from "next";
import { ProgressAnalytics } from "@/components/analytics/progress-analytics";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Progress", description: "Review your recorded career-readiness progress over time.", robots: PRIVATE_PAGE_ROBOTS };
export default function AnalyticsPage() { return <ProgressAnalytics />; }
