import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Film,
  LogOut,
  LayoutDashboard,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [location]);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const isHomepage = location.pathname === "/";

  const mutedTextClass = isHomepage
    ? "text-[var(--space-text-muted)] hover:text-[var(--space-text)] font-sans"
    : "text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)]";
  const btnPrimaryClass = isHomepage
    ? "glass-btn glass-btn-primary text-xs py-2 px-4"
    : "sketch-btn-primary text-sm py-2 px-4";
  const btnGhostClass = isHomepage
    ? "glass-btn glass-btn-secondary text-xs py-2 px-4"
    : "sketch-btn-ghost text-sm py-2 px-4";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-350 ${
        isHomepage
          ? scrolled
            ? "max-w-6xl mx-auto mt-4 rounded-full bg-[var(--space-card)] backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_35px_rgba(0,0,0,0.06)] px-4 py-1"
            : "bg-transparent py-4"
          : scrolled
            ? "bg-[var(--sketch-navbar-bg)] backdrop-blur-sm border-b-2 border-[var(--sketch-border-color)] shadow-[0px_4px_0px_0px_var(--sketch-accent)]"
            : "bg-[var(--sketch-navbar-bg)] backdrop-blur-sm border-b-2 border-[var(--sketch-navbar-border)]"
      }`}
    >
      <div className={isHomepage ? "w-full px-4" : "w-full px-6 lg:px-12"}>
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 group">
            <Film className={`w-5 h-5 ${isHomepage ? "text-teal-600 dark:text-teal-400 group-hover:text-teal-500 transition-colors" : "text-[var(--sketch-fg)]"}`} />
            <span className={`font-bold text-lg tracking-tight transition-colors ${isHomepage ? "text-[var(--space-text)] font-sans" : "text-[var(--sketch-fg)] font-body"}`}>
              AIVideo
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className={`text-sm font-medium transition-colors ${mutedTextClass}`}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className={`text-sm font-medium transition-colors ${mutedTextClass}`}
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className={`text-sm font-medium transition-colors ${mutedTextClass}`}
            >
              Pricing
            </button>
            <Link
              to="/docs"
              className={`text-sm font-medium transition-colors ${mutedTextClass}`}
            >
              Docs
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={btnGhostClass}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className={btnPrimaryClass}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={btnGhostClass}
                >
                  Sign In
                </Link>
                <Link to="/login" className={btnPrimaryClass}>
                  Start Free
                </Link>
              </>
            )}
            
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className={isHomepage
                ? "p-2 ml-1 rounded-xl bg-[var(--space-card)] border border-[var(--space-border)] hover:bg-[var(--space-card-hover)] hover:border-teal-500/50 transition-colors focus:outline-none"
                : "p-2 ml-2 border-2 border-[var(--sketch-border-color)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-accent)] transition-colors focus:outline-none sketch-border-sm"
              }
              aria-label="Toggle dark mode"
            >
              {resolvedTheme === "dark" ? (
                <Sun className={`w-4 h-4 ${isHomepage ? "text-teal-400" : "text-[var(--sketch-accent)]"}`} />
              ) : (
                <Moon className={`w-4 h-4 ${isHomepage ? "text-[var(--space-text-muted)]" : "text-[var(--sketch-fg)]"}`} />
              )}
            </button>
          </div>

          <button
            className={`md:hidden p-2 ${isHomepage ? "text-[var(--space-text)]" : "text-[var(--sketch-fg)]"}`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`md:hidden border-b ${
              isHomepage 
                ? "bg-[var(--space-bg)] border-[var(--space-border)] shadow-[0_10px_30px_rgba(0,0,0,0.05)]" 
                : "bg-[var(--sketch-bg)] border-b-2 border-[var(--sketch-border-color)] shadow-[0px_4px_0px_0px_var(--sketch-accent)]"
            }`}
          >
            <div className="px-6 py-4 space-y-3">
              <button
                onClick={() => scrollToSection("features")}
                className={`block w-full text-left font-medium py-2 ${
                  isHomepage ? "text-[var(--space-text)] font-sans text-sm" : "font-body text-sm text-[var(--sketch-fg)]"
                }`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className={`block w-full text-left font-medium py-2 ${
                  isHomepage ? "text-[var(--space-text)] font-sans text-sm" : "font-body text-sm text-[var(--sketch-fg)]"
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className={`block w-full text-left font-medium py-2 ${
                  isHomepage ? "text-[var(--space-text)] font-sans text-sm" : "font-body text-sm text-[var(--sketch-fg)]"
                }`}
              >
                Pricing
              </button>
              <hr className={isHomepage ? "border-[var(--space-border)]" : "border-[var(--sketch-fg-subtle)]"} />
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`block font-medium py-2 ${
                      isHomepage ? "text-[var(--space-text)] font-sans text-sm" : "font-body text-sm text-[#1E1B4B]"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className={`block w-full text-left font-medium py-2 ${
                      isHomepage ? "text-[var(--space-text)] font-sans text-sm" : "font-body text-sm text-[#1E1B4B]"
                    }`}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`block font-medium py-2 ${
                      isHomepage ? "text-[var(--space-text)] font-sans text-sm" : "font-body text-sm text-[#1E1B4B]"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    className={`block font-medium py-2 ${
                      isHomepage ? "text-[var(--space-text)] font-sans text-sm" : "font-body text-sm text-[#1E1B4B]"
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
