import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useStudioStore } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  Loader2,
  Edit3,
  Image,
  Film,
  Clock,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudioScript() {
  const navigate = useNavigate();
  const { projectId, scenes, setScenes } = useStudioStore();

  const generateScript = trpc.studio.generateScript.useMutation();
  const updateScene = trpc.studio.updateScene.useMutation();
  const createScene = trpc.studio.createScene.useMutation();
  const deleteScene = trpc.studio.deleteScene.useMutation();
  const projectQuery = trpc.studio.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  // Load scenes from project if they exist
  useEffect(() => {
    if (projectQuery.data?.scenes && projectQuery.data.scenes.length > 0 && scenes.length === 0) {
      setScenes(
        projectQuery.data.scenes.map((s) => ({
          id: s.id,
          order: s.order,
          narration: s.narration,
          sceneDescription: s.sceneDescription || "",
          mediaType: s.mediaType as "image" | "video",
          mediaUrl: s.mediaUrl || "",
          searchQuery: s.searchQuery || "",
          photographerName: s.photographerName || "",
          isSafe: s.isSafe === 1,
          safetyReason: s.safetyReason || undefined,
        }))
      );
    }
  }, [projectQuery.data, scenes.length, setScenes]);

  const handleGenerate = async () => {
    if (!projectId) return;
    try {
      const result = await generateScript.mutateAsync({ projectId });
      if (result.scenes) {
        setScenes(
          result.scenes.map((s) => ({
            id: s.id,
            order: s.order,
            narration: s.narration,
            sceneDescription: s.sceneDescription || "",
            mediaType: s.mediaType as "image" | "video",
            mediaUrl: s.mediaUrl || "",
            searchQuery: s.searchQuery || "",
            photographerName: s.photographerName || "",
            isSafe: s.isSafe === 1,
            safetyReason: s.safetyReason || undefined,
          }))
        );
      }
    } catch (err) {
      console.error("Script generation failed:", err);
    }
  };

  const handleNarrationChange = async (index: number, narration: string) => {
    const scene = scenes[index];
    if (!scene?.id) return;

    // Update local state immediately
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], narration };
    setScenes(newScenes);

    // Save to server (debounced via component state)
    try {
      await updateScene.mutateAsync({ id: scene.id, narration });
    } catch {
      // Silently fail — local state is already updated
    }
  };

  const handleAddScene = async () => {
    if (!projectId) return;
    try {
      const result = await createScene.mutateAsync({ projectId });
      setScenes([...scenes, result]);
    } catch (err) {
      console.error("Failed to add scene:", err);
    }
  };

  const handleRemoveScene = async (sceneId: number) => {
    if (!projectId) return;
    try {
      // Optimistic update
      setScenes(scenes.filter(s => s.id !== sceneId).map((s, i) => ({ ...s, order: i + 1 })));
      await deleteScene.mutateAsync({ projectId, id: sceneId });
    } catch (err) {
      console.error("Failed to remove scene:", err);
      projectQuery.refetch(); // revert on fail
    }
  };

  const handleContinue = () => {
    if (projectId && scenes.length > 0) {
      navigate(`/studio/${projectId}/media`);
    }
  };

  const totalDuration = scenes.reduce((sum, s) => sum + (s.audioDuration || 8), 0);

  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 2 of 7
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-5deg] animate-float hidden sm:block">
            AI writes the script ✍️
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Video Script
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          AI generates a scene-by-scene script for your video. Review and edit the narration below.
        </p>

        {/* Generate button or loading state */}
        {scenes.length === 0 && (
          <div className="mt-8">
            <div className="sketch-card p-8 text-center bg-[var(--sketch-card-bg)]">
              <Sparkles className="w-12 h-12 text-[#FBBF24] mx-auto mb-4" />
              <h3 className="font-body font-semibold text-xl mb-2 text-[var(--sketch-fg)]">
                Ready to generate your script
              </h3>
              <p className="font-body text-sm text-[var(--sketch-fg-muted)] mb-6">
                AI will analyze your topic and create a complete scene-by-scene script with media suggestions.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generateScript.isPending}
                className="sketch-btn-primary"
              >
                {generateScript.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating script...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Generate Script
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Scene list */}
        {scenes.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[var(--sketch-fg-muted)]">
                  {scenes.length} scenes
                </span>
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">•</span>
                <span className="font-mono text-xs text-[var(--sketch-fg-muted)] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{Math.round(totalDuration / 60)}m estimated
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={generateScript.isPending}
                className="sketch-btn-ghost text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Regenerate
              </Button>
            </div>

            <AnimatePresence>
              {scenes.map((scene, index) => (
                <motion.div
                  key={scene.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="sketch-card p-5 bg-[var(--sketch-card-bg)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border-2 border-[var(--sketch-border-color)] bg-[#FBBF24]/20 rounded-full">
                      <span className="font-mono text-xs font-bold text-[var(--sketch-fg)]">
                        {scene.order}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {scene.mediaType === "video" ? (
                          <Film className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Image className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span className="font-mono text-[10px] uppercase text-[var(--sketch-fg-subtle)]">
                          {scene.mediaType} — "{scene.searchQuery}"
                        </span>
                      </div>
                      <textarea
                        value={scene.narration}
                        onChange={(e) => handleNarrationChange(index, e.target.value)}
                        rows={3}
                        className="sketch-input resize-none text-sm w-full"
                      />
                        {scene.sceneDescription && (
                          <p className="font-body text-xs text-[var(--sketch-fg-subtle)] mt-2 flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            {scene.sceneDescription}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => scene.id && handleRemoveScene(scene.id)}
                        className="p-2 text-[var(--sketch-fg-subtle)] hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove scene"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                onClick={handleAddScene}
                disabled={createScene.isPending}
                className="w-full py-4 border-2 border-dashed border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)] hover:bg-[#FBBF24]/5 transition-all flex items-center justify-center gap-2"
                style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
              >
                {createScene.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--sketch-fg-subtle)]" />
                ) : (
                  <Plus className="w-4 h-4 text-[var(--sketch-fg-subtle)]" />
                )}
                <span className="font-hand text-lg text-[var(--sketch-fg-muted)]">
                  Add Scene
                </span>
              </button>

            <Button
              onClick={handleContinue}
              className="sketch-btn-primary w-full"
            >
              <span className="flex items-center gap-2">
                Continue — Select Media
                <ChevronRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
