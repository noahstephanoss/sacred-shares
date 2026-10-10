REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.home_official_posts FROM anon;
GRANT SELECT ON public.home_official_posts TO anon;