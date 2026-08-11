/**
 * What "Edit scene" can and cannot do.
 *
 * The assistant's edits go through a fixed set of canvas operations: zoom
 * points, highlight, blur, redact, crop, overlay text, watermark, colour filter
 * and scene duration. Everything else in the editor is a panel the person has to
 * use themselves.
 *
 * Nothing made of words is in that set. There used to be a `setScript`
 * operation, but it wrote a key nothing read, so the assistant would report
 * having rewritten a narration it had not touched. It is gone rather than fixed:
 * the Script panel already does this properly, including AI generation, and the
 * undo stack here only covers annotations, so an AI script rewrite could not
 * have offered the Ctrl+Z it would have promised.
 *
 * Asked to "add captions" it used to accept the instruction, produce no
 * operations, and answer with a summary that read like something had happened.
 * Nothing had. So requests outside the operation set are caught here, before the
 * model is asked to act, and answered as a question instead: what the assistant
 * can change, and how to do the thing yourself.
 */

/** Things the assistant cannot do, and what to call them in the reply. */
const OUT_OF_SCOPE: Array<{ pattern: RegExp; subject: string }> = [
  {
    /**
     * "Transcript" is ambiguous, so the answer names both places.
     *
     * In this product the captions are generated from the narration script, so
     * someone asking for "the transcript" could mean either the words spoken or
     * the words on screen. Neither is editable from here, and they live in
     * different panels, so guessing one would send half the people to the wrong
     * place.
     */
    pattern: /\b(transcript|transcription)\b/i,
    subject: "the transcript, whether you mean the captions or the narration script",
  },
  {
    pattern: /\b(captions?|subtitles?|srt|closed caption)\b/i,
    subject: "captions",
  },
  {
    /**
     * The scene's narration script.
     *
     * There is no operation for it and never was: the one that existed wrote a
     * key nothing read, so the assistant reported rewriting a script it had not
     * touched. The Script panel does this properly, including AI generation.
     */
    pattern: /\b(script|narration|narrate|voice ?script|what (?:it|the video) says|wording)\b/i,
    subject: "the narration script",
  },
  {
    pattern:
      /\b(voice ?overs?|voice|narrat(?:or|ion) voice|tts|text to speech|read (?:it|this) (?:out|aloud)|speaker|accent|elevenlabs|kokoro)\b/i,
    subject: "the voiceover",
  },
  {
    pattern: /\b(music|soundtrack|background (?:audio|music|track)|sound effects?|sfx|audio track)\b/i,
    subject: "music or audio tracks",
  },
  {
    pattern: /\b(transitions?|fade between|dissolve|wipe|slide between)\b/i,
    subject: "transitions",
  },
  {
    pattern: /\b(intro|outro|end ?card|title card|opening slide)\b/i,
    subject: "the intro and outro",
  },
  {
    pattern: /\b(render|export|mp4|resolution|1080p|720p|4k|aspect ratio|publish)\b/i,
    subject: "rendering and export",
  },
  {
    pattern:
      /\b(upload|add (?:a )?(?:new )?(?:screenshot|image|scene|step)|delete (?:this )?scene|reorder|move scene|new scene)\b/i,
    subject: "adding, deleting or reordering scenes",
  },
  {
    pattern: /\b(plan|upgrade|billing|invoice|refund|credits?|subscription|payment)\b/i,
    subject: "billing",
  },
];

/**
 * Words that mean a canvas tool is being asked for.
 *
 * Checked first, and it wins, because the subject words above overlap with things
 * people legitimately annotate. "Highlight the Download button" and "blur the
 * credit card number" are both ordinary canvas edits that would otherwise be
 * turned away as an export question and a billing question.
 */
const CANVAS_TOOLS =
  /\b(zoom|highlight|blur|redact|pixelate|spotlight|magnif(?:y|ier)|crop|overlay|badge|arrow|circle|box|grayscale|greyscale|sepia|filter|watermark|annotate|annotation|pan)\b/i;

export interface OutOfScope {
  /** Plain-language name of what was asked for, used in the reply. */
  subject: string;
}

/**
 * Whether an edit instruction asks for something the canvas operations cannot do.
 *
 * Runs on the instruction, not the model's answer, so nothing is attempted and
 * no misleading summary is produced.
 */
export function outOfScopeEdit(instruction: string): OutOfScope | null {
  const text = instruction.trim();
  if (text.length < 3) return null;

  // A named canvas tool is an edit this can actually do, whatever else the
  // sentence mentions.
  if (CANVAS_TOOLS.test(text)) return null;

  for (const { pattern, subject } of OUT_OF_SCOPE) {
    if (pattern.test(text)) return { subject };
  }
  return null;
}

/**
 * The honest preface to a redirected request.
 *
 * Stated before the guidance rather than after it, because the first thing the
 * person needs to know is that this did not happen, and will not happen by asking
 * again.
 */
export function outOfScopeNote(subject: string): string {
  return (
    // "From here" leads, so a subject with a clause of its own still reads as a
    // sentence: "...the transcript, whether you mean the captions or the
    // narration script" cannot have "from here" tacked on after it.
    `From here I cannot change ${subject}. What I can edit is what sits on the canvas: ` +
    `zoom points, highlight, blur, redact, pixelate, spotlight, magnify, overlay text, ` +
    `badges, watermark, colour filter, crop and scene length. Anything made of words, ` +
    `the narration script and the captions included, is a panel you use yourself. ` +
    `Here is how.`
  );
}
