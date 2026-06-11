import { create } from "zustand";

export type StudioStep =
  | "describe"
  | "script"
  | "media"
  | "preview"
  | "voice"
  | "render"
  | "export";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type TransitionType = "fade" | "slide-left" | "slide-right" | "slide-up" | "flip" | "dissolve";

export const studioStepOrder: StudioStep[] = [
  "describe",
  "script",
  "media",
  "preview",
  "voice",
  "render",
  "export",
];

export const studioStepIndex = (step: StudioStep) => studioStepOrder.indexOf(step);

export const studioStepLabels: Record<StudioStep, string> = {
  describe: "Describe",
  script: "Script",
  media: "Media",
  preview: "Preview",
  voice: "Voice",
  render: "Render",
  export: "Export",
};

export interface StudioScene {
  id?: number;
  order: number;
  narration: string;
  sceneDescription: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  searchQuery: string;
  photographerName: string;
  audioDuration?: number;
  status?: string;
}

interface StudioDescribeData {
  topic: string;
  style: "educational" | "entertaining" | "promotional" | "documentary";
  targetDuration: number; // seconds
  audience: string;
  tone: "professional" | "casual" | "energetic" | "calm";
  platform: "youtube" | "tiktok" | "linkedin" | "instagram";
  aspectRatio: AspectRatio;
}

interface StudioVoiceData {
  voice: string;
  speed: number;
  resolution: "720p" | "1080p" | "4k";
  musicEnabled: boolean;
  musicTrack?: string;
  randomize: boolean;
}

interface StudioPreviewData {
  sceneTransitions: Record<number, TransitionType>;
  transitionDuration: number;
  introTemplate: string;
  outroTemplate: string;
  introText: string;
  outroText: string;
  introDuration: number;
  outroDuration: number;
}

interface StudioState {
  currentStep: StudioStep;
  projectId: number | null;
  describe: StudioDescribeData;
  scenes: StudioScene[];
  voice: StudioVoiceData;
  preview: StudioPreviewData;
  isLoading: boolean;
  error: string | null;

  setCurrentStep: (step: StudioStep) => void;
  setProjectId: (id: number) => void;
  setDescribe: (data: Partial<StudioDescribeData>) => void;
  setScenes: (scenes: StudioScene[]) => void;
  updateScene: (index: number, data: Partial<StudioScene>) => void;
  setVoice: (data: Partial<StudioVoiceData>) => void;
  setPreview: (data: Partial<StudioPreviewData>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentStep: "describe" as StudioStep,
  projectId: null as number | null,
  describe: {
    topic: "",
    style: "educational" as const,
    targetDuration: 120,
    audience: "general audience",
    tone: "professional" as const,
    platform: "youtube" as const,
    aspectRatio: "16:9" as AspectRatio,
  },
  scenes: [] as StudioScene[],
  voice: {
    voice: "en-US-AriaNeural",
    speed: 1.0,
    resolution: "1080p" as const,
    musicEnabled: false,
    musicTrack: "ambient",
    randomize: false,
  },
  preview: {
    sceneTransitions: {} as Record<number, TransitionType>,
    transitionDuration: 0.5,
    introTemplate: "",
    outroTemplate: "",
    introText: "",
    outroText: "",
    introDuration: 3.0,
    outroDuration: 3.0,
  },
  isLoading: false,
  error: null as string | null,
};

export const useStudioStore = create<StudioState>((set) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),
  setProjectId: (id) => set({ projectId: id }),
  setDescribe: (data) =>
    set((state) => ({
      describe: { ...state.describe, ...data },
    })),
  setScenes: (scenes) => set({ scenes }),
  updateScene: (index, data) =>
    set((state) => {
      const newScenes = [...state.scenes];
      if (newScenes[index]) {
        newScenes[index] = { ...newScenes[index], ...data };
      }
      return { scenes: newScenes };
    }),
  setVoice: (data) =>
    set((state) => ({
      voice: { ...state.voice, ...data },
    })),
  setPreview: (data) =>
    set((state) => ({
      preview: { ...state.preview, ...data },
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
