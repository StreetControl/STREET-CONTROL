-- ============================================
-- STEP 4: RLS (Row Level Security) & PERMISSIONS
-- Da eseguire DOPO aver creato le tabelle
-- ============================================

/* ---------------------------
  ENABLE RLS su tutte le tabelle
  (eccetto users che è gestita da Supabase Auth)
---------------------------- */

ALTER TABLE lifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_type_lifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_categories_std ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_categories_std ENABLE ROW LEVEL SECURITY;
ALTER TABLE federations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_federations ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_lifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_in_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_lifts ENABLE ROW LEVEL SECURITY;

/* ---------------------------
  GRANT PERMISSIONS to service_role
  (service_role bypassa RLS e ha accesso completo)
---------------------------- */

-- Tabelle senza SERIAL (solo SELECT)
GRANT ALL ON TABLE lifts TO service_role;
GRANT ALL ON TABLE meet_types TO service_role;
GRANT ALL ON TABLE meet_type_lifts TO service_role;

-- Tabelle con BIGSERIAL
GRANT ALL ON TABLE weight_categories_std TO service_role;
GRANT USAGE, SELECT ON SEQUENCE weight_categories_std_id_seq TO service_role;

GRANT ALL ON TABLE age_categories_std TO service_role;
GRANT USAGE, SELECT ON SEQUENCE age_categories_std_id_seq TO service_role;

-- Tabelle con SERIAL
GRANT ALL ON TABLE federations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE federations_id_seq TO service_role;

GRANT ALL ON TABLE user_federations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_federations_id_seq TO service_role;

GRANT ALL ON TABLE judges TO service_role;
GRANT USAGE, SELECT ON SEQUENCE judges_id_seq TO service_role;

GRANT ALL ON TABLE teams TO service_role;
GRANT USAGE, SELECT ON SEQUENCE teams_id_seq TO service_role;

GRANT ALL ON TABLE athletes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE athletes_id_seq TO service_role;

GRANT ALL ON TABLE meets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE meets_id_seq TO service_role;

GRANT ALL ON TABLE form_info TO service_role;
GRANT USAGE, SELECT ON SEQUENCE form_info_id_seq TO service_role;

GRANT ALL ON TABLE form_lifts TO service_role;

GRANT ALL ON TABLE flights TO service_role;
GRANT USAGE, SELECT ON SEQUENCE flights_id_seq TO service_role;

GRANT ALL ON TABLE groups TO service_role;
GRANT USAGE, SELECT ON SEQUENCE groups_id_seq TO service_role;

GRANT ALL ON TABLE nomination TO service_role;
GRANT USAGE, SELECT ON SEQUENCE nomination_id_seq TO service_role;

GRANT ALL ON TABLE weight_in_info TO service_role;
GRANT USAGE, SELECT ON SEQUENCE weight_in_info_id_seq TO service_role;

GRANT ALL ON TABLE attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE attempts_id_seq TO service_role;

GRANT ALL ON TABLE current_state TO service_role;
GRANT USAGE, SELECT ON SEQUENCE current_state_id_seq TO service_role;

GRANT ALL ON TABLE records TO service_role;
GRANT USAGE, SELECT ON SEQUENCE records_id_seq TO service_role;

GRANT ALL ON TABLE results TO service_role;
GRANT USAGE, SELECT ON SEQUENCE results_id_seq TO service_role;

GRANT ALL ON TABLE result_lifts TO service_role;

/* ---------------------------
  RLS POLICIES for authenticated users
  (Solo SELECT per ora, per sicurezza)
---------------------------- */

-- Policy per lifts (lettura pubblica)
CREATE POLICY "Allow authenticated users to read lifts" ON lifts
    FOR SELECT TO authenticated USING (true);

-- Policy per meet_types (lettura pubblica)
CREATE POLICY "Allow authenticated users to read meet_types" ON meet_types
    FOR SELECT TO authenticated USING (true);

-- Policy per meet_type_lifts (lettura pubblica)
CREATE POLICY "Allow authenticated users to read meet_type_lifts" ON meet_type_lifts
    FOR SELECT TO authenticated USING (true);

-- Policy per weight_categories_std (lettura pubblica)
CREATE POLICY "Allow authenticated users to read weight categories" ON weight_categories_std
    FOR SELECT TO authenticated USING (true);

-- Policy per age_categories_std (lettura pubblica)
CREATE POLICY "Allow authenticated users to read age categories" ON age_categories_std
    FOR SELECT TO authenticated USING (true);

-- Policy per federations (lettura pubblica)
CREATE POLICY "Allow authenticated users to read federations" ON federations
    FOR SELECT TO authenticated USING (true);

-- Policy per teams (lettura pubblica)
CREATE POLICY "Allow authenticated users to read teams" ON teams
    FOR SELECT TO authenticated USING (true);

-- Policy per athletes (lettura pubblica)
CREATE POLICY "Allow authenticated users to read athletes" ON athletes
    FOR SELECT TO authenticated USING (true);

-- Policy per meets (lettura pubblica)
CREATE POLICY "Allow authenticated users to read meets" ON meets
    FOR SELECT TO authenticated USING (true);

-- Policy per form_info (lettura pubblica)
CREATE POLICY "Allow authenticated users to read form_info" ON form_info
    FOR SELECT TO authenticated USING (true);

-- Policy per form_lifts (lettura pubblica)
CREATE POLICY "Allow authenticated users to read form_lifts" ON form_lifts
    FOR SELECT TO authenticated USING (true);

-- Policy per flights (lettura pubblica)
CREATE POLICY "Allow authenticated users to read flights" ON flights
    FOR SELECT TO authenticated USING (true);

-- Policy per groups (lettura pubblica)
CREATE POLICY "Allow authenticated users to read groups" ON groups
    FOR SELECT TO authenticated USING (true);

-- Policy per nomination (lettura pubblica)
CREATE POLICY "Allow authenticated users to read nomination" ON nomination
    FOR SELECT TO authenticated USING (true);

-- Policy per weight_in_info (lettura pubblica)
CREATE POLICY "Allow authenticated users to read weight_in_info" ON weight_in_info
    FOR SELECT TO authenticated USING (true);

-- Policy per attempts (lettura pubblica)
CREATE POLICY "Allow authenticated users to read attempts" ON attempts
    FOR SELECT TO authenticated USING (true);

-- Policy per current_state (lettura pubblica)
CREATE POLICY "Allow authenticated users to read current_state" ON current_state
    FOR SELECT TO authenticated USING (true);

-- Policy per records (lettura pubblica)
CREATE POLICY "Allow authenticated users to read records" ON records
    FOR SELECT TO authenticated USING (true);

-- Policy per results (lettura pubblica)
CREATE POLICY "Allow authenticated users to read results" ON results
    FOR SELECT TO authenticated USING (true);

-- Policy per result_lifts (lettura pubblica)
CREATE POLICY "Allow authenticated users to read result_lifts" ON result_lifts
    FOR SELECT TO authenticated USING (true);

/* ---------------------------
  GRANT SELECT to authenticated role
  (per policy sopra)
---------------------------- */

GRANT SELECT ON TABLE lifts TO authenticated;
GRANT SELECT ON TABLE meet_types TO authenticated;
GRANT SELECT ON TABLE meet_type_lifts TO authenticated;
GRANT SELECT ON TABLE weight_categories_std TO authenticated;
GRANT SELECT ON TABLE age_categories_std TO authenticated;
GRANT SELECT ON TABLE federations TO authenticated;
GRANT SELECT ON TABLE user_federations TO authenticated;
GRANT SELECT ON TABLE judges TO authenticated;
GRANT SELECT ON TABLE teams TO authenticated;
GRANT SELECT ON TABLE athletes TO authenticated;
GRANT SELECT ON TABLE meets TO authenticated;
GRANT SELECT ON TABLE form_info TO authenticated;
GRANT SELECT ON TABLE form_lifts TO authenticated;
GRANT SELECT ON TABLE flights TO authenticated;
GRANT SELECT ON TABLE groups TO authenticated;
GRANT SELECT ON TABLE nomination TO authenticated;
GRANT SELECT ON TABLE weight_in_info TO authenticated;
GRANT SELECT ON TABLE attempts TO authenticated;
GRANT SELECT ON TABLE current_state TO authenticated;
GRANT SELECT ON TABLE records TO authenticated;
GRANT SELECT ON TABLE results TO authenticated;
GRANT SELECT ON TABLE result_lifts TO authenticated;

/* ---------------------------
  VERIFICA FINALE
---------------------------- */

-- Verifica che tutte le sequenze siano configurate correttamente
SELECT 
  schemaname,
  tablename,
  attname AS column_name,
  pg_get_serial_sequence(schemaname||'.'||tablename, attname) AS sequence_name
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE a.attnum > 0
  AND NOT a.attisdropped
  AND a.attname = 'id'
  AND n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY tablename;

-- Verifica RLS attivo
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
