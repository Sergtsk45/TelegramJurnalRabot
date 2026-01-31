import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Construction Objects (Объекты строительства)
export const objects = pgTable("objects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // e.g. "ЖК Северный, корпус 2"
  address: text("address"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const objectParties = pgTable(
  "object_parties",
  {
    id: serial("id").primaryKey(),
    objectId: integer("object_id")
      .notNull()
      .references(() => objects.id),
    role: text("role").notNull(), // customer | builder | designer (MVP)

    fullName: text("full_name").notNull(),
    shortName: text("short_name"),
    inn: text("inn"),
    kpp: text("kpp"),
    ogrn: text("ogrn"),
    // SRO (Саморегулируемая организация) details
    sroFullName: text("sro_full_name"),
    sroShortName: text("sro_short_name"),
    sroOgrn: text("sro_ogrn"),
    sroInn: text("sro_inn"),
    addressLegal: text("address_legal"),
    phone: text("phone"),
    email: text("email"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    objectRoleUnique: uniqueIndex("object_parties_object_role_uq").on(t.objectId, t.role),
  })
);

export const objectResponsiblePersons = pgTable(
  "object_responsible_persons",
  {
    id: serial("id").primaryKey(),
    objectId: integer("object_id")
      .notNull()
      .references(() => objects.id),
    role: text("role").notNull(),

    personName: text("person_name").notNull(),
    position: text("position"),
    basisText: text("basis_text"),
    lineText: text("line_text"),
    signText: text("sign_text"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    objectRoleUnique: uniqueIndex("object_responsible_persons_object_role_uq").on(t.objectId, t.role),
  })
);

// Bill of Quantities (Ведомость объемов работ)
export const works = pgTable("works", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(), // Code from BoQ
  description: text("description").notNull(), // Work description
  unit: text("unit").notNull(), // Unit of measurement
  quantityTotal: numeric("quantity_total", { precision: 20, scale: 4 }), // Total planned quantity (numeric for floats)
  synonyms: jsonb("synonyms").$type<string[]>(), // Normalized synonyms for matching
});

// Estimates (Сметы / ЛСР)
export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  code: text("code"), // e.g. "ЛСР-02-01-03"
  name: text("name").notNull(), // e.g. "Узлы учета и управления"

  objectName: text("object_name"),
  region: text("region"),
  pricingQuarter: text("pricing_quarter"), // e.g. "II квартал 2024"

  totalCost: numeric("total_cost", { precision: 20, scale: 4 }),
  totalConstruction: numeric("total_construction", { precision: 20, scale: 4 }),
  totalInstallation: numeric("total_installation", { precision: 20, scale: 4 }),
  totalEquipment: numeric("total_equipment", { precision: 20, scale: 4 }),
  totalOther: numeric("total_other", { precision: 20, scale: 4 }),

  createdAt: timestamp("created_at").defaultNow(),
});

export const estimateSections = pgTable(
  "estimate_sections",
  {
    id: serial("id").primaryKey(),
    estimateId: integer("estimate_id")
      .notNull()
      .references(() => estimates.id),
    number: text("number").notNull(), // e.g. "1"
    title: text("title").notNull(), // e.g. "Узел управления (подвал)"
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => ({
    estimateIdIdx: index("estimate_sections_estimate_id_idx").on(t.estimateId),
    estimateSectionUnique: uniqueIndex("estimate_sections_estimate_number_uq").on(t.estimateId, t.number),
  })
);

export const estimatePositions = pgTable(
  "estimate_positions",
  {
    id: serial("id").primaryKey(),
    estimateId: integer("estimate_id")
      .notNull()
      .references(() => estimates.id),
    sectionId: integer("section_id").references(() => estimateSections.id),

    lineNo: text("line_no").notNull(), // "1", "70.1"
    code: text("code"), // ГЭСН/ФСБЦ/и т.п. (может отсутствовать у некоторых строк)
    name: text("name").notNull(),
    unit: text("unit"),
    quantity: numeric("quantity", { precision: 20, scale: 4 }),

    baseCostPerUnit: numeric("base_cost_per_unit", { precision: 20, scale: 4 }),
    indexValue: numeric("index_value", { precision: 20, scale: 6 }),
    currentCostPerUnit: numeric("current_cost_per_unit", { precision: 20, scale: 4 }),
    totalCurrentCost: numeric("total_current_cost", { precision: 20, scale: 4 }),

    notes: text("notes"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => ({
    estimateIdIdx: index("estimate_positions_estimate_id_idx").on(t.estimateId),
    sectionIdIdx: index("estimate_positions_section_id_idx").on(t.sectionId),
    estimateLineNoIdx: index("estimate_positions_estimate_line_no_idx").on(t.estimateId, t.lineNo),
  })
);

export const positionResources = pgTable(
  "position_resources",
  {
    id: serial("id").primaryKey(),
    positionId: integer("position_id")
      .notNull()
      .references(() => estimatePositions.id),

    resourceCode: text("resource_code"),
    resourceType: text("resource_type"), // ОТ, ЭМ, М, Н и т.п.
    name: text("name").notNull(),
    unit: text("unit"),
    quantity: numeric("quantity", { precision: 20, scale: 4 }),
    quantityTotal: numeric("quantity_total", { precision: 20, scale: 4 }),

    baseCostPerUnit: numeric("base_cost_per_unit", { precision: 20, scale: 4 }),
    currentCostPerUnit: numeric("current_cost_per_unit", { precision: 20, scale: 4 }),
    totalCurrentCost: numeric("total_current_cost", { precision: 20, scale: 4 }),

    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => ({
    positionIdIdx: index("position_resources_position_id_idx").on(t.positionId),
  })
);

// Messages (Raw and Normalized)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Telegram User ID
  messageRaw: text("message_raw").notNull(), // Original text
  // Normalized data extracted from LLM
  normalizedData: jsonb("normalized_data").$type<{
    workCode?: string;
    workDescription?: string;
    quantity?: number;
    unit?: string;
    date?: string;
    location?: string;
    workConditions?: string;
    materials?: string[];
    representative?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  isProcessed: boolean("is_processed").default(false),
});

// Acts (AOSR)
export const acts = pgTable("acts", {
  id: serial("id").primaryKey(),
  objectId: integer("object_id").references(() => objects.id),
  // Global act number (business identifier). Nullable for legacy records.
  actNumber: integer("act_number").unique(),
  dateStart: date("date_start"),
  dateEnd: date("date_end"),
  location: text("location"),
  status: text("status").default("draft"), // draft, generated, signed
  // Aggregated works for this act
  worksData: jsonb("works_data").$type<{
    workId: number;
    quantity: number;
    description: string;
  }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attachments (Documents)
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  actId: integer("act_id").references(() => acts.id),
  url: text("url").notNull(),
  name: text("name").notNull(),
  type: text("type"), // 'certificate', 'passport', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Act Templates catalog
export const actTemplates = pgTable("act_templates", {
  id: serial("id").primaryKey(),
  templateId: text("template_id").notNull().unique(), // e.g., "foundation-prep"
  code: text("code").notNull(), // e.g., "AOSR-01"
  category: text("category").notNull(), // e.g., "general", "roofing"
  title: text("title").notNull(), // Russian title
  titleEn: text("title_en"), // English title
  description: text("description"),
  normativeRef: text("normative_ref"), // Reference to normative document
  isActive: boolean("is_active").default(true),
});

// Selected templates for act generation
export const actTemplateSelections = pgTable("act_template_selections", {
  id: serial("id").primaryKey(),
  actId: integer("act_id").references(() => acts.id),
  templateId: integer("template_id").references(() => actTemplates.id),
  status: text("status").default("pending"), // pending, generated, error
  pdfUrl: text("pdf_url"),
  generatedAt: timestamp("generated_at"),
});

// Schedules (Gantt)
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  calendarStart: date("calendar_start"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scheduleTasks = pgTable(
  "schedule_tasks",
  {
    id: serial("id").primaryKey(),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => schedules.id),
    workId: integer("work_id")
      .notNull()
      .references(() => works.id),
    // Act number this task belongs to (global). Nullable = not assigned to an act.
    actNumber: integer("act_number"),
    titleOverride: text("title_override"),
    startDate: date("start_date").notNull(),
    durationDays: integer("duration_days").notNull(),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    scheduleIdIdx: index("schedule_tasks_schedule_id_idx").on(t.scheduleId),
    workIdIdx: index("schedule_tasks_work_id_idx").on(t.workId),
    scheduleOrderIdx: index("schedule_tasks_schedule_order_idx").on(t.scheduleId, t.orderIndex),
    scheduleActNumberIdx: index("schedule_tasks_schedule_act_number_idx").on(t.scheduleId, t.actNumber),
  })
);


// === SCHEMAS ===

export const insertWorkSchema = createInsertSchema(works).omit({ id: true });
export const insertEstimateSchema = createInsertSchema(estimates).omit({ id: true, createdAt: true });
export const insertEstimateSectionSchema = createInsertSchema(estimateSections).omit({ id: true });
export const insertEstimatePositionSchema = createInsertSchema(estimatePositions).omit({ id: true });
export const insertPositionResourceSchema = createInsertSchema(positionResources).omit({ id: true });
export const insertObjectSchema = createInsertSchema(objects).omit({ id: true, createdAt: true });
export const insertObjectPartySchema = createInsertSchema(objectParties).omit({ id: true, createdAt: true, updatedAt: true });
export const insertObjectResponsiblePersonSchema = createInsertSchema(objectResponsiblePersons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isProcessed: true, normalizedData: true });
export const insertActSchema = createInsertSchema(acts).omit({ id: true, createdAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
export const insertActTemplateSchema = createInsertSchema(actTemplates).omit({ id: true });
export const insertActTemplateSelectionSchema = createInsertSchema(actTemplateSelections).omit({ id: true, generatedAt: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });
export const insertScheduleTaskSchema = createInsertSchema(scheduleTasks).omit({ id: true, createdAt: true });

// === EXPLICIT API TYPES ===

export type Work = typeof works.$inferSelect;
export type InsertWork = z.infer<typeof insertWorkSchema>;

export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type EstimateSection = typeof estimateSections.$inferSelect;
export type InsertEstimateSection = z.infer<typeof insertEstimateSectionSchema>;
export type EstimatePosition = typeof estimatePositions.$inferSelect;
export type InsertEstimatePosition = z.infer<typeof insertEstimatePositionSchema>;
export type PositionResource = typeof positionResources.$inferSelect;
export type InsertPositionResource = z.infer<typeof insertPositionResourceSchema>;

export type Object = typeof objects.$inferSelect;
export type InsertObject = z.infer<typeof insertObjectSchema>;

export type ObjectParty = typeof objectParties.$inferSelect;
export type InsertObjectParty = z.infer<typeof insertObjectPartySchema>;

export type ObjectResponsiblePerson = typeof objectResponsiblePersons.$inferSelect;
export type InsertObjectResponsiblePerson = z.infer<typeof insertObjectResponsiblePersonSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Act = typeof acts.$inferSelect;
export type InsertAct = z.infer<typeof insertActSchema>;

export type Attachment = typeof attachments.$inferSelect;

export type ActTemplate = typeof actTemplates.$inferSelect;
export type InsertActTemplate = z.infer<typeof insertActTemplateSchema>;

export type ActTemplateSelection = typeof actTemplateSelections.$inferSelect;
export type InsertActTemplateSelection = z.infer<typeof insertActTemplateSelectionSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type ScheduleTask = typeof scheduleTasks.$inferSelect;
export type InsertScheduleTask = z.infer<typeof insertScheduleTaskSchema>;

// Request/Response Types
export type CreateMessageRequest = {
  userId: string;
  messageRaw: string;
};

export type GenerateActRequest = {
  dateStart: string;
  dateEnd: string;
};

export type WorkStatsResponse = {
  totalWorks: number;
  completedWorks: number;
};
