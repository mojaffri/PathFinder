import type { SkillModule } from "@/types";

/**
 * A small, realistic V1 catalog â€” not a generic LMS course library. Every
 * entry references real `Career.id`s from `data/careers.ts` (never a second
 * taxonomy) and spans all nine `CareerCategory` values so the architecture
 * is demonstrably career-agnostic, not STEM-only. `relatedGapKeywords`
 * drives `lib/skillforge/roadmap-connection.ts`'s live match against a
 * student's actual generated gap analysis.
 *
 * `concepts` are the units failure diagnosis and prerequisite backtracking
 * (`lib/skillforge/diagnosis.ts`) operate on. `statistics-fundamentals` is a
 * genuinely shared prerequisite of `financial-modeling-fundamentals` and
 * `applied-statistics-messy-data-modeling` â€” a real example of the same
 * underlying skill mattering across otherwise unrelated career paths, and a
 * concrete backtracking case: a weak answer on either module's "reading a
 * result" question can resolve back to a concept that only exists in
 * `statistics-fundamentals`, not the module itself.
 */
export const SKILL_MODULES: SkillModule[] = [
  {
    id: "python-engineering-data-analysis",
    name: "Python for Engineering Data Analysis",
    category: "engineering",
    description: "Clean, analyze, and visualize real process and sensor data in Python â€” the technical-tool gap that shows up across almost every engineering discipline now.",
    targetCareerIds: ["chemical-engineer", "mechanical-engineer", "industrial-manufacturing-engineer", "petroleum-engineer", "environmental-engineer"],
    prerequisites: [],
    priority: "high",
    roadmapPhaseKey: "academic-technical-edge",
    relatedGapKeywords: ["python", "data analysis", "technical tool"],
    whyItMatters: "Engineering roles increasingly expect data fluency alongside domain expertise â€” a real Python analysis project is one of the fastest ways to close that gap.",
    estimatedHours: 20,
    concepts: [
      { id: "data-cleaning-strategy", title: "Data Cleaning Strategy", description: "Deciding how to handle missing values and outliers, and documenting why, instead of silently dropping rows." },
      { id: "vectorized-operations", title: "Vectorized Operations", description: "Using pandas/numpy idioms instead of manual loops for speed and clarity." },
      { id: "result-communication", title: "Result Communication", description: "Presenting a finding so a non-technical engineer or manager can act on it." },
    ],
    learnOverview: {
      explanation: "Most engineering data work is 80% cleaning and framing the problem, 20% actual analysis â€” this module focuses on the judgment calls that make the 80% defensible.",
      objectives: ["Load and inspect a real, messy dataset", "Make and document defensible cleaning decisions", "Produce a finding a non-technical reader can act on"],
      keyConcepts: ["Data Cleaning Strategy", "Vectorized Operations", "Result Communication"],
      examples: ["Flagging sensor readings outside a tolerance band instead of deleting them silently", "Using .groupby() instead of a manual for-loop to summarize batches"],
      commonMistakes: ["Dropping rows with missing data without checking whether the missingness itself is meaningful", "Reporting a number without stating the assumption behind it"],
      estimatedMinutes: 45,
    },
    learningResources: [
      { id: "res-1", title: "Python for Data Analysis fundamentals (pandas/numpy)", type: "course", url: "https://www.kaggle.com/learn/pandas", estimatedMinutes: 240, depth: "core" },
      { id: "res-2", title: "Reading and cleaning messy real-world datasets", type: "article", url: "https://www.kaggle.com/learn/data-cleaning", estimatedMinutes: 45, depth: "core" },
      { id: "res-3", title: "Automate the Boring Stuff with Python (selected chapters)", type: "book", url: "https://automatetheboringstuff.com/", estimatedMinutes: 180, depth: "deeper" },
    ],
    practiceExercises: [
      { id: "ex-1", title: "Clean and summarize a real process or sensor dataset", description: "Take a messy CSV export and produce a clean summary table with real outliers handled, not dropped silently.", difficulty: "core", estimatedMinutes: 90, conceptId: "data-cleaning-strategy" },
      { id: "ex-2", title: "Flag out-of-spec values automatically", description: "Write a script that flags rows outside a defined tolerance band and explains why each was flagged.", difficulty: "stretch", estimatedMinutes: 60, conceptId: "vectorized-operations" },
    ],
    projectChallenges: [
      { id: "proj-1", title: "Build an end-to-end analysis notebook on a real engineering dataset", description: "Pick a real (even public) process, environmental, or manufacturing dataset and produce a documented analysis with a clear finding.", estimatedHours: 8, evidenceOfCompletion: "A GitHub repo with a working notebook, a README, and a clear finding or recommendation", difficulty: "core" },
    ],
    diagnostic: {
      id: "diag-1",
      instructions: "Two quick questions â€” answer honestly based on what you already know, not what you've studied.",
      prompts: [
        { id: "diag-q1", conceptId: "data-cleaning-strategy", prompt: "A sensor dataset has missing readings and impossible negative-pressure values. What is the best first step?", kind: "multiple-choice", options: ["Delete every affected row", "Inspect missingness and flag invalid values before choosing a treatment", "Replace every issue with zero", "Ignore both issues"], correctAnswer: "Inspect missingness and flag invalid values before choosing a treatment" },
        { id: "diag-q2", conceptId: "vectorized-operations", prompt: "What is the best way to calculate a rolling 10-reading average for 50,000 pandas rows?", kind: "multiple-choice", options: ["A Python for-loop", "Series.rolling(10).mean()", "Manually calculate each window", "Convert every row to text first"], correctAnswer: "Series.rolling(10).mean()" },
      ],
    },
    assessment: {
      id: "assess-1",
      type: "artifact-review",
      description: "Complete the core resources and exercises, then submit the project challenge for review.",
      passingCriteria: "Core resources and exercises completed, and the project challenge has a working, documented notebook.",
      questions: [
        { id: "q1", conceptId: "data-cleaning-strategy", prompt: "True or false: dropping every row with a missing value is always the safest cleaning strategy.", kind: "true-false", options: ["True", "False"], correctAnswer: "False" },
        { id: "q2", conceptId: "vectorized-operations", prompt: "Which expression flags pressure values below zero in a pandas DataFrame named df?", kind: "multiple-choice", options: ["df['pressure'] < 0", "df.pressure.delete(-1)", "for df in pressure", "df['pressure'] = 'negative'"], correctAnswer: "df['pressure'] < 0" },
        { id: "q3", conceptId: "result-communication", prompt: "Which result statement is most useful to an engineering manager?", kind: "multiple-choice", options: ["The notebook ran successfully", "The mean was 42", "Line 2's temperature spikes precede 70% of stoppages, so inspect its cooling loop first", "Pandas created a chart"], correctAnswer: "Line 2's temperature spikes precede 70% of stoppages, so inspect its cooling loop first" },
      ],
    },
    interviewRelevance: "Be ready to walk through how you cleaned the data, why you chose your approach, and what you'd change with more time.",
    masteryRequirements: {
      exposure: "Started at least one learning resource.",
      familiar: "Completed the core learning resources.",
      working: "Completed at least one practice exercise.",
      proficient: "Completed all practice exercises and started the project challenge.",
      "interview-ready": "Finished the project challenge and can explain it clearly out loud.",
      "resume-ready": "Project challenge complete with a public repo and at least one piece of reviewed evidence.",
    },
  },
  {
    id: "dsa-technical-interviews",
    name: "Data Structures & Algorithms for Technical Interviews",
    category: "software-tech",
    description: "The core screen for nearly every software interview â€” structured, deliberate practice, not last-minute cramming.",
    targetCareerIds: ["software-engineer", "backend-engineer", "frontend-engineer", "mobile-engineer", "cloud-devops-engineer", "machine-learning-engineer", "ai-engineer", "data-engineer", "quantitative-developer"],
    prerequisites: [],
    priority: "critical",
    roadmapPhaseKey: "execution-interview",
    relatedGapKeywords: ["data structures", "algorithms", "technical interview", "leetcode"],
    whyItMatters: "Data structures & algorithms fluency is the single most consistent screen across software interviews, regardless of the specific role.",
    estimatedHours: 40,
    concepts: [
      { id: "complexity-analysis", title: "Time & Space Complexity Analysis", description: "Reasoning about Big-O for a given approach, and recognizing when it's not good enough." },
      { id: "pattern-recognition", title: "Pattern Recognition", description: "Recognizing which of a small set of patterns (two pointers, sliding window, BFS/DFS, DP) a new problem actually is." },
      { id: "verbal-reasoning", title: "Verbal Reasoning Under Pressure", description: "Talking through your approach out loud, clearly, before and while coding it." },
    ],
    learnOverview: {
      explanation: "Interview problems are drawn from a small set of recurring patterns â€” the skill is recognizing which pattern applies, not memorizing solutions.",
      objectives: ["Estimate time/space complexity for a proposed approach", "Recognize which core pattern a new problem maps to", "Narrate your reasoning clearly under time pressure"],
      keyConcepts: ["Time & Space Complexity Analysis", "Pattern Recognition", "Verbal Reasoning Under Pressure"],
      examples: ["Recognizing a 'find the pair that sums to X' problem as a hash-map pattern, not brute force", "Explaining why an O(n^2) approach won't pass before you've even coded it"],
      commonMistakes: ["Jumping straight to code without stating a plan out loud first", "Memorizing a specific solution instead of the underlying pattern"],
      estimatedMinutes: 30,
    },
    learningResources: [
      { id: "res-1", title: "Core patterns: two pointers, sliding window, BFS/DFS, DP basics", type: "course", url: "https://neetcode.io/roadmap", estimatedMinutes: 300, depth: "core" },
      { id: "res-2", title: "How to talk through a solution out loud, not just code it", type: "article", url: "https://www.techinterviewhandbook.org/coding-interview-techniques/", estimatedMinutes: 20, depth: "core" },
      { id: "res-3", title: "Advanced graph and DP problem patterns", type: "docs", url: "https://cp-algorithms.com/", estimatedMinutes: 150, depth: "deeper" },
    ],
    practiceExercises: [
      { id: "ex-1", title: "Solve 15 problems across 5 core patterns", description: "Spread across arrays/strings, trees/graphs, and dynamic programming â€” breadth before depth.", difficulty: "core", estimatedMinutes: 600, conceptId: "pattern-recognition" },
      { id: "ex-2", title: "Do 2 timed mock interviews with a partner", description: "Practice explaining your reasoning under time pressure, not just arriving at a correct answer.", difficulty: "stretch", estimatedMinutes: 120, conceptId: "verbal-reasoning" },
    ],
    projectChallenges: [
      { id: "proj-1", title: "Keep a solved-problems log with your own notes", description: "For each problem: the pattern you recognized, your first approach, and what you'd do differently next time.", estimatedHours: 6, evidenceOfCompletion: "A written log covering at least 15 problems with your own reasoning notes, not copied solutions", difficulty: "core" },
    ],
    diagnostic: {
      id: "diag-1",
      instructions: "If you've already interviewed or practiced before, this should take under 5 minutes.",
      prompts: [
        { id: "diag-q1", conceptId: "pattern-recognition", prompt: "Given an unsorted array, you need to find if any two numbers sum to a target value. What pattern would you reach for, and what's the time complexity?" },
        { id: "diag-q2", conceptId: "complexity-analysis", prompt: "You have a working O(n^2) solution to a problem with n up to 100,000. Is that good enough? How do you know?" },
      ],
    },
    assessment: {
      id: "assess-1",
      type: "self-rating",
      description: "Rate your own interview readiness after each mock interview.",
      passingCriteria: "Consistently solving core-pattern problems within a reasonable time limit while explaining your approach clearly.",
      questions: [
        { id: "q1", conceptId: "pattern-recognition", prompt: "Describe a problem you solved recently: what pattern did you recognize, and how did you know?" },
        { id: "q2", conceptId: "verbal-reasoning", prompt: "How do you typically structure explaining your approach out loud before writing code?" },
      ],
    },
    interviewRelevance: "This skill IS the interview for most software roles â€” expect 1-2 live coding rounds testing exactly this.",
    masteryRequirements: {
      exposure: "Reviewed the core patterns.",
      familiar: "Solved a handful of problems per pattern.",
      working: "Solved 15+ problems across the core patterns.",
      proficient: "Comfortable explaining your approach out loud while solving.",
      "interview-ready": "Completed at least one timed mock interview with useful feedback.",
      "resume-ready": "Consistent mock-interview performance across multiple patterns and sessions.",
    },
  },
  {
    id: "statistics-fundamentals",
    name: "Statistics Fundamentals for Applied Work",
    category: "data-ai",
    description: "The statistical reasoning underneath every data-driven role â€” reading a distribution, a p-value, or a confidence interval without being fooled by it.",
    targetCareerIds: ["data-scientist", "data-analyst", "quantitative-researcher", "financial-analyst", "investment-banking-analyst", "business-analyst", "bioinformatics-scientist"],
    prerequisites: [],
    priority: "medium",
    roadmapPhaseKey: "academic-technical-edge",
    relatedGapKeywords: ["statistics", "probability", "hypothesis test", "p-value"],
    whyItMatters: "Almost every data-adjacent role assumes this foundation silently â€” it rarely appears as its own line item on a job posting, but it's what separates someone who can explain a result from someone who can only report it.",
    estimatedHours: 12,
    concepts: [
      { id: "descriptive-statistics", title: "Descriptive Statistics", description: "Mean, median, variance, and distribution shape â€” and when a single summary number is misleading." },
      { id: "probability-basics", title: "Probability Ba×M´âÚ$z{-®éÜj×F—FÆS¢$†æFÆ–ærÖ—76–ærFFæB÷WFÆ–W'2&W7öç6–&Ç’"ÂG—S¢&'F–6ÆR"ÂW&Ã¢&‡GG3¢ò÷æF2ç–FFæ÷&röFö72÷W6W%öwV–FRöÖ—76–æuöFFæ‡FÖÂ"ÂW7F–ÖFVDÖ–çWFW3¢3RÂFWFƒ¢&6÷&R"ÒÀÐ¢²–C¢'&W2Ó2"ÂF—FÆS¢$6†ö÷6–ærF†R&–v‡BWfÇVF–öâÖWG&–2f÷"–Ö&Ææ6VBFF"ÂG—S¢&Fö72"ÂW&Ã¢&‡GG3¢ò÷66–¶—BÖÆV&âæ÷&r÷7F&ÆRöÖöGVÆW2öÖöFVÅöWfÇVF–öâæ‡FÖÂ"ÂW7F–ÖFVDÖ–çWFW3¢CRÂFWFƒ¢&FVWW""ÒÀÐ¢ÒÀÐ¢&7F–6TW†W&6—6W3¢°Ð¢²–C¢&W‚Ó"ÂF—FÆS¢$6ÆVâvVçV–æVÇ’ÖW77’V&Æ–2FF6WB"ÂFW67&—F–öã¢$†æFÆRÖ—76–ærfÇVW2Â–æ6öç6—7FVçBf÷&ÖGF–ærÂæB÷WFÆ–W'2v—F‚Fö7VÖVçFVBÂFVfVç6–&ÆR6†ö–6W2â"ÂF–ff–7VÇG“¢&6÷&R"ÂW7F–ÖFVDÖ–çWFW3¢ƒÂ6öæ6WD–C¢&Ö—76–ærÖFFÖ†æFÆ–ær"ÒÀÐ¢²–C¢&W‚Ó""ÂF—FÆS¢$W‡Æ–â–÷W"ÖöFVÂw2f–ÇW&RÖöFW2–âw&—F–ær"ÂFW67&—F–öã¢%v†W&RFöW2—B'&V²ÂæBv‡’(	Bæ÷B§W7B—G267W&7’çVÖ&W"â"ÂF–ff–7VÇG“¢'7G&WF6‚"ÂW7F–ÖFVDÖ–çWFW3¢cÂ6öæ6WD–C¢&ÖöFVÂÖ77V×F–öç2"ÒÀÐ¢ÒÀÐ¢&ö¦V7D6†ÆÆVævW3¢°Ð¢²–C¢'&ö¢Ó"ÂF—FÆS¢$VæB×FòÖVæB&ö¦V7C¢ÖW77’FFFò6ÆV&Ç’6öÖ×Væ–6FVB&W7VÇB"ÂFW67&—F–öã¢%&VÂFFÂ&VÂ6ÆVæ–ærFV6—6–öç2Â&VÂÖöFVÂÂæBw&—FR×Wæöâ×FV6†æ–6Â&VFW"6÷VÆBföÆÆ÷râ"ÂW7F–ÖFVD†÷W'3¢ÂWf–FVæ6Töd6ö×ÆWF–öã¢$æ÷FV&öö²÷"&Wò6÷fW&–ærFF6ÆVæ–ærF‡&÷Vv‚6ÆV&Ç’6öÖ×Væ–6FVBf–æÂ&W7VÇB"ÂF–ff–7VÇG“¢&6÷&R"ÒÀÐ¢ÒÀÐ¢F–væ÷7F–3¢°Ð¢–C¢&F–rÓ"ÀÐ¢–ç7G'V7F–öç3¢%GvòVW7F–öç2Fò6VRv†WF†W"–÷R6†÷VÆB7F'Bv—F‚F†RgVæFÖVçFÇ2÷"6¶—†VBâ"ÀÐ¢&ö×G3¢°Ð¢²–C¢&F–r×"Â6öæ6WD–C¢&6Æ76–f–6F–öâÖÖWG&–72"Â&ö×C¢%–÷W"g&VBÖFWFV7F–öâÖöFVÂ†2“’R67W&7’'WBF†RFF6WB—2“’RæöâÖg&VBâ—2F†BvööBÖöFVÃòv†BÖWG&–2v÷VÆB–÷RÆöö²B–ç7FVCò"ÒÀÐ¢²–C¢&F–r×""Â6öæ6WD–C¢&Ö—76–ærÖFFÖ†æFÆ–ær"Â&ö×C¢#RRöbçVÖW&–26öÇVÖâ—2Ö—76–ærÂæB—Bw2æ÷BÖ—76–ærB&æFöÒâv†Bw2–÷W"ÆâÂæBv‡“ò"ÒÀÐ¢ÒÀÐ¢ÒÀÐ¢76W76ÖVçC¢°Ð¢–C¢&76W72Ó"ÀÐ¢G—S¢&6†V6¶Æ—7B"ÀÐ¢FW67&—F–öã¢$6ö×ÆWFRF†R6÷&R&W6÷W&6W2æBW†W&6—6W2ÂF†Vâ7V&Ö—BF†R&ö¦V7Bf÷"&Wf–Wrâ"ÀÐ¢76–æt7&—FW&–¢%&ö¦V7B†æFÆW2&VÂÖW76–æW72†æ÷B&RÖ6ÆVæVBFF6WB’æB6ÆV&Ç’W‡Æ–ç2F†RÖöFVÂw2Æ–Ö—FF–öç2â"ÀÐ¢VW7F–öç3¢°Ð¢²–C¢'"Â6öæ6WD–C¢&6Æ76–f–6F–öâÖÖWG&–72"Â&ö×C¢$W‡Æ–âF†RF–ffW&Væ6R&WGvVVâ&V6—6–öâæB&V6ÆÂÂæBFW67&–&R&VÂ66Væ&–òv†W&R–÷RvB&–÷&—F—¦RöæR÷fW"F†R÷F†W"â"ÒÀÐ¢²–C¢'""Â6öæ6WD–C¢&ÖöFVÂÖ77V×F–öç2"Â&ö×C¢$æÖRöæR77V×F–öâ–÷W"ÖöFVÂ†÷"ÖöFVÂ–÷Rw&RfÖ–Æ–"v—F‚’FWVæG2öâÂæBv†B†Vç2–b—Bw2f–öÆFVBâ"ÒÀÐ¢°Ð¢–C¢'2"ÀÐ¢6öæ6WD–C¢'&ö&&–Æ—G’Ö&6–72"ÀÐ¢&ö×C¢%–÷W"ÖöFVÂ÷WGWG2w&ö&&–Æ—G’röbg&VBf÷"V6‚G&ç67F–öââv†B†2Fò&RG'VR&÷WBF†BçVÖ&W"f÷"—BFò7GVÆÇ’&V†fRÆ–¶R&ö&&–Æ—G“ò"ÀÐ¢ÒÀÐ¢ÒÀÐ¢ÒÀÐ¢–çFW'f–Wu&VÆWfæ6S¢$&R&VG’FòW‡Æ–â–÷W"ÖöFVÂw277V×F–öç2æBv†W&R—Bv÷VÆB'&V²(	BF†—2—2FW7FVBÖ÷&RF†â&r67W&7’â"ÀÐ¢Ö7FW'•&WV—&VÖVçG3¢°Ð¢W‡÷7W&S¢%&Wf–WvVB7FF—7F–6ÂgVæFÖVçFÇ2â"ÀÐ¢fÖ–Æ–#¢%v÷&¶VBv—F‚&RÖ6ÆVæVBFF6WBâ"ÀÐ¢v÷&¶–æs¢$6ÆVæVBöæRvVçV–æVÇ’ÖW77’FF6WB–æFWVæFVçFÇ’â"ÀÐ¢&öf–6–VçC¢$'V–ÇBÖöFVÂæB6â7FFR—G2¶W’77V×F–öç2â"ÀÐ¢&–çFW'f–Wr×&VG’#¢$6âW‡Æ–âF†RÖöFVÂw2f–ÇW&RÖöFW2Âæ÷B§W7B—G267W&7’â"ÀÐ¢'&W7VÖR×&VG’#¢$gVÆÂVæB×FòÖVæB&ö¦V7B6ö×ÆWFRv—F‚6ÆV"Â&Wf–WvVBw&—FR×Wâ"ÀÐ¢ÒÀÐ¢ÒÀÐ¢°Ð¢–C¢'öÆ–7’ÖÖVÖò×w&—F–ær"ÀÐ¢æÖS¢%öÆ–7’ÖVÖòbW'7V6—fR'&–Vbw&—F–ær"ÀÐ¢6FVv÷'“¢&‡VÖæ—F–W2×6ö6–Â×66–Væ6W2"ÀÐ¢FW67&—F–öã¢%F¶R6ÆV"÷6—F–öâöâ&VÂ—77VRæB7W÷'B—Bv—F‚Wf–FVæ6R(	BF†R6÷&R'F–f7BöÆ–7’Â¦÷W&æÆ—6ÒÂæB"&öÆW2ÆÂWfÇVFR–âF–ffW&VçBf÷&×2â"ÀÐ¢F&vWD6&VW$–G3¢²'öÆ–7’ÖæÇ—7B"Â&¦÷W&æÆ—7BÖ6öçFVçB×7G&FVv—7B"Â'V&Æ–2×&VÆF–öç2×7V6–Æ—7B%ÒÀÐ¢&W&WV—6—FW3¢µÒÀÐ¢&–÷&—G“¢&†–v‚"ÀÐ¢&öFÖ†6T¶W“¢&6FVÖ–2×FV6†æ–6ÂÖVFvR"ÀÐ¢&VÆFVDv¶W—v÷&G3¢²'öÆ–7’ÖVÖò"Â'w&—F–ær6×ÆR"Â&'&–Vb"Â'&W72&VÆV6R%ÒÀÐ¢v‡”—DÖGFW'3¢$öÆ—6†VBÂWf–FVæ6RÖ&6VBÖVÖò÷"'&–Vb–÷R6â6VæBF—&V7FÇ’FòâV×Æ÷–W"—2F†R7G&öævW7B6–ævÆR'F–f7B–âF†—2f–VÆBâ"ÀÐ¢W7F–ÖFVD†÷W'3¢RÀÐ¢6öæ6WG3¢°Ð¢²–C¢&Wf–FVæ6RÖ&6VBÖ&wVÖVçB"ÂF—FÆS¢$Wf–FVæ6RÔ&6VB&wVÖVçB"ÂFW67&—F–öã¢$&6¶–ær÷6—F–öâv—F‚&VÂÂ7V6–f–2Wf–FVæ6R–ç7FVBöb76W'F–öââ"ÒÀÐ¢²–C¢&VF–Væ6RÖ6Æ–'&F–öâ"ÂF—FÆS¢$VF–Væ6R6Æ–'&F–öâ"ÂFW67&—F–öã¢$F§W7F–ærFöæRÂFWF‚ÂæBg&Ö–ærf÷"v†òw27GVÆÇ’vö–ærFò&VBF†—2â"ÒÀÐ¢²–C¢&6öæ6—6–öâ×VæFW"Ö6öç7G&–çB"ÂF—FÆS¢$6öæ6—6–öâVæFW"6öç7G&–çB"ÂFW67&—F–öã¢$Ö¶–ærF†R&wVÖVçBF–v‡BæB6ö×ÆWFRv—F†–â7G&–7BÆVæwF‚÷"v÷&BÆ–Ö—Bâ"ÒÀÐ¢ÒÀÐ¢ÆV&ä÷fW'f–Ws¢°Ð¢W‡ÆæF–öã¢$ÖVÖò÷"'&–Vb—2§VFvVBöâv†WF†W"'W7’Â6¶WF–6Â&VFW"v÷VÆB&R6öçf–æ6VB–âF†RF–ÖRF†W’w&R7GVÆÇ’v–ÆÆ–ærFòv—fR—Bâ"ÀÐ¢ö&¦V7F—fW3¢²%7W÷'B÷6—F–öâv—F‚7V6–f–2Â&VÂWf–FVæ6R"Â$6Æ–'&FRFöæRæBg&Ö–ærFò7V6–f–2VF–Væ6R"Â$Ö¶R6ö×ÆWFR&wVÖVçBv—F†–â7G&–7Bv÷&BÆ–Ö—B%ÒÀÐ¢¶W”6öæ6WG3¢²$Wf–FVæ6RÔ&6VB&wVÖVçB"Â$VF–Væ6R6Æ–'&F–öâ"Â$6öæ6—6–öâVæFW"6öç7G&–çB%ÒÀÐ¢W†×ÆW3¢²$6—F–ær7V6–f–2&öw&ÒÖWfÇVF–öâ7FF—7F–2–ç7FVBöbw7GVF–W26†÷rr"Â$7WGF–ær&w&‚F†B&W7FFW2F†R&ö&ÆVÒ–ç7FVBöbGfæ6–ærF†R&wVÖVçB%ÒÀÐ¢6öÖÖöäÖ—7F¶W3¢²$76W'F–ær÷6—F–öâv—F†÷WB6—F–ær7V6–f–27W÷'F–ærWf–FVæ6R"Â%w&—F–ærF†R6ÖRv’&Vv&FÆW72öbv†òw27GVÆÇ’vö–ærFò&VB—B%ÒÀÐ¢W7F–ÖFVDÖ–çWFW3¢#RÀÐ¢ÒÀÐ¢ÆV&æ–æu&W6÷W&6W3¢°Ð¢²–C¢'&W2Ó"ÂF—FÆS¢%7G'V7GW&–ærW'7V6—fRöÆ–7’ÖVÖò÷"'&–Vb"ÂG—S¢&'F–6ÆR"ÂW&Ã¢&‡GG3¢òöÆ–&wV–FW2çW62æVGR÷w&—F–ævwV–FRö76–væÖVçG2÷öÆ–7–ÖVÖò"ÂW7F–ÖFVDÖ–çWFW3¢#RÂFWFƒ¢&6÷&R"ÒÀÐ¢²–C¢'&W2Ó""ÂF—FÆS¢%W6–ærFFæB&öw&ÒÖWfÇVF–öâWf–FVæ6R–âw&—F–ær"ÂG—S¢&6÷W'6R"ÂW&Ã¢&‡GG3¢ò÷wwræ6÷W'6W&æ÷&röÆV&â÷F†V÷&–W2Ööb×V&Æ–2×öÆ–7’Ó"ÂW7F–ÖFVDÖ–çWFW3¢“ÂFWFƒ¢&6÷&R"ÒÀÐ¢²–C¢'&W2Ó2"ÂF—FÆS¢%w&—F–ærf÷"F–ffW&VçBVF–Væ6W3¢ÆVv—6ÆF÷'2ÂVF—F÷'2ÂæBF†RV&Æ–2"ÂG—S¢&'F–6ÆR"ÂW7F–ÖFVDÖ–çWFW3¢#ÂFWFƒ¢&FVWW""ÒÀÐ¢ÒÀÐ¢&7F–6TW†W&6—6W3¢°Ð¢²–C¢&W‚Ó"ÂF—FÆS¢$÷WFÆ–æR&÷F‚6–FW2öb&VÂÂ6öçFW7FVBöÆ–7’—77VR"ÂFW67&—F–öã¢%VæFW'7FæBF†R7G&öævW7B÷÷6–ær&wVÖVçB&Vf÷&Rw&—F–ær–÷W"÷vâ÷6—F–öââ"ÂF–ff–7VÇG“¢&6÷&R"ÂW7F–ÖFVDÖ–çWFW3¢“Â6öæ6WD–C¢&Wf–FVæ6RÖ&6VBÖ&wVÖVçB"ÒÀÐ¢²–C¢&W‚Ó""ÂF—FÆS¢%w&—FR×vR'&–VbVæFW"7G&–7Bv÷&BÆ–Ö—B"ÂFW67&—F–öã¢%&7F–6RF†RF—66—Æ–æRöbF–v‡BÂWf–FVæ6RÖ&6¶VB&wVÖVçBVæFW"&VÂVF—F÷&–Â6öç7G&–çG2â"ÂF–ff–7VÇG“¢'7G&WF6‚"ÂW7F–ÖFVDÖ–çWFW3¢cÂ6öæ6WD–C¢&6öæ6—6–öâ×VæFW"Ö6öç7G&–çB"ÒÀÐ¢ÒÀÐ¢&ö¦V7D6†ÆÆVævW3¢°Ð¢²–C¢'&ö¢Ó"ÂF—FÆS¢%V&Æ—6‚÷"6VæBöæRöÆ—6†VBÂWf–FVæ6RÖ&6VBÖVÖò÷"'&–Vb"ÂFW67&—F–öã¢$&VÂÂ7V6–f–2—77VRÂ6ÆV"÷6—F–öâÂæB&VÂ7W÷'F–ærWf–FVæ6R(	B6VçBFòâ7GVÂV×Æ÷–W"ÂV&Æ–6F–öâÂ÷"÷&væ—¦F–öââ"ÂW7F–ÖFVD†÷W'3¢‚ÂWf–FVæ6Töd6ö×ÆWF–öã¢$öÆ—6†VBÖVÖòÂ'&–VbÂ÷"—F6‚Â–FVÆÇ’v—F‚Fö7VÖVçFVBÆ6VÖVçB÷"&W7öç6R"ÂF–ff–7VÇG“¢&6÷&R"ÒÀÐ¢ÒÀÐ¢F–væ÷7F–3¢°Ð¢–C¢&F–rÓ"ÀÐ¢–ç7G'V7F–öç3¢$–b–÷RwfRw&—GFVâW'7V6—fR–V6W2&Vf÷&R‡66†ööÂÂ&ÆörÂâ–çFW&ç6†—’ÂF†—26†÷VÆB&RV–6²â"ÀÐ¢&ö×G3¢°Ð¢²–C¢&F–r×"Â6öæ6WD–C¢&Wf–FVæ6RÖ&6VBÖ&wVÖVçB"Â&ö×C¢%F¶Rç’÷6—F–öâöâ&VÂ—77VR–÷R¶æ÷r6öÖWF†–ær&÷WBÂæBv—fRöæR7V6–f–2–V6RöbWf–FVæ6R†æ÷BfwVR6Æ–Ò’F†B7W÷'G2—Bâ"ÒÀÐ¢²–C¢&F–r×""Â6öæ6WD–C¢&VF–Væ6RÖ6Æ–'&F–öâ"Â&ö×C¢$†÷rv÷VÆBF†R6ÖR&wVÖVçB6†ævR–b–÷RvW&Rw&—F–ær—Bf÷"ÆVv—6ÆF÷"g2âvVæW&ÂæWw7W"VF–Væ6Sò"ÒÀÐ¢ÒÀÐ¢ÒÀÐ¢76W76ÖVçC¢°Ð¢–C¢&76W72Ó"ÀÐ¢G—S¢&'F–f7B×&Wf–Wr"ÀÐ¢FW67&—F–öã¢$†fR6öÖVöæR–âF†Rf–VÆB&Wf–Wr–÷W"ÖVÖò÷"'&–Vbf÷"6Æ&—G’æB&wVÖVçB7G&VæwF‚â"ÀÐ¢76–æt7&—FW&–¢$6ÆV"÷6—F–öâÂ&VÂ7W÷'F–ærWf–FVæ6RÂæBF–v‡BÂvVÆÂ×7G'V7GW&VB&wVÖVçBâ"ÀÐ¢VW7F–öç3¢°Ð¢²–C¢'"Â6öæ6WD–C¢&Wf–FVæ6RÖ&6VBÖ&wVÖVçB"Â&ö×C¢%7FFR–÷W"ÖVÖòw2÷6—F–öâæB—G26–ævÆR7G&öævW7B–V6Röb7W÷'F–ærWf–FVæ6Râ"ÒÀÐ¢²–C¢'""Â6öæ6WD–C¢&6öæ6—6–öâ×VæFW"Ö6öç7G&–çB"Â&ö×C¢%v†BF–B–÷R7WBg&öÒ–÷W"G&gBFòf—B7G&–7Bv÷&BÆ–Ö—BÂæBv‡’F–B–÷R6†ö÷6RFò7WBF†B÷fW"6öÖWF†–ærVÇ6Sò"ÒÀÐ¢ÒÀÐ¢ÒÀÐ¢–çFW'f–Wu&VÆWfæ6S¢%F†—2w&—F–ær6×ÆR—26öÖÖöæÇ’&Wf–WvVBF—&V7FÇ’(	B—BgVæ7F–öç22v÷&²×6×ÆR–çFW'f–Wr&÷VæB–âÖ÷7BöbF†W6Rf–VÆG2â"ÀÐ¢Ö7FW'•&WV—&VÖVçG3¢°Ð¢W‡÷7W&S¢%&Wf–WvVBÖVÖòö'&–Vb7G'V7GW&R&6–72â"ÀÐ¢fÖ–Æ–#¢$÷WFÆ–æVBöæR—77VRg&öÒ&÷F‚6–FW2â"ÀÐ¢v÷&¶–æs¢%w&—GFVâgVÆÂf—'7BG&gBâ"ÀÐ¢&öf–6–VçC¢%&Wf—6VBf÷"6Æ&—G’æBWf–FVæ6R7G&VæwF‚â"ÀÐ¢&–çFW'f–Wr×&VG’#¢$6âFVfVæBF†R&wVÖVçBVæFW"VW7F–öæ–ærâ"ÀÐ¢'&W7VÖR×&VG’#¢%öÆ—6†VBÖVÖò÷"'&–Vb&Wf–WvVB'’6öÖVöæR–âF†Rf–VÆBÂ–FVÆÇ’v—F‚&VÂÆ6VÖVçB÷"&W7öç6Râ"ÀÐ¢ÒÀÐ¢ÒÀÐ¢°Ð¢–C¢'&W6V&6‚ÖÆ"×FV6†æ—VRÖFö7VÖVçFF–öâ"ÀÐ¢æÖS¢%&W6V&6‚Æ"FV6†æ—VRbFö7VÖVçFF–öâ"ÀÐ¢6FVv÷'“¢&&–÷FV6‚ÖÆ–fR×66–Væ6W2"ÀÐ¢FW67&—F–öã¢%7W7F–æVBÂvVÆÂÖFö7VÖVçFVB†æG2Ööâ&W6V&6‚W‡W&–Væ6R(	BF†R7G&öævW7B6–væÂ7&÷72&–÷FV6‚Â&–ö–æf÷&ÖF–72ÂæB‡—6–6Â×66–Væ6R&W6V&6‚F‡2â"ÀÐ¢F&vWD6&VW$–G3¢²&&–÷FV6‚×&W6V&6‚×66–VçF—7B"Â&&–ö–æf÷&ÖF–72×66–VçF—7B"Â'&W6V&6‚×66–VçF—7B×‡—6–6Â×66–Væ6W2"Â&6†VÖ—7B"Â&ÖFW&–Ç2×66–VçF—7B"Â&&–öÖVF–6ÂÖVæv–æVW"%ÒÀÐ¢&W&WV—6—FW3¢µÒÀÐ¢&–÷&—G“¢&ÖVF—VÒ"ÀÐ¢&öFÖ†6T¶W“¢&W‡W&–Væ6R×÷'FföÆ–ò"ÀÐ¢&VÆFVDv¶W—v÷&G3¢²'&W6V&6‚"Â&Æ"W‡W&–Væ6R"Â'V&Æ–6F–öâ"Â'F†W6—2%ÒÀÐ¢v‡”—DÖGFW'3¢$6&VgVÂÂFö7VÖVçFVBÆ"FV6†æ—VRæB7W7F–æVB&W6V&6‚–çföÇfVÖVçBÖGFW"Ö÷&R–â†—&–æræBFÖ—76–öç2F†â6÷W'6Wv÷&²ÆöæRâ"ÀÐ¢W7F–ÖFVD†÷W'3¢#ÀÐ¢6öæ6WG3¢°Ð¢²–C¢'&W&öGV6–&ÆRÖFö7VÖVçFF–öâ"ÂF—FÆS¢%&W&öGV6–&ÆRFö7VÖVçFF–öâ"ÂFW67&—F–öã¢$¶VW–ærÆ"æ÷FV&öö²FWF–ÆVBVæ÷Vv‚F†B6öÖVöæRVÇ6R6÷VÆB&WVB–÷W"v÷&²W†7FÇ’â"ÒÀÐ¢²–C¢&Æ—FW&GW&R×7–çF†W6—2"ÂF—FÆS¢$Æ—FW&GW&R7–çF†W6—2"ÂFW67&—F–öã¢%&VF–æræB7VÖÖ&—¦–ær&–Ö'’&W6V&6‚Vff–6–VçFÇ’Væ÷Vv‚Fò†fRvVçV–æRÂ7V6–f–2ö–çBöbf–Wrâ"ÒÀÐ¢²–C¢&÷WG&V6‚×7V6–f–6—G’"ÂF—FÆS¢$÷WG&V6‚7V6–f–6—G’"ÂFW67&—F–öã¢%w&—F–ærFòÆ"÷"’v—F‚7V6–f–2Â–æf÷&ÖVB&V6öâÂæ÷BvVæW&–2&WVW7Bâ"ÒÀÐ¢ÒÀÐ¢ÆV&ä÷fW'f–Ws¢°Ð¢W‡ÆæF–öã¢%F†R7G&öævW7B&W6V&6‚6æF–FFW2&VâwBF—7F–æwV—6†VB'’†÷W'2ÆövvVBÂ'WB'’Fö7VÖVçFF–öâ&–v÷"æB†÷r7V6–f–6ÆÇ’F†W’6âFW67&–&RF†V—"÷vâ6öçG&–'WF–öââ"ÀÐ¢ö&¦V7F—fW3¢²$¶VWÆ"æ÷FV&öö²FWF–ÆVBVæ÷Vv‚Fò&R&W&öGV6–&ÆR"Â%7VÖÖ&—¦R&–Ö'’&W6V&6‚W"67W&FVÇ’æB7V6–f–6ÆÇ’"Â%w&—FRvVçV–æVÇ’–æf÷&ÖVB÷WG&V6‚ÖW76vRFòÆ"÷"’%ÒÀÐ¢¶W”6öæ6WG3¢²%&W&öGV6–&ÆRFö7VÖVçFF–öâ"Â$Æ—FW&GW&R7–çF†W6—2"Â$÷WG&V6‚7V6–f–6—G’%ÒÀÐ¢W†×ÆW3¢²%&V6÷&F–ærW†7B&VvVçB6öæ6VçG&F–öç2æB6öæF—F–öç2Âæ÷B§W7Bw&âF†R7FæF&B&÷Fö6öÂr"Â%&VfW&Væ6–ærÆ"w27V6–f–2&V6VçBW"–ââ÷WG&V6‚VÖ–Â–ç7FVBöbt’vÒ–çFW&W7FVB–â–÷W"&W6V&6‚r%ÒÀÐ¢6öÖÖöäÖ—7F¶W3¢²%w&—F–ærfwVRæ÷FV&öö²VçG&–W2F†BöæÇ’Ö¶R6Vç6RFò–÷RÂF—2ÆFW""Â%6VæF–ærF†R6ÖRvVæW&–2÷WG&V6‚VÖ–ÂFòWfW'’Æ"%ÒÀÐ¢W7F–ÖFVDÖ–çWFW3¢#RÀÐ¢ÒÀÐ¢ÆV&æ–æu&W6÷W&6W3¢°Ð¢²–C¢'&W2Ó"ÂF—FÆS¢$¶VW–ær&–v÷&÷W2Â&W&öGV6–&ÆRÆ"æ÷FV&öö²"ÂG—S¢&'F–6ÆR"ÂW&Ã¢&‡GG3¢ò÷wwrææ–V‡2ææ–‚æv÷b÷6—FW2öFVfVÇBöf–ÆW2ö†VÇF‚ö76WG2öFö75öeöòöwV–FU÷Fõö¶VW–æuöÆ&÷&F÷'•öæ÷FV&öö·5ó#%óS‚çFb"ÂW7F–ÖFVDÖ–çWFW3¢#RÂFWFƒ¢&6÷&R"ÒÀÐ¢²–C¢'&W2Ó""ÂF—FÆS¢%&VF–æræB7VÖÖ&—¦–ær&–Ö'’&W6V&6‚W'2Vff–6–VçFÇ’"ÂG—S¢&6÷W'6R"ÂW7F–ÖFVDÖ–çWFW3¢“ÂFWFƒ¢&6÷&R"ÒÀÐ¢²–C¢'&W2Ó2"ÂF—FÆS¢%w&—F–ærVffV7F—fR÷WG&V6‚VÖ–Ç2Fò&W6V&6‚Æ'2"ÂG—S¢&'F–6ÆR"ÂW7F–ÖFVDÖ–çWFW3¢RÂFWFƒ¢&FVWW""ÒÀÐ¢ÒÀÐ¢&7F–6TW†W&6—6W3¢°Ð¢²–C¢&W‚Ó"ÂF—FÆS¢%7VÖÖ&—¦R2&V6VçBW'2&VÆWfçBFòÆ"–÷Rw&R–çFW&W7FVB–â"ÂFW67&—F–öã¢$Væ÷Vv‚Fò†fRvVçV–æRÂ7V6–f–2&V6öâFò&V6‚÷WB(	Bæ÷B§W7BvVæW&Â–çFW&W7Bâ"ÂF–ff–7VÇG“¢&6÷&R"ÂW7F–ÖFVDÖ–çWFW3¢#Â6öæ6WD–C¢&Æ—FW&GW&R×7–çF†W6—2"ÒÀÐ¢²–C¢&W‚Ó""ÂF—FÆS¢$G&gB7V6–f–2Â–æf÷&ÖVB÷WG&V6‚VÖ–ÂFòÆ"÷"’"ÂFW67&—F–öã¢%&VfW&Væ6RF†V—"7GVÂ&V6VçBv÷&²Âæ÷BvVæW&–2&WVW7Bâ"ÂF–ff–7VÇG“¢'7G&WF6‚"ÂW7F–ÖFVDÖ–çWFW3¢CRÂ6öæ6WD–C¢&÷WG&V6‚×7V6–f–6—G’"ÒÀÐ¢ÒÀÐ¢&ö¦V7D6†ÆÆVævW3¢°Ð¢²–C¢'&ö¢Ó"ÂF—FÆS¢%&öGV6RFö7VÖVçFVB&W6V&6‚6öçG&–'WF–öâ÷"Æ—FW&GW&R&Wf–Wr"ÂFW67&—F–öã¢$&VÂöæ&ö&F–ærFVÆ—fW&&ÆRÂÆ—FW&GW&R&Wf–WrÂ÷"&W6V&6‚6öçG&–'WF–öâg&öÒâ7GVÂÆ"Æ6VÖVçBâ"ÂW7F–ÖFVD†÷W'3¢ÂWf–FVæ6Töd6ö×ÆWF–öã¢$6ö×ÆWFVBÆ—FW&GW&R&Wf–WrÂ÷"7V6–f–26öçG&–'WF–öâ–÷R6âæÖRæBFW67&–&R–ââ–çFW'f–Wr"ÂF–ff–7VÇG“¢&6÷&R"ÒÀÐ¢ÒÀÐ¢F–væ÷7F–3¢°Ð¢–C¢&F–rÓ"ÀÐ¢–ç7G'V7F–öç3¢$–b–÷RwfRÇ&VG’v÷&¶VB–âÆ"ÂF†—26†÷VÆB&Rf7Bâ"ÀÐ¢&ö×G3¢°Ð¢²–C¢&F–r×"Â6öæ6WD–C¢'&W&öGV6–&ÆRÖFö7VÖVçFF–öâ"Â&ö×C¢%v†Bw2F†RF–ffW&Væ6R&WGvVVâw&âF†R7FæF&B&÷Fö6öÂræBvVçV–æVÇ’&W&öGV6–&ÆRæ÷FV&öö²VçG'“òv—fR6öæ7&WFRW†×ÆRâ"ÒÀÐ¢²–C¢&F–r×""Â6öæ6WD–C¢&÷WG&V6‚×7V6–f–6—G’"Â&ö×C¢$G&gBöæR6VçFVæ6R–÷RvB7GVÆÇ’6VæBFò7V6–f–2Æ"W‡Æ–æ–ærv‡’–÷RvçBFò¦ö–âÂ&VfW&Væ6–ær6öÖWF†–ær&VÂ&÷WBF†V—"v÷&²â"ÒÀÐ¢ÒÀÐ¢ÒÀÐ¢76W76ÖVçC¢°Ð¢–C¢&76W72Ó"ÀÐ¢G—S¢&6†V6¶Æ—7B"ÀÐ¢FW67&—F–öã¢$6ö×ÆWFRF†R÷WG&V6‚æBFö7VÖVçFF–öâW†W&6—6W2ÂF†Vâ7V&Ö—BF†R&W6V&6‚FVÆ—fW&&ÆRf÷"&Wf–Wrâ"ÀÐ¢76–æt7&—FW&–¢$vVçV–æRÆ"–çföÇfVÖVçBv—F‚Fö7VÖVçFVBÂ7V6–f–2FVÆ—fW&&ÆRÂæ÷B§W7Bö'6W'fF–öââ"ÀÐ¢VW7F–öç3¢°Ð¢²–C¢'"Â6öæ6WD–C¢&Æ—FW&GW&R×7–çF†W6—2"Â&ö×C¢%7VÖÖ&—¦R&VÂW"&VÆWfçBFò–÷W"F&vWBÆ"÷"f–VÆB–â"Ó26VçFVæ6W2Â–æ6ÇVF–ær—G2Ö–âf–æF–æræBöæRÆ–Ö—FF–öââ"ÒÀÐ¢²–C¢'""Â6öæ6WD–C¢'&W&öGV6–&ÆRÖFö7VÖVçFF–öâ"Â&ö×C¢$FW67&–&RöæR7V6–f–2FV6†æ—VR–÷RwfRFö7VÖVçFVB†÷"v÷VÆBFö7VÖVçB’Â–æ6ÇVF–ærVæ÷Vv‚FWF–ÂF†B6öÖVöæRVÇ6R6÷VÆB&WVB—Bâ"ÒÀÐ¢ÒÀÐ¢ÒÀÐ¢–çFW'f–Wu&VÆWfæ6S¢$&R&VG’FòFW67&–&R7V6–f–2FV6†æ—VR–÷RW'6öæÆÇ’W&f÷&ÖVBæB7V6–f–26öçG&–'WF–öâ–÷RÖFRÂæ÷BvVæW&ÂÆ"W‡÷7W&Râ"ÀÐ¢Ö7FW'•&WV—&VÖVçG3¢°Ð¢W‡÷7W&S¢%&Wf–WvVBÆ"Fö7VÖVçFF–öâgVæFÖVçFÇ2â"ÀÐ¢fÖ–Æ–#¢%7VÖÖ&—¦VBW'2g&öÒÆ'2öb–çFW&W7Bâ"ÀÐ¢v÷&¶–æs¢%6VçB–æf÷&ÖVB÷WG&V6‚æB6V7W&VB6öçfW'6F–öâ÷"Æ6VÖVçBâ"ÀÐ¢&öf–6–VçC¢$7F—fVÇ’6öçG&–'WF–ærFò&VÂ&W6V&6‚&ö¦V7Bâ"ÀÐ¢&–çFW'f–Wr×&VG’#¢$6âFW67&–&R7V6–f–2FV6†æ—VRæB6öçG&–'WF–öâ–âFWF–Ââ"ÀÐ¢'&W7VÖR×&VG’#¢$Fö7VÖVçFVB&W6V&6‚FVÆ—fW&&ÆR6ö×ÆWFVBæB&Wf–WvVBâ"ÀÐ¢ÒÀÐ¢ÒÀÐ¥Ó°Ð 