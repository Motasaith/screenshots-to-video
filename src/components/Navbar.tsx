import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, LayoutDashboard, LogOut, ShieldAlert } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Logo } from "@/components/site/Logo";

const NAV = [
  { label: "Features", section: "features" },
  { label: "How it works", section: "how-it-works" },
  { label: "Pricing", section: "pricing" },
  { label: "Docs", path: "/docs" },
] as const;

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Re-read on navigation rather than in an effect: an effect that only calls
  // setState schedules a second render to compute something already available
  // during the first one.
  const isImpersonating = useMemo(
    () => document.cookie.includes("aivideo_admin_restore="),
    [location.pathname]
  );

  const restoreAdmin = trpc.admin.restoreAdminSession.useMutation({
    onSuccess: () => {
      window.location.href = "/admin";
    },
  });

  // The header only changes at one threshold, so the handler does nothing but
  // compare a boolean. Passive, because it never calls preventDefault.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Deep links like /#pricing arriving from another page.
  useEffect(() => {
    if (location.pathname !== "/" || !location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth" }));
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const goToSection = (id: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-white/85 backdrop-blur-[6px] transition-shadow duration-200 ${
        scrolled ? "border-b border-line" : "border-b border-transparent"
      }`}
    >
      <div className="container-site">
        <div className="flex h-[64px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <Logo />
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">AIVideo</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) =>
              "path" in item ? (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`rounded-lg px-3 py-2 text-[14.5px] font-medium transition-colors ${
                    location.pathname === item.path
                      ? "text-ink"
                      : "text-ink-body hover:bg-mat hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={() => goToSection(item.section)}
                  className="rounded-lg px-3 py-2 text-[14.5px] font-medium text-ink-body transition-colors hover:bg-mat hover:text-ink"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isImpersonating && (
              <button
                onClick={() => restoreAdmin.mutate()}
                disabled={restoreAdmin.isPending}
                className="btn btn-sm border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                title="Return to your admin account"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                {restoreAdmin.isPending ? "Restoring" : "Back to admin"}
              </button>
            )}

            {user ? (
              <>
                <Link to="/dashboard" className="btn btn-sm btn-ghost">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button onClick={logout} className="btn btn-sm btn-secondary">
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm btn-ghost">
                  Sign in
                </Link>
                <Link to="/signup" className="btn btn-sm btn-primary">
                  Start free
                </Link>
              </>
            )}
          </div>

          <button
            className="-mr-2 grid h-10 w-10 place-items-center rounded-lg text-ink md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade-in border-t border-line bg-white md:hidden">
          <div className="container-site flex flex-col py-3">
            {NAV.map((item) =>
              "path" in item ? (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-3 text-[15px] font-medium text-ink"
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={() => goToSection(item.section)}
                  className="rounded-lg px-2 py-3 text-left text-[15px] font-medium text-ink"
                >
                  {item.label}
                </button>
              )
            )}

            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="btn btn-secondary w-full"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="btn btn-ghost w-full"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/signup" onClick={() => setMobileOpen(false)} className="btn btn-primary w-full">
                    Start free
                  </Link>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary w-full">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
