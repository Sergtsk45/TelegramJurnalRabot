/**
 * @file: browser-access.ts
 * @description: Хелперы для доступа к приложению в браузере через access-token (localStorage)
 * @dependencies: localStorage
 * @created: 2026-02-25
 */

const STORAGE_KEY = "app_access_token";

export function getBrowserAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const token = String(raw || "").trim();
  return token ? token : null;
}

export function setBrowserAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(token || "").trim());
}

export function clearBrowserAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

