import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";
import { getGoogleOAuthUrl, hasAcceptedTerms, rememberTermsAccepted } from "@/lib/oauth";

type Mode = "signin" | "signup";

/** Inline Google mark, so the button reads as a real Google sign-in. */
function GoogleG({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

const COPY: Record<
  Mode,
  {
    title: string;
    subtitle: string;
    button: string;
    panelHeadline: string;
    bullets: string[];
    altPrompt: string;
    altLabel: string;
    altHref: string;
  }
> = {
  signin: {
    title: "Sign in",
    subtitle: "Pick up where you left off.",
    button: "Continue with Google",
    panelHeadline: "Your projects are where you left them",
    bullets: [
      "Every project, render and script still there",
      "ElevenLabs voices on your own key",
      "Google sign-in, so there is no password to lose",
    ],
    altPrompt: "New here?",
    altLabel: "Create an account",
    altHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Free videos every month, no card.",
    button: "Sign up with Google",
    panelHeadline: "Screenshots in. Finished tutorial out.",
    bullets: [
      "Free videos every month on the free plan",
      "Narration written and spoken for you",
      "A publishable MP4 in about ten minutes",
    ],
    altPrompt: "Already have an account?",
    altLabel: "Sign in",
    altHref: "/login",
  },
};

export default function AuthShell({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const location = useLocation();

  const returnTo = useMemo(
    () => new URLSearchParams(location.search).get("returnTo") ?? "/dashboard",
    [location.search]
  );

  // Terms are a one-time agreement. First-timers see the checkbox; once it is
  // remembered locally, returning users get a single click.
  const [alreadyAgreed] = useState(hasAcceptedTerms);
  const [agreed, setAgreed] = useState(alreadyAgreed);

  const startOAuth = () => {
    if (!agreed) {
      toast.error("Please accept the terms to continue.");
      return;
    }
    rememberTermsAccepted();
    window.location.href = getGoogleOAuthUrl(returnTo);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="mat hidden flex-col justify-between border-r border-line p-12 lg:flex xl:p-16">
        <Link to="/" className="flex w-fit items-center gap-2.5">
          <Logo size={26} />
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">AIVideo</span>
        </Link>

        <div className="max-w-md">
          <h2 className="h2">{copy.panelHeadline}</h2>
          <ul className="mt-8 space-y-3.5">
            {copy.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-[15px] leading-relaxed text-ink-body">
                <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-brand" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-ink-muted">
          Questions first?{" "}
          <Link to="/docs" className="text-brand hover:underline">
            Read the docs
          </Link>
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo size={24} />
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-ink">AIVideo</span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[13.5px] text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>

          <div className="card p-7">
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">{copy.title}</h1>
            <p className="mt-1.5 text-[15px] text-ink-body">{copy.subtitle}</p>

            {!alreadyAgreed && (
              <label
                htmlFor="terms"
                className="mt-6 flex cursor-pointer select-none items-start gap-3 rounded-xl border border-line bg-mat p-3.5"
              >
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-none cursor-pointer accent-[var(--brand)]"
                />
                <span className="text-[13px] leading-relaxed text-ink-body">
                  I agree to the{" "}
                  <Link to="/terms" className="text-brand hover:underline">
                    terms of service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-brand hover:underline">
                    privacy policy
                  </Link>
                  , and will not use AIVideo for unlawful or misleading content.
                </span>
              </label>
            )}

            <button onClick={startOAuth} className="btn btn-secondary mt-6 h-12 w-full">
              <GoogleG />
              {copy.button}
            </button>

            <p className="mt-4 text-center text-[12.5px] text-ink-muted">
              {alreadyAgreed ? "You accepted the terms already." : "We only ask this once."}
            </p>
          </div>

          <p className="mt-6 text-center text-[14.5px] text-ink-body">
            {copy.altPrompt}{" "}
            <Link to={copy.altHref} className="font-medium text-brand hover:underline">
              {copy.altLabel}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
