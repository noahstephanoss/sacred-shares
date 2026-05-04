import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent, useCallback } from "react";
import { streamDiscernment, type ChatMessage } from "@/lib/ai";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { AppNav } from "@/components/AppNav";
import { AuthPromptModal, useAuthPrompt } from "@/components/AuthPromptModal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/discernment")({
  head: () => ({
    meta: [
      { title: "Discernment Bot — Testimonies" },
      { name: "description", content: "Seek biblically grounded counsel from the Discernment Bot." },
    ],
  }),
  component: DiscernmentPage,
});

function DiscernmentPage() {
  const { showModal, openAuthPrompt, closeAuthPrompt } = useAuthPrompt();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { remaining, isAtLimit, increment } = useDailyLimit("discernment");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);
    setError("");

    // Check & increment daily limit
    const allowed = await increment();
    if (!allowed) {
      setError("You've reached your daily limit of 20 messages. Come back tomorrow.");
      setIsStreaming(false);
      return;
    }

    let assistantSoFar = "";

    await streamDiscernment({
      messages: updatedMessages,
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
      onDone: () => setIsStreaming(false),
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
            <rect x="16" y="4" width="8" height="32" rx="1.5" fill="#1C1917" />
            <rect x="4" y="14" width="32" height="8" rx="1.5" fill="#1C1917" />
          </svg>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
            Discernment Bot
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Seek biblically grounded counsel. Sign in or create an account to access the Discernment Bot.
          </p>
          <button
            onClick={openAuthPrompt}
            className="mt-6 rounded-full px-8 py-3 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: "#92400E", color: "#FDF6EC" }}
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
      <div className="mx-auto w-full max-w-3xl px-4 py-3">
        <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
          Discernment Bot
        </h2>
        <p className="text-sm text-muted-foreground">Stern counsel. Rooted in scripture. · {remaining} remaining today</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">
                Share what&apos;s on your heart. The Discernment Bot will give you
                righteous counsel grounded in scripture.
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

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Seeking counsel...
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
        <form onSubmit={send} className="mx-auto flex max-w-3xl gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's on your heart..."
            disabled={isStreaming}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
      <AuthPromptModal open={showModal} onClose={closeAuthPrompt} />
    </div>
  );
}