CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  excerpt TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read published posts
CREATE POLICY "Published blog posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  USING (published = true);

-- Admins can see all (including drafts)
CREATE POLICY "Admins can view all blog posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can create
CREATE POLICY "Admins can create blog posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();