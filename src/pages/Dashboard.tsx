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
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: projects, isLoading } = trpc.project.list.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setDeleteId(null);
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
            onClick={() => navigate("/create/0/setup")}
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

        {projects && projects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="sketch-card-hover p-5 cursor-pointer group bg-[var(--sketch-card-bg)]"
                  onClick={() => {
                    if (project.status === "draft") {
                      navigate(`/create/${project.id}/setup`);
                    } else {
                      navigate(`/create/${project.id}/export`);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(project.status)}
                      <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] capitalize">
                        {project.status}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(project.id);
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
              onClick={() => navigate("/create/0/setup")}
              className="sketch-btn-primary"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        )}
      </main>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
              onClick={() => setDeleteId(null)}
              className="sketch-btn-ghost"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ id: deleteId });
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
