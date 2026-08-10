import type { Metadata } from "next";
import { JobsDashboard } from "@/components/jobs/jobs-dashboard";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Job Fit", robots: PRIVATE_PAGE_ROBOTS };

export default function JobsPage() {
  return <JobsDashboard />;
}
