import type { Metadata } from "next";
import { SavedRoadmapsView } from "@/components/saved/saved-roadmaps-view";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Saved Guides", robots: PRIVATE_PAGE_ROBOTS };

export default function SavedPage() {
  return <SavedRoadmapsView />;
}
