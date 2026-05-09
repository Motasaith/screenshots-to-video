import { useState, useEffect } from "react";
import { Link } from "react-router";
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
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setMobileOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-sm border-b-2 border-border"
          : "bg-transparent"
      }`}
    >
      <div className="w-full px-6 lg:px-12">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <Film className="w-6 h-6 text-primary" />
            <span className="font-syne font-bold text-xl tracking-tight">
              AIVideo
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className="font-dm text-sm font-medium hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="font-dm text-sm font-medium hover:text-primary transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="font-dm text-sm font-medium hover:text-primary transition-colors"
            >
              Pricing
            </button>
            <Link
              to="/docs"
              className="font-dm text-sm font-medium hover:text-primary transition-colors"
            >
              Docs
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="neo-btn-ghost text-sm py-2 px-4"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="neo-btn-primary text-sm py-2 px-4"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="neo-btn-ghost text-sm py-2 px-4"
                >
                  Sign In
                </Link>
                <Link to="/login" className="neo-btn-primary text-sm py-2 px-4">
                  Start Free
                </Link>
              </>
            )}
            
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 ml-2 border-2 border-border bg-card hover:border-primary transition-colors focus:outline-none"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-primary" />
              ) : (
                <Moon className="w-4 h-4 text-primary" />
              )}
            </button>
          </div>

          <button
            className="md:hidden p-2"
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
            className="md:hidden bg-background border-b-2 border-border"
          >
            <div className="px-6 py-4 space-y-3">
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full text-left font-dm text-sm font-medium py-2"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="block w-full text-left font-dm text-sm font-medium py-2"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="block w-full text-left font-dm text-sm font-medium py-2"
              >
                Pricing
              </button>
              <hr className="border-border" />
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block font-dm text-sm font-medium py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left font-dm text-sm font-medium text-primary py-2"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block font-dm text-sm font-medium py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    className="block font-dm text-sm font-medium text-primary py-2"
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
