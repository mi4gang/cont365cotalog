// Local file system storage for container photos
// Replaces Manus S3 storage for full independence

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Storage directory for uploaded files
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
export async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

// Generate unique filename with hash to prevent collisions
function generateFilename(originalUrl: string): string {
  const ext = path.extname(new URL(originalUrl).pathname) || ".jpg";
  const hash = crypto.randomBytes(16).toString("hex");
  return `${hash}${ext}`;
}

/**
 * Download image from URL and save to local storage
 * @param imageUrl - URL of the image to download
 * @returns Local file path (relative to server root)
 */
export async function downloadAndSaveImage(imageUrl: string): Promise<string> {
  await ensureUploadsDir();

  // Download image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = generateFilename(imageUrl);
  const filepath = path.join(UPLOADS_DIR, filename);

  // Save to disk
  await fs.writeFile(filepath, buffer);

  // Return URL path (for serving via static middleware)
  return `/uploads/${filename}`;
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
