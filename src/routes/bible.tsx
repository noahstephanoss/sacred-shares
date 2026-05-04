import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/bible")({
  head: () => ({
    meta: [
      { title: "Bible — Testimonies" },
      { name: "description", content: "Search scripture and discover the verse of the day." },
    ],
  }),
  component: BiblePage,
});

const DAILY_VERSES = [
  "John 3:16", "Psalm 23:1-6", "Romans 8:28", "Philippians 4:13", "Jeremiah 29:11",
  "Proverbs 3:5-6", "Isaiah 41:10", "Matthew 11:28-30", "Romans 12:2", "Psalm 46:10",
  "2 Timothy 1:7", "Galatians 5:22-23", "Hebrews 11:1", "James 1:5", "1 Corinthians 13:4-7",
  "Psalm 119:105", "Matthew 6:33", "Ephesians 2:8-9", "Joshua 1:9", "Isaiah 40:31",
  "Psalm 37:4", "Romans 5:8", "Colossians 3:23", "Micah 6:8", "Lamentations 3:22-23",
  "Psalm 139:14", "Matthew 5:16", "2 Corinthians 5:17", "1 Peter 5:7", "Psalm 34:8",
];

type VerseResult = {
  reference: string;
  text: string;
  error?: string;
};

function BiblePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [verse, setVerse] = useState<VerseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dailyVerse, setDailyVerse] = useState<VerseResult | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const dayIndex = new Date().getDate() - 1;
  const todayRef = DAILY_VERSES[dayIndex % DAILY_VERSES.length];

  useEffect(() => {
    fetchVerse(todayRef).then((v) => {
      if (v) setDailyVerse(v);
      setDailyLoading(false);
    });
  }, []);

  async function fetchVerse(ref: string): Promise<VerseResult | null> {
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}`);
      const data = await res.json();
      if (data.error) return null;
      return { reference: data.reference, text: data.text.trim() };
    } catch {
      return null;
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setVerse(null);
    const result = await fetchVerse(query.trim());
    if (result) {
      setVerse(result);
    } else {
      setError("Verse not found. Try a reference like "John 3:16" or "Psalm 23:1-6".");
    }
    setLoading(false);
  }

  function handleCopy(text: string, ref: string) {
    navigator.clipboard.writeText(`"${text}" — ${ref}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareToFeed(text: string, ref: string) {
    const encoded = encodeURIComponent(`"${text}" — ${ref}`);
    navigate({ to: "/feed", search: { prefill: encoded } as any });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className="text-4xl font-bold text-foreground mb-3"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            The Word
          </h1>
          <p className="text-muted-foreground" style={{ fontFamily: "'Georgia', serif" }}>
            Search scripture — let the Word speak
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-12">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search a verse — e.g. John 3:16'
              className="flex-1 rounded-lg border border-border bg-white px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontFamily: "'Georgia', serif" }}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "…" : "Search"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <p className="mb-8 text-center text-sm text-destructive">{error}</p>
        )}

        {/* Search Result */}
        {verse && (
          <VerseCard
            verse={verse}
            onCopy={() => handleCopy(verse.text, verse.reference)}
            onShare={() => handleShareToFeed(verse.text, verse.reference)}
            copied={copied}
          />
        )}

        {/* Verse of the Day */}
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span
              className="text-sm font-medium tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Verse of the Day
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {dailyLoading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : dailyVerse ? (
            <VerseCard
              verse={dailyVerse}
              onCopy={() => handleCopy(dailyVerse.text, dailyVerse.reference)}
              onShare={() => handleShareToFeed(dailyVerse.text, dailyVerse.reference)}
              copied={copied}
            />
          ) : (
            <p className="text-center text-muted-foreground">Could not load today's verse.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function VerseCard({
  verse,
  onCopy,
  onShare,
  copied,
}: {
  verse: VerseResult;
  onCopy: () => void;
  onShare: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm border-l-4 border-l-primary">
      <p
        className="text-lg leading-relaxed text-foreground mb-4"
        style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
      >
        "{verse.text}"
      </p>
      <p
        className="text-sm font-medium text-primary mb-6"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        — {verse.reference}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCopy}
          className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={onShare}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Share to Feed
        </button>
      </div>
    </div>
  );
}