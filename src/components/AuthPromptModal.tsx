import { Link } from "@tanstack/react-router";
import { useState } from "react";

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthPromptModal({ open, onClose }: AuthPromptModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 mx-4 w-full max-w-sm rounded-2xl px-8 py-10 text-center"
        style={{ backgroundColor: "#FDF6EC", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Cross brand mark */}
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="h-10 w-10" fill="none">
            <rect x="16" y="4" width="8" height="32" rx="1.5" fill="#1C1917" />
            <rect x="4" y="14" width="32" height="8" rx="1.5" fill="#1C1917" />
          </svg>
        </div>

        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "'Georgia', serif", color: "#1C1917" }}
        >
          Join Testimonies
        </h2>

        <p className="mt-3 text-sm leading-relaxed" style={{ color: "#44403C" }}>
          Create an account to share your testimony, react, and seek righteous counsel.
        </p>

        <Link
          to="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors hover:opacity-90"
          style={{ backgroundColor: "#92400E", color: "#FDF6EC" }}
        >
          Get Started
        </Link>

        <div className="mt-4">
          <Link
            to="/login"
            className="text-sm font-medium hover:underline"
            style={{ color: "#92400E" }}
          >
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export function useAuthPrompt() {
  const [showModal, setShowModal] = useState(false);
  return {
    showModal,
    openAuthPrompt: () => setShowModal(true),
    closeAuthPrompt: () => setShowModal(false),
  };
}