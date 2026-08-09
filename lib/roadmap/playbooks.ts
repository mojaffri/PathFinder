import { CAREERS } from "../../data/careers";
import type { Career, ReadinessGate, ResolvedCareer } from "../../types";

/**
 * Career-specific expert playbooks, keyed directly to individual careers
 * (not to their broad `CareerCategory`). This is the single source of truth
 * for "what does industry-standard progress actually look like for THIS
 * specific career" — the gating exam and its real readiness timeline, the
 * concrete resume builders and tools that matter right now, and the specific
 * networking phrasing to use instead of "network with X". Both the AI prompt
 * (lib/roadmap/ai-generator.ts) and the deterministic gap analysis
 * (lib/gap-analysis/engine.ts) read from this.
 *
 * This used to be keyed by `CareerCategory`, which broke down once a single
 * category held careers with genuinely different credential paths — e.g. the
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
      "A flight-dynamics, propulsion, or structures project — simulation-based is fine if well-documented",
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
      "Basic accessibility work in a real project — a genuine differentiator few candidates have",
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
    genericPhrasesToAvoid: ["network with engineers", "learn mobile development", "gain app experience"],
  },
  "cloud-devops-engineer": {
    field: "Cloud / DevOps Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Terraform", "Docker/Kubernetes", "a CI/CD platform (GitHub Actions/Jenkins)"],
    immediateResumeBuilders: [
      "A deployed project with a real CI/CD pipeline and infrastructure-as-code setup, not just an app running locally",
      "Hands-on Linux and networking fundamentals demonstrated through a real project",
      "One cloud certification (AWS/GCP/Azure Associate) paired with the hands-on project that actually uses it",
    ],
    networkingTemplate: { roles: "DevOps and site reliability engineers", focusAreas: "the specific cloud platform or reliability practice you're targeting" },
    genericPhrasesToAvoid: ["network with engineers", "learn DevOps", "gain infrastructure experience"],
  },
  "cybersecurity-analyst": {
    field: "Cybersecurity Analyst",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["a SIEM platform (Splunk or similar)", "Wireshark", "Linux CLI"],
    immediateResumeBuilders: [
      "A documented home-lab writeup or CTF participation showing real hands-on security work",
      "Networking and Linux fundamentals demonstrated through a specific exercise, not just coursework",
      "CompTIA Security+ paired with visible hands-on lab work, not as a substitute for it",
    ],
    networkingTemplate: { roles: "security analysts and engineers", focusAreas: "offensive, defensive, or GRC (governance/risk/compliance) work" },
    genericPhrasesToAvoid: ["network with security professionals", "learn cybersecurity", "gain hands-on experience"],
    officialPrepResource: "CompTIA.org for official Security+ exam objectives and registration",
  },

  // ================================ DATA / AI ================================
  "data-analyst": {
    field: "Data Analyst",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["SQL", "Tableau or Power BI", "Excel"],
    immediateResumeBuilders: [
      "1-2 analyses that answer a real business question end-to-end, with a clear write-up, not just charts",
      "Genuinely strong SQL practiced on real, messy datasets, not just tutorials",
      "Basic Python or R, since the field increasingly expects it beyond SQL/Excel alone",
    ],
    networkingTemplate: { roles: "data analysts", focusAreas: "the specific industry you're targeting" },
    genericPhrasesToAvoid: ["network with analysts", "learn SQL", "gain data experience"],
  },
  "data-scientist": {
    field: "Data Scientist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Python (pandas, scikit-learn)", "SQL", "a visualization library"],
    immediateResumeBuilders: [
      "1-2 end-to-end projects: messy real data through cleaning, modeling, to clearly communicated results",
      "Comfort with genuinely messy, real-world data, not just clean competition datasets",
      "The ability to explain a model's assumptions, tradeoffs, and failure modes, not just its accuracy",
    ],
    networkingTemplate: { roles: "data scientists", focusAreas: "the specific modeling or analytics domain you're targeting" },
    genericPhrasesToAvoid: ["network with data scientists", "learn machine learning", "build a model"],
  },
  "machine-learning-engineer": {
    field: "Machine Learning Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["PyTorch/TensorFlow", "Docker", "a cloud ML platform"],
    immediateResumeBuilders: [
      "At least one model deployed as a real, callable service, not just a training notebook",
      "Data structures & algorithms fluency, since it's still commonly tested for this role",
      "MLOps basics (model versioning, monitoring) demonstrated in a real project",
    ],
    networkingTemplate: { roles: "ML engineers", focusAreas: "the specific applied ML domain or MLOps focus you're targeting" },
    genericPhrasesToAvoid: ["network with ML engineers", "learn machine learning", "build a model"],
  },
  "ai-engineer": {
    field: "AI Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["an LLM provider's API/SDK", "a vector database", "LangChain or a similar framework"],
    immediateResumeBuilders: [
      "One real, working AI-powered application (not just an API wrapper demo) that handles edge cases thoughtfully",
      "Evaluation/testing infrastructure for a non-deterministic AI feature — a genuine differentiator",
      "Solid software engineering fundamentals demonstrated alongside the AI-specific work",
    ],
    networkingTemplate: { roles: "AI engineers", focusAreas: "the specific applied AI product area you're targeting" },
    genericPhrasesToAvoid: ["network with AI engineers", "learn prompt engineering", "build an AI app"],
  },
  "data-engineer": {
    field: "Data Engineer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Airflow or dbt", "SQL", "a cloud data warehouse (Snowflake/BigQuery/Redshift)"],
    immediateResumeBuilders: [
      "A real data pipeline project (ingestion through transformation to warehouse) with real-world messiness handled",
      "Genuine familiarity with an orchestration tool (Airflow or dbt), not just ad hoc scripts",
      "Depth in one cloud data warehouse platform",
    ],
    networkingTemplate: { roles: "data engineers", focusAreas: "the specific pipeline or warehouse specialization you're targeting" },
    genericPhrasesToAvoid: ["network with data engineers", "learn data pipelines", "gain data experience"],
  },
  "quantitative-researcher": {
    field: "Quantitative Researcher",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Python (numpy/pandas)", "C++", "statistical/ML libraries"],
    immediateResumeBuilders: [
      "Strong competition-math results (Putnam, IMO-adjacent) or a rigorous quantitative research project/thesis",
      "Probability and quant-brainteaser interview practice, since it's a distinct skill from general technical interviewing",
      "A quant-fund or trading-firm internship, given how compressed and early this field's recruiting is",
    ],
    networkingTemplate: { roles: "quantitative researchers", focusAreas: "the specific strategy class (equities, macro, systematic) you're targeting" },
    genericPhrasesToAvoid: ["network with quants", "learn quantitative finance", "gain research experience"],
  },
  "quantitative-developer": {
    field: "Quantitative Developer",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["C++", "Python", "Linux"],
    immediateResumeBuilders: [
      "A performance-conscious systems or low-latency programming project, a genuine differentiator here",
      "Rigorous data structures & algorithms practice, since the bar at top trading firms often exceeds typical SWE interviews",
      "A trading-firm internship, given how compressed this field's recruiting timeline is",
    ],
    networkingTemplate: { roles: "quantitative developers", focusAreas: "trading-systems engineering or infrastructure" },
    genericPhrasesToAvoid: ["network with quants", "learn C++", "gain trading experience"],
  },

  // ========================= BIOTECH / LIFE SCIENCES =========================
  "biotech-research-scientist": {
    field: "Biotech Research Scientist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["standard wet-lab equipment", "an electronic lab notebook (ELN)", "basic statistical software"],
    immediateResumeBuilders: [
      "Sustained, real lab research experience with a specific molecular biology technique you can speak fluently about",
      "Careful, documented record-keeping habits shown through a lab notebook or research write-up",
      "An early, explicit choice between the technician track and the PhD-driven research track, since they call for different preparation",
    ],
    networkingTemplate: { roles: "researchers and industry scientists", focusAreas: "the specific sub-field (pharma, genomics, diagnostics) you're targeting" },
    genericPhrasesToAvoid: ["network with scientists", "gain lab experience", "learn about the field"],
  },
  "bioinformatics-scientist": {
    field: "Bioinformatics Scientist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Python/R", "a bioinformatics pipeline tool (Nextflow/Snakemake)", "command-line/Linux"],
    immediateResumeBuilders: [
      "A computational analysis project on real (even public) genomics/proteomics data with a clear methods write-up",
      "Genuine dual fluency: a programming language plus real biology domain knowledge, not just one or the other",
      "Comfort with command-line bioinformatics tools, not just high-level libraries",
    ],
    networkingTemplate: { roles: "bioinformatics scientists", focusAreas: "the specific computational biology sub-field you're targeting" },
    genericPhrasesToAvoid: ["network with scientists", "learn bioinformatics", "gain research experience"],
  },

  // ================================ HEALTHCARE ================================
  physician: {
    field: "Physician",
    gatingExam: "MCAT",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: [],
    immediateResumeBuilders: [
      "Sustained (not last-minute) clinical hours through shadowing, scribing, or direct patient-facing volunteer work",
      "Research experience with a faculty mentor, especially if targeting a competitive specialty",
      "Long-term, meaningful community or clinical service rather than a short burst before applications",
    ],
    networkingTemplate: { roles: "physicians and residents", focusAreas: "the specialty you're most drawn to" },
    genericPhrasesToAvoid: ["gain clinical experience", "shadow a doctor", "network with physicians"],
    officialPrepResource: "The AAMC's official MCAT prep resources (AAMC.org) for the real content outline and official practice exams",
  },
  "physician-assistant": {
    field: "Physician Assistant",
    gatingExam: "GRE or another program-specific exam, only where required",
    gatingExamReadiness: "requires-upperclass-standing",
    gatingExamPolicy: "program-dependent",
    keyTools: [],
    immediateResumeBuilders: [
      "Direct, hands-on patient-care hours (EMT, CNA, medical scribe) — the single biggest lever for PA program admission",
      "Strong performance in prerequisite science coursework",
      "Genuine relationships with supervising clinicians who can write specific, detailed letters",
    ],
    networkingTemplate: { roles: "PAs and supervising physicians", focusAreas: "the clinical setting or specialty you're targeting" },
    genericPhrasesToAvoid: ["gain clinical experience", "network with PAs", "learn about the field"],
    officialPrepResource: "CASPA (the Central Application Service for PAs) for program requirements and application timelines",
  },
  "registered-nurse": {
    field: "Registered Nurse",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: [],
    immediateResumeBuilders: [
      "Strong clinical rotation performance during your nursing program, with specific units or patient populations you can speak to",
      "BLS/ACLS certification secured proactively rather than waiting for an employer to require it",
      "A clear sense of which unit or specialty genuinely fits, built through rotations or externships",
    ],
    networkingTemplate: { roles: "nurses and preceptors", focusAreas: "the specific unit or specialty you're targeting" },
    genericPhrasesToAvoid: ["gain clinical experience", "network with nurses", "learn about nursing"],
  },
  pharmacist: {
    field: "Pharmacist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: [],
    immediateResumeBuilders: [
      "Pharmacy technician experience before or during the PharmD program — both useful experience and a genuine test of fit",
      "Strong prerequisite chemistry/biology coursework performance",
      "Early research into whether a retail or hospital/clinical track (and whether a residency) fits your goals",
    ],
    networkingTemplate: { roles: "pharmacists", focusAreas: "retail, hospital/clinical, or industry pharmacy" },
    genericPhrasesToAvoid: ["gain pharmacy experience", "network with pharmacists", "learn about the field"],
    officialPrepResource: "PharmCAS for current PharmD prerequisites, experience expectations, and application timelines; the PCAT was retired in January 2024",
  },
  "physical-therapist": {
    field: "Physical Therapist",
    gatingExam: "GRE (where required)",
    gatingExamReadiness: "requires-upperclass-standing",
    gatingExamPolicy: "program-dependent",
    keyTools: [],
    immediateResumeBuilders: [
      "Observation hours across at least three distinct clinical settings (outpatient ortho, inpatient, and a specialty), the core DPT-application requirement",
      "Strong prerequisite anatomy/physiology coursework performance",
      "Genuine relationships with supervising PTs who can write specific, detailed letters",
    ],
    networkingTemplate: { roles: "physical therapists", focusAreas: "the clinical setting (outpatient, sports, pediatric) you're targeting" },
    genericPhrasesToAvoid: ["gain clinical experience", "network with PTs", "learn about the field"],
    officialPrepResource: "PTCAS (the Physical Therapist Centralized Application Service) for program requirements and timelines",
  },
  dentist: {
    field: "Dentist",
    gatingExam: "DAT",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: [],
    immediateResumeBuilders: [
      "Sustained shadowing hours with both a general dentist and at least one specialist",
      "Strong prerequisite chemistry/biology coursework performance",
      "Any demonstrated evidence of manual dexterity (art, instruments, hands-on hobbies), which some programs specifically value",
    ],
    networkingTemplate: { roles: "dentists", focusAreas: "general practice or the specialty you're most drawn to" },
    genericPhrasesToAvoid: ["gain clinical experience", "shadow a dentist", "network with dentists"],
    officialPrepResource: "ADA.org for official DAT registration and content outline, and AADSAS for the dental school application portal",
  },

  // ============================ SCIENCE / RESEARCH ============================
  "research-scientist-physical-sciences": {
    field: "Research Scientist (Physical Sciences)",
    gatingExam: "GRE (Physics GRE where required)",
    gatingExamReadiness: "requires-upperclass-standing",
    gatingExamPolicy: "program-dependent",
    keyTools: ["Python/MATLAB", "specialized simulation or experimental software", "LaTeX"],
    immediateResumeBuilders: [
      "Real research-group involvement as early as possible, aiming for co-authorship or a strong senior thesis",
      "Programming fluency (Python/C++), since nearly every physics sub-field now requires it",
      "Undergraduate research experience through an REU or on-campus lab, the field's key early signal",
    ],
    networkingTemplate: { roles: "researchers and PIs", focusAreas: "the specific research sub-field you're targeting" },
    genericPhrasesToAvoid: ["network with researchers", "get lab experience", "learn the field"],
    officialPrepResource: "ETS.org for GRE/Physics GRE registration, where the programs you're targeting still require it",
  },
  chemist: {
    field: "Chemist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["analytical instrumentation (HPLC, GC-MS, NMR)", "chemical databases (SciFinder/Reaxys)"],
    immediateResumeBuilders: [
      "Sustained research or industry lab experience with specific instrumentation you've personally used, not just coursework labs",
      "Careful, reproducible documentation habits demonstrated through a lab notebook or write-up",
      "A clear industry-segment direction (pharma, materials, environmental, forensic) to focus your applications",
    ],
    networkingTemplate: { roles: "chemists and lab scientists", focusAreas: "the specific industry segment you're targeting" },
    genericPhrasesToAvoid: ["network with scientists", "gain lab experience", "learn chemistry techniques"],
  },
  "materials-scientist": {
    field: "Materials Scientist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["SEM/TEM", "XRD", "mechanical testing equipment"],
    immediateResumeBuilders: [
      "Real hands-on time with core characterization instruments (SEM, XRD), not just theory",
      "A failure-analysis case study you can explain clearly start to finish, a specifically valued skill in this field",
      "Research or industry lab exposure beyond coursework",
    ],
    networkingTemplate: { roles: "materials scientists and engineers", focusAreas: "the specific industry (semiconductors, aerospace, energy, consumer products) you're targeting" },
    genericPhrasesToAvoid: ["network with scientists", "gain lab experience", "learn materials characterization"],
  },

  // ================================== LAW ===================================
  "lawyer-attorney": {
    field: "Lawyer / Attorney",
    gatingExam: "LSAT",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["Westlaw", "LexisNexis"],
    immediateResumeBuilders: [
      "A polished legal writing sample (a memo or brief)",
      "Law-related experience (paralegal work, a legal internship, a clinic, or moot court)",
      "Demonstrated legal research skill on a real, specific issue",
    ],
    networkingTemplate: { roles: "firm associates, public defenders, or in-house counsel", focusAreas: "litigation, corporate, or public interest practice areas" },
    genericPhrasesToAvoid: ["network with lawyers", "learn about the legal field", "gain legal experience"],
    officialPrepResource: "LSAC.org, the official LSAT registration and law school application portal, for real dates and free official prep tests",
  },
  "patent-attorney": {
    field: "Patent Attorney",
    gatingExam: "LSAT",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["the USPTO Patent Full-Text and Image Database", "patent docketing software"],
    immediateResumeBuilders: [
      "A technical writing sample (a claim analysis or mock prosecution memo) built directly on your STEM degree",
      "An IP-related internship or clerkship, even outside a big firm",
      "Explicit framing of your technical undergraduate degree as the credential that makes this specialty accessible",
    ],
    networkingTemplate: { roles: "IP associates and patent agents", focusAreas: "the technical practice area (software, biotech, mechanical, chemical patents) matching your STEM background" },
    genericPhrasesToAvoid: ["network with lawyers", "learn about patent law", "gain legal experience"],
    officialPrepResource: "LSAC.org for LSAT/law school admissions, and USPTO.gov for patent bar eligibility and registration requirements",
  },
  "corporate-counsel": {
    field: "Corporate Counsel",
    gatingExam: "LSAT",
    gatingExamReadiness: "requires-upperclass-standing",
    keyTools: ["contract lifecycle management (CLM) software", "Westlaw", "LexisNexis"],
    immediateResumeBuilders: [
      "A contract drafting or negotiation writing sample",
      "A deliberate focus on corporate, transactional, or employment law coursework and internships, since these practice groups most directly feed in-house roles",
      "Genuine fluency in a specific industry (tech, healthcare, finance) to make an eventual in-house transition targeted",
    ],
    networkingTemplate: { roles: "in-house counsel and corporate associates", focusAreas: "the specific industry you're targeting" },
    genericPhrasesToAvoid: ["network with lawyers", "learn about corporate law", "gain legal experience"],
    officialPrepResource: "LSAC.org, the official LSAT registration and law school application portal",
  },

  // ========================== BUSINESS & FINANCE ============================
  "business-analyst": {
    field: "Business Analyst",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Excel", "SQL", "Tableau/Power BI"],
    immediateResumeBuilders: [
      "A completed business case analysis or process-improvement project with a clear before/after recommendation",
      "SQL fluency beyond Excel, since it's increasingly expected",
      "An internship in analytics, operations, or consulting",
    ],
    networkingTemplate: { roles: "analysts, associates, or alumni at target firms", focusAreas: "the specific group or practice (banking, corporate finance, consulting) you're targeting" },
    genericPhrasesToAvoid: ["network with business professionals", "learn business analysis", "gain business experience"],
  },
  "financial-analyst": {
    field: "Financial Analyst",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Excel", "Bloomberg Terminal", "Capital IQ"],
    immediateResumeBuilders: [
      "A self-built financial model or stock pitch you can defend line by line",
      "Fast, accurate, shortcut-driven Excel work",
      "A finance-specific internship, given how early this field's recruiting starts",
    ],
    networkingTemplate: { roles: "analysts and associates", focusAreas: "the specific group (banking, corporate finance, asset management) you're targeting" },
    genericPhrasesToAvoid: ["network with finance professionals", "learn finance", "gain business experience"],
  },
  "management-consultant": {
    field: "Management Consultant",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Excel", "PowerPoint"],
    immediateResumeBuilders: [
      "Consistent, partner-practiced case interview reps over months, not a last-minute cram",
      "A case competition entry, both genuine practice and a real resume line",
      "Demonstrated leadership in a club, team, or project, not just coursework",
    ],
    networkingTemplate: { roles: "consultants at target firms", focusAreas: "the specific practice area you're targeting" },
    genericPhrasesToAvoid: ["network with consultants", "learn case interviews", "gain business experience"],
  },
  "investment-banking-analyst": {
    field: "Investment Banking Analyst",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Excel", "Bloomberg Terminal", "Capital IQ/FactSet"],
    immediateResumeBuilders: [
      "A self-built LBO or M&A model you can defend line by line",
      "Aggressive, early networking with bankers, starting freshman/sophomore year given how compressed recruiting is",
      "Technical interview mastery on accounting, valuation, and modeling questions",
    ],
    networkingTemplate: { roles: "bankers at target firms", focusAreas: "the specific coverage group or product area you're targeting" },
    genericPhrasesToAvoid: ["network with bankers", "learn investment banking", "gain finance experience"],
  },
  "product-manager": {
    field: "Product Manager",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Jira/Linear", "Figma (for design collaboration)", "SQL/analytics dashboards"],
    immediateResumeBuilders: [
      "A real product case study: the problem, tradeoffs considered, decision made, and (ideally) the measured outcome",
      "Product-sense/case-style interview practice, the way you'd practice for a consulting case",
      "Any role, even outside a formal PM title, where you can point to driving a cross-functional decision",
    ],
    networkingTemplate: { roles: "product managers", focusAreas: "the specific company or product area you're targeting" },
    genericPhrasesToAvoid: ["network with PMs", "learn product management", "gain product experience"],
  },

  // =================== HUMANITIES / SOCIAL SCIENCES / POLICY ================
  "policy-analyst": {
    field: "Policy Analyst",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Excel", "statistical software (R/SPSS/Stata)"],
    immediateResumeBuilders: [
      "A polished policy memo or brief on a real issue that takes a clear position and supports it with evidence",
      "An internship at a government office, nonprofit, or think tank",
      "Basic statistical/data literacy demonstrated alongside qualitative research",
    ],
    networkingTemplate: { roles: "policy analysts, program staff, or researchers", focusAreas: "the specific policy area you're targeting" },
    genericPhrasesToAvoid: ["network with policy people", "learn about policy", "gain experience"],
  },
  "journalist-content-strategist": {
    field: "Journalist / Content Strategist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["a CMS (WordPress or similar)", "Google Analytics/SEO tools", "AP Style"],
    immediateResumeBuilders: [
      "A portfolio of 5-8 published clips or content pieces showing range and voice",
      "A specific beat or content vertical (tech, health, sports, finance) instead of generalist interest",
      "Basic SEO/content analytics literacy demonstrated in a real piece or campaign",
    ],
    networkingTemplate: { roles: "reporters, editors, or content strategists", focusAreas: "the specific beat or content vertical you're targeting" },
    genericPhrasesToAvoid: ["network with journalists", "learn about the field", "gain writing experience"],
  },
  "public-relations-specialist": {
    field: "Public Relations Specialist",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Cision or Muck Rack", "a social media scheduling tool", "Google Analytics"],
    immediateResumeBuilders: [
      "A portfolio of press releases or pitch emails, ideally tied to a documented media placement or result",
      "Real media relationship-building experience, even at a small firm, nonprofit, or student organization",
      "A prepared mock crisis-communication scenario you can walk through in an interview",
    ],
    networkingTemplate: { roles: "PR and communications professionals", focusAreas: "agency or in-house work in your target industry" },
    genericPhrasesToAvoid: ["network with PR professionals", "learn public relations", "gain communications experience"],
  },
  "legal-assistant-paralegal": {
    field: "Legal Assistant / Paralegal",
    gatingExam: null,
    gatingExamReadiness: "eligible-now",
    keyTools: ["Westlaw", "LexisNexis", "case management software (Clio or similar)"],
    immediateResumeBuilders: [
      "An ABA-approved paralegal certificate, or relevant coursework, completed alongside or after your degree",
      "Real law-office exposure through an internship or part-time role, even at a small firm",
      "Demonstrated Westlaw/LexisNexis research fluency",
    ],
    networkingTemplate: { roles: "paralegals and legal assistants", focusAreas: "the specific practice area (litigation, corporate, IP) you're targeting" },
    genericPhrasesToAvoid: ["network with legal professionals", "learn about the legal field", "gain legal experience"],
    officialPrepResource: "NALA (the National Association of Legal Assistants) for paralegal certification program info",
  },
};

/** Read-only lookup by career id, used only for the exhaustiveness the `Record<CareerId, CareerPlaybook>` type above enforces at compile time. */
export function resolvePlaybookForCareer(career: Career): CareerPlaybook {
  // Safe: CareerId is derived directly from CAREERS, and every Career object
  // passed in here originates from that same array, so this id is always a
  // valid key — TypeScript just can't see that a plain `string` field on
  // `Career` is narrowed to the literal union without this cast.
  return CAREER_PLAYBOOKS[career.id as CareerId];
}

/** Distinct playbooks across every resolved career, one per career (not per category), in first-seen order. */
export function resolvePlaybooksForCareers(resolvedCareers: ResolvedCareer[]): CareerPlaybook[] {
  const seen = new Set<string>();
  const result: CareerPlaybook[] = [];
  for (const rc of resolvedCareers) {
    if (!rc.career || seen.has(rc.career.id)) continue;
    seen.add(rc.career.id);
    result.push(resolvePlaybookForCareer(rc.career));
  }
  return result;
}
