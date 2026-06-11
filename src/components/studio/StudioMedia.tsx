import { useState } from "react";
import { useNavigate } from "react-router";
import { useStudioStore } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Search,
  Image,
  Film,
  RefreshCw,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function StudioMedia() {
  const navigate = useNavigate();
  const { projectId, scenes, setScenes } = useStudioStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSceneIdx, setActiveSceneIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"image" | "video" | "both">("both");

  const searchMedia = trpc.studio.searchMedia.useQuery(
    { query: searchQuery, mediaType: searchType, perPage: 6 },
    { enabled: searchOpen && searchQuery.length > 1 }
  );

  const updateScene = trpc.studio.updateScene.useMutation();

  const openSearch = (index: number) => {
    setActiveSceneIdx(index);
    setSearchQuery(scenes[index]?.searchQuery || "");
    setSearchType(scenes[index]?.mediaType === "video" ? "video" : "both");
    setSearchOpen(true);
  };

  const selectMedia = async (media: { src: string; photographer: string; type: "image" | "video" }) => {
    if (activeSceneIdx === null) return;
    const scene = scenes[activeSceneIdx];
    if (!scene?.id) return;

    const newScenes = [...scenes];
    newScenes[activeSceneIdx] = {
      ...newScenes[activeSceneIdx],
      mediaUrl: media.src,
      photographerName: media.photographer,
      mediaType: media.type,
    };
    setScenes(newScenes);

    try {
      await updateScene.mutateAsync({
        id: scene.id,
        mediaUrl: media.src,
        photographerName: media.photographer,
        mediaType: media.type,
      });
    } catch {
      // Already updated locally
    }

    setSearchOpen(false);
  };

  const handleContinue = () => {
    if (projectId) {
      navigate(`/studio/${projectId}/preview`);
    }
  };

  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 3 of 6
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-5deg] animate-float hidden sm:block">
            Pick your visuals 📸
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Scene Media
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Each scene has been matched with stock media from Pexels. Click any scene to swap its image or video.
        </p>

        <div className="mt-6 grid gap-4">
          <AnimatePresence>
            {scenes.map((scene, index) => (
              <motion.div
                key={scene.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="sketch-card bg-[var(--sketch-card-bg)] overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Media preview */}
                  <div
                    className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[var(--sketch-fg-subtle)]/10 flex items-center justify-center cursor-pointer relative group overflow-hidden"
                    onClick={() => openSearch(index)}
                  >
                    {scene.mediaUrl ? (
                      scene.mediaType === "video" ? (
                        <>
                          <video
                            src={scene.mediaUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                            onError={(e) => {
                              (e.target as HTMLVideoElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <>
                          <img
                            src={scene.mediaUrl}
                            alt={`Scene ${scene.order}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      )
                    ) : (
                      <div className="text-center p-4">
                        {scene.mediaType === "video" ? (
                          <Film className="w-8 h-8 text-[var(--sketch-fg-subtle)] mx-auto mb-1" />
                        ) : (
                          <Image className="w-8 h-8 text-[var(--sketch-fg-subtle)] mx-auto mb-1" />
                        )}
                        <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">Click to search</span>
                      </div>
                    )}
                  </div>

                  {/* Scene info */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-[#FBBF24]/20 border border-[var(--sketch-border-color)] rounded-full font-mono text-[10px] font-bold text-[var(--sketch-fg)]">
                        {scene.order}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-[var(--sketch-fg-subtle)]">
                        {scene.mediaType}
                      </span>
                    </div>
                    <p className="font-body text-sm text-[var(--sketch-fg)] line-clamp-2">
                      {scene.narration}
                    </p>
                    {scene.photographerName && (
                      <p className="font-mono text-[10px] text-[var(--sketch-fg-subtle)] mt-2 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Photo by {scene.photographerName} on Pexels
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleContinue}
            className="sketch-btn-primary w-full"
          >
            <span className="flex items-center gap-2">
              Continue — Adjust & Preview
              <ChevronRight className="w-4 h-4" />
            </span>
          </Button>
        </div>
      </motion.div>

      {/* Media Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sketch-card border-2 bg-[var(--sketch-card-bg)] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-body text-[var(--sketch-fg)]">
              Search Stock Media
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sketch-fg-subtle)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Pexels..."
                  className="sketch-input pl-10 w-full"
                />
              </div>
              <div className="flex gap-1">
                {(["both", "image", "video"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSearchType(type)}
                    className={`px-3 py-1 border-2 font-mono text-xs capitalize transition-all ${
                      searchType === type
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 text-[var(--sketch-fg)]"
                        : "border-[var(--sketch-fg-subtle)] text-[var(--sketch-fg-subtle)]"
                    }`}
                    style={{ borderRadius: "8px" }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {searchMedia.isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--sketch-fg-muted)]" />
              </div>
            )}

            {searchMedia.data && searchMedia.data.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {searchMedia.data.map((media: any, i: number) => (
                  <button
                    key={`${media.id}-${i}`}
                    onClick={() => selectMedia(media)}
                    className="relative group overflow-hidden border-2 border-[var(--sketch-fg-subtle)] hover:border-[#FBBF24] transition-all aspect-video"
                    style={{ borderRadius: "8px" }}
                  >
                    <img
                      src={media.type === "video" ? media.thumbnail || media.src : media.src}
                      alt={media.photographer}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <div className="flex items-center gap-1">
                        {media.type === "video" ? (
                          <Film className="w-3 h-3 text-white" />
                        ) : (
                          <Image className="w-3 h-3 text-white" />
                        )}
                        <span className="text-white text-[10px] font-mono truncate">
                          {media.photographer}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchMedia.data && searchMedia.data.length === 0 && (
              <div className="text-center py-8">
                <p className="font-body text-sm text-[var(--sketch-fg-muted)]">
                  No results found. Try different keywords.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
