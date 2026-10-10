import { describe,expect,it } from "vitest";
import { canReadStory,countWords,dailyChapter,storyBody,reactionSummary, type Reactor } from "./home";
describe("Home rules",()=>{
  it("allows 900 whitespace-separated words but not 901",()=>{expect(countWords(" word\n".repeat(900))).toBe(900);expect(countWords("word ".repeat(901))).toBeGreaterThan(900);expect(countWords(" \t\n")).toBe(0);});
  it("counts all three testimony parts together",()=>{expect(countWords(storyBody(["word ".repeat(300),"word ".repeat(300),"word ".repeat(301)]))).toBe(901);});
  it("keeps private stories author-only",()=>{expect(canReadStory(false,"author","other")).toBe(false);expect(canReadStory(false,"author",null)).toBe(false);expect(canReadStory(false,"author","author")).toBe(true);});
  it("matches the chapter to the calendar day, including the 27th",()=>{expect(dailyChapter(new Date("2026-09-27T12:00:00Z"))).toBe(27);expect(dailyChapter(new Date("2026-10-31T12:00:00Z"))).toBe(31);});
  it("prefers You, otherwise the most recent reactor, with singular other",()=>{const r:Reactor[]=[{user_id:"a",display_name:"Sarah",reaction_type:"amen",reacted_at:"2026-10-01"},{user_id:"b",display_name:"John",reaction_type:"peace",reacted_at:"2026-10-02"}];expect(reactionSummary(r,"a")).toBe("You and 1 other");expect(reactionSummary(r,null)).toBe("John and 1 other");expect(reactionSummary(r.slice(0,1),"a")).toBe("You");expect(reactionSummary([],null)).toBe("");});
});