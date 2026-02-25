/**
 * @file: use-telegram-main-button.ts
 * @description: React-хук для работы с MainButton Telegram WebApp
 * @dependencies: window.Telegram.WebApp
 * @created: 2026-02-20
 */

import { useEffect, useCallback } from "react";

interface MainButtonParams {
  text: string;
  /** ВАЖНО: передавайте стабильную ссылку (useCallback), иначе эффект перезапускается каждый рендер */
  onClick: () => void;
  color?: string;
  textColor?: string;
  isActive?: boolean;
  isVisible?: boolean;
  isProgressVisible?: boolean;
}

/**
 * Хук для управления главной кнопкой Telegram MiniApp.
 *
 * @example
 * ```tsx
 * const handleSave = useCallback(async () => {
 *   setProgress(true);
 *   await saveData();
 *   setProgress(false);
 * }, []);
 *
 * const { setProgress } = useTelegramMainButton({
 *   text: "Сохранить",
 *   onClick: handleSave,
 * });
 * ```
 */
export function useTelegramMainButton(params: MainButtonParams) {
  const {
    text,
    onClick,
    color,
    textColor,
    isActive = true,
    isVisible = true,
    isProgressVisible = false,
  } = params;

  useEffect(() => {
    const mainButton = window.Telegram?.WebApp?.MainButton;
    if (!mainButton) return;

    mainButton.setParams({
      text,
      ...(color ? { color } : {}),
      ...(textColor ? { text_color: textColor } : {}),
      is_active: isActive,
      is_visible: isVisible,
    });

    if (isProgressVisible) {
      mainButton.showProgress();
    } else {
      mainButton.hideProgress();
    }

    mainButton.onClick(onClick);

    return () => {
      mainButton.offClick(onClick);
      mainButton.hide();
    };
  }, [text, onClick, color, textColor, isActive, isVisible, isProgressVisible]);

  const showButton = useCallback(() => {
    window.Telegram?.WebApp?.MainButton?.show();
  }, []);

  const hideButton = useCallback(() => {
    window.Telegram?.WebApp?.MainButton?.hide();
  }, []);

  const setProgress = useCallback((visible: boolean) => {
    const btn = window.Telegram?.WebApp?.MainButton;
    if (visible) btn?.showProgress();
    else btn?.hideProgress();
  }, []);

  const enable = useCallback(() => {
    window.Telegram?.WebApp?.MainButton?.enable();
  }, []);

  const disable = useCallback(() => {
    window.Telegram?.WebApp?.MainButton?.disable();
  }, []);

  const setText = useCallback((newText: string) => {
    window.Telegram?.WebApp?.MainButton?.setText(newText);
  }, []);

  return { showButton, hideButton, setProgress, enable, disable, setText };
}
