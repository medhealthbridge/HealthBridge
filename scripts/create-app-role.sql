-- The restricted role the deployed app connects as. Run once, as the database owner.
-- It cannot bypass row-level security (so the tenant policies are enforced), cannot change
-- the schema, and cannot edit or delete audit rows. Safe to re-run.
--
-- It is created WITHOUT a password. Set one yourself (it never needs to pass through chat or git):
--   ALTER ROLE clinix_app PASSWORD '<long random password>';
-- then use the same host as your connection string with user clinix_app.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinix_app') THEN
    CREATE ROLE clinix_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

ALTER ROLE clinix_app NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO clinix_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinix_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinix_app;
-- Tables and sequences added by later migrations (created by the owner) are granted automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clinix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO clinix_app;
-- The audit trail is append-only for the app.
REVOKE UPDATE, DELETE ON audit_logs FROM clinix_app;
