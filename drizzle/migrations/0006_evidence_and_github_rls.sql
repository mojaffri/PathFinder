-- RLS for this phase's new tables (evidence-backed skills + GitHub
-- integration), same profile_id-owned pattern as 0001_rls_policies.sql.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'github_connections', 'github_repos', 'skill_evidence_records'
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
