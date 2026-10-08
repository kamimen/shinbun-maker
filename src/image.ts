const MAX = 1600;

export async function readImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepsAlpha = file.type === "image/png" || file.type === "image/webp" || file.type === "image/svg+xml";
  return canvas.toDataURL(keepsAlpha ? "image/png" : "image/jpeg", 0.88);
}
