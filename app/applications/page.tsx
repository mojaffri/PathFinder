import type { Metadata } from "next";
import { ApplicationsDashboard } from "@/components/applications/applications-dashboard";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Applications", description: "Track your job application pipeline and next steps.", robots: PRIVATE_PAGE_ROBOTS };

export default function ApplicationsPage() {
  return <ApplicationsDashboard />;
}
