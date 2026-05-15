import { Link } from "react-router";
import { ArrowLeft, Film } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen dot-grid flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[var(--sketch-accent)]/20 border-2 border-[var(--sketch-border-color)] flex items-center justify-center mx-auto mb-6 sketch-border-sm">
          <Film className="w-8 h-8 text-[var(--sketch-fg)]" />
        </div>
        <h1 className="font-body font-extrabold text-6xl tracking-tight text-[var(--sketch-fg)]">
          404
        </h1>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2 mb-6">
          This page doesn't exist or has been moved.
        </p>
        <Link to="/" className="sketch-btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
