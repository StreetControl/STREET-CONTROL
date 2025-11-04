-- ========================================
-- FIX: GRANT PERMISSIONS ON SEQUENCES
-- ========================================
-- Problema: service_role non ha permesso di usare le sequenze per generare ID

-- Grant permessi su TUTTE le sequenze
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Specificamente per meets_id_seq
GRANT USAGE, SELECT ON SEQUENCE meets_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE meets_id_seq TO postgres;

-- Grant anche su altre sequenze importanti
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE federations_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_federations_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE athletes_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE teams_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE judges_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE form_info_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE records_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE results_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE weight_categories_std_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE age_categories_std_id_seq TO service_role;

-- Verifica permessi sulle sequenze
SELECT 
    object_name AS sequence_name,
    grantee,
    privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'public'
  AND object_type = 'SEQUENCE'
  AND grantee IN ('service_role', 'postgres', 'authenticated')
ORDER BY object_name, grantee;

COMMENT ON SEQUENCE meets_id_seq IS 'Sequenza auto-incrementale per meets.id - permessi USAGE e SELECT concessi a service_role';
