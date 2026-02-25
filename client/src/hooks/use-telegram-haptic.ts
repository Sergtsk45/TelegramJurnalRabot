/**
 * @file: use-telegram-haptic.ts
 * @description: React-хук для тактильной обратной связи через Telegram WebApp HapticFeedback
 * @dependencies: window.Telegram.WebApp
 * @created: 2026-02-20
 */

import { useCallback } from "react";

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationStyle = "error" | "success" | "warning";

/**
 * Хук для управления тактильной обратной связью в Telegram MiniApp.
 *
 * @example
 * ```tsx
 * const haptic = useTelegramHaptic();
 *
 * <button onClick={() => { haptic.impact('light'); handleClick(); }}>
 *   Нажми меня
 * </button>
 * ```
 */
export function useTelegramHaptic() {
  const impact = useCallback((style: ImpactStyle = "medium") => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  }, []);

  const notificationOccurred = useCallback((type: NotificationStyle) => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
  }, []);

  const selectionChanged = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  }, []);

  return { impact, notificationOccurred, selectionChanged };
}

/** Утилита для быстрого доступа к haptic feedback вне React компонентов */
export const haptic = {
  impact: (style: ImpactStyle = "medium") => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  },
  notificationOccurred: (type: NotificationStyle) => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
  },
  selectionChanged: () => {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  },
};
