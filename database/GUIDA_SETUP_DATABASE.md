# 🚀 GUIDA STEP-BY-STEP: Ricostruzione Database Supabase

## ⚠️ **ATTENZIONE**
Questi comandi **ELIMINERANNO TUTTI I DATI** nelle tabelle specificate. Fai un backup prima di procedere!

---

## 📋 **STEP 1: BACKUP (IMPORTANTE!)**

Prima di procedere, **esporta i dati** che vuoi salvare:

### Opzione A: Backup via Supabase Dashboard
1. Vai su **Supabase Dashboard**
2. **Database** → **Backups**
3. Crea un backup manuale

### Opzione B: Esporta dati manualmente (SQL)
```sql
-- Esporta solo le tabelle users e meets che contengono dati importanti
COPY (SELECT * FROM users) TO '/tmp/users_backup.csv' WITH CSV HEADER;
COPY (SELECT * FROM meets) TO '/tmp/meets_backup.csv' WITH CSV HEADER;
COPY (SELECT * FROM athletes) TO '/tmp/athletes_backup.csv' WITH CSV HEADER;
COPY (SELECT * FROM teams) TO '/tmp/teams_backup.csv' WITH CSV HEADER;
```

---

## 🗑️ **STEP 2: CANCELLA TABELLE VECCHIE**

### Vai su **Supabase → SQL Editor** ed esegui:

```sql
-- DROP CASCADE elimina anche le foreign key e dipendenze
DROP TABLE IF EXISTS result_lifts CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS current_state CASCADE;
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS weight_in_info CASCADE;
DROP TABLE IF EXISTS nomination CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS form_lifts CASCADE;
DROP TABLE IF EXISTS form_info CASCADE;
DROP TABLE IF EXISTS meet_type_lifts CASCADE;
DROP TABLE IF EXISTS meets CASCADE;
DROP TABLE IF EXISTS meet_types CASCADE;
DROP TABLE IF EXISTS lifts CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS judges CASCADE;
DROP TABLE IF EXISTS user_federations CASCADE;
DROP TABLE IF EXISTS federations CASCADE;
-- NON CANCELLARE users! È gestita da Supabase Auth
-- DROP TABLE IF EXISTS users CASCADE;  -- ❌ NON ESEGUIRE!
DROP TABLE IF EXISTS weight_categories_std CASCADE;
DROP TABLE IF EXISTS age_categories_std CASCADE;
DROP TYPE IF EXISTS sex CASCADE;
```

✅ **Output atteso:** `DROP TABLE` per ogni tabella (o `NOTICE: table does not exist` se già cancellata)

---

## 🏗️ **STEP 3: CREA NUOVO SCHEMA**

### Apri il file `init_remote_schema_v2.sql` ed esegui **TUTTO IL CONTENUTO**:

1. **Vai su Supabase → SQL Editor**
2. **Copia e incolla** tutto il contenuto di `init_remote_schema_v2.sql`
3. **Esegui** (Run)

✅ **Output atteso:** 
```
CREATE TYPE
CREATE TABLE (x20+)
CREATE INDEX (x50+)
INSERT 0 13 (weight categories)
INSERT 0 7 (age categories)
INSERT 0 5 (lifts)
INSERT 0 8 (meet types)
INSERT 0 13 (meet type lifts)
INSERT 0 455 (records - cross join)
```

### ⚠️ **SE VEDI ERRORI:**

**Errore: `relation "users" does not exist`**
→ La tabella `users` deve esistere già (creata da Supabase Auth)
→ Se non esiste, crea manualmente:

```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  auth_uid    UUID NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','ORGANIZER','REFEREE','DIRECTOR')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (auth_uid) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

---

## 🔐 **STEP 4: ATTIVA RLS E PERMESSI**

### Apri il file `setup_rls_and_permissions.sql` ed esegui **TUTTO IL CONTENUTO**:

1. **Vai su Supabase → SQL Editor**
2. **Copia e incolla** tutto il contenuto di `setup_rls_and_permissions.sql`
3. **Esegui** (Run)

✅ **Output atteso:**
```
ALTER TABLE (x21 - RLS abilitato)
GRANT (x42 - permessi concessi)
CREATE POLICY (x21 - policy create)
GRANT (x21 - SELECT concesso)
```

---

## ✅ **STEP 5: VERIFICA FINALE**

### 5.1 Verifica Sequenze

Esegui questa query:

```sql
SELECT 
  table_name,
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('flights', 'groups', 'nomination', 'attempts', 'weight_in_info')
  AND column_name = 'id'
ORDER BY table_name;
```

✅ **Output atteso:**
```json
[
  {
    "table_name": "attempts",
    "column_name": "id",
    "column_default": "nextval('attempts_id_seq'::regclass)",
    "is_nullable": "NO"
  },
  {
    "table_name": "flights",
    "column_name": "id",
    "column_default": "nextval('flights_id_seq'::regclass)",
    "is_nullable": "NO"
  },
  ...
]
```

Se vedi `column_default = null`, c'è un problema! ❌

### 5.2 Verifica RLS

```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

✅ **Output atteso:** `rowsecurity = true` per tutte le tabelle

**Nota:** Questa query usa `tablename` (che è il nome corretto della colonna in `pg_tables`, diverso da `information_schema.columns` che usa `table_name`).

### 5.3 Verifica Permessi service_role

```sql
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
  AND table_schema = 'public'
ORDER BY table_name;
```

✅ **Output atteso:** Dovresti vedere `INSERT`, `SELECT`, `UPDATE`, `DELETE` per ogni tabella

### 5.4 Test Inserimento

```sql
-- Test inserimento flight (deve funzionare)
INSERT INTO flights (meet_id, name, ord, day_number, start_time)
VALUES (1, 'Test Flight', 1, 1, '09:00')
RETURNING id;

-- Cancella il test
DELETE FROM flights WHERE name = 'Test Flight';
```

✅ **Output atteso:** Restituisce un ID (es: `1`) senza errori

---

## 🔄 **STEP 6: AGGIORNA BACKEND CODE**

Il backend ora **non ha più bisogno del workaround** con ID manuali! Rimuovo il codice temporaneo:

### File da modificare: `backend/src/controllers/divisionController.ts`

**PRIMA (con workaround):**
```typescript
const { data: maxFlight } = await supabaseAdmin
  .from('flights')
  .select('id')
  .order('id', { ascending: false })
  .limit(1)
  .maybeSingle();

let nextFlightId = (maxFlight?.id || 0) + 1;

await supabaseAdmin.from('flights').insert({
  id: nextFlightId++,  // ← Workaround
  meet_id: parseInt(meetId),
  ...
});
```

**DOPO (con SERIAL nativo):**
```typescript
await supabaseAdmin.from('flights').insert({
  // NO ID! Auto-generato da SERIAL
  meet_id: parseInt(meetId),
  name: flightData.name,
  ord: flightData.flight_number,
  ...
});
```

---

## 🧪 **STEP 7: TEST FINALE**

1. **Riavvia backend:**
```powershell
cd backend
npm run dev
```

2. **Riavvia frontend:**
```powershell
cd frontend
npm run dev
```

3. **Test Tab 3 (Group Division):**
   - Vai su Tab 3
   - Clicca "Crea Divisione Automatica"
   - ✅ Deve creare flights/groups/nominations senza errori

4. **Verifica Database:**
```sql
SELECT * FROM flights;
SELECT * FROM groups;
SELECT * FROM nomination;
```

---

## ❌ **TROUBLESHOOTING**

### Problema: `permission denied for table X`
→ Riesegui lo script `setup_rls_and_permissions.sql`

### Problema: `null value in column "id" violates not-null constraint`
→ Le sequenze non sono configurate. Verifica con:
```sql
\ds  -- Lista tutte le sequenze
```
Se mancano, crea manualmente:
```sql
CREATE SEQUENCE flights_id_seq OWNED BY flights.id;
ALTER TABLE flights ALTER COLUMN id SET DEFAULT nextval('flights_id_seq');
```

### Problema: `relation "users" does not exist`
→ Crea la tabella users (vedi Step 3)

### Problema: `duplicate key value violates unique constraint`
→ Le sequenze hanno valori bassi. Resetta:
```sql
SELECT setval('flights_id_seq', 100);
SELECT setval('groups_id_seq', 100);
SELECT setval('nomination_id_seq', 100);
```

---

## 📞 **SUPPORTO**

Se hai problemi:
1. Controlla gli errori esatti nel terminale Supabase
2. Verifica che le sequenze esistano: `\ds` in psql
3. Verifica i permessi: `\dp` in psql
4. Fai uno screenshot dell'errore e dimmi!

---

## ✅ **CHECKLIST FINALE**

Prima di procedere allo STEP 3 (drag & drop):

- [ ] Database ricreato con nuovo schema
- [ ] RLS attivo su tutte le tabelle
- [ ] Permessi service_role concessi
- [ ] Sequenze auto-increment funzionanti
- [ ] Test inserimento flights OK
- [ ] Backend riavviato
- [ ] Frontend riavviato
- [ ] Tab 3 crea divisione senza errori

**SE TUTTE LE CHECKBOX SONO ✅, PUOI PROCEDERE CON LO STEP 3!** 🎉
