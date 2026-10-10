import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/AuthProvider";

export type ReportTarget = "testimony" | "burden" | "thinker_post" | "thinker_response" | "circle_message" | "verse_comment" | "blog_post";

/** Shows nothing on your own posts. Guests get the sign-in prompt. */
export function ReportButton({ type, id, ownerId }: { type: ReportTarget; id: string; ownerId?: string | null }) {
  const { user, requireAuth } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (user && ownerId && user.id === ownerId) return null;

  const send = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({ target_type: type, target_id: id, reporter_id: user.id });
    setBusy(false);
    setConfirming(false);
    if (error?.code === "23505") toast("You already reported this.");
    else if (error) toast.error("Couldn't send that report. Please try again.");
    else { toast("Thanks, we'll take a look."); window.dispatchEvent(new Event("reports-changed")); }
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
        <span className="text-muted-foreground">Report this?</span>
        <button disabled={busy} onClick={send} className="font-medium text-destructive hover:underline">Yes</button>
        <button onClick={() => setConfirming(false)} className="text-muted-foreground hover:underline">Cancel</button>
      </span>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (requireAuth()) setConfirming(true); }}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      Report
    </button>
  );
}
