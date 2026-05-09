import { Link } from "react-router";
import { ArrowLeft, Film } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-6">
          <Film className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-syne font-extrabold text-6xl tracking-tight">
          404
        </h1>
        <p className="font-dm text-muted-foreground mt-2 mb-6">
          This page doesn't exist or has been moved.
        </p>
        <Link to="/" className="neo-btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
