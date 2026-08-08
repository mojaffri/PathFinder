-- Row Level Security. This is genuine defense-in-depth, not decoration:
-- every policy is FORCE-applied (see below), so it protects data even
-- against our own backend's direct Postgres connection (which in Supabase
-- typically connects as the table-owning role, and Postgres skips RLS for
-- table owners unless FORCE ROW LEVEL SECURITY is set).
--
-- `auth.uid()` resolves from the `request.jwt.claim.sub` session variable —
-- identical to Supabase's own real `auth.uid()` definition. Because our
-- backend talks to Postgres directly via Drizzle (not through Supabase's
-- PostgREST layer, which sets this automatically from the caller's verified
-- JWT), `lib/db/with-user-context.ts` sets this variable itself, inside a
-- transaction, from the SERVER-VERIFIED Supabase session user id before
-- running any query — never from a client-supplied id. See docs/security.md.

-- ---- profiles (root of ownership) ----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY profiles_owner ON profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- tables owned directly by profile_id ----
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'education', 'experience', 'projects', 'awards', 'certifications',
    'career_goals', 'skills', 'resumes', 'career_matches', 'roadmaps',
    'skill_progress', 'applications', 'job_descriptions', 'job_matches',
    'activity_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())) WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))',
      t || '_owner', t
    );
  END LOOP;
END $$;

-- ---- tables owned transitively through another FK ----
ALTER TABLE gap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_items FORCE ROW LEVEL SECURITY;
CREATE POLICY gap_items_owner ON gap_items FOR ALL
  USING (roadmap_id IN (SELECT id FROM roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (roadmap_id IN (SELECT id FROM roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

ALTER TABLE roadmap_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_phases FORCE ROW LEVEL SECURITY;
CREATE POLICY roadmap_phases_owner ON roadmap_phases FOR ALL
  USING (roadmap_id IN (SELECT id FROM roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (roadmap_id IN (SELECT id FROM roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

ALTER TABLE roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY roadmap_tasks_owner ON roadmap_tasks FOR ALL
  USING (phase_id IN (
    SELECT rp.id FROM roadmap_phases rp
    JOIN roadmaps r ON r.id = rp.roadmap_id
    WHERE r.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ))
  WITH CHECK (phase_id IN (
    SELECT rp.id FROM roadmap_phases rp
    JOIN roadmaps r ON r.id = rp.roadmap_id
    WHERE r.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ));

ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY assessment_attempts_owner ON assessment_attempts FOR ALL
  USING (skill_progress_id IN (SELECT id FROM skill_progress WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (skill_progress_id IN (SELECT id FROM skill_progress WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

ALTER TABLE skill_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY skill_evidence_owner ON skill_evidence FOR ALL
  USING (skill_progress_id IN (SELECT id FROM skill_progress WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (skill_progress_id IN (SELECT id FROM skill_progress WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

-- ---- reference tables: world-readable, writes only via a trusted context ----
-- (the seed scripts connect with the same privileged role our backend uses
-- and are not blocked by these SELECT-only policies since nothing here
-- restricts writes at the RLS layer for a role that owns the table without
-- FORCE RLS -- these three are intentionally NOT forced, so the seed
-- scripts/service-role can write without a special bypass path.)
ALTER TABLE careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY careers_read ON careers FOR SELECT USING (true);

ALTER TABLE skill_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_modules_read ON skill_modules FOR SELECT USING (true);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessments_read ON assessments FOR SELECT USING (true);
