import type { Metadata } from "next";
import { ProgressAnalytics } from "@/components/analytics/progress-analytics";

export const metadata: Metadata = { title: "Progress — PathFinder", description: "Review your recorded career-readiness progress over time." };
export default function AnalyticsPage() { return <ProgressAnalytics />; }
