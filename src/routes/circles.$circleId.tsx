import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AutoTextarea, WordCounter, isOverWordLimit } from "@/components/WordLimit";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { LiftConfirm, SharePrompt } from "@/components/LiftBurden";

export const Route = createFileRoute("/circles/$circleId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prayer Circle | Testimonies" },
      { name: "description", content: "A private prayer circle carrying a burden together." },
      { property: "og:title", content: "Prayer Circle | Testimonies" },
      { property: "og:description", content: "A private prayer circle carrying a burden together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CirclePage,
});

interface Overview { burden_body: string; is_anonymous: boolean; status: string; ends_at: string | null; is_author: boolean; prayed_today: number; i_prayed: boolean }
interface Member { member_id: string; role: string; display_name: string | null; avatar_url: string | null; is_masked: boolean; is_me: boolean }
interface Msg { id: string; body: string; is_update: boolean; created_at: string; display_name: string | null; avatar_url: string | null; is_masked: boolean; is_author: boolean; is_mine: boolean }

function Avatar({ name, url, masked }: { name: string; url: string | null; masked: boolean }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-medium text-foreground">
      {!masked && url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : masked ? "?" : name.charAt(0).toUpperCase()}
    </div>
  );
}

function CirclePage() {
  const { circleId } = Route.useParams();
  const navigate = useNavigate();
  const sb = supabase as any;
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "private" | "ok">("loading");
  const [ov, setOv] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [asUpdate, setAsUpdate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmLift, setConfirmLift] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? null);
    if (!u.user) return setState("private");
    const { data } = await sb.rpc("get_circle_overview", { circle: circleId });
    const o = Array.isArray(data) ? data[0] : null;
    if (!o) return setState("private");
    setOv(o);
    const [{ data: m }, { data: t }] = await Promise.all([
      sb.rpc("get_circle_members", { circle: circleId }),
      sb.rpc("get_circle_messages", { circle: circleId }),
    ]);
    setMembers(m ?? []);
    setMsgs(t ?? []);
    setState("ok");
  }, [circleId]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <Shell><p className="text-center text-sm text-muted-foreground">Loading...</p></Shell>;
  if (state === "private" || !ov) return (
    <Shell>
      <p className="text-center text-lg text-foreground" style={{ fontFamily: "'Georgia', serif" }}>This circle is private.</p>
      <p className="mt-4 text-center"><Link to="/burdens" className="text-sm text-primary hover:underline">Back to Burdens</Link></p>
    </Shell>
  );

  const ended = ov.status !== "open" || (ov.ends_at ? new Date(ov.ends_at).getTime() <= Date.now() : false);
  const lifted = ov.status === "lifted";
  const endedText = lifted ? "This burden has been lifted. Thank you for carrying it together." : "This circle has ended.";
  const daysLeft = ov.ends_at ? Math.max(0, Math.ceil((new Date(ov.ends_at).getTime() - Date.now()) / 86400000)) : null;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy || !userId || isOverWordLimit(text)) return;
    setBusy(true); setErr(null);
    const { error } = await sb.from("circle_messages").insert({ circle_id: circleId, user_id: userId, body: text, is_update: ov.is_author && asUpdate });
    setBusy(false);
    if (error) return setErr("Couldn't send. Please try again.");
    setBody(""); setAsUpdate(false); load();
  };

  const pray = async () => {
    if (!userId || ov.i_prayed || busy) return;
    setBusy(true);
    await sb.from("circle_prayers").insert({ circle_id: circleId, user_id: userId });
    setBusy(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await sb.from("circle_messages").delete().eq("id", id);
    setMsgs((x) => x.filter((m) => m.id !== id));
  };

  const report = async (id: string) => {
    if (!userId || !confirm("Report this message?")) return;
    const { error } = await sb.from("circle_reports").insert({ circle_id: circleId, message_id: id, reporter_id: userId });
    if (!error) setReported((s) => new Set(s).add(id));
  };

  const leave = async () => {
    if (!userId || !confirm("Leave this circle?")) return;
    await sb.from("circle_members").delete().eq("circle_id", circleId).eq("user_id", userId);
    navigate({ to: "/burdens" });
  };

  const extend = async () => {
    setBusy(true);
    const { error } = await sb.rpc("extend_circle", { circle: circleId });
    setBusy(false);
    if (error) setErr("Couldn't extend the circle.");
    load();
  };

  return (
    <Shell>
      <Link to="/burdens" className="text-sm text-primary hover:underline">← Burdens</Link>
      <section className="mt-4 rounded-lg border border-border bg-card p-5">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground" style={{ fontFamily: "'Georgia', serif" }}>{ov.burden_body}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{lifted ? "🕊️ Lifted" : ended ? endedText : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}</span>
          {ov.is_author && ov.status === "open" && (
            <span className="flex gap-2">
              <button onClick={() => setConfirmLift(true)} disabled={busy} className="rounded-md border border-primary/40 px-3 py-1 font-medium text-primary hover:bg-primary/10 disabled:opacity-50">Mark as lifted</button>
              <button onClick={extend} disabled={busy} className="rounded-md border border-primary/40 px-3 py-1 font-medium text-primary hover:bg-primary/10 disabled:opacity-50">Extend 7 days</button>
            </span>
          )}
          {confirmLift && (
            <LiftConfirm busy={busy} onNo={() => setConfirmLift(false)} onYes={async () => {
              setBusy(true);
              const { data, error } = await sb.rpc("lift_circle_burden", { circle: circleId });
              setBusy(false); setConfirmLift(false);
              if (!error && data) { setShareId(data as string); load(); }
            }} />
          )}
          {shareId && <SharePrompt burdenId={shareId} onClose={() => setShareId(null)} />}
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <h2 className="text-sm font-medium text-foreground">Members</h2>
          <ul className="mt-2 flex flex-wrap gap-3">
            {members.map((m) => {
              const name = m.display_name || "Member";
              return (
                <li key={m.member_id} className="flex items-center gap-2 text-sm text-foreground">
                  <Avatar name={name} url={m.avatar_url} masked={m.is_masked} />
                  <span>{name}{m.role === "author" && <span className="ml-1 text-xs text-muted-foreground">(author)</span>}{m.is_me && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <button onClick={pray} disabled={ended || ov.i_prayed || busy}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${ov.i_prayed ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"} disabled:cursor-default ${ended && !ov.i_prayed ? "opacity-50" : ""}`}>
          {ov.i_prayed ? "Prayed today ✓" : "🙏 I prayed today"}
        </button>
        <span className="text-xs text-muted-foreground">{ov.prayed_today} {ov.prayed_today === 1 ? "person" : "people"} prayed today</span>
      </section>

      <section className="mt-4 space-y-3">
        {msgs.length === 0 && <p className="text-center text-sm italic text-muted-foreground">No messages yet.</p>}
        {msgs.map((m) => {
          const name = m.display_name || "Member";
          return (
            <article key={m.id} className={`rounded-lg border p-3 ${m.is_update ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-2">
                <Avatar name={name} url={m.avatar_url} masked={m.is_masked} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{name}{m.is_update && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">Update</span>}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                </div>
                {m.is_mine ? (
                  <button onClick={() => del(m.id)} className="text-xs text-destructive hover:underline">Delete</button>
                ) : reported.has(m.id) ? (
                  <span className="text-xs text-muted-foreground">Reported</span>
                ) : (
                  <button onClick={() => report(m.id)} className="text-xs text-muted-foreground hover:underline">Report</button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.body}</p>
            </article>
          );
        })}
      </section>

      {ended ? (
        <p className="mt-4 text-center text-sm italic text-muted-foreground">{endedText}</p>
      ) : (
        <form onSubmit={send} className="mt-4 rounded-lg border border-border bg-card p-3">
          <AutoTextarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Share a prayer or encouragement..." aria-label="Message"
            className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <WordCounter text={body} />
          <div className="mt-2 flex items-center justify-between gap-2">
            {ov.is_author ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={asUpdate} onChange={(e) => setAsUpdate(e.target.checked)} className="accent-primary" /> Post as update
              </label>
            ) : <span />}
            <button type="submit" disabled={busy || !body.trim() || isOverWordLimit(body)} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Send</button>
          </div>
          {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
        </form>
      )}

      <div className="mt-6 text-center">
        <button onClick={leave} className="text-xs text-muted-foreground hover:text-destructive hover:underline">Leave circle</button>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">If you or someone here is in danger, call or text 988 (US).</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
