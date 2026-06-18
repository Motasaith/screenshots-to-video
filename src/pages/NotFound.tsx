import { Link } from "react-router";
import { ArrowLeft, Film } from "lucide-react";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function NotFound() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans flex items-center justify-center">
      <SpaceBackground />
      <div className="relative z-10 text-center">
        <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-6 rounded-2xl shadow-sm">
          <Film className="w-8 h-8 text-teal-500" />
        </div>
        <h1 className="font-extrabold text-6xl tracking-tight text-[var(--space-text)]">
          404
        </h1>
        <p className="text-[var(--space-text-muted)] mt-2 mb-6">
          This page doesn't exist or has been moved.
        </p>
        <Link to="/" className="glass-btn glass-btn-primary inline-flex py-3 px-6 rounded-xl font-semibold text-xs gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
