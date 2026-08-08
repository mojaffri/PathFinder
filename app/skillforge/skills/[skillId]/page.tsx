import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillDetailView } from "@/components/skillforge/skill-detail-view";
import { getSkillModule } from "@/lib/skillforge/catalog";

interface SkillPageProps {
  params: Promise<{ skillId: string }>;
}

export async function generateMetadata({ params }: SkillPageProps): Promise<Metadata> {
  const { skillId } = await params;
  const skillModule = getSkillModule(skillId);
  return { title: skillModule ? `${skillModule.name} — SkillForge — PathFinder` : "Skill not found — PathFinder" };
}

export default async function SkillForgeSkillPage({ params }: SkillPageProps) {
  const { skillId } = await params;
  const skillModule = getSkillModule(skillId);
  if (!skillModule) notFound();

  return <SkillDetailView skillId={skillId} />;
}
