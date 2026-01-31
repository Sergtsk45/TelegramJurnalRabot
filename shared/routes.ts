import { z } from 'zod';
import {
  objects,
  insertWorkSchema,
  insertEstimateSchema,
  insertEstimateSectionSchema,
  insertEstimatePositionSchema,
  insertPositionResourceSchema,
  insertMessageSchema,
  insertActSchema,
  insertScheduleSchema,
  schedules,
  scheduleTasks,
  works,
  estimates,
  estimateSections,
  estimatePositions,
  positionResources,
  messages,
  acts,
  attachments
} from './schema';

export const partyDtoSchema = z.object({
  fullName: z.string(),
  shortName: z.string().optional(),
  inn: z.string().optional(),
  kpp: z.string().optional(),
  ogrn: z.string().optional(),
  sroFullName: z.string().optional(),
  sroShortName: z.string().optional(),
  sroOgrn: z.string().optional(),
  sroInn: z.string().optional(),
  addressLegal: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const personDtoSchema = z.object({
  personName: z.string(),
  position: z.string().optional(),
  basisText: z.string().optional(),
  lineText: z.string().optional(),
  signText: z.string().optional(),
});

export const sourceDataDtoSchema = z.object({
  object: z.object({
    title: z.string(),
    address: z.string(),
    city: z.string(),
  }),
  parties: z.object({
    customer: partyDtoSchema,
    builder: partyDtoSchema,
    designer: partyDtoSchema,
  }),
  persons: z.object({
    developer_rep: personDtoSchema,
    contractor_rep: personDtoSchema,
    supervisor_rep: personDtoSchema,
    rep_customer_control: personDtoSchema,
    rep_builder: personDtoSchema,
    rep_builder_control: personDtoSchema,
    rep_designer: personDtoSchema,
    rep_work_performer: personDtoSchema,
  }),
});

export const api = {
  object: {
    current: {
      method: 'GET' as const,
      path: '/api/object/current',
      responses: {
        200: z.custom<typeof objects.$inferSelect>(),
      },
    },
    patchCurrent: {
      method: 'PATCH' as const,
      path: '/api/object/current',
      input: z
        .object({
          title: z.string().optional(),
          address: z.string().nullable().optional(),
          city: z.string().nullable().optional(),
        })
        .refine((v) => Object.keys(v).length > 0, { message: 'Empty patch' }),
      responses: {
        200: z.custom<typeof objects.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    getSourceData: {
      method: 'GET' as const,
      path: '/api/object/current/source-data',
      responses: {
        200: sourceDataDtoSchema,
        404: z.object({ message: z.string() }),
      },
    },
    putSourceData: {
      method: 'PUT' as const,
      path: '/api/object/current/source-data',
      input: sourceDataDtoSchema,
      responses: {
        200: sourceDataDtoSchema,
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  },
  works: {
    list: {
      method: 'GET' as const,
      path: '/api/works',
      responses: {
        200: z.array(z.custom<typeof works.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/works',
      input: insertWorkSchema,
      responses: {
        201: z.custom<typeof works.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    import: {
      method: 'POST' as const,
      path: '/api/works/import',
      input: z.object({
        mode: z.enum(['merge', 'replace']).optional(),
        items: z.array(insertWorkSchema),
      }),
      responses: {
        200: z.object({
          mode: z.enum(['merge', 'replace']),
          received: z.number(),
          created: z.number(),
          updated: z.number(),
        }),
        400: z.object({ message: z.string() }),
      },
    },
  },
  estimates: {
    list: {
      method: "GET" as const,
      path: "/api/estimates",
      responses: {
        200: z.array(z.custom<typeof estimates.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/estimates/:id",
      responses: {
        200: z.object({
          estimate: z.custom<typeof estimates.$inferSelect>(),
          // NOTE: keep flexible to allow iterative parser improvements without breaking clients
          sections: z.array(z.any()),
        }),
        404: z.object({ message: z.string() }),
      },
    },
    import: {
      method: "POST" as const,
      path: "/api/estimates/import",
      input: z.object({
        estimate: insertEstimateSchema.extend({
          // Allow null/undefined from parser
          code: z.string().nullable().optional(),
          objectName: z.string().nullable().optional(),
          region: z.string().nullable().optional(),
          pricingQuarter: z.string().nullable().optional(),
          totalCost: z.string().nullable().optional(),
          totalConstruction: z.string().nullable().optional(),
          totalInstallation: z.string().nullable().optional(),
          totalEquipment: z.string().nullable().optional(),
          totalOther: z.string().nullable().optional(),
        }),
        sections: z.array(
          insertEstimateSectionSchema
            .omit({ estimateId: true })
            .extend({ orderIndex: z.number().int().optional().default(0) })
        ),
        positions: z.array(
          insertEstimatePositionSchema
            .omit({ estimateId: true, sectionId: true })
            .extend({
              sectionNumber: z.string().nullable().optional(),
              code: z.string().nullable().optional(),
              unit: z.string().nullable().optional(),
              quantity: z.string().nullable().optional(),
              baseCostPerUnit: z.string().nullable().optional(),
              indexValue: z.string().nullable().optional(),
              currentCostPerUnit: z.string().nullable().optional(),
              totalCurrentCost: z.string().nullable().optional(),
              notes: z.string().nullable().optional(),
              orderIndex: z.number().int().optional().default(0),
            })
        ),
        resources: z.array(
          insertPositionResourceSchema
            .omit({ positionId: true })
            .extend({
              positionLineNo: z.string(),
              resourceCode: z.string().nullable().optional(),
              resourceType: z.string().nullable().optional(),
              unit: z.string().nullable().optional(),
              quantity: z.string().nullable().optional(),
              quantityTotal: z.string().nullable().optional(),
              baseCostPerUnit: z.string().nullable().optional(),
              currentCostPerUnit: z.string().nullable().optional(),
              totalCurrentCost: z.string().nullable().optional(),
              orderIndex: z.number().int().optional().default(0),
            }),
        ),
      }),
      responses: {
        200: z.object({
          estimateId: z.number(),
          sections: z.number(),
          positions: z.number(),
          resources: z.number(),
        }),
        400: z.object({ message: z.string() }),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/estimates/:id",
      responses: {
        204: z.any(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/messages',
      input: z.object({
        userId: z.string(),
        messageRaw: z.string(),
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    process: {
      method: 'POST' as const,
      path: '/api/messages/:id/process',
      responses: {
        200: z.custom<typeof messages.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  acts: {
    list: {
      method: 'GET' as const,
      path: '/api/acts',
      responses: {
        200: z.array(z.custom<typeof acts.$inferSelect>()),
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/acts/generate',
      input: z.object({
        dateStart: z.string(), // ISO Date
        dateEnd: z.string(),   // ISO Date
      }),
      responses: {
        201: z.custom<typeof acts.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/acts/:id',
      responses: {
        200: z.custom<typeof acts.$inferSelect & { attachments: typeof attachments.$inferSelect[] }>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  schedules: {
    default: {
      method: 'GET' as const,
      path: '/api/schedules/default',
      responses: {
        200: z.custom<typeof schedules.$inferSelect>(),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schedules',
      input: insertScheduleSchema,
      responses: {
        201: z.custom<typeof schedules.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/schedules/:id',
      responses: {
        200: z.custom<typeof schedules.$inferSelect & { tasks: typeof scheduleTasks.$inferSelect[] }>(),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
    bootstrapFromWorks: {
      method: 'POST' as const,
      path: '/api/schedules/:id/bootstrap-from-works',
      input: z.object({
        workIds: z.array(z.number().int().positive()).optional(),
        defaultStartDate: z.string().optional(), // YYYY-MM-DD
        defaultDurationDays: z.number().int().min(1).optional(),
      }),
      responses: {
        200: z.object({
          scheduleId: z.number(),
          created: z.number(),
          skipped: z.number(),
        }),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
    generateActs: {
      method: 'POST' as const,
      path: '/api/schedules/:id/generate-acts',
      input: z.object({}).optional(),
      responses: {
        200: z.object({
          scheduleId: z.number(),
          actNumbers: z.array(z.number().int().positive()),
          created: z.number(),
          updated: z.number(),
          skippedNoActNumber: z.number(),
        }),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  },
  scheduleTasks: {
    patch: {
      method: 'PATCH' as const,
      path: '/api/schedule-tasks/:id',
      input: z
        .object({
          titleOverride: z.string().nullable().optional(),
          startDate: z.string().optional(), // YYYY-MM-DD
          durationDays: z.number().int().min(1).optional(),
          orderIndex: z.number().int().min(0).optional(),
          actNumber: z.number().int().positive().nullable().optional(),
        })
        .refine((v) => Object.keys(v).length > 0, { message: 'Empty patch' }),
      responses: {
        200: z.custom<typeof scheduleTasks.$inferSelect>(),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type {
  Work,
  InsertWork,
  Estimate,
  InsertEstimate,
  EstimateSection,
  InsertEstimateSection,
  EstimatePosition,
  InsertEstimatePosition,
  PositionResource,
  InsertPositionResource,
  Message,
  InsertMessage,
  Act,
  InsertAct,
  Schedule,
  InsertSchedule,
  ScheduleTask,
  InsertScheduleTask,
  CreateMessageRequest,
  GenerateActRequest,
} from "./schema";

export type PartyDto = z.infer<typeof partyDtoSchema>;
export type PersonDto = z.infer<typeof personDtoSchema>;
export type SourceDataDto = z.infer<typeof sourceDataDtoSchema>;
