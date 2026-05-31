import { create } from "zustand";

export type StudioStep =
  | "describe"
  | "script"
  | "media"
  | "voice"
  | "render"
  | "export";

export const studioStepOrder: StudioStep[] = [
  "describe",
  "script",
  "media",
  "voice",
  "render",
  "export",
];

export const studioStepIndex = (step: StudioStep) => studioStepOrder.indexOf(step);

export const studioStepLabels: Record<StudioStep, string> = {
  describe: "Describe",
  script: "Script",
  media: "Media",
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
}

interface StudioVoiceData {
  voice: string;
  speed: number;
  resolution: "720p" | "1080p" | "4k";
}

interface StudioState {
  currentStep: StudioStep;
  projectId: number | null;
  describe: StudioDescribeData;
  scenes: StudioScene[];
  voice: StudioVoiceData;
  isLoading: boolean;
  error: string | null;

  setCurrentStep: (step: StudioStep) => void;
  setProjectId: (id: number) => void;
  setDescribe: (data: Partial<StudioDescribeData>) => void;
  setScenes: (scenes: StudioScene[]) => void;
  updateScene: (index: number, data: Partial<StudioScene>) => void;
  setVoice: (data: Partial<StudioVoiceData>) => void;
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
  },
  scenes: [] as StudioScene[],
  voice: {
    voice: "en-US-AriaNeural",
    speed: 1.0,
    resolution: "1080p" as const,
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
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
