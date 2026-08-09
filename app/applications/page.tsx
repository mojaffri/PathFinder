import type { Metadata } from "next";
import { ApplicationsDashboard } from "@/components/applications/applications-dashboard";

export const metadata: Metadata = { title: "Applications — PathFinder", description: "Track your job application pipeline and next steps." };

export default function ApplicationsPage() {
  return <ApplicationsDashboard />;
}
