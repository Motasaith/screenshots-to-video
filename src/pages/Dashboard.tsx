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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-5 h-5 animate-spin" />
          <span className="font-dm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-4 h-4 text-accent" />;
      case "processing":
        return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Sparkles className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen dot-grid">
      <header className="border-b-2 border-[var(--sketch-border-color)] bg-[var(--sketch-card-bg)]/90 backdrop-blur-sm relative">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FBBF24]/60" />
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <Film className="w-6 h-6 text-[var(--sketch-fg)]" />
              <span className="font-body font-bold text-xl text-[var(--sketch-fg)]">AIVideo</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-body text-sm text-[var(--sketch-fg-muted)] hidden sm:block">
                {user.name || user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/videos")}
                className="sketch-btn-ghost gap-2"
              >
                <Film className="w-4 h-4" />
                <span className="hidden sm:inline">My Videos</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/settings")}
                className="sketch-btn-ghost"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="sketch-btn-ghost"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 lg:px-12 py-8">
        {user?.plan === "free" && (
          <div className="mb-6 p-4 bg-amber-500/5 border-2 border-amber-500 sketch-border-sm">
            <p className="font-body text-sm text-amber-700">
              🎓 You're on the Free plan (5 videos/month, 720p, 7-day expiry).
              <button
                onClick={() => navigate("/pricing")}
                className="underline ml-1 font-semibold"
              >
                Upgrade to Pro
              </button>
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-body font-bold text-3xl tracking-tight text-[var(--sketch-fg)]">
              My Projects
            </h1>
            <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-1">
              Manage your video projects and drafts
            </p>
          </div>
          <Button
            onClick={() => setShowNewProjectDialog(true)}
            className="sketch-btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="sketch-card p-5 bg-[var(--sketch-card-bg)]">
            <p className="font-body text-sm text-[var(--sketch-fg-muted)]">Total Videos</p>
            <p className="font-body font-bold text-3xl mt-1 text-[var(--sketch-fg)]">
              {projects?.length || 0}
            </p>
          </div>
          <div className="sketch-card p-5 bg-[var(--sketch-card-bg)]">
            <p className="font-body text-sm text-[var(--sketch-fg-muted)]">Completed</p>
            <p className="font-body font-bold text-3xl mt-1 text-[var(--sketch-fg)]">
              {projects?.filter((p) => p.status === "complete").length || 0}
            </p>
          </div>
          <div className="sketch-card p-5 bg-[var(--sketch-card-bg)]">
            <p className="font-body text-sm text-[var(--sketch-fg-muted)]">This Month</p>
            <p className="font-body font-bold text-3xl mt-1 text-[var(--sketch-fg)]">
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

        {/* AdSense Placeholder */}
        <div className="w-full bg-[var(--sketch-card-bg)] border-2 border-dashed border-[var(--sketch-fg-subtle)] p-6 mb-8 text-center flex flex-col items-center justify-center">
          <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] uppercase tracking-widest bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 sketch-border-sm mb-2 inline-block">
            Advertisement
          </span>
          <p className="font-body text-sm text-[var(--sketch-fg-muted)]">
            Google AdSense Placeholder (728x90)
          </p>
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
                  className="sketch-card-hover p-5 cursor-pointer group bg-[var(--sketch-card-bg)]"
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
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(project.status)}
                      <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] capitalize">
                        {project.status}
                      </span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-md sketch-border-sm ${
                        project.type === "studio"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      }`}>
                        {project.type === "studio" ? "🎬 Studio" : "📸 Tutorial"}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectInfo({ id: project.id, type: project.type });
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-body font-semibold text-lg leading-tight line-clamp-2 text-[var(--sketch-fg)]">
                    {project.title}
                  </h3>
                  <p className="font-body text-xs text-[var(--sketch-fg-subtle)] mt-1 capitalize">
                    {project.platform} — {project.resolution}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    {project.status === "complete" && (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-500">
                        <Play className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="sketch-card p-12 text-center bg-[var(--sketch-card-bg)]">
            <Film className="w-12 h-12 text-[var(--sketch-fg-subtle)] mx-auto mb-4" />
            <h3 className="font-body font-semibold text-xl mb-2 text-[var(--sketch-fg)]">
              No projects yet
            </h3>
            <p className="font-body text-sm text-[var(--sketch-fg-subtle)] mb-6">
              Create your first video project to get started.
            </p>
            <Button
              onClick={() => setShowNewProjectDialog(true)}
              className="sketch-btn-primary"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        )}
      </main>

      {/* New Project Type Selection Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sketch-card border-2 bg-[var(--sketch-card-bg)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-body text-[var(--sketch-fg)] text-xl">
              Create New Project
            </DialogTitle>
            <DialogDescription className="font-body text-[var(--sketch-fg-muted)]">
              Choose how you want to create your video
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <button
              onClick={() => {
                setShowNewProjectDialog(false);
                navigate("/create/0/setup");
              }}
              className="sketch-card-hover p-5 text-left bg-[var(--sketch-card-bg)] group flex items-start gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 border-2 border-blue-500/30 rounded-xl flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                <Camera className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-body font-semibold text-[var(--sketch-fg)] group-hover:text-blue-500 transition-colors">
                  📸 Screenshot Tutorial
                </h3>
                <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-1">
                  Upload screenshots and turn them into a professional tutorial video with zoom effects and narration.
                </p>
                <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)] mt-2 inline-block">
                  Upload → Script → Annotate → Render
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowNewProjectDialog(false);
                navigate("/studio/new");
              }}
              className="sketch-card-hover p-5 text-left bg-[var(--sketch-card-bg)] group flex items-start gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-[#FBBF24]/10 border-2 border-[#FBBF24]/30 rounded-xl flex-shrink-0 group-hover:bg-[#FBBF24]/20 transition-colors">
                <Wand2 className="w-6 h-6 text-[#FBBF24]" />
              </div>
              <div>
                <h3 className="font-body font-semibold text-[var(--sketch-fg)] group-hover:text-[#FBBF24] transition-colors">
                  🎬 AI Video Studio
                </h3>
                <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-1">
                  Describe your video topic and AI generates everything — script, stock footage, voiceover, and final video.
                </p>
                <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)] mt-2 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Powered by AI + Pexels
                </span>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteProjectInfo} onOpenChange={() => setDeleteProjectInfo(null)}>
        <DialogContent className="sketch-card border-2 bg-[var(--sketch-card-bg)]">
          <DialogHeader>
            <DialogTitle className="font-body text-[var(--sketch-fg)]">Delete Project</DialogTitle>
            <DialogDescription className="font-body text-[var(--sketch-fg-muted)]">
              This will permanently delete this project and all its steps. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteProjectInfo(null)}
              className="sketch-btn-ghost"
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
              className="sketch-btn"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
