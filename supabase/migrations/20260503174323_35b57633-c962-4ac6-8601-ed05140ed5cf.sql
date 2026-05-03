-- Revoke all default public execute, then grant back only what's needed
REVOKE ALL ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
-- handle_new_user is called by trigger only, no role needs direct execute

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
-- update_updated_at is called by trigger only, no role needs direct execute