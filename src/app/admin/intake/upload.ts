"use client";

import { upload } from "@vercel/blob/client";

export async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.86));
    return { blob, width: w, height: h };
  } catch {
    return { blob: file, width: 0, height: 0 }; // browser can't decode (e.g. HEIC on Chrome): upload as-is
  }
}

/** Resizes and uploads photos straight to Blob storage, reporting progress 0–100. */
export async function uploadPhotos(files: File[], onProgress: (pct: number) => void) {
  const out: { url: string; width?: number; height?: number }[] = [];
  for (const [i, file] of files.entries()) {
    const { blob, width, height } = await shrink(file);
    const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg");
    const res = await upload(`products/${Date.now()}-${i}.${ext}`, blob, {
      access: "public",
      handleUploadUrl: "/api/admin/blob",
      contentType: blob.type || file.type,
    });
    out.push({ url: res.url, width: width || undefined, height: height || undefined });
    onProgress(Math.round(((i + 1) / files.length) * 100));
  }
  return out;
}
