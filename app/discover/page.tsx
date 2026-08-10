import type { Metadata } from "next";
import { DiscoverFlow } from "@/components/discovery/discover-flow";

export const metadata: Metadata = { title: "Discover Your Path", description: "Compare evidence-driven career matches across 46 paths and understand the tradeoffs behind each result." };

export default function DiscoverPage() {
  return <DiscoverFlow />;
}
