import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Play,
  Settings,
  Sparkles,
  LogOut,
  X,
  Sun,
  Moon,
  Coins,
} from "lucide-react";
import { useTheme } from "next-themes";
import { detectGibberish } from "@/lib/gibberish";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const [deleteProjectInfo, setDeleteProjectInfo] = useState<{ id: number } | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  const { data: standardProjects, isLoading: standardLoading } = trpc.project.list.useQuery(undefined, {
    enabled: !!user,
  });

  const projects = [
    ...(standardProjects?.map((p) => ({ ...p, type: "tutorial" as const })) || []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isLoading = standardLoading;

  const utils = trpc.useUtils();
  const createProject = trpc.project.create.useMutation();
  const [selectedRatio, setSelectedRatio] = useState<"16:9" | "9:16" | "1:1" | "4:5">("16:9");
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  
  const deleteProjectMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setDeleteProjectInfo(null);
    },
  });

  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const deleteAllProjectsMutation = trpc.project.deleteAll.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
    },
  });

  const handleDeleteAll = async () => {
    try {
      setDeletingAll(true);
      await deleteAllProjectsMutation.mutateAsync();
      setShowDeleteAllDialog(false);
    } catch (err) {
      console.error("Failed to delete all projects:", err);
    } finally {
      setDeletingAll(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="theme-3d-immersive min-h-screen flex items-center justify-center font-sans">
        <SpaceBackground />
        <div className="relative z-10 flex items-center gap-2 text-[var(--space-text-subtle)] font-mono">
          <Clock className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-4 h-4 text-teal-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-amber-500 animate-pulse" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-[var(--space-text-subtle)]" />;
    }
  };

  const platformForRatio = (ratio: string) =>
    ratio === "16:9" ? "youtube" : ratio === "9:16" ? "tiktok" : ratio === "4:5" ? "instagram" : "linkedin";

  const handleCreateBlankProject = async () => {
    try {
      setCreatingProject(true);
      const rawPlatform = platformForRatio(selectedRatio);
      const platform: "youtube" | "teams" | "tiktok" | "linkedin" =
        rawPlatform === "instagram" ? "linkedin" : rawPlatform;
      const result = await createProject.mutateAsync({
        title: newProjectTitle.trim() || "Untitled video",
        description: newProjectDesc.trim() || "Screenshot tutorial video",
        platform,
        aspectRatio: selectedRatio,
      });
      setNewProjectTitle("");
      setNewProjectDesc("");
      setShowNewProjectDialog(false);
      navigate(`/create/${result.id}/preview`);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreatingProject(false);
    }
  };

  const resetMegaMenu = () => {
    setSelectedRatio("16:9");
    setNewProjectTitle("");
    setNewProjectDesc("");
  };

  const openMegaMenu = () => {
    resetMegaMenu();
    setShowNewProjectDialog(true);
  };

  const closeMegaMenu = () => {
    setShowNewProjectDialog(false);
    setTimeout(resetMegaMenu, 300);
  };

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 transition-all duration-300">
          <div className="max-w-6xl mx-auto rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_35px_rgba(0,0,0,0.06)] px-3 sm:px-6 py-1">
            <div className="flex items-center justify-between h-14">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate("/")}
              >
                <Film className="w-5 h-5 text-teal-500" />
                <span className="font-bold text-lg text-[var(--space-text)]">AIVideo</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xs font-mono text-[var(--space-text-subtle)] hidden sm:block">
                  {user.name || user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/videos")}
                  className="glass-btn glass-btn-secondary gap-2 py-1.5 px-3 rounded-lg text-xs"
                >
                  <Film className="w-4 h-4" />
                  <span className="hidden sm:inline">My Videos</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/settings")}
                  className="glass-btn glass-btn-secondary p-2 rounded-lg"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="glass-btn glass-btn-secondary p-2 rounded-lg"
                  aria-label="Toggle dark mode"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[var(--space-text-muted)]" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="glass-btn glass-btn-secondary p-2 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-8 pt-28">
          {user?.plan === "free" && (
            <div className="mb-6 p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
              <p className="text-sm text-[var(--space-text-muted)] leading-relaxed">
                🎓 You're on the Free plan (5 videos/month, 720p, 7-day expiry).
                <button
                  onClick={() => navigate("/pricing")}
                  className="underline ml-1 font-semibold text-teal-600 dark:text-teal-400"
                >
                  Upgrade to Pro
                </button>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-extrabold text-3xl tracking-tight text-[var(--space-text)]">
                My Projects
              </h1>
              <p className="text-sm text-[var(--space-text-muted)] mt-1">
                Manage your video projects and drafts
              </p>
            </div>
            <div className="flex items-center gap-3">
              {projects && projects.length > 0 && (
                <Button
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="bg-red-500/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white transition-all py-3.5 px-6 rounded-xl font-semibold text-xs cursor-pointer flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete All
                </Button>
              )}
              <Button
                onClick={openMegaMenu}
                className="glass-btn glass-btn-primary py-3.5 px-6 rounded-xl font-semibold text-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Project
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="glass-panel p-5 bg-[var(--space-card)]/80 border border-[var(--space-border)] rounded-2xl">
              <p className="text-sm text-[var(--space-text-subtle)] font-mono uppercase tracking-wider">Total Videos</p>
              <p className="font-bold text-3xl mt-1 text-[var(--space-text)]">
                {projects?.length || 0}
              </p>
            </div>
            <div className="glass-panel p-5 bg-[var(--space-card)]/80 border border-[var(--space-border)] rounded-2xl">
              <p className="text-sm text-[var(--space-text-subtle)] font-mono uppercase tracking-wider">Completed</p>
              <p className="font-bold text-3xl mt-1 text-[var(--space-text)]">
                {projects?.filter((p) => p.status === "complete").length || 0}
              </p>
            </div>
            <div className="glass-panel p-5 bg-[var(--space-card)]/80 border border-[var(--space-border)] rounded-2xl">
              <p className="text-sm text-[var(--space-text-subtle)] font-mono uppercase tracking-wider">This Month</p>
              <p className="font-bold text-3xl mt-1 text-[var(--space-text)]">
                {projects?.filter((p) => {
                  const d = new Date(p.createdAt);
                  const now = new Date();
                  return (
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear()
                  );
                }).length || 0}
              </p>
            </div>
            <div className={`glass-panel p-5 rounded-2xl border ${
              user.credits <= 2
                ? "bg-amber-500/5 border-amber-500/30"
                : "bg-[var(--space-card)]/80 border-[var(--space-border)]"
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--space-text-subtle)] font-mono uppercase tracking-wider">Credits</p>
                <Coins className={`w-4 h-4 ${user.credits <= 2 ? "text-amber-500" : "text-teal-500"}`} />
              </div>
              <p className={`font-bold text-3xl mt-1 ${
                user.credits <= 2 ? "text-amber-500" : "text-[var(--space-text)]"
              }`}>
                {user.credits}
              </p>
              <p className="text-[10px] text-[var(--space-text-subtle)] font-mono mt-1 capitalize">
                {user.plan} plan
              </p>
            </div>
          </div>

          {projects && projects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {projects.map((project) => (
                  <motion.div
                    key={`${project.type}-${project.id}`}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-panel p-5 cursor-pointer group bg-[var(--space-card)]/80 border border-[var(--space-border)] hover:scale-[1.02] transition-all duration-300 rounded-2xl flex flex-col justify-between"
                    onClick={() => {
                      if (project.status === "draft") {
                        navigate(`/create/${project.id}/preview`);
                      } else {
                        navigate(`/create/${project.id}/export`);
                      }
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(project.status)}
                          <span className="font-mono text-[10px] text-[var(--space-text-subtle)] capitalize">
                            {project.status}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProjectInfo({ id: project.id });
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--space-text-subtle)] hover:text-red-500 focus:outline-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-bold text-lg leading-tight line-clamp-2 text-[var(--space-text)] group-hover:text-teal-600 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-xs text-[var(--space-text-subtle)] mt-1 capitalize font-mono">
                        {project.platform} — {project.resolution}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[var(--space-border)] pt-3">
                      <span className="font-mono text-xs text-[var(--space-text-subtle)]">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                      {project.status === "complete" && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-teal-500 font-semibold">
                          <Play className="w-3 h-3 fill-teal-500" />
                          Ready
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center bg-[var(--space-card)]/80 border border-[var(--space-border)] rounded-2xl">
              <Film className="w-12 h-12 text-[var(--space-text-subtle)] mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2 text-[var(--space-text)]">
                No projects yet
              </h3>
              <p className="text-sm text-[var(--space-text-muted)] mb-6">
                Create your first video project to get started.
              </p>
              <Button
                onClick={openMegaMenu}
                className="glass-btn glass-btn-primary py-3.5 px-6 rounded-xl font-semibold text-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Project
              </Button>
            </div>
          )}
        </main>
      </div>
      {/* Upgraded Mega Menu — New Project Dialog */}
      <Dialog
        open={showNewProjectDialog}
        onOpenChange={(open) => {
          if (creatingProject) return;
          if (!open) closeMegaMenu();
          else setShowNewProjectDialog(true);
        }}
      >
        <DialogContent showCloseButton={false} className="border border-[var(--space-border)] bg-[var(--space-card)] dark:bg-[#041715] sm:max-w-3xl w-[92vw] h-auto rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col select-none">
          {/* Header bar */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--space-border)]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[var(--space-text)] tracking-tight">
                  Create a New Video
                </h2>
                <p className="text-xs text-[var(--space-text-subtle)] font-medium">
                  Set up your project details to get started
                </p>
              </div>
            </div>
            <button
              onClick={closeMegaMenu}
              disabled={creatingProject}
              className="p-2 rounded-xl hover:bg-[var(--space-border)]/20 text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
            {/* Grid container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Title & Description */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[var(--space-text)]">
                    Video Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="e.g. How to clean Windows temp files"
                    className="w-full text-sm bg-slate-100/40 dark:bg-slate-950/40 border border-[var(--space-border)] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-4 py-2.5 text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)] focus:outline-none transition-all"
                  />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-[var(--space-text-subtle)]">
                      {newProjectTitle.trim().length === 0 ? (
                        <span className="text-amber-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Min 3 characters required
                        </span>
                      ) : newProjectTitle.trim().length < 3 ? (
                        <span className="text-amber-500 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3 animate-pulse" /> Title is too short (min 3 chars)
                        </span>
                      ) : newProjectTitle.length > 100 ? (
                        <span className="text-red-500 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3" /> Title is too long (max 100 chars)
                        </span>
                      ) : detectGibberish(newProjectTitle).isGibberish ? (
                        <span className="text-red-500 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3 animate-pulse" /> {detectGibberish(newProjectTitle).reason?.replace("a real step description", "a real video title").replace("what the user should do", "a valid video title")}
                        </span>
                      ) : (
                        <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                          ✓ Looks good!
                        </span>
                      )}
                    </span>
                    <span className={`text-[10px] font-mono ${newProjectTitle.length > 100 || detectGibberish(newProjectTitle).isGibberish ? 'text-red-500 font-bold' : 'text-[var(--space-text-subtle)]'}`}>
                      {newProjectTitle.length}/100
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[var(--space-text)]">
                    Topic Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Describe what this video is about, who the audience is, and what they should be able to do after watching."
                    className="w-full text-sm bg-slate-100/40 dark:bg-slate-950/40 border border-[var(--space-border)] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-4 py-3 text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)] focus:outline-none resize-none transition-all"
                    rows={5}
                  />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-[var(--space-text-subtle)]">
                      {newProjectDesc.trim().length === 0 ? (
                        <span className="text-amber-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Min 10 characters required
                        </span>
                      ) : newProjectDesc.trim().length < 10 ? (
                        <span className="text-amber-500 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3 animate-pulse" /> Description is too short (min 10 chars)
                        </span>
                      ) : newProjectDesc.length > 1000 ? (
                        <span className="text-red-500 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3" /> Description is too long (max 1000 chars)
                        </span>
                      ) : detectGibberish(newProjectDesc).isGibberish ? (
                        <span className="text-red-500 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3 animate-pulse" /> {detectGibberish(newProjectDesc).reason?.replace("a real step description", "a real video description").replace("what the user should do", "a valid video description")}
                        </span>
                      ) : (
                        <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                          ✓ Looks good!
                        </span>
                      )}
                    </span>
                    <span className={`text-[10px] font-mono ${newProjectDesc.length > 1000 || detectGibberish(newProjectDesc).isGibberish ? 'text-red-500 font-bold' : 'text-[var(--space-text-subtle)]'}`}>
                      {newProjectDesc.length}/1000
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Aspect Ratio */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-[var(--space-text)]">
                  Select Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { ratio: "16:9", label: "Landscape", desc: "YouTube, Widescreen" },
                    { ratio: "9:16", label: "Portrait", desc: "TikTok, Reels" },
                    { ratio: "1:1", label: "Square", desc: "Instagram, Post" },
                    { ratio: "4:5", label: "Vertical", desc: "Facebook, Portrait" },
                  ] as const).map((r) => {
                    const isSelected = selectedRatio === r.ratio;
                    return (
                      <button
                        key={r.ratio}
                        type="button"
                        onClick={() => setSelectedRatio(r.ratio)}
                        className={`p-4 rounded-2xl text-sm font-semibold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-teal-500/5 dark:bg-teal-955 border-teal-500/50 dark:border-teal-400/50 text-teal-700 dark:text-teal-400 shadow-md shadow-teal-500/5"
                            : "bg-slate-50/50 dark:bg-slate-900/10 border-[var(--space-border)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/40 dark:hover:bg-slate-900/30"
                        }`}
                      >
                        <div className="flex items-center justify-center w-14 h-14 shrink-0">
                          {getRatioSvg(r.ratio, isSelected)}
                        </div>
                        <div className="text-center leading-tight">
                          <div className={`font-bold text-xs ${isSelected ? "text-teal-700 dark:text-teal-400" : "text-slate-800 dark:text-slate-200"}`}>{r.label}</div>
                          <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-teal-600/80 dark:text-teal-400/80" : "text-slate-500"}`}>{r.ratio}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Create/Cancel button footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--space-border)] mt-4">
              <Button
                variant="ghost"
                onClick={closeMegaMenu}
                disabled={creatingProject}
                className="glass-btn glass-btn-secondary px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBlankProject}
                disabled={
                  newProjectTitle.trim().length < 3 || 
                  newProjectTitle.length > 100 || 
                  detectGibberish(newProjectTitle).isGibberish ||
                  newProjectDesc.trim().length < 10 || 
                  newProjectDesc.length > 1000 || 
                  detectGibberish(newProjectDesc).isGibberish ||
                  creatingProject
                }
                className="glass-btn glass-btn-primary px-6 py-2.5 rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-teal-500 to-emerald-500 border border-teal-400/20 hover:from-teal-400 hover:to-emerald-400 text-white font-extrabold shadow-[0_4px_20px_rgba(45,212,191,0.25)] hover:shadow-[0_0_20px_rgba(45,212,191,0.4)]"
              >
                {creatingProject ? (
                  <><Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="w-3.5 h-3.5 mr-1.5" /> Create Project</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={!!deleteProjectInfo} onOpenChange={() => setDeleteProjectInfo(null)}>
        <DialogContent className="glass-panel border border-[var(--space-border)] bg-[var(--space-card)]/95 rounded-2xl p-6 shadow-xl max-w-md gap-6">
          <DialogHeader>
            <DialogTitle className="text-[var(--space-text)] font-bold text-lg">Delete Project</DialogTitle>
            <DialogDescription className="text-[var(--space-text-muted)] text-sm leading-relaxed mt-1">
              This will permanently delete this project and all its steps. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteProjectInfo(null)}
              className="glass-btn glass-btn-secondary py-3 px-5 rounded-xl font-semibold text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteProjectInfo) {
                  deleteProjectMutation.mutate({ id: deleteProjectInfo.id });
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs py-3 px-5 font-semibold"
            >
              <Trash2 className="w-4 h-4 mr-1.5 inline" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Projects Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={(open) => !deletingAll && setShowDeleteAllDialog(open)}>
        <DialogContent className="glass-panel border border-[var(--space-border)] bg-[var(--space-card)]/95 rounded-2xl p-6 shadow-xl max-w-md gap-6">
          <DialogHeader>
            <DialogTitle className="text-[var(--space-text)] font-bold text-lg">Delete All Projects</DialogTitle>
            <DialogDescription className="text-[var(--space-text-muted)] text-sm leading-relaxed mt-1">
              Are you sure you want to delete all projects? This will permanently delete all projects, along with all their steps and render jobs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="ghost"
              disabled={deletingAll}
              onClick={() => setShowDeleteAllDialog(false)}
              className="glass-btn glass-btn-secondary py-3 px-5 rounded-xl font-semibold text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingAll}
              onClick={handleDeleteAll}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs py-3 px-5 font-semibold disabled:opacity-50"
            >
              {deletingAll ? (
                <>
                  <Clock className="w-4 h-4 mr-1.5 inline animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1.5 inline" />
                  Delete All
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getRatioSvg(ratio: "16:9" | "9:16" | "1:1" | "4:5", isSelected: boolean) {
  const colorClass = isSelected
    ? "text-teal-500 dark:text-teal-400"
    : "text-slate-400 dark:text-slate-500";
  const bgOpacity = isSelected ? "0.1" : "0.03";

  switch (ratio) {
    case "16:9":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="9" width="56" height="31.5" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <polygon points="28,21 38,25 28,29" fill="currentColor" fillOpacity="0.8" />
          <path d="M26,41.5 L38,41.5 M32,41.5 L32,45 M24,45 L40,45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "9:16":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="22" y="4" width="20" height="36.5" rx="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <line x1="29" y1="8" x2="35" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="30,19 37,22 30,25" fill="currentColor" fillOpacity="0.8" />
          <line x1="28" y1="36.5" x2="36" y2="36.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "1:1":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="17" y="9" width="30" height="30" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <circle cx="25" cy="17" r="3" fill="currentColor" fillOpacity="0.8" />
          <path d="M19,34 L27,25 L33,31 L41,22 L45,26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "4:5":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="6" width="28" height="35" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <circle cx="24" cy="12" r="2" fill="currentColor" fillOpacity="0.8" />
          <line x1="29" y1="12" x2="41" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="22" y="17" width="20" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
          <circle cx="24" cy="37.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
          <circle cx="28" cy="37.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
        </svg>
      );
    default:
      return null;
  }
}
