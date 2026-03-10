/**
 * @file: Header.tsx
 * @description: Вариативный хедер приложения с hamburger-меню (Sheet), кнопкой назад, subtitle, быстрой ссылкой на чат (молния), поиском и аватаром
 * @dependencies: lucide-react, @/components/ui/avatar, @/components/ui/button, @/components/ui/sheet, wouter
 * @created: 2026-02-23
 * @updated: 2026-03-07
 */

import { useState } from "react";
import { ArrowLeft, ChevronDown, Menu, Search, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ObjectSelector } from "./ObjectSelector";
import { cn } from "@/lib/utils";
import { useLanguageStore, translations } from "@/lib/i18n";
import {
  getNavigationItemsForSurface,
  getNavigationLabel,
  getQuickActionForSurface,
  isNavigationItemActive,
  type NavigationLabels,
} from "@/lib/navigation";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  showAvatar?: boolean;
  showZapLink?: boolean;
  rightAction?: React.ReactNode;
  showObjectSelector?: boolean;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  showSearch = true,
  showAvatar = false,
  showZapLink = true,
  rightAction,
  showObjectSelector = false,
}: HeaderProps) {
  const [objectSelectorOpen, setObjectSelectorOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background pt-safe">
        <div
          className="mx-auto flex h-14 max-w-md items-center justify-between px-4"
          style={{
            paddingLeft: "calc(1rem + var(--safe-area-left))",
            paddingRight: "calc(1rem + var(--safe-area-right))",
          }}
        >
          <LeftSlot showBack={showBack} onBack={onBack} />

          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <h1 className="font-semibold text-[17px] leading-tight truncate">{title}</h1>
            {subtitle && (
              showObjectSelector ? (
                <button
                  type="button"
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground leading-none mt-0.5 hover:text-foreground transition-colors"
                  onClick={() => setObjectSelectorOpen(true)}
                >
                  <span className="truncate max-w-[160px]">{subtitle}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </button>
              ) : (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground leading-none mt-0.5 truncate">
                  {subtitle}
                </p>
              )
            )}
          </div>

          <RightSlot
            rightAction={rightAction}
            showSearch={showSearch}
            showAvatar={showAvatar}
            showZapLink={showZapLink && !showBack}
          />
        </div>
      </header>

      {showObjectSelector && (
        <ObjectSelector open={objectSelectorOpen} onOpenChange={setObjectSelectorOpen} />
      )}
    </>
  );
}

function LeftSlot({
  showBack,
  onBack,
}: Pick<HeaderProps, "showBack" | "onBack">) {
  const [location] = useLocation();
  const { language } = useLanguageStore();
  const t: NavigationLabels = translations[language].nav;
  const primaryNavigationItems = getNavigationItemsForSurface("shellPrimaryMdUp", {
    groups: "primary",
  });
  const navigationItems = getNavigationItemsForSurface("headerSheetMobile", {
    groups: "secondary",
  });
  const quickAction = getQuickActionForSurface("headerSheetMobile");

  if (showBack) {
    return (
      <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">Назад</span>
      </Button>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Меню</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>Навигация</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-4">
          <div className="hidden flex-col gap-1 md:flex">
            {primaryNavigationItems.map((item) => {
              const isActive = isNavigationItemActive(item, location);

              return (
                <Link key={item.id} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-start", isActive && "font-semibold")}
                  >
                    {getNavigationLabel(item, t)}
                  </Button>
                </Link>
              );
            })}
          </div>
          <div className="flex flex-col gap-1">
            {navigationItems.map((item) => {
              const isActive = isNavigationItemActive(item, location);

              return (
                <Link key={item.id} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn("w-full justify-start", isActive && "font-semibold")}
                  >
                    {getNavigationLabel(item, t)}
                  </Button>
                </Link>
              );
            })}
            {quickAction && (
              <Link href={quickAction.href}>
                <Button
                  variant={isNavigationItemActive(quickAction, location) ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  {getNavigationLabel(quickAction, t)}
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function RightSlot({
  rightAction,
  showSearch,
  showAvatar,
  showZapLink,
}: Pick<HeaderProps, "rightAction" | "showSearch" | "showAvatar" | "showZapLink">) {
  const { language } = useLanguageStore();
  const t: NavigationLabels = translations[language].nav;
  const quickAction = getQuickActionForSurface("headerQuickActionMobile");

  if (rightAction !== undefined) {
    return <div className="shrink-0">{rightAction}</div>;
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {showZapLink && quickAction && (
        <Link href={quickAction.href}>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center cursor-pointer">
            <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            <span className="sr-only">{getNavigationLabel(quickAction, t)}</span>
          </div>
        </Link>
      )}
      {showSearch && (
        <Button variant="ghost" size="icon" className="-mr-1">
          <Search className="h-5 w-5" />
          <span className="sr-only">Поиск</span>
        </Button>
      )}
      {showAvatar && (
        <div className="relative ml-1">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">S</AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
        </div>
      )}
    </div>
  );
}
