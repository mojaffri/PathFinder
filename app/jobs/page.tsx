import type { Metadata } from "next";
import { JobsDashboard } from "@/components/jobs/jobs-dashboard";

export const metadata: Metadata = { title: "Job Fit — PathFinder" };

export default function JobsPage() {
  return <JobsDashboard />;
}
