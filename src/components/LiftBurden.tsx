import { useNavigate } from "@tanstack/react-router";

function Dialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-card px-6 py-8 text-center shadow-xl">{children}</div>
    </div>
  );
}

export function LiftConfirm({ onYes, onNo, busy }: { onYes: () => void; onNo: () => void; busy?: boolean }) {
  return (
    <Dialog onClose={onNo}>
      <p className="text-3xl">🕊️</p>
      <h2 className="mt-2 text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Has God lifted this burden?</h2>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={onNo} className="rounded-full border border-border px-5 py-2 text-sm text-foreground hover:bg-muted">Not yet</button>
        <button onClick={onYes} disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Yes</button>
      </div>
    </Dialog>
  );
}

export function SharePrompt({ burdenId, onClose }: { burdenId: string; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Dialog onClose={onClose}>
      <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Georgia', serif" }}>Want to share how God moved?</h2>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={onClose} className="rounded-full border border-border px-5 py-2 text-sm text-foreground hover:bg-muted">Maybe later</button>
        <button onClick={() => navigate({ to: "/feed", search: { burden: burdenId } })} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Write testimony</button>
      </div>
    </Dialog>
  );
}
