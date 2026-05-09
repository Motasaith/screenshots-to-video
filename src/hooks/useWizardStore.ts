import { create } from "zustand";

type WizardStep =
  | "setup"
  | "upload"
  | "script"
  | "annotate"
  | "voice"
  | "render"
  | "export";

interface WizardStepData {
  setup: {
    title: string;
    description: string;
    platform: "youtube" | "teams" | "tiktok" | "linkedin";
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
  voice: {
    voice: string;
    speed: number;
    resolution: "720p" | "1080p" | "4k";
    musicEnabled: boolean;
    musicTrack?: string;
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
    voice: {
      voice: "en-US-AriaNeural",
      speed: 1.0,
      resolution: "1080p",
      musicEnabled: false,
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
  voice: "Voice",
  render: "Render",
  export: "Export",
};
