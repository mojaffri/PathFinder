import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { CAREERS } from "@/data/careers";
import { getAIAdvantageForCategories } from "@/data/ai-advantage";
import { matchCareers } from "@/lib/matching/engine";
import { analyzeGaps, deriveTopMoves } from "@/lib/gap-analysis/engine";
import { generateFallbackRoadmap } from "@/lib/roadmap/fallback";
import { computePhaseTimelines, totalEstimatedHours } from "@/lib/roadmap/pacing";
import { buildTargetResumeBenchmark } from "@/lib/roadmap/target-resume";
import type { RoadmapRequest } from "@/lib/roadmap/schema";
import { getSkillModulesForCareers } from "@/lib/skillforge/catalog";
import { createProfile, getProfileByUserId, markAsDemo, updateProfile, type ProfileWriteInput } from "@/repositories/profile-repository";
import { saveRoadmap } from "@/repositories/roadmap-repository";
import { saveCareerMatches } from "@/repositories/career-match-repository";
import { markExerciseCompleted, markResourceCompleted } from "@/repositories/skillforge-repository";
import { resolveCareers, DEFAULT_WORK_PREFERENCES, type EducationStage, type Roadmap, type SavedRoadmap } from "@/types";

/**
 * Seeds (or refreshes) the shared "Try Demo" showcase account, entirely
 * through the app's own real engines and repositories — the roadmap and
 * career matches below are genuinely computed by
 * `lib/gap-analysis/engine.ts` / `lib/matching/engine.ts` / `lib/roadmap/
 * fallback.ts` against the same curated `data/careers.ts`, not hand-written
 * copy. That keeps the demo honest with the project's own anti-fabrication
 * rule and doubles as a smoke test of the whole profile -> roadmap ->
 * SkillForge pipeline. Safe to re-run.
 */

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD;

async function ensureDemoAuthUser(): Promise<string> {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set to seed the demo account.");
  if (!DEMO_EMAIL || !DEMO_PASSWORD) throw new Error("DEMO_USER_EMAIL and DEMO_USER_PASSWORD must be set.");

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (created?.user) return created.user.id;

  if (createError && !createError.message.toLowerCase().includes("already")) throw createError;

  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === DEMO_EMAIL);
  if (!existing) throw new Error("Demo user creation failed and no existing user was found.");
  return existing.id;
}

function buildDemoRequest(): RoadmapRequest {
  return {
    name: "Jordan Rivera",
    age: 20,
    educationStage: "college-junior",
    school: "State University",
    major: "Computer Science",
    gpa: { raw: 3.6, scale: "4.0", normalized4: 3.6 },
    education: [
      {
        id: "demo-edu-1",
        institution: "State University",
        degree: "B.S.",
        major: "Computer Science",
        gpa: 3.6,
        gpaScale: "4.0",
        startDate: "2023-08",
        endDate: "2027-05",
      },
    ],
    targetIndustry: "Technology",
    targetCareers: ["Software Engineer", "Data Scientist"],
    currentSkills: ["Python", "SQL", "Git"],
    interests: ["machine learning", "open source"],
    experience: [
      {
        id: "demo-exp-1",
        title: "Data Engineering Intern",
        organization: "Riverside Analytics",
        location: "Remote",
        startDate: "2025-06",
        endDate: "2025-08",
        summary: "Built ETL pipelines for internal reporting dashboards.",
        bullets: [
          "Automated a daily ETL job, cutting manual reporting time by [quantify impact]",
          "Wrote unit tests for a shared data-validation library",
        ],
      },
    ],
    projects: [
      {
        id: "demo-proj-1",
        title: "Campus Event Recommender",
        technologies: ["Python", "pandas", "scikit-learn"],
        date: "2025-03",
        summary: "A content-based recommender for campus events.",
        bullets: [
          "Built a content-based filtering model over 500+ historical events",
          "Deployed a Streamlit demo for classmates to test",
        ],
        githubUrl: null,
      },
    ],
    awards: [],
    certifications: [],
    careerGoals: "Land a software engineering internship, then a full-time new-grad SWE or data role after graduation.",
    weeklyHoursAvailable: 10,
  };
}

function toWriteInput(request: RoadmapRequest): ProfileWriteInput {
  return {
    name: request.name,
    age: request.age,
    educationStage: request.educationStage as ProfileWriteInput["educationStage"],
    school: request.school,
    major: request.major,
    gpaRaw: request.gpa.raw,
    gpaScale: request.gpa.scale,
    targetIndustry: request.targetIndustry,
    targetCareers: request.targetCareers,
    currentSkills: request.currentSkills,
    interests: request.interests,
    education: request.education,
    experience: request.experience,
    projects: request.projects,
    awards: request.awards,
    certifications: request.certifications,
    careerGoals: request.careerGoals,
    workPreferences: DEFAULT_WORK_PREFERENCES,
    weeklyHoursAvailable: request.weeklyHoursAvailable,
    preferredLocations: ["Remote", "Austin, TX"],
    employmentPreference: "internship",
    targetDate: "2027-05-01",
  };
}

async function main() {
  console.log("Ensuring demo auth user exists...");
  const userId = await ensureDemoAuthUser();

  const request = buildDemoRequest();
  const writeInput = toWriteInput(request);

  console.log("Seeding demo profile...");
  const existing = await getProfileByUserId(userId);
  await (existing ? updateProfile(userId, writeInput) : createProfile(userId, writeInput));
  await markAsDemo(userId);

  console.log("Computing and saving a real roadmap for the demo profile...");
  const resolvedCareers = resolveCareers(CAREERS, request.targetCareers);
  const gapAnalysis = analyzeGaps(request, resolvedCareers);
  const content = generateFallbackRoadmap(request, resolvedCareers, gapAnalysis);
  const phaseHours = content.phases.map((phase) => totalEstimatedHours(phase.milestones));
  const phaseTimelines = computePhaseTimelines(phaseHours, request.weeklyHoursAvailable);
  content.phases = content.phases.map((phase, i) => ({ ...phase, timeline: phaseTimelines[i] }));

  const roadmap: Roadmap = {
    ...content,
    targetCareers: request.targetCareers,
    gapAnalysis,
    topMoves: deriveTopMoves(gapAnalysis),
    aiAdvantage: getAIAdvantageForCategories(resolvedCareers.map((rc) => rc.career?.category ?? null)),
    targetResumeBenchmark: buildTargetResumeBenchmark(request, resolvedCareers),
    weeklyHoursAvailable: request.weeklyHoursAvailable,
    generatedAt: new Date().toISOString(),
    source: "fallback",
  };

  const now = new Date().toISOString();
  const savedRoadmap: SavedRoadmap = {
    id: "00000000-0000-4000-8000-000000000001",
    userId,
    major: request.major,
    targetCareers: request.targetCareers,
    educationStage: request.educationStage as EducationStage | null,
    createdAt: now,
    updatedAt: now,
    roadmap,
    source: "accelerate",
  };
  await saveRoadmap(userId, savedRoadmap);

  console.log("Computing and saving real Discover matches for the demo profile...");
  const matches = matchCareers({
    age: request.age,
    educationStage: request.educationStage as EducationStage | null,
    categoryAffinities: ["software-tech", "data-ai"],
    workEnvironments: ["remote-first", "hybrid"],
    mathComfort: 4,
    technicalProblemSolving: 5,
    tinkeringInterest: 4,
    researchInterest: 3,
    communicationInterest: 3,
    favoriteSubjects: ["computer-science", "mathematics"],
    workStylePreferences: ["coding", "data"],
    remoteWorkInterest: 4,
    priorityRanking: ["learning-growth", "salary", "remote-flexibility", "work-life-balance", "prestige-impact", "leadership-entrepreneurship"],
  });
  await saveCareerMatches(userId, matches);

  console.log("Seeding partial SkillForge progress...");
  const modules = getSkillModulesForCareers(request.targetCareers);
  const firstModule = modules[0];
  if (firstModule) {
    for (const resource of firstModule.learningResources.slice(0, 2)) {
      await markResourceCompleted(userId, firstModule, resource.id, true);
    }
    const firstExercise = firstModule.practiceExercises[0];
    if (firstExercise) await markExerciseCompleted(userId, firstModule, firstExercise.id, true);
  }

  console.log("Demo account seeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
