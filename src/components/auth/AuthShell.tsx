import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Film, ArrowLeft, Sparkles, Mic, Zap, Check, ShieldCheck } from "lucide-react";
import { SpaceBackground } from "@/components/shared/SpaceBackground";
import { toast } from "sonner";
import { getGoogleOAuthUrl, hasAcceptedTerms, rememberTermsAccepted } from "@/lib/oauth";

type Mode = "signin" | "signup";

/** Small inline Google "G" so the button reads as a real Google sign-in. */
function GoogleG({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z" />
    </svg>
  );
}

const COPY: Record<Mode, {
  eyebrow: string;
  title: string;
  subtitle: string;
  button: string;
  panelHeadline: string;
  panelSub: string;
  bullets: { icon: typeof Sparkles; text: string }[];
  altPrompt: string;
  altLabel: string;
  altHref: string;
}> = {
  signin: {
    eyebrow: "Welcome back",
    title: "Sign in to AIVideo",
    subtitle: "Pick up right where you left off.",
    button: "Continue with Google",
    panelHeadline: "Your studio is waiting.",
    panelSub: "Jump back into your projects, renders, and premium voices.",
    bullets: [
      { icon: Zap, text: "Your projects and renders, right where you left them" },
      { icon: Mic, text: "Premium ElevenLabs voices on your own key" },
      { icon: ShieldCheck, text: "Secure Google sign-in — no passwords to remember" },
    ],
    altPrompt: "New here?",
    altLabel: "Create an account",
    altHref: "/signup",
  },
  signup: {
    eyebrow: "Create your account",
    title: "Start creating with AIVideo",
    subtitle: "Turn screenshots into narrated tutorial videos.",
    button: "Sign up with Google",
    panelHeadline: "Screenshots in. Polished videos out.",
    panelSub: "AI writes the script, natural voices narrate, cinematic zooms do the rest.",
    bullets: [
      { icon: Sparkles, text: "Free to start — no credit card required" },
      { icon: Mic, text: "AI script + human-quality voiceover" },
      { icon: Zap, text: "Export a finished tutorial in minutes" },
    ],
    altPrompt: "Already have an account?",
    altLabel: "Sign in",
    altHref: "/login",
  },
};

export default function AuthShell({ mode }: { mode: Mode }) {
  const c = COPY[mode];
  const location = useLocation();
  const navigate = useNavigate();

  const returnTo = useMemo(
    () => new URLSearchParams(location.search).get("returnTo") ?? "/dashboard",
    [location.search],
  );

  // Terms are a one-time agreement. First-timers see the checkbox; once accepted
  // (remembered locally), returning users get a single click.
  const [alreadyAgreed] = useState(hasAcceptedTerms);
  const [agreed, setAgreed] = useState(alreadyAgreed);

  const startOAuth = () => {
    if (!agreed) {
      toast.error("Please agree to the Terms & Privacy Policy to continue.");
      return;
    }
    rememberTermsAccepted();
    window.location.href = getGoogleOAuthUrl(returnTo);
  };

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* ── Left brand / value panel (desktop) ── */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:flex flex-col justify-between p-12 xl:p-16 border-r border-[var(--space-border)] bg-[var(--space-card)]/40 backdrop-blur-sm"
        >
          <Link to="/" className="flex items-center gap-2 group w-fit">
            <Film className="w-6 h-6 text-teal-500 group-hover:text-teal-400 transition-colors" />
            <span className="font-bold text-xl tracking-tight text-[var(--space-text)]">AIVideo</span>
          </Link>

          <div className="max-w-md">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded-full">
              {c.eyebrow}
            </span>
            <h2 className="font-extrabold text-4xl xl:text-5xl tracking-tight mt-5 mb-4 text-[var(--space-text)] leading-[1.05]">
              {c.panelHeadline}
            </h2>
            <p className="text-[var(--space-text-muted)] text-base leading-relaxed mb-8">{c.panelSub}</p>
            <ul className="space-y-3">
              {c.bullets.map((b) => (
                <li key={b.text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <b.icon className="w-3.5 h-3.5 text-teal-500" />
                  </span>
                  <span className="text-sm text-[var(--space-text-muted)] leading-relaxed">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-[var(--space-text-subtle)] font-mono">
            Trusted by 500+ teams to create tutorial videos.
          </p>
        </motion.aside>

        {/* ── Right auth card ── */}
        <main className="flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            {/* Mobile back link + logo */}
            <div className="lg:hidden mb-8 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <Film className="w-5 h-5 text-teal-500" />
                <span className="font-bold text-lg tracking-tight text-[var(--space-text)]">AIVideo</span>
              </Link>
              <Link to="/" className="flex items-center gap-1.5 text-xs font-mono text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Home
              </Link>
            </div>

            <div className="glass-panel border border-[var(--space-border)] bg-[var(--space-card)]/80 backdrop-blur-xl p-7 sm:p-8 rounded-3xl shadow-2xl">
              <div className="mb-6">
                <h1 className="font-extrabold text-2xl sm:text-[26px] tracking-tight text-[var(--space-text)]">
                  {c.title}
                </h1>
                <p className="text-sm text-[var(--space-text-muted)] mt-1.5">{c.subtitle}</p>
              </div>

              {/* First-time terms gate; hidden once accepted */}
              {!alreadyAgreed && (
                <label
                  htmlFor="terms"
                  className="flex items-start gap-3 p-3.5 mb-4 rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)]/50 cursor-pointer select-none"
                >
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-teal-500 cursor-pointer"
                  />
                  <span className="text-xs text-[var(--space-text-muted)] leading-relaxed">
                    I agree to the{" "}
                    <Link to="/terms" className="text-teal-500 hover:underline">Terms of Service</Link> and{" "}
                    <Link to="/privacy" className="text-teal-500 hover:underline">Privacy Policy</Link>, and won't use
                    AIVideo for unlawful, fraudulent, or misleading content.
                  </span>
                </label>
              )}

              <button
                onClick={startOAuth}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white text-slate-800 font-semibold text-sm border border-black/10 shadow-md hover:shadow-lg hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer"
              >
                <GoogleG />
                {c.button}
              </button>

              {alreadyAgreed ? (
                <p className="text-center text-[11px] text-[var(--space-text-subtle)] mt-4 leading-relaxed">
                  By continuing you agree to our{" "}
                  <Link to="/terms" className="text-teal-500 hover:underline">Terms</Link> &{" "}
                  <Link to="/privacy" className="text-teal-500 hover:underline">Privacy Policy</Link>.
                </p>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--space-text-subtle)] mt-4">
                  <Check className="w-3.5 h-3.5 text-teal-500" />
                  We only ask this once.
                </div>
              )}
            </div>

            <p className="text-center text-sm text-[var(--space-text-muted)] mt-6">
              {c.altPrompt}{" "}
              <button
                onClick={() => navigate(c.altHref)}
                className="font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                {c.altLabel}
              </button>
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
