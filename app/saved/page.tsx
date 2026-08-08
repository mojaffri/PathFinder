import type { Metadata } from "next";
import { SavedRoadmapsView } from "@/components/saved/saved-roadmaps-view";

export const metadata: Metadata = { title: "Saved Guides — PathFinder" };

export default function SavedPage() {
  return <SavedRoadmapsView />;
}
