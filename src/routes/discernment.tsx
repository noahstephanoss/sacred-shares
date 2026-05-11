import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent, useCallback } from "react";
import { z } from "zod";
import { streamDiscernment, type ChatMessage } from "@/lib/ai";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageSquare, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/discernment")({
  validateSearch: z.object({
    prefill: z.string().optional(),
    context: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Nathan — Testimonies" },
      { name: "description", content: "Seek discerning counsel from Nathan — listens first, speaks with weight." },
    ],
  }),
  component: DiscernmentPage,
});

type Conversation = {
  id: string;
  title: string | null;
  updated_at: string;
  first_message?: string;
};

function formatConvDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "#FAF6EE" }}>
      <div className="p-3 border-b" style={{ borderColor: "rgba(184,134,11,0.2)" }}>
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#B8860B" }}
        >
          <Plus className="h-4 w-4" />
          New conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p
            className="px-3 py-6 text-center text-sm italic text-muted-foreground"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Your conversations with Nathan will appear here
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => {
              const active = c.id === activeId;
              const preview = (c.first_message || c.title || "New conversation").slice(0, 60);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-[#F1E9D6]"
                    style={{
                      borderLeft: active ? "3px solid #B8860B" : "3px solid transparent",
                      backgroundColor: active ? "#F1E9D6" : "transparent",
                    }}
                  >
                    <div
                      className="text-sm text-foreground line-clamp-2"
                      style={{ fontFamily: "'Georgia', serif" }}
                    >
                      {preview}
                      {(c.first_message?.length ?? 0) > 60 ? "…" : ""}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatConvDate(c.updated_at)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function DiscernmentPage() {
  const { prefill, context } = useSearch({ from: "/discernment" });
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [closingPrayer, setClosingPrayer] = useState("");
  const [loadingPrayer, setLoadingPrayer] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { count, limit, remaining, isAtLimit, increment } = useDailyLimit("discernment");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  const loadConversations = useCallback(async (uid: string) => {
    const { data: convs } = await supabase
      .from("discernment_conversations")
      .select("id, title, updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    if (!convs) return;
    const ids = convs.map((c) => c.id);
    let firstMsgByConv: Record<string, string> = {};
    if (ids.length) {
      const { data: msgs } = await supabase
        .from("discernment_messages")
        .select("conversation_id, content, created_at, role")
        .in("conversation_id", ids)
        .eq("role", "user")
        .order("created_at", { ascending: true });
      for (const m of msgs ?? []) {
        if (!firstMsgByConv[m.conversation_id]) firstMsgByConv[m.conversation_id] = m.content;
      }
    }
    setConversations(
      convs.map((c) => ({ ...c, first_message: firstMsgByConv[c.id] }))
    );
  }, []);

  useEffect(() => {
    if (userId) loadConversations(userId);
  }, [userId, loadConversations]);

  const selectConversation = useCallback(async (id: string) => {
    setActiveConvId(id);
    setClosingPrayer("");
    setMobileSidebarOpen(false);
    const { data } = await supabase
      .from("discernment_messages")
      .select("role, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages(
      (data ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
    );
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
    setClosingPrayer("");
    setInput("");
    setMobileSidebarOpen(false);
  }, []);

  // Pre-fill from nav bar redirect
  useEffect(() => {
    if (prefill && !input && messages.length === 0) {
      setInput(prefill);
    }
  }, [prefill]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const displayContent = input.trim();
    const isFirstMessage = messages.length === 0;
    const userMsg: ChatMessage = { role: "user", content: displayContent };
    const displayMessages = [...messages, userMsg];
    setMessages(displayMessages);
    setInput("");
    setIsStreaming(true);
    setError("");

    // Ensure conversation row exists
    let convId = activeConvId;
    if (!convId && userId) {
      const { data: created } = await supabase
        .from("discernment_conversations")
        .insert({ user_id: userId, title: displayContent.slice(0, 80) })
        .select("id, title, updated_at")
        .single();
      if (created) {
        convId = created.id;
        setActiveConvId(convId);
        setConversations((prev) => [
          { ...created, first_message: displayContent },
          ...prev,
        ]);
      }
    }
    if (convId && userId) {
      await supabase.from("discernment_messages").insert({
        conversation_id: convId,
        user_id: userId,
        role: "user",
        content: displayContent,
      });
    }

    // Check & increment daily limit
    const allowed = await increment();
    if (!allowed) {
      // Generate closing prayer
      setLoadingPrayer(true);
      setIsStreaming(false);
      try {
        const prayerPrompt = "Write a short 3-sentence closing prayer summarizing the spiritual themes of this conversation. Address it to God. Keep it humble and sincere.";
        let prayerText = "";
        await streamDiscernment({
          messages: [...messages, { role: "user" as const, content: prayerPrompt }],
          onDelta: (chunk) => {
            prayerText += chunk;
            setClosingPrayer(prayerText);
          },
          onDone: () => setLoadingPrayer(false),
          onError: () => {
            setClosingPrayer("Lord, thank You for this time of seeking. Guide the reflections shared here and draw this heart closer to Your truth. Amen.");
            setLoadingPrayer(false);
          },
        });
      } catch {
        setClosingPrayer("Lord, thank You for this time of seeking. Guide the reflections shared here and draw this heart closer to Your truth. Amen.");
        setLoadingPrayer(false);
      }
      return;
    }

    let assistantSoFar = "";

    await streamDiscernment({
      messages: isFirstMessage && context
        ? [{ role: "user" as const, content: `Context: ${context}. User asks: ${displayContent}` }, ...displayMessages.slice(1)]
        : displayMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      },
      onDone: async () => {
        setIsStreaming(false);
        if (convId && userId && assistantSoFar) {
          await supabase.from("discernment_messages").insert({
            conversation_id: convId,
            user_id: userId,
            role: "assistant",
            content: assistantSoFar,
          });
          await supabase
            .from("discernment_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convId);
        }
      },
      onError: (msg) => {
        setError(msg);
        setIsStreaming(false);
      },
    });
  };

  // Guest view — show auth prompt overlay
  if (authChecked && !userId) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppNav />
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="mb-6 h-14 w-14" fill="none">
            <rect x="16" y="4" width="8" height="32" rx="1.5" fill="#B8860B" />
            <rect x="4" y="14" width="32" height="8" rx="1.5" fill="#B8860B" />
          </svg>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
            Nathan
          </h2>
          <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'Georgia', serif" }}>A discerning counselor — listens first, speaks with weight.</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Seek discerning counsel. Sign in or create an account to begin.
          </p>
          <button
            onClick={openAuthPrompt}
            className="mt-6 rounded-full px-8 py-3 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Get Started
          </button>
        </div>
        <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppNav />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex md:flex-col md:border-r"
          style={{ width: "260px", borderColor: "rgba(184,134,11,0.2)" }}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            onSelect={selectConversation}
            onNew={startNewConversation}
          />
        </aside>

        {/* Mobile drawer */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Past conversations</SheetTitle>
            <ConversationList
              conversations={conversations}
              activeId={activeConvId}
              onSelect={selectConversation}
              onNew={startNewConversation}
            />
          </SheetContent>
        </Sheet>

        {/* Main chat column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="mx-auto w-full max-w-3xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
                  Nathan
                </h2>
                <p className="text-xs text-muted-foreground italic mb-1" style={{ fontFamily: "'Georgia', serif" }}>A discerning counselor — listens first, speaks with weight.</p>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: "rgba(184,134,11,0.3)", color: "#B8860B" }}
              >
                <Menu className="h-3.5 w-3.5" />
                Past conversations
              </button>
            </div>
            <div className="mt-1 h-0.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(count / limit) * 100}%`, backgroundColor: "#B8860B" }}
              />
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                Share what&apos;s on your heart. Nathan will listen first, then speak with weight.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Closing prayer when limit reached */}
          {(closingPrayer || loadingPrayer) && (
            <div className="mx-auto max-w-lg py-8 text-center">
              <div className="rounded-xl border p-8" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                {/* Gold Cross */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="mx-auto mb-4 h-10 w-10" fill="none">
                  <rect x="16" y="4" width="8" height="32" rx="1.5" fill="#B8860B" />
                  <rect x="4" y="14" width="32" height="8" rx="1.5" fill="#B8860B" />
                </svg>
                <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                  You've sought counsel today
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  The best conversations continue in prayer. Take what you've received here directly to God.
                </p>
                {loadingPrayer ? (
                  <p className="text-sm text-muted-foreground italic">Preparing a closing prayer…</p>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed italic" style={{ fontFamily: "'Georgia', serif" }}>
                    {closingPrayer}
                  </p>
                )}
                <p className="mt-6 text-xs text-muted-foreground" style={{ fontFamily: "'Georgia', serif" }}>
                  Come back tomorrow — <em>Isaiah 40:31</em>
                </p>
              </div>
            </div>
          )}

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Nathan is listening...
              </div>
            </div>
          )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border bg-card px-4 py-4">
            <form onSubmit={send} className={`mx-auto flex max-w-3xl gap-3 ${closingPrayer || loadingPrayer ? "opacity-50 pointer-events-none" : ""}`}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What's on your heart..."
                disabled={isStreaming || !!closingPrayer || loadingPrayer}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim() || !!closingPrayer || loadingPrayer}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}