/**
 * @file: estimateParser.ts
 * @description: Парсер Excel-выгрузки ЛСР/Сметы (ГРАНД-Смета) в нормализованную структуру для импорта в БД.
 * @dependencies: xlsx (тип Workbook на стороне клиента)
 * @created: 2026-01-29
 */

import * as XLSX from "xlsx";

export type ParsedEstimateImportPayload = {
  estimate: {
    name: string;
    code?: string | null;
    objectName?: string | null;
    region?: string | null;
    pricingQuarter?: string | null;
    totalCost?: string | null;
    totalConstruction?: string | null;
    totalInstallation?: string | null;
    totalEquipment?: string | null;
    totalOther?: string | null;
  };
  sections: Array<{ number: string; title: string; orderIndex: number }>;
  positions: Array<{
    sectionNumber?: string | null;
    lineNo: string;
    code?: string | null;
    name: string;
    unit?: string | null;
    quantity?: string | null;
    baseCostPerUnit?: string | null;
    indexValue?: string | null;
    currentCostPerUnit?: string | null;
    totalCurrentCost?: string | null;
    notes?: string | null;
    orderIndex: number;
  }>;
  resources: Array<{
    positionLineNo: string;
    resourceCode?: string | null;
    resourceType?: string | null;
    name: string;
    unit?: string | null;
    quantity?: string | null;
    quantityTotal?: string | null;
    baseCostPerUnit?: string | null;
    currentCostPerUnit?: string | null;
    totalCurrentCost?: string | null;
    orderIndex: number;
  }>;
};

type ColMap = {
  colNo: number;
  colCode: number;
  colName: number;
  colUnit: number | null;
  colQty: number | null;
  colQtyTotal: number | null;
  // Optional numeric columns (best-effort)
  colBaseCostPerUnit: number | null;
  colIndex: number | null;
  colCurrentCostPerUnit: number | null;
  colTotalCurrentCost: number | null;
};

function norm(v: unknown): string {
  return String(v ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isLineNo(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return /^\d+(?:\.\d+)?$/.test(s);
}

function isEmptyCell(v: unknown): boolean {
  return norm(v) === "";
}

function parseSectionTitle(raw: string): { number: string; title: string } | null {
  const s = raw.trim();
  const m = /^раздел\s+(\d+)\.?\s*(.*)$/i.exec(s);
  if (!m) return null;
  return { number: m[1], title: (m[2] || "").trim() || `Раздел ${m[1]}` };
}

function looksLikeResourceCode(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (/^фсбц-/i.test(s)) return true;
  // Common resource code patterns like "01.7.06.03-0022" or "1-100-40"
  if (/^\d{1,2}(?:\.\d{1,2}){2,3}-\d{2,5}$/.test(s)) return true;
  if (/^\d{1,2}(?:-\d{2,3}){2,}$/.test(s)) return true;
  return false;
}

function detectHeaderRow(rows: any[][]): { headerRowIdx: number; colNo: number; colCode: number; colName: number } {
  for (let i = 0; i < Math.min(rows.length, 200); i++) {
    const row = rows[i] ?? [];
    const cells = Array.from({ length: row.length }, (_v, idx) => norm(row[idx]));
    const idxNo = cells.findIndex((c) => c === "№ п/п" || c === "n п/п" || c.includes("№ п/п"));
    const idxCode = cells.findIndex((c) => c === "обоснование" || c.includes("обоснование"));
    const idxName = cells.findIndex(
      (c) => c === "наименование работ и затрат" || c.includes("наименование работ и затрат")
    );
    if (idxNo !== -1 && idxCode !== -1 && idxName !== -1) {
      return { headerRowIdx: i, colNo: idxNo, colCode: idxCode, colName: idxName };
    }
  }
  // Fallback: assume first columns 0..2
  return { headerRowIdx: 0, colNo: 0, colCode: 1, colName: 2 };
}

function findCol(row: any[], needles: string[]): number | null {
  const cells = Array.from({ length: row.length }, (_v, idx) => norm(row[idx]));
  for (const n of needles) {
    const idx = cells.findIndex((c) => c === n || c.includes(n));
    if (idx !== -1) return idx;
  }
  return null;
}

function findColAfter(row: any[], needles: string[], afterIndex: number): number | null {
  const cells = Array.from({ length: row.length }, (_v, idx) => norm(row[idx]));
  for (const n of needles) {
    for (let i = afterIndex + 1; i < cells.length; i++) {
      if (cells[i] === n || cells[i].includes(n)) {
        return i;
      }
    }
  }
  return null;
}

function detectColumns(rows: any[][]): ColMap {
  const { headerRowIdx, colNo, colCode, colName } = detectHeaderRow(rows);
  const headerRow = rows[headerRowIdx] ?? [];
  const headerRow2 = rows[headerRowIdx + 1] ?? [];
  const headerRow3 = rows[headerRowIdx + 2] ?? [];

  // Some exports use multi-row headers; search across a small window.
  const headerWindow = [headerRow, headerRow2, headerRow3];
  const find = (needles: string[]) => {
    for (const r of headerWindow) {
      const idx = findCol(r, needles);
      if (idx !== null) return idx;
    }
    return null;
  };

  const colUnit = find(["единица измерения", "ед. изм", "ед изм", "ед"]);
  
  // Колонка "на единицу измерения" (норматив) - ищем в подзаголовках
  let colQty = find(["на единицу измерения"]);
  
  // Колонка "всего с учётом коэффициентов" (сумма) - ищем после colQty
  let colQtyTotal = find(["всего с учетом коэффициентов", "всего с учётом коэффициентов", "всего с учетом", "всего с учётом"]);
  
  // Если не нашли по подзаголовкам, попробуем найти две колонки "Количество" подряд
  if (colQty === null || colQtyTotal === null) {
    // Ищем первую колонку "Количество"
    const firstQtyCol = find(["количество", "кол-во", "колво"]);
    if (firstQtyCol !== null) {
      colQty = firstQtyCol;
      // Ищем вторую колонку "Количество" после первой
      for (const r of headerWindow) {
        const secondQty = findColAfter(r, ["количество", "кол-во", "колво"], firstQtyCol);
        if (secondQty !== null) {
          colQtyTotal = secondQty;
          break;
        }
      }
    }
  }

  // Best-effort numeric columns (these headers vary a lot in ГРАНД-Смете exports)
  const colBaseCostPerUnit = find(["на единицу измерения в базисном уровне цен", "в базисном уровне цен"]);
  const colIndex = find(["индекс"]);
  const colCurrentCostPerUnit = find(["на единицу измерения в текущем уровне цен", "в текущем уровне цен"]);
  const colTotalCurrentCost = find(["всего в текущем уровне цен", "всего в текущ", "всего"]);

  return {
    colNo,
    colCode,
    colName,
    colUnit,
    colQty,
    colQtyTotal,
    colBaseCostPerUnit,
    colIndex,
    colCurrentCostPerUnit,
    colTotalCurrentCost,
  };
}

function extractMeta(rows: any[][]): ParsedEstimateImportPayload["estimate"] {
  const meta: ParsedEstimateImportPayload["estimate"] = { name: "Смета", code: null };

  const window = rows.slice(0, Math.min(rows.length, 80));
  for (const row of window) {
    const line = row.map((c) => String(c ?? "").trim()).filter(Boolean).join(" ");
    const nline = norm(line);

    if (!meta.code && nline.includes("локальный сметный расчет") && nline.includes("№")) {
      const m = /№\s*([A-Za-zА-Яа-я0-9\-./]+)\b/.exec(line);
      if (m) meta.code = m[1];
    }
    if (nline.includes("наименование субъекта") && !meta.region) {
      meta.region = line.replace(/.*наименование субъекта.*?:/i, "").trim() || null;
    }
    if (nline.includes("составлен") && nline.includes("текущ") && !meta.pricingQuarter) {
      // Rough grab: use whole line as quarter text
      meta.pricingQuarter = line.trim() || null;
    }
    if (!meta.objectName && (nline.includes("объект") || nline.includes("наименование объекта"))) {
      meta.objectName = line.trim() || null;
    }
    if (!meta.totalCost && nline.includes("сметная стоимость")) {
      // Try to pick last numeric-ish token (must start with digit and contain at least one digit)
      const tokens = line.split(/\s+/);
      const last = tokens.reverse().find((t) => /^\d/.test(t) && /\d/.test(t));
      if (last) meta.totalCost = last;
    }
  }

  return meta;
}

function rightmostNumberLike(row: any[]): string | null {
  for (let i = row.length - 1; i >= 0; i--) {
    const s = String(row[i] ?? "").trim();
    if (!s) continue;
    if (/^-?\d[\d\s]*([.,]\d+)?$/.test(s)) return s.replace(/\s+/g, "");
  }
  return null;
}

export function parseEstimateWorkbook(
  workbook: XLSX.WorkBook,
  opts?: { fileName?: string; sheetName?: string }
): ParsedEstimateImportPayload {
  const sheetName = opts?.sheetName ?? workbook.SheetNames?.[0];
  if (!sheetName) throw new Error("Файл не содержит листов");
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error("Не удалось прочитать лист сметы");

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  const cols = detectColumns(rows);
  const estimate = extractMeta(rows);

  if (opts?.fileName && (!estimate.name || estimate.name === "Смета")) {
    estimate.name = opts.fileName.replace(/\.(xlsx|xls|csv)$/i, "");
  }
  if (!estimate.name) estimate.name = sheetName;

  const sections: ParsedEstimateImportPayload["sections"] = [];
  const positions: ParsedEstimateImportPayload["positions"] = [];
  const resources: ParsedEstimateImportPayload["resources"] = [];

  const { headerRowIdx } = detectHeaderRow(rows);
  let currentSectionNumber: string | null = null;
  let currentPositionLineNo: string | null = null;

  const posIndexByLineNo = new Map<string, number>();
  let sectionOrder = 0;
  let positionOrder = 0;
  let resourceOrder = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const cellNo = row[cols.colNo];
    const cellCode = row[cols.colCode];
    const cellName = row[cols.colName];

    const nameStr = String(cellName ?? "").trim();
    const codeStr = String(cellCode ?? "").trim();
    const noStr = String(cellNo ?? "").trim();
    const nameNorm = norm(cellName);

    if (!nameStr && !codeStr && !noStr) continue;

    // Skip technical row with column numbers: 1,2,3,...
    if (/^\d+$/.test(noStr) && /^\d+$/.test(codeStr) && /^\d+$/.test(nameStr) && noStr === "1" && codeStr === "2") {
      continue;
    }

    // Section row
    const sec = parseSectionTitle(nameStr) ?? parseSectionTitle(codeStr);
    if (sec) {
      sections.push({ number: sec.number, title: sec.title, orderIndex: sectionOrder++ });
      currentSectionNumber = sec.number;
      currentPositionLineNo = null;
      continue;
    }

    // Position row: has line number and (usually) a норматива/обоснование in code col
    if (isLineNo(noStr) && !isEmptyCell(codeStr) && !isEmptyCell(nameStr)) {
      const unit = cols.colUnit !== null ? String(row[cols.colUnit] ?? "").trim() : "";
      const qty = cols.colQty !== null ? String(row[cols.colQty] ?? "").trim() : "";

      const position: ParsedEstimateImportPayload["positions"][number] = {
        sectionNumber: currentSectionNumber,
        lineNo: noStr,
        code: codeStr || null,
        name: nameStr,
        unit: unit || null,
        quantity: qty || null,
        notes: null,
        orderIndex: positionOrder++,
      };

      // Best-effort totals (use header-mapped columns if present)
      if (cols.colTotalCurrentCost !== null) {
        const total = String(row[cols.colTotalCurrentCost] ?? "").trim();
        if (total) position.totalCurrentCost = total;
      }

      positions.push(position);
      posIndexByLineNo.set(noStr, positions.length - 1);
      currentPositionLineNo = noStr;
      continue;
    }

    // Total row: "Всего по позиции"
    if (currentPositionLineNo && nameNorm.includes("всего по позиции")) {
      const idx = posIndexByLineNo.get(currentPositionLineNo);
      if (idx !== undefined) {
        const total = rightmostNumberLike(row);
        if (total) positions[idx].totalCurrentCost = total;
      }
      continue;
    }

    // Resource row: belongs to current position
    if (currentPositionLineNo && (isEmptyCell(noStr) || !isLineNo(noStr))) {
      const marker = codeStr.trim();
      const isMarkerType = /^от|^отм|^эм|^м$|^н$/i.test(marker.replace(/[()]/g, ""));
      const isResource = looksLikeResourceCode(marker) || isMarkerType;

      if (isResource && !isEmptyCell(nameStr)) {
        const unit = cols.colUnit !== null ? String(row[cols.colUnit] ?? "").trim() : "";
        const qty = cols.colQty !== null ? String(row[cols.colQty] ?? "").trim() : "";
        const qtyTotal = cols.colQtyTotal !== null ? String(row[cols.colQtyTotal] ?? "").trim() : "";

        resources.push({
          positionLineNo: currentPositionLineNo,
          resourceCode: isMarkerType ? null : marker || null,
          resourceType: isMarkerType ? marker : null,
          name: nameStr,
          unit: unit || null,
          quantity: qty || null,
          quantityTotal: qtyTotal || null,
          orderIndex: resourceOrder++,
        });
        continue;
      }
    }

    // Comment / note row: attach to current position
    if (currentPositionLineNo && (nameNorm.includes("объем=") || nameNorm.includes("приказ") || nameNorm.includes("коэфф"))) {
      const idx = posIndexByLineNo.get(currentPositionLineNo);
      if (idx !== undefined) {
        const existing = positions[idx].notes ? String(positions[idx].notes) : "";
        const next = nameStr || codeStr || "";
        positions[idx].notes = existing ? `${existing}\n${next}` : next;
      }
      continue;
    }
  }

  // Ensure there is at least one synthetic section if all positions are unsectioned
  if (sections.length === 0 && positions.length > 0) {
    sections.push({ number: "0", title: "Без раздела", orderIndex: 0 });
    for (const p of positions) p.sectionNumber = "0";
  }

  return { estimate, sections, positions, resources };
}

