-- Migration: 002_permissions_and_grants.sql
-- Grant basic table, sequence, and routine privileges to Supabase API roles (anon, authenticated)
-- Row Level Security (RLS) policies will control actual row access.

BEGIN;

-- Grant schema access
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant sequence privileges
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant function/routine execution privileges
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Set default privileges for future tables created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO anon, authenticated;

COMMIT;
