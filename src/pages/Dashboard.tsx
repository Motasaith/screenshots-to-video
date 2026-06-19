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
  Wand2,
  Camera,
} from "lucide-react";
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
  const [deleteProjectInfo, setDeleteProjectInfo] = useState<{ id: number; type: "tutorial" | "studio" } | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  const { data: standardProjects, isLoading: standardLoading } = trpc.project.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: studioProjects, isLoading: studioLoading } = trpc.studio.list.useQuery(undefined, {
    enabled: !!user,
  });

  const projects = [
    ...(standardProjects?.map((p) => ({ ...p, type: "tutorial" as const })) || []),
    ...(studioProjects?.map((p) => ({ ...p, type: "studio" as const })) || []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isLoading = standardLoading || studioLoading;

  const utils = trpc.useUtils();
  const deleteProjectMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setDeleteProjectInfo(null);
    },
  });
  const deleteStudioMutation = trpc.studio.delete.useMutation({
    onSuccess: () => {
      utils.studio.list.invalidate();
      setDeleteProjectInfo(null);
    },
  });

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

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 transition-all duration-300">
          <div className="max-w-6xl mx-auto rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_35px_rgba(0,0,0,0.06)] px-6 py-1">
            <div className="flex items-center justify-between h-14">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate("/")}
              >
                <Film className="w-5 h-5 text-teal-500" />
                <span className="font-bold text-lg text-[var(--space-text)]">AIVideo</span>
              </div>
              <div className="flex items-center gap-4">
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
                  onClick={logout}
                  className="glass-btn glass-btn-secondary p-2 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-6xl mx-auto px-6 py-8 pt-28">
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
            <Button
              onClick={() => setShowNewProjectDialog(true)}
              className="glass-btn glass-btn-primary py-3.5 px-6 rounded-xl font-semibold text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Project
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                      if (project.type === "studio") {
                        const stepMap: Record<string, string> = {
                          draft: "describe",
                          scripted: "script",
                          media_ready: "media",
                          processing: "render",
                          complete: "export",
                          error: "render",
                        };
                        const step = stepMap[project.status] || "describe";
                        navigate(`/studio/${project.id}/${step}`);
                      } else {
                        if (project.status === "draft") {
                          navigate(`/create/${project.id}/setup`);
                        } else {
                          navigate(`/create/${project.id}/export`);
                        }
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
                          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                            project.type === "studio"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-teal-500/10 text-teal-550 border-teal-500/20"
                          }`}>
                            {project.type === "studio" ? "🎬 Studio" : "📸 Tutorial"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProjectInfo({ id: project.id, type: project.type });
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--space-text-subtle)] hover:text-red-500 focus:outline-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-bold text-lg leading-tight line-clamp-2 text-[var(--space-text)] group-hover:text-teal-650 transition-colors">
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
                onClick={() => setShowNewProjectDialog(true)}
                className="glass-btn glass-btn-primary py-3.5 px-6 rounded-xl font-semibold text-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Project
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* New Project Type Selection Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="glass-panel border border-[var(--space-border)] bg-[var(--space-card)]/95 max-w-lg rounded-2xl shadow-xl gap-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-[var(--space-text)] text-xl font-bold">
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-[var(--space-text-muted)] text-sm leading-relaxed mt-1">
              Choose how you want to create your video
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <button
              onClick={() => {
                setShowNewProjectDialog(false);
                navigate("/create/0/setup");
              }}
              className="glass-panel p-5 text-left bg-[var(--space-card)] border border-[var(--space-border)] hover:border-teal-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group flex items-start gap-4 cursor-pointer rounded-2xl"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-teal-500/10 border border-teal-500/20 rounded-xl flex-shrink-0 group-hover:bg-teal-500/20 transition-colors">
                <Camera className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--space-text)] group-hover:text-teal-650 transition-colors">
                  📸 Screenshot Tutorial
                </h3>
                <p className="text-sm text-[var(--space-text-muted)] mt-1 leading-relaxed">
                  Upload screenshots and turn them into a professional tutorial video with zoom effects and narration.
                </p>
                <span className="font-mono text-[9px] text-[var(--space-text-subtle)] mt-2 inline-block">
                  Upload → Script → Annotate → Render
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowNewProjectDialog(false);
                navigate("/studio/new");
              }}
              className="glass-panel p-5 text-left bg-[var(--space-card)] border border-[var(--space-border)] hover:border-amber-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group flex items-start gap-4 cursor-pointer rounded-2xl"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-amber-500/10 border border-amber-500/20 rounded-xl flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Wand2 className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--space-text)] group-hover:text-amber-500 transition-colors">
                  🎬 AI Video Studio
                </h3>
                <p className="text-sm text-[var(--space-text-muted)] mt-1 leading-relaxed">
                  Describe your video topic and AI generates everything — script, stock footage, voiceover, and final video.
                </p>
                <span className="font-mono text-[9px] text-[var(--space-text-subtle)] mt-2 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Powered by AI + Pexels
                </span>
              </div>
            </button>
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
                  if (deleteProjectInfo.type === "studio") {
                    deleteStudioMutation.mutate({ id: deleteProjectInfo.id });
                  } else {
                    deleteProjectMutation.mutate({ id: deleteProjectInfo.id });
                  }
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
    </div>
  );
}
