import type { Metadata } from "next";
import { DiscoverFlow } from "@/components/discovery/discover-flow";

export const metadata: Metadata = { title: "Discover — PathFinder" };

export default function DiscoverPage() {
  return <DiscoverFlow />;
}
