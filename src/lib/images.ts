"use client";

/**
 * Photos are shrunk in the browser and kept in the database as base64 JPEG text. (Cloud Storage needs Firebase's
 * paid plan, so the free plan keeps pictures in Firestore instead.) Re-encoding through a canvas also drops EXIF
 * metadata such as GPS position and device, and keeps every image under a size the rules enforce.
 */

/** What each kind of picture is shrunk to. `maxChars` is the most base64 text the database rules accept. */
export const IMAGE_PRESETS = {
  avatar: { maxEdge: 256, quality: 0.78, maxChars: 40_000 },
  stay: { maxEdge: 1024, quality: 0.72, maxChars: 300_000 },
  document: { maxEdge: 1500, quality: 0.74, maxChars: 750_000 },
} as const;
export type ImagePreset = keyof typeof IMAGE_PRESETS;

async function draw(file: File, maxEdge: number) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (JPEG or PNG).");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That image couldn’t be read. Try a JPEG or PNG.");
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Couldn’t process that image."));
    r.readAsDataURL(blob);
  });

/**
 * A JPEG as base64 text (no "data:" prefix), made smaller until it fits the preset. Quality drops first, then size.
 * Callers show it with `jpegSrc`.
 */
export async function compressToBase64(file: File | Blob, preset: ImagePreset): Promise<string> {
  const { maxEdge, quality, maxChars } = IMAGE_PRESETS[preset];
  let edge: number = maxEdge;
  let q: number = quality;
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = await draw(file as File, edge);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
    if (!blob) throw new Error("Couldn’t process that image.");
    const b64 = await toBase64(blob);
    if (b64.length <= maxChars) return b64;
    if (q > 0.5) q -= 0.1;
    else edge = Math.round(edge * 0.8);
  }
  throw new Error("That photo is too detailed to save. Try a simpler or smaller one.");
}

/** What an <img> shows for a stored picture. */
export const jpegSrc = (b64: string) => `data:image/jpeg;base64,${b64}`;
