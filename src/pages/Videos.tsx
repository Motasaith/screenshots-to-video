import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Film, Clock, Download, Share2, LogOut, Settings, LayoutDashboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function Videos() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<{title: string, url: string} | null>(null);

  // Fetch only completed projects
  const { data: projects, isLoading } = trpc.project.list.useQuery(undefined, {
    enabled: !!user,
  });

  const completedProjects = projects?.filter((p) => p.status === "complete") || [];

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
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="border-2 border-border gap-2 hidden sm:flex"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
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

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="font-syne font-bold text-5xl tracking-tight mb-2">
              My Videos
            </h1>
            <p className="font-dm text-lg text-muted-foreground">
              Your completed cinematic tutorials ready for the world.
            </p>
          </div>
        </div>

        {completedProjects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {completedProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="neo-card p-0 overflow-hidden flex flex-col group cursor-pointer"
                  onClick={() => {
                    if (project.finalVideoPath) {
                      setSelectedVideo({ title: project.title, url: project.finalVideoPath });
                    }
                  }}
                >
                  <div className="aspect-video bg-muted/50 border-b-2 border-border relative flex items-center justify-center">
                    {project.finalVideoPath ? (
                       <video 
                         src={project.finalVideoPath} 
                         className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                       />
                    ) : (
                       <Play className="w-12 h-12 text-primary opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/20 opacity-0 group-hover:opacity-100 transition-all">
                       <Play className="w-16 h-16 text-primary fill-primary" />
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1 bg-card relative z-10" onClick={(e) => e.stopPropagation()}>
                    <h3 className="font-syne font-bold text-xl leading-tight line-clamp-2 mb-2">
                      {project.title}
                    </h3>
                    <p className="font-dm text-sm text-muted-foreground capitalize mb-6 mt-auto">
                      {project.platform} format
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 font-syne font-bold shadow-offset focus:shadow-offset focus:translate-y-0"
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
                        className="border-2 font-syne font-bold hover:border-primary px-3"
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
          <div className="neo-card p-16 text-center border-2 border-dashed">
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="font-syne font-bold text-3xl mb-3">
              No completed videos yet
            </h3>
            <p className="font-dm text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              Once you finish rendering a project, it will appear here for easy downloading and sharing.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="neo-btn-primary py-6 px-8 text-lg"
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-5xl w-[90vw] p-0 border-4 border-border overflow-hidden bg-black gap-0">
          <DialogTitle className="sr-only">{selectedVideo?.title}</DialogTitle>
          <DialogDescription className="sr-only">Video playback modal</DialogDescription>
          
          <div className="relative w-full aspect-video flex bg-black">
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
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
