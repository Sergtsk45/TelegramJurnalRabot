import { db } from "./db";
import {
  objects,
  objectParties,
  objectResponsiblePersons,
  works,
  estimates,
  estimateSections,
  estimatePositions,
  positionResources,
  messages,
  acts,
  attachments,
  actTemplates,
  actTemplateSelections,
  schedules,
  scheduleTasks,
  type InsertWork,
  type InsertEstimate,
  type InsertEstimateSection,
  type InsertEstimatePosition,
  type InsertPositionResource,
  type InsertMessage,
  type InsertAct,
  type InsertSchedule,
  type Work,
  type Estimate,
  type EstimateSection,
  type EstimatePosition,
  type PositionResource,
  type Message,
  type Act,
  type Attachment,
  type Object as DbObject,
  type InsertObject,
  type ObjectParty,
  type InsertObjectParty,
  type ObjectResponsiblePerson,
  type InsertObjectResponsiblePerson,
  type ActTemplate,
  type InsertActTemplate,
  type ActTemplateSelection,
  type InsertActTemplateSelection,
  type Schedule,
  type ScheduleTask
} from "@shared/schema";
import type { PartyDto, PersonDto, SourceDataDto } from "@shared/routes";
import { eq, desc, inArray, asc } from "drizzle-orm";

type ObjectPartyRole = "customer" | "builder" | "designer";
type ObjectPersonRole =
  | "developer_rep"
  | "contractor_rep"
  | "supervisor_rep"
  | "rep_customer_control"
  | "rep_builder"
  | "rep_builder_control"
  | "rep_designer"
  | "rep_work_performer";

export interface IStorage {
  // Objects / Source data (MVP: single default object)
  getOrCreateDefaultObject(): Promise<DbObject>;
  getObject(id: number): Promise<DbObject | undefined>;
  updateObject(id: number, patch: Partial<Pick<InsertObject, "title" | "address" | "city">>): Promise<DbObject>;
  getObjectSourceData(objectId: number): Promise<SourceDataDto>;
  saveObjectSourceData(objectId: number, data: SourceDataDto): Promise<SourceDataDto>;

  // Works
  getWorks(): Promise<Work[]>;
  createWork(work: InsertWork): Promise<Work>;
  getWorkByCode(code: string): Promise<Work | undefined>;
  getWorksByIds(ids: number[]): Promise<Work[]>;
  clearWorks(): Promise<void>;
  importWorks(items: InsertWork[], mode: "merge" | "replace"): Promise<{ created: number; updated: number }>;

  // Estimates (Сметы / ЛСР)
  getEstimates(): Promise<Estimate[]>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  getEstimateSections(estimateId: number): Promise<EstimateSection[]>;
  getEstimatePositions(estimateId: number): Promise<EstimatePosition[]>;
  getPositionResources(positionIds: number[]): Promise<PositionResource[]>;
  getEstimateWithDetails(
    estimateId: number
  ): Promise<
    | {
        estimate: Estimate;
        sections: Array<
          EstimateSection & { positions: Array<EstimatePosition & { resources: PositionResource[] }> }
        >;
      }
    | undefined
  >;
  importEstimate(payload: {
    estimate: InsertEstimate;
    sections: Array<Omit<InsertEstimateSection, "estimateId">>;
    positions: Array<Omit<InsertEstimatePosition, "estimateId" | "sectionId"> & { sectionNumber?: string | null }>;
    resources: Array<Omit<InsertPositionResource, "positionId"> & { positionLineNo: string }>;
  }): Promise<{ estimateId: number; sections: number; positions: number; resources: number }>;
  deleteEstimate(id: number): Promise<boolean>;

  // Messages
  getMessages(): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageNormalized(id: number, normalizedData: any): Promise<Message>;

  // Acts
  getActs(): Promise<Act[]>;
  getAct(id: number): Promise<Act | undefined>;
  getActByNumber(actNumber: number): Promise<Act | undefined>;
  createAct(act: InsertAct): Promise<Act>;
  upsertActByNumber(data: {
    actNumber: number;
    dateStart: string | null;
    dateEnd: string | null;
    location?: string | null;
    status?: string | null;
    worksData?: Array<{ workId: number; quantity: number; description: string }> | null;
  }): Promise<{ act: Act; created: boolean }>;
  
  // Attachments
  getAttachments(actId: number): Promise<Attachment[]>;

  // Act Templates
  getActTemplates(): Promise<ActTemplate[]>;
  getActTemplate(id: number): Promise<ActTemplate | undefined>;
  getActTemplateByTemplateId(templateId: string): Promise<ActTemplate | undefined>;
  createActTemplate(template: InsertActTemplate): Promise<ActTemplate>;
  seedActTemplates(templates: InsertActTemplate[]): Promise<void>;

  // Act Template Selections
  getActTemplateSelections(actId: number): Promise<ActTemplateSelection[]>;
  createActTemplateSelection(selection: InsertActTemplateSelection): Promise<ActTemplateSelection>;
  updateActTemplateSelectionStatus(id: number, status: string, pdfUrl?: string): Promise<ActTemplateSelection>;

  // Schedules (Gantt)
  getOrCreateDefaultSchedule(): Promise<Schedule>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  getScheduleWithTasks(id: number): Promise<(Schedule & { tasks: ScheduleTask[] }) | undefined>;
  bootstrapScheduleTasksFromWorks(params: {
    scheduleId: number;
    workIds?: number[];
    defaultStartDate: string;
    defaultDurationDays: number;
  }): Promise<{ scheduleId: number; created: number; skipped: number }>;
  patchScheduleTask(
    id: number,
    patch: Partial<Pick<ScheduleTask, "titleOverride" | "startDate" | "durationDays" | "orderIndex" | "actNumber">>
  ): Promise<ScheduleTask | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getOrCreateDefaultObject(): Promise<DbObject> {
    // MVP: single "current" object.
    // IMPORTANT: do NOT rely on title to find the current object,
    // because title is user-editable via source-data and would lead to duplicates.
    const all = await db.select().from(objects);
    if (all.length === 1) return all[0];
    if (all.length > 1) {
      // If duplicates exist (legacy bug), pick the object that was most recently
      // updated via source-data (parties/persons have updatedAt).
      const ids = all.map((o) => o.id);
      const parties = await db
        .select({ objectId: objectParties.objectId, updatedAt: objectParties.updatedAt })
        .from(objectParties)
        .where(inArray(objectParties.objectId, ids));
      const persons = await db
        .select({ objectId: objectResponsiblePersons.objectId, updatedAt: objectResponsiblePersons.updatedAt })
        .from(objectResponsiblePersons)
        .where(inArray(objectResponsiblePersons.objectId, ids));

      const stats = new Map<number, { updatedAtMs: number; count: number }>();
      for (const o of all) stats.set(o.id, { updatedAtMs: 0, count: 0 });

      const bump = (objectId: number, dt: Date | null) => {
        const s = stats.get(objectId);
        if (!s) return;
        s.count += 1;
        const ms = dt instanceof Date ? dt.getTime() : 0;
        if (ms > s.updatedAtMs) s.updatedAtMs = ms;
      };

      for (const p of parties) bump(Number(p.objectId), p.updatedAt as any);
      for (const p of persons) bump(Number(p.objectId), p.updatedAt as any);

      const best = all
        .slice()
        .sort((a, b) => {
          const sa = stats.get(a.id)!;
          const sb = stats.get(b.id)!;
          // 1) latest updatedAt
          if (sb.updatedAtMs !== sa.updatedAtMs) return sb.updatedAtMs - sa.updatedAtMs;
          // 2) more related records
          if (sb.count !== sa.count) return sb.count - sa.count;
          // 3) stable tie-breaker: newest id
          return b.id - a.id;
        })[0];

      return best;
    }

    const defaultTitle = "Объект по умолчанию";
    const [created] = await db
      .insert(objects)
      .values({ title: defaultTitle, address: null, city: null })
      .returning();
    return created;
  }

  async getObject(id: number): Promise<DbObject | undefined> {
    const [obj] = await db.select().from(objects).where(eq(objects.id, id));
    return obj;
  }

  async updateObject(
    id: number,
    patch: Partial<Pick<InsertObject, "title" | "address" | "city">>
  ): Promise<DbObject> {
    const [updated] = await db
      .update(objects)
      .set({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.address !== undefined ? { address: patch.address ?? null } : {}),
        ...(patch.city !== undefined ? { city: patch.city ?? null } : {}),
      })
      .where(eq(objects.id, id))
      .returning();
    return updated;
  }

  async getObjectSourceData(objectId: number): Promise<SourceDataDto> {
    const obj = await this.getObject(objectId);
    if (!obj) throw new Error("OBJECT_NOT_FOUND");

    const parties = await db.select().from(objectParties).where(eq(objectParties.objectId, objectId));
    const persons = await db
      .select()
      .from(objectResponsiblePersons)
      .where(eq(objectResponsiblePersons.objectId, objectId));

    const partiesByRole = new Map<string, ObjectParty>();
    for (const p of parties) partiesByRole.set(p.role, p);

    const personsByRole = new Map<string, ObjectResponsiblePerson>();
    for (const p of persons) personsByRole.set(p.role, p);

    const ensureParty = (role: ObjectPartyRole): PartyDto => {
      const p = partiesByRole.get(role);
      return {
        fullName: p?.fullName ?? "",
        shortName: p?.shortName ?? undefined,
        inn: p?.inn ?? undefined,
        kpp: p?.kpp ?? undefined,
        ogrn: p?.ogrn ?? undefined,
        sroFullName: p?.sroFullName ?? undefined,
        sroShortName: p?.sroShortName ?? undefined,
        sroOgrn: p?.sroOgrn ?? undefined,
        sroInn: p?.sroInn ?? undefined,
        addressLegal: p?.addressLegal ?? undefined,
        phone: p?.phone ?? undefined,
        email: p?.email ?? undefined,
      };
    };

    const ensurePerson = (role: ObjectPersonRole): PersonDto => {
      const p = personsByRole.get(role);
      return {
        personName: p?.personName ?? "",
        position: p?.position ?? undefined,
        basisText: p?.basisText ?? undefined,
        lineText: p?.lineText ?? undefined,
        signText: p?.signText ?? undefined,
      };
    };

    return {
      object: {
        title: obj.title ?? "",
        address: obj.address ?? "",
        city: obj.city ?? "",
      },
      parties: {
        customer: ensureParty("customer"),
        builder: ensureParty("builder"),
        designer: ensureParty("designer"),
      },
      persons: {
        developer_rep: ensurePerson("developer_rep"),
        contractor_rep: ensurePerson("contractor_rep"),
        supervisor_rep: ensurePerson("supervisor_rep"),
        rep_customer_control: ensurePerson("rep_customer_control"),
        rep_builder: ensurePerson("rep_builder"),
        rep_builder_control: ensurePerson("rep_builder_control"),
        rep_designer: ensurePerson("rep_designer"),
        rep_work_performer: ensurePerson("rep_work_performer"),
      },
    };
  }

  async saveObjectSourceData(objectId: number, data: SourceDataDto): Promise<SourceDataDto> {
    return await db.transaction(async (tx) => {
      const [obj] = await tx.select().from(objects).where(eq(objects.id, objectId));
      if (!obj) throw new Error("OBJECT_NOT_FOUND");

      await tx
        .update(objects)
        .set({
          title: data.object.title,
          address: data.object.address || null,
          city: data.object.city || null,
        })
        .where(eq(objects.id, objectId));

      const upsertParty = async (role: ObjectPartyRole, party: PartyDto) => {
        const values: InsertObjectParty = {
          objectId,
          role,
          fullName: party.fullName ?? "",
          shortName: party.shortName ?? null,
          inn: party.inn ?? null,
          kpp: party.kpp ?? null,
          ogrn: party.ogrn ?? null,
          sroFullName: party.sroFullName ?? null,
          sroShortName: party.sroShortName ?? null,
          sroOgrn: party.sroOgrn ?? null,
          sroInn: party.sroInn ?? null,
          addressLegal: party.addressLegal ?? null,
          phone: party.phone ?? null,
          email: party.email ?? null,
        };
        const updatedAt = new Date();

        await tx
          .insert(objectParties)
          .values(values)
          .onConflictDoUpdate({
            target: [objectParties.objectId, objectParties.role],
            set: {
              fullName: values.fullName,
              shortName: values.shortName,
              inn: values.inn,
              kpp: values.kpp,
              ogrn: values.ogrn,
              sroFullName: values.sroFullName,
              sroShortName: values.sroShortName,
              sroOgrn: values.sroOgrn,
              sroInn: values.sroInn,
              addressLegal: values.addressLegal,
              phone: values.phone,
              email: values.email,
              updatedAt,
            },
          });
      };

      const upsertPerson = async (role: ObjectPersonRole, person: PersonDto) => {
        const values: InsertObjectResponsiblePerson = {
          objectId,
          role,
          personName: person.personName ?? "",
          position: person.position ?? null,
          basisText: person.basisText ?? null,
          lineText: person.lineText ?? null,
          signText: person.signText ?? null,
        };
        const updatedAt = new Date();

        await tx
          .insert(objectResponsiblePersons)
          .values(values)
          .onConflictDoUpdate({
            target: [objectResponsiblePersons.objectId, objectResponsiblePersons.role],
            set: {
              personName: values.personName,
              position: values.position,
              basisText: values.basisText,
              lineText: values.lineText,
              signText: values.signText,
              updatedAt,
            },
          });
      };

      await upsertParty("customer", data.parties.customer);
      await upsertParty("builder", data.parties.builder);
      await upsertParty("designer", data.parties.designer);

      await upsertPerson("developer_rep", data.persons.developer_rep);
      await upsertPerson("contractor_rep", data.persons.contractor_rep);
      await upsertPerson("supervisor_rep", data.persons.supervisor_rep);
      await upsertPerson("rep_customer_control", data.persons.rep_customer_control);
      await upsertPerson("rep_builder", data.persons.rep_builder);
      await upsertPerson("rep_builder_control", data.persons.rep_builder_control);
      await upsertPerson("rep_designer", data.persons.rep_designer);
      await upsertPerson("rep_work_performer", data.persons.rep_work_performer);

      return await this.getObjectSourceData(objectId);
    });
  }

  async getWorks(): Promise<Work[]> {
    return await db.select().from(works).orderBy(works.code);
  }

  async createWork(work: InsertWork): Promise<Work> {
    const [newWork] = await db.insert(works).values(work).returning();
    return newWork;
  }

  async getWorkByCode(code: string): Promise<Work | undefined> {
    const [work] = await db.select().from(works).where(eq(works.code, code));
    return work;
  }

  async getWorksByIds(ids: number[]): Promise<Work[]> {
    if (ids.length === 0) return [];
    return await db.select().from(works).where(inArray(works.id, ids));
  }

  async clearWorks(): Promise<void> {
    await db.delete(works);
  }

  async importWorks(
    items: InsertWork[],
    mode: "merge" | "replace"
  ): Promise<{ created: number; updated: number }> {
    return await db.transaction(async (tx) => {
      if (mode === "replace") {
        await tx.delete(works);
      }

      const codes = Array.from(
        new Set(
          items
            .map((i) => String(i.code || "").trim())
            .filter((c) => c.length > 0)
        )
      );

      const existing =
        codes.length === 0
          ? []
          : await tx
              .select({ code: works.code })
              .from(works)
              .where(inArray(works.code, codes));

      const existingSet = new Set(existing.map((e) => e.code));

      let created = 0;
      let updated = 0;

      for (const item of items) {
        const code = String(item.code || "").trim();
        if (!code) continue;

        const values: InsertWork = {
          ...item,
          code,
        };

        if (existingSet.has(code)) {
          await tx
            .update(works)
            .set({
              description: values.description,
              unit: values.unit,
              quantityTotal: values.quantityTotal ?? null,
              synonyms: values.synonyms ?? null,
            })
            .where(eq(works.code, code));
          updated++;
        } else {
          await tx.insert(works).values(values);
          existingSet.add(code);
          created++;
        }
      }

      return { created, updated };
    });
  }

  // Estimates (Сметы / ЛСР)
  async getEstimates(): Promise<Estimate[]> {
    return await db.select().from(estimates).orderBy(desc(estimates.createdAt));
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    const [e] = await db.select().from(estimates).where(eq(estimates.id, id));
    return e;
  }

  async getEstimateSections(estimateId: number): Promise<EstimateSection[]> {
    return await db
      .select()
      .from(estimateSections)
      .where(eq(estimateSections.estimateId, estimateId))
      .orderBy(asc(estimateSections.orderIndex));
  }

  async getEstimatePositions(estimateId: number): Promise<EstimatePosition[]> {
    return await db
      .select()
      .from(estimatePositions)
      .where(eq(estimatePositions.estimateId, estimateId))
      .orderBy(asc(estimatePositions.orderIndex));
  }

  async getPositionResources(positionIds: number[]): Promise<PositionResource[]> {
    if (positionIds.length === 0) return [];
    return await db
      .select()
      .from(positionResources)
      .where(inArray(positionResources.positionId, positionIds))
      .orderBy(asc(positionResources.orderIndex));
  }

  async getEstimateWithDetails(
    estimateId: number
  ): Promise<
    | {
        estimate: Estimate;
        sections: Array<
          EstimateSection & { positions: Array<EstimatePosition & { resources: PositionResource[] }> }
        >;
      }
    | undefined
  > {
    const estimate = await this.getEstimate(estimateId);
    if (!estimate) return undefined;

    const [sections, positions] = await Promise.all([
      this.getEstimateSections(estimateId),
      this.getEstimatePositions(estimateId),
    ]);

    const positionIds = positions.map((p) => p.id);
    const resources = await this.getPositionResources(positionIds);

    const resourcesByPositionId = new Map<number, PositionResource[]>();
    for (const r of resources) {
      const list = resourcesByPositionId.get(r.positionId) ?? [];
      list.push(r);
      resourcesByPositionId.set(r.positionId, list);
    }

    const positionsBySectionId = new Map<number | null, Array<EstimatePosition & { resources: PositionResource[] }>>();
    for (const p of positions) {
      const sid = (p.sectionId ?? null) as number | null;
      const list = positionsBySectionId.get(sid) ?? [];
      list.push({ ...p, resources: resourcesByPositionId.get(p.id) ?? [] });
      positionsBySectionId.set(sid, list);
    }

    const hydratedSections = sections.map((s) => ({
      ...s,
      positions: positionsBySectionId.get(s.id) ?? [],
    }));

    // Some files may have positions outside a "Раздел"
    const unsectioned = positionsBySectionId.get(null);
    if (unsectioned && unsectioned.length > 0) {
      hydratedSections.unshift({
        id: 0,
        estimateId,
        number: "0",
        title: "Без раздела",
        orderIndex: -1,
        positions: unsectioned,
      } as any);
    }

    return { estimate, sections: hydratedSections };
  }

  async importEstimate(payload: {
    estimate: InsertEstimate;
    sections: Array<Omit<InsertEstimateSection, "estimateId">>;
    positions: Array<Omit<InsertEstimatePosition, "estimateId" | "sectionId"> & { sectionNumber?: string | null }>;
    resources: Array<Omit<InsertPositionResource, "positionId"> & { positionLineNo: string }>;
  }): Promise<{ estimateId: number; sections: number; positions: number; resources: number }> {
    const { estimate, sections, positions, resources } = payload;

    return await db.transaction(async (tx) => {
      const [createdEstimate] = await tx.insert(estimates).values(estimate).returning();

      const sectionIdByNumber = new Map<string, number>();
      let sectionCount = 0;
      for (const s of sections) {
        const [created] = await tx
          .insert(estimateSections)
          .values({ ...s, estimateId: createdEstimate.id })
          .returning();
        sectionIdByNumber.set(created.number, created.id);
        sectionCount++;
      }

      const positionIdByLineNo = new Map<string, number>();
      let positionCount = 0;
      for (const p of positions) {
        const sectionId =
          p.sectionNumber && sectionIdByNumber.has(p.sectionNumber) ? sectionIdByNumber.get(p.sectionNumber)! : null;

        const values: InsertEstimatePosition = {
          ...p,
          estimateId: createdEstimate.id,
          sectionId,
        } as any;
        delete (values as any).sectionNumber;

        const [created] = await tx.insert(estimatePositions).values(values).returning();
        positionIdByLineNo.set(created.lineNo, created.id);
        positionCount++;
      }

      let resourceCount = 0;
      for (const r of resources) {
        const positionId = positionIdByLineNo.get(r.positionLineNo);
        if (!positionId) continue;

        const values: InsertPositionResource = {
          ...r,
          positionId,
        } as any;
        delete (values as any).positionLineNo;

        await tx.insert(positionResources).values(values);
        resourceCount++;
      }

      return {
        estimateId: createdEstimate.id,
        sections: sectionCount,
        positions: positionCount,
        resources: resourceCount,
      };
    });
  }

  async deleteEstimate(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: estimates.id }).from(estimates).where(eq(estimates.id, id));
      if (!existing) return false;

      const positions = await tx
        .select({ id: estimatePositions.id })
        .from(estimatePositions)
        .where(eq(estimatePositions.estimateId, id));
      const positionIds = positions.map((p) => p.id);

      if (positionIds.length > 0) {
        await tx.delete(positionResources).where(inArray(positionResources.positionId, positionIds));
      }
      await tx.delete(estimatePositions).where(eq(estimatePositions.estimateId, id));
      await tx.delete(estimateSections).where(eq(estimateSections.estimateId, id));
      await tx.delete(estimates).where(eq(estimates.id, id));

      return true;
    });
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateMessageNormalized(id: number, normalizedData: any): Promise<Message> {
    const [updated] = await db.update(messages)
      .set({ 
        normalizedData, 
        isProcessed: true 
      })
      .where(eq(messages.id, id))
      .returning();
    return updated;
  }

  async getActs(): Promise<Act[]> {
    return await db.select().from(acts).orderBy(desc(acts.createdAt));
  }

  async getAct(id: number): Promise<Act | undefined> {
    const [act] = await db.select().from(acts).where(eq(acts.id, id));
    return act;
  }

  async getActByNumber(actNumber: number): Promise<Act | undefined> {
    const [act] = await db.select().from(acts).where(eq(acts.actNumber, actNumber as any));
    return act;
  }

  async createAct(act: InsertAct): Promise<Act> {
    const defaultObject = await this.getOrCreateDefaultObject();
    const objectId = (act as any).objectId ?? defaultObject.id;
    const [newAct] = await db
      .insert(acts)
      .values({ ...(act as any), objectId })
      .returning();
    return newAct;
  }

  async upsertActByNumber(data: {
    actNumber: number;
    dateStart: string | null;
    dateEnd: string | null;
    location?: string | null;
    status?: string | null;
    worksData?: Array<{ workId: number; quantity: number; description: string }> | null;
  }): Promise<{ act: Act; created: boolean }> {
    const existing = await this.getActByNumber(data.actNumber);
    const defaultObject = await this.getOrCreateDefaultObject();

    if (existing) {
      const nextStatus =
        existing.status === "signed"
          ? existing.status
          : ((data.status ?? existing.status ?? null) as any);
      const [updated] = await db
        .update(acts)
        .set({
          // Backfill objectId for legacy/older records if missing.
          objectId: ((existing as any).objectId ?? defaultObject.id) as any,
          actNumber: data.actNumber as any,
          dateStart: (data.dateStart ?? null) as any,
          dateEnd: (data.dateEnd ?? null) as any,
          location: (data.location ?? existing.location ?? null) as any,
          status: nextStatus,
          worksData: (data.worksData ?? existing.worksData ?? null) as any,
        })
        .where(eq(acts.id, existing.id))
        .returning();
      return { act: updated, created: false };
    }

    const [created] = await db
      .insert(acts)
      .values({
        objectId: defaultObject.id,
        actNumber: data.actNumber as any,
        dateStart: (data.dateStart ?? null) as any,
        dateEnd: (data.dateEnd ?? null) as any,
        location: (data.location ?? null) as any,
        status: (data.status ?? "draft") as any,
        worksData: (data.worksData ?? []) as any,
      })
      .returning();

    return { act: created, created: true };
  }

  async getAttachments(actId: number): Promise<Attachment[]> {
    return await db.select().from(attachments).where(eq(attachments.actId, actId));
  }

  // Act Templates
  async getActTemplates(): Promise<ActTemplate[]> {
    return await db.select().from(actTemplates).orderBy(actTemplates.code);
  }

  async getActTemplate(id: number): Promise<ActTemplate | undefined> {
    const [template] = await db.select().from(actTemplates).where(eq(actTemplates.id, id));
    return template;
  }

  async getActTemplateByTemplateId(templateId: string): Promise<ActTemplate | undefined> {
    const [template] = await db.select().from(actTemplates).where(eq(actTemplates.templateId, templateId));
    return template;
  }

  async createActTemplate(template: InsertActTemplate): Promise<ActTemplate> {
    const [newTemplate] = await db.insert(actTemplates).values(template).returning();
    return newTemplate;
  }

  async seedActTemplates(templates: InsertActTemplate[]): Promise<void> {
    for (const template of templates) {
      const existing = await this.getActTemplateByTemplateId(template.templateId);
      if (!existing) {
        await this.createActTemplate(template);
      }
    }
  }

  // Act Template Selections
  async getActTemplateSelections(actId: number): Promise<ActTemplateSelection[]> {
    return await db.select().from(actTemplateSelections).where(eq(actTemplateSelections.actId, actId));
  }

  async createActTemplateSelection(selection: InsertActTemplateSelection): Promise<ActTemplateSelection> {
    const [newSelection] = await db.insert(actTemplateSelections).values(selection).returning();
    return newSelection;
  }

  async updateActTemplateSelectionStatus(id: number, status: string, pdfUrl?: string): Promise<ActTemplateSelection> {
    const updateData: any = { status };
    if (pdfUrl) {
      updateData.pdfUrl = pdfUrl;
      updateData.generatedAt = new Date();
    }
    const [updated] = await db.update(actTemplateSelections)
      .set(updateData)
      .where(eq(actTemplateSelections.id, id))
      .returning();
    return updated;
  }

  // Schedules (Gantt)
  async getOrCreateDefaultSchedule(): Promise<Schedule> {
    const defaultTitle = "График работ";
    const [existing] = await db.select().from(schedules).where(eq(schedules.title, defaultTitle));
    if (existing) return existing;

    const [created] = await db
      .insert(schedules)
      .values({ title: defaultTitle, calendarStart: null })
      .returning();
    return created;
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [created] = await db.insert(schedules).values(schedule).returning();
    return created;
  }

  async getScheduleWithTasks(id: number): Promise<(Schedule & { tasks: ScheduleTask[] }) | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    if (!schedule) return undefined;

    const tasks = await db
      .select()
      .from(scheduleTasks)
      .where(eq(scheduleTasks.scheduleId, id))
      .orderBy(asc(scheduleTasks.orderIndex));

    return { ...schedule, tasks };
  }

  async bootstrapScheduleTasksFromWorks(params: {
    scheduleId: number;
    workIds?: number[];
    defaultStartDate: string;
    defaultDurationDays: number;
  }): Promise<{ scheduleId: number; created: number; skipped: number }> {
    const { scheduleId, workIds, defaultStartDate, defaultDurationDays } = params;

    return await db.transaction(async (tx) => {
      const [schedule] = await tx.select().from(schedules).where(eq(schedules.id, scheduleId));
      if (!schedule) {
        // Let the route translate this to 404.
        throw new Error("SCHEDULE_NOT_FOUND");
      }

      const worksList =
        workIds && workIds.length > 0
          ? await tx
              .select()
              .from(works)
              .where(inArray(works.id, workIds))
              .orderBy(works.code)
          : await tx.select().from(works).orderBy(works.code);

      const existingTasks = await tx
        .select({ workId: scheduleTasks.workId, orderIndex: scheduleTasks.orderIndex })
        .from(scheduleTasks)
        .where(eq(scheduleTasks.scheduleId, scheduleId));

      const existingWorkIds = new Set(existingTasks.map((t) => t.workId));
      const maxOrderIndex =
        existingTasks.length === 0
          ? -1
          : Math.max(...existingTasks.map((t) => Number(t.orderIndex ?? 0)));

      let nextOrderIndex = maxOrderIndex + 1;
      let created = 0;
      let skipped = 0;

      for (const w of worksList) {
        if (existingWorkIds.has(w.id)) {
          skipped++;
          continue;
        }

        await tx.insert(scheduleTasks).values({
          scheduleId,
          workId: w.id,
          titleOverride: null,
          startDate: defaultStartDate,
          durationDays: defaultDurationDays,
          orderIndex: nextOrderIndex++,
        });
        created++;
        existingWorkIds.add(w.id);
      }

      return { scheduleId, created, skipped };
    });
  }

  async patchScheduleTask(
    id: number,
    patch: Partial<Pick<ScheduleTask, "titleOverride" | "startDate" | "durationDays" | "orderIndex" | "actNumber">>
  ): Promise<ScheduleTask | undefined> {
    const updateData: Partial<typeof scheduleTasks.$inferInsert> = {};

    if ("titleOverride" in patch) updateData.titleOverride = patch.titleOverride ?? null;
    if (patch.startDate !== undefined) updateData.startDate = patch.startDate as any;
    if (patch.durationDays !== undefined) updateData.durationDays = patch.durationDays as any;
    if (patch.orderIndex !== undefined) updateData.orderIndex = patch.orderIndex as any;
    if ("actNumber" in patch) updateData.actNumber = (patch.actNumber ?? null) as any;

    if (Object.keys(updateData).length === 0) return undefined;

    const [updated] = await db.update(scheduleTasks).set(updateData).where(eq(scheduleTasks.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
