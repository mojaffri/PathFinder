import { CAREERS } from "@/data/careers";
import { SKILL_MODULES } from "@/data/skillforge-modules";
import { getDb } from "@/lib/db/client";
import { assessments, careers, skillModules } from "@/lib/db/schema";

/**
 * Loads the curated, code-shipped datasets (`data/careers.ts`,
 * `data/skillforge-modules.ts`) into their seeded reference tables. Safe to
 * re-run — every insert is an upsert keyed by the dataset's own `id`, so
 * re-running after editing a career/skill module in code just refreshes the row.
 * This does NOT touch any user data.
 */
async function main() {
  const db = getDb();

  console.log(`Seeding ${CAREERS.length} careers...`);
  for (const career of CAREERS) {
    await db
      .insert(careers)
      .values({ id: career.id, title: career.title, category: career.category, data: career })
      .onConflictDoUpdate({
        target: careers.id,
        set: { title: career.title, category: career.category, data: career, updatedAt: new Date() },
      });
  }

  console.log(`Seeding ${SKILL_MODULES.length} skill modules...`);
  for (const skillModule of SKILL_MODULES) {
    await db
      .insert(skillModules)
      .values({ id: skillModule.id, category: skillModule.category, priority: skillModule.priority, data: skillModule })
      .onConflictDoUpdate({
        target: skillModules.id,
        set: { category: skillModule.category, priority: skillModule.priority, data: skillModule, updatedAt: new Date() },
      });

    for (const stage of ["diagnostic", "assessment"] as const) {
      await db
        .insert(assessments)
        .values({ skillId: skillModule.id, stage })
        .onConflictDoNothing({ target: [assessments.skillId, assessments.stage] });
    }
  }

  console.log("Reference data seeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
