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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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


  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "max-w-6xl mx-auto mt-4 rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_35px_rgba(0,0,0,0.06)] px-4 py-1"
          : "bg-transparent py-4 px-4"
      }`}
    >
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 group">
            <Film className="w-5 h-5 text-teal-600 dark:text-teal-400 group-hover:text-teal-500 transition-colors" />
            <span className="font-bold text-lg tracking-tight font-sans text-[var(--space-text)] transition-colors">
              AIVideo
            </span>
          </Link>

          {/* Center Navigation Links with sliding background pill */}
          <div 
            className="hidden md:flex items-center gap-1.5"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {[
              { id: "features", label: "Features", type: "section" },
              { id: "how-it-works", label: "How It Works", type: "section" },
              { id: "pricing", label: "Pricing", type: "section" },
              { id: "docs", label: "Docs", type: "link", path: "/docs" }
            ].map((item, idx) => {
              const isHovered = hoveredIdx === idx;
              const isActive = item.type === "section" 
                ? location.hash === `#${item.id}` 
                : location.pathname === item.path;

              return (
                <div key={item.id} className="relative">
                  {item.type === "section" ? (
                    <button
                      onClick={() => scrollToSection(item.id)}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      className={`text-sm font-medium px-4 py-2 rounded-full relative transition-colors duration-250 block focus:outline-none ${
                        isActive
                          ? "text-[var(--space-text)] font-semibold"
                          : "text-[var(--space-text-subtle)] hover:text-[var(--space-text)]"
                      }`}
                    >
                      <span className="relative z-10">{item.label}</span>
                      {isHovered && (
                        <motion.span
                          layoutId="navHoverPill"
                          className="absolute inset-0 rounded-full -z-0 bg-teal-500/8 dark:bg-teal-400/8 border border-teal-500/15"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.path || "/"}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      className={`text-sm font-medium px-4 py-2 rounded-full relative transition-colors duration-250 block ${
                        isActive
                          ? "text-[var(--space-text)] font-semibold"
                          : "text-[var(--space-text-subtle)] hover:text-[var(--space-text)]"
                      }`}
                    >
                      <span className="relative z-10">{item.label}</span>
                      {isHovered && (
                        <motion.span
                          layoutId="navHoverPill"
                          className="absolute inset-0 rounded-full -z-0 bg-teal-500/8 dark:bg-teal-400/8 border border-teal-500/15"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="glass-btn glass-btn-secondary text-xs py-2 px-4"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="glass-btn glass-btn-primary text-xs py-2 px-4"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="glass-btn glass-btn-secondary text-xs py-2 px-4"
                >
                  Sign In
                </Link>
                <Link to="/dashboard" className="glass-btn glass-btn-primary text-xs py-2 px-4">
                  Start Free
                </Link>
              </>
            )}
            
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 ml-1 rounded-xl bg-[var(--space-card)] border border-[var(--space-border)] hover:bg-[var(--space-card-hover)] hover:border-teal-500/50 transition-colors focus:outline-none"
              aria-label="Toggle dark mode"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4 text-teal-400" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--space-text-muted)]" />
              )}
            </button>
          </div>

          <button
            className="md:hidden p-2 text-[var(--space-text)] focus:outline-none"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
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
            className="md:hidden mt-2 mx-1 rounded-2xl bg-[var(--space-card)]/95 backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <div className="px-6 py-4 space-y-3">
              {[
                { id: "features", label: "Features", type: "section" },
                { id: "how-it-works", label: "How It Works", type: "section" },
                { id: "pricing", label: "Pricing", type: "section" },
                { id: "docs", label: "Docs", type: "link", path: "/docs" }
              ].map((item) => (
                <div key={item.id}>
                  {item.type === "section" ? (
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className="block w-full text-left font-medium py-2 text-[var(--space-text)] font-sans text-sm hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      to={item.path || "/"}
                      className="block font-medium py-2 text-[var(--space-text)] font-sans text-sm hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              <hr className="border-[var(--space-border)]" />
              {user ? (
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    to="/dashboard"
                    className="glass-btn glass-btn-secondary text-xs py-2.5 w-full text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="glass-btn glass-btn-primary text-xs py-2.5 w-full text-center"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    to="/login"
                    className="glass-btn glass-btn-secondary text-xs py-2.5 w-full text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/dashboard"
                    className="glass-btn glass-btn-primary text-xs py-2.5 w-full text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Start Free
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
