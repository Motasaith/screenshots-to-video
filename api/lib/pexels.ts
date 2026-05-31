import { env } from "./env";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

const PEXELS_BASE = "https://api.pexels.com";

interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
}

interface PexelsVideo {
  id: number;
  url: string;
  user: { name: string; url: string };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
  image: string; // thumbnail
}

interface PexelsPhotoResult {
  id: number;
  url: string;
  photographer: string;
  src: string; // direct image URL
  type: "image";
}

interface PexelsVideoResult {
  id: number;
  url: string;
  photographer: string;
  src: string; // direct video file URL
  thumbnail: string;
  type: "video";
}

export type PexelsResult = PexelsPhotoResult | PexelsVideoResult;

function getHeaders(): Record<string, string> {
  if (!env.pexelsApiKey) {
    throw new Error("PEXELS_API_KEY is not configured in .env");
  }
  return {
    Authorization: env.pexelsApiKey,
  };
}

/**
 * Search Pexels for photos.
 */
export async function searchPhotos(
  query: string,
  perPage = 5
): Promise<PexelsPhotoResult[]> {
  const url = `${PEXELS_BASE}/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;

  const response = await fetch(url, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Pexels photo search failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { photos: PexelsPhoto[] };

  return data.photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    photographer: photo.photographer,
    src: photo.src.large2x || photo.src.large || photo.src.original,
    type: "image" as const,
  }));
}

/**
 * Search Pexels for videos.
 */
export async function searchVideos(
  query: string,
  perPage = 5
): Promise<PexelsVideoResult[]> {
  const url = `${PEXELS_BASE}/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;

  const response = await fetch(url, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Pexels video search failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { videos: PexelsVideo[] };

  return data.videos.map((video) => {
    // Pick the best quality HD file
    const hdFile = video.video_files
      .filter((f) => f.file_type === "video/mp4")
      .sort((a, b) => (b.width || 0) - (a.width || 0))[0];

    return {
      id: video.id,
      url: video.url,
      photographer: video.user.name,
      src: hdFile?.link || video.video_files[0]?.link || "",
      thumbnail: video.image,
      type: "video" as const,
    };
  });
}

/**
 * Search both photos and videos, returning mixed results.
 */
export async function searchMedia(
  query: string,
  mediaType: "image" | "video" | "both" = "both",
  perPage = 3
): Promise<PexelsResult[]> {
  const results: PexelsResult[] = [];

  if (mediaType === "image" || mediaType === "both") {
    try {
      const photos = await searchPhotos(query, perPage);
      results.push(...photos);
    } catch (err) {
      console.warn("[Pexels] Photo search failed:", err);
    }
  }

  if (mediaType === "video" || mediaType === "both") {
    try {
      const videos = await searchVideos(query, perPage);
      results.push(...videos);
    } catch (err) {
      console.warn("[Pexels] Video search failed:", err);
    }
  }

  return results;
}

/**
 * Download a media file from a URL to a local temp path.
 * Returns the local file path.
 */
export async function downloadMedia(
  mediaUrl: string,
  extension = ".jpg"
): Promise<string> {
  const outDir = path.join(os.tmpdir(), "aivideo-studio-media");
  await fs.mkdir(outDir, { recursive: true });

  const filename = `media_${nanoid(12)}${extension}`;
  const outputPath = path.join(outDir, filename);

  const response = await fetch(mediaUrl, {
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Failed to download media (${response.status}): ${mediaUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);

  // Verify file was written
  const stat = await fs.stat(outputPath);
  if (stat.size === 0) {
    throw new Error("Downloaded media file is empty");
  }

  console.log(`[Pexels] Downloaded media: ${outputPath} (${stat.size} bytes)`);
  return outputPath;
}

/**
 * Check if Pexels API is configured.
 */
export function isPexelsConfigured(): boolean {
  return !!env.pexelsApiKey;
}
