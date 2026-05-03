import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Testimonies" },
      { name: "description", content: "Articles and reflections from the Testimonies community." },
    ],
  }),
  component: BlogListPage,
});

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published: boolean;
  created_at: string;
};

function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, published, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setPosts((data ?? []) as BlogPost[]);
      setLoading(false);

      // Check admin
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
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Blog</h2>
          <p className="text-sm text-muted-foreground">Reflections and teachings</p>
        </div>
        {isAdmin && (
          <Link
            to="/blog/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New Post
          </Link>
        )}
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No articles yet.</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const date = new Date(post.created_at).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              });
              return (
                <Link
                  key={post.id}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="block rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
                >
                  <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">{date}</p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}