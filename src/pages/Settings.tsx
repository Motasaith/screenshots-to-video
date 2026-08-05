import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  CreditCard,
  Shield,
  Crown,
  CheckCircle,
  Trash2,
  Loader2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PLAN_LABEL: Record<string, string> = {
  free: "Free Plan",
  pro: "Pro Plan",
  team: "Team Plan",
};

export default function Settings() {
  const { user, isLoading, logout, refresh } = useAuth();
  const navigate = useNavigate();

  // ── ElevenLabs bring-your-own-key ──
  const keyStatus = trpc.settings.elevenLabsKeyStatus.useQuery(undefined, { enabled: !!user });
  const keyCredits = trpc.settings.elevenLabsCredits.useQuery(undefined, { enabled: !!user });
  const hasKey = keyStatus.data?.hasKey ?? false;
  const [keyInput, setKeyInput] = useState("");
  const saveKey = trpc.settings.setElevenLabsKey.useMutation();
  const removeKey = trpc.settings.removeElevenLabsKey.useMutation();
  const deleteAccount = trpc.settings.deleteAccount.useMutation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <div className="relative z-10 text-[var(--space-text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const handleSaveKey = () => {
    const apiKey = keyInput.trim();
    if (apiKey.length < 8) {
      toast.error("Paste your full ElevenLabs API key.");
      return;
    }
    saveKey.mutate(
      { apiKey },
      {
        onSuccess: () => {
          setKeyInput("");
          keyStatus.refetch();
          keyCredits.refetch();
          toast.success("ElevenLabs key saved. Premium voices are unlocked.");
        },
        onError: (err) => toast.error(err.message || "Could not validate that key."),
      },
    );
  };

  const handleRemoveKey = () => {
    removeKey.mutate(undefined, {
      onSuccess: () => {
        keyStatus.refetch();
        keyCredits.refetch();
        toast.info("ElevenLabs key removed.");
      },
      onError: (err) => toast.error(err.message || "Could not remove key."),
    });
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(
      { confirm: true },
      {
        onSuccess: async () => {
          toast.success("Your account and all projects have been deleted.");
          await refresh();
          navigate("/");
        },
        onError: (err) => toast.error(err.message || "Could not delete account."),
      },
    );
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans">
      <div className="relative z-10">
        <header className="border-b border-[var(--space-border)] bg-[var(--space-card)]/90 backdrop-blur-sm relative">
          <div className="w-full px-6 lg:px-12">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Dashboard</span>
              </button>
              <h1 className="font-bold text-lg text-[var(--space-text)]">Account Settings</h1>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="w-full px-6 lg:px-12 py-8 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* ── Profile (managed by Google) ── */}
            <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <User className="w-5 h-5 text-teal-500" />
                Profile
              </h2>
              <div className="flex items-center gap-4">
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
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--space-text)] truncate">{user.name || "User"}</p>
                  <p className="text-sm text-[var(--space-text-muted)] truncate">{user.email}</p>
                  <p className="text-[11px] text-[var(--space-text-subtle)] mt-1">
                    Managed by your Google account
                    {user.role === "admin" ? " · Admin" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Plan & usage ── */}
            <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <CreditCard className="w-5 h-5 text-teal-500" />
                Plan &amp; Usage
              </h2>
              <div className="flex items-center justify-between p-4 bg-[var(--space-card)] border border-[var(--space-border)] rounded-2xl">
                <div>
                  <p className="font-semibold text-sm text-[var(--space-text)]">
                    {PLAN_LABEL[user.plan] ?? user.plan}
                  </p>
                  <p className="text-xs text-[var(--space-text-muted)]">
                    {user.plan === "free" ? "Upgrade for higher limits and resolutions" : "Thanks for your support"}
                  </p>
                </div>
                {user.plan === "free" && (
                  <Button
                    variant="ghost"
                    className="glass-btn glass-btn-secondary px-4 py-2 font-semibold text-xs rounded-xl"
                    onClick={() => navigate("/pricing")}
                  >
                    Upgrade
                  </Button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[var(--space-card)] border border-[var(--space-border)] rounded-2xl">
                  <p className="font-bold text-lg text-[var(--space-text)]">{user.credits}</p>
                  <p className="text-xs text-[var(--space-text-muted)]">Credits left</p>
                </div>
                <div className="text-center p-3 bg-[var(--space-card)] border border-[var(--space-border)] rounded-2xl">
                  <p className="font-bold text-lg text-[var(--space-text)]">{user.videosCreatedThisMonth}</p>
                  <p className="text-xs text-[var(--space-text-muted)]">Videos this month</p>
                </div>
              </div>
            </div>

            {/* ── ElevenLabs premium voices (BYOK) ── */}
            <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <h2 className="font-semibold text-lg mb-1 flex items-center gap-2 text-[var(--space-text)]">
                <Crown className="w-5 h-5 text-brand" />
                ElevenLabs Premium Voices
              </h2>
              <p className="text-xs text-[var(--space-text-muted)] mb-4">
                Premium voices run on your own ElevenLabs API key. It's validated, encrypted, and used only for your renders.
              </p>

              {keyStatus.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--space-text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking…
                </div>
              ) : hasKey ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--space-text)]">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Key saved ••••{keyStatus.data?.hint}
                    </span>
                    <button
                      onClick={handleRemoveKey}
                      disabled={removeKey.isPending}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50"
                    >
                      {removeKey.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-[var(--space-text-muted)]">
                    {keyCredits.isLoading
                      ? "Checking credits…"
                      : keyCredits.data
                        ? `Credits: ${keyCredits.data.remaining.toLocaleString()} / ${keyCredits.data.limit.toLocaleString()}${keyCredits.data.tier ? ` · ${keyCredits.data.tier}` : ""}`
                        : "Key saved. Couldn't fetch live credits right now."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="Paste API key (sk_…)"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveKey();
                      }}
                    />
                    <Button
                      onClick={handleSaveKey}
                      disabled={saveKey.isPending}
                      className="bg-brand hover:bg-brand-hover text-white font-bold"
                    >
                      {saveKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                  <a
                    href="/blog/elevenlabs-api-key-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-semibold text-brand hover:underline"
                  >
                    How do I get an API key? Read the guide →
                  </a>
                </div>
              )}
            </div>

            {/* ── Danger Zone ── */}
            <div className="glass-panel p-6 border border-red-500/30 bg-red-500/5 rounded-2xl">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-red-500">
                <Shield className="w-5 h-5" />
                Danger Zone
              </h2>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--space-text)]">Delete Account</p>
                  <p className="text-xs text-[var(--space-text-muted)]">
                    Permanently deletes your account and every project. This cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs py-2 px-4 shrink-0"
                    >
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes your account, all your projects, their steps,
                        and render history. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteAccount.isPending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteAccount();
                        }}
                        disabled={deleteAccount.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        {deleteAccount.isPending ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                          </span>
                        ) : (
                          "Yes, delete everything"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
