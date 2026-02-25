/**
 * @file: browserTokenAuth.ts
 * @description: Опциональная авторизация в браузере по access-token (для запуска вне Telegram)
 * @dependencies: express
 * @created: 2026-02-25
 */

import type { Request, Response, NextFunction } from "express";

const BROWSER_PSEUDO_TELEGRAM_USER_ID = -1;

/**
 * Если передан корректный X-App-Access-Token, устанавливает req.telegramUser как "псевдо-пользователя".
 * Это позволяет переиспользовать существующую логику (userId, object scoping), не ослабляя Telegram auth.
 *
 * Важно:
 * - токен задаётся через env `APP_ACCESS_TOKEN`
 * - если env не задан, доступ в браузере отключён
 */
export function browserTokenAuthMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Если уже есть Telegram user (валидированный initData) — ничего не делаем
    if (req.telegramUser?.id) {
      next();
      return;
    }

    const expected = String(process.env.APP_ACCESS_TOKEN || "").trim();
    if (!expected) {
      next();
      return;
    }

    const provided = String(req.headers["x-app-access-token"] || "").trim();
    if (!provided) {
      next();
      return;
    }

    if (provided !== expected) {
      next();
      return;
    }

    req.telegramUser = {
      id: BROWSER_PSEUDO_TELEGRAM_USER_ID,
      first_name: "Browser",
    };

    next();
  };
}

export function isBrowserPseudoUser(req: Request): boolean {
  return req.telegramUser?.id === BROWSER_PSEUDO_TELEGRAM_USER_ID;
}

