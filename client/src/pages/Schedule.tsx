/**
 * @file: Schedule.tsx
 * @description: Экран "График работ" (диаграмма Ганта): дефолтный график, bootstrap задач из ВОР, редактирование startDate/durationDays.
 * @dependencies: shared/routes.ts (контракт), client/src/hooks/use-schedules.ts, client/src/hooks/use-works.ts
 * @created: 2026-01-17
 */

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguageStore, translations } from "@/lib/i18n";
import { useWorks } from "@/hooks/use-works";
import { useEstimate, useEstimates } from "@/hooks/use-estimates";
import { 
  useBootstrapScheduleFromWorks, 
  useBootstrapScheduleFromEstimate,
  useChangeScheduleSource,
  useDefaultSchedule, 
  usePatchScheduleTask, 
  useSchedule,
  useScheduleSourceInfo,
  useGenerateActsFromSchedule
} from "@/hooks/use-schedules";
import type { ScheduleTask, Work } from "@shared/schema";
import { GanttChartSquare, Loader2, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Pencil, RotateCcw, AlertTriangle } from "lucide-react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export default function Schedule() {
  const { language } = useLanguageStore();
  const t = translations[language].schedule;
  const { toast } = useToast();

  const { data: works = [] } = useWorks();
  const worksById = useMemo(() => new Map<number, Work>(works.map((w) => [w.id, w])), [works]);

  const { data: defaultSchedule, isLoading: isLoadingDefault, error: defaultError } = useDefaultSchedule();
  const scheduleId = defaultSchedule?.id;

  const {
    data: schedule,
    isLoading: isLoadingSchedule,
    error: scheduleError,
  } = useSchedule(scheduleId);

  const bootstrapFromWorks = useBootstrapScheduleFromWorks(scheduleId);
  const bootstrapFromEstimate = useBootstrapScheduleFromEstimate(scheduleId);
  const changeSource = useChangeScheduleSource(scheduleId);
  const generateActs = useGenerateActsFromSchedule(scheduleId);
  const { data: sourceInfo } = useScheduleSourceInfo(scheduleId);
  const patchTask = usePatchScheduleTask();

  const tasks: ScheduleTask[] = schedule?.tasks ?? [];
  const sourceType = schedule?.sourceType ?? 'works';
  
  const [changeSourceDialogOpen, setChangeSourceDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [pendingSourceType, setPendingSourceType] = useState<'works' | 'estimate' | null>(null);
  const [pendingEstimateId, setPendingEstimateId] = useState<number | null>(null);

  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    const update = () => setIsPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editDurationDays, setEditDurationDays] = useState<number>(1);
  const [editActNumber, setEditActNumber] = useState<string>("");

  const { data: estimates = [] } = useEstimates();
  const activeEstimateId = sourceType === "estimate" ? (schedule?.estimateId ?? null) : null;
  const { data: activeEstimateDetail } = useEstimate(activeEstimateId);

  // Helper: check if estimate position is "main" (ГЭСН/ФЕР/ТЕР)
  const isMainEstimatePosition = (pos: { code?: string | null }): boolean => {
    const code = String(pos.code ?? "").trim().toUpperCase();
    if (!code) return false;
    return code.startsWith("ГЭСН") || code.startsWith("ФЕР") || code.startsWith("ТЕР");
  };

  // Build flat list of all estimate positions (ordered)
  const allEstimatePositions = useMemo(() => {
    const list: any[] = [];
    const sections: any[] = (activeEstimateDetail as any)?.sections ?? [];
    for (const s of sections) {
      for (const p of (s?.positions ?? []) as any[]) {
        if (typeof p?.id === "number") list.push(p);
      }
    }
    return list;
  }, [activeEstimateDetail]);

  const estimatePositionsById = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of allEstimatePositions) {
      map.set(p.id, p);
    }
    return map;
  }, [allEstimatePositions]);

  // Group auxiliary positions under main positions
  const auxiliaryPositionsByMainId = useMemo(() => {
    const map = new Map<number, any[]>();
    if (sourceType !== "estimate") return map;

    let currentMainId: number | null = null;
    for (const pos of allEstimatePositions) {
      if (isMainEstimatePosition(pos)) {
        const posId = Number(pos.id);
        if (Number.isFinite(posId)) {
          currentMainId = posId;
          map.set(currentMainId, []);
        }
      } else if (currentMainId !== null) {
        const list = map.get(currentMainId) ?? [];
        list.push(pos);
        map.set(currentMainId, list);
      }
    }
    return map;
  }, [allEstimatePositions, sourceType]);

  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());

  const toggleTaskExpanded = (taskId: number) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const sourceSelectValue = useMemo(() => {
    if (sourceType === "works") return "works";
    const id = schedule?.estimateId;
    return typeof id === "number" ? `estimate:${id}` : "estimate:0";
  }, [schedule?.estimateId, sourceType]);

  const calendarStart = useMemo(() => {
    if (schedule?.calendarStart) return String(schedule.calendarStart);
    const min = tasks
      .map((t) => t.startDate)
      .filter(Boolean)
      .sort()[0];
    return min ? String(min) : format(new Date(), "yyyy-MM-dd");
  }, [schedule?.calendarStart, tasks]);

  const dayWidth = 24;
  const visibleDays = 60;
  const timelineWidth = visibleDays * dayWidth;
  const rowHeight = 44;

  const openEdit = (task: ScheduleTask) => {
    setSelectedTask(task);
    setEditStartDate(String(task.startDate));
    setEditDurationDays(Number(task.durationDays || 1));
    setEditActNumber(task.actNumber == null ? "" : String(task.actNumber));
    setEditOpen(true);
  };

  const handleBootstrap = async () => {
    try {
      const result = sourceType === 'estimate' 
        ? await bootstrapFromEstimate.mutateAsync({})
        : await bootstrapFromWorks.mutateAsync({});
      toast({
        title: t.bootstrapDoneTitle,
        description: t.bootstrapDoneDesc
          .replace("{created}", String(result.created))
          .replace("{skipped}", String(result.skipped)),
      });
    } catch (err: any) {
      toast({
        title: t.errorTitle,
        description: err?.message || t.bootstrapError,
        variant: "destructive",
      });
    }
  };

  const changeSourceAndMaybeBootstrap = async (nextSourceType: 'works' | 'estimate', nextEstimateId?: number) => {
    if (!sourceInfo) return;
    try {
      await changeSource.mutateAsync({
        newSourceType: nextSourceType,
        estimateId: nextEstimateId,
        confirmReset: true,
      });

      // Auto-bootstrap from the new source (so user immediately "sees" the schedule)
      if (nextSourceType === "estimate") {
        await bootstrapFromEstimate.mutateAsync({});
      } else {
        await bootstrapFromWorks.mutateAsync({});
      }

      setChangeSourceDialogOpen(false);
      setConfirmationInput("");
      setPendingSourceType(null);
      setPendingEstimateId(null);

      toast({
        title: language === "ru" ? "Источник изменён" : "Source changed",
        description:
          nextSourceType === "estimate"
            ? (language === "ru"
                ? `Источник графика изменён на "Смета". Задачи удалены (${sourceInfo.tasksCount} шт.)`
                : `Schedule source changed to \"Estimate\". Tasks deleted (${sourceInfo.tasksCount}).`)
            : (language === "ru"
                ? `Источник графика изменён на "ВОР". Задачи удалены (${sourceInfo.tasksCount} шт.)`
                : `Schedule source changed to \"Works\". Tasks deleted (${sourceInfo.tasksCount}).`),
      });
    } catch (err: any) {
      toast({
        title: t.errorTitle,
        description: err?.message || "Failed to change source",
        variant: "destructive",
      });
    }
  };

  const requestChangeSource = (nextSourceType: 'works' | 'estimate', nextEstimateId?: number) => {
    if (!sourceInfo) {
      toast({
        title: t.errorTitle,
        description: language === "ru" ? "Подождите, данные графика ещё загружаются" : "Please wait, schedule data is still loading",
        variant: "destructive",
      });
      return;
    }
    // If nothing to reset, do it immediately (no scary dialog)
    const tasksCount = sourceInfo?.tasksCount ?? 0;
    setPendingSourceType(nextSourceType);
    setPendingEstimateId(nextSourceType === "estimate" ? (nextEstimateId ?? null) : null);

    if (tasksCount === 0) {
      void changeSourceAndMaybeBootstrap(nextSourceType, nextEstimateId);
      return;
    }

    setConfirmationInput("");
    setChangeSourceDialogOpen(true);
  };

  const handleConfirmChangeSource = async () => {
    if (!sourceInfo || !pendingSourceType) return;
    const isConfirmed = confirmationInput.trim().toUpperCase() === "ПОДТВЕРЖДАЮ";
    if ((sourceInfo.tasksCount ?? 0) > 0 && !isConfirmed) return;
    await changeSourceAndMaybeBootstrap(
      pendingSourceType,
      pendingSourceType === "estimate" ? (pendingEstimateId ?? undefined) : undefined
    );
  };

  const handleGenerateActs = async () => {
    try {
      const result = await generateActs.mutateAsync();
      toast({
        title: language === "ru" ? "Акты сформированы" : "Acts generated",
        description: language === "ru"
          ? `Создано: ${result.created}, обновлено: ${result.updated}`
          : `Created: ${result.created}, updated: ${result.updated}`,
      });
    } catch (err: any) {
      toast({
        title: t.errorTitle,
        description: err?.message || "Failed to generate acts",
        variant: "destructive",
      });
    }
  };

  const shiftTask = async (task: ScheduleTask, deltaDays: number) => {
    try {
      const current = parseISO(String(task.startDate));
      const next = addDays(current, deltaDays);
      await patchTask.mutateAsync({
        id: task.id,
        patch: { startDate: format(next, "yyyy-MM-dd") },
        scheduleId: scheduleId ?? undefined,
      });
    } catch (err: any) {
      toast({
        title: t.errorTitle,
        description: err?.message || t.updateError,
        variant: "destructive",
      });
    }
  };

  const saveEdit = async () => {
    if (!selectedTask) return;
    try {
      const trimmed = editActNumber.trim();
      const nextActNumber = trimmed === "" ? null : Number(trimmed);
      if (trimmed !== "") {
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
          toast({
            title: t.errorTitle,
            description: language === "ru" ? "Номер акта должен быть целым числом > 0" : "Act number must be an integer > 0",
            variant: "destructive",
          });
          return;
        }
      }
      if (trimmed !== "" && nextActNumber == null) {
        toast({
          title: t.errorTitle,
          description: language === "ru" ? "Номер акта должен быть целым числом > 0" : "Act number must be an integer > 0",
          variant: "destructive",
        });
        return;
      }
      await patchTask.mutateAsync({
        id: selectedTask.id,
        patch: {
          startDate: editStartDate,
          durationDays: editDurationDays,
          actNumber: nextActNumber,
        },
        scheduleId: scheduleId ?? undefined,
      });
      setEditOpen(false);
      setSelectedTask(null);
    } catch (err: any) {
      toast({
        title: t.errorTitle,
        description: err?.message || t.updateError,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background bg-grain">
      <Header title={t.title} />

      <div className="flex-1 px-3 py-4 pb-24 w-full max-w-none">
        <div className="max-w-5xl mx-auto w-full space-y-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <GanttChartSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {isPortrait ? t.rotateHint : t.rotateHintOk}
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {language === "ru" ? "Источник" : "Source"}
                  </div>
                  <Select
                    value={sourceSelectValue}
                    onValueChange={(v) => {
                      if (v === sourceSelectValue) return;
                      if (v === "works") {
                        requestChangeSource("works");
                        return;
                      }
                      if (v.startsWith("estimate:")) {
                        const raw = v.split(":")[1];
                        const nextId = Number(raw);
                        if (Number.isFinite(nextId) && nextId > 0) {
                          requestChangeSource("estimate", nextId);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-[260px]" disabled={!scheduleId || !schedule}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="works">{language === "ru" ? "ВОР (справочник работ)" : "Works (BoQ)"}</SelectItem>
                      {estimates.length === 0 ? (
                        <SelectItem value="estimate:0" disabled>
                          {language === "ru" ? "Нет смет (импортируйте на /works)" : "No estimates (import on /works)"}
                        </SelectItem>
                      ) : (
                        estimates.map((e) => (
                          <SelectItem key={e.id} value={`estimate:${e.id}`}>
                            {language === "ru" ? "Смета" : "Estimate"}: {String((e as any).code ?? "").trim() ? `${(e as any).code} ` : ""}{e.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleBootstrap}
                    disabled={!scheduleId || bootstrapFromWorks.isPending || bootstrapFromEstimate.isPending}
                    data-testid="button-schedule-bootstrap"
                  >
                    {(bootstrapFromWorks.isPending || bootstrapFromEstimate.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {tasks.length === 0 ? t.bootstrap : t.refreshFromWorks}
                  </Button>
                  {tasks.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2"
                      onClick={handleGenerateActs}
                      disabled={generateActs.isPending}
                    >
                      {generateActs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {language === "ru" ? "Сформировать акты" : "Generate acts"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {defaultError || scheduleError ? (
            <Card className="glass-card">
              <CardContent className="p-4 text-sm text-destructive">
                {t.errorLoad}
              </CardContent>
            </Card>
          ) : isLoadingDefault || isLoadingSchedule ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">{t.emptyTitle}</CardTitle>
                <CardDescription className="text-sm">
                  {sourceType === "estimate"
                    ? (estimates.length === 0
                        ? (language === "ru" ? "Нет смет. Импортируйте смету на /works и выберите её как источник." : "No estimates. Import an estimate on /works and select it as the source.")
                        : (language === "ru" ? "Выберите смету как источник и нажмите «Создать»." : "Select an estimate as the source and click “Create”."))
                    : (works.length === 0 ? t.emptyNoWorks : t.emptyHasWorks)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Button
                  onClick={handleBootstrap}
                  disabled={
                    bootstrapFromWorks.isPending ||
                    bootstrapFromEstimate.isPending ||
                    (sourceType === "works" ? works.length === 0 : estimates.length === 0)
                  }
                >
                  {(bootstrapFromWorks.isPending || bootstrapFromEstimate.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {t.bootstrap}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="flex border-b bg-muted/20">
                  <div className="w-72 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {t.taskColumn}
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex" style={{ width: timelineWidth }}>
                      {Array.from({ length: visibleDays }).map((_, i) => {
                        const d = addDays(parseISO(calendarStart), i);
                        return (
                          <div
                            key={i}
                            className="shrink-0 border-l border-border/40 px-1 py-2 text-[10px] text-muted-foreground"
                            style={{ width: dayWidth }}
                            title={format(d, "yyyy-MM-dd")}
                          >
                            {format(d, "dd")}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex">
                  <div className="w-72 shrink-0 border-r">
                    {tasks.map((task) => {
                      const w = task.workId ? worksById.get(task.workId) : null;
                      const p = task.estimatePositionId ? estimatePositionsById.get(task.estimatePositionId) : null;
                      const title =
                        task.titleOverride ||
                        (sourceType === "estimate"
                          ? (p?.name ?? `${language === "ru" ? "Позиция" : "Position"} #${task.estimatePositionId ?? task.id}`)
                          : (w?.description ?? `${t.task} #${task.id}`));
                      
                      const auxiliaries = task.estimatePositionId ? (auxiliaryPositionsByMainId.get(task.estimatePositionId) ?? []) : [];
                      const hasAuxiliaries = auxiliaries.length > 0;
                      const isExpanded = expandedTaskIds.has(task.id);

                      return (
                        <div key={task.id} className="border-b last:border-b-0">
                          {/* Main task row */}
                          <div
                            className="px-3 py-2 flex items-center gap-2"
                            style={{ height: rowHeight }}
                          >
                            {/* Expand/collapse button (only for estimate with auxiliaries) */}
                            {sourceType === "estimate" && hasAuxiliaries ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => toggleTaskExpanded(task.id)}
                              >
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                              </Button>
                            ) : (
                              <div className="w-6 shrink-0" />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-muted-foreground font-mono truncate">
                                {sourceType === "estimate"
                                  ? (p?.lineNo || p?.code || `ID:${task.estimatePositionId ?? task.id}`)
                                  : (w?.code || `ID:${task.workId ?? task.id}`)}
                              </div>
                              {task.actNumber != null ? (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {language === "ru" ? "Акт №" : "Act #"}
                                  {task.actNumber}
                                </div>
                              ) : null}
                              <div className="text-sm font-medium truncate">{title}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => shiftTask(task, -1)}
                                disabled={patchTask.isPending}
                                aria-label={t.shiftLeft}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => shiftTask(task, +1)}
                                disabled={patchTask.isPending}
                                aria-label={t.shiftRight}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(task)}
                                aria-label={t.edit}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Auxiliary positions (collapsed by default) */}
                          {isExpanded && auxiliaries.map((aux: any, idx: number) => (
                            <div
                              key={`aux-${task.id}-${idx}`}
                              className="pl-12 pr-3 py-1 bg-muted/20 border-t text-xs text-muted-foreground"
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-mono shrink-0">{aux.lineNo || aux.code}</span>
                                <span className="truncate">{aux.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    <div
                      className="relative"
                      style={{
                        width: timelineWidth,
                        height: tasks.length * rowHeight,
                        backgroundImage:
                          `repeating-linear-gradient(to right, rgba(0,0,0,0.06) 0, rgba(0,0,0,0.06) 1px, transparent 1px, transparent ${dayWidth}px),` +
                          `repeating-linear-gradient(to bottom, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent ${rowHeight}px)`,
                      }}
                    >
                      {tasks.map((task, idx) => {
                        const start = differenceInCalendarDays(parseISO(String(task.startDate)), parseISO(calendarStart));
                        const left = Math.max(0, start) * dayWidth;
                        const width = Math.max(1, Number(task.durationDays || 1)) * dayWidth;
                        const top = idx * rowHeight + 10;
                        return (
                          <button
                            key={task.id}
                            type="button"
                            className="absolute h-6 rounded-md bg-primary/80 hover:bg-primary text-primary-foreground text-[10px] px-2 truncate"
                            style={{ left, top, width }}
                            onClick={() => openEdit(task)}
                            title={`${task.startDate} / ${task.durationDays}d`}
                          >
                            {sourceType === "estimate"
                              ? (task.estimatePositionId
                                  ? (estimatePositionsById.get(task.estimatePositionId)?.lineNo ||
                                      estimatePositionsById.get(task.estimatePositionId)?.code ||
                                      `#${task.estimatePositionId}`)
                                  : `#${task.id}`)
                              : (task.workId ? worksById.get(task.workId)?.code || `#${task.workId}` : `#${task.id}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BottomNav />

      <Dialog open={changeSourceDialogOpen} onOpenChange={setChangeSourceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {language === "ru" ? "Смена источника графика" : "Change schedule source"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">{language === "ru" ? "Переключение:" : "Switching:"}</span>{" "}
              <span className="font-medium">
                {sourceType === "works"
                  ? (language === "ru" ? "ВОР" : "Works")
                  : (language === "ru" ? "Смета" : "Estimate")}
              </span>{" "}
              →{" "}
              <span className="font-medium">
                {pendingSourceType === "estimate"
                  ? `${language === "ru" ? "Смета" : "Estimate"}: ${
                      estimates.find((e) => e.id === pendingEstimateId)?.name ?? `#${pendingEstimateId ?? ""}`
                    }`
                  : (language === "ru" ? "ВОР" : "Works")}
              </span>
            </div>

            <div className="rounded-md bg-destructive/10 p-3 text-sm space-y-2">
              <p className="font-medium">
                {language === "ru" ? "⚠ Это действие необратимо!" : "⚠ This action is irreversible!"}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  {language === "ru" 
                    ? `Будут удалены все задачи графика: ${sourceInfo?.tasksCount ?? 0} шт.`
                    : `All schedule tasks will be deleted: ${sourceInfo?.tasksCount ?? 0}`}
                </li>
                <li>
                  {language === "ru"
                    ? `Будут очищены списки работ в актах: ${sourceInfo?.affectedActNumbers.length ?? 0} шт.`
                    : `Work lists in acts will be cleared: ${sourceInfo?.affectedActNumbers.length ?? 0}`}
                </li>
              </ul>
              <p className="text-xs">
                {language === "ru"
                  ? "Сами акты (номера, даты) сохранятся, но их нужно будет заново заполнить из нового графика."
                  : "Acts themselves (numbers, dates) will be preserved, but will need to be refilled from the new schedule."}
              </p>
            </div>

            {(sourceInfo?.tasksCount ?? 0) > 0 && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {language === "ru" 
                    ? 'Введите "ПОДТВЕРЖДАЮ" для продолжения:' 
                    : 'Type "ПОДТВЕРЖДАЮ" to continue:'}
                </label>
                <Input
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="ПОДТВЕРЖДАЮ"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setChangeSourceDialogOpen(false);
                setConfirmationInput("");
                setPendingSourceType(null);
                setPendingEstimateId(null);
              }}
            >
              {language === "ru" ? "Отмена" : "Cancel"}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmChangeSource} 
              disabled={
                changeSource.isPending || 
                ((sourceInfo?.tasksCount ?? 0) > 0 && confirmationInput.trim().toUpperCase() !== "ПОДТВЕРЖДАЮ")
              }
            >
              {changeSource.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {language === "ru" ? "Сменить источник" : "Change source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.edit}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{language === "ru" ? "Номер акта" : "Act number"}</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={editActNumber}
                onChange={(e) => setEditActNumber(e.target.value)}
                placeholder={language === "ru" ? "Напр.: 5" : "e.g. 5"}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.startDate}</label>
              <Input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.durationDays}</label>
              <Input
                type="number"
                min={1}
                value={editDurationDays}
                onChange={(e) => setEditDurationDays(Number(e.target.value || 1))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={saveEdit} disabled={patchTask.isPending}>
              {patchTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

