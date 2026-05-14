import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Reflections — Testimonies" },
      { name: "description", content: "Deep writings on faith and truth from the Testimonies community." },
      { property: "og:title", content: "Reflections — Testimonies" },
      { property: "og:description", content: "Deep writings on faith and truth from the Testimonies community." },
      { property: "og:url", content: "https://testimonies.chat/blog" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Reflections",
          url: "https://testimonies.chat/blog",
          description: "Deep writings on faith and truth from the Testimonies community.",
        }),
      },
    ],
  }),
  component: BlogListPage,
});

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  published: boolean;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

function readTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, body, excerpt, published, created_at, profiles:author_id(display_name)")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setPosts((data ?? []) as unknown as BlogPost[]);
      setLoading(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        setIsAdmin(roleData === true);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
            Reflections
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Deep writings on faith and truth</p>
        </div>
        {isAdmin && (
          <Link
            to="/blog/new"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New Post
          </Link>
        )}
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-12">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No articles yet.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => {
              const date = new Date(post.created_at).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              });
              const minutes = readTime(post.body);
              const authorName = (post.profiles as unknown as { display_name: string | null })?.display_name || "Testimonies Team";
              return (
                <Link
                  key={post.id}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="block rounded-2xl bg-card p-8 transition-shadow hover:shadow-md"
                  style={{ boxShadow: "0 2px 12px rgba(107,63,42,0.08)" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: "rgba(107,63,42,0.1)", color: "var(--primary)" }}
                    >
                      Long Read
                    </span>
                    <span className="text-xs text-muted-foreground">{minutes} min read</span>
                  </div>
                  <h2
                    className="text-2xl font-bold text-foreground leading-tight"
                    style={{ fontFamily: "'Georgia', serif" }}
                  >
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{authorName}</span>
                    <span>·</span>
                    <span>{date}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}