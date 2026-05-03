import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Blog Post — Testimonies" },
    ],
  }),
  component: BlogPostPage,
});

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  created_at: string;
};

function BlogPostPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, body, excerpt, created_at")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data as BlogPost);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
        <Link to="/blog" className="mt-4 text-sm text-primary hover:underline">
          ← Back to blog
        </Link>
      </div>
    );
  }

  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to blog
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl" style={{ fontFamily: "'Georgia', serif" }}>
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{date}</p>
        <div className="mt-8 text-foreground leading-relaxed whitespace-pre-wrap">
          {post.body}
        </div>
      </article>
    </div>
  );
}