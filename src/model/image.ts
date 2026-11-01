/**
 * Turns a picked/dropped image file into a self-contained `data:` URL so the
 * exported tutorial works without any image hosting.
 *
 * The image is scaled to at most 800px wide and compressed to keep the
 * Markdown small (MakeCode recommends images of 800px / 1MB or less).
 */

export const MAX_IMAGE_WIDTH = 800;

/** Below this we keep PNG (transparency); above it we fall back to JPEG. */
const TARGET_PNG_BYTES = 250 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif"];

const JPEG_QUALITIES = [0.85, 0.7, 0.55, 0.4];

export function isSupportedImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
}

export function isDataUrl(value: string): boolean {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value.trim());
}

/** Best-effort decoded byte size of a base64 data URL. */
export function dataUrlByteSize(dataUrl: string): number {
  const match = /^data:[^,]*;base64,(.*)$/i.exec(dataUrl.trim());
  if (!match) return 0;

  const base64 = match[1];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function embedImageFile(file: File): Promise<string> {
  if (!isSupportedImageFile(file)) {
    throw new Error("Use a PNG, JPEG or GIF image.");
  }

  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process the image.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const png = canvas.toDataURL("image/png");
  if (dataUrlByteSize(png) <= TARGET_PNG_BYTES) {
    return png;
  }

  let jpeg = png;
  for (const quality of JPEG_QUALITIES) {
    jpeg = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlByteSize(jpeg) <= TARGET_PNG_BYTES) break;
  }
  return jpeg;
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall back to the <img> path below (older browsers).
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not read the image."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")?.drawImage(image, 0, 0);

    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
