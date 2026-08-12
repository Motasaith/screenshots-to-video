/**
 * What a file actually is, from its bytes.
 *
 * The upload route checked `file.type`, which is the browser's claim in the multipart
 * headers and entirely under the client's control. A shell script sent as
 * `image/png` passed that check.
 *
 * It was not exploitable, because `saveLocalFile` regenerates the filename from an
 * extension allow-list and `/api/file` derives the Content-Type from the stored
 * extension, so a mislabelled file was served as an image and never executed. This
 * closes the gap anyway: relying on two downstream mitigations to make an
 * unvalidated upload safe is one refactor away from being wrong.
 */

export type DetectedKind = "png" | "jpeg" | "webp" | "gif" | "mp4" | "webm" | "mov" | "unknown";

/** Signatures long enough to be unambiguous, and no longer. */
const SIGNATURES: Array<{ kind: DetectedKind; offset: number; bytes: number[] }> = [
  { kind: "png", offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { kind: "jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { kind: "gif", offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  // Matroska, which is what a webm is.
  { kind: "webm", offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
];

/** ASCII at an offset, for the container formats that name themselves. */
function ascii(buffer: Buffer, offset: number, length: number): string {
  if (buffer.length < offset + length) return "";
  return buffer.subarray(offset, offset + length).toString("ascii");
}

function startsWith(buffer: Buffer, offset: number, bytes: number[]): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

export function detectFileKind(buffer: Buffer): DetectedKind {
  for (const sig of SIGNATURES) {
    if (startsWith(buffer, sig.offset, sig.bytes)) return sig.kind;
  }

  // RIFF....WEBP. The four bytes between are the file size, so they are skipped.
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WEBP") return "webp";

  /*
   * ISO base media: a `ftyp` box at offset 4 whose brand says which flavour.
   *
   * `qt  ` is QuickTime, which is a .mov. Everything else in this family that we
   * accept is treated as mp4, because that is what the render pipeline does with it.
   */
  if (ascii(buffer, 4, 4) === "ftyp") {
    const brand = ascii(buffer, 8, 4);
    if (brand === "qt  ") return "mov";
    return "mp4";
  }

  return "unknown";
}

/** The declared types this application accepts, mapped to what the bytes must say. */
const DECLARED_TO_KINDS: Record<string, DetectedKind[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  // Browsers and phones disagree about which of these three a given file is, and the
  // containers genuinely overlap, so any of them satisfies any of them.
  "video/mp4": ["mp4", "mov"],
  "video/quicktime": ["mov", "mp4"],
  "video/webm": ["webm"],
};

export interface FileCheck {
  ok: boolean;
  detected: DetectedKind;
  /** Written for the person uploading, not for a log. */
  error?: string;
}

/**
 * Whether the bytes match what the upload claimed to be.
 *
 * A mismatch is refused rather than silently corrected: a file whose contents
 * disagree with its type is either a mistake worth telling someone about, or an
 * attempt worth refusing.
 */
export function verifyDeclaredType(buffer: Buffer, declaredType: string): FileCheck {
  const expected = DECLARED_TO_KINDS[declaredType];
  if (!expected) {
    return { ok: false, detected: "unknown", error: `${declaredType} files are not supported.` };
  }

  const detected = detectFileKind(buffer);

  if (detected === "unknown") {
    return {
      ok: false,
      detected,
      error: "That file is not a readable image or video. It may be corrupted, or renamed from something else.",
    };
  }

  if (!expected.includes(detected)) {
    return {
      ok: false,
      detected,
      error: `That file says it is ${declaredType} but its contents are ${detected}. Convert it, or upload it with the right extension.`,
    };
  }

  return { ok: true, detected };
}
