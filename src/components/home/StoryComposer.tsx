import { useEffect, useState } from "react";
import { Globe, Lock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AutoTextarea, WordCounter } from "@/components/WordLimit";
import { StruggleTagPicker, emptyTags, type TagSelection } from "@/components/StruggleTags";
import { useCrisisCheck } from "@/components/CrisisSupport";
import { countWords, STORY_PARTS, storyBody } from "@/lib/home";
export type StoryDraft = { body: string; story_format: "quick" | "full"; where_i_was: string | null; what_god_did: string | null; where_i_am_now: string | null; is_public: boolean };
export function StoryComposer({ open, onClose, mode, initial, prompt, save }: {
  open: boolean; onClose: () => void; mode: "quick" | "full"; initial?: StoryDraft; prompt: string;
  save: (draft: StoryDraft, tags: TagSelection) => Promise<boolean>;
}) {
  const [body,setBody] = useState(initial?.body ?? "");
  const [parts,setParts] = useState([initial?.where_i_was ?? "",initial?.what_god_did ?? "",initial?.where_i_am_now ?? ""]);
  const [isPublic,setPublic] = useState(initial?.is_public ?? true);
  const [tags,setTags] = useState(emptyTags);
  const [saving,setSaving] = useState(false);
  const {check,modal} = useCrisisCheck();
  const text = mode === "full" ? storyBody(parts) : body.trim();
  const valid = countWords(text) <= 900 && !!text && (mode !== "full" || parts.every(p => !!p.trim()));
  useEffect(() => { if (!open) setSaving(false); },[open]);
  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try { const ok = await save({ body: text, story_format: mode, where_i_was: mode === "full" ? parts[0].trim() : null, what_god_did: mode === "full" ? parts[1].trim() : null, where_i_am_now: mode === "full" ? parts[2].trim() : null, is_public:isPublic },tags); if (ok) onClose(); }
    finally { setSaving(false); }
  };
  return <><Dialog open={open} onOpenChange={v => { if (!v && !saving) onClose(); }}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-card" aria-describedby="story-description"><DialogTitle className="font-serif text-2xl">{initial ? "Edit testimony" : mode === "full" ? "Your full testimony" : "Share a testimony"}</DialogTitle><DialogDescription id="story-description">{mode === "full" ? "Where I was · What God did · Where I am now" : prompt}</DialogDescription><form onSubmit={e => { e.preventDefault(); if (valid) check(text,submit); }}>
    {mode === "quick" ? <><label htmlFor="story-body" className="sr-only">Your testimony</label><AutoTextarea id="story-body" value={body} onChange={e => setBody(e.target.value)} placeholder={prompt} rows={4}/><WordCounter text={body}/></> : <div className="space-y-5">{STORY_PARTS.map((label,i) => <div key={label}><label htmlFor={`story-part-${i}`} className="mb-2 block font-serif text-base">{label}</label><AutoTextarea id={`story-part-${i}`} value={parts[i]} onChange={e => setParts(p => p.map((v,n) => n===i ? e.target.value : v))} rows={3}/><WordCounter text={parts[i]} total={countWords(text)}/></div>)}<p className={`text-xs ${countWords(text)>900 ? "text-destructive" : "text-muted-foreground"}`}>{countWords(text)} / 900 words total</p></div>}
    {!initial && <StruggleTagPicker value={tags} onChange={setTags}/>}
    <fieldset className="mt-5"><legend className="mb-2 text-xs text-muted-foreground">Who can read this?</legend><div className="flex gap-2"><Button type="button" variant={isPublic ? "secondary":"outline"} size="sm" aria-pressed={isPublic} onClick={() => setPublic(true)}><Globe/>Public</Button><Button type="button" variant={!isPublic ? "secondary":"outline"} size="sm" aria-pressed={!isPublic} onClick={() => setPublic(false)}><Lock/>Private</Button></div>{!isPublic && <p className="mt-2 text-xs text-muted-foreground">Only you can read this testimony.</p>}</fieldset>
    <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={!valid || saving}>{saving && <LoaderCircle className="animate-spin"/>}{saving ? "Saving…" : initial ? "Save changes":"Share testimony"}</Button></div>
  </form></DialogContent></Dialog>{modal}</>;
}