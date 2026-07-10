/**
 * Intro/Outro template definitions with visual CSS previews.
 * Each template has a name, label, and a CSS gradient/style for preview.
 */

export interface IntroOutroTemplate {
  value: string;
  label: string;
  /** CSS background for preview thumbnail */
  previewBg: string;
  /** Text color for preview */
  previewTextColor: string;
  /** Font family for preview */
  previewFont?: string;
  /** Description */
  description: string;
}

export const INTRO_TEMPLATES: IntroOutroTemplate[] = [
  {
    value: "none",
    label: "None",
    previewBg: "transparent",
    previewTextColor: "var(--sketch-fg-muted)",
    description: "No intro screen",
  },
  {
    value: "blue-fade",
    label: "Blue Gradient",
    previewBg: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    previewTextColor: "#ffffff",
    previewFont: "sans-serif",
    description: "Blue gradient with white text, fades in",
  },
  {
    value: "dark-minimal",
    label: "Dark Minimal",
    previewBg: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)",
    previewTextColor: "#ffffff",
    previewFont: "monospace",
    description: "Clean dark background with minimal text",
  },
  {
    value: "warm-title",
    label: "Warm Title",
    previewBg: "linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)",
    previewTextColor: "#fffbeb",
    previewFont: "serif",
    description: "Warm orange gradient with elegant text",
  },
  {
    value: "teal-glow",
    label: "Teal Glow",
    previewBg: "linear-gradient(135deg, #042f2e 0%, #0d9488 100%)",
    previewTextColor: "#ffffff",
    previewFont: "sans-serif",
    description: "Teal gradient with glowing text effect",
  },
  {
    value: "purple-haze",
    label: "Purple Haze",
    previewBg: "linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)",
    previewTextColor: "#ffffff",
    previewFont: "sans-serif",
    description: "Purple gradient with white text",
  },
  {
    value: "clean-white",
    label: "Clean White",
    previewBg: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
    previewTextColor: "#1e293b",
    previewFont: "sans-serif",
    description: "Clean white background with dark text",
  },
  {
    value: "custom-video",
    label: "Custom Video",
    previewBg: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
    previewTextColor: "#94a3b8",
    previewFont: "monospace",
    description: "Upload your own video or image",
  },
];

export const OUTRO_TEMPLATES: IntroOutroTemplate[] = INTRO_TEMPLATES;

/** Get template by value */
export function getTemplate(value: string | null | undefined): IntroOutroTemplate | null {
  if (!value) return null;
  return INTRO_TEMPLATES.find((t) => t.value === value) || null;
}