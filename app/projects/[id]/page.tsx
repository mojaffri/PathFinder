import type { Metadata } from "next";
import { ProjectDetailView } from "@/components/projects/project-detail-view";

export const metadata: Metadata = { title: "Project — PathFinder" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}
