import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppNav";
import { useSession } from "@/components/AuthProvider";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Testimonies Admin" },
      { name: "description", content: "Admin review of reported posts." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reports — Testimonies Admin" },
      { property: "og:description", content: "Admin review of reported posts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: ReportsPage,
});

type Row = { target_type: string; target_id: string; report_count: number; last_reported: string; body: string | null; author_name: string };
const TABLES: Record<string, "testimonies"> = { testimony: "testimonies" };

function ReportsPage() {
  const { user, isAdmin, loading } = useSession();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/home", replace: true }); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!data) navigate({ to: "/home", replace: true });
      else setChecked(true);
    });
  }, [user, loading, navigate]);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("admin_reports");
    setRows((data ?? []) as Row[]);
  }, []);
  useEffect(() => { if (checked) load(); }, [checked, load]);

  const dismiss = async (r: Row) => {
    await supabase.from("reports").delete().eq("target_type", r.target_type).eq("target_id", r.target_id);
    toast("Reports dismissed.");
    window.dispatchEvent(new Event("reports-changed"));
    load();
  };
  const remove = async (r: Row) => {
    const table = TABLES[r.target_type];
    if (table) {
      const { error } = await supabase.from(table).delete().eq("id", r.target_id);
      if (error) { toast.error("Couldn't remove that post."); return; }
    }
    await supabase.from("reports").delete().eq("target_type", r.target_type).eq("target_id", r.target_id);
    setConfirm(null);
    toast("Post removed.");
    window.dispatchEvent(new Event("reports-changed"));
    load();
  };

  if (!checked || !isAdmin) return <PageShell><p className="py-12 text-center text-sm text-muted-foreground">Loading…</p></PageShell>;

  return (
    <PageShell>
      <h1 className="font-serif text-3xl text-foreground">Reports</h1>
      {rows === null ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-3xl text-gold">✝</div>
          <p className="mt-4 font-serif text-sm italic text-muted-foreground">No reports right now.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => {
            const key = `${r.target_type}:${r.target_id}`;
            return (
              <article key={key} className="rounded-lg border border-border/70 bg-card px-6 py-5 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{r.target_type.replace("_", " ")} · {r.author_name}</span>
                  <span>{r.report_count} report{r.report_count === 1 ? "" : "s"}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.body ?? "(Post no longer available)"}</p>
                <div className="mt-4 flex gap-2">
                  {confirm === key ? (
                    <>
                      <span className="self-center text-sm text-foreground">Remove this post?</span>
                      <button onClick={() => remove(r)} className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground">Remove</button>
                      <button onClick={() => setConfirm(null)} className="rounded-md border border-border px-3 py-1.5 text-sm">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setConfirm(key)} className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground">Remove post</button>
                      <button onClick={() => dismiss(r)} className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary">Dismiss</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
