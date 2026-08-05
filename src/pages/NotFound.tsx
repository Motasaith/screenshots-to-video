import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { SEO } from "@/components/SEO";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <SEO
        title="Page not found"
        description="That page does not exist."
        noindex
      />
      <div className="text-center">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-[18px] font-semibold tracking-[-0.02em] text-ink">AIVideo</span>
        </Link>

        <p className="mt-12 text-[13px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          404
        </p>
        <h1 className="h2 mt-3">This page does not exist</h1>
        <p className="lede mx-auto mt-4 max-w-md">
          It may have moved, or the link that brought you here may be out of date.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to the homepage
          </Link>
          <Link to="/docs" className="btn btn-secondary">
            Read the docs
          </Link>
        </div>
      </div>
    </div>
  );
}
