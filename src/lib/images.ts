"use client";

/**
 * Downscales and re-encodes a photo as JPEG in the browser before upload.
 * Re-encoding through a canvas also drops EXIF metadata (GPS position, device),
 * and keeps ID photos well under the Storage size limit.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<Blob> {
  if (file.type === "application/pdf") return file;
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image or PDF.");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That image couldn’t be read. Try a JPEG or PNG.");
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn’t process that image.");
  return blob;
}
