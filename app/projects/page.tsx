import type { Metadata } from "next";
import { ProjectsDashboard } from "@/components/projects/projects-dashboard";

export const metadata: Metadata = { title: "Projects & Evidence — PathFinder" };

export default function ProjectsPage() {
  return <ProjectsDashboard />;
}
