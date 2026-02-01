/**
 * @file: dateFormat.ts
 * @description: Утилиты форматирования/парсинга дат (ISO YYYY-MM-DD ↔ dd/mm/yyyy) для единообразного UI.
 * @dependencies: none
 * @created: 2026-02-01
 */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatIsoToDmy(iso?: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

export function normalizeDmyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8); // DDMMYYYY
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);

  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

export function parseDmyToIso(dmy: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy.trim());
  if (!m) return null;
  const [, ddStr, mmStr, yyyyStr] = m;
  const d = Number(ddStr);
  const mo = Number(mmStr);
  const y = Number(yyyyStr);

  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) return null;
  if (y < 1900 || y > 2100) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;

  const dt = new Date(Date.UTC(y, mo - 1, d));
  // validate roundtrip (handles 31/02 etc.)
  const valid =
    dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  if (!valid) return null;

  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

