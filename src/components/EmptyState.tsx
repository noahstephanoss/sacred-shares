const SERIF = "'Georgia', serif";

interface EmptyStateProps {
  verse: string;
  reference: string;
  description: string;
  children?: React.ReactNode;
}

export function EmptyState({ verse, reference, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-3xl mb-4" style={{ color: "#B8860B" }}>✝</div>
      <p className="text-base italic text-foreground max-w-sm" style={{ fontFamily: SERIF }}>
        "{verse}"
      </p>
      <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: SERIF }}>
        — {reference}
      </p>
      <p className="mt-3 text-sm text-muted-foreground max-w-xs">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}