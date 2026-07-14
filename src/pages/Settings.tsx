import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  CreditCard,
  Shield,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Settings() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="theme-3d-immersive min-h-screen flex items-center justify-center font-sans">
        <SpaceBackground />
        <div className="relative z-10 text-[var(--space-text-muted)] font-mono">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <header className="border-b border-[var(--space-border)] bg-[var(--space-card)]/90 backdrop-blur-sm relative">
          <div className="w-full px-6 lg:px-12">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-mono">Dashboard</span>
              </button>
              <h1 className="font-bold text-lg text-[var(--space-text)]">Account Settings</h1>
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="w-full px-6 lg:px-12 py-8 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <User className="w-5 h-5 text-teal-500" />
                Profile
              </h2>
              <div className="flex items-center gap-4 mb-6">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-16 h-16 border border-[var(--space-border)] object-cover rounded-2xl"
                  />
                ) : (
                  <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 flex items-center justify-center rounded-2xl">
                    <span className="font-bold text-xl text-teal-600">
                      {(user.name || "U")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[var(--space-text)]">{user.name || "User"}</p>
                  <p className="text-sm text-[var(--space-text-muted)]">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-[var(--space-text)]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user.name || ""}
                    className="w-full bg-[var(--space-card)] border-[var(--space-border)] text-[var(--space-text)] rounded-xl py-3 px-4 focus:ring-teal-500 focus:border-teal-500 font-sans"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-[var(--space-text)]">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={user.email || ""}
                    disabled
                    className="w-full bg-[var(--space-card)] border-[var(--space-border)] text-[var(--space-text)] rounded-xl py-3 px-4 opacity-50 cursor-not-allowed font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <CreditCard className="w-5 h-5 text-teal-500" />
                Billing
              </h2>
              <div className="flex items-center justify-between p-4 bg-[var(--space-card)] border border-[var(--space-border)] rounded-2xl">
                <div>
                  <p className="font-semibold text-sm text-[var(--space-text)]">Free Plan</p>
                  <p className="text-xs text-[var(--space-text-muted)]">
                    5 videos per month — 720p export
                  </p>
                </div>
                <Button variant="ghost" className="glass-btn glass-btn-secondary px-4 py-2 font-semibold text-xs rounded-xl" onClick={() => navigate("/pricing")}>
                  Upgrade
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-[var(--space-card)] border border-[var(--space-border)] rounded-2xl">
                  <p className="font-bold text-lg text-[var(--space-text)]">0</p>
                  <p className="text-xs text-[var(--space-text-muted)]">Videos</p>
                </div>
                <div className="text-center p-3 bg-[var(--space-card)] border border-[var(--space-border)] rounded-2xl">
                  <p className="font-bold text-lg text-[var(--space-text)]">5</p>
                  <p className="text-xs text-[var(--space-text-muted)]">Remaining</p>
                </div>
                <div className="text-center p-3 bg-[var(--space-card)] border border-[var(--space-border)] rounded-2xl">
                  <p className="font-bold text-lg text-[var(--space-text)]">720p</p>
                  <p className="text-xs text-[var(--space-text-muted)]">Max Res</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <Monitor className="w-5 h-5 text-teal-500" />
                Preferences
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--space-text)]">Theme</p>
                    <p className="text-xs text-[var(--space-text-muted)]">
                      {theme === "system" ? "System preference" : theme}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme("light")}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                        resolvedTheme === "light"
                          ? "border-teal-500 bg-teal-500/10 text-teal-600"
                          : "border-[var(--space-border)] bg-[var(--space-card)]"
                      }`}
                      title="Light mode"
                    >
                      <Sun className="w-4 h-4 text-[var(--space-text)]" />
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                        resolvedTheme === "dark"
                          ? "border-teal-500 bg-teal-500/10 text-teal-400"
                          : "border-[var(--space-border)] bg-[var(--space-card)]"
                      }`}
                      title="Dark mode"
                    >
                      <Moon className="w-4 h-4 text-[var(--space-text)]" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--space-text)]">Notifications</p>
                    <p className="text-xs text-[var(--space-text-muted)]">
                      Email when render completes
                    </p>
                  </div>
                  <div className="w-12 h-6 bg-[var(--space-border)] border border-[var(--space-border)] rounded-full relative cursor-pointer" onClick={() => {}}>
                    <div className="w-5 h-5 bg-teal-500 rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 border border-red-500/30 bg-red-500/5 rounded-2xl">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-red-500">
                <Shield className="w-5 h-5" />
                Danger Zone
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--space-text)]">Delete Account</p>
                  <p className="text-xs text-[var(--space-text-muted)]">
                    This will permanently delete all your projects and data.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs py-2 px-4"
                >
                  Delete
                </Button>
              </div>
            </div>

            <Button
              className="glass-btn glass-btn-primary w-full py-4 text-sm font-semibold rounded-xl"
              onClick={() => navigate("/dashboard")}
            >
              Save Changes
            </Button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
