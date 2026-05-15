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
      <div className="min-h-screen dot-grid flex items-center justify-center">
        <div className="text-[var(--sketch-fg-muted)] font-body">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen dot-grid">
      <header className="border-b-2 border-[var(--sketch-border-color)] bg-[var(--sketch-card-bg)]/90 backdrop-blur-sm relative">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--sketch-accent)]/60" />
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-body text-sm">Dashboard</span>
            </button>
            <h1 className="font-body font-bold text-lg text-[var(--sketch-fg)]">Account Settings</h1>
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
          <div className="sketch-card p-6">
            <h2 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <User className="w-5 h-5 text-[var(--sketch-accent)]" />
              Profile
            </h2>
            <div className="flex items-center gap-4 mb-6">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-16 h-16 border-2 border-[var(--sketch-border-color)] object-cover sketch-border-sm"
                />
              ) : (
                <div className="w-16 h-16 bg-[var(--sketch-accent)]/20 border-2 border-[var(--sketch-border-color)] flex items-center justify-center sketch-border-sm">
                  <span className="font-body font-bold text-xl text-[var(--sketch-fg)]">
                    {(user.name || "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-body font-semibold text-[var(--sketch-fg)]">{user.name || "User"}</p>
                <p className="font-body text-sm text-[var(--sketch-fg-muted)]">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-body text-sm font-medium mb-2 block text-[var(--sketch-fg)]">
                  Display Name
                </label>
                <input
                  type="text"
                  defaultValue={user.name || ""}
                  className="sketch-input"
                />
              </div>
              <div>
                <label className="font-body text-sm font-medium mb-2 block text-[var(--sketch-fg)]">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user.email || ""}
                  disabled
                  className="sketch-input opacity-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="sketch-card p-6">
            <h2 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <CreditCard className="w-5 h-5 text-[var(--sketch-accent)]" />
              Billing
            </h2>
            <div className="flex items-center justify-between p-4 bg-[var(--sketch-bg)] border-2 border-[var(--sketch-border-color)] sketch-border-sm">
              <div>
                <p className="font-body font-semibold text-sm text-[var(--sketch-fg)]">Free Plan</p>
                <p className="font-body text-xs text-[var(--sketch-fg-muted)]">
                  5 videos per month — 720p export
                </p>
              </div>
              <Button variant="ghost" className="border-2 border-[var(--sketch-border-color)] text-sm text-[var(--sketch-fg)]">
                Upgrade
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-[var(--sketch-bg)] border-2 border-[var(--sketch-border-color)] sketch-border-sm">
                <p className="font-body font-bold text-lg text-[var(--sketch-fg)]">0</p>
                <p className="font-body text-xs text-[var(--sketch-fg-muted)]">Videos</p>
              </div>
              <div className="text-center p-3 bg-[var(--sketch-bg)] border-2 border-[var(--sketch-border-color)] sketch-border-sm">
                <p className="font-body font-bold text-lg text-[var(--sketch-fg)]">5</p>
                <p className="font-body text-xs text-[var(--sketch-fg-muted)]">Remaining</p>
              </div>
              <div className="text-center p-3 bg-[var(--sketch-bg)] border-2 border-[var(--sketch-border-color)] sketch-border-sm">
                <p className="font-body font-bold text-lg text-[var(--sketch-fg)]">720p</p>
                <p className="font-body text-xs text-[var(--sketch-fg-muted)]">Max Res</p>
              </div>
            </div>
          </div>

          <div className="sketch-card p-6">
            <h2 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Monitor className="w-5 h-5 text-[var(--sketch-accent)]" />
              Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm font-medium text-[var(--sketch-fg)]">Theme</p>
                  <p className="font-body text-xs text-[var(--sketch-fg-muted)]">
                    {theme === "system" ? "System preference" : theme}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme("light")}
                    className={`w-8 h-8 border-2 sketch-border-sm flex items-center justify-center transition-all ${
                      resolvedTheme === "light"
                        ? "border-[var(--sketch-accent)] bg-[var(--sketch-bg)]"
                        : "border-[var(--sketch-border-color)] bg-[var(--sketch-card-bg)]"
                    }`}
                    title="Light mode"
                  >
                    <Sun className="w-4 h-4 text-[var(--sketch-fg)]" />
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`w-8 h-8 border-2 sketch-border-sm flex items-center justify-center transition-all ${
                      resolvedTheme === "dark"
                        ? "border-[var(--sketch-accent)] bg-[var(--sketch-fg)]"
                        : "border-[var(--sketch-border-color)] bg-[var(--sketch-card-bg)]"
                    }`}
                    title="Dark mode"
                  >
                    <Moon className="w-4 h-4 text-[var(--sketch-accent)]" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm font-medium text-[var(--sketch-fg)]">Notifications</p>
                  <p className="font-body text-xs text-[var(--sketch-fg-muted)]">
                    Email when render completes
                  </p>
                </div>
                <div className="w-12 h-6 bg-[var(--sketch-fg)] rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-[var(--sketch-accent)] rounded-full absolute top-0.5 right-0.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="sketch-card p-6 border-destructive/50">
            <h2 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Danger Zone
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm font-medium text-[var(--sketch-fg)]">Delete Account</p>
                <p className="font-body text-xs text-[var(--sketch-fg-muted)]">
                  This will permanently delete all your projects and data.
                </p>
              </div>
              <Button
                variant="destructive"
                className="border-2 border-destructive"
              >
                Delete
              </Button>
            </div>
          </div>

          <Button
            className="sketch-btn-primary w-full"
            onClick={() => navigate("/dashboard")}
          >
            Save Changes
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
