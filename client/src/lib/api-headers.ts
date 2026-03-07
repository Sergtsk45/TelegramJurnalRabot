/**
 * @file: api-headers.ts
 * @description: Вспомогательная функция для создания заголовков HTTP-запросов (авторизация + Telegram)
 * @dependencies: ./auth, ./telegram
 * @created: 2026-03-07
 */

import { getTelegramInitData } from "./telegram";
import { getAuthToken } from "./auth";

export function createApiHeaders(includeContentType = false): HeadersInit {
  const headers: HeadersInit = {};
  if (includeContentType) headers["Content-Type"] = "application/json";
  const initData = getTelegramInitData();
  if (initData) headers["X-Telegram-Init-Data"] = initData;
  const authToken = getAuthToken();
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}
