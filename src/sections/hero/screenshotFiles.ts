/**
 * File plumbing behind the homepage dropzone: pulling images out of a ZIP or a
 * dropped folder, and holding a selection across the Google sign-in redirect.
 *
 * Split out of HeroSection so the section itself is markup. None of this
 * changed in the redesign; it was 400 lines sitting above the JSX.
 */

import JSZip from "jszip";

/* ---------------------------------------------------------------- pending */

// A visitor can pick files before signing in. Sending them to Google means a
// full page navigation, which throws away anything held in React state, so the
// selection is parked in IndexedDB and picked up when they come back.
const PENDING_DB_NAME = "aivideo_pending";
const PENDING_STORE = "files";

function openPendingDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PENDING_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingFiles(files: File[]): Promise<void> {
  try {
    // File objects from drag-and-drop do not survive structured clone
    // reliably, so each one is flattened to name + type + bytes first.
    const serializable = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        type: f.type,
        data: await f.arrayBuffer(),
      }))
    );
    const db = await openPendingDB();
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.objectStore(PENDING_STORE).put(serializable, "pending");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* IndexedDB unavailable; the visitor re-picks their files after signing in */
  }
}

export async function loadPendingFiles(): Promise<File[] | null> {
  try {
    const db = await openPendingDB();
    const tx = db.transaction(PENDING_STORE, "readonly");
    const result = await new Promise<Array<{ name: string; type: string; data: ArrayBuffer }> | null>(
      (resolve, reject) => {
        const req = tx.objectStore(PENDING_STORE).get("pending");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    if (!result) return null;
    return result.map((item) => new File([item.data], item.name, { type: item.type }));
  } catch {
    return null;
  }
}

export async function clearPendingFiles(): Promise<void> {
  try {
    const db = await openPendingDB();
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.objectStore(PENDING_STORE).delete("pending");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* nothing to clear */
  }
}

/* ------------------------------------------------------------------ files */

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

function isImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getMimeType(filename: string): string {
  switch (filename.split(".").pop()?.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

/** Walks a dropped directory entry, at any depth, collecting images and ZIPs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function traverseEntry(entry: any): Promise<File[]> {
  const files: File[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processEntry = async (item: any) => {
    if (item.isFile) {
      const file = await new Promise<File>((resolve, reject) => item.file(resolve, reject));
      const name = file.name.toLowerCase();
      if (file.type.startsWith("image/") || name.endsWith(".zip") || isImageName(name)) {
        files.push(file);
      }
      return;
    }

    if (!item.isDirectory) return;

    // readEntries returns at most 100 entries per call, so it has to be
    // drained in a loop or large folders come back truncated.
    const dirReader = item.createReader();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readBatch = (): Promise<any[]> =>
      new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));

    try {
      let batch = await readBatch();
      while (batch.length > 0) {
        for (const child of batch) await processEntry(child);
        batch = await readBatch();
      }
    } catch (err) {
      console.error("Error reading directory entry:", err);
    }
  };

  await processEntry(entry);
  return files;
}

async function extractZipFiles(zipFile: File): Promise<File[]> {
  const extracted: File[] = [];
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const promises: Promise<void>[] = [];

    zip.forEach((_path, entry) => {
      if (entry.dir || !isImageName(entry.name)) return;
      promises.push(
        entry.async("blob").then((blob) => {
          const fileName = entry.name.split("/").pop() || entry.name;
          extracted.push(new File([blob], fileName, { type: getMimeType(fileName) }));
        })
      );
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to extract zip file:", err);
  }
  return extracted;
}

/**
 * Flattens a selection into a sorted list of images, unpacking any ZIPs.
 *
 * Sorted naturally, so `step2.png` lands before `step10.png`. That ordering
 * becomes the order of the scenes in the finished video, so it matters.
 */
export async function processFiles(files: File[]): Promise<File[]> {
  let images: File[] = [];

  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      images = images.concat(await extractZipFiles(file));
    } else if (file.type.startsWith("image/") || isImageName(file.name)) {
      images.push(file);
    }
  }

  images.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  return images;
}

/* ----------------------------------------------------------------- errors */

/** Turns a raw server error into something worth showing a person. */
export function parseErrorMessage(raw: string): { message: string; retryAfter: number } {
  const jsonMatch = raw.match(/\{.*\}/s);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error) {
        const retryMatch = parsed.error.match(/Retry after (\d+)s/i);
        const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : 0;
        return {
          message: retryAfter > 0 ? "That was a lot of uploads at once. Give it a moment." : parsed.error,
          retryAfter,
        };
      }
    } catch {
      /* not JSON after all */
    }
  }

  const retryMatch = raw.match(/Retry after (\d+)s/i);
  if (retryMatch) {
    return {
      message: "That was a lot of uploads at once. Give it a moment.",
      retryAfter: parseInt(retryMatch[1], 10),
    };
  }

  // Backstop for anything that still arrives looking like machine output.
  // The server sanitises unhandled errors now, but this panel renders whatever
  // string it is handed, and a failed SQL statement rendered as body copy is
  // how a 2000px wall of column names ended up on screen. Anything that looks
  // like a query, or is simply too long to be a sentence, is replaced.
  if (looksLikeInternalError(raw) || raw.length > 300) {
    return { message: "Something went wrong on our side. Please try again.", retryAfter: 0 };
  }

  return { message: raw, retryAfter: 0 };
}

/** Heuristics for "this string was written for a machine, not a person". */
function looksLikeInternalError(raw: string): boolean {
  return (
    /\b(insert into|select .* from|update .* set|delete from)\b/i.test(raw) ||
    /Failed query/i.test(raw) ||
    /\bECONNREFUSED\b|\bETIMEDOUT\b|\bER_[A-Z_]+\b/.test(raw) ||
    raw.includes("    at ")
  );
}
