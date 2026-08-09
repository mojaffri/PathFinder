import type { Metadata } from "next";
import { AdaptiveRoadmapDashboard } from "@/components/roadmap/adaptive/adaptive-roadmap-dashboard";

export const metadata: Metadata = { title: "Plan — PathFinder" };

export default function RoadmapPage() {
  return <AdaptiveRoadmapDashboard />;
}
