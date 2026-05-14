import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/bible")({
  head: () => ({
    meta: [
      { title: "Bible — Testimonies" },
      { name: "description", content: "Search scripture and discover the verse of the day." },
      { property: "og:title", content: "Bible — Testimonies" },
      { property: "og:description", content: "Search scripture and discover the verse of the day." },
      { property: "og:url", content: "https://testimonies.chat/bible" },
    ],
  }),
  component: BiblePage,
});

// ── Bible book data ──
const OT_BOOKS: [string, number][] = [
  ["Genesis",50],["Exodus",40],["Leviticus",27],["Numbers",36],["Deuteronomy",34],
  ["Joshua",24],["Judges",21],["Ruth",4],["1 Samuel",31],["2 Samuel",24],
  ["1 Kings",22],["2 Kings",25],["1 Chronicles",29],["2 Chronicles",36],
  ["Ezra",10],["Nehemiah",13],["Esther",10],["Job",42],["Psalms",150],
  ["Proverbs",31],["Ecclesiastes",12],["Song of Solomon",8],["Isaiah",66],
  ["Jeremiah",52],["Lamentations",5],["Ezekiel",48],["Daniel",12],
  ["Hosea",14],["Joel",3],["Amos",9],["Obadiah",1],["Jonah",4],
  ["Micah",7],["Nahum",3],["Habakkuk",3],["Zephaniah",3],["Haggai",2],
  ["Zechariah",14],["Malachi",4],
];
const NT_BOOKS: [string, number][] = [
  ["Matthew",28],["Mark",16],["Luke",24],["John",21],["Acts",28],
  ["Romans",16],["1 Corinthians",16],["2 Corinthians",13],["Galatians",6],
  ["Ephesians",6],["Philippians",4],["Colossians",4],["1 Thessalonians",5],
  ["2 Thessalonians",3],["1 Timothy",6],["2 Timothy",4],["Titus",3],
  ["Philemon",1],["Hebrews",13],["James",5],["1 Peter",5],["2 Peter",3],
  ["1 John",5],["2 John",1],["3 John",1],["Jude",1],["Revelation",22],
];

const DAILY_VERSES = [
  "John 3:16","Psalm 23:1-6","Romans 8:28","Philippians 4:13","Jeremiah 29:11",
  "Proverbs 3:5-6","Isaiah 41:10","Matthew 11:28-30","Romans 12:2","Psalm 46:10",
  "2 Timothy 1:7","Galatians 5:22-23","Hebrews 11:1","James 1:5","1 Corinthians 13:4-7",
  "Psalm 119:105","Matthew 6:33","Ephesians 2:8-9","Joshua 1:9","Isaiah 40:31",
  "Psalm 37:4","Romans 5:8","Colossians 3:23","Micah 6:8","Lamentations 3:22-23",
  "Psalm 139:14","Matthew 5:16","2 Corinthians 5:17","1 Peter 5:7","Psalm 34:8",
];

type VerseResult = { reference: string; text: string };
type APIVerse = { verse: number; text: string };
type ChapterResult = { reference: string; verses: APIVerse[] };
type Comment = { id: string; comment_body: string; created_at: string; display_name: string | null };

const SERIF = "'Georgia', serif";

function BiblePage() {
  const navigate = useNavigate();
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Search
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<VerseResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [copied, setCopied] = useState(false);

  // Verse of the day
  const [dailyVerse, setDailyVerse] = useState<VerseResult | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const todayRef = DAILY_VERSES[(new Date().getDate() - 1) % DAILY_VERSES.length];
  useEffect(() => {
    fetch(`https://bible-api.com/${encodeURIComponent(todayRef)}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setDailyVerse({ reference: d.reference, text: d.text.trim() }); })
      .catch(() => {})
      .finally(() => setDailyLoading(false));
  }, []);

  // Book browser
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapterCount, setSelectedChapterCount] = useState(0);
  const [chapterData, setChapterData] = useState<ChapterResult | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  function selectBook(name: string, chapters: number) {
    setSelectedBook(name);
    setSelectedChapterCount(chapters);
    setChapterData(null);
    setComments([]);
  }

  async function loadChapter(book: string, chapter: number) {
    setChapterLoading(true);
    setChapterData(null);
    setComments([]);
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}`);
      const data = await res.json();
      if (!data.error) {
        setChapterData({ reference: data.reference, verses: data.verses ?? [] });
        loadComments(book, chapter);
      }
    } catch {}
    setChapterLoading(false);
  }

  async function loadComments(book: string, chapter: number) {
    const { data } = await supabase
      .from("verse_comments")
      .select("id, comment_body, created_at, user_id")
      .eq("book", book)
      .eq("chapter", chapter)
      .order("created_at", { ascending: true });
    if (!data || data.length === 0) { setComments([]); return; }
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    const nameMap = new Map((profiles ?? []).map(p => [p.user_id, p.display_name]));
    setComments(data.map(c => ({ id: c.id, comment_body: c.comment_body, created_at: c.created_at, display_name: nameMap.get(c.user_id) ?? "Anonymous" })));
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!userId) { openAuthPrompt(); return; }
    if (!commentBody.trim() || !chapterData || !selectedBook) return;
    const chapterNum = parseInt(chapterData.reference.split(" ").pop() ?? "1");
    setCommentSubmitting(true);
    await supabase.from("verse_comments").insert({
      user_id: userId,
      book: selectedBook,
      chapter: chapterNum,
      comment_body: commentBody.trim(),
    });
    setCommentBody("");
    setCommentSubmitting(false);
    if (selectedBook) loadComments(selectedBook, chapterNum);
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error();
      setSearchResult({ reference: data.reference, text: data.text.trim() });
    } catch {
      setSearchError('Verse not found. Try a reference like "John 3:16" or "Psalm 23:1-6".');
    }
    setSearchLoading(false);
  }

  function handleCopy(text: string, ref: string) {
    navigator.clipboard.writeText(`"${text}" — ${ref}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareToFeed(text: string, ref: string) {
    navigate({ to: "/feed", search: { prefill: `"${text}" — ${ref}` } as any });
  }

  function goBack() {
    if (chapterData) { setChapterData(null); setComments([]); }
    else { setSelectedBook(null); }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2" style={{ fontFamily: SERIF }}>The Word</h1>
          <p className="text-muted-foreground" style={{ fontFamily: SERIF }}>Search scripture — let the Word speak</p>
        </div>

        {/* Search bar (kept as-is) */}
        <form onSubmit={handleSearch} className="mb-10">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search a verse — e.g. John 3:16'
              aria-label="Search scripture"
              className="flex-1 rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontFamily: SERIF }}
            />
            <button type="submit" disabled={searchLoading} className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {searchLoading ? "…" : "Search"}
            </button>
          </div>
        </form>

        {searchError && (
          <div className="mb-8">
            <EmptyState
              verse="Seek and you will find"
              reference="Matthew 7:7"
              description='Try searching a book name, verse reference, or keyword.'
            />
          </div>
        )}

        {searchResult && (
          <div className="mb-10">
            <VerseCard verse={searchResult} onCopy={() => handleCopy(searchResult.text, searchResult.reference)} onShare={() => handleShareToFeed(searchResult.text, searchResult.reference)} copied={copied} />
          </div>
        )}

        {/* Verse of the Day */}
        <div className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: SERIF }}>Verse of the Day</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {dailyLoading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : dailyVerse ? (
            <VerseCard verse={dailyVerse} onCopy={() => handleCopy(dailyVerse.text, dailyVerse.reference)} onShare={() => handleShareToFeed(dailyVerse.text, dailyVerse.reference)} copied={copied} />
          ) : (
            <p className="text-center text-muted-foreground">Could not load today's verse.</p>
          )}
        </div>

        {/* ── Book Browser ── */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground" style={{ fontFamily: SERIF }}>Browse the Bible</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {!selectedBook && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <BookColumn title="Old Testament" books={OT_BOOKS} onSelect={selectBook} />
            <BookColumn title="New Testament" books={NT_BOOKS} onSelect={selectBook} />
          </div>
        )}

        {selectedBook && !chapterData && (
          <div>
            <button onClick={goBack} className="mb-4 text-sm text-primary hover:underline">← All Books</button>
            <h2 className="text-2xl font-bold text-foreground mb-4" style={{ fontFamily: SERIF }}>{selectedBook}</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: selectedChapterCount }, (_, i) => i + 1).map(ch => (
                <button key={ch} onClick={() => loadChapter(selectedBook, ch)} className="h-10 w-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                  {ch}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedBook && chapterLoading && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Loading chapter…</p>
          </div>
        )}

        {selectedBook && chapterData && (
          <div>
            <button onClick={goBack} className="mb-4 text-sm text-primary hover:underline">← {selectedBook} chapters</button>
            <h2 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: SERIF }}>{chapterData.reference}</h2>
            <div className="rounded-xl border border-border bg-card p-6 md:p-10 border-l-4 border-l-primary">
              {chapterData.verses.map(v => (
                <span key={v.verse} className="leading-[1.9] text-foreground" style={{ fontFamily: SERIF }}>
                  <sup className="mr-1 text-xs font-bold text-primary">{v.verse}</sup>
                  {v.text.trim()}{" "}
                </span>
              ))}
            </div>

            {/* Comments section */}
            <div className="mt-10">
              <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: SERIF }}>Notes & Reflections</h3>

              {comments.length > 0 && (
                <div className="space-y-3 mb-6">
                  {comments.map(c => (
                    <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm text-foreground mb-1">{c.comment_body}</p>
                      <p className="text-xs text-muted-foreground">{c.display_name} · {new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={submitComment} className="flex gap-3">
                <input
                  type="text"
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  placeholder={userId ? "Share a reflection on this chapter…" : "Sign in to leave a note…"}
                  aria-label="Leave a reflection on this chapter"
                  className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  onFocus={() => { if (!userId) openAuthPrompt(); }}
                />
                <button type="submit" disabled={commentSubmitting || !commentBody.trim()} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  Post
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}

// ── Sub-components ──

function BookColumn({ title, books, onSelect }: { title: string; books: [string, number][]; onSelect: (name: string, ch: number) => void }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: SERIF }}>{title}</h3>
      <div className="flex flex-col gap-1">
        {books.map(([name, chapters]) => (
          <button key={name} onClick={() => onSelect(name, chapters)} className="text-left rounded-md px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function VerseCard({ verse, onCopy, onShare, copied }: { verse: VerseResult; onCopy: () => void; onShare: () => void; copied: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm border-l-4 border-l-primary">
      <p className="text-lg leading-relaxed text-foreground mb-4" style={{ fontFamily: SERIF, fontStyle: "italic" }}>
        "{verse.text}"
      </p>
      <p className="text-sm font-medium text-primary mb-6" style={{ fontFamily: SERIF }}>— {verse.reference}</p>
      <div className="flex gap-3">
        <button onClick={onCopy} className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button onClick={onShare} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Share to Feed
        </button>
      </div>
    </div>
  );
}