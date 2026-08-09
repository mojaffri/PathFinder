import { CAREERS } from "../../data/careers";
import type { Career, ReadinessGate, ResolvedCareer } from "../../types";

/**
 * Career-specific expert playbooks, keyed directly to individual careers
 * (not to their broad `CareerCategory`). This is the single source of truth
 * for "what does industry-standard progress actually look like for THIS
 * specific career" â€” the gating exam and its real readiness timeline, the
 * concrete resume builders and tools that matter right now, and the specific
 * networking phrasing to use instead of "network with X". Both the AI prompt
 * (lib/roadmap/ai-generator.ts) and the deterministic gap analysis
 * (lib/gap-analysis/engine.ts) read from this.
 *
 * This used to be keyed by `CareerCategory`, which broke down once a single
 * category held careers with genuinely different credential paths â€” e.g. the
 * "healthcare" category spans Physician (MCAT), program-variable Physical
 * Therapist requirements, Pharmacist (no PCAT since its 2024 retirement),
 * and Dentist (DAT), and a category-wide "gatingExam"
 * field silently told every one of them to study for the MCAT. Keying by
 * career id instead means a Pre-Dental student is never told to study for
 * the MCAT and a Robotics Engineer's grad-school gap never cites the FE
 * Exam (a licensure exam, not a grad-admissions test).
 */
export interface CareerPlaybook {
  /** Display label for prompt/UI text, e.g. "Dentist", "Robotics Engineer". */
  field: string;
  /** The admissions/licensing test that gates the next step for THIS career, or null when there isn't one. */
  gatingExam: string | null;
  /** Readiness gate for gatingExam specifically. */
  gatingExamReadiness: ReadinessGate;
  /** Whether the exam is a real universal gate or must be verified program-by-program before any prep spend. */
  gatingExamPolicy?: "required" | "program-dependent";
  /** The 2-4 tools worth prioritizing first for immediate resume leverage in this specific career (a curated subset, not the full commonTools list). */
  keyTools: string[];
  /** Concrete, career-specific resume builders that belong in Phase A regardless of any credential timeline. */
  immediateResumeBuilders: string[];
  /** Concrete phrasing for the networking action, avoiding generic "network with X" filler. */
  networkingTemplate: { roles: string; focusAreas: string };
  /** Vague phrases common in this career that the AI must never use as-is. */
  genericPhrasesToAvoid: string[];
  /** The official body/site for gatingExam registration and prep, when one exists. */
  officialPrepResource?: string;
}

type CareerId = (typeof CAREERS)[number]["id"];

const CAREER_PLAYBOOKS: Record<CareerId, CareerPlaybook> = {
  // ============================== ENGINEERING ==============================
  "mechanical-engineer": {
    field: "Mechanical Engineer",
    gatingExam: "FE Exam",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["SolidWorks", "ANSYS", "MATLAB"],
    immediateResumeBuilders: [
      "A hands-on design project with a real SolidWorks model and analysis (FEA if possible)",
      "A physical or simulated prototype build, ideally through a competition team (SAE, Formula, Baja)",
      "Demonstrated statics/dynamics/thermodynamics fundamentals through a specific solved problem or project",
    ],
    networkingTemplate: { roles: "practicing mechanical engineers in your target industry", focusAreas: "the specific product category (automotive, consumer, industrial) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn CAD software", "gain technical experience"],
    officialPrepResource: "NCEES.org for official FE Exam registration and practice exams",
  },
  "electrical-engineer": {
    field: "Electrical Engineer",
    gatingExam: "FE Exam",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["Altium or KiCad", "MATLAB/Simulink", "an oscilloscope/bench equipment"],
    immediateResumeBuilders: [
      "A real PCB or circuit design project you've built and tested, not just simulated",
      "An embedded firmware project on a real microcontroller",
      "Documented lab bench measurement/debugging experience",
    ],
    networkingTemplate: { roles: "practicing electrical engineers", focusAreas: "the specific sub-field (power, RF, embedded, semiconductor) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn circuit design", "gain hands-on experience"],
    officialPrepResource: "NCEES.org for official FE Exam registration and practice exams",
  },
  "civil-engineer": {
    field: "Civil Engineer",
    gatingExam: "FE Exam",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["AutoCAD Civil 3D", "STAAD/SAP2000", "Revit"],
    immediateResumeBuilders: [
      "A structural or site-design project with real calculations and drawings you can walk through",
      "An AutoCAD Civil 3D model from coursework or an internship",
      "Field or design-firm internship experience, even a short one",
    ],
    networkingTemplate: { roles: "practicing civil engineers", focusAreas: "the specific discipline (structural, transportation, water resources) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn CAD", "gain field experience"],
    officialPrepResource: "NCEES.org for official FE Exam registration and practice exams",
  },
  "chemical-engineer": {
    field: "Chemical Engineer",
    gatingExam: "FE Exam",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["Aspen Plus/HYSYS", "MATLAB", "Excel"],
    immediateResumeBuilders: [
      "A process design or simulation project with real Aspen Plus/HYSYS output you can explain and defend",
      "Hands-on unit-operations or process-safety lab experience",
      "A plant or process-engineering internship in a target sector (energy, pharma, specialty chemicals)",
    ],
    networkingTemplate: { roles: "practicing process/chemical engineers", focusAreas: "the specific industry sector (energy, pharma, specialty chemicals) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn process simulation", "gain plant experience"],
    officialPrepResource: "NCEES.org for official FE Exam registration and practice exams",
  },
  "aerospace-engineer": {
    field: "Aerospace Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["MATLAB/Simulink", "ANSYS", "CATIA/NX"],
    immediateResumeBuilders: [
      "A flight-dynamics, propulsion, or structures project â€” simulation-based is fine if well-documented",
      "A rocketry, satellite, or UAV club build (AIAA chapter, university rocket team)",
      "An internship or research role at an aerospace/defense employer, given how concentrated the hiring pool is",
    ],
    networkingTemplate: { roles: "practicing aerospace engineers", focusAreas: "the specific sub-field (propulsion, structures, avionics, systems) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn aerospace software", "gain technical experience"],
  },
  "biomedical-engineer": {
    field: "Biomedical Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["SolidWorks", "MATLAB", "LabVIEW"],
    immediateResumeBuilders: [
      "A device- or bio-signal-related design project, ideally with some regulatory or clinical framing",
      "Basic familiarity with the FDA regulatory pathway (510(k) vs. PMA), even at a conceptual level",
      "An internship or lab role at a device company, hospital, or research lab",
    ],
    networkingTemplate: { roles: "biomedical engineers and device-industry R&D staff", focusAreas: "the specific device category (diagnostics, prosthetics, implantables) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn medical devices", "gain lab experience"],
  },
  "robotics-engineer": {
    field: "Robotics Engineer",
    gatingExam: "GRE, only if a shortlisted graduate program requires or meaningfully values it",
    gatingExamReadiness: "requires-upperclass-standing",
    gatingExamPolicy: "program-dependent",
    keyTools: ["ROS/ROS2", "Python/C++", "Gazebo or another simulator"],
    immediateResumeBuilders: [
      "A complete robot or robotic subsystem (a real sense-think-act loop), documented with video and a write-up",
      "Real ROS/ROS2 experience deep enough to explain design tradeoffs, not just tutorial familiarity",
      "A robotics competition team build (FRC, VEX, or a university team) for hands-on, team-based credibility",
    ],
    networkingTemplate: { roles: "robotics engineers and researchers", focusAreas: "the specific sub-field (perception, controls, manipulation) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn robotics", "gain hands-on experience"],
    officialPrepResource: "The admissions pages for each shortlisted robotics graduate program first; ETS.org only after confirming the GRE is required or useful",
  },
  "environmental-engineer": {
    field: "Environmental Engineer",
    gatingExam: "FE Exam",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["AutoCAD Civil 3D", "GIS software", "water treatment modeling tools"],
    immediateResumeBuilders: [
      "A water treatment, remediation, or environmental compliance project with real analysis you can walk through",
      "A GIS-based site assessment project",
      "Fieldwork or lab internship experience with an environmental consulting firm or public agency",
    ],
    networkingTemplate: { roles: "practicing environmental engineers", focusAreas: "the specific sub-field (water resources, air quality, remediation) you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn GIS", "gain fieldwork experience"],
    officialPrepResource: "NCEES.org for official FE Exam registration and practice exams",
  },
  "industrial-manufacturing-engineer": {
    field: "Industrial / Manufacturing Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Minitab", "Arena or a similar simulation tool", "ERP systems (SAP)"],
    immediateResumeBuilders: [
      "A documented Lean/Six Sigma or line-optimization project with a clear, defensible before/after metric",
      "A statistical process control analysis on real or realistic production data",
      "A plant, manufacturing, or supply-chain internship",
    ],
    networkingTemplate: { roles: "industrial and operations engineers", focusAreas: "manufacturing, supply chain, or process-improvement specialization" },
    genericPhrasesToAvoid: ["network with engineers", "learn Six Sigma", "gain operations experience"],
    officialPrepResource: "ASQ.org for Six Sigma Green Belt certification details",
  },
  "petroleum-engineer": {
    field: "Petroleum Engineer",
    gatingExam: "FE Exam",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["Petrel", "Eclipse", "PHDwin"],
    immediateResumeBuilders: [
      "A reservoir or drilling design project from coursework or an internship, with real analysis you can defend",
      "Hands-on experience with a reservoir simulation tool (Petrel or Eclipse) beyond what coursework covers",
      "A field or operations internship with a major or independent operator",
    ],
    networkingTemplate: { roles: "practicing petroleum engineers", focusAreas: "drilling, reservoir, or production engineering" },
    genericPhrasesToAvoid: ["network with engineers", "learn reservoir simulation", "gain field experience"],
    officialPrepResource: "NCEES.org for official FE Exam registration and practice exams",
  },

  // ============================ SOFTWARE / TECH ============================
  "software-engineer": {
    field: "Software Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Git/GitHub", "a primary language (Python/Java/JS/C++)", "a cloud platform basics"],
    immediateResumeBuilders: [
      "2-3 shipped, deployed projects that solve a real problem end-to-end, not tutorial clones",
      "Data structures & algorithms fluency for technical interviews",
      "An active, well-documented public GitHub or an open-source contribution",
    ],
    networkingTemplate: { roles: "engineers at companies you're targeting", focusAreas: "the specific team or tech stack you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "build your skills", "learn to code"],
  },
  "backend-engineer": {
    field: "Backend Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["SQL (Postgres/MySQL)", "Docker", "a backend framework"],
    immediateResumeBuilders: [
      "One well-designed backend service with a real database and API you can explain the tradeoffs of",
      "Data structures & algorithms fluency for technical interviews",
      "A project with a genuinely non-trivial data model, not just CRUD",
    ],
    networkingTemplate: { roles: "backend and platform engineers", focusAreas: "distributed systems or infrastructure" },
    genericPhrasesToAvoid: ["network with engineers", "learn backend development", "gain project experience"],
  },
  "frontend-engineer": {
    field: "Frontend Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["React/TypeScript", "a CSS framework", "browser devtools"],
    immediateResumeBuilders: [
      "1-2 polished, deployed applications with real attention to UX detail, not just functionality",
      "Real JavaScript/TypeScript fluency beyond framework syntax",
      "Basic accessibility work in a real project â€” a genuine differentiator few candidates have",
    ],
    networkingTemplate: { roles: "frontend engineers", focusAreas: "the web platform or UI systems work you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn React", "gain frontend experience"],
  },
  "mobile-engineer": {
    field: "Mobile Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Swift or Kotlin", "Xcode or Android Studio", "React Native/Flutter (if cross-platform)"],
    immediateResumeBuilders: [
      "At least one fully functional app, ideally published through the actual App Store/Play Store process",
      "Real native platform knowledge (Swift or Kotlin), not just a cross-platform framework",
      "A project that handles a genuinely tricky mobile problem (offline sync, background tasks)",
    ],
    networkingTemplate: { roles: "mobile engineers", focusAreas: "iOS, Android, or cross-platform development" },
    genericPhrasesToAvoid: ["network with engineers", "learn mobile development", "gain app experienã­ø¶‰ËkºwµçUÁÁ•É±…ÍÌµÍÑ…¹‘¥¹œˆ°4(€€€­•åQ½½±Ìèmt°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰MÕÍÑ…¥¹•Í¡…‘½İ¥¹œ¡½ÕÉÌİ¥Ñ ‰½Ñ „•¹•É…°‘•¹Ñ¥ÍĞ…¹…Ğ±•…ÍĞ½¹”ÍÁ•¥…±¥ÍĞˆ°4(€€€€€€‰MÑÉ½¹œÁÉ•É•ÅÕ¥Í¥Ñ”¡•µ¥ÍÑÉä½‰¥½±½ä½ÕÉÍ•İ½É¬Á•É™½Éµ…¹”ˆ°4(€€€€€€‰¹ä‘•µ½¹ÍÑÉ…Ñ••Ù¥‘•¹”½˜µ…¹Õ…°‘•áÑ•É¥Ñä€¡…ÉĞ°¥¹ÍÑÉÕµ•¹ÑÌ°¡…¹‘Ìµ½¸¡½‰‰¥•Ì¤°İ¡¥ Í½µ”ÁÉ½É…µÌÍÁ•¥™¥…±±äÙ…±Õ”ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰‘•¹Ñ¥ÍÑÌˆ°™½ÕÍÉ•…Ìè€‰•¹•É…°ÁÉ…Ñ¥”½ÈÑ¡”ÍÁ•¥…±Ñäå½ÔÉ”µ½ÍĞ‘É…İ¸Ñ¼ˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰…¥¸±¥¹¥…°•áÁ•É¥•¹”ˆ°€‰Í¡…‘½Ü„‘•¹Ñ¥ÍĞˆ°€‰¹•Ñİ½É¬İ¥Ñ ‘•¹Ñ¥ÍÑÌ‰t°4(€€€½™™¥¥…±AÉ•ÁI•Í½ÕÉ”è€‰¹½Éœ™½È½™™¥¥…°PÉ•¥ÍÑÉ…Ñ¥½¸…¹½¹Ñ•¹Ğ½ÕÑ±¥¹”°…¹ML™½ÈÑ¡”‘•¹Ñ…°Í¡½½°…ÁÁ±¥…Ñ¥½¸Á½ÉÑ…°ˆ°4(€ô°4(4(€€¼¼€ôôôôôôôôôôôôôôôôôôôôôôôôôôôôM%9€¼IMI €ôôôôôôôôôôôôôôôôôôôôôôôôôôôô4(€€‰É•Í•…É µÍ¥•¹Ñ¥ÍĞµÁ¡åÍ¥…°µÍ¥•¹•Ìˆèì(€€€™¥•±è€‰I•Í•…É M¥•¹Ñ¥ÍĞ€¡A¡åÍ¥…°M¥•¹•Ì¤ˆ°4(€€€…Ñ¥¹á…´è€‰I€¡A¡åÍ¥ÌIİ¡•É”É•ÅÕ¥É•¤ˆ°(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰É•ÅÕ¥É•ÌµÕÁÁ•É±…ÍÌµÍÑ…¹‘¥¹œˆ°(€€€…Ñ¥¹á…µA½±¥äè€‰ÁÉ½É…´µ‘•Á•¹‘•¹Ğˆ°(€€€­•åQ½½±Ìèl‰AåÑ¡½¸½5Q1ˆ°€‰ÍÁ•¥…±¥é•Í¥µÕ±…Ñ¥½¸½È•áÁ•É¥µ•¹Ñ…°Í½™Ñİ…É”ˆ°€‰1…Q•`‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰I•…°É•Í•…É µÉ½ÕÀ¥¹Ù½±Ù•µ•¹Ğ…Ì•…É±ä…ÌÁ½ÍÍ¥‰±”°…¥µ¥¹œ™½È¼µ…ÕÑ¡½ÉÍ¡¥À½È„ÍÑÉ½¹œÍ•¹¥½ÈÑ¡•Í¥Ìˆ°4(€€€€€€‰AÉ½É…µµ¥¹œ™±Õ•¹ä€¡AåÑ¡½¸½¬¬¤°Í¥¹”¹•…É±ä•Ù•ÉäÁ¡åÍ¥ÌÍÕˆµ™¥•±¹½ÜÉ•ÅÕ¥É•Ì¥Ğˆ°4(€€€€€€‰U¹‘•ÉÉ…‘Õ…Ñ”É•Í•…É •áÁ•É¥•¹”Ñ¡É½Õ …¸IT½È½¸µ…µÁÕÌ±…ˆ°Ñ¡”™¥•±Ì­•ä•…É±äÍ¥¹…°ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰É•Í•…É¡•ÉÌ…¹A%Ìˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥ŒÉ•Í•…É ÍÕˆµ™¥•±å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ É•Í•…É¡•ÉÌˆ°€‰•Ğ±…ˆ•áÁ•É¥•¹”ˆ°€‰±•…É¸Ñ¡”™¥•±‰t°4(€€€½™™¥¥…±AÉ•ÁI•Í½ÕÉ”è€‰QL¹½Éœ™½ÈI½A¡åÍ¥ÌIÉ•¥ÍÑÉ…Ñ¥½¸°İ¡•É”Ñ¡”ÁÉ½É…µÌå½ÔÉ”Ñ…É•Ñ¥¹œÍÑ¥±°É•ÅÕ¥É”¥Ğˆ°4(€ô°4(€¡•µ¥ÍĞèì4(€€€™¥•±è€‰¡•µ¥ÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰…¹…±åÑ¥…°¥¹ÍÑÉÕµ•¹Ñ…Ñ¥½¸€¡!A1°µ5L°95H¤ˆ°€‰¡•µ¥…°‘…Ñ…‰…Í•Ì€¡M¥¥¹‘•È½I•…áåÌ¤‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰MÕÍÑ…¥¹•É•Í•…É ½È¥¹‘ÕÍÑÉä±…ˆ•áÁ•É¥•¹”İ¥Ñ ÍÁ•¥™¥Œ¥¹ÍÑÉÕµ•¹Ñ…Ñ¥½¸å½ÔÙ”Á•ÉÍ½¹…±±äÕÍ•°¹½Ğ©ÕÍĞ½ÕÉÍ•İ½É¬±…‰Ìˆ°4(€€€€€€‰…É•™Õ°°É•ÁÉ½‘Õ¥‰±”‘½Õµ•¹Ñ…Ñ¥½¸¡…‰¥ÑÌ‘•µ½¹ÍÑÉ…Ñ•Ñ¡É½Õ „±…ˆ¹½Ñ•‰½½¬½ÈİÉ¥Ñ”µÕÀˆ°4(€€€€€€‰±•…È¥¹‘ÕÍÑÉäµÍ•µ•¹Ğ‘¥É•Ñ¥½¸€¡Á¡…Éµ„°µ…Ñ•É¥…±Ì°•¹Ù¥É½¹µ•¹Ñ…°°™½É•¹Í¥Œ¤Ñ¼™½ÕÌå½ÕÈ…ÁÁ±¥…Ñ¥½¹Ìˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰¡•µ¥ÍÑÌ…¹±…ˆÍ¥•¹Ñ¥ÍÑÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥Œ¥¹‘ÕÍÑÉäÍ•µ•¹Ğå½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ Í¥•¹Ñ¥ÍÑÌˆ°€‰…¥¸±…ˆ•áÁ•É¥•¹”ˆ°€‰±•…É¸¡•µ¥ÍÑÉäÑ•¡¹¥ÅÕ•Ì‰t°4(€ô°4(€€‰µ…Ñ•É¥…±ÌµÍ¥•¹Ñ¥ÍĞˆèì4(€€€™¥•±è€‰5…Ñ•É¥…±ÌM¥•¹Ñ¥ÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰M4½Q4ˆ°€‰aIˆ°€‰µ•¡…¹¥…°Ñ•ÍÑ¥¹œ•ÅÕ¥Áµ•¹Ğ‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰I•…°¡…¹‘Ìµ½¸Ñ¥µ”İ¥Ñ ½É”¡…É…Ñ•É¥é…Ñ¥½¸¥¹ÍÑÉÕµ•¹ÑÌ€¡M4°aI¤°¹½Ğ©ÕÍĞÑ¡•½Éäˆ°4(€€€€€€‰™…¥±ÕÉ”µ…¹…±åÍ¥Ì…Í”ÍÑÕ‘äå½Ô…¸•áÁ±…¥¸±•…É±äÍÑ…ÉĞÑ¼™¥¹¥Í °„ÍÁ•¥™¥…±±äÙ…±Õ•Í­¥±°¥¸Ñ¡¥Ì™¥•±ˆ°4(€€€€€€‰I•Í•…É ½È¥¹‘ÕÍÑÉä±…ˆ•áÁ½ÍÕÉ”‰•å½¹½ÕÉÍ•İ½É¬ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰µ…Ñ•É¥…±ÌÍ¥•¹Ñ¥ÍÑÌ…¹•¹¥¹••ÉÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥Œ¥¹‘ÕÍÑÉä€¡Í•µ¥½¹‘ÕÑ½ÉÌ°…•É½ÍÁ…”°•¹•Éä°½¹ÍÕµ•ÈÁÉ½‘ÕÑÌ¤å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ Í¥•¹Ñ¥ÍÑÌˆ°€‰…¥¸±…ˆ•áÁ•É¥•¹”ˆ°€‰±•…É¸µ…Ñ•É¥…±Ì¡…É…Ñ•É¥é…Ñ¥½¸‰t°4(€ô°4(4(€€¼¼€ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô1\€ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô4(€€‰±…İå•Èµ…ÑÑ½É¹•äˆèì4(€€€™¥•±è€‰1…İå•È€¼ÑÑ½É¹•äˆ°4(€€€…Ñ¥¹á…´è€‰1MPˆ°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰É•ÅÕ¥É•ÌµÕÁÁ•É±…ÍÌµÍÑ…¹‘¥¹œˆ°4(€€€­•åQ½½±Ìèl‰]•ÍÑ±…Üˆ°€‰1•á¥Í9•á¥Ì‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰Á½±¥Í¡•±•…°İÉ¥Ñ¥¹œÍ…µÁ±”€¡„µ•µ¼½È‰É¥•˜¤ˆ°4(€€€€€€‰1…ÜµÉ•±…Ñ••áÁ•É¥•¹”€¡Á…É…±•…°İ½É¬°„±•…°¥¹Ñ•É¹Í¡¥À°„±¥¹¥Œ°½Èµ½½Ğ½ÕÉĞ¤ˆ°4(€€€€€€‰•µ½¹ÍÑÉ…Ñ•±•…°É•Í•…É Í­¥±°½¸„É•…°°ÍÁ•¥™¥Œ¥ÍÍÕ”ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰™¥É´…ÍÍ½¥…Ñ•Ì°ÁÕ‰±¥Œ‘•™•¹‘•ÉÌ°½È¥¸µ¡½ÕÍ”½Õ¹Í•°ˆ°™½ÕÍÉ•…Ìè€‰±¥Ñ¥…Ñ¥½¸°½ÉÁ½É…Ñ”°½ÈÁÕ‰±¥Œ¥¹Ñ•É•ÍĞÁÉ…Ñ¥”…É•…Ìˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ±…İå•ÉÌˆ°€‰±•…É¸…‰½ÕĞÑ¡”±•…°™¥•±ˆ°€‰…¥¸±•…°•áÁ•É¥•¹”‰t°4(€€€½™™¥¥…±AÉ•ÁI•Í½ÕÉ”è€‰1M¹½Éœ°Ñ¡”½™™¥¥…°1MPÉ•¥ÍÑÉ…Ñ¥½¸…¹±…ÜÍ¡½½°…ÁÁ±¥…Ñ¥½¸Á½ÉÑ…°°™½ÈÉ•…°‘…Ñ•Ì…¹™É•”½™™¥¥…°ÁÉ•ÀÑ•ÍÑÌˆ°4(€ô°4(€€‰Á…Ñ•¹Ğµ…ÑÑ½É¹•äˆèì4(€€€™¥•±è€‰A…Ñ•¹ĞÑÑ½É¹•äˆ°4(€€€…Ñ¥¹á…´è€‰1MPˆ°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰É•ÅÕ¥É•ÌµÕÁÁ•É±…ÍÌµÍÑ…¹‘¥¹œˆ°4(€€€­•åQ½½±Ìèl‰Ñ¡”UMAQ<A…Ñ•¹ĞÕ±°µQ•áĞ…¹%µ…”…Ñ…‰…Í”ˆ°€‰Á…Ñ•¹Ğ‘½­•Ñ¥¹œÍ½™Ñİ…É”‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰Ñ•¡¹¥…°İÉ¥Ñ¥¹œÍ…µÁ±”€¡„±…¥´…¹…±åÍ¥Ì½Èµ½¬ÁÉ½Í•ÕÑ¥½¸µ•µ¼¤‰Õ¥±Ğ‘¥É•Ñ±ä½¸å½ÕÈMQ4‘•É•”ˆ°4(€€€€€€‰¸%@µÉ•±…Ñ•¥¹Ñ•É¹Í¡¥À½È±•É­Í¡¥À°•Ù•¸½ÕÑÍ¥‘”„‰¥œ™¥É´ˆ°4(€€€€€€‰áÁ±¥¥Ğ™É…µ¥¹œ½˜å½ÕÈÑ•¡¹¥…°Õ¹‘•ÉÉ…‘Õ…Ñ”‘•É•”…ÌÑ¡”É•‘•¹Ñ¥…°Ñ¡…Ğµ…­•ÌÑ¡¥ÌÍÁ•¥…±Ñä…•ÍÍ¥‰±”ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰%@…ÍÍ½¥…Ñ•Ì…¹Á…Ñ•¹Ğ…•¹ÑÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”Ñ•¡¹¥…°ÁÉ…Ñ¥”…É•„€¡Í½™Ñİ…É”°‰¥½Ñ• °µ•¡…¹¥…°°¡•µ¥…°Á…Ñ•¹ÑÌ¤µ…Ñ¡¥¹œå½ÕÈMQ4‰…­É½Õ¹ˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ±…İå•ÉÌˆ°€‰±•…É¸…‰½ÕĞÁ…Ñ•¹Ğ±…Üˆ°€‰…¥¸±•…°•áÁ•É¥•¹”‰t°4(€€€½™™¥¥…±AÉ•ÁI•Í½ÕÉ”è€‰1M¹½Éœ™½È1MP½±…ÜÍ¡½½°…‘µ¥ÍÍ¥½¹Ì°…¹UMAQ<¹½Ø™½ÈÁ…Ñ•¹Ğ‰…È•±¥¥‰¥±¥Ñä…¹É•¥ÍÑÉ…Ñ¥½¸É•ÅÕ¥É•µ•¹ÑÌˆ°4(€ô°4(€€‰½ÉÁ½É…Ñ”µ½Õ¹Í•°ˆèì4(€€€™¥•±è€‰½ÉÁ½É…Ñ”½Õ¹Í•°ˆ°4(€€€…Ñ¥¹á…´è€‰1MPˆ°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰É•ÅÕ¥É•ÌµÕÁÁ•É±…ÍÌµÍÑ…¹‘¥¹œˆ°4(€€€­•åQ½½±Ìèl‰½¹ÑÉ…Ğ±¥™•å±”µ…¹…•µ•¹Ğ€¡14¤Í½™Ñİ…É”ˆ°€‰]•ÍÑ±…Üˆ°€‰1•á¥Í9•á¥Ì‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰½¹ÑÉ…Ğ‘É…™Ñ¥¹œ½È¹•½Ñ¥…Ñ¥½¸İÉ¥Ñ¥¹œÍ…µÁ±”ˆ°4(€€€€€€‰‘•±¥‰•É…Ñ”™½ÕÌ½¸½ÉÁ½É…Ñ”°ÑÉ…¹Í…Ñ¥½¹…°°½È•µÁ±½åµ•¹Ğ±…Ü½ÕÉÍ•İ½É¬…¹¥¹Ñ•É¹Í¡¥ÁÌ°Í¥¹”Ñ¡•Í”ÁÉ…Ñ¥”É½ÕÁÌµ½ÍĞ‘¥É•Ñ±ä™••¥¸µ¡½ÕÍ”É½±•Ìˆ°4(€€€€€€‰•¹Õ¥¹”™±Õ•¹ä¥¸„ÍÁ•¥™¥Œ¥¹‘ÕÍÑÉä€¡Ñ• °¡•…±Ñ¡…É”°™¥¹…¹”¤Ñ¼µ…­”…¸•Ù•¹ÑÕ…°¥¸µ¡½ÕÍ”ÑÉ…¹Í¥Ñ¥½¸Ñ…É•Ñ•ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰¥¸µ¡½ÕÍ”½Õ¹Í•°…¹½ÉÁ½É…Ñ”…ÍÍ½¥…Ñ•Ìˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥Œ¥¹‘ÕÍÑÉäå½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ±…İå•ÉÌˆ°€‰±•…É¸…‰½ÕĞ½ÉÁ½É…Ñ”±…Üˆ°€‰…¥¸±•…°•áÁ•É¥•¹”‰t°4(€€€½™™¥¥…±AÉ•ÁI•Í½ÕÉ”è€‰1M¹½Éœ°Ñ¡”½™™¥¥…°1MPÉ•¥ÍÑÉ…Ñ¥½¸…¹±…ÜÍ¡½½°…ÁÁ±¥…Ñ¥½¸Á½ÉÑ…°ˆ°4(€ô°4(4(€€¼¼€ôôôôôôôôôôôôôôôôôôôôôôôôôô	UM%9ML€˜%99€ôôôôôôôôôôôôôôôôôôôôôôôôôôôô4(€€‰‰ÕÍ¥¹•ÍÌµ…¹…±åÍĞˆèì4(€€€™¥•±è€‰	ÕÍ¥¹•ÍÌ¹…±åÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰á•°ˆ°€‰ME0ˆ°€‰Q…‰±•…Ô½A½İ•È	$‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰½µÁ±•Ñ•‰ÕÍ¥¹•ÍÌ…Í”…¹…±åÍ¥Ì½ÈÁÉ½•ÍÌµ¥µÁÉ½Ù•µ•¹ĞÁÉ½©•Ğİ¥Ñ „±•…È‰•™½É”½…™Ñ•ÈÉ•½µµ•¹‘…Ñ¥½¸ˆ°4(€€€€€€‰ME0™±Õ•¹ä‰•å½¹á•°°Í¥¹”¥ĞÌ¥¹É•…Í¥¹±ä•áÁ•Ñ•ˆ°4(€€€€€€‰¸¥¹Ñ•É¹Í¡¥À¥¸…¹…±åÑ¥Ì°½Á•É…Ñ¥½¹Ì°½È½¹ÍÕ±Ñ¥¹œˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰…¹…±åÍÑÌ°…ÍÍ½¥…Ñ•Ì°½È…±Õµ¹¤…ĞÑ…É•Ğ™¥ÉµÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥ŒÉ½ÕÀ½ÈÁÉ…Ñ¥”€¡‰…¹­¥¹œ°½ÉÁ½É…Ñ”™¥¹…¹”°½¹ÍÕ±Ñ¥¹œ¤å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ‰ÕÍ¥¹•ÍÌÁÉ½™•ÍÍ¥½¹…±Ìˆ°€‰±•…É¸‰ÕÍ¥¹•ÍÌ…¹…±åÍ¥Ìˆ°€‰…¥¸‰ÕÍ¥¹•ÍÌ•áÁ•É¥•¹”‰t°4(€ô°4(€€‰™¥¹…¹¥…°µ…¹…±åÍĞˆèì4(€€€™¥•±è€‰¥¹…¹¥…°¹…±åÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰á•°ˆ°€‰	±½½µ‰•ÉœQ•Éµ¥¹…°ˆ°€‰…Á¥Ñ…°%D‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰Í•±˜µ‰Õ¥±Ğ™¥¹…¹¥…°µ½‘•°½ÈÍÑ½¬Á¥Ñ å½Ô…¸‘•™•¹±¥¹”‰ä±¥¹”ˆ°4(€€€€€€‰…ÍĞ°…ÕÉ…Ñ”°Í¡½ÉÑÕĞµ‘É¥Ù•¸á•°İ½É¬ˆ°4(€€€€€€‰™¥¹…¹”µÍÁ•¥™¥Œ¥¹Ñ•É¹Í¡¥À°¥Ù•¸¡½Ü•…É±äÑ¡¥Ì™¥•±ÌÉ•ÉÕ¥Ñ¥¹œÍÑ…ÉÑÌˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰…¹…±åÍÑÌ…¹…ÍÍ½¥…Ñ•Ìˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥ŒÉ½ÕÀ€¡‰…¹­¥¹œ°½ÉÁ½É…Ñ”™¥¹…¹”°…ÍÍ•Ğµ…¹…•µ•¹Ğ¤å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ™¥¹…¹”ÁÉ½™•ÍÍ¥½¹…±Ìˆ°€‰±•…É¸™¥¹…¹”ˆ°€‰…¥¸‰ÕÍ¥¹•ÍÌ•áÁ•É¥•¹”‰t°4(€ô°4(€€‰µ…¹…•µ•¹Ğµ½¹ÍÕ±Ñ…¹Ğˆèì4(€€€™¥•±è€‰5…¹…•µ•¹Ğ½¹ÍÕ±Ñ…¹Ğˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰á•°ˆ°€‰A½İ•ÉA½¥¹Ğ‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰½¹Í¥ÍÑ•¹Ğ°Á…ÉÑ¹•ÈµÁÉ…Ñ¥•…Í”¥¹Ñ•ÉÙ¥•ÜÉ•ÁÌ½Ù•Èµ½¹Ñ¡Ì°¹½Ğ„±…ÍĞµµ¥¹ÕÑ”É…´ˆ°4(€€€€€€‰…Í”½µÁ•Ñ¥Ñ¥½¸•¹ÑÉä°‰½Ñ •¹Õ¥¹”ÁÉ…Ñ¥”…¹„É•…°É•ÍÕµ”±¥¹”ˆ°4(€€€€€€‰•µ½¹ÍÑÉ…Ñ•±•…‘•ÉÍ¡¥À¥¸„±Õˆ°Ñ•…´°½ÈÁÉ½©•Ğ°¹½Ğ©ÕÍĞ½ÕÉÍ•İ½É¬ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰½¹ÍÕ±Ñ…¹ÑÌ…ĞÑ…É•Ğ™¥ÉµÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥ŒÁÉ…Ñ¥”…É•„å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ½¹ÍÕ±Ñ…¹ÑÌˆ°€‰±•…É¸…Í”¥¹Ñ•ÉÙ¥•İÌˆ°€‰…¥¸‰ÕÍ¥¹•ÍÌ•áÁ•É¥•¹”‰t°4(€ô°4(€€‰¥¹Ù•ÍÑµ•¹Ğµ‰…¹­¥¹œµ…¹…±åÍĞˆèì4(€€€™¥•±è€‰%¹Ù•ÍÑµ•¹Ğ	…¹­¥¹œ¹…±åÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰á•°ˆ°€‰	±½½µ‰•ÉœQ•Éµ¥¹…°ˆ°€‰…Á¥Ñ…°%D½…ÑM•Ğ‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰Í•±˜µ‰Õ¥±Ğ1	<½È4™µ½‘•°å½Ô…¸‘•™•¹±¥¹”‰ä±¥¹”ˆ°4(€€€€€€‰É•ÍÍ¥Ù”°•…É±ä¹•Ñİ½É­¥¹œİ¥Ñ ‰…¹­•ÉÌ°ÍÑ…ÉÑ¥¹œ™É•Í¡µ…¸½Í½Á¡½µ½É”å•…È¥Ù•¸¡½Ü½µÁÉ•ÍÍ•É•ÉÕ¥Ñ¥¹œ¥Ìˆ°4(€€€€€€‰Q•¡¹¥…°¥¹Ñ•ÉÙ¥•Üµ…ÍÑ•Éä½¸…½Õ¹Ñ¥¹œ°Ù…±Õ…Ñ¥½¸°…¹µ½‘•±¥¹œÅÕ•ÍÑ¥½¹Ìˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰‰…¹­•ÉÌ…ĞÑ…É•Ğ™¥ÉµÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥Œ½Ù•É…”É½ÕÀ½ÈÁÉ½‘ÕĞ…É•„å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ‰…¹­•ÉÌˆ°€‰±•…É¸¥¹Ù•ÍÑµ•¹Ğ‰…¹­¥¹œˆ°€‰…¥¸™¥¹…¹”•áÁ•É¥•¹”‰t°4(€ô°4(€€‰ÁÉ½‘ÕĞµµ…¹…•Èˆèì4(€€€™¥•±è€‰AÉ½‘ÕĞ5…¹…•Èˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰)¥É„½1¥¹•…Èˆ°€‰¥µ„€¡™½È‘•Í¥¸½±±…‰½É…Ñ¥½¸¤ˆ°€‰ME0½…¹…±åÑ¥Ì‘…Í¡‰½…É‘Ì‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰É•…°ÁÉ½‘ÕĞ…Í”ÍÑÕ‘äèÑ¡”ÁÉ½‰±•´°ÑÉ…‘•½™™Ì½¹Í¥‘•É•°‘•¥Í¥½¸µ…‘”°…¹€¡¥‘•…±±ä¤Ñ¡”µ•…ÍÕÉ•½ÕÑ½µ”ˆ°4(€€€€€€‰AÉ½‘ÕĞµÍ•¹Í”½…Í”µÍÑå±”¥¹Ñ•ÉÙ¥•ÜÁÉ…Ñ¥”°Ñ¡”İ…äå½ÔÁÉ…Ñ¥”™½È„½¹ÍÕ±Ñ¥¹œ…Í”ˆ°4(€€€€€€‰¹äÉ½±”°•Ù•¸½ÕÑÍ¥‘”„™½Éµ…°A4Ñ¥Ñ±”°İ¡•É”å½Ô…¸Á½¥¹ĞÑ¼‘É¥Ù¥¹œ„É½ÍÌµ™Õ¹Ñ¥½¹…°‘•¥Í¥½¸ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰ÁÉ½‘ÕĞµ…¹…•ÉÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥Œ½µÁ…¹ä½ÈÁÉ½‘ÕĞ…É•„å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ A5Ìˆ°€‰±•…É¸ÁÉ½‘ÕĞµ…¹…•µ•¹Ğˆ°€‰…¥¸ÁÉ½‘ÕĞ•áÁ•É¥•¹”‰t°4(€ô°4(4(€€¼¼€ôôôôôôôôôôôôôôôôôôô!U59%Q%L€¼M=%0M%9L€¼A=1%d€ôôôôôôôôôôôôôôôô4(€€‰Á½±¥äµ…¹…±åÍĞˆèì4(€€€™¥•±è€‰A½±¥ä¹…±åÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰á•°ˆ°€‰ÍÑ…Ñ¥ÍÑ¥…°Í½™Ñİ…É”€¡H½MAML½MÑ…Ñ„¤‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰Á½±¥Í¡•Á½±¥äµ•µ¼½È‰É¥•˜½¸„É•…°¥ÍÍÕ”Ñ¡…ĞÑ…­•Ì„±•…ÈÁ½Í¥Ñ¥½¸…¹ÍÕÁÁ½ÉÑÌ¥Ğİ¥Ñ •Ù¥‘•¹”ˆ°4(€€€€€€‰¸¥¹Ñ•É¹Í¡¥À…Ğ„½Ù•É¹µ•¹Ğ½™™¥”°¹½¹ÁÉ½™¥Ğ°½ÈÑ¡¥¹¬Ñ…¹¬ˆ°4(€€€€€€‰	…Í¥ŒÍÑ…Ñ¥ÍÑ¥…°½‘…Ñ„±¥Ñ•É…ä‘•µ½¹ÍÑÉ…Ñ•…±½¹Í¥‘”ÅÕ…±¥Ñ…Ñ¥Ù”É•Í•…É ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰Á½±¥ä…¹…±åÍÑÌ°ÁÉ½É…´ÍÑ…™˜°½ÈÉ•Í•…É¡•ÉÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥ŒÁ½±¥ä…É•„å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ Á½±¥äÁ•½Á±”ˆ°€‰±•…É¸…‰½ÕĞÁ½±¥äˆ°€‰…¥¸•áÁ•É¥•¹”‰t°4(€ô°4(€€‰©½ÕÉ¹…±¥ÍĞµ½¹Ñ•¹ĞµÍÑÉ…Ñ•¥ÍĞˆèì4(€€€™¥•±è€‰)½ÕÉ¹…±¥ÍĞ€¼½¹Ñ•¹ĞMÑÉ…Ñ•¥ÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰„5L€¡]½É‘AÉ•ÍÌ½ÈÍ¥µ¥±…È¤ˆ°€‰½½±”¹…±åÑ¥Ì½M<Ñ½½±Ìˆ°€‰@MÑå±”‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰Á½ÉÑ™½±¥¼½˜€Ô´àÁÕ‰±¥Í¡•±¥ÁÌ½È½¹Ñ•¹ĞÁ¥••ÌÍ¡½İ¥¹œÉ…¹”…¹Ù½¥”ˆ°4(€€€€€€‰ÍÁ•¥™¥Œ‰•…Ğ½È½¹Ñ•¹ĞÙ•ÉÑ¥…°€¡Ñ• °¡•…±Ñ °ÍÁ½ÉÑÌ°™¥¹…¹”¤¥¹ÍÑ•…½˜•¹•É…±¥ÍĞ¥¹Ñ•É•ÍĞˆ°4(€€€€€€‰	…Í¥ŒM<½½¹Ñ•¹Ğ…¹…±åÑ¥Ì±¥Ñ•É…ä‘•µ½¹ÍÑÉ…Ñ•¥¸„É•…°Á¥•”½È…µÁ…¥¸ˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰É•Á½ÉÑ•ÉÌ°•‘¥Ñ½ÉÌ°½È½¹Ñ•¹ĞÍÑÉ…Ñ•¥ÍÑÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥Œ‰•…Ğ½È½¹Ñ•¹ĞÙ•ÉÑ¥…°å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ©½ÕÉ¹…±¥ÍÑÌˆ°€‰±•…É¸…‰½ÕĞÑ¡”™¥•±ˆ°€‰…¥¸İÉ¥Ñ¥¹œ•áÁ•É¥•¹”‰t°4(€ô°4(€€‰ÁÕ‰±¥ŒµÉ•±…Ñ¥½¹ÌµÍÁ•¥…±¥ÍĞˆèì4(€€€™¥•±è€‰AÕ‰±¥ŒI•±…Ñ¥½¹ÌMÁ•¥…±¥ÍĞˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰¥Í¥½¸½È5Õ¬I…¬ˆ°€‰„Í½¥…°µ•‘¥„Í¡•‘Õ±¥¹œÑ½½°ˆ°€‰½½±”¹…±åÑ¥Ì‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰Á½ÉÑ™½±¥¼½˜ÁÉ•ÍÌÉ•±•…Í•Ì½ÈÁ¥Ñ •µ…¥±Ì°¥‘•…±±äÑ¥•Ñ¼„‘½Õµ•¹Ñ•µ•‘¥„Á±…•µ•¹Ğ½ÈÉ•ÍÕ±Ğˆ°4(€€€€€€‰I•…°µ•‘¥„É•±…Ñ¥½¹Í¡¥Àµ‰Õ¥±‘¥¹œ•áÁ•É¥•¹”°•Ù•¸…Ğ„Íµ…±°™¥É´°¹½¹ÁÉ½™¥Ğ°½ÈÍÑÕ‘•¹Ğ½É…¹¥é…Ñ¥½¸ˆ°4(€€€€€€‰ÁÉ•Á…É•µ½¬É¥Í¥Ìµ½µµÕ¹¥…Ñ¥½¸Í•¹…É¥¼å½Ô…¸İ…±¬Ñ¡É½Õ ¥¸…¸¥¹Ñ•ÉÙ¥•Üˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰AH…¹½µµÕ¹¥…Ñ¥½¹ÌÁÉ½™•ÍÍ¥½¹…±Ìˆ°™½ÕÍÉ•…Ìè€‰…•¹ä½È¥¸µ¡½ÕÍ”İ½É¬¥¸å½ÕÈÑ…É•Ğ¥¹‘ÕÍÑÉäˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ AHÁÉ½™•ÍÍ¥½¹…±Ìˆ°€‰±•…É¸ÁÕ‰±¥ŒÉ•±…Ñ¥½¹Ìˆ°€‰…¥¸½µµÕ¹¥…Ñ¥½¹Ì•áÁ•É¥•¹”‰t°4(€ô°4(€€‰±•…°µ…ÍÍ¥ÍÑ…¹ĞµÁ…É…±•…°ˆèì4(€€€™¥•±è€‰1•…°ÍÍ¥ÍÑ…¹Ğ€¼A…É…±•…°ˆ°4(€€€…Ñ¥¹á…´è¹Õ±°°4(€€€…Ñ¥¹á…µI•…‘¥¹•ÍÌè€‰•±¥¥‰±”µ¹½Üˆ°4(€€€­•åQ½½±Ìèl‰]•ÍÑ±…Üˆ°€‰1•á¥Í9•á¥Ìˆ°€‰…Í”µ…¹…•µ•¹ĞÍ½™Ñİ…É”€¡±¥¼½ÈÍ¥µ¥±…È¤‰t°4(€€€¥µµ•‘¥…Ñ•I•ÍÕµ•	Õ¥±‘•ÉÌèl4(€€€€€€‰¸	µ…ÁÁÉ½Ù•Á…É…±•…°•ÉÑ¥™¥…Ñ”°½ÈÉ•±•Ù…¹Ğ½ÕÉÍ•İ½É¬°½µÁ±•Ñ•…±½¹Í¥‘”½È…™Ñ•Èå½ÕÈ‘•É•”ˆ°4(€€€€€€‰I•…°±…Üµ½™™¥”•áÁ½ÍÕÉ”Ñ¡É½Õ …¸¥¹Ñ•É¹Í¡¥À½ÈÁ…ÉĞµÑ¥µ”É½±”°•Ù•¸…Ğ„Íµ…±°™¥É´ˆ°4(€€€€€€‰•µ½¹ÍÑÉ…Ñ•]•ÍÑ±…Ü½1•á¥Í9•á¥ÌÉ•Í•…É ™±Õ•¹äˆ°4(€€€t°4(€€€¹•Ñİ½É­¥¹Q•µÁ±…Ñ”èìÉ½±•Ìè€‰Á…É…±•…±Ì…¹±•…°…ÍÍ¥ÍÑ…¹ÑÌˆ°™½ÕÍÉ•…Ìè€‰Ñ¡”ÍÁ•¥™¥ŒÁÉ…Ñ¥”…É•„€¡±¥Ñ¥…Ñ¥½¸°½ÉÁ½É…Ñ”°%@¤å½ÔÉ”Ñ…É•Ñ¥¹œˆô°4(€€€•¹•É¥A¡É…Í•ÍQ½Ù½¥èl‰¹•Ñİ½É¬İ¥Ñ ±•…°ÁÉ½™•ÍÍ¥½¹…±Ìˆ°€‰±•…É¸…‰½ÕĞÑ¡”±•…°™¥•±ˆ°€‰…¥¸±•…°•áÁ•É¥•¹”‰t°4(€€€½™™¥¥…±AÉ•ÁI•Í½ÕÉ”è€‰91€¡Ñ¡”9…Ñ¥½¹…°ÍÍ½¥…Ñ¥½¸½˜1•…°ÍÍ¥ÍÑ…¹ÑÌ¤™½ÈÁ…É…±•…°•ÉÑ¥™¥…Ñ¥½¸ÁÉ½É…´¥¹™¼ˆ°4(€ô°4)ôì4(4(¼¨¨I•…µ½¹±ä±½½­ÕÀ‰ä…É••È¥°ÕÍ•½¹±ä™½ÈÑ¡”•á¡…ÕÍÑ¥Ù•¹•ÍÌÑ¡”I•½Éñ…É••É%°…É••ÉA±…å‰½½¬ù€ÑåÁ”…‰½Ù”•¹™½É•Ì…Ğ½µÁ¥±”Ñ¥µ”¸€¨¼4)•áÁ½ÉĞ™Õ¹Ñ¥½¸É•Í½±Ù•A±…å‰½½­½É…É••È¡…É••Èè…É••È¤è…É••ÉA±…å‰½½¬ì4(€€¼¼M…™”è…É••É%¥Ì‘•É¥Ù•‘¥É•Ñ±ä™É½´IIL°…¹•Ù•Éä…É••È½‰©•Ğ4(€€¼¼Á…ÍÍ•¥¸¡•É”½É¥¥¹…Ñ•Ì™É½´Ñ¡…ĞÍ…µ”…ÉÉ…ä°Í¼Ñ¡¥Ì¥¥Ì…±İ…åÌ„4(€€¼¼Ù…±¥­•äƒŠPQåÁ•MÉ¥ÁĞ©ÕÍĞ…¸ĞÍ•”Ñ¡…Ğ„Á±…¥¸ÍÑÉ¥¹€™¥•±½¸4(€€¼¼…É••É€¥Ì¹…ÉÉ½İ•Ñ¼Ñ¡”±¥Ñ•É…°Õ¹¥½¸İ¥Ñ¡½ÕĞÑ¡¥Ì…ÍĞ¸4(€É•ÑÕÉ¸II}A1e	==-Mm…É••È¹¥…Ì…É••É%‘tì4)ô4(4(¼¨¨¥ÍÑ¥¹ĞÁ±…å‰½½­Ì…É½ÍÌ•Ù•ÉäÉ•Í½±Ù•…É••È°½¹”Á•È…É••È€¡¹½ĞÁ•È…Ñ•½Éä¤°¥¸™¥ÉÍĞµÍ••¸½É‘•È¸€¨¼4)•áÁ½ÉĞ™Õ¹Ñ¥½¸É•Í½±Ù•A±…å‰½½­Í½É…É••ÉÌ¡É•Í½±Ù•‘…É••ÉÌèI•Í½±Ù•‘…É••Émt¤è…É••ÉA±…å‰½½­mtì4(€½¹ÍĞÍ••¸€ô¹•ÜM•ĞñÍÑÉ¥¹œø ¤ì4(€½¹ÍĞÉ•ÍÕ±Ğè…É••ÉA±…å‰½½­mt€ômtì4(€™½È€¡½¹ÍĞÉŒ½˜É•Í½±Ù•‘…É••ÉÌ¤ì4(€€€¥˜€ …ÉŒ¹…É••ÈñğÍ••¸¹¡…Ì¡ÉŒ¹…É••È¹¥¤¤½¹Ñ¥¹Õ”ì4(€€€Í••¸¹…‘¡ÉŒ¹…É••È¹¥¤ì4(€€€É•ÍÕ±Ğ¹ÁÕÍ ¡É•Í½±Ù•A±…å‰½½­½É…É••È¡ÉŒ¹…É••È¤¤ì4(€ô4(€É•ÑÕÉ¸É•ÍÕ±Ğì4)ô4(