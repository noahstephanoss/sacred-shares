-- The previous REVOKE FROM PUBLIC didn't override default privileges granted via pg_proc
-- Re-apply with explicit revocation pattern
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Ensure anon can't call these
REVOKE ALL ON FUNCTION public.increment_usage(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.get_daily_usage(UUID) FROM anon;