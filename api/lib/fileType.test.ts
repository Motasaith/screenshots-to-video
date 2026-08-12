import { describe, expect, it } from "vitest";
import { detectFileKind, verifyDeclaredType } from "./fileType";

/** Minimal but real headers, so the signatures are exercised rather than mocked. */
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const gif = Buffer.from([...Buffer.from("GIF89a", "ascii"), 0x01, 0x00]);
const webp = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
  Buffer.from("VP8 ", "ascii"),
]);
const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);
const mp4 = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from("ftypmp42", "ascii"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
]);
const mov = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x14]),
  Buffer.from("ftypqt  ", "ascii"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
]);

describe("detectFileKind reads the format from the bytes", () => {
  it.each([
    ["png", png, "png"],
    ["jpeg", jpeg, "jpeg"],
    ["gif", gif, "gif"],
    ["webp", webp, "webp"],
    ["webm", webm, "webm"],
    ["mp4", mp4, "mp4"],
    ["quicktime", mov, "mov"],
  ])("recognises %s", (_label, buffer, expected) => {
    expect(detectFileKind(buffer as Buffer)).toBe(expected);
  });

  it("does not guess at something it has never seen", () => {
    expect(detectFileKind(Buffer.from("#!/bin/sh\nrm -rf /\n", "utf8"))).toBe("unknown");
    expect(detectFileKind(Buffer.from("<html><script>alert(1)</script>", "utf8"))).toBe("unknown");
    expect(detectFileKind(Buffer.alloc(0))).toBe("unknown");
  });
});

/**
 * The point of the whole module: `file.type` in a multipart upload is set by the
 * client. These cases are what a mislabelled upload looks like.
 */
describe("verifyDeclaredType refuses a file whose contents disagree", () => {
  it("accepts a genuine match", () => {
    expect(verifyDeclaredType(png, "image/png").ok).toBe(true);
    expect(verifyDeclaredType(webp, "image/webp").ok).toBe(true);
  });

  it("refuses a script claiming to be a png", () => {
    const result = verifyDeclaredType(Buffer.from("#!/bin/sh\nid\n", "utf8"), "image/png");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not a readable image or video/i);
  });

  it("refuses html claiming to be an image, which is the stored-XSS shape", () => {
    const html = Buffer.from("<html><body><script>fetch('/api/trpc/x')</script>", "utf8");
    expect(verifyDeclaredType(html, "image/jpeg").ok).toBe(false);
  });

  it("refuses a real image sent under the wrong image type, and says which it is", () => {
    const result = verifyDeclaredType(png, "image/jpeg");
    expect(result.ok).toBe(false);
    expect(result.detected).toBe("png");
    expect(result.error).toMatch(/contents are png/i);
  });

  it("refuses a type this application does not accept at all", () => {
    // SVG is deliberately absent: it can carry script and is served inline.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "utf8");
    expect(verifyDeclaredType(svg, "image/svg+xml").ok).toBe(false);
  });

  it("allows mp4 and quicktime to satisfy each other", () => {
    // Phones and browsers disagree about which of the two a given file is, and the
    // containers overlap, so being strict here would refuse real uploads.
    expect(verifyDeclaredType(mov, "video/mp4").ok).toBe(true);
    expect(verifyDeclaredType(mp4, "video/quicktime").ok).toBe(true);
  });

  it("does not let a webm pass as an mp4", () => {
    expect(verifyDeclaredType(webm, "video/mp4").ok).toBe(false);
  });
});
