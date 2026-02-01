/**
 * @file: SourceMaterials.tsx
 * @description: Страница списка материалов объекта (/source/materials).
 * @dependencies: hooks/use-source-data, hooks/use-materials, components/materials/*
 * @created: 2026-02-01
 */

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Search } from "lucide-react";
import { useCurrentObject } from "@/hooks/use-source-data";
import { useProjectMaterials } from "@/hooks/use-materials";
import { MaterialCard, type ProjectMaterialListItem } from "@/components/materials/MaterialCard";
import { MaterialWizard } from "@/components/materials/MaterialWizard";

type Filter = "all" | "catalog" | "local" | "attention";

export default function SourceMaterials() {
  const [, setLocation] = useLocation();
  const currentObject = useCurrentObject();
  const objectId = currentObject.data?.id;

  const materialsQuery = useProjectMaterials(objectId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [wizardOpen, setWizardOpen] = useState(false);

  const list = (materialsQuery.data ?? []) as any[];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list
      .filter((m: any) => {
        if (filter === "catalog") return m.catalogMaterialId != null;
        if (filter === "local") return m.catalogMaterialId == null;
        if (filter === "attention") return !m.hasUseInActsQualityDoc;
        return true;
      })
      .filter((m: any) => {
        if (!q) return true;
        const title = String(m.nameOverride ?? `Материал #${m.id}`).toLowerCase();
        return title.includes(q);
      });
  }, [filter, list, search]);

  return (
    <div className="flex flex-col min-h-screen h-[100dvh] bg-background bg-grain">
      <Header title="Материалы" />

      <div className="flex-1 min-h-0 overflow-hidden px-4 py-6 pb-24 flex flex-col">
        <div className="mb-3 bg-background/95 backdrop-blur py-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по материалам..."
              className="pl-9 rounded-xl bg-secondary/50 border-transparent focus:bg-background transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} className="flex-1 rounded-xl h-10" onClick={() => setFilter("all")}>
              Все
            </Button>
            <Button
              variant={filter === "catalog" ? "default" : "outline"}
              className="flex-1 rounded-xl h-10"
              onClick={() => setFilter("catalog")}
            >
              Справочник
            </Button>
            <Button
              variant={filter === "local" ? "default" : "outline"}
              className="flex-1 rounded-xl h-10"
              onClick={() => setFilter("local")}
            >
              Локальные
            </Button>
            <Button
              variant={filter === "attention" ? "default" : "outline"}
              className="flex-1 rounded-xl h-10"
              onClick={() => setFilter("attention")}
            >
              ⚠
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-3 pr-2">
            {materialsQuery.isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Загрузка...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <div className="mb-3">Материалы не найдены</div>
                <Button onClick={() => setWizardOpen(true)} className="rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить материал
                </Button>
              </div>
            ) : (
              filtered.map((m: any) => (
                <MaterialCard
                  key={m.id}
                  material={m as ProjectMaterialListItem}
                  title={String(m.nameOverride ?? `Материал #${m.id}`)}
                  onOpen={() => setLocation(`/source/materials/${m.id}`)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="fixed bottom-20 right-4 z-40 md:right-[max(1rem,calc(50vw-220px))]">
        {Number.isFinite(objectId) ? (
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        ) : null}
      </div>

      {Number.isFinite(objectId) ? (
        <MaterialWizard objectId={objectId as number} open={wizardOpen} onOpenChange={setWizardOpen} />
      ) : null}

      <BottomNav />
    </div>
  );
}

