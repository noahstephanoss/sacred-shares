import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";

export const Route = createFileRoute("/blog/new")({
  head: () => ({
    meta: [
      { title: "New Blog Post — Testimonies" },
    ],
  }),
  component: NewBlogPostPage,
});

function NewBlogPostPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin on mount
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(data === true);
    }
    check();
  }, []);

  // Auto-generate slug from title (unless manually overridden)
  useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  const handleSlugChange = (value: string) => {
    setSlugManual(true);
    setSlug(slugify(value));
  };

  const resetSlugToAuto = () => {
    setSlugManual(false);
    setSlug(slugify(title));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setSubmitting(false); return; }

    const { error: insertError } = await supabase.from("blog_posts").insert({
      title: title.trim(),
      slug: slug.trim(),
      body: body.trim(),
      excerpt: excerpt.trim() || null,
      published,
      author_id: user.id,
    });

    if (insertError) {
      if (insertError.message.includes("duplicate")) {
        setError("A post with this slug already exists. Try a different one.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    navigate({ to: "/blog" });
  };

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only admins can create blog posts.</p>
        <Link to="/blog" className="mt-4 text-sm text-primary hover:underline">
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
            New Blog Post
          </h1>
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
            ← Cancel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder="Your article title"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-foreground">
              Slug
              <span className="ml-2 text-xs text-muted-foreground">
                {slugManual ? "(manual)" : "(auto-generated from title)"}
              </span>
            </label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center rounded-md border border-input bg-background">
                <span className="pl-3 text-sm text-muted-foreground">/blog/</span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  className="w-full bg-transparent px-1 py-2.5 text-sm text-foreground focus:outline-none"
                  placeholder="your-article-slug"
                />
              </div>
              {slugManual && (
                <button
                  type="button"
                  onClick={resetSlugToAuto}
                  className="shrink-0 rounded-md border border-input bg-background px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset to auto
                </button>
              )}
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="mb-1.5 block text-sm font-medium text-foreground">
              Excerpt <span className="text-xs text-muted-foreground">(optional — shown in blog listing)</span>
            </label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder="A brief summary..."
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-foreground">
              Body
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={12}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder="Write your article..."
            />
          </div>

          {/* Publish toggle + submit */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-input"
              />
              Publish immediately
            </label>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !slug.trim() || !body.trim()}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : published ? "Publish" : "Save Draft"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}