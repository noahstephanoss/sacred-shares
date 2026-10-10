export const WORD_LIMIT = 900;
export const SHARE_PROMPTS = ["What did God do this week?", "Where did you see Him today?"];
export const STORY_PARTS = ["Where I was", "What God did", "Where I am now"] as const;
export const REACTIONS = [
  { type: "praying", emoji: "🙏", label: "Praying" },
  { type: "amen", emoji: "✝️", label: "Amen" },
  { type: "peace", emoji: "🕊️", label: "Peace" },
] as const;
export type Reactor = { user_id: string; display_name: string | null; reaction_type: string; reacted_at: string };
export function countWords(text: string) { return text.trim() ? text.trim().split(/\s+/).length : 0; }
export function storyBody(parts: string[]) { return parts.map(p => p.trim()).join("\n\n"); }
export function reactionSummary(reactors: Reactor[], userId: string | null) {
  if (!reactors.length) return "";
  const mine = reactors.some(r => r.user_id === userId);
  const newest = [...reactors].sort((a,b) => b.reacted_at.localeCompare(a.reacted_at)).find(r => r.user_id !== userId);
  const name = mine ? "You" : newest?.display_name?.trim() || "Anonymous";
  const others = reactors.length - 1;
  return others ? `${name} and ${others} ${others === 1 ? "other" : "others"}` : name;
}
export function dailyChapter(date = new Date()) { return date.getUTCDate(); }
export function canReadStory(isPublic: boolean, authorId: string, viewerId: string | null) { return isPublic || authorId === viewerId; }