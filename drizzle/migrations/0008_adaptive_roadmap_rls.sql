-- RLS for the adaptive roadmap engine (Phase 3), same pattern as
-- 0001_rls_policies.sql: `adaptive_roadmaps` is owned directly by
-- profile_id; everything else is owned transitively through it.
ALTER TABLE adaptive_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_roadmaps FORCE ROW LEVEL SECURITY;
CREATE POLICY adaptive_roadmaps_owner ON adaptive_roadmaps FOR ALL
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

ALTER TABLE adaptive_roadmap_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_roadmap_phases FORCE ROW LEVEL SECURITY;
CREATE POLICY adaptive_roadmap_phases_owner ON adaptive_roadmap_phases FOR ALL
  USING (roadmap_id IN (SELECT id FROM adaptive_roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (roadmap_id IN (SELECT id FROM adaptive_roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

ALTER TABLE adaptive_roadmap_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_roadmap_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY adaptive_roadmap_tasks_owner ON adaptive_roadmap_tasks FOR ALL
  USING (phase_id IN (
    SELECT p.id FROM adaptive_roadmap_phases p
    JOIN adaptive_roadmaps r ON r.id = p.roadmap_id
    WHERE r.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ))
  WITH CHECK (phase_id IN (
    SELECT p.id FROM adaptive_roadmap_phases p
    JOIN adaptive_roadmaps r ON r.id = p.roadmap_id
    WHERE r.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ));

ALTER TABLE adaptive_roadmap_change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_roadmap_change_events FORCE ROW LEVEL SECURITY;
CREATE POLICY adaptive_roadmap_change_events_owner ON adaptive_roadmap_change_events FOR ALL
  USING (roadmap_id IN (SELECT id FROM adaptive_roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (roadmap_id IN (SELECT id FROM adaptive_roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

ALTER TABLE adaptive_roadmap_completed_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_roadmap_completed_history FORCE ROW LEVEL SECURITY;
CREATE POLICY adaptive_roadmap_completed_history_owner ON adaptive_roadmap_completed_history FOR ALL
  USING (roadmap_id IN (SELECT id FROM adaptive_roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
  WITH CHECK (roadmap_id IN (SELECT id FROM adaptive_roadmaps WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));
