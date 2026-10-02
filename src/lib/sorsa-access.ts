const ACCESS_KEY = "content-studio-discover-access";

export function forgetBrowserAccessCode() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
  } catch {
    return;
  }
}
