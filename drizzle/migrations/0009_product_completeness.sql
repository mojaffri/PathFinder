-- Phase 4 product-completeness storage. Applications remain intentionally
-- compact: the saved posting and fit/gap snapshot are enough for a useful
-- pipeline without introducing CRM-style contacts, messages, or workflows.
ALTER TABLE applications DROP CONSTRAINT applications_status_check;
-- Preserve the meaning of existing Phase-1 rows before adding the new check.
UPDATE applications SET status = 'interview' WHERE status = 'interviewing';
ALTER TABLE applications
  ADD COLUMN job_description_text text,
  ADD COLUMN source_url text,
  ADD COLUMN fit_score integer,
  ADD COLUMN interview_dates text[] NOT NULL DEFAULT '{}',
  ADD COLUMN gaps_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check CHECK (status IN (
    'saved', 'preparing', 'applied', 'phone_screen', 'interview',
    'final_round', 'rejected', 'offer', 'withdrawn'
  )),
  ADD CONSTRAINT applications_fit_score_check CHECK (fit_score IS NULL OR fit_score BETWEEN 0 AND 100);

CREATE INDEX applications_profile_status_idx ON applications(profile_id, status);
CREATE INDEX applications_profile_updated_idx ON applications(profile_id, updated_at DESC);
CREATE INDEX activity_events_profile_created_idx ON activity_events(profile_id, created_at DESC);
CREATE INDEX activity_events_profile_type_idx ON activity_events(profile_id, event_type);
CREATE INDEX job_descriptions_profile_created_idx ON job_descriptions(profile_id, created_at DESC);
CREATE INDEX job_requirements_job_category_idx ON job_requirements(job_description_id, category);
CREATE INDEX job_matches_job_created_idx ON job_matches(job_description_id, created_at DESC);
