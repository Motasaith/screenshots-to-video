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
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--sketch-navbar-bg)] backdrop-blur-sm border-b-2 border-[var(--sketch-border-color)] shadow-[0px_4px_0px_0px_var(--sketch-accent)]"
          : "bg-[var(--sketch-navbar-bg)] backdrop-blur-sm border-b-2 border-[var(--sketch-navbar-border)]"
      }`}
    >
      <div className="w-full px-6 lg:px-12">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <Film className="w-6 h-6 text-[var(--sketch-fg)]" />
            <span className="font-body font-bold text-xl tracking-tight text-[var(--sketch-fg)]">
              AIVideo
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className="font-body text-sm font-medium text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="font-body text-sm font-medium text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="font-body text-sm font-medium text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors"
            >
              Pricing
            </button>
            <Link
              to="/docs"
              className="font-body text-sm font-medium text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors"
            >
              Docs
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="sketch-btn-ghost text-sm py-2 px-4"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="sketch-btn-primary text-sm py-2 px-4"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="sketch-btn-ghost text-sm py-2 px-4"
                >
                  Sign In
                </Link>
                <Link to="/login" className="sketch-btn-primary text-sm py-2 px-4">
                  Start Free
                </Link>
              </>
            )}
            
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 ml-2 border-2 border-[var(--sketch-border-color)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-accent)] transition-colors focus:outline-none sketch-border-sm"
              aria-label="Toggle dark mode"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4 text-[var(--sketch-accent)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--sketch-fg)]" />
              )}
            </button>
          </div>

          <button
            className="md:hidden p-2 text-[var(--sketch-fg)]"
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
            className="md:hidden bg-[var(--sketch-bg)] border-b-2 border-[var(--sketch-border-color)] shadow-[0px_4px_0px_0px_var(--sketch-accent)]"
          >
            <div className="px-6 py-4 space-y-3">
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full text-left font-body text-sm font-medium py-2 text-[var(--sketch-fg)]"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="block w-full text-left font-body text-sm font-medium py-2 text-[var(--sketch-fg)]"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="block w-full text-left font-body text-sm font-medium py-2 text-[var(--sketch-fg)]"
              >
                Pricing
              </button>
              <hr className="border-[var(--sketch-fg-subtle)]" />
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block font-body text-sm font-medium py-2 text-[#1E1B4B]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left font-body text-sm font-medium text-[#1E1B4B] py-2"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block font-body text-sm font-medium py-2 text-[#1E1B4B]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    className="block font-body text-sm font-medium text-[#1E1B4B] py-2"
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
