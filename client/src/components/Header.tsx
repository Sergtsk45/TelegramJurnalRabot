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
  const { language } = useLanguageStore();
  const shellT = translations[language].shell;

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
                  aria-label={shellT.selectObject}
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
  const shellT = translations[language].shell;
  const navigationItems = getNavigationItemsForSurface("headerSheetMobile", {
    groups: "secondary",
  });
  const quickAction = getQuickActionForSurface("headerSheetMobile");

  if (showBack) {
    return (
      <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">{shellT.back}</span>
      </Button>
    );
  }

  return (
    <>
      <div className="hidden h-9 w-9 shrink-0 md:block" aria-hidden="true" />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">{shellT.openMenu}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>{shellT.navigation}</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1" aria-label={shellT.secondaryNavigation}>
            {navigationItems.map((item) => {
              const isActive = isNavigationItemActive(item, location);

              return (
                <Button
                  key={item.id}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", isActive && "font-semibold")}
                >
                  <Link href={item.href}>
                    {getNavigationLabel(item, t)}
                  </Link>
                </Button>
              );
            })}
            {quickAction && (
              <Button
                asChild
                variant={isNavigationItemActive(quickAction, location) ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={quickAction.href}>
                  {getNavigationLabel(quickAction, t)}
                </Link>
              </Button>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
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
  const shellT = translations[language].shell;
  const quickAction = getQuickActionForSurface("headerQuickActionMobile");

  if (rightAction !== undefined) {
    return <div className="shrink-0">{rightAction}</div>;
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {showZapLink && quickAction && (
        <Button asChild size="icon" className="w-9 h-9 rounded-full">
          <Link href={quickAction.href}>
            <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            <span className="sr-only">{getNavigationLabel(quickAction, t)}</span>
          </Link>
        </Button>
      )}
      {showSearch && (
        <Button variant="ghost" size="icon" className="-mr-1">
          <Search className="h-5 w-5" />
          <span className="sr-only">{shellT.search}</span>
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
