// One shared crisis check used by every place people write.
const PHRASES = [
  "suicide", "suicidal", "kill myself", "killing myself", "want to die", "wanna die",
  "end it all", "end my life", "self harm", "self-harm", "selfharm", "cut myself",
  "cutting myself", "hurt myself", "no reason to live", "better off dead", "don't want to be alive",
];

const RE = new RegExp(
  PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]*")).join("|"),
  "i",
);

export function needsCrisisSupport(text: string): boolean {
  return RE.test(text.replace(/[’']/g, "'"));
}
