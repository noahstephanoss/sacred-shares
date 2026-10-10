import { useCallback, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { needsCrisisSupport } from "@/lib/crisis";

/**
 * Usage: const { check, modal } = useCrisisCheck();
 * check(text, () => submit())  — runs submit right away, or after the caring popup.
 */
export function useCrisisCheck() {
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const check = useCallback((text: string, onContinue: () => void) => {
    if (needsCrisisSupport(text)) {
      pending.current = onContinue;
      setOpen(true);
    } else {
      onContinue();
    }
  }, []);

  const modal = open ? (
    <CrisisModal
      onContinue={() => { setOpen(false); pending.current?.(); pending.current = null; }}
      onBack={() => { setOpen(false); pending.current = null; }}
    />
  ) : null;

  return { check, modal };
}

export function CrisisLines({ className = "" }: { className?: string }) {
  return (
    <ul className={`space-y-2 text-sm text-foreground ${className}`}>
      <li>
        <strong>Call or text 988</strong> — Suicide &amp; Crisis Lifeline (US), 24/7.{" "}
        <a href="tel:988" className="text-primary underline">Call</a> ·{" "}
        <a href="sms:988" className="text-primary underline">Text</a>
      </li>
      <li>
        <strong>Text HOME to 741741</strong> — Crisis Text Line, 24/7.{" "}
        <a href="sms:741741&body=HOME" className="text-primary underline">Text now</a>
      </li>
      <li>If you're in immediate danger, call <a href="tel:911" className="text-primary underline">911</a>.</li>
    </ul>
  );
}

function CrisisModal({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="crisis-title">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="text-center text-2xl text-gold">✝</div>
        <h2 id="crisis-title" className="mt-2 text-center font-serif text-xl text-foreground">
          You matter, and you don't have to carry this alone.
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          If any part of you is hurting this much, please reach out to someone right now. They're kind, free, and there for you.
        </p>
        <CrisisLines className="mt-4 rounded-lg bg-secondary/60 p-4" />
        <Link to="/get-help" className="mt-3 block text-center text-sm text-primary underline">More places to get help</Link>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button onClick={onContinue} className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Continue
          </button>
          <button onClick={onBack} className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary">
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
