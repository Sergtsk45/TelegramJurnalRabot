/**
 * @file: use-telegram-back-button.ts
 * @description: React-хук для работы с BackButton Telegram WebApp
 * @dependencies: window.Telegram.WebApp
 * @created: 2026-02-20
 */

import { useEffect, useCallback } from "react";

interface BackButtonParams {
  /** Обработчик нажатия — должна быть стабильная ссылка (useCallback) */
  onClick: () => void;
  isVisible?: boolean;
}

/**
 * Хук для управления кнопкой "Назад" Telegram MiniApp.
 *
 * ВАЖНО: передавайте `onClick` как стабильную ссылку (через useCallback),
 * иначе эффект будет перезапускаться на каждый рендер.
 *
 * @example
 * ```tsx
 * const handleBack = useCallback(() => navigate('/'), [navigate]);
 * useTelegramBackButton({ onClick: handleBack, isVisible: true });
 * ```
 */
export function useTelegramBackButton(params: BackButtonParams) {
  const { onClick, isVisible = true } = params;

  useEffect(() => {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!backButton) return;

    if (isVisible) {
      backButton.show();
    } else {
      backButton.hide();
    }

    backButton.onClick(onClick);

    return () => {
      backButton.offClick(onClick);
      backButton.hide();
    };
  }, [onClick, isVisible]);

  const showButton = useCallback(() => {
    window.Telegram?.WebApp?.BackButton?.show();
  }, []);

  const hideButton = useCallback(() => {
    window.Telegram?.WebApp?.BackButton?.hide();
  }, []);

  return { showButton, hideButton };
}
