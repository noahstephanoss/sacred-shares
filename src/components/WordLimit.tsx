import { useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { countWords, WORD_LIMIT } from "@/lib/home";
export function AutoTextarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 400)}px`; }, [props.value]);
  return <textarea {...props} ref={ref} className={`min-h-24 max-h-[400px] w-full resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 ${className}`} />;
}
export function WordCounter({ text, total }: { text: string; total?: number }) {
  const count = countWords(text); const over = (total ?? count) > WORD_LIMIT;
  return <div className={`mt-1.5 text-xs ${over ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite"><span>{count} / {WORD_LIMIT} words</span>{over && <p className="mt-1">Please keep it under 900 words</p>}</div>;
}