-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- Esegui questo script su Supabase dopo init_remote_schema.sql
-- ============================================

-- ============================================
-- USERS TABLE - RLS
-- ============================================

-- 1. Abilita RLS sulla tabella users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Gli utenti possono leggere solo i propri dati
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.uid() = auth_uid);

-- 3. Policy: Solo SERVICE_ROLE può inserire nuovi utenti
-- (Necessario per script creazione federazioni)
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 4. Policy: Gli utenti possono aggiornare i propri dati
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = auth_uid)
  WITH CHECK (auth.uid() = auth_uid);

-- 5. Policy: Solo SERVICE_ROLE può eliminare utenti
CREATE POLICY "Service role can delete users" ON users
  FOR DELETE
  USING (auth.role() = 'service_role');


-- ============================================
-- JUDGES TABLE - RLS
-- ============================================

ALTER TABLE judges ENABLE ROW LEVEL SECURITY;

-- Giudici possono leggere solo i propri dati
CREATE POLICY "Judges can read own data" ON judges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = judges.user_id
      AND users.auth_uid = auth.uid()
    )
  );

-- Solo admin e service role possono gestire giudici
CREATE POLICY "Admins can manage judges" ON judges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'ADMIN')
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- MEETS TABLE - RLS
-- ============================================

ALTER TABLE meets ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere le gare (per schermi pubblici)
CREATE POLICY "Anyone can read meets" ON meets
  FOR SELECT
  USING (true);

-- Solo la federazione proprietaria può creare/modificare le proprie gare
CREATE POLICY "Federations can manage own meets" ON meets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = meets.federation_id
      AND users.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- ATHLETES TABLE - RLS
-- ============================================

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere atleti (necessario per classifiche pubbliche)
CREATE POLICY "Anyone can read athletes" ON athletes
  FOR SELECT
  USING (true);

-- Solo utenti autenticati possono inserire/modificare atleti
CREATE POLICY "Authenticated can manage athletes" ON athletes
  FOR ALL
  USING (auth.uid() IS NOT NULL);


-- ============================================
-- FORM_INFO TABLE - RLS
-- ============================================

ALTER TABLE form_info ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere registrazioni (necessario per classifiche)
CREATE POLICY "Anyone can read form_info" ON form_info
  FOR SELECT
  USING (true);

-- Solo federazione proprietaria della gara può gestire registrazioni
CREATE POLICY "Federation can manage registrations" ON form_info
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meets
      JOIN users ON users.id = meets.federation_id
      WHERE meets.id = form_info.meet_id
      AND users.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- ATTEMPTS TABLE - RLS
-- ============================================

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere tentativi (necessario per classifiche e giudici)
CREATE POLICY "Anyone can read attempts" ON attempts
  FOR SELECT
  USING (true);

-- Solo regista e giudici possono aggiornare tentativi
CREATE POLICY "Director and judges can update attempts" ON attempts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('DIRECTOR', 'REFEREE', 'SUPER_ADMIN', 'ADMIN')
    )
    OR auth.role() = 'service_role'
  );

-- Solo federazione proprietaria può inserire tentativi
CREATE POLICY "Federation can insert attempts" ON attempts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weight_in_info wi
      JOIN nomination n ON n.id = wi.nomination_id
      JOIN form_info fi ON fi.id = n.form_id
      JOIN meets m ON m.id = fi.meet_id
      JOIN users u ON u.id = m.federation_id
      WHERE wi.id = attempts.weight_in_info_id
      AND u.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- CURRENT_STATE TABLE - RLS
-- ============================================

ALTER TABLE current_state ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere stato corrente (necessario per schermi)
CREATE POLICY "Anyone can read current_state" ON current_state
  FOR SELECT
  USING (true);

-- Solo regista può aggiornare stato corrente
CREATE POLICY "Director can update current_state" ON current_state
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('DIRECTOR', 'SUPER_ADMIN', 'ADMIN')
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- TEAMS TABLE - RLS
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere squadre
CREATE POLICY "Anyone can read teams" ON teams
  FOR SELECT
  USING (true);

-- Solo utenti autenticati possono gestire squadre
CREATE POLICY "Authenticated can manage teams" ON teams
  FOR ALL
  USING (auth.uid() IS NOT NULL);


-- ============================================
-- FLIGHTS & GROUPS - RLS
-- ============================================

ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere flights
CREATE POLICY "Anyone can read flights" ON flights
  FOR SELECT
  USING (true);

-- Solo federazione proprietaria può gestire flights
CREATE POLICY "Federation can manage flights" ON flights
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meets
      JOIN users ON users.id = meets.federation_id
      WHERE meets.id = flights.meet_id
      AND users.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere gruppi
CREATE POLICY "Anyone can read groups" ON groups
  FOR SELECT
  USING (true);

-- Solo federazione proprietaria può gestire gruppi
CREATE POLICY "Federation can manage groups" ON groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM flights
      JOIN meets ON meets.id = flights.meet_id
      JOIN users ON users.id = meets.federation_id
      WHERE flights.id = groups.flight_id
      AND users.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- NOMINATION - RLS
-- ============================================

ALTER TABLE nomination ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere nomination
CREATE POLICY "Anyone can read nomination" ON nomination
  FOR SELECT
  USING (true);

-- Solo federazione proprietaria può gestire nomination
CREATE POLICY "Federation can manage nomination" ON nomination
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN flights f ON f.id = g.flight_id
      JOIN meets m ON m.id = f.meet_id
      JOIN users u ON u.id = m.federation_id
      WHERE g.id = nomination.group_id
      AND u.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- WEIGHT_IN_INFO - RLS
-- ============================================

ALTER TABLE weight_in_info ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere pesature
CREATE POLICY "Anyone can read weight_in_info" ON weight_in_info
  FOR SELECT
  USING (true);

-- Solo federazione proprietaria può gestire pesature
CREATE POLICY "Federation can manage weight_in_info" ON weight_in_info
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM nomination n
      JOIN groups g ON g.id = n.group_id
      JOIN flights f ON f.id = g.flight_id
      JOIN meets m ON m.id = f.meet_id
      JOIN users u ON u.id = m.federation_id
      WHERE n.id = weight_in_info.nomination_id
      AND u.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- RECORDS & RESULTS - RLS
-- ============================================

ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere record
CREATE POLICY "Anyone can read records" ON records
  FOR SELECT
  USING (true);

-- Solo admin possono gestire record
CREATE POLICY "Admins can manage records" ON records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'ADMIN')
    )
    OR auth.role() = 'service_role'
  );

ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere risultati
CREATE POLICY "Anyone can read results" ON results
  FOR SELECT
  USING (true);

-- Solo federazione proprietaria può gestire risultati
CREATE POLICY "Federation can manage results" ON results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meets
      JOIN users ON users.id = meets.federation_id
      WHERE meets.id = results.meet_id
      AND users.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

ALTER TABLE result_lifts ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere result_lifts
CREATE POLICY "Anyone can read result_lifts" ON result_lifts
  FOR SELECT
  USING (true);

-- Solo chi può gestire results può gestire result_lifts
CREATE POLICY "Federation can manage result_lifts" ON result_lifts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM results r
      JOIN meets m ON m.id = r.meet_id
      JOIN users u ON u.id = m.federation_id
      WHERE r.id = result_lifts.result_id
      AND u.auth_uid = auth.uid()
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- CATEGORIE STANDARD - RLS (Read-only)
-- ============================================

ALTER TABLE weight_categories_std ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weight_categories_std" ON weight_categories_std
  FOR SELECT
  USING (true);

-- Solo admin possono modificare categorie standard
CREATE POLICY "Admins can manage weight_categories_std" ON weight_categories_std
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'ADMIN')
    )
    OR auth.role() = 'service_role'
  );

ALTER TABLE age_categories_std ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read age_categories_std" ON age_categories_std
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage age_categories_std" ON age_categories_std
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'ADMIN')
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- LIFTS & MEET_TYPES - RLS (Read-only)
-- ============================================

ALTER TABLE lifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lifts" ON lifts
  FOR SELECT
  USING (true);

ALTER TABLE meet_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meet_types" ON meet_types
  FOR SELECT
  USING (true);

ALTER TABLE meet_type_lifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meet_type_lifts" ON meet_type_lifts
  FOR SELECT
  USING (true);


-- ============================================
-- FINE POLICIES
-- ============================================

-- Per verificare che tutto sia OK:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND rowsecurity = true;
