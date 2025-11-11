-- PostgreSQL Remote Database Schema

/* ---------------------------
  Dati utili in ogni fase della gara
---------------------------- */

CREATE TYPE sex AS ENUM ('M', 'F');

CREATE TABLE lifts (
    id          VARCHAR(5) PRIMARY KEY,   -- es: 'SQ', 'PU', 'DIP'
    name        VARCHAR(50) NOT NULL UNIQUE,  -- es: 'Squat', 'Pull-Up', 'Dip'
    CONSTRAINT valid_lift_id CHECK (id ~ '^[A-Z]{2,5}$')  -- solo maiuscole, 2-5 chars
);

CREATE TABLE meet_types (
    id          VARCHAR(10) PRIMARY KEY,  -- es: 'STREET_4', 'STREET_3'
    name        VARCHAR(100) NOT NULL UNIQUE,  -- es: 'Street 4', 'Street 3'
    CONSTRAINT valid_meet_type_id CHECK (id ~ '^[A-Z0-9_]{2,10}$')  -- maiuscole/numeri/underscore
);

CREATE TABLE meet_type_lifts (
    meet_type_id    VARCHAR(10) NOT NULL,
    lift_id         VARCHAR(5) NOT NULL,
    sequence        INTEGER NOT NULL,  -- ordine delle alzate nella gara
    PRIMARY KEY (meet_type_id, lift_id),
    FOREIGN KEY (meet_type_id) REFERENCES meet_types(id) ON DELETE CASCADE,
    FOREIGN KEY (lift_id) REFERENCES lifts(id) ON DELETE RESTRICT,
    UNIQUE (meet_type_id, sequence)  -- impedisce duplicati nell'ordine
);
CREATE INDEX idx_meet_type_lifts_lift ON meet_type_lifts(lift_id);

/* ---------------------------
  STANDARD Categories
---------------------------- */
CREATE TABLE weight_categories_std (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name     VARCHAR(50) NOT NULL UNIQUE,            -- es: "+101", "U101", "-94" o "Men -94" 
  sex      SEX NOT NULL,
  min_kg   DECIMAL(5,2) NOT NULL DEFAULT 0,        -- limite inferiore INCLUSIVO
  max_kg   DECIMAL(5,2),                           -- limite superiore INCLUSIVO; NULL = open-top (es. +101)
  ord      INTEGER NOT NULL DEFAULT 0,             -- utile per ordinamenti custom
  CHECK (max_kg IS NULL OR max_kg > min_kg),
  UNIQUE (sex, min_kg, max_kg)
);

CREATE TABLE age_categories_std (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name     VARCHAR(50) NOT NULL UNIQUE,  -- es: "U18", "Senior", "Master 40-49"
  min_age  SMALLINT,                     -- NULL = nessun limite inferiore
  max_age  SMALLINT,                     -- NULL = nessun limite superiore
  ord      INTEGER NOT NULL DEFAULT 0,   -- utile per ordinamenti custom
  CHECK (max_age IS NULL OR min_age IS NULL OR max_age >= min_age),
  UNIQUE (min_age, max_age)
);

/* ---------------------------
  Fine dati utili in ogni fase della gara
---------------------------- */


/* ---------------------------
  Dati a tutte le entita coinvolte nella gestione della gara
---------------------------- */
/* ---------------------------
  Users (Organizing Bodies)
  Managed via Supabase Auth:
  - each row corresponds to a Supabase user (auth.users.id)
  - passwords are NOT stored here (handled by Supabase)
  - a role is assigned to each federated user
---------------------------- */
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  auth_uid    UUID NOT NULL UNIQUE,     -- Supabase auth.users.id
  name        TEXT NOT NULL,            -- display name
  role        TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','ORGANIZER','REFEREE','DIRECTOR')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (auth_uid) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE federations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,         -- es: "STREET LIFTING ITALIA"
  code        VARCHAR(10) NOT NULL UNIQUE,  -- es: "SLI"
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_federations (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL,
  federation_id   INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, federation_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (federation_id) REFERENCES federations(id) ON DELETE CASCADE
);

CREATE TABLE judges (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('HEAD', 'LEFT', 'RIGHT')),
  FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE teams (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_teams_name ON teams(name);


CREATE TABLE athletes (
  id            SERIAL PRIMARY KEY,
  cf            TEXT NOT NULL UNIQUE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  sex           SEX NOT NULL,
  birth_date    DATE NOT NULL
);

CREATE TABLE meets (
  id               SERIAL PRIMARY KEY,
  federation_id    INTEGER,
  meet_code        TEXT NOT NULL UNIQUE,  -- Identificatore univoco cross-database (es: "SLI-2025-01")
  name             TEXT NOT NULL,
  start_date       DATE NOT NULL,         -- Data inizio gara
  end_date         DATE NOT NULL,         -- Data fine gara (inclusiva). Durata = end_date - start_date + 1 giorni
  level            TEXT NOT NULL,         -- "REGIONALE" | "NAZIONALE" | "INTERNAZIONALE"
  regulation_code  TEXT NOT NULL,         -- es: "WL_COEFF_2025"
  meet_type_id     VARCHAR(10) NOT NULL,  -- FK to meet_types(id)
  score_type       TEXT NOT NULL DEFAULT 'RIS',  -- Tipo punteggio: 'IPF' | 'RIS'
  CONSTRAINT check_end_date_after_start CHECK (end_date >= start_date),
  FOREIGN KEY (federation_id) REFERENCES federations(id) ON DELETE SET NULL,
  FOREIGN KEY (meet_type_id) REFERENCES meet_types(id)
);

/* ---------------------------
  Fine dati a tutte le entita coinvolte nella gestione della gara
---------------------------- */

/* ---------------------------------------------------------
  Dati form di registrazione
--------------------------------------------------------- */

CREATE TABLE form_info (
  id                 SERIAL PRIMARY KEY,
  meet_id            INTEGER NOT NULL,
  athlete_id         INTEGER NOT NULL,
  team_id            INTEGER,
  weight_cat_id      INTEGER NOT NULL,
  age_cat_id         INTEGER NOT NULL,
  UNIQUE (meet_id, athlete_id),
  FOREIGN KEY (meet_id)       REFERENCES meets(id)             ON DELETE CASCADE,
  FOREIGN KEY (athlete_id)    REFERENCES athletes(id)          ON DELETE CASCADE,
  FOREIGN KEY (team_id)       REFERENCES teams(id)             ON DELETE SET NULL,
  FOREIGN KEY (weight_cat_id) REFERENCES weight_categories_std(id),
  FOREIGN KEY (age_cat_id)    REFERENCES age_categories_std(id)
);

-- Massimali dichiarati dall'atleta per ogni alzata (importati da CSV)
CREATE TABLE form_lifts (
  form_id          INTEGER NOT NULL,
  lift_id          VARCHAR(5) NOT NULL,
  declared_max_kg  NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (form_id, lift_id),
  FOREIGN KEY (form_id) REFERENCES form_info(id) ON DELETE CASCADE,
  FOREIGN KEY (lift_id) REFERENCES lifts(id) ON DELETE RESTRICT
);

/* ---------------------------
   Flights & Groups
---------------------------- */
CREATE TABLE flights (
  id          INTEGER PRIMARY KEY,
  meet_id     INTEGER NOT NULL,
  name        TEXT NOT NULL,             -- es: "Flight A (Mattina)"
  ord         INTEGER NOT NULL,
  day_number  INTEGER NOT NULL DEFAULT 1 CHECK (day_number >= 1),  -- Giorno gara (1=primo giorno, 2=secondo, etc.)
  start_time  TEXT,                      -- Orario inizio flight (formato HH:MM, es: "09:00", "14:30")
  UNIQUE (meet_id, ord),
  FOREIGN KEY (meet_id) REFERENCES meets(id) ON DELETE CASCADE
);

CREATE TABLE groups (
  id         INTEGER PRIMARY KEY,
  flight_id  INTEGER NOT NULL,
  name       TEXT NOT NULL,              -- es: "Gruppo 1 (-80)"
  ord        INTEGER NOT NULL,
  UNIQUE (flight_id, ord),
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

CREATE TABLE nomination (
  id         INTEGER PRIMARY KEY,
  group_id   INTEGER NOT NULL,
  form_id     INTEGER NOT NULL,           -- atleta (registrazione) assegnato al group
  UNIQUE (group_id, form_id),
  FOREIGN KEY (group_id) REFERENCES groups(id)          ON DELETE CASCADE,
  FOREIGN KEY (form_id)   REFERENCES form_info(id)   ON DELETE CASCADE
);

/* ---------------------------------------------------------
  Dati pre-gara 
--------------------------------------------------------- */

CREATE TABLE weight_in_info (
  id                 INTEGER PRIMARY KEY,
  nomination_id      INTEGER NOT NULL UNIQUE,      -- riferimento a nomination
  bodyweight_kg      REAL,
  rack_height        INTEGER NOT NULL DEFAULT 0,  -- altezza del rack
  belt_height        INTEGER NOT NULL DEFAULT 0,  -- altezza della cintura
  out_of_weight      INTEGER NOT NULL CHECK (out_of_weight IN (0,1)) DEFAULT 0,  -- booleano 0/1
  notes              TEXT,
  FOREIGN KEY (nomination_id) REFERENCES nomination(id) ON DELETE CASCADE
);

/* ---------------------------
  Dati gara 
---------------------------- */
/* ---------------------------
  Attempts (including openers)
---------------------------- */
CREATE TABLE attempts (
  id               INTEGER PRIMARY KEY,
  weight_in_info_id INTEGER NOT NULL,        -- riferimento a weight_in_info
  lift_id          TEXT NOT NULL,
  attempt_no       INTEGER NOT NULL CHECK (attempt_no BETWEEN 1 AND 4), -- 1,2,3 (4 = if judges allow 4th attempt)
  weight_kg        NUMERIC(10,2) NOT NULL,           -- Attempt 1 = opener dichiarato alla pesa
  status           TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','VALID','INVALID')),
  UNIQUE (weight_in_info_id, lift_id, attempt_no),
  FOREIGN KEY (weight_in_info_id) REFERENCES weight_in_info(id) ON DELETE CASCADE,
  FOREIGN KEY (lift_id) REFERENCES lifts(id)
);

CREATE TABLE current_state (
  id                        INTEGER PRIMARY KEY CHECK (id = 1), -- singleton: solo 1 riga
  meet_id                   INTEGER,
  current_flight_id         INTEGER,
  current_group_id          INTEGER,
  current_lift_id           TEXT,
  current_round             INTEGER CHECK (current_round BETWEEN 1 AND 3),
  current_weight_in_info_id INTEGER, -- atleta corrente in pedana
  FOREIGN KEY (meet_id)                   REFERENCES meets(id),
  FOREIGN KEY (current_flight_id)         REFERENCES flights(id),
  FOREIGN KEY (current_group_id)          REFERENCES groups(id),
  FOREIGN KEY (current_weight_in_info_id) REFERENCES weight_in_info(id) ON DELETE SET NULL,
  FOREIGN KEY (current_lift_id)           REFERENCES lifts(id)
);


/* ---------------------------
  Dati post -gara: Records & Results
---------------------------- */

CREATE TABLE records (
  id               SERIAL PRIMARY KEY,
  weight_cat_id    INTEGER NOT NULL,
  age_cat_id       INTEGER NOT NULL,
  lift             VARCHAR(5) NOT NULL,
  record_kg        NUMERIC(10,2) NOT NULL,
  bodyweight_kg    DECIMAL(5,2) NOT NULL, -- peso dell'atleta quando ha stabilito il record
  meet_code        TEXT,                  -- FK to meets(meet_code) - where record was set
  set_date         DATE,
  athlete_id       INTEGER,               -- atleta che ha stabilito il record
  team_id          INTEGER,               -- squadra dell'atleta che ha stabilito il record
  UNIQUE (weight_cat_id, age_cat_id, lift),
  FOREIGN KEY (weight_cat_id) REFERENCES weight_categories_std(id),
  FOREIGN KEY (age_cat_id)    REFERENCES age_categories_std(id),
  FOREIGN KEY (lift)          REFERENCES lifts(id),
  FOREIGN KEY (athlete_id)    REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (meet_code)     REFERENCES meets(meet_code) ON DELETE SET NULL,
  FOREIGN KEY (team_id)       REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE results (
  id               SERIAL PRIMARY KEY,
  meet_id          INTEGER NOT NULL,
  athlete_id       INTEGER,               -- NULL se atleta non in athletes
  weight_cat_id    INTEGER NOT NULL,
  age_cat_id       INTEGER NOT NULL,
  total_kg         NUMERIC(10,2) NOT NULL, -- somma delle alzate previste dalla gara
  points           NUMERIC(10,2) NOT NULL, -- calcolato in base a regulation_code
  final_placing    INTEGER,               -- posizione in classifica
  bodyweight_kg    DECIMAL(5,2) NOT NULL, -- peso atleta durante la gara
  FOREIGN KEY (meet_id)       REFERENCES meets(id) ON DELETE SET NULL,
  FOREIGN KEY (athlete_id)    REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (weight_cat_id) REFERENCES weight_categories_std(id),
  FOREIGN KEY (age_cat_id)    REFERENCES age_categories_std(id)
);

-- Risultati per singola alzata
CREATE TABLE result_lifts (
  result_id        INTEGER NOT NULL,
  lift_id          VARCHAR(5) NOT NULL,
  lift_kg          NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (result_id, lift_id),
  FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
  FOREIGN KEY (lift_id)   REFERENCES lifts(id)
);

/* ---------------------------
  Fine Dati post -gara: Records & Results
---------------------------- */


/* ============================================
   INDICI PER OTTIMIZZAZIONE PERFORMANCE
============================================ */

-- Indici per current_state (query molto frequenti durante la gara)
CREATE INDEX idx_current_state_meet ON current_state(meet_id);
CREATE INDEX idx_current_state_flight ON current_state(current_flight_id);
CREATE INDEX idx_current_state_group ON current_state(current_group_id);
CREATE INDEX idx_current_state_lift ON current_state(current_lift_id);
CREATE INDEX idx_current_state_athlete ON current_state(current_weight_in_info_id);

-- Indici per attempts (query costanti durante la gara)
CREATE INDEX idx_attempts_weight_in_info ON attempts(weight_in_info_id);
CREATE INDEX idx_attempts_lift ON attempts(lift_id);
CREATE INDEX idx_attempts_status ON attempts(status);
CREATE INDEX idx_attempts_lift_status ON attempts(lift_id, status);
CREATE INDEX idx_attempts_athlete_lift ON attempts(weight_in_info_id, lift_id);

-- Indici per form_info (registrazione e query atleti)
CREATE INDEX idx_form_info_meet ON form_info(meet_id);
CREATE INDEX idx_form_info_athlete ON form_info(athlete_id);
CREATE INDEX idx_form_info_team ON form_info(team_id);
CREATE INDEX idx_form_info_weight_cat ON form_info(weight_cat_id);
CREATE INDEX idx_form_info_age_cat ON form_info(age_cat_id);
CREATE INDEX idx_form_info_categories ON form_info(weight_cat_id, age_cat_id);

-- Indici per form_lifts (massimali dichiarati)
CREATE INDEX idx_form_lifts_form ON form_lifts(form_id);
CREATE INDEX idx_form_lifts_lift ON form_lifts(lift_id);

-- Indici per weight_in_info (pesatura e dati pre-gara)
CREATE INDEX idx_weight_in_nomination ON weight_in_info(nomination_id);
CREATE INDEX idx_weight_in_out_of_weight ON weight_in_info(out_of_weight);

-- Indici per nomination (assegnazione gruppi)
CREATE INDEX idx_nomination_group ON nomination(group_id);
CREATE INDEX idx_nomination_form ON nomination(form_id);

-- Indici per flights (gestione sessioni)
CREATE INDEX idx_flights_meet ON flights(meet_id);
CREATE INDEX idx_flights_ord ON flights(meet_id, ord);

-- Indici per groups (gestione gruppi)
CREATE INDEX idx_groups_flight ON groups(flight_id);
CREATE INDEX idx_groups_ord ON groups(flight_id, ord);

-- Indici per results (classifiche post-gara)
CREATE INDEX idx_results_meet ON results(meet_id);
CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_weight_cat ON results(weight_cat_id);
CREATE INDEX idx_results_age_cat ON results(age_cat_id);
CREATE INDEX idx_results_categories ON results(weight_cat_id, age_cat_id);
CREATE INDEX idx_results_placing ON results(final_placing);
CREATE INDEX idx_results_meet_categories ON results(meet_id, weight_cat_id, age_cat_id);

-- Indici per result_lifts
CREATE INDEX idx_result_lifts_lift ON result_lifts(lift_id);

-- Indici per records (query record)
CREATE INDEX idx_records_weight_cat ON records(weight_cat_id);
CREATE INDEX idx_records_age_cat ON records(age_cat_id);
CREATE INDEX idx_records_lift ON records(lift);
CREATE INDEX idx_records_categories ON records(weight_cat_id, age_cat_id);
CREATE INDEX idx_records_categories_lift ON records(weight_cat_id, age_cat_id, lift);
CREATE INDEX idx_records_meet ON records(meet_code);
CREATE INDEX idx_records_athlete ON records(athlete_id);
CREATE INDEX idx_records_team ON records(team_id);

-- Indici per athletes (ricerche atleti)
CREATE INDEX idx_athletes_cf ON athletes(cf);
CREATE INDEX idx_athletes_name ON athletes(last_name, first_name);
CREATE INDEX idx_athletes_sex ON athletes(sex);

-- Indici per judges (gestione giudici)
CREATE INDEX idx_judges_user ON judges(user_id);
CREATE INDEX idx_judges_role ON judges(role);

-- Indici per meets (gestione gare)
CREATE INDEX idx_meets_code ON meets(meet_code);
CREATE INDEX idx_meets_federation ON meets(federation_id);
CREATE INDEX idx_meets_type ON meets(meet_type_id);
CREATE INDEX idx_meets_date ON meets(start_date);
CREATE INDEX idx_meets_level ON meets(level);

-- Indici per users (autenticazione)
CREATE INDEX idx_users_auth_uid ON users(auth_uid);
CREATE INDEX idx_users_role ON users(role);

-- Indici per federations
CREATE INDEX idx_federations_code ON federations(code);
CREATE INDEX idx_federations_name ON federations(name);

-- Indici per user_federations
CREATE INDEX idx_user_federations_user ON user_federations(user_id);
CREATE INDEX idx_user_federations_federation ON user_federations(federation_id);

-- Indici per weight_categories_std
CREATE INDEX idx_weight_cat_sex ON weight_categories_std(sex);
CREATE INDEX idx_weight_cat_ord ON weight_categories_std(ord);

-- Indici per age_categories_std
CREATE INDEX idx_age_cat_ord ON age_categories_std(ord);


/* Initial data std categories */

INSERT INTO weight_categories_std (name, sex, min_kg, max_kg, ord)
VALUES
  -- Men's categories
  ('-59M',  'M',  0.00,   59.00,  0),
  ('-66M',  'M',  59.01,  66.00,  1),
  ('-73M',  'M',  66.01,  73.00,  2),
  ('-80M',  'M',  73.01,  80.00,  3),
  ('-87M',  'M',  80.01,  87.00,  4),
  ('-94M',  'M',  87.01,  94.00,  5),
  ('-101M', 'M',  94.01,  101.00, 6),
  ('+101M', 'M',  101.01, NULL,   7),

  -- Women's categories
  ('-52F',  'F',  0.00,   52.00,  0),
  ('-57F',  'F',  52.01,  57.00,  1),
  ('-63F',  'F',  57.01,  63.00,  2),
  ('-70F',  'F',  63.01,  70.00,  3),
  ('+70F',  'F',  70.01,  NULL,   4);

INSERT INTO age_categories_std (name, min_age, max_age, ord)
VALUES
  ('Sub-Junior', NULL, 18, 0),
  ('Junior',     19,  23, 1),
  ('Senior',     24,  39, 2),
  ('Master I',   40,  49, 3),
  ('Master II',  50,  59, 4),
  ('Master III', 60,  69, 5),
  ('Master IV',  70,  NULL, 6);

/* Initial data for lifts and meet types */

INSERT INTO lifts (id, name) VALUES
    ('SQ',  'Squat'),
    ('PU',  'Pull-Up'),
    ('DIP', 'Dip'),
    ('MP',  'Military-Press'),
    ('MU',  'Muscle-Up');

INSERT INTO meet_types (id, name) VALUES
    ('STREET_4',    'Street 4'),
    ('STREET_3',    'Street 3'),
    ('PUSH_PULL',   'Push & Pull'),
    ('S_PU', 'Single Lift Pull-Up'),
    ('S_DIP',  'Single Lift Dip'),
    ('S_MU',   'Single Lift Muscle-Up'),
    ('S_SQ',   'Single Lift Squat'),
    ('S_MP',   'Single Lift Military-Press');

INSERT INTO meet_type_lifts (meet_type_id, lift_id, sequence) VALUES
    -- Street 4: mu, pull, dip, squat
    ('STREET_4', 'MU',  1),
    ('STREET_4', 'PU',  2),
    ('STREET_4', 'DIP', 3),
    ('STREET_4', 'SQ',  4),
    -- Street 3: pull, dip, squat
    ('STREET_3', 'PU',  1),
    ('STREET_3', 'DIP', 2),
    ('STREET_3', 'SQ',  3),
    -- Push & Pull: pull, dip
    ('PUSH_PULL', 'PU',  1),
    ('PUSH_PULL', 'DIP', 2),
    -- Single lifts
    ('S_PU', 'PU',  1),
    ('S_DIP',  'DIP', 1),
    ('S_MU',   'MU',  1),
    ('S_SQ',   'SQ',  1),
    ('S_MP',   'MP',  1);


INSERT INTO records (weight_cat_id, age_cat_id, lift, record_kg, bodyweight_kg, meet_code, set_date, athlete_id)
SELECT
    w.id  AS weight_cat_id,
    a.id  AS age_cat_id,
    l.id  AS lift,
    0     AS record_kg,
    0     AS bodyweight_kg,    -- valore di default per i record iniziali
    NULL  AS meet_code,
    NULL  AS set_date,
    NULL  AS athlete_id
FROM weight_categories_std w
CROSS JOIN age_categories_std a
CROSS JOIN lifts l;