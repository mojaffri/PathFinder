import type { Metadata } from "next";
import { SkillForgeDashboard } from "@/components/skillforge/skillforge-dashboard";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

export const metadata: Metadata = { title: "SkillForge", robots: PRIVATE_PAGE_ROBOTS };

export default function SkillForgePage() {
  return <SkillForgeDashboard />;
}
