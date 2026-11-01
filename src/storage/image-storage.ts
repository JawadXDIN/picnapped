// src/storage/image-storage.ts
// High-level image storage operations combining IndexedDB + chrome.storage

import {
  saveImage,
  getImage,
  getAllImages,
  deleteImage,
  updateImageName,
  StoredImage,
  getImageCountAndSize,
  clearAllImages,
} from "./indexed-db";
import { getSettings, saveSettings } from "./settings-storage";
import {
  validateImageSignature,
  sanitizeSvgDataUrl,
  MAX_FILE_SIZE_BYTES,
} from "../utils/image-validator";

export { getImageCountAndSize, clearAllImages };
export type { StoredImage };

export const MAX_IMAGE_SIZE_BYTES = MAX_FILE_SIZE_BYTES;
export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// Built-in default image IDs
export const DEFAULT_IMAGE_IDS = {
  TUNG: "__default_tung__",
  CAT: "__default_cat__",
};

export function getDefaultImageUrl(id: string): string | null {
  if (id === DEFAULT_IMAGE_IDS.TUNG) {
    return chrome.runtime.getURL("default-images/tung-tung-sahoor.jpg");
  }
  if (id === DEFAULT_IMAGE_IDS.CAT) {
    return chrome.runtime.getURL("default-images/cat-meme.jpg");
  }
  return null;
}

export function isDefaultImage(id: string): boolean {
  return Object.values(DEFAULT_IMAGE_IDS).includes(id);
}

export async function uploadImageFile(file: File): Promise<StoredImage> {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`);
  }

  // Validate file signature via ArrayBuffer
  const buffer = await file.arrayBuffer();
  const signature = validateImageSignature(buffer);
  if (!signature.valid) {
    throw new Error("Invalid image file or unsupported format");
  }

  let dataUrl = await fileToDataUrl(file);

  // If SVG, sanitize strictly
  if (file.type === "image/svg+xml" || signature.detectedType === "image/svg+xml") {
    const sanitized = sanitizeSvgDataUrl(dataUrl);
    if (!sanitized) {
      throw new Error("SVG contains unsafe scripts or disallowed elements");
    }
    dataUrl = sanitized;
  }

  // Validate it can be decoded as an image in browser
  await validateImageDataUrl(dataUrl);

  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const stored: StoredImage = {
    id,
    name: file.name.replace(/\.[^.]+$/, ""),
    dataUrl,
    mimeType: signature.detectedType || file.type || "image/png",
    sizeBytes: file.size,
    uploadedAt: Date.now(),
  };
  await saveImage(stored);
  return stored;
}

export async function uploadImageFromUrl(url: string, name?: string): Promise<StoredImage> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs are supported");
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error("Failed to fetch image. The image may be protected or blocked by CORS/hotlinking.");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch image: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  if (blob.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image too large: ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
  }

  const buffer = await blob.arrayBuffer();
  const signature = validateImageSignature(buffer);
  if (!signature.valid) {
    throw new Error("Downloaded file is not a valid supported image");
  }

  let dataUrl = await blobToDataUrl(blob);

  if (signature.detectedType === "image/svg+xml" || blob.type === "image/svg+xml") {
    const sanitized = sanitizeSvgDataUrl(dataUrl);
    if (!sanitized) {
      throw new Error("Downloaded SVG contains unsafe content");
    }
    dataUrl = sanitized;
  }

  await validateImageDataUrl(dataUrl);

  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const imageName = name || parsed.pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || "Web Image";
  const stored: StoredImage = {
    id,
    name: imageName,
    dataUrl,
    mimeType: signature.detectedType || blob.type || "image/png",
    sizeBytes: blob.size,
    uploadedAt: Date.now(),
  };
  await saveImage(stored);
  return stored;
}

export async function getImageDataUrl(imageId: string): Promise<string | null> {
  if (isDefaultImage(imageId)) {
    return getDefaultImageUrl(imageId);
  }
  const stored = await getImage(imageId);
  return stored ? stored.dataUrl : null;
}

export async function getAllStoredImages(): Promise<StoredImage[]> {
  return getAllImages();
}

export async function removeImage(imageId: string): Promise<void> {
  if (isDefaultImage(imageId)) return; // Cannot delete defaults
  await deleteImage(imageId);
  // If this was the active image, reset to default
  const settings = await getSettings();
  if (settings.activeImageId === imageId) {
    await saveSettings({
      activeImageId: DEFAULT_IMAGE_IDS.TUNG,
      activeImageUrl: null,
      activeImageName: "Tung Tung Sahoor",
    });
  }
  // Remove from collection
  if (settings.collectionImageIds.includes(imageId)) {
    await saveSettings({
      collectionImageIds: settings.collectionImageIds.filter((id) => id !== imageId),
    });
  }
}

export async function renameImage(imageId: string, newName: string): Promise<void> {
  if (isDefaultImage(imageId)) return;
  await updateImageName(imageId, newName);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

function validateImageDataUrl(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image data is corrupted or could not be decoded"));
    img.src = dataUrl;
  });
}