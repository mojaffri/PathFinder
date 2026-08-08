import type { Metadata } from "next";
import { SkillForgeDashboard } from "@/components/skillforge/skillforge-dashboard";

export const metadata: Metadata = { title: "SkillForge — PathFinder" };

export default function SkillForgePage() {
  return <SkillForgeDashboard />;
}
