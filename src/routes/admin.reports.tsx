import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports — Testimonies Admin" },
      { name: "description", content: "Admin review of reported burdens and prayer circle messages." },
      { property: "og:title", content: "Reports — Testimonies Admin" },
      { property: "og:description", content: "Admin review of reported burdens and prayer circle messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

type BurdenRow = { burden_id: string; body: string; is_anonymous: boolean; created_at: string; author_name: string; report_count: number };
type MsgRow = { message_id: string; circle_id: string; body: string; created_at: string; author_name: string; circle_burden: string; report_count: number };

const fmt = (d: string) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function ReportsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"burdens" | "messages">("burdens");
  const [burdens, setBurdens] = useState<BurdenRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [confirm, setConfirm] = useState<{ kind: "burden" | "message"; id: string } | null>(null);

  const load = useCallback(async () => {
    const [b, m] = await Promise.all([
      supabase.rpc("admin_burden_reports" as never),
      supabase.rpc("admin_circle_reports" as never),
    ]);
    setBurdens(((b.data as unknown) as BurdenRow[]) ?? []);
    setMessages(((m.data as unknown) as MsgRow[]) ?? []);
    window.dispatchEvent(new Event("reports-changed"));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate({ to: "/home", replace: true });
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (data !== true) return navigate({ to: "/home", replace: true });
      await load();
      setReady(true);
    })();
  }, [navigate, load]);

  const remove = async () => {
    if (!confirm) return;
    const { error } = confirm.kind === "burden"
      ? await supabase.from("burdens").delete().eq("id", confirm.id)
      : await supabase.from("circle_messages").delete().eq("id", confirm.id);
    setConfirm(null);
    if (error) return toast("Couldn't remove the post.");
    toast("Post removed.");
    load();
  };

  const dismiss = async (kind: "burden" | "message", id: string) => {
    const { error } = kind === "burden"
      ? await supabase.from("burden_reports").delete().eq("burden_id", id)
      : await supabase.from("circle_reports").delete().eq("message_id", id);
    if (error) return toast("Couldn't dismiss the reports.");
    toast("Reports dismissed.");
    load();
  };

  if (!ready) return <div className="min-h-screen bg-background"><AppNav /></div>;

  const items = tab === "burdens" ? burdens : messages;
  const btn = "rounded-full px-4 py-1.5 text-xs font-medium transition-colors";

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Reports</h1>
        <div className="mt-5 flex gap-2 border-b border-border">
          {([["burdens", "Burdens", burdens.length], ["messages", "Circle messages", messages.length]] as const).map(([k, label, n]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label} ({n})
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <EmptyState verse="Blessed are the peacemakers, for they shall be called the children of God." reference="Matthew 5:9" description="No reports right now." />
        ) : (
          <div className="mt-6 space-y-4">
            {tab === "burdens" && burdens.map((b) => (
              <article key={b.burden_id} className="rounded-lg border border-border/70 bg-card px-6 py-5 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{b.author_name}</span>
                  {b.is_anonymous && <span className="rounded-full bg-muted px-2 py-0.5">Anonymous post</span>}
                  <span>· {fmt(b.created_at)}</span>
                  <span className="ml-auto font-medium text-destructive">{b.report_count} report{b.report_count === 1 ? "" : "s"}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{b.body}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setConfirm({ kind: "burden", id: b.burden_id })} className={`${btn} bg-destructive text-destructive-foreground hover:bg-destructive/90`}>Remove post</button>
                  <button onClick={() => dismiss("burden", b.burden_id)} className={`${btn} border border-border text-foreground hover:bg-secondary`}>Dismiss</button>
                </div>
              </article>
            ))}
            {tab === "messages" && messages.map((m) => (
              <article key={m.message_id} className="rounded-lg border border-border/70 bg-card px-6 py-5 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.author_name}</span>
                  <span>· {fmt(m.created_at)}</span>
                  <span className="ml-auto font-medium text-destructive">{m.report_count} report{m.report_count === 1 ? "" : "s"}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">{m.body}</p>
                <p className="mt-3 line-clamp-2 text-xs italic text-muted-foreground">Circle for: "{m.circle_burden}"</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setConfirm({ kind: "message", id: m.message_id })} className={`${btn} bg-destructive text-destructive-foreground hover:bg-destructive/90`}>Remove post</button>
                  <button onClick={() => dismiss("message", m.message_id)} className={`${btn} border border-border text-foreground hover:bg-secondary`}>Dismiss</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-medium text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Remove this post?</p>
            <p className="mt-2 text-sm text-muted-foreground">It will be deleted permanently, along with its reports.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className={`${btn} border border-border text-foreground hover:bg-secondary`}>Cancel</button>
              <button onClick={remove} className={`${btn} bg-destructive text-destructive-foreground hover:bg-destructive/90`}>Remove post</button>
            </div>
          </div>
        </div>
      )}
      <Toaster position="bottom-center" />
    </div>
  );
}
