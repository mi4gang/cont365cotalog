// Local file system storage for container photos
// Replaces Manus S3 storage for full independence

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Storage directory for uploaded files
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const IMAGE_DOWNLOAD_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.CATALOG_IMAGE_DOWNLOAD_TIMEOUT_MS ?? 30_000)
);
const MAX_IMAGE_DOWNLOAD_BYTES = Math.max(
  1_000_000,
  Number(process.env.CATALOG_IMAGE_DOWNLOAD_MAX_BYTES ?? 25_000_000)
);

// Ensure uploads directory exists
export async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

// Generate deterministic filename based on URL hash
// Same URL will always produce the same filename
function generateFilename(originalUrl: string): string {
  const ext = path.extname(new URL(originalUrl).pathname) || ".jpg";
  // Use MD5 hash of URL for deterministic filename
  const hash = crypto.createHash("md5").update(originalUrl).digest("hex");
  return `${hash}${ext}`;
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Download image from URL and save to local storage
 * @param imageUrl - URL of the image to download
 * @returns Local file path (relative to server root)
 */
export async function downloadAndSaveImage(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("/uploads/")) {
    return imageUrl;
  }
  if (!isRemoteUrl(imageUrl)) {
    throw new Error(`Unsupported image URL: ${imageUrl}`);
  }

  await ensureUploadsDir();

  const filename = generateFilename(imageUrl);
  const filepath = path.join(UPLOADS_DIR, filename);
  
  // Check if file already exists (skip download if it does)
  try {
    await fs.access(filepath);
    // File exists, return existing path
    return `/uploads/${filename}`;
  } catch {
    // File doesn't exist, download it
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ContCatLog image cache",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_DOWNLOAD_BYTES) {
      throw new Error(`Image is too large: ${contentLength} bytes`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_DOWNLOAD_BYTES) {
      throw new Error(`Image is too large: ${buffer.length} bytes`);
    }

    await fs.writeFile(filepath, buffer);
  } finally {
    clearTimeout(timeout);
  }

  // Return URL path (for serving via static middleware)
  return `/uploads/${filename}`;
}

export async function localizePhotoUrls(photoUrls: string[]): Promise<string[]> {
  const localized = await Promise.all(
    photoUrls.map(async (photoUrl) => {
      try {
        return await downloadAndSaveImage(photoUrl);
      } catch (error) {
        console.warn("[image-cache] Failed to localize image, keeping source URL", {
          photoUrl,
          error: error instanceof Error ? error.message : String(error),
        });
        return photoUrl;
      }
    })
  );

  return localized.filter((url) => url.length > 0);
}

/**
 * Save uploaded file buffer to local storage
 * @param buffer - File buffer
 * @param originalName - Original filename
 * @returns Local file path (relative to server root)
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  await ensureUploadsDir();

  const ext = path.extname(originalName) || ".jpg";
  const hash = crypto.randomBytes(16).toString("hex");
  const filename = `${hash}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await fs.writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

/**
 * Delete file from local storage
 * @param fileUrl - File URL (e.g., /uploads/abc123.jpg)
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl.startsWith("/uploads/")) {
    return; // Not a local file
  }

  const filename = path.basename(fileUrl);
  const filepath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.unlink(filepath);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
