import { create } from "zustand";

export type WizardStep =
  | "preview"
  | "render"
  | "export";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type TransitionType = "none" | "fade" | "slide-left" | "slide-right" | "slide-up" | "flip" | "dissolve";

interface WizardStepData {
  preview: {
    stepTransitions: Record<number, TransitionType>;
    transitionDuration: number;
    introTemplate: string;
    outroTemplate: string;
    introText: string;
    outroText: string;
    introVideoPath: string;
    outroVideoPath: string;
    introDuration: number;
    outroDuration: number;
    captionsEnabled: boolean;
    captionStyle: string;
    captionSize: string;
    captionPosition: string;
    captionColor: string;
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
  currentStep: "preview",
  projectId: null,
  isLoading: false,
  error: null,
  stepData: {
    preview: {
      stepTransitions: {},
      transitionDuration: 0.5,
      introTemplate: "",
      outroTemplate: "",
      introText: "",
      outroText: "",
      introVideoPath: "",
      outroVideoPath: "",
      introDuration: 3.0,
      outroDuration: 3.0,
      captionsEnabled: true,
      captionStyle: "standard",
      captionSize: "medium",
      captionPosition: "bottom",
      captionColor: "#FFFFFF",
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
  "preview",
  "render",
  "export",
];

export const stepIndex = (step: WizardStep) => stepOrder.indexOf(step);

export const stepLabels: Record<WizardStep, string> = {
  preview: "Preview",
  render: "Render",
  export: "Export",
};
