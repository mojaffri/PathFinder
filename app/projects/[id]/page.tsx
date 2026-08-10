import type { Metadata } from "next";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Project", robots: PRIVATE_PAGE_ROBOTS };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}
