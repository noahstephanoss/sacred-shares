CREATE OR REPLACE FUNCTION public.get_testimony_reactors(_testimony_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  reaction_type text,
  reacted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    tr.user_id,
    COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Anonymous') AS display_name,
    tr.type AS reaction_type,
    tr.created_at AS reacted_at
  FROM public.testimony_reactions tr
  LEFT JOIN public.profiles p ON p.user_id = tr.user_id
  WHERE tr.testimony_id = _testimony_id
    AND EXISTS (
      SELECT 1
      FROM public.testimonies t
      WHERE t.id = tr.testimony_id
    )
  ORDER BY tr.created_at DESC;
$$;