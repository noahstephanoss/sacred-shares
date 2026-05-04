import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";

export const Route = createFileRoute("/blog_/new")({
  head: () => ({
    meta: [{ title: "New Blog Post — Testimonies" }],
  }),
  component: NewBlogPostPage,
});

/* ── Rich-text toolbar helpers ── */
function wrapSelection(ref: React.RefObject<HTMLTextAreaElement | null>, prefix: string, suffix: string, setBody: (v: string) => void) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  const selected = text.slice(start, end);
  const replacement = `${prefix}${selected}${suffix}`;
  const next = text.slice(0, start) + replacement + text.slice(end);
  setBody(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
  });
}

function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement | null>, insertion: string, setBody: (v: string) => void) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const text = el.value;
  const next = text.slice(0, start) + insertion + text.slice(start);
  setBody(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + insertion.length, start + insertion.length);
  });
}

function ToolbarButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
    </button>
  );
}

function NewBlogPostPage() {
  const navigate = useNavigate();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const estReadMin = Math.max(1, Math.ceil(wordCount / 200));

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(data === true);
    }
    check();
  }, []);

  useEffect(() => {
    if (!slugManual) setSlug(slugify(title));
  }, [title, slugManual]);

  const handleSlugChange = (value: string) => { setSlugManual(true); setSlug(slugify(value)); };
  const resetSlugToAuto = () => { setSlugManual(false); setSlug(slugify(title)); };

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
      setError(insertError.message.includes("duplicate")
        ? "A post with this slug already exists. Try a different one."
        : insertError.message);
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
        <Link to="/blog" className="mt-4 text-sm text-primary hover:underline">← Back to blog</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
            New Blog Post
          </h1>
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">← Cancel</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
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
              <div className="flex flex-1 items-center rounded-md border border-input bg-white">
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
                <button type="button" onClick={resetSlugToAuto} className="shrink-0 rounded-md border border-input bg-white px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground">
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
              className="w-full resize-none rounded-md border border-input bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder="A brief summary..."
            />
          </div>

          {/* Body with toolbar */}
          <div>
            <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-foreground">Body</label>
            <div className="overflow-hidden rounded-md border border-input">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-2 py-1.5">
                <ToolbarButton label="H1" title="Heading 1" onClick={() => insertAtCursor(bodyRef, "\n# ", setBody)} />
                <ToolbarButton label="H2" title="Heading 2" onClick={() => insertAtCursor(bodyRef, "\n## ", setBody)} />
                <ToolbarButton label="H3" title="Heading 3" onClick={() => insertAtCursor(bodyRef, "\n### ", setBody)} />
                <div className="mx-1 h-5 w-px bg-border" />
                <ToolbarButton label="B" title="Bold" onClick={() => wrapSelection(bodyRef, "**", "**", setBody)} />
                <ToolbarButton label="I" title="Italic" onClick={() => wrapSelection(bodyRef, "_", "_", setBody)} />
                <div className="mx-1 h-5 w-px bg-border" />
                <ToolbarButton label="❝" title="Block Quote" onClick={() => insertAtCursor(bodyRef, "\n> ", setBody)} />
                <ToolbarButton label="¶" title="New Paragraph" onClick={() => insertAtCursor(bodyRef, "\n\n", setBody)} />
                <div className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {wordCount} words · {estReadMin} min read
                </div>
              </div>
              <textarea
                id="body"
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={16}
                className="w-full resize-y border-0 bg-white px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="Write your article... Use the toolbar above for headings, bold, italic, and block quotes."
              />
            </div>
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
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : published ? "Publish" : "Save Draft"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}