import type { Metadata } from "next";
import { AdaptiveRoadmapDashboard } from "@/components/roadmap/adaptive/adaptive-roadmap-dashboard";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Plan", robots: PRIVATE_PAGE_ROBOTS };

export default function RoadmapPage() {
  return <AdaptiveRoadmapDashboard />;
}
