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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card">
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-dm text-sm">Dashboard</span>
            </button>
            <h1 className="font-syne font-bold text-lg">Account Settings</h1>
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
          <div className="neo-card p-6">
            <h2 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile
            </h2>
            <div className="flex items-center gap-4 mb-6">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-16 h-16 border-2 border-border object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-primary/10 border-2 border-primary flex items-center justify-center">
                  <span className="font-syne font-bold text-xl text-primary">
                    {(user.name || "U")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-syne font-semibold">{user.name || "User"}</p>
                <p className="font-dm text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-dm text-sm font-medium mb-2 block">
                  Display Name
                </label>
                <input
                  type="text"
                  defaultValue={user.name || ""}
                  className="neo-input"
                />
              </div>
              <div>
                <label className="font-dm text-sm font-medium mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user.email || ""}
                  disabled
                  className="neo-input opacity-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="neo-card p-6">
            <h2 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Billing
            </h2>
            <div className="flex items-center justify-between p-4 bg-muted border border-border">
              <div>
                <p className="font-syne font-semibold text-sm">Free Plan</p>
                <p className="font-dm text-xs text-muted-foreground">
                  5 videos per month — 720p export
                </p>
              </div>
              <Button variant="ghost" className="border-2 border-border text-sm">
                Upgrade
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted">
                <p className="font-syne font-bold text-lg">0</p>
                <p className="font-dm text-xs text-muted-foreground">Videos</p>
              </div>
              <div className="text-center p-3 bg-muted">
                <p className="font-syne font-bold text-lg">5</p>
                <p className="font-dm text-xs text-muted-foreground">Remaining</p>
              </div>
              <div className="text-center p-3 bg-muted">
                <p className="font-syne font-bold text-lg">720p</p>
                <p className="font-dm text-xs text-muted-foreground">Max Res</p>
              </div>
            </div>
          </div>

          <div className="neo-card p-6">
            <h2 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-dm text-sm font-medium">Theme</p>
                  <p className="font-dm text-xs text-muted-foreground">
                    System preference
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="w-8 h-8 bg-background border-2 border-primary" />
                  <button className="w-8 h-8 bg-[#0E0E0E] border-2 border-border" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-dm text-sm font-medium">Notifications</p>
                  <p className="font-dm text-xs text-muted-foreground">
                    Email when render completes
                  </p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="neo-card p-6 border-destructive/50">
            <h2 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Danger Zone
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-dm text-sm font-medium">Delete Account</p>
                <p className="font-dm text-xs text-muted-foreground">
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
            className="neo-btn-primary w-full"
            onClick={() => navigate("/dashboard")}
          >
            Save Changes
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
