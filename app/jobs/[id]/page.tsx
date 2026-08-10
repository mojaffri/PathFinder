import type { Metadata } from "next";
import { JobDetailView } from "@/components/jobs/job-detail-view";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Job Fit Analysis", robots: PRIVATE_PAGE_ROBOTS };

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailView jobId={id} />;
}
