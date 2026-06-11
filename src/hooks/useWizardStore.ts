import { create } from "zustand";

type WizardStep =
  | "setup"
  | "upload"
  | "script"
  | "annotate"
  | "preview"
  | "voice"
  | "render"
  | "export";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type TransitionType = "fade" | "slide-left" | "slide-right" | "slide-up" | "flip" | "dissolve";

interface WizardStepData {
  setup: {
    title: string;
    description: string;
    platform: "youtube" | "teams" | "tiktok" | "linkedin";
    aspectRatio: AspectRatio;
  };
  upload: {
    steps: Array<{
      id?: number;
      order: number;
      description: string;
      screenshotPath?: string;
      file?: File;
    }>;
  };
  script: {
    scripts: Record<number, string>;
  };
  annotate: {
    annotations: Record<
      number,
      {
        zoomTargetX?: number;
        zoomTargetY?: number;
        zoomRectX?: number;
        zoomRectY?: number;
        zoomRectWidth?: number;
        zoomRectHeight?: number;
      }
    >;
  };
  preview: {
    stepTransitions: Record<number, TransitionType>;
    transitionDuration: number;
    introTemplate: string;
    outroTemplate: string;
    introText: string;
    outroText: string;
  };
  voice: {
    voice: string;
    speed: number;
    resolution: "720p" | "1080p" | "4k";
    musicEnabled: boolean;
    musicTrack?: string;
    randomize: boolean;
  };
}

interface WizardState {
  currentStep: WizardStep;
  projectId: number | null;
  stepData: WizardStepData;
  isLoading: boolean;
  error: string | null;

  setCurrentStep: (step: WizardStep) => void;
  setProjectId: (id: number) => void;
  setStepData: <K extends keyof WizardStepData>(
    step: K,
    data: Partial<WizardStepData[K]>
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: Omit<
  WizardState,
  | "setCurrentStep"
  | "setProjectId"
  | "setStepData"
  | "setLoading"
  | "setError"
  | "reset"
> = {
  currentStep: "setup",
  projectId: null,
  isLoading: false,
  error: null,
  stepData: {
    setup: {
      title: "",
      description: "",
      platform: "youtube",
      aspectRatio: "16:9",
    },
    upload: {
      steps: [],
    },
    script: {
      scripts: {},
    },
    annotate: {
      annotations: {},
    },
    preview: {
      stepTransitions: {},
      transitionDuration: 0.5,
      introTemplate: "",
      outroTemplate: "",
      introText: "",
      outroText: "",
    },
    voice: {
      voice: "en-US-AriaNeural",
      speed: 1.0,
      resolution: "1080p",
      musicEnabled: false,
      randomize: false,
    },
  },
};

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),
  setProjectId: (id) => set({ projectId: id }),
  setStepData: (step, data) =>
    set((state) => ({
      stepData: {
        ...state.stepData,
        [step]: { ...state.stepData[step], ...data },
      },
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));

export const stepOrder: WizardStep[] = [
  "setup",
  "upload",
  "script",
  "annotate",
  "preview",
  "voice",
  "render",
  "export",
];

export const stepIndex = (step: WizardStep) => stepOrder.indexOf(step);

export const stepLabels: Record<WizardStep, string> = {
  setup: "Setup",
  upload: "Upload",
  script: "Script",
  annotate: "Annotate",
  preview: "Preview",
  voice: "Voice",
  render: "Render",
  export: "Export",
};
