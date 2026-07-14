import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Film, Clock, Download, Share2, LogOut, Settings, LayoutDashboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

/** Compute whole days remaining until expiry relative to a reference timestamp. */
function daysUntilExpiry(expiresAt: string | number | Date, now: number): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
}

export default function Videos() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<{title: string, url: string} | null>(null);

  // Fetch only completed projects
  const { data: standardProjects, isLoading: standardLoading } = trpc.project.list.useQuery(undefined, {
    enabled: !!user,
  });

  const completedProjects = [
    ...(standardProjects?.filter((p) => p.status === "complete").map((p) => ({ ...p, type: "tutorial" as const })) || []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isLoading = standardLoading;

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

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <header className="border-b border-[var(--space-border)] bg-[var(--space-card)]/90 backdrop-blur-sm relative">
          <div className="w-full px-4 sm:px-6 lg:px-12">
            <div className="flex items-center justify-between h-16">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate("/")}
              >
                <Film className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500" />
                <span className="font-bold text-lg sm:text-xl text-[var(--space-text)]">AIVideo</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                  className="glass-btn glass-btn-secondary gap-2 flex py-1.5 px-2.5 sm:px-3 rounded-lg text-xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden xs:inline sm:inline">Dashboard</span>
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <h1 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-2 text-[var(--space-text)]">
                My Videos
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-[var(--space-text-muted)] leading-relaxed">
                Your completed cinematic tutorials ready for the world.
              </p>
            </div>
          </div>

          {completedProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {completedProjects.map((project) => (
                  <motion.div
                    key={`${project.type}-${project.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-panel p-0 overflow-hidden flex flex-col group cursor-pointer border border-[var(--space-border)] bg-[var(--space-card)]/80 hover:scale-[1.02] transition-all duration-300 rounded-2xl"
                    onClick={() => {
                      if (project.finalVideoPath) {
                        setSelectedVideo({ title: project.title, url: project.finalVideoPath });
                      }
                    }}
                  >
                    <div className="aspect-video bg-slate-950/20 border-b border-[var(--space-border)] relative flex items-center justify-center overflow-hidden">
                      {project.finalVideoPath ? (
                        <video 
                          src={project.finalVideoPath} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <Play className="w-12 h-12 text-teal-500 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all">
                        <Play className="w-16 h-16 text-teal-400 fill-teal-400 filter drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1 bg-[var(--space-card)]/80 relative z-10" onClick={(e) => e.stopPropagation()}>
                      <h3 className="font-bold text-xl leading-tight line-clamp-2 mb-2 text-[var(--space-text)]">
                        {project.title}
                      </h3>
                      <p className="text-xs text-[var(--space-text-muted)] capitalize mb-2 mt-auto">
                        {project.platform} format
                      </p>
                      {project.expiresAt && (
                        <div>
                          <span className="font-mono text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded inline-block mb-3">
                            {/* eslint-disable-next-line react-hooks/purity -- display-only relative time */}
                            Expires in {daysUntilExpiry(project.expiresAt, Date.now())}d
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 glass-btn glass-btn-primary py-3 rounded-xl font-semibold text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/create/${project.id}/export`);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="glass-btn glass-btn-secondary p-3 rounded-xl opacity-50 cursor-not-allowed"
                          disabled
                          title="Public sharing requires additional setup"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="glass-panel p-16 text-center border border-dashed border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <Film className="w-16 h-16 text-[var(--space-text-subtle)] mx-auto mb-6" />
              <h3 className="font-bold text-3xl mb-3 text-[var(--space-text)]">
                No completed videos yet
              </h3>
              <p className="text-lg text-[var(--space-text-muted)] mb-8 max-w-md mx-auto leading-relaxed">
                Once you finish rendering a project, it will appear here for easy downloading and sharing.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="glass-btn glass-btn-primary py-4 px-8 text-sm font-semibold rounded-xl"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-5xl w-[90vw] p-0 border border-[var(--space-border)] overflow-hidden bg-slate-950 rounded-2xl gap-0">
          <DialogTitle className="sr-only">{selectedVideo?.title}</DialogTitle>
          <DialogDescription className="sr-only">Video playback modal</DialogDescription>
          
          <div className="relative w-full aspect-video flex bg-slate-950">
            {selectedVideo?.url && (
              <video 
                src={selectedVideo.url} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            )}
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-50 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
