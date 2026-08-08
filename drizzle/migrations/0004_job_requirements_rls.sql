-- RLS for job_requirements, added alongside the Phase 2 job-analysis schema
-- (lib/db/schema/jobs.ts). Owned transitively through job_description_id,
-- same pattern as gap_items/roadmap_phases in 0001_rls_policies.sql.
ALTER TABLE job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requirements FORCE ROW LEVEL SECURITY;
CREATE POLICY job_requirements_owner ON job_requirements FOR ALL
  USING (job_description_id IN (SELECT id FROM job_descriptions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (job_description_id IN (SELECT id FROM job_descriptions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));
