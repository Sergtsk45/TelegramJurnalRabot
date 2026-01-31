/**
 * @file: SourceData.tsx
 * @description: Страница анкеты “Исходные данные” (объект, стороны, ответственные лица) для плейсхолдеров АОСР/ЖР.
 * @dependencies: hooks/use-source-data, components/ui/*, lib/i18n
 * @created: 2026-01-27
 */

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguageStore, translations } from "@/lib/i18n";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useSaveSourceData, useSourceData } from "@/hooks/use-source-data";
import type { SourceDataDto } from "@shared/routes";

function emptySourceData(): SourceDataDto {
  return {
    object: { title: "", address: "", city: "" },
    parties: {
      customer: { fullName: "" },
      builder: { fullName: "" },
      designer: { fullName: "" },
    },
    persons: {
      developer_rep: { personName: "" },
      contractor_rep: { personName: "" },
      supervisor_rep: { personName: "" },
      rep_customer_control: { personName: "" },
      rep_builder: { personName: "" },
      rep_builder_control: { personName: "" },
      rep_designer: { personName: "" },
      rep_work_performer: { personName: "" },
    },
  };
}

function demoSourceData(): SourceDataDto {
  return {
    object: {
      title: "ЖК Северный · Корпус 2",
      city: "Москва",
      address: "г. Москва, ул. Примерная, д. 10",
    },
    parties: {
      customer: {
        fullName: 'ООО "Заказчик Девелопмент"',
        shortName: 'ООО "ЗД"',
        inn: "7701234567",
        kpp: "770101001",
        ogrn: "1157746000000",
        sroFullName: 'Ассоциация "СРО СтандартСтрой"',
        sroShortName: 'АССРО "СтандартСтрой"',
        sroOgrn: "1097700000000",
        sroInn: "7700000000",
        addressLegal: "109012, г. Москва, ул. Тестовая, д. 1",
        phone: "+7 (495) 000-00-01",
        email: "customer@example.ru",
      },
      builder: {
        fullName: 'ООО "Генподряд Строй"',
        shortName: 'ООО "ГПС"',
        inn: "7712345678",
        kpp: "771201001",
        ogrn: "1147746000001",
        sroFullName: 'Ассоциация "СРО Строители Москвы"',
        sroShortName: 'АССРО "СМ"',
        sroOgrn: "1107700000001",
        sroInn: "7700000001",
        addressLegal: "115035, г. Москва, наб. Набережная, д. 5",
        phone: "+7 (495) 000-00-02",
        email: "builder@example.ru",
      },
      designer: {
        fullName: 'ООО "ПроектИнжиниринг"',
        shortName: 'ООО "ПИ"',
        inn: "7723456789",
        kpp: "772301001",
        ogrn: "1137746000002",
        sroFullName: 'Ассоциация "СРО Проектировщики РФ"',
        sroShortName: 'АССРО "ПРФ"',
        sroOgrn: "1117700000002",
        sroInn: "7700000002",
        addressLegal: "127055, г. Москва, ул. Инженерная, д. 7",
        phone: "+7 (495) 000-00-03",
        email: "designer@example.ru",
      },
    },
    persons: {
      developer_rep: {
        personName: "Иванов И.И.",
        position: "Инженер заказчика",
        basisText: "доверенность № 1 от 01.01.2026",
        lineText: "Иванов И.И., инженер заказчика",
        signText: "Иванов И.И.",
      },
      contractor_rep: {
        personName: "Петров П.П.",
        position: "Главный инженер проекта",
        basisText: "приказ № 12 от 10.01.2026",
        lineText: "Петров П.П., ГИП",
        signText: "Петров П.П.",
      },
      supervisor_rep: {
        personName: "Сидоров С.С.",
        position: "Инженер стройконтроля",
        basisText: "договор № СК-01/26",
        lineText: "Сидоров С.С., инженер СК",
        signText: "Сидоров С.С.",
      },
      rep_customer_control: {
        personName: "Кузнецов К.К.",
        position: "Руководитель службы стройконтроля заказчика",
        basisText: "приказ № 7 от 05.01.2026",
        lineText: "Кузнецов К.К., руководитель СК",
        signText: "Кузнецов К.К.",
      },
      rep_builder: {
        personName: "Смирнов С.М.",
        position: "Начальник участка",
        basisText: "приказ № 21 от 12.01.2026",
        lineText: "Смирнов С.М., НУ",
        signText: "Смирнов С.М.",
      },
      rep_builder_control: {
        personName: "Васильев В.В.",
        position: "Инженер ПТО",
        basisText: "доверенность № 5 от 15.01.2026",
        lineText: "Васильев В.В., инженер ПТО",
        signText: "Васильев В.В.",
      },
      rep_designer: {
        personName: "Николаев Н.Н.",
        position: "Главный архитектор проекта",
        basisText: "приказ № 3 от 02.01.2026",
        lineText: "Николаев Н.Н., ГАП",
        signText: "Николаев Н.Н.",
      },
      rep_work_performer: {
        personName: "Фёдоров Ф.Ф.",
        position: "Производитель работ",
        basisText: "приказ № 33 от 20.01.2026",
        lineText: "Фёдоров Ф.Ф., прораб",
        signText: "Фёдоров Ф.Ф.",
      },
    },
  };
}

export default function SourceData() {
  const { language } = useLanguageStore();
  const t: any = (translations as any)[language]?.sourceData ?? {};
  const { toast } = useToast();

  const sourceDataQuery = useSourceData();
  const saveMutation = useSaveSourceData();

  const [draft, setDraft] = useState<SourceDataDto>(() => emptySourceData());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (sourceDataQuery.data && !initialized) {
      setDraft(sourceDataQuery.data);
      setInitialized(true);
    }
  }, [initialized, sourceDataQuery.data]);

  const isSaving = saveMutation.isPending;
  const isLoading = sourceDataQuery.isLoading;

  const personLabels = useMemo(
    () => ({
      developer_rep: t?.persons?.developer_rep ?? "Представитель заказчика (упрощ.)",
      contractor_rep: t?.persons?.contractor_rep ?? "Представитель подрядчика (упрощ.)",
      supervisor_rep: t?.persons?.supervisor_rep ?? "Стройконтроль/надзор (упрощ.)",
      rep_customer_control: t?.persons?.rep_customer_control ?? "Представитель заказчика / стройконтроль",
      rep_builder: t?.persons?.rep_builder ?? "Представитель подрядчика",
      rep_builder_control: t?.persons?.rep_builder_control ?? "Стройконтроль подрядчика",
      rep_designer: t?.persons?.rep_designer ?? "Представитель проектировщика",
      rep_work_performer: t?.persons?.rep_work_performer ?? "Производитель работ",
    }),
    [t]
  );

  const save = async () => {
    try {
      await saveMutation.mutateAsync(draft);
      toast({
        title: t?.saveSuccessTitle ?? (language === "ru" ? "Сохранено" : "Saved"),
        description: t?.saveSuccessDesc ?? (language === "ru" ? "Исходные данные обновлены" : "Source data updated"),
      });
    } catch (e) {
      toast({
        title: t?.saveErrorTitle ?? (language === "ru" ? "Ошибка" : "Error"),
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const fillDemo = () => {
    setDraft(demoSourceData());
    setInitialized(true);
    toast({
      title: language === "ru" ? "Заполнено" : "Filled",
      description:
        language === "ru"
          ? "Все поля заполнены тестовыми данными (не забудьте нажать «Сохранить»)."
          : "All fields were filled with demo data (press “Save” to persist).",
    });
  };

  return (
    <div className="flex flex-col min-h-screen h-[100dvh] bg-background bg-grain">
      <Header title={t?.title ?? (language === "ru" ? "Исходные данные" : "Source data")} />

      <div className="flex-1 overflow-hidden px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {language === "ru" ? "Загрузка..." : "Loading..."}
          </div>
        ) : (
          <div className="h-full flex flex-col gap-4">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={fillDemo} disabled={isSaving}>
                <Sparkles className="h-4 w-4 mr-2" />
                {language === "ru" ? "Тестовые" : "Demo"}
              </Button>
              <Button type="button" onClick={save} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {language === "ru" ? "Сохранение..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t?.save ?? (language === "ru" ? "Сохранить" : "Save")}
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="pr-2">
                <Accordion type="multiple" defaultValue={[]}>
                  <AccordionItem value="object">
                    <AccordionTrigger>{t?.sections?.object ?? (language === "ru" ? "Объект" : "Object")}</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>{t?.fields?.objectTitle ?? (language === "ru" ? "Название" : "Title")}</Label>
                          <Input
                            value={draft.object.title}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, object: { ...prev.object, title: e.target.value } }))
                            }
                            placeholder={language === "ru" ? "ЖК Северный, корпус 2" : "Project name"}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t?.fields?.objectCity ?? (language === "ru" ? "Город" : "City")}</Label>
                          <Input
                            value={draft.object.city}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, object: { ...prev.object, city: e.target.value } }))
                            }
                            placeholder={language === "ru" ? "Москва" : "City"}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t?.fields?.objectAddress ?? (language === "ru" ? "Адрес" : "Address")}</Label>
                          <Input
                            value={draft.object.address}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, object: { ...prev.object, address: e.target.value } }))
                            }
                            placeholder={language === "ru" ? "Адрес объекта" : "Address"}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {(["customer", "builder", "designer"] as const).map((role) => {
                    const title =
                      role === "customer"
                        ? t?.sections?.customer ?? (language === "ru" ? "Заказчик" : "Customer")
                        : role === "builder"
                          ? t?.sections?.builder ?? (language === "ru" ? "Подрядчик" : "Builder")
                          : t?.sections?.designer ?? (language === "ru" ? "Проектировщик" : "Designer");

                    const party = draft.parties[role];
                    const setParty = (patch: Partial<typeof party>) =>
                      setDraft((prev) => ({
                        ...prev,
                        parties: { ...prev.parties, [role]: { ...prev.parties[role], ...patch } },
                      }));

                    return (
                      <AccordionItem key={role} value={role}>
                        <AccordionTrigger>{title}</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label>{t?.fields?.partyFullName ?? (language === "ru" ? "Полное наименование" : "Full name")}</Label>
                              <Input value={party.fullName} onChange={(e) => setParty({ fullName: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                              <Label>{t?.fields?.partyShortName ?? (language === "ru" ? "Краткое наименование" : "Short name")}</Label>
                              <Input value={party.shortName ?? ""} onChange={(e) => setParty({ shortName: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="grid gap-2">
                                <Label>ИНН</Label>
                                <Input value={party.inn ?? ""} onChange={(e) => setParty({ inn: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>КПП</Label>
                                <Input value={party.kpp ?? ""} onChange={(e) => setParty({ kpp: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>ОГРН</Label>
                                <Input value={party.ogrn ?? ""} onChange={(e) => setParty({ ogrn: e.target.value })} />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label>{t?.fields?.partySroFullName ?? (language === "ru" ? "СРО (полное наименование)" : "SRO full name")}</Label>
                              <Input
                                value={party.sroFullName ?? ""}
                                onChange={(e) => setParty({ sroFullName: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>{t?.fields?.partySroShortName ?? (language === "ru" ? "СРО (краткое наименование)" : "SRO short name")}</Label>
                              <Input
                                value={party.sroShortName ?? ""}
                                onChange={(e) => setParty({ sroShortName: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-2">
                                <Label>{t?.fields?.partySroOgrn ?? (language === "ru" ? "ОГРН СРО" : "SRO OGRN")}</Label>
                                <Input
                                  value={party.sroOgrn ?? ""}
                                  onChange={(e) => setParty({ sroOgrn: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>{t?.fields?.partySroInn ?? (language === "ru" ? "ИНН СРО" : "SRO INN")}</Label>
                                <Input
                                  value={party.sroInn ?? ""}
                                  onChange={(e) => setParty({ sroInn: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label>{t?.fields?.partyAddressLegal ?? (language === "ru" ? "Юр. адрес" : "Legal address")}</Label>
                              <Input
                                value={party.addressLegal ?? ""}
                                onChange={(e) => setParty({ addressLegal: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-2">
                                <Label>{t?.fields?.partyPhone ?? (language === "ru" ? "Телефон" : "Phone")}</Label>
                                <Input value={party.phone ?? ""} onChange={(e) => setParty({ phone: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input value={party.email ?? ""} onChange={(e) => setParty({ email: e.target.value })} />
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}

                  <AccordionItem value="persons">
                    <AccordionTrigger>{t?.sections?.persons ?? (language === "ru" ? "Ответственные лица" : "Responsible persons")}</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-6">
                        {(Object.keys(draft.persons) as Array<keyof SourceDataDto["persons"]>).map((role) => {
                          const person = draft.persons[role];
                          const setPerson = (patch: Partial<typeof person>) =>
                            setDraft((prev) => ({
                              ...prev,
                              persons: { ...prev.persons, [role]: { ...prev.persons[role], ...patch } },
                            }));

                          return (
                            <div key={String(role)} className="rounded-lg border p-4">
                              <div className="font-medium mb-3">{(personLabels as any)[role]}</div>
                              <div className="grid gap-4">
                                <div className="grid gap-2">
                                  <Label>{t?.fields?.personName ?? (language === "ru" ? "ФИО" : "Name")}</Label>
                                  <Input
                                    value={person.personName ?? ""}
                                    onChange={(e) => setPerson({ personName: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>{t?.fields?.personPosition ?? (language === "ru" ? "Должность" : "Position")}</Label>
                                  <Input
                                    value={person.position ?? ""}
                                    onChange={(e) => setPerson({ position: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>{t?.fields?.personBasisText ?? (language === "ru" ? "Основание (приказ/доверенность)" : "Authority basis")}</Label>
                                  <Input
                                    value={person.basisText ?? ""}
                                    onChange={(e) => setPerson({ basisText: e.target.value })}
                                  />
                                </div>

                                {/* advanced / optional */}
                                <div className="grid gap-2">
                                  <Label>{t?.fields?.personLineText ?? (language === "ru" ? "Строка представителя (опц.)" : "Representative line (opt.)")}</Label>
                                  <Input
                                    value={person.lineText ?? ""}
                                    onChange={(e) => setPerson({ lineText: e.target.value })}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>{t?.fields?.personSignText ?? (language === "ru" ? "Подпись (опц.)" : "Signature (opt.)")}</Label>
                                  <Input
                                    value={person.signText ?? ""}
                                    onChange={(e) => setPerson({ signText: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

