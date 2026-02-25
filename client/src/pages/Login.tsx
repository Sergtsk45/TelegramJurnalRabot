/**
 * @file: Login.tsx
 * @description: Экран ввода access-token для работы в браузере вне Telegram
 * @dependencies: Header, BottomNav, browser-access, use-toast, wouter
 * @created: 2026-02-25
 */

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { clearBrowserAccessToken, getBrowserAccessToken, setBrowserAccessToken } from "@/lib/browser-access";
import { useLanguageStore } from "@/lib/i18n";

export default function Login() {
  const { language } = useLanguageStore();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const existing = useMemo(() => getBrowserAccessToken(), []);
  const [token, setToken] = useState(existing ?? "");

  const title = language === "ru" ? "Вход в браузере" : "Browser access";
  const hint =
    language === "ru"
      ? "Введите access-token, чтобы работать вне Telegram. Токен должен совпадать с переменной окружения APP_ACCESS_TOKEN на сервере."
      : "Enter access token to use the app outside Telegram. Token must match server env APP_ACCESS_TOKEN.";

  const handleSave = () => {
    const trimmed = token.trim();
    if (!trimmed) {
      toast({
        title: language === "ru" ? "Введите токен" : "Enter token",
        variant: "destructive",
      });
      return;
    }

    setBrowserAccessToken(trimmed);
    toast({ title: language === "ru" ? "Токен сохранён" : "Token saved" });
    navigate("/");
  };

  const handleClear = () => {
    clearBrowserAccessToken();
    setToken("");
    toast({ title: language === "ru" ? "Токен удалён" : "Token cleared" });
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Header title={title} showBack showSearch={false} />

      <div className="flex-1 pb-24">
        <div className="mx-4 my-4 bg-card border border-border/60 rounded-2xl p-4 space-y-3">
          <p className="text-[13px] text-muted-foreground leading-snug">{hint}</p>

          <div className="space-y-2">
            <p className="text-[12px] font-medium">
              {language === "ru" ? "Access-token" : "Access token"}
            </p>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={language === "ru" ? "Введите токен..." : "Enter token..."}
              type="password"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              {language === "ru" ? "Сохранить" : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClear}>
              {language === "ru" ? "Очистить" : "Clear"}
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

