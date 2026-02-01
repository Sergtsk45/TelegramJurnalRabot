/**
 * @file: MaterialDetailView.tsx
 * @description: Детальный просмотр материала (основное, партии, документы, готовность к актам).
 * @dependencies: components/ui/*, components/documents/DocumentCard
 * @created: 2026-02-01
 */

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DocumentCard, type DocumentCardModel } from "@/components/documents/DocumentCard";
import { AlertTriangle, CheckCircle2, Star } from "lucide-react";
import { formatIsoToDmy } from "@/lib/dateFormat";

type BatchModel = {
  id: number;
  supplierName?: string | null;
  manufacturer?: string | null;
  batchNumber?: string | null;
  deliveryDate?: string | null;
  quantity?: string | null;
  unit?: string | null;
  notes?: string | null;
};

type BindingModel = {
  id: number;
  documentId: number;
  bindingRole: string;
  useInActs: boolean;
  isPrimary: boolean;
};

export function MaterialDetailView(props: {
  materialTitle: string;
  badge: "catalog" | "local";
  baseUnit?: string | null;
  batches: BatchModel[];
  documents: DocumentCardModel[];
  bindings: BindingModel[];
  onPatchBinding?: (bindingId: number, patch: Partial<Pick<BindingModel, "useInActs" | "isPrimary" | "bindingRole">>) => void;
  onAddBatch?: () => void;
  onBindDocument?: () => void;
}) {
  const bindingsByDocId = new Map<number, BindingModel[]>();
  for (const b of props.bindings) {
    const list = bindingsByDocId.get(b.documentId) ?? [];
    list.push(b);
    bindingsByDocId.set(b.documentId, list);
  }

  const hasUseInActsQualityDoc = props.bindings.some((b) => b.bindingRole === "quality" && b.useInActs);

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold truncate">{props.materialTitle}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={props.badge === "catalog" ? "secondary" : "outline"}>
                {props.badge === "catalog" ? "Справочник" : "Локальный"}
              </Badge>
              {props.baseUnit ? <Badge variant="secondary">Ед.: {props.baseUnit}</Badge> : null}
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
          {hasUseInActsQualityDoc ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="text-sm">Готово для актов</div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div className="text-sm">Нет документа качества для актов</div>
            </>
          )}
          </div>

          {!hasUseInActsQualityDoc && props.onBindDocument ? (
            <Button type="button" size="sm" variant="outline" onClick={props.onBindDocument} className="shrink-0">
              Добавить
            </Button>
          ) : null}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["batches", "documents"]}>
        <AccordionItem value="batches">
          <AccordionTrigger>Партии ({props.batches.length})</AccordionTrigger>
          <AccordionContent>
            {props.batches.length === 0 ? (
              <div className="text-sm text-muted-foreground">Партии не добавлены.</div>
            ) : (
              <div className="grid gap-3">
                {props.batches.map((b) => (
                  <div key={b.id} className="rounded-xl border p-3">
                    <div className="font-medium">
                      {b.batchNumber ? `Партия №${b.batchNumber}` : `Партия #${b.id}`}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {(b.quantity && b.unit ? `${b.quantity} ${b.unit}` : null) ?? ""}
                      {b.deliveryDate
                        ? (() => {
                            const dmy = formatIsoToDmy(b.deliveryDate);
                            const s = dmy ?? b.deliveryDate;
                            return b.quantity ? ` • ${s}` : s;
                          })()
                        : ""}
                      {b.supplierName ? ` • ${b.supplierName}` : ""}
                    </div>
                    {b.notes ? <div className="mt-2 text-sm">{b.notes}</div> : null}
                  </div>
                ))}
              </div>
            )}

            {props.onAddBatch ? (
              <div className="mt-3">
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={props.onAddBatch}>
                  Добавить партию
                </Button>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="documents">
          <AccordionTrigger>Документы ({props.documents.length})</AccordionTrigger>
          <AccordionContent>
            {props.documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">Документы не привязаны.</div>
            ) : (
              <div className="grid gap-3">
                {props.documents.map((d) => {
                  const bindings = bindingsByDocId.get(d.id) ?? [];
                  const primary = bindings.find((b) => b.isPrimary);
                  const useInActs = bindings.some((b) => b.bindingRole === "quality" && b.useInActs);

                  return (
                    <DocumentCard
                      key={d.id}
                      doc={d}
                      rightSlot={
                        bindings.length > 0 ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={useInActs}
                                onCheckedChange={(checked) => {
                                  const b = bindings.find((x) => x.bindingRole === "quality");
                                  if (!b || !props.onPatchBinding) return;
                                  props.onPatchBinding(b.id, { useInActs: Boolean(checked) });
                                }}
                              />
                              <div className="text-xs text-muted-foreground whitespace-nowrap">В актах</div>
                            </div>

                            <Button
                              type="button"
                              variant={primary ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (!props.onPatchBinding) return;
                                const b = bindings[0];
                                if (!b) return;
                                props.onPatchBinding(b.id, { isPrimary: true });
                              }}
                              title="Сделать основным"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null
                      }
                      onOpen={d.fileUrl ? () => window.open(d.fileUrl || undefined, "_blank") : undefined}
                    />
                  );
                })}
              </div>
            )}

            {props.onBindDocument ? (
              <div className="mt-3">
                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={props.onBindDocument}>
                  Привязать документ
                </Button>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

