import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Globe, HeartHandshake, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/AppNav";
import { useSession } from "@/components/AuthProvider";
import { ReportButton } from "@/components/ReportButton";
import { saveStruggleTags, type TagSelection } from "@/components/StruggleTags";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StoryComposer, type StoryDraft } from "@/components/home/StoryComposer";
import { ReactionList } from "@/components/home/ReactionList";
import { DailyProverbs } from "@/components/home/DailyProverbs";
import { REACTIONS, SHARE_PROMPTS, STORY_PARTS, reactionSummary, type Reactor } from "@/lib/home";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [
    { title: "Home — Stories of Faith | Testimonies" },
    { name: "description", content: "Share what God is doing, pray with others, and read a daily chapter of Proverbs." },
    { property: "og:title", content: "Home — Stories of Faith | Testimonies" },
    { property: "og:description", content: "Share what God is doing, pray with others, and read a daily chapter of Proverbs." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: HomePage,
});
type Testimony = StoryDraft & { id: string; user_id: string; created_at: string; author_name: string; avatar_url: string | null };
function HomePage() {
  const { user, loading: authLoading, requireAuth, isAdmin } = useSession();
  const userId = user?.id ?? null;
  const navigate = useNavigate();
  const [stories,setStories] = useState<Testimony[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(false);
  const [more,setMore] = useState(false);
  const [page,setPage] = useState(0);
  const [prompt,setPrompt] = useState(SHARE_PROMPTS[0]);
  const [composer,setComposer] = useState<{mode:"quick"|"full"; story?:Testimony} | null>(null);
  const [shareMenu,setShareMenu] = useState(false);
  const [newIds,setNewIds] = useState<string[]>([]);
  const [date,setDate] = useState(new Date());
  const [officialBody,setOfficialBody] = useState<string>();
  const day = date.toISOString().slice(0,10);
  const loadVersion=useRef(0);
  const visibleIds=useRef(new Set<string>());
  const [remove,setRemove] = useState<Testimony|null>(null);
  const [deleting,setDeleting] = useState(false);
  const load = useCallback(async (pageNumber=0) => {
    const version=++loadVersion.current;
    setLoading(true); setError(false);
    let query = supabase.from("testimonies").select("id,user_id,body,is_public,created_at,story_format,where_i_was,what_god_did,where_i_am_now").order("created_at",{ascending:false}).order("id").range(pageNumber*30,pageNumber*30+30);
    query = userId ? query.or(`is_public.eq.true,user_id.eq.${userId}`) : query.eq("is_public",true);
    const {data:rows,error:err}=await query;
    if(version!==loadVersion.current)return;
    if(err){setError(true);setLoading(false);return;}
    const slice=(rows??[]).slice(0,30);
    const ids=[...new Set(slice.map(t=>t.user_id))];
    const {data:profiles}=ids.length ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id",ids) : {data:[]};
    if(version!==loadVersion.current)return;
    const byId=new Map((profiles??[]).map(p=>[p.user_id,p]));
    const list=slice.map(t=>({...t,story_format:t.story_format==="full" ? "full" as const:"quick" as const,author_name:byId.get(t.user_id)?.display_name?.trim()||"Anonymous",avatar_url:byId.get(t.user_id)?.avatar_url??null}));
    setStories(list); visibleIds.current=new Set(list.map(t=>t.id));setMore((rows?.length??0)>30);setPage(pageNumber);setLoading(false);
  },[userId]);
  useEffect(()=>{setPrompt(SHARE_PROMPTS[Math.floor(Math.random()*SHARE_PROMPTS.length)]);const timer=window.setInterval(()=>setDate(new Date()),60000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{setStories([]);visibleIds.current.clear();setNewIds([]);if(!authLoading)void load();return()=>{loadVersion.current++;};},[load,authLoading]);
  useEffect(()=>{supabase.from("home_official_posts").select("body").eq("publish_date",day).maybeSingle().then(({data})=>setOfficialBody(data?.body));},[day,isAdmin]);
  useEffect(()=>{
    const channel=supabase.channel(`home-public-${userId??"guest"}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"testimonies",filter:"is_public=eq.true"},payload=>{
      const row=payload.new;
      if(row.user_id===userId || row.is_public!==true || typeof row.id!=="string" || visibleIds.current.has(row.id))return;
      const id=row.id;setNewIds(ids=>ids.includes(id) ? ids : [...ids,id]);
    }).subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[userId]);
  const openComposer=(mode:"quick"|"full")=>{if(requireAuth())setComposer({mode});};
  const save=async(draft:StoryDraft,tags:TagSelection)=>{
    if(!requireAuth()||!userId)return false;
    try {
      if(composer?.story){const {error}=await supabase.from("testimonies").update({...draft,title:draft.body.slice(0,60)}).eq("id",composer.story.id).eq("user_id",userId);if(error)throw error;}
      else {const {data,error}=await supabase.from("testimonies").insert({...draft,title:draft.body.slice(0,60),user_id:userId}).select("id").single();if(error)throw error;if(data)await saveStruggleTags({postType:"testimony",postId:data.id,userId,isPublic:draft.is_public,sel:tags});}
      await load();toast.success(composer?.story ? "Testimony updated.":draft.is_public ? "Your testimony is shared.":"Your private testimony is saved.");return true;
    }catch{toast.error("Your testimony couldn’t be saved. Please try again.");return false;}
  };
  const saveOfficial=async(body:string|null)=>{
    if(!requireAuth()||!userId||!isAdmin)return false;
    const result=body===null ? await supabase.from("home_official_posts").delete().eq("publish_date",day) : await supabase.from("home_official_posts").upsert({publish_date:day,body,created_by:userId},{onConflict:"publish_date"});
    if(result.error){toast.error("The official post couldn’t be saved.");return false;}setOfficialBody(body??undefined);toast.success("Official post updated.");return true;
  };
  return <PageShell>
    <div className="mb-7"><p className="mb-2 text-xs text-gold">TOGETHER IN FAITH</p><h1 className="font-serif text-3xl text-foreground">Home</h1><p className="mt-2 text-sm text-muted-foreground">Stories of what God is doing among us.</p></div>
    <div className="mb-7 border-y border-border/70 py-5"><div className="flex items-center gap-3"><Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="bg-secondary text-primary"><Plus className="h-4 w-4"/></AvatarFallback></Avatar><Button variant="ghost" className="h-auto min-h-10 flex-1 justify-start whitespace-normal px-0 text-left font-normal text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={()=>openComposer("quick")}>{prompt}</Button><DropdownMenu open={shareMenu} onOpenChange={open=>{if(!open || requireAuth())setShareMenu(open);}}><DropdownMenuTrigger asChild><Button>Share <ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>openComposer("quick")}><Pencil/>Testimony · Quick share</DropdownMenuItem><DropdownMenuItem onSelect={()=>openComposer("full")}><Pencil/>Testimony · Full story</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>{if(requireAuth())navigate({to:"/burdens"});}}><HeartHandshake/>Prayer request</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
    {newIds.length>0 && <div className="sticky top-20 z-20 mb-5 flex justify-center"><Button size="sm" className="rounded-full shadow-md" onClick={async()=>{await load();setNewIds([]);window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant":"smooth"});}}><ArrowUp/>{newIds.length} new {newIds.length===1 ? "testimony":"testimonies"}</Button></div>}
    <div className="space-y-5"><DailyProverbs key={day} date={date} isAdmin={isAdmin} customBody={officialBody} save={saveOfficial}/>
      {loading || authLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading testimonies…</p> : error ? <div className="py-10 text-center"><p className="mb-3 text-sm text-muted-foreground">We couldn’t load the stories right now.</p><Button variant="outline" onClick={()=>load(page)}>Try again</Button></div> : <>{stories.map(t=><article key={t.id} className="rounded-lg border border-border/70 bg-card px-5 py-6 shadow-sm transition-transform hover:-translate-y-0.5 active:-translate-y-0.5 motion-reduce:transform-none sm:px-6"><div className="mb-5 flex items-center gap-3"><Avatar className="h-10 w-10 shrink-0"><AvatarImage src={t.avatar_url??undefined} alt={t.author_name}/><AvatarFallback className="bg-secondary text-primary">{t.author_name.split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="break-words font-serif text-base font-semibold">{t.author_name}</p><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><time dateTime={t.created_at}>{new Date(t.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</time>{t.is_public ? <Globe className="h-3 w-3" aria-label="Public"/>:<span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5"><Lock className="h-3 w-3"/>Private</span>}</div></div>{t.user_id===userId && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Testimony options"><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>{if(requireAuth())setComposer({mode:t.story_format,story:t});}}><Pencil/>Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={()=>{if(requireAuth())setRemove(t);}}><Trash2/>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div>
        {t.story_format==="full" ? <div className="space-y-5">{[t.where_i_was,t.what_god_did,t.where_i_am_now].map((part,i)=><div key={i}><h2 className="mb-2 font-serif text-lg text-primary">{STORY_PARTS[i]}</h2><p className="whitespace-pre-wrap break-words text-sm leading-7">{part}</p></div>)}</div>:<p className="whitespace-pre-wrap break-words text-sm leading-7">{t.body}</p>}
        <StoryReactions testimonyId={t.id} userId={userId} requireAuth={requireAuth}/><div className="mt-2 flex justify-end"><ReportButton type="testimony" id={t.id} ownerId={t.user_id}/></div>
      </article>)}{!stories.length && <p className="py-8 text-center font-serif text-sm italic text-muted-foreground">There’s room for your story here.</p>}
      <div className="py-10 text-center"><span className="text-2xl text-gold">✝</span><h2 className="mt-3 font-serif text-xl">{more ? "A moment to pause":"You’re all caught up"}</h2><blockquote className="scripture mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">“Be still, and know that I am God.”<cite className="mt-2 block text-xs not-italic">Psalm 46:10</cite></blockquote>{more && <Button variant="outline" className="mt-5" onClick={async()=>{await load(page+1);window.scrollTo({top:0,behavior:"instant"});}}>Read earlier testimonies</Button>}{page>0 && <Button variant="link" className="mt-4" onClick={()=>load(0)}>Back to latest</Button>}</div></>}
    </div>
    {composer && <StoryComposer key={composer.story?.id??composer.mode} open onClose={()=>setComposer(null)} mode={composer.mode} initial={composer.story} prompt={prompt} save={save}/>}
    <Dialog open={!!remove} onOpenChange={v=>{if(!v&&!deleting)setRemove(null);}}><DialogContent className="w-[calc(100%-2rem)] rounded-lg bg-card"><DialogTitle>Delete this testimony?</DialogTitle><DialogDescription>This removes your story and its reactions. It can’t be undone.</DialogDescription><div className="flex justify-end gap-2"><Button variant="outline" disabled={deleting} onClick={()=>setRemove(null)}>Keep it</Button><Button variant="destructive" disabled={deleting} onClick={async()=>{if(!remove||!userId||!requireAuth())return;setDeleting(true);try{const {error}=await supabase.from("testimonies").delete().eq("id",remove.id).eq("user_id",userId);if(error)throw error;setRemove(null);await load(page);toast.success("Testimony deleted.");}catch{toast.error("Couldn’t delete your testimony.");}finally{setDeleting(false);}}}>{deleting ? "Deleting…":"Delete testimony"}</Button></div></DialogContent></Dialog>
  </PageShell>;
}
function StoryReactions({testimonyId,userId,requireAuth}:{testimonyId:string;userId:string|null;requireAuth:()=>boolean}) {
  const [reactors,setReactors]=useState<Reactor[]>([]);const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [pop,setPop]=useState<string|null>(null);
  const load=useCallback(async()=>{const {data,error}=await supabase.rpc("get_testimony_reactors",{_testimony_id:testimonyId});if(!error)setReactors(data??[]);},[testimonyId]);
  useEffect(()=>{void load();},[load,userId]);
  useEffect(()=>{if(!pop)return;const timer=window.setTimeout(()=>setPop(null),250);return()=>window.clearTimeout(timer);},[pop]);
  const toggle=async(type:string)=>{
    if(!requireAuth()||!userId||busy)return;
    const before=reactors;const previous=before.find(r=>r.user_id===userId);const remove=previous?.reaction_type===type;
    setBusy(true);setPop(type);setReactors([...before.filter(r=>r.user_id!==userId),...(remove ? []:[{user_id:userId,display_name:"You",reaction_type:type,reacted_at:new Date().toISOString()}])]);
    try{
      if(previous){const {error}=await supabase.from("testimony_reactions").delete().eq("testimony_id",testimonyId).eq("user_id",userId);if(error)throw error;}
      if(!remove){const {error}=await supabase.from("testimony_reactions").insert({testimony_id:testimonyId,user_id:userId,type});if(error){if(previous)await supabase.from("testimony_reactions").insert({testimony_id:testimonyId,user_id:userId,type:previous.reaction_type});throw error;}}
      await load();
    }catch{setReactors(before);toast.error("Your reaction couldn’t be saved. Please try again.");}finally{setBusy(false);}
  };
  const summary=reactionSummary(reactors,userId);
  return <><div className="mt-6 flex flex-wrap gap-2">{REACTIONS.map(r=>{const active=reactors.some(x=>x.user_id===userId&&x.reaction_type===r.type);const count=reactors.filter(x=>x.reaction_type===r.type).length;return <Button key={r.type} variant="outline" size="sm" disabled={busy} aria-pressed={active} onClick={()=>toggle(r.type)} className={`rounded-full px-3 ${active ? "border-primary bg-primary/10":"border-border bg-transparent text-muted-foreground"} ${pop===r.type ? "animate-reaction-pop":""}`}><span>{r.emoji}</span>{r.label}{count>0 && <span>{count}</span>}</Button>;})}</div>{summary && <Button variant="link" className="mt-2 h-auto max-w-full justify-start whitespace-normal px-0 text-left text-xs text-muted-foreground" onClick={()=>{setOpen(true);void load();}}>{summary}</Button>}<ReactionList key={open?"open":"closed"} reactors={reactors} userId={userId} open={open} onClose={()=>setOpen(false)}/></>;
}
