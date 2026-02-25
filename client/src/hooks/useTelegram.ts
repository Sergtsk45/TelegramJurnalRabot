/**
 * @file: useTelegram.ts
 * @description: React хук для работы с Telegram WebApp API
 * @dependencies: telegram.d.ts, React
 * @created: 2026-02-20
 */

import { useEffect, useState, useRef } from "react";

interface UseTelegramReturn {
  WebApp: TelegramWebApp | null;
  user: TelegramWebAppUser | null;
  initData: string;
  initDataUnsafe: TelegramWebAppInitData | null;
  themeParams: TelegramWebAppThemeParams;
  colorScheme: "light" | "dark";
  isInTelegram: boolean;
  platform: string;
  isExpanded: boolean;
  viewportHeight: number;
}

const MOCK_USER: TelegramWebAppUser = {
  id: 123456789,
  first_name: "Dev",
  last_name: "User",
  username: "devuser",
  language_code: "ru",
  is_premium: false,
};

const MOCK_THEME_PARAMS: TelegramWebAppThemeParams = {
  bg_color: "#ffffff",
  text_color: "#000000",
  hint_color: "#999999",
  link_color: "#2481cc",
  button_color: "#2481cc",
  button_text_color: "#ffffff",
  secondary_bg_color: "#f4f4f5",
};

const MOCK_INIT_DATA_UNSAFE: TelegramWebAppInitData = {
  user: MOCK_USER,
  auth_date: Math.floor(Date.now() / 1000),
  hash: "mock_hash_for_development",
};

const isDev = import.meta.env.DEV;

export function useTelegram(): UseTelegramReturn {
  // Store the original WebApp object in a ref — preserves prototype methods
  const tgRef = useRef<TelegramWebApp | null>(null);

  const [isInTelegram, setIsInTelegram] = useState(false);
  const [themeParams, setThemeParams] = useState<TelegramWebAppThemeParams>({});
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tgRef.current = tg;
      setIsInTelegram(true);
      setThemeParams({ ...tg.themeParams });
      setColorScheme(tg.colorScheme);
      setViewportHeight(tg.viewportHeight);
      setIsExpanded(tg.isExpanded);

      const handleThemeChanged = () => {
        setThemeParams({ ...tg.themeParams });
        setColorScheme(tg.colorScheme);
      };

      const handleViewportChanged = () => {
        setViewportHeight(tg.viewportHeight);
        setIsExpanded(tg.isExpanded);
      };

      tg.onEvent("themeChanged", handleThemeChanged);
      tg.onEvent("viewportChanged", handleViewportChanged);

      return () => {
        tg.offEvent("themeChanged", handleThemeChanged);
        tg.offEvent("viewportChanged", handleViewportChanged);
      };
    } else {
      setIsInTelegram(false);
      console.warn(
        "Telegram WebApp is not available. Running in development mode with mock data."
      );
    }
  }, []);

  if (isInTelegram && tgRef.current) {
    const tg = tgRef.current;
    return {
      WebApp: tg,
      user: tg.initDataUnsafe.user || null,
      initData: tg.initData,
      initDataUnsafe: tg.initDataUnsafe,
      themeParams,
      colorScheme,
      isInTelegram: true,
      platform: tg.platform,
      isExpanded,
      viewportHeight,
    };
  }

  return {
    WebApp: null,
    user: isDev ? MOCK_USER : null,
    initData: "",
    initDataUnsafe: isDev ? MOCK_INIT_DATA_UNSAFE : null,
    themeParams: isDev ? MOCK_THEME_PARAMS : {},
    colorScheme: "light",
    isInTelegram: false,
    platform: "unknown",
    isExpanded: false,
    viewportHeight: window.innerHeight,
  };
}

/**
 * Хук для быстрого доступа к данным пользователя
 *
 * @example
 * ```tsx
 * function UserGreeting() {
 *   const user = useTelegramUser();
 *   return <h1>Hello, {user?.first_name}!</h1>;
 * }
 * ```
 */
export function useTelegramUser(): TelegramWebAppUser | null {
  const { user } = useTelegram();
  return user;
}

/**
 * Хук для быстрого доступа к параметрам темы
 *
 * @example
 * ```tsx
 * function ThemedButton() {
 *   const theme = useTelegramTheme();
 *   return (
 *     <button style={{
 *       backgroundColor: theme.button_color,
 *       color: theme.button_text_color
 *     }}>
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useTelegramTheme(): TelegramWebAppThemeParams {
  const { themeParams } = useTelegram();
  return themeParams;
}
