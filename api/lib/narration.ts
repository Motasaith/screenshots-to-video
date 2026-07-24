export type NarrationStepLike = {
  order: number;
  aiScript?: string | null;
  userEditedScript?: string | null;
};

/**
 * The user-edited value is authoritative, including an intentionally blank
 * value. Only fall back to the AI script when the user has never edited it.
 */
export function getNarrationScript(step: NarrationStepLike): string {
  if (step.userEditedScript !== null && step.userEditedScript !== undefined) {
    return step.userEditedScript.trim();
  }
  return step.aiScript?.trim() ?? "";
}

export function isExplicitSilentVoice(voice: string | null | undefined): boolean {
  return voice?.trim().toLowerCase() === "none";
}

export function hasSelectedVoice(voice: string | null | undefined): boolean {
  return Boolean(voice?.trim());
}

export function getMissingScriptOrders(steps: NarrationStepLike[]): number[] {
  return steps
    .filter((step) => !getNarrationScript(step))
    .map((step) => step.order);
}
