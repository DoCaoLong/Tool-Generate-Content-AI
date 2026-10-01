import path from "node:path";

const typeToExt = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/pjpeg", "jpg"],
  ["image/png", "png"],
  ["image/x-png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const extToType = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
]);

const safeName = /^[0-9]{10,}-[a-z0-9]{4,12}\.(jpg|png|webp|gif)$/;

export function promptUploadDir() {
  return path.join(process.cwd(), "data", "uploads", "prompts");
}

export function legacyPromptUploadDir() {
  return path.join(process.cwd(), "public", "uploads", "prompts");
}

export function extensionForPromptImage(file: { type?: string; name?: string }) {
  const byType = typeToExt.get((file.type || "").toLowerCase());
  if (byType) return byType;
  const nameExt = (file.name || "").split(".").pop()?.toLowerCase() || "";
  if ((file.type === "" || file.type === "application/octet-stream") && extToType.has(nameExt === "jpeg" ? "jpg" : nameExt)) {
    return nameExt === "jpeg" ? "jpg" : nameExt;
  }
  return null;
}

export function promptImageContentType(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return extToType.get(ext) || null;
}

export function isSafePromptImageName(fileName: string) {
  return safeName.test(fileName);
}
