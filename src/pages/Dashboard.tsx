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
  Upload,
  Clapperboard,
  FileVideo,
  Monitor,
  X,
  ArrowRight,
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
  const createProject = trpc.project.create.useMutation();
  const createStudioProject = trpc.studio.create.useMutation();
  const [selectedRatio, setSelectedRatio] = useState<"16:9" | "9:16" | "1:1" | "4:5">("16:9");
  const [megaMenuStep, setMegaMenuStep] = useState<"choose" | "configure">("choose");
  const [selectedProjectType, setSelectedProjectType] = useState<"studio" | "tutorial" | "blank" | "upload">("tutorial");
  // Studio-specific fields
  const [studioTopic, setStudioTopic] = useState("");
  const [studioStyle, setStudioStyle] = useState<"educational" | "entertaining" | "promotional" | "documentary">("educational");
  const [studioTone, setStudioTone] = useState<"professional" | "casual" | "energetic" | "calm">("professional");
  const [studioAudience, setStudioAudience] = useState("");
  const [studioDuration, setStudioDuration] = useState(60);
  const [creatingProject, setCreatingProject] = useState(false);
  
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

  const platformForRatio = (ratio: string) =>
    ratio === "16:9" ? "youtube" : ratio === "9:16" ? "tiktok" : ratio === "4:5" ? "instagram" : "linkedin";

  const handleCreateBlankProject = async () => {
    try {
      setCreatingProject(true);
      setShowNewProjectDialog(false);
      const rawPlatform = platformForRatio(selectedRatio);
      const platform: "youtube" | "teams" | "tiktok" | "linkedin" =
        rawPlatform === "instagram" ? "linkedin" : rawPlatform;
      const result = await createProject.mutateAsync({
        title: "Untitled video",
        description: "Screenshot tutorial video",
        platform,
        aspectRatio: selectedRatio,
      });
      navigate(`/create/${result.id}/preview`);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleCreateStudioProject = async () => {
    if (!studioTopic.trim() || !studioAudience.trim()) return;
    try {
      setCreatingProject(true);
      setShowNewProjectDialog(false);
      const result = await createStudioProject.mutateAsync({
        topic: studioTopic.trim(),
        style: studioStyle,
        targetDuration: studioDuration,
        audience: studioAudience.trim(),
        tone: studioTone,
        platform: platformForRatio(selectedRatio) as "youtube" | "tiktok" | "linkedin" | "instagram",
        aspectRatio: selectedRatio as "16:9" | "9:16" | "1:1" | "4:5",
      });
      navigate(`/studio/${result.id}/describe`);
    } catch (err) {
      console.error("Failed to create studio project:", err);
    } finally {
      setCreatingProject(false);
    }
  };

  const resetMegaMenu = () => {
    setMegaMenuStep("choose");
    setSelectedProjectType("tutorial");
    setStudioTopic("");
    setStudioAudience("");
    setStudioStyle("educational");
    setStudioTone("professional");
    setStudioDuration(60);
    setSelectedRatio("16:9");
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
              onClick={openMegaMenu}
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
      <Dialog open={showNewProjectDialog} onOpenChange={(open) => { if (!open) closeMegaMenu(); else setShowNewProjectDialog(true); }}>
        <DialogContent showCloseButton={false} className="border border-[var(--space-border)] bg-[var(--space-card)] dark:bg-[#041715] sm:max-w-6xl w-[92vw] h-auto rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col select-none">
          {/* Header bar */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--space-border)]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[var(--space-text)] tracking-tight">
                  {megaMenuStep === "choose" ? "Create a New Video" : "Configure Your Video"}
                </h2>
                <p className="text-xs text-[var(--space-text-subtle)] font-medium">
                  {megaMenuStep === "choose" ? "Choose a project type to get started" : "Set up your project details"}
                </p>
              </div>
            </div>
            <button onClick={closeMegaMenu} className="p-2 rounded-xl hover:bg-[var(--space-border)]/20 text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: Choose project type */}
          {megaMenuStep === "choose" && (
            <div className="p-8 flex flex-col gap-8">
              {/* Aspect Ratio Selector */}
              <div className="flex flex-col gap-3 items-center">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--space-text-subtle)] font-bold">Select Aspect Ratio</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full max-w-3xl p-2 bg-slate-100 dark:bg-slate-900 border border-[var(--space-border)] rounded-3xl">
                  {([
                    { ratio: "16:9", label: "Landscape", desc: "YouTube, Widescreen", w: "w-10", h: "h-5" },
                    { ratio: "9:16", label: "Portrait", desc: "TikTok, Reels", w: "w-5", h: "h-10" },
                    { ratio: "1:1", label: "Square", desc: "Instagram, Post", w: "w-7", h: "h-7" },
                    { ratio: "4:5", label: "Vertical", desc: "Facebook, Portrait", w: "w-6", h: "h-8" },
                  ] as const).map((r) => {
                    const isSelected = selectedRatio === r.ratio;
                    return (
                      <button
                        key={r.ratio}
                        type="button"
                        onClick={() => setSelectedRatio(r.ratio)}
                        className={`px-5 py-5 rounded-2xl text-sm font-semibold flex flex-col items-center justify-center gap-3 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-white dark:bg-teal-950/60 border-teal-500/50 dark:border-teal-400/50 text-teal-700 dark:text-teal-400 shadow-md shadow-teal-500/10"
                            : "bg-white/90 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 shadow-sm"
                        }`}
                      >
                        <div className={`flex items-center justify-center w-16 h-16 rounded-xl bg-slate-50 dark:bg-slate-800/50 border ${isSelected ? "border-teal-300 dark:border-teal-500/30" : "border-slate-200 dark:border-[var(--space-border)]"} shrink-0`}>
                          <span className={`${r.w} ${r.h} border-[3px] ${isSelected ? "border-teal-500 dark:border-teal-400" : "border-slate-400 dark:border-slate-500"} rounded-sm inline-block transition-colors`} />
                        </div>
                        <div className="text-center leading-tight">
                          <div className={`font-bold text-sm ${isSelected ? "text-teal-700 dark:text-teal-400" : "text-slate-800 dark:text-slate-200"}`}>{r.label}</div>
                          <div className={`text-[11px] font-mono mt-1 ${isSelected ? "text-teal-600/80 dark:text-teal-400/80" : "text-slate-500"}`}>{r.ratio}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Project type cards — 4 main types */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* AI Video Studio (Pexels) */}
                <div
                  className="p-6 bg-[var(--space-card)] border border-[var(--space-border)] hover:border-teal-500/40 hover:bg-[var(--space-card-hover)] dark:bg-slate-950/40 dark:border-teal-500/10 dark:hover:border-teal-400/40 dark:hover:bg-slate-900/60 rounded-2xl transition-all hover:scale-[1.03] flex flex-col items-center justify-between text-center min-h-[240px] cursor-pointer group hover:shadow-[0_10px_30px_rgba(0,89,82,0.06)] dark:hover:shadow-[0_0_30px_rgba(20,184,166,0.2)]"
                  onClick={() => { setSelectedProjectType("studio"); setMegaMenuStep("configure"); }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(20,184,166,0.05)] dark:shadow-[0_0_15px_rgba(20,184,166,0.1)]">
                    <Clapperboard className="w-6 h-6" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-base font-bold text-[var(--space-text)] group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors">AI Video Studio</h4>
                    <p className="text-xs text-[var(--space-text-muted)] mt-2 leading-relaxed font-medium">
                      Describe your topic, AI writes the script and finds stock media from Pexels
                    </p>
                  </div>
                  <span className="mt-4 text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-3 py-1 rounded-md font-mono tracking-wider uppercase font-semibold">AI POWERED</span>
                </div>

                {/* Screenshot Tutorial */}
                <div
                  className="p-6 bg-[var(--space-card)] border border-[var(--space-border)] hover:border-blue-500/40 hover:bg-[var(--space-card-hover)] dark:bg-slate-950/40 dark:border-blue-500/10 dark:hover:border-blue-400/40 dark:hover:bg-slate-900/60 rounded-2xl transition-all hover:scale-[1.03] flex flex-col items-center justify-between text-center min-h-[240px] cursor-pointer group hover:shadow-[0_10px_30px_rgba(59,130,246,0.06)] dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                  onClick={() => { setSelectedProjectType("tutorial"); setMegaMenuStep("configure"); }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.05)] dark:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-base font-bold text-[var(--space-text)] group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">Screenshot Tutorial</h4>
                    <p className="text-xs text-[var(--space-text-muted)] mt-2 leading-relaxed font-medium">
                      Upload screenshots, annotate with zoom, highlights, blur, and captions
                    </p>
                  </div>
                  <span className="mt-4 text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1 rounded-md font-mono tracking-wider uppercase font-semibold">EDITOR</span>
                </div>

                {/* Blank Canvas */}
                <div
                  className="p-6 bg-[var(--space-card)] border border-[var(--space-border)] hover:border-purple-500/40 hover:bg-[var(--space-card-hover)] dark:bg-slate-950/40 dark:border-purple-500/10 dark:hover:border-purple-400/40 dark:hover:bg-slate-900/60 rounded-2xl transition-all hover:scale-[1.03] flex flex-col items-center justify-between text-center min-h-[240px] cursor-pointer group hover:shadow-[0_10px_30px_rgba(168,85,247,0.06)] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                  onClick={() => { setSelectedProjectType("blank"); setMegaMenuStep("configure"); }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.05)] dark:shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-base font-bold text-[var(--space-text)] group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">Blank Canvas</h4>
                    <p className="text-xs text-[var(--space-text-muted)] mt-2 leading-relaxed font-medium">
                      Start from scratch with an empty timeline. Add media from Pexels or uploads
                    </p>
                  </div>
                  <span className="mt-4 text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-3 py-1 rounded-md font-mono tracking-wider uppercase font-semibold">FLEXIBLE</span>
                </div>

                {/* Upload Video */}
                <div
                  className="p-6 bg-[var(--space-card)] border border-[var(--space-border)] hover:border-emerald-500/40 hover:bg-[var(--space-card-hover)] dark:bg-slate-950/40 dark:border-emerald-500/10 dark:hover:border-emerald-400/40 dark:hover:bg-slate-900/60 rounded-2xl transition-all hover:scale-[1.03] flex flex-col items-center justify-between text-center min-h-[240px] cursor-pointer group hover:shadow-[0_10px_30px_rgba(16,185,129,0.06)] dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                  onClick={() => { setSelectedProjectType("upload"); setMegaMenuStep("configure"); }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.05)] dark:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-base font-bold text-[var(--space-text)] group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">Upload Video</h4>
                    <p className="text-xs text-[var(--space-text-muted)] mt-2 leading-relaxed font-medium">
                      Import an existing video file and edit it with the full editor
                    </p>
                  </div>
                  <span className="mt-4 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-md font-mono tracking-wider uppercase font-semibold">IMPORT</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configure project details */}
          {megaMenuStep === "configure" && (
            <div className="p-8 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
              {/* Back button */}
              <button
                type="button"
                onClick={() => setMegaMenuStep("choose")}
                className="flex items-center gap-1.5 text-xs text-[var(--space-text-subtle)] hover:text-teal-400 transition-colors self-start font-medium bg-slate-100/60 dark:bg-slate-950/20 px-3.5 py-2 rounded-xl border border-transparent dark:border-[var(--space-border)] cursor-pointer animate-fade-in"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Back to project types
              </button>

              {/* Project type badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--space-text-subtle)] font-bold">Selected Type:</span>
                <span className="text-xs font-bold text-[var(--space-text)] px-3.5 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400">
                  {selectedProjectType === "studio" && "🎬 AI Video Studio"}
                  {selectedProjectType === "tutorial" && "📸 Screenshot Tutorial"}
                  {selectedProjectType === "blank" && "🎨 Blank Canvas"}
                  {selectedProjectType === "upload" && "📤 Upload Video"}
                </span>
              </div>

              {/* Aspect ratio (always shown) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[var(--space-text)] block">Aspect Ratio</label>
                <div className="flex flex-wrap items-center gap-3">
                  {([
                    { ratio: "16:9", label: "Landscape", w: "w-4", h: "h-2.5" },
                    { ratio: "9:16", label: "Portrait", w: "w-2.5", h: "h-4" },
                    { ratio: "1:1", label: "Square", w: "w-3.5", h: "h-3.5" },
                    { ratio: "4:5", label: "Vertical", w: "w-3", h: "h-3.5" },
                  ] as const).map((r) => {
                    const isSelected = selectedRatio === r.ratio;
                    return (
                      <button
                        key={r.ratio}
                        type="button"
                        onClick={() => setSelectedRatio(r.ratio)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white dark:bg-teal-500/20 border-teal-500/30 dark:border-teal-500/40 text-teal-600 dark:text-teal-400 shadow-sm"
                            : "bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-950/20 border-transparent dark:border-[var(--space-border)] text-[var(--space-text-subtle)] dark:hover:bg-[var(--space-border)]/20 hover:text-[var(--space-text)]"
                        }`}
                      >
                        <span className={`${r.w} ${r.h} border border-current rounded-xs inline-block`} />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Studio-specific fields */}
              {selectedProjectType === "studio" && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[var(--space-text)] flex items-center justify-between">
                      <span>What's your video about? <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-[var(--space-text-subtle)] font-normal">Provide a description</span>
                    </label>
                    <textarea
                      value={studioTopic}
                      onChange={(e) => setStudioTopic(e.target.value)}
                      placeholder="e.g. How to use VS Code for web development, Top 10 travel destinations in Japan..."
                      className="w-full text-sm bg-slate-100/40 dark:bg-slate-950/40 border border-[var(--space-border)] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-4 py-3 text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)] focus:outline-none resize-none transition-all"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[var(--space-text)]">Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["educational", "entertaining", "promotional", "documentary"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStudioStyle(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                              studioStyle === s
                                ? "bg-white dark:bg-teal-500/20 border-teal-500/30 dark:border-teal-500/40 text-teal-600 dark:text-teal-400 shadow-sm"
                                : "bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-950/20 border-transparent dark:border-[var(--space-border)] text-[var(--space-text-subtle)] dark:hover:bg-[var(--space-border)]/20 hover:text-[var(--space-text)]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[var(--space-text)]">Tone</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["professional", "casual", "energetic", "calm"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setStudioTone(t)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                              studioTone === t
                                ? "bg-white dark:bg-teal-500/20 border-teal-500/30 dark:border-teal-500/40 text-teal-600 dark:text-teal-400 shadow-sm"
                                : "bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-950/20 border-transparent dark:border-[var(--space-border)] text-[var(--space-text-subtle)] dark:hover:bg-[var(--space-border)]/20 hover:text-[var(--space-text)]"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[var(--space-text)]">
                        Target Audience <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={studioAudience}
                        onChange={(e) => setStudioAudience(e.target.value)}
                        placeholder="e.g. Beginners, developers, students..."
                        className="w-full text-sm bg-slate-100/40 dark:bg-slate-950/40 border border-[var(--space-border)] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-4 py-2.5 text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)] focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-2 justify-center">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-[var(--space-text)]">
                          Duration
                        </label>
                        <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          {studioDuration} seconds
                        </span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={300}
                        step={15}
                        value={studioDuration}
                        onChange={(e) => setStudioDuration(Number(e.target.value))}
                        className="w-full accent-teal-500 mt-2 h-1.5 bg-slate-200 dark:bg-slate-950/40 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-[var(--space-text-subtle)] font-mono px-0.5">
                        <span>30s</span><span>5min</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Tutorial/Blank/Upload — just show a description */}
              {selectedProjectType !== "studio" && (
                <div className="p-4 bg-teal-500/5 rounded-xl border border-teal-500/20 dark:border-teal-500/10 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--space-text-muted)] leading-relaxed font-medium">
                    {selectedProjectType === "tutorial" && "A blank tutorial project will be created. You'll upload screenshots and use the editor to add zoom, highlights, blur, captions, and more."}
                    {selectedProjectType === "blank" && "An empty project will be created. Use the editor's Pexels media tab to search and import stock footage, or upload your own media."}
                    {selectedProjectType === "upload" && "A tutorial project will be created. Upload your video file as a screenshot, and the editor will process it as a video clip in the timeline."}
                  </p>
                </div>
              )}

              {/* Create/Cancel button footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--space-border)]">
                <Button
                  variant="ghost"
                  onClick={closeMegaMenu}
                  className="glass-btn glass-btn-secondary px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedProjectType === "studio") handleCreateStudioProject();
                    else handleCreateBlankProject();
                  }}
                  disabled={selectedProjectType === "studio" && (!studioTopic.trim() || !studioAudience.trim()) || creatingProject}
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
          )}
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
