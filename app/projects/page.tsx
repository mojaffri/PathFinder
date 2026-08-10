import type { Metadata } from "next";
import { ProjectsDashboard } from "@/components/projects/projects-dashboard";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "Projects & Evidence", robots: PRIVATE_PAGE_ROBOTS };

export default function ProjectsPage() {
  return <ProjectsDashboard />;
}
