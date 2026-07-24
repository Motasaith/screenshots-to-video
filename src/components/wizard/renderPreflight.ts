export interface RenderPreflightScene {
  id: number;
  order?: number | null;
  aiScript?: string | null;
  userEditedScript?: string | null;
}

export interface RenderPreflightDraft {
  script?: string | null;
}

export interface MissingRenderScript {
  id: number;
  order: number;
}

export interface RenderPreflightResult {
  missingScripts: MissingRenderScript[];
  voiceMissing: boolean;
  isExplicitlySilent: boolean;
  requiresConfirmation: boolean;
}

function hasNarration(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function isSilentVoice(voice: string | null | undefined) {
  return voice?.trim().toLowerCase() === "none";
}

/**
 * Finds render inputs that would otherwise produce an empty TTS request.
 *
 * Draft text wins over persisted text, including an intentionally-cleared
 * draft. A project already saved with the `none` voice is an explicit silent
 * choice, so it can render without repeatedly prompting the user.
 */
export function getRenderPreflight(
  scenes: RenderPreflightScene[],
  voice: string | null | undefined,
  drafts: Record<number, RenderPreflightDraft | undefined> = {},
): RenderPreflightResult {
  const missingScripts = scenes.flatMap((scene, index) => {
    const draft = drafts[scene.id];
    const narration =
      draft && Object.prototype.hasOwnProperty.call(draft, "script")
        ? draft.script
        : scene.userEditedScript !== null &&
            scene.userEditedScript !== undefined
          ? scene.userEditedScript
          : scene.aiScript;

    return hasNarration(narration)
      ? []
      : [{ id: scene.id, order: scene.order ?? index + 1 }];
  });

  const normalizedVoice = voice?.trim();
  const voiceMissing = !normalizedVoice;
  const isExplicitlySilent = isSilentVoice(normalizedVoice);

  return {
    missingScripts,
    voiceMissing,
    isExplicitlySilent,
    requiresConfirmation:
      !isExplicitlySilent && (voiceMissing || missingScripts.length > 0),
  };
}
