import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SkillDetailView } from "@/components/skillforge/skill-detail-view";
import { getSkillModule } from "@/lib/skillforge/catalog";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/site";

interface SkillPageProps {
  params: Promise<{ skillId: string }>;
}

export async function generateMetadata({ params }: SkillPageProps): Promise<Metadata> {
  const { skillId } = await params;
  const skillModule = getSkillModule(skillId);
  return { title: skillModule ? `${skillModule.name} — SkillForge` : "Skill not found", robots: PRIVATE_PAGE_ROBOTS };
}

export default async function SkillForgeSkillPage({ params }: SkillPageProps) {
  const { skillId } = await params;
  const skillModule = getSkillModule(skillId);
  if (!skillModule) notFound();

  return <SkillDetailView skillId={skillId} />;
}
