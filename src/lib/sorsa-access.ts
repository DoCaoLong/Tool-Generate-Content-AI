const ACCESS_KEY = "content-studio-discover-access";

const listeners = new Set<() => void>();
let accessRaw = "";
let accessReady = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function readStoredAccess() {
  try {
    const saved = localStorage.getItem(ACCESS_KEY) || "";
    if (saved) return saved;
    const older = sessionStorage.getItem(ACCESS_KEY) || "";
    if (!older) return "";
    localStorage.setItem(ACCESS_KEY, older);
    sessionStorage.removeItem(ACCESS_KEY);
    return older;
  } catch {
    return "";
  }
}

export function subscribeSorsaAccess(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSorsaAccessSnapshot() {
  if (!accessReady && typeof window !== "undefined") {
    accessRaw = readStoredAccess();
    accessReady = true;
  }
  return accessRaw;
}

export function getSorsaAccessServerSnapshot() {
  return "";
}

export function saveSorsaAccessCode(code: string) {
  accessRaw = code;
  accessReady = true;
  try {
    localStorage.setItem(ACCESS_KEY, code);
    sessionStorage.removeItem(ACCESS_KEY);
  } catch {
    accessRaw = code;
  }
  emit();
}

export function clearSorsaAccessCode() {
  accessRaw = "";
  accessReady = true;
  try {
    localStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
  } catch {
    accessRaw = "";
  }
  emit();
}
