CREATE TABLE api_usage_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  window_key text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_ends_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX api_usage_windows_profile_key ON api_usage_windows(profile_id, window_key);

ALTER TABLE api_usage_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_windows FORCE ROW LEVEL SECURITY;
CREATE POLICY api_usage_windows_owner ON api_usage_windows FOR ALL
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
