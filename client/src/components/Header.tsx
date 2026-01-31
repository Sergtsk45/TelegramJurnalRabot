import { useLocation } from "wouter";
import { Menu, Settings, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguageStore, translations } from "@/lib/i18n";
import { useCurrentObject } from "@/hooks/use-source-data";

export function Header({ title }: { title: string }) {
  const [location, setLocation] = useLocation();
  const { language } = useLanguageStore();
  const settingsLabel = translations[language].settings.title;
  const currentObjectQuery = useCurrentObject();
  const currentObjectTitle =
    (currentObjectQuery.data as any)?.title ??
    (language === "ru" ? "Объект по умолчанию" : "Default object");

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container max-w-md mx-auto flex h-14 items-center justify-between px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground">
                {language === "ru" ? "Текущий объект:" : "Current object:"}{" "}
                <span className="text-foreground">{currentObjectTitle}</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/settings")}>
              <Settings className="h-4 w-4" />
              {settingsLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <h1 className="font-display font-bold text-lg">{title}</h1>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2"
          onClick={() => setLocation("/")}
          disabled={location === "/"}
        >
          <Mic className="h-5 w-5" />
          <span className="sr-only">Home</span>
        </Button>
      </div>
    </header>
  );
}
