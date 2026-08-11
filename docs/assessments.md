# SkillForge assessments and mastery

Each `SkillModule` contains a concept summary, learning objectives, practice exercises, diagnostic, mastery assessment, project/evidence challenge, and six-level mastery requirements. Learning completion and demonstrated mastery are separate signals.

## Question formats and grading

`AssessmentQuestion.kind` supports multiple choice, true/false, code output, structured response, and open response. Legacy questions without a kind are open responses.

- Every question in the current catalog is multiple choice or true/false and uses normalized deterministic grading. This keeps both the placement check and final assessment available when the AI provider is unavailable and removes exact-phrase grading from the student experience.
- The UI renders these as keyboard-accessible radio groups, requires every item before submission, and never asks the student to type an option into a free-response box.
- The schema still supports future structured/open responses. Those use the versioned `skillforge-rubric-v2` AI rubric, which explicitly judges semantic meaning rather than exact wording and accepts valid paraphrases, synonyms, and examples.
- AI output must pass Zod validation and reference only catalog-owned question/concept IDs.
- Dimension scores are accuracy, reasoning, application, and communication.
- Overall score is 35% accuracy, 30% reasoning, 25% application, and 10% communication.
- Passing requires overall >= 70 and both accuracy and reasoning >= 60.

Persisted results include the dimension scores, weak concepts, concise feedback, pass status, rubric version, grading method, provider/model, and retry count. Arbitrary provider prose is never used directly as mastery state.

## Attempts and mastery

Every successful submission creates a `SkillAttempt` with assessment ID, attempt number, timestamps, raw responses, and the validated evaluation. The UI shows attempt history and progress over time. A network or persistence failure remains on the form with an actionable retry message instead of claiming the attempt was saved.

Mastery is deterministic. Resource/exercise completion contributes only capped introductory credit. The latest three graded attempts are recency weighted; results older than 90 and 180 days decay. Highly inconsistent scores reduce confidence. Projects, evidence quality, and interview self-rating remain separate dimensions. Resume Ready requires knowledge >= 70, ability >= 70, interview >= 70, and evidence >= 45.

Repeated weak performance lowers the current assessment signal and exposes weak concepts to SkillForge's existing diagnosis/next-action logic, allowing roadmap prioritization to react through persisted skill state.
