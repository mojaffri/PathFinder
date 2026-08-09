# SkillForge assessments and mastery

Each `SkillModule` contains a concept summary, learning objectives, practice exercises, diagnostic, mastery assessment, project/evidence challenge, and six-level mastery requirements. Learning completion and demonstrated mastery are separate signals.

## Question formats and grading

`AssessmentQuestion.kind` supports multiple choice, true/false, code output, structured response, and open response. Legacy questions without a kind are open responses.

- Multiple choice, true/false, and code-output questions use exact, normalized deterministic grading.
- Structured and open responses use the versioned `skillforge-rubric-v2` AI rubric.
- AI output must pass Zod validation and reference only catalog-owned question/concept IDs.
- Dimension scores are accuracy, reasoning, application, and communication.
- Overall score is 35% accuracy, 30% reasoning, 25% application, and 10% communication.
- Passing requires overall >= 70 and both accuracy and reasoning >= 60.

Persisted results include the dimension scores, weak concepts, concise feedback, pass status, rubric version, grading method, provider/model, and retry count. Arbitrary provider prose is never used directly as mastery state.

## Attempts and mastery

Every submission creates a `SkillAttempt`, including failed/unavailable grades. Attempts include assessment ID, attempt number, timestamps, raw responses, and the validated evaluation or `null`. The UI shows attempt history and progress over time.

Mastery is deterministic. Resource/exercise completion contributes only capped introductory credit. The latest three graded attempts are recency weighted; results older than 90 and 180 days decay. Highly inconsistent scores reduce confidence. Projects, evidence quality, and interview self-rating remain separate dimensions. Resume Ready requires knowledge >= 70, ability >= 70, interview >= 70, and evidence >= 45.

Repeated weak performance lowers the current assessment signal and exposes weak concepts to SkillForge's existing diagnosis/next-action logic, allowing roadmap prioritization to react through persisted skill state.
