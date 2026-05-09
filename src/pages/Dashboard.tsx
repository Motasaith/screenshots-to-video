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
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card">
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <Film className="w-6 h-6 text-primary" />
              <span className="font-syne font-bold text-xl">AIVideo</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-dm text-sm text-muted-foreground hidden sm:block">
                {user.name || user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/settings")}
                className="border-2 border-border"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="border-2 border-border"
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
            <h1 className="font-syne font-bold text-3xl tracking-tight">
              My Projects
            </h1>
            <p className="font-dm text-sm text-muted-foreground mt-1">
              Manage your video projects and drafts
            </p>
          </div>
          <Button
            onClick={() => navigate("/create/0/setup")}
            className="neo-btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="neo-card p-5">
            <p className="font-dm text-sm text-muted-foreground">Total Videos</p>
            <p className="font-syne font-bold text-3xl mt-1">
              {projects?.length || 0}
            </p>
          </div>
          <div className="neo-card p-5">
            <p className="font-dm text-sm text-muted-foreground">Completed</p>
            <p className="font-syne font-bold text-3xl mt-1">
              {projects?.filter((p) => p.status === "complete").length || 0}
            </p>
          </div>
          <div className="neo-card p-5">
            <p className="font-dm text-sm text-muted-foreground">This Month</p>
            <p className="font-syne font-bold text-3xl mt-1">
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
                  className="neo-card-hover p-5 cursor-pointer group"
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
                      <span className="font-mono text-xs text-muted-foreground capitalize">
                        {project.status}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(project.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-syne font-semibold text-lg leading-tight line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="font-dm text-xs text-muted-foreground mt-1 capitalize">
                    {project.platform} — {project.resolution}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    {project.status === "complete" && (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-accent">
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
          <div className="neo-card p-12 text-center">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-syne font-semibold text-xl mb-2">
              No projects yet
            </h3>
            <p className="font-dm text-sm text-muted-foreground mb-6">
              Create your first video project to get started.
            </p>
            <Button
              onClick={() => navigate("/create/0/setup")}
              className="neo-btn-primary"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        )}
      </main>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="neo-card border-2">
          <DialogHeader>
            <DialogTitle className="font-syne">Delete Project</DialogTitle>
            <DialogDescription className="font-dm">
              This will permanently delete this project and all its steps. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteId(null)}
              className="border-2 border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ id: deleteId });
              }}
              className="neo-btn"
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
