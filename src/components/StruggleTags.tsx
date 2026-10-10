import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MAX_TAGS = 2;
export type TagSelection = { tagIds: string[]; other: string | null };
export const emptyTags: TagSelection = { tagIds: [], other: null };
type Tag = { id: string; label: string };

/** Pure rule: max 2 picks total, "Other" counts as one. */
export function canAddTag(sel: TagSelection) {
  return sel.tagIds.length + (sel.other !== null ? 1 : 0) < MAX_TAGS;
}

/** Optional, private picker. Tags are never shown on posts — only used to match people with stories. */
export function StruggleTagPicker({ value, onChange }: { value: TagSelection; onChange: (v: TagSelection) => void }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from("struggle_tags").select("id,label").eq("active", true).order("sort_order").then(({ data }) => setTags(data ?? []));
  }, []);

  const toggle = (id: string) => {
    if (value.tagIds.includes(id)) onChange({ ...value, tagIds: value.tagIds.filter((t) => t !== id) });
    else if (canAddTag(value)) onChange({ ...value, tagIds: [...value.tagIds, id] });
  };
  const toggleOther = () => {
    if (value.other !== null) onChange({ ...value, other: null });
    else if (canAddTag(value)) onChange({ ...value, other: "" });
  };
  const count = value.tagIds.length + (value.other !== null ? 1 : 0);

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-muted-foreground hover:text-foreground">
        {open ? "Hide" : "Add"} what this is about (optional{count ? ` · ${count}/${MAX_TAGS}` : ""})
      </button>
      {open && (
        <div className="mt-2">
          <p className="mb-2 text-xs text-muted-foreground">
            Pick up to 2. These stay private — they just help us connect you with stories like yours.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const on = value.tagIds.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggle(t.id)} aria-pressed={on}
                  disabled={!on && !canAddTag(value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                </button>
              );
            })}
            <button type="button" onClick={toggleOther} aria-pressed={value.other !== null}
              disabled={value.other === null && !canAddTag(value)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${value.other !== null ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              Other
            </button>
          </div>
          {value.other !== null && (
            <input value={value.other} maxLength={100} onChange={(e) => onChange({ ...value, other: e.target.value })}
              placeholder="A word or two about it"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          )}
        </div>
      )}
    </div>
  );
}

export async function saveStruggleTags(opts: {
  postType: "testimony" | "burden" | "thinker_post"; postId: string; userId: string; isPublic: boolean; sel: TagSelection;
}) {
  const rows = [
    ...opts.sel.tagIds.slice(0, MAX_TAGS).map((tag_id) => ({ tag_id, other_note: null as string | null })),
    ...(opts.sel.other?.trim() ? [{ tag_id: null as string | null, other_note: opts.sel.other.trim().slice(0, 100) }] : []),
  ].slice(0, MAX_TAGS);
  if (!rows.length) return;
  await supabase.from("post_tags").insert(rows.map((r) => ({
    ...r, post_type: opts.postType, post_id: opts.postId, user_id: opts.userId, is_public: opts.isPublic,
  })));
}
