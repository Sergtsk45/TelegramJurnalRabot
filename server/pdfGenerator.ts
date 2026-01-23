import type { TDocumentDefinitions } from "pdfmake/interfaces";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake/js/Printer.js").default;

const fontsDir = path.join(process.cwd(), "server/fonts");
const fontDescriptors = {
  Roboto: {
    normal: path.join(fontsDir, "Roboto-Regular.ttf"),
    bold: path.join(fontsDir, "Roboto-Medium.ttf"),
    italics: path.join(fontsDir, "Roboto-Italic.ttf"),
    bolditalics: path.join(fontsDir, "Roboto-MediumItalic.ttf"),
  },
};

const printer = new PdfPrinter(fontDescriptors);

export interface ActData {
  actNumber: string;
  actDate: string;
  city: string;
  objectName: string;
  objectAddress: string;
  developerRepName: string;
  developerRepPosition: string;
  contractorRepName: string;
  contractorRepPosition: string;
  supervisorRepName: string;
  supervisorRepPosition: string;
  workDescription: string;
  projectDocumentation: string;
  dateStart: string;
  dateEnd: string;
  qualityDocuments: string;
  materials?: Array<{
    name: string;
    unit: string;
    quantity: string;
    qualityDoc: string;
  }>;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export async function generateAosrPdf(data: ActData): Promise<Buffer> {
  const docDefinition = loadAosrTemplateDefinition();
  injectMaterialsTableBody(docDefinition, data);
  replacePlaceholdersDeep(docDefinition, buildAosrPlaceholderValues(data));

  try {
    const pdfDoc = await printer.createPdfKitDocument(docDefinition);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", (err: Error) => reject(err));
      pdfDoc.end();
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    throw err;
  }
}

const AOSR_TEMPLATE_PATH = path.join(process.cwd(), "server/templates/aosr/aosr-template.json");
const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}/g;

let cachedAosrTemplateRaw: any | null = null;

function deepCloneJson<T>(value: T): T {
  const sc = (globalThis as any).structuredClone as ((v: any) => any) | undefined;
  if (typeof sc === "function") return sc(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadAosrTemplateRaw(): any {
  if (cachedAosrTemplateRaw) return cachedAosrTemplateRaw;
  const raw = fs.readFileSync(AOSR_TEMPLATE_PATH, "utf-8");
  cachedAosrTemplateRaw = JSON.parse(raw);
  return cachedAosrTemplateRaw;
}

function loadAosrTemplateDefinition(): TDocumentDefinitions {
  const raw = loadAosrTemplateRaw();
  const { placeholders: _placeholders, ...docDefinition } = raw ?? {};
  return deepCloneJson(docDefinition) as TDocumentDefinitions;
}

function buildAosrPlaceholderValues(data: ActData): Record<string, string> {
  return {
    actNumber: data.actNumber ?? "",
    actDate: formatDate(data.actDate),
    city: data.city ?? "",
    objectName: data.objectName ?? "",
    objectAddress: data.objectAddress ?? "",
    developerRepName: data.developerRepName ?? "",
    developerRepPosition: data.developerRepPosition ?? "",
    contractorRepName: data.contractorRepName ?? "",
    contractorRepPosition: data.contractorRepPosition ?? "",
    supervisorRepName: data.supervisorRepName ?? "",
    supervisorRepPosition: data.supervisorRepPosition ?? "",
    workDescription: data.workDescription ?? "",
    projectDocumentation: data.projectDocumentation ?? "",
    dateStart: formatDate(data.dateStart),
    dateEnd: formatDate(data.dateEnd),
    qualityDocuments: data.qualityDocuments ?? "",
  };
}

function replacePlaceholdersInString(input: string, values: Record<string, string>): string {
  return input.replace(PLACEHOLDER_RE, (_m, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key] ?? "";
    console.warn(`[AOSR] Missing placeholder value: ${key}`);
    return "";
  });
}

function replacePlaceholdersDeep(node: any, values: Record<string, string>): any {
  if (typeof node === "string") return replacePlaceholdersInString(node, values);
  if (!node) return node;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = replacePlaceholdersDeep(node[i], values);
    }
    return node;
  }
  if (typeof node === "object") {
    for (const key of Object.keys(node)) {
      node[key] = replacePlaceholdersDeep(node[key], values);
    }
    return node;
  }
  return node;
}

function buildMaterialsRows(data: ActData): any[][] {
  if (data.materials && data.materials.length > 0) {
    return data.materials.map((m) => [
      { text: m.name ?? "", style: "tableCell" },
      { text: m.unit ?? "", style: "tableCell" },
      { text: m.quantity ?? "", style: "tableCell" },
      { text: m.qualityDoc ?? "", style: "tableCell" },
    ]);
  }

  return [
    [
      { text: "Согласно проектной документации", style: "tableCell", colSpan: 4 },
      {},
      {},
      {},
    ],
  ];
}

function findMaterialsTableNode(node: any): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findMaterialsTableNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const table = (node as any).table;
    if (table && Array.isArray(table.body) && table.body.length > 0 && Array.isArray(table.body[0])) {
      const firstCell = table.body[0]?.[0];
      const firstText = typeof firstCell?.text === "string" ? firstCell.text : undefined;
      if (firstText === "Наименование") return node;
    }

    for (const key of Object.keys(node)) {
      const found = findMaterialsTableNode((node as any)[key]);
      if (found) return found;
    }
  }
  return null;
}

function injectMaterialsTableBody(docDefinition: any, data: ActData): void {
  const tableNode = findMaterialsTableNode(docDefinition?.content);
  if (!tableNode?.table?.body?.[0]) {
    throw new Error("[AOSR] Materials table not found in template (expected table with header 'Наименование')");
  }

  const headerRow = tableNode.table.body[0];
  tableNode.table.body = [headerRow, ...buildMaterialsRows(data)];
}

export function loadTemplateCatalog(): any {
  const catalogPath = path.join(process.cwd(), "server/templates/aosr/templates-catalog.json");
  const data = fs.readFileSync(catalogPath, "utf-8");
  return JSON.parse(data);
}
