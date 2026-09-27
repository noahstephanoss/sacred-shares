import { forwardRef, useEffect, useImperativeHandle, useRef, type TextareaHTMLAttributes } from "react";

export const WORD_LIMIT = 900;

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function isOverWordLimit(text: string): boolean {
  return countWords(text) > WORD_LIMIT;
}

/** Textarea that grows with its content up to maxHeight, then scrolls. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { maxHeight?: number }>(
  function AutoTextarea({ maxHeight = 400, style, ...props }, ref) {
    const inner = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);
    useEffect(() => {
      const el = inner.current;
      if (!el) return;
      el.style.height = "auto";
      const h = Math.min(el.scrollHeight + 2, maxHeight);
      el.style.height = `${h}px`;
      el.style.overflowY = el.scrollHeight + 2 > maxHeight ? "auto" : "hidden";
    }, [props.value, maxHeight]);
    return <textarea ref={inner} style={style} {...props} />;
  },
);

export function WordCounter({ text, className = "" }: { text: string; className?: string }) {
  const n = countWords(text);
  const over = n > WORD_LIMIT;
  return (
    <div className={`mt-1 text-xs ${className}`} aria-live="polite">
      <span className={over ? "text-destructive" : "text-muted-foreground"}>{n} / {WORD_LIMIT} words</span>
      {over && <span className="ml-2 text-destructive">Please keep it under {WORD_LIMIT} words</span>}
    </div>
  );
}
