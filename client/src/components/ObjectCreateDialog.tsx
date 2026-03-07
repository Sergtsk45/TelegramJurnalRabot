/**
 * @file: ObjectCreateDialog.tsx
 * @description: Диалог создания нового объекта строительства
 * @dependencies: use-objects, shadcn/ui Dialog, Form
 * @created: 2026-03-07
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateObject } from "@/hooks/use-objects";

interface ObjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ObjectCreateDialog({ open, onOpenChange }: ObjectCreateDialogProps) {
  const { toast } = useToast();
  const createObject = useCreateObject();

  const [form, setForm] = useState({ title: "", address: "", city: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    try {
      await createObject.mutateAsync({
        title: form.title.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
      });
      toast({ title: "Объект создан" });
      setForm({ title: "", address: "", city: "" });
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuotaError = msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("лимит");
      toast({
        title: "Ошибка",
        description: isQuotaError
          ? "Достигнут лимит объектов для вашего тарифа. Обновите тариф."
          : msg,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Новый объект</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="obj-title">Название *</Label>
            <Input
              id="obj-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="rounded-xl"
              placeholder="ЖК Северный, корпус 2"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="obj-city">Город</Label>
            <Input
              id="obj-city"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="rounded-xl"
              placeholder="Москва"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="obj-address">Адрес</Label>
            <Input
              id="obj-address"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="rounded-xl"
              placeholder="Адрес объекта"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl"
              disabled={createObject.isPending || !form.title.trim()}
            >
              {createObject.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
