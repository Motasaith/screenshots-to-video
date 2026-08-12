import { describe, expect, it } from "vitest";
import { parseMediaRef, isStorableMediaRef } from "./mediaRef";

/**
 * These are security invariants, not behaviour preferences.
 *
 * `steps.screenshotPath` is a client-supplied string. Until this module existed,
 * one loader resolved it with `path.resolve` and read it off disk, and both
 * loaders fetched it if it looked like a URL. Any signed-in account could
 * therefore read arbitrary files from the server or make it issue requests into
 * its own network. If any case below starts passing, that is back.
 */
describe("parseMediaRef refuses everything that is not a storage key", () => {
  const mustRefuse = [
    // Arbitrary file read, the worst of the two.
    "../../.env",
    "../../../etc/passwd",
    "..\\..\\.env",
    "/etc/passwd",
    "C:\\Users\\saith\\.claude\\projects\\x\\.env",
    "\\\\server\\share\\secret.txt",
    "local:../../../.env",
    "users/1/../../../../.env",
    // Request forgery into the host's own network.
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    "http://127.0.0.1:3000/api/admin/listUsers",
    "http://localhost:3306",
    "https://evil.example/pixel.png",
    "//evil.example/pixel.png",
    // Other schemes, including the ones ffmpeg understands.
    "file:///etc/passwd",
    "data:image/png;base64,AAAA",
    "concat:/etc/passwd|/etc/shadow",
    "gopher://127.0.0.1:11211/",
    // Nothing useful.
    "",
    "   ",
  ];

  for (const value of mustRefuse) {
    it(`refuses ${JSON.stringify(value)}`, () => {
      expect(parseMediaRef(value)).toBeNull();
      expect(isStorableMediaRef(value)).toBe(false);
    });
  }
});

describe("parseMediaRef accepts the references the app actually stores", () => {
  it("accepts a local storage key", () => {
    const ref = parseMediaRef("local:users/27/screenshots/MHseaDoQubrz-eg_.png");
    expect(ref).toEqual({
      kind: "local",
      key: "local:users/27/screenshots/MHseaDoQubrz-eg_.png",
    });
  });

  it("accepts an object storage key", () => {
    expect(parseMediaRef("users/27/screenshots/abc123.webp")).toEqual({
      kind: "object",
      key: "users/27/screenshots/abc123.webp",
    });
  });

  it("strips the cache-busting query and fragment the frontend adds", () => {
    expect(parseMediaRef("users/27/a.png?v=12#frame=2")).toEqual({
      kind: "object",
      key: "users/27/a.png",
    });
  });

  it("keeps accepting a video key, which the frame extractor needs", () => {
    expect(parseMediaRef("local:users/9/media/clip.mp4")?.kind).toBe("local");
  });
});
