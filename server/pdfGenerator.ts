import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
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
  const materialsTableBody: any[][] = [
    [
      { text: "Наименование", bold: true, fillColor: "#eeeeee", fontSize: 9 },
      { text: "Ед. изм.", bold: true, fillColor: "#eeeeee", fontSize: 9 },
      { text: "Кол-во", bold: true, fillColor: "#eeeeee", fontSize: 9 },
      { text: "Документ о качестве", bold: true, fillColor: "#eeeeee", fontSize: 9 },
    ],
  ];

  if (data.materials && data.materials.length > 0) {
    data.materials.forEach((m) => {
      materialsTableBody.push([
        { text: m.name, fontSize: 9 },
        { text: m.unit, fontSize: 9 },
        { text: m.quantity, fontSize: 9 },
        { text: m.qualityDoc, fontSize: 9 },
      ]);
    });
  } else {
    materialsTableBody.push([
      { text: "Согласно проектной документации", fontSize: 9, colSpan: 4 },
      {},
      {},
      {},
    ]);
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
    },
    content: [
      {
        text: `АКТ ОСВИДЕТЕЛЬСТВОВАНИЯ СКРЫТЫХ РАБОТ № ${data.actNumber}`,
        fontSize: 12,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      {
        text: "(Приложение № 3 к РД 11-02-2006)",
        alignment: "center",
        fontSize: 8,
        margin: [0, 0, 0, 15],
      },
      {
        columns: [
          { width: "*", text: `г. ${data.city}` },
          { width: "auto", text: formatDate(data.actDate) },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        text: `Объект капитального строительства: ${data.objectName}`,
        margin: [0, 0, 0, 5],
      },
      {
        text: `Адрес объекта: ${data.objectAddress}`,
        margin: [0, 0, 0, 15],
      },
      {
        text: "Представитель застройщика (технического заказчика):",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: `${data.developerRepName}, ${data.developerRepPosition}`,
        margin: [0, 0, 0, 10],
      },
      {
        text: "Представитель лица, осуществляющего строительство:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: `${data.contractorRepName}, ${data.contractorRepPosition}`,
        margin: [0, 0, 0, 10],
      },
      {
        text: "Представитель лица, осуществляющего строительный контроль:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: `${data.supervisorRepName}, ${data.supervisorRepPosition}`,
        margin: [0, 0, 0, 15],
      },
      {
        text: "произвели осмотр выполненных работ и составили настоящий акт о нижеследующем:",
        margin: [0, 0, 0, 10],
      },
      {
        text: "1. К освидетельствованию предъявлены следующие скрытые работы:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: data.workDescription,
        margin: [0, 0, 0, 10],
      },
      {
        text: "2. Работы выполнены по проектной документации:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: data.projectDocumentation,
        margin: [0, 0, 0, 10],
      },
      {
        text: "3. Период выполнения работ:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: `с ${formatDate(data.dateStart)} по ${formatDate(data.dateEnd)}`,
        margin: [0, 0, 0, 10],
      },
      {
        text: "4. При выполнении работ применены материалы:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 50, 100],
          body: materialsTableBody,
        },
        margin: [0, 0, 0, 10],
      },
      {
        text: "5. Предъявлены документы, подтверждающие качество:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: data.qualityDocuments || "Сертификаты, паспорта качества",
        margin: [0, 0, 0, 10],
      },
      {
        text: "6. Результаты осмотра:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: "Работы выполнены в соответствии с проектной документацией, технологическими картами и требованиями нормативных документов.",
        margin: [0, 0, 0, 10],
      },
      {
        text: "7. Заключение:",
        bold: true,
        margin: [0, 10, 0, 5],
      },
      {
        text: "Работы выполнены в полном объёме в соответствии с проектной документацией и разрешается производство последующих работ.",
        margin: [0, 0, 0, 20],
      },
      {
        text: "ПОДПИСИ:",
        bold: true,
        margin: [0, 20, 0, 10],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Представитель застройщика:", fontSize: 9 },
              { text: "", margin: [0, 20, 0, 0] as [number, number, number, number] },
              { text: "_______________________", fontSize: 9 },
              { text: data.developerRepName, fontSize: 8 },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "Представитель подрядчика:", fontSize: 9 },
              { text: "", margin: [0, 20, 0, 0] as [number, number, number, number] },
              { text: "_______________________", fontSize: 9 },
              { text: data.contractorRepName, fontSize: 8 },
            ],
          },
        ],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Представитель стройконтроля:", fontSize: 9, margin: [0, 15, 0, 0] as [number, number, number, number] },
              { text: "", margin: [0, 20, 0, 0] as [number, number, number, number] },
              { text: "_______________________", fontSize: 9 },
              { text: data.supervisorRepName, fontSize: 8 },
            ],
          },
          { width: "*", text: "" },
        ],
      },
    ] as Content[],
  };

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

export function loadTemplateCatalog(): any {
  const catalogPath = path.join(process.cwd(), "server/templates/aosr/templates-catalog.json");
  const data = fs.readFileSync(catalogPath, "utf-8");
  return JSON.parse(data);
}
