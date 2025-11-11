-- ============================================
-- ADD form_lifts TABLE
-- Salva i massimali dichiarati dall'atleta per ogni alzata
-- ============================================

-- Crea tabella form_lifts (simile a result_lifts)
CREATE TABLE form_lifts (
  form_id          INTEGER NOT NULL,
  lift_id          VARCHAR(5) NOT NULL,
  declared_max_kg  NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (form_id, lift_id),
  FOREIGN KEY (form_id) REFERENCES form_info(id) ON DELETE CASCADE,
  FOREIGN KEY (lift_id) REFERENCES lifts(id) ON DELETE RESTRICT
);

-- Aggiungi indici per performance
CREATE INDEX idx_form_lifts_form ON form_lifts(form_id);
CREATE INDEX idx_form_lifts_lift ON form_lifts(lift_id);

-- Grant permessi al service_role
GRANT ALL ON TABLE form_lifts TO service_role;

-- ============================================
-- ESEMPI DI QUERY
-- ============================================

-- Query per vedere i massimali dichiarati di un atleta
-- SELECT 
--   a.first_name, 
--   a.last_name, 
--   l.name as lift_name, 
--   fl.declared_max_kg
-- FROM form_lifts fl
-- JOIN form_info fi ON fl.form_id = fi.id
-- JOIN athletes a ON fi.athlete_id = a.id
-- JOIN lifts l ON fl.lift_id = l.id
-- WHERE fi.meet_id = 1
-- ORDER BY a.last_name, l.id;

-- Query per vedere tutti i dati di un atleta (form_info + massimali)
-- SELECT 
--   fi.id as form_id,
--   a.cf,
--   a.first_name,
--   a.last_name,
--   json_agg(json_build_object('lift', fl.lift_id, 'max_kg', fl.declared_max_kg)) as declared_maxes
-- FROM form_info fi
-- JOIN athletes a ON fi.athlete_id = a.id
-- LEFT JOIN form_lifts fl ON fl.form_id = fi.id
-- WHERE fi.meet_id = 1
-- GROUP BY fi.id, a.cf, a.first_name, a.last_name;
