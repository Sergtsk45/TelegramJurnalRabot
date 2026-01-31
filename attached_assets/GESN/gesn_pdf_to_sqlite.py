"""
ГЭСН PDF → SQLite (максимально точный парсинг ресурсных матриц).

Ключевая идея:
- Структуру "Таблица ГЭСН ... / Состав работ / Измеритель / список норм" извлекаем текстом.
- Ресурсные матрицы ("Код ресурса ... Ед. изм. ... колонки норм ... значения") парсим ПО КООРДИНАТАМ
  через pdfplumber.extract_words(), чтобы корректно:
  - определять cols (колонки норм) по X-координатам заголовка,
  - привязывать числа к нужной колонке по ближайшему X,
  - переживать переносы "01-01-" + "065-04" и разрывы таблиц по страницам.

Все подозрительные места пишутся в лог-файл.
"""

from __future__ import annotations

import argparse
import logging
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Tuple

import pdfplumber


# -------------------------
# Regex / parsing helpers
# -------------------------

RE_TABLE = re.compile(r"^Таблица\s+ГЭСН\s+(\d{2}-\d{2}-\d{3})\s+(.*)$")
RE_MEASURE = re.compile(r"^\s*Измеритель:\s*(.+?)\s*$")
RE_WORKSTEP = re.compile(r"^\s*(\d{2})\.\s+(.*)$")
RE_NORM = re.compile(r"^\s*(\d{2}-\d{2}-\d{3}-\d{2})\s+(.+?)\s*$")

RE_NORM_FULL = re.compile(r"^\d{2}-\d{2}-\d{3}-\d{2}$")
RE_TABLE_CODE = re.compile(r"^\d{2}-\d{2}-\d{3}$")
RE_NORM_PREFIX = re.compile(r"^\d{2}-\d{2}-$")  # 01-01-
RE_NORM_SUFFIX = re.compile(r"^\d{3}-\d{2}$")  # 065-04

# Числа встречаются как "234,78" или "1 032"
RE_NUM_TOKEN = re.compile(r"^\d{1,3}(?:\s\d{3})*(?:[.,]\d+)?$")

# Код ресурса:
#   91.01.01-034 (машины, с точками)
#   16-01-002-01 (с дефисами, как в ГЭСН16 и др.)
#   01.7.07.29-0101 (материалы ФССЦ: XX.X.XX.XX-XXXX)
#   1, 1.1, 2, 3, 4, ... (номера разделов и простые коды)
RE_RESOURCE_CODE = re.compile(
    r"^(?:"
    r"\d{2}\.\d{2}\.\d{2}-\d{3}|"        # 91.01.01-034
    r"\d{2}-\d{2}-\d{3}-\d{2}|"          # 16-01-002-01
    r"\d{2}\.\d\.\d{2}\.\d{2}-\d{4}|"    # 01.7.07.29-0101 (ФССЦ материалы)
    r"\d+(?:\.\d+)?"                      # 1, 1.1, 2, 3, 4, ...
    r")$"
)

# Простейший детектор единиц измерения: расширяемый whitelist
RE_UNIT = re.compile(
    r"^(?:"
    r"чел\.-ч|маш\.-ч|ч|час|"
    r"м3|м2|м|км|т|кг|г|л|"
    r"шт|компл|пара|"
    r"%|"
    r"кВт|кВт·ч|"
    r"м\.п\.|п\.м\.|"
    r"тыс\.|10м|100м|1000м3|"
    r"чел\.|усл\.ед\.|"
    r"рулон|уп\.|компл\.|комплект|"
    r")$",
    re.IGNORECASE,
)

# Стандартные наименования и единицы для кодов, общих во всех сборниках ГЭСН
STANDARD_RESOURCE_NAMES: Dict[str, Tuple[str, Optional[str]]] = {
    "1": ("Затраты труда рабочих", "чел.-ч"),
    "1.1": ("Средний разряд", None),
    "2": ("Затраты труда машинистов", "чел.-ч"),
    "3": ("МАШИНЫ И МЕХАНИЗМЫ", None),
    "4": ("МАТЕРИАЛЫ", None),
}


def num_to_float(s: str) -> float:
    return float(s.replace(" ", "").replace(",", "."))


def center_x(w: dict) -> float:
    return (float(w["x0"]) + float(w["x1"])) / 2.0


def near(a: float, b: float, tol: float) -> bool:
    return abs(a - b) <= tol


def parse_resource_code_from_tokens(tokens: List[str]) -> Tuple[Optional[str], List[str]]:
    """
    Из начала списка токенов извлекаем код ресурса (с учётом склейки "16-01-" + "002-01").
    Возвращаем (code, остаток_токенов для name/unit) или (None, tokens).
    Один токен-префикс "16-01-" тоже возвращаем как (code, []), чтобы склеить со следующей строкой.
    """
    if not tokens:
        return None, []
    first = tokens[0]
    if RE_RESOURCE_CODE.match(first):
        return first, tokens[1:]
    if RE_NORM_PREFIX.match(first):
        if len(tokens) >= 2 and RE_NORM_SUFFIX.match(tokens[1]):
            return first + tokens[1], tokens[2:]
        return first, tokens[1:]  # префикс без суффикса — склеим со следующей строкой
    return None, tokens


def merge_split_codes(lines: List[str]) -> List[str]:
    """
    Склейка типичных переносов в extract_text():
      "01-01-" + next "065-02"
    """
    out: List[str] = []
    i = 0
    while i < len(lines):
        a = lines[i].rstrip()
        if RE_NORM_PREFIX.match(a.strip()) and i + 1 < len(lines):
            b = lines[i + 1].lstrip()
            if RE_NORM_SUFFIX.match(b.strip().split()[0]):
                out.append(a.strip() + b.strip())
                i += 2
                continue
        out.append(lines[i])
        i += 1
    return out


# -------------------------
# SQLite schema / writers
# -------------------------


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS gesn_table (
  table_code TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  measure    TEXT,
  page_from  INTEGER,
  page_to    INTEGER
);

CREATE TABLE IF NOT EXISTS gesn_work_step (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  table_code TEXT NOT NULL REFERENCES gesn_table(table_code),
  ord        INTEGER,
  text       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gesn_norm (
  norm_code  TEXT PRIMARY KEY,
  table_code TEXT NOT NULL REFERENCES gesn_table(table_code),
  variant    TEXT
);

CREATE TABLE IF NOT EXISTS gesn_resource (
  resource_code TEXT PRIMARY KEY,
  name          TEXT,
  unit          TEXT
);

CREATE TABLE IF NOT EXISTS gesn_value (
  norm_code     TEXT NOT NULL REFERENCES gesn_norm(norm_code),
  resource_code TEXT NOT NULL REFERENCES gesn_resource(resource_code),
  value         REAL,
  PRIMARY KEY (norm_code, resource_code)
);

CREATE INDEX IF NOT EXISTS idx_gesn_value_norm ON gesn_value(norm_code);
CREATE INDEX IF NOT EXISTS idx_gesn_value_resource ON gesn_value(resource_code);
CREATE INDEX IF NOT EXISTS idx_gesn_norm_table ON gesn_norm(table_code);
"""
    )


def upsert_table(
    conn: sqlite3.Connection,
    table_code: str,
    title: str,
    measure: Optional[str],
    page_from: Optional[int],
    page_to: Optional[int],
) -> None:
    conn.execute(
        """
INSERT INTO gesn_table(table_code, title, measure, page_from, page_to)
VALUES(?, ?, ?, ?, ?)
ON CONFLICT(table_code) DO UPDATE SET
  title=excluded.title,
  measure=COALESCE(excluded.measure, gesn_table.measure),
  page_from=COALESCE(gesn_table.page_from, excluded.page_from),
  page_to=MAX(COALESCE(gesn_table.page_to, excluded.page_to), COALESCE(excluded.page_to, gesn_table.page_to))
""",
        (table_code, title, measure, page_from, page_to),
    )


def upsert_resource(conn: sqlite3.Connection, resource_code: str, name: Optional[str], unit: Optional[str]) -> None:
    conn.execute(
        """
INSERT INTO gesn_resource(resource_code, name, unit)
VALUES(?, ?, ?)
ON CONFLICT(resource_code) DO UPDATE SET
  name=COALESCE(gesn_resource.name, excluded.name),
  unit=COALESCE(gesn_resource.unit, excluded.unit)
""",
        (resource_code, name, unit),
    )


def upsert_value(conn: sqlite3.Connection, norm_code: str, resource_code: str, value: float) -> None:
    conn.execute(
        """
INSERT OR REPLACE INTO gesn_value(norm_code, resource_code, value)
VALUES(?, ?, ?)
""",
        (norm_code, resource_code, value),
    )


def insert_norms_for_table(
    conn: sqlite3.Connection,
    table_code: str,
    norms: List[str],
    variants: Dict[str, str],
) -> None:
    """
    Идемпотентная вставка норм таблицы, чтобы FK из gesn_value всегда были валидны.
    """
    for norm in norms:
        conn.execute(
            """
INSERT OR IGNORE INTO gesn_norm(norm_code, table_code, variant)
VALUES(?, ?, ?)
""",
            (norm, table_code, variants.get(norm)),
        )


def replace_work_steps(conn: sqlite3.Connection, table_code: str, steps: List[Tuple[int, str]]) -> None:
    """
    Перезаписываем состав работ для конкретной таблицы.
    """
    conn.execute("DELETE FROM gesn_work_step WHERE table_code = ?", (table_code,))
    for ord_num, text in steps:
        conn.execute(
            """
INSERT INTO gesn_work_step(table_code, ord, text)
VALUES(?, ?, ?)
""",
            (table_code, ord_num, text),
        )


# -------------------------
# Coordinate parsing (cols & rows)
# -------------------------


@dataclass
class ColsMap:
    """norm_code -> x_center"""

    cols: Dict[str, float]

    def nearest(self, x: float) -> Tuple[Optional[str], float]:
        best_code: Optional[str] = None
        best_d = float("inf")
        for code, cx in self.cols.items():
            d = abs(x - cx)
            if d < best_d:
                best_d = d
                best_code = code
        return best_code, best_d


def find_phrase_y(words: List[dict], a: str, b: str, y_tol: float = 2.5) -> Optional[float]:
    """
    Находим y строки, где рядом встречаются слова a и b (например "Код" и "ресурса").
    """
    for i, w in enumerate(words):
        if w["text"] == a:
            y = float(w["top"])
            for j in range(i + 1, min(i + 10, len(words))):
                w2 = words[j]
                if near(float(w2["top"]), y, y_tol) and w2["text"].lower().startswith(b.lower()):
                    return y
    return None


def find_unit_header_right_x(words: List[dict], y: float, y_tol: float = 2.5) -> Optional[float]:
    """
    Находим позицию справа от "Ед. изм." на той же строке, чтобы отделить колонки норм.
    """
    for i, w in enumerate(words):
        if near(float(w["top"]), y, y_tol) and w["text"].startswith("Ед"):
            for j in range(i + 1, min(i + 8, len(words))):
                w2 = words[j]
                if near(float(w2["top"]), y, y_tol) and w2["text"].startswith("изм"):
                    return float(w2["x1"])
    return None


def cluster_words_by_x(words: List[dict], x_tol: float = 8.0) -> List[Tuple[float, List[dict]]]:
    """
    Группируем слова в вертикальные "колонки" по близким x-центрам.
    Возвращаем список (cx, words_in_cluster).
    """
    clusters: List[Tuple[float, List[dict]]] = []

    def _avg_x(ws: List[dict]) -> float:
        return sum(center_x(w) for w in ws) / max(1, len(ws))

    for w in sorted(words, key=lambda ww: center_x(ww)):
        cx = center_x(w)
        placed = False
        for idx, (cxc, ws) in enumerate(clusters):
            if near(cx, cxc, x_tol):
                ws.append(w)
                clusters[idx] = (_avg_x(ws), ws)
                placed = True
                break
        if not placed:
            clusters.append((cx, [w]))
    return clusters


def normalize_norm_header(parts: List[str], table_code: Optional[str]) -> Optional[str]:
    """
    parts: текстовые куски из одного X-кластера сверху вниз.
    """
    parts_clean = [p.strip() for p in parts if p.strip()]
    joined = "".join(parts_clean).replace(" ", "")

    if RE_NORM_FULL.match(joined):
        return joined

    if len(parts_clean) >= 2 and RE_NORM_PREFIX.match(parts_clean[0]) and RE_NORM_SUFFIX.match(parts_clean[1]):
        return parts_clean[0] + parts_clean[1]

    if table_code and RE_TABLE_CODE.match(table_code) and RE_NORM_SUFFIX.match(joined):
        # suffix "065-04" -> "01-01-065-04"
        suffix = joined.split("-")[1]
        return f"{table_code}-{suffix}"

    return None


def build_cols_map(
    words: List[dict],
    table_code: Optional[str],
    header_y: float,
    unit_right_x: float,
    header_height: float = 85.0,
    x_tol: float = 8.0,
) -> ColsMap:
    """
    Из области заголовка (несколько строк под "Код ресурса ... Ед. изм.")
    строим карту norm_code -> x_center.
    """
    y0 = header_y - 2.0
    y1 = header_y + header_height
    header_words = [
        w
        for w in words
        if (float(w["top"]) >= y0 and float(w["bottom"]) <= y1 and float(w["x0"]) >= unit_right_x + 3.0)
    ]

    clusters = cluster_words_by_x(header_words, x_tol=x_tol)
    cols: Dict[str, float] = {}
    for cx, ws in clusters:
        parts = [w["text"] for w in sorted(ws, key=lambda ww: float(ww["top"]))]
        norm = normalize_norm_header(parts, table_code)
        if norm:
            cols[norm] = cx
    return ColsMap(cols=cols)


@dataclass
class PendingRow:
    resource_code: str
    name_parts: List[str]
    unit: Optional[str] = None

    def name(self) -> str:
        return " ".join(self.name_parts).strip()


def group_words_to_rows(words: List[dict], y_tol: float = 2.5) -> List[List[dict]]:
    """
    Группируем слова в строки по y (top).
    """
    rows: List[Tuple[float, List[dict]]] = []
    for w in sorted(words, key=lambda ww: (float(ww["top"]), float(ww["x0"]))):
        y = float(w["top"])
        placed = False
        for idx, (ry, rws) in enumerate(rows):
            if near(y, ry, y_tol):
                rws.append(w)
                rows[idx] = (ry, rws)
                placed = True
                break
        if not placed:
            rows.append((y, [w]))
    return [sorted(rws, key=lambda ww: float(ww["x0"])) for _, rws in rows]


def parse_page_matrix(
    *,
    logger: logging.Logger,
    conn: sqlite3.Connection,
    page_no: int,
    words: List[dict],
    table_code: Optional[str],
    cols_map: ColsMap,
    matrix_start_y: float,
    value_x_max_dist: float = 25.0,
    min_fill_ratio: float = 0.55,
) -> None:
    """
    Парсим строки ресурсов ниже заголовка. Поддерживаем многострочные описания:
    - строка с кодом ресурса может идти без чисел (описание перенесено),
    - строка с числами может не начинаться с кода (продолжение предыдущей строки).
    """
    body_words = [w for w in words if float(w["top"]) > matrix_start_y + 18.0]
    rows = group_words_to_rows(body_words, y_tol=2.5)

    pending: Optional[PendingRow] = None

    def flush_pending(values_by_norm: Optional[Dict[str, float]] = None) -> None:
        nonlocal pending
        if not pending:
            return
        name = pending.name() or None
        unit = pending.unit
        if name is None and unit is None and pending.resource_code in STANDARD_RESOURCE_NAMES:
            name, unit = STANDARD_RESOURCE_NAMES[pending.resource_code]
        upsert_resource(conn, pending.resource_code, name, unit)
        if values_by_norm:
            # проверки заполнения
            if cols_map.cols:
                fill_ratio = len(values_by_norm) / max(1, len(cols_map.cols))
                if fill_ratio < min_fill_ratio:
                    logger.warning(
                        "LOW_FILL page=%s table=%s code=%s fill=%.2f cols=%d values=%d name=%r",
                        page_no,
                        table_code,
                        pending.resource_code,
                        fill_ratio,
                        len(cols_map.cols),
                        len(values_by_norm),
                        name,
                    )
            for norm_code, val in values_by_norm.items():
                upsert_value(conn, norm_code, pending.resource_code, val)
        pending = None

    for r in rows:
        if not r:
            continue

        first = r[0]["text"].strip()

        # Отсекаем мусор: номера страниц, повтор заголовка и т.п.
        if first in {"--"} or first.lower() in {"код", "наименование"}:
            continue

        # Соберём числовые токены с координатами
        nums: List[Tuple[float, float]] = []
        for w in r:
            t = w["text"].strip()
            if RE_NUM_TOKEN.match(t):
                try:
                    nums.append((center_x(w), num_to_float(t)))
                except ValueError:
                    logger.warning("BAD_NUMBER page=%s table=%s text=%r", page_no, table_code, t)

        # Текст левой части (до первой числовой зоны), используем для code/name/unit
        first_num_x = min((float(w["x0"]) for w in r if RE_NUM_TOKEN.match(w["text"].strip())), default=None)
        left_words = []
        if first_num_x is not None:
            left_words = [w for w in r if float(w["x1"]) < first_num_x - 4.0]
        else:
            left_words = r[:]
        left_text_tokens = [w["text"].strip() for w in left_words if w["text"].strip()]

        # Склейка кода между строками: предыдущая строка "16-01-", текущая "002-01" → 16-01-002-01
        completed_from_prev = False
        if (
            pending
            and RE_NORM_PREFIX.match(pending.resource_code)
            and left_text_tokens
            and RE_NORM_SUFFIX.match(left_text_tokens[0])
        ):
            resource_code = pending.resource_code + left_text_tokens[0]
            name_tokens_after_code = left_text_tokens[1:]
            pending.resource_code = resource_code
            pending.name_parts = list(name_tokens_after_code)
            starts_with_code = True
            completed_from_prev = True
        else:
            resource_code, name_tokens_after_code = parse_resource_code_from_tokens(left_text_tokens)
            starts_with_code = resource_code is not None

        if starts_with_code and not nums:
            # Начало ресурса (или продолжение описания) без чисел
            # Если был предыдущий pending — это новая запись, сбрасываем старую без значений (аномалия)
            if pending:
                logger.warning(
                    "PENDING_NO_VALUES page=%s table=%s prev_code=%s",
                    page_no,
                    table_code,
                    pending.resource_code,
                )
                flush_pending(values_by_norm=None)

            code = resource_code
            name_parts = name_tokens_after_code
            pending = PendingRow(resource_code=code, name_parts=name_parts)
            continue

        if starts_with_code and nums:
            # Полная строка: код + (имя/ед.изм) + числа (или код склеен со строки выше)
            if not completed_from_prev:
                flush_pending(values_by_norm=None)

            code = resource_code
            # Пытаемся выделить unit: последний токен слева от чисел
            unit = None
            name_tokens = list(name_tokens_after_code)
            if name_tokens:
                cand = name_tokens[-1]
                if RE_UNIT.match(cand):
                    unit = cand
                    name_tokens = name_tokens[:-1]
            if completed_from_prev:
                pending.name_parts = name_tokens
                pending.unit = unit or pending.unit
            else:
                pending = PendingRow(resource_code=code, name_parts=name_tokens, unit=unit)

            values_by_norm: Dict[str, float] = {}
            duplicates: List[Tuple[str, float, float]] = []

            for x, val in nums:
                norm_code, dist = cols_map.nearest(x)
                if not norm_code or dist > value_x_max_dist:
                    logger.warning(
                        "UNMAPPED_VALUE page=%s table=%s code=%s x=%.1f dist=%.1f val=%s",
                        page_no,
                        table_code,
                        code,
                        x,
                        dist,
                        val,
                    )
                    continue
                if norm_code in values_by_norm:
                    duplicates.append((norm_code, values_by_norm[norm_code], val))
                values_by_norm[norm_code] = val

            if duplicates:
                logger.warning(
                    "DUPLICATE_IN_COL page=%s table=%s code=%s dups=%r",
                    page_no,
                    table_code,
                    code,
                    duplicates,
                )

            flush_pending(values_by_norm=values_by_norm)
            continue

        # Не начинается с кода ресурса
        if not nums:
            # Чистое продолжение текста (перенос строки) — приклеиваем к pending.name_parts
            if pending and left_text_tokens:
                pending.name_parts.extend(left_text_tokens)
            continue

        # Есть числа, но кода нет: вероятно строка с продолжением (unit + числа) для предыдущего ресурса
        if pending:
            # Попробуем вытащить unit (последний токен до чисел), если ещё нет
            if pending.unit is None and left_text_tokens:
                cand = left_text_tokens[-1]
                if RE_UNIT.match(cand):
                    pending.unit = cand
            values_by_norm = {}
            for x, val in nums:
                norm_code, dist = cols_map.nearest(x)
                if not norm_code or dist > value_x_max_dist:
                    logger.warning(
                        "UNMAPPED_VALUE_CONT page=%s table=%s code=%s x=%.1f dist=%.1f val=%s",
                        page_no,
                        table_code,
                        pending.resource_code,
                        x,
                        dist,
                        val,
                    )
                    continue
                values_by_norm[norm_code] = val
            flush_pending(values_by_norm=values_by_norm)
        else:
            logger.warning("VALUES_WITHOUT_CODE page=%s table=%s nums=%d", page_no, table_code, len(nums))

    # В конце страницы pending обычно не надо сбрасывать — описание может продолжаться на следующей


# -------------------------
# Main extraction pipeline
# -------------------------


@dataclass
class TableMeta:
    table_code: str
    title: str
    measure: Optional[str]
    norms: List[str]
    variants: Dict[str, str]
    work_steps: List[Tuple[int, str]]


def extract_tables_text(pdf_path: Path, logger: logging.Logger, max_pages: Optional[int] = None) -> Dict[int, TableMeta]:
    """
    Проход 1 (текстовый): для каждой страницы фиксируем активную таблицу (table_code),
    вытаскиваем заголовок, измеритель, список норм.
    Возвращаем page_no -> TableMeta для "активной таблицы" на странице.
    """
    page_table: Dict[int, TableMeta] = {}
    current_table: Optional[str] = None
    current_title_lines: List[str] = []
    current_measure: Optional[str] = None
    current_norms: List[str] = []
    current_variants: Dict[str, str] = {}
    current_work_steps: List[Tuple[int, str]] = []
    in_work = False

    def commit(page_no: int) -> None:
        if not current_table:
            return
        title = " ".join([t for t in current_title_lines if t]).strip()
        page_table[page_no] = TableMeta(
            table_code=current_table,
            title=title or current_table,
            measure=current_measure,
            norms=list(dict.fromkeys(current_norms)),  # preserve order, unique
            variants=dict(current_variants),
            work_steps=list(current_work_steps),
        )

    with pdfplumber.open(pdf_path) as pdf:
        pages = pdf.pages
        if max_pages:
            pages = pages[: max_pages]
        for page_no, page in enumerate(pages, start=1):
            text = page.extract_text() or ""
            lines = merge_split_codes(text.splitlines())

            for line in lines:
                line = line.rstrip()
                m = RE_TABLE.match(line)
                if m:
                    current_table = m.group(1)
                    current_title_lines = [m.group(2).strip()] if m.group(2).strip() else []
                    current_measure = None
                    current_norms = []
                    current_variants = {}
                    current_work_steps = []
                    in_work = False
                    continue

                if not current_table:
                    continue

                if line.strip() == "Состав работ:":
                    in_work = True
                    continue

                if in_work:
                    mw = RE_WORKSTEP.match(line)
                    if mw:
                        try:
                            ord_num = int(mw.group(1))
                        except ValueError:
                            ord_num = 0
                        text = mw.group(2).strip()
                        if text:
                            current_work_steps.append((ord_num, text))
                        continue
                    # Выход из work секции будет по "Измеритель"

                mm = RE_MEASURE.match(line)
                if mm:
                    current_measure = mm.group(1).strip()
                    in_work = False
                    continue

                # "дописать" заголовок таблицы до начала секций
                if (
                    current_measure is None
                    and not in_work
                    and line.strip()
                    and not line.strip().startswith("Состав работ:")
                    and not RE_NORM.match(line)
                    and "Код ресурса" not in line
                ):
                    if len(current_title_lines) < 8:
                        current_title_lines.append(line.strip())
                    continue

                mn = RE_NORM.match(line)
                if mn:
                    norm_code = mn.group(1)
                    variant = mn.group(2).strip()
                    current_norms.append(norm_code)
                    current_variants[norm_code] = variant
                    continue

            commit(page_no)

    # sanity: логируем страницы без table
    if not page_table:
        logger.warning("No tables detected in PDF by text pass.")
    return page_table


def setup_logger(log_path: Path, verbose: bool) -> logging.Logger:
    logger = logging.getLogger("gesn_pdf_to_sqlite")
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()

    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    if verbose:
        sh = logging.StreamHandler()
        sh.setLevel(logging.INFO)
        sh.setFormatter(fmt)
        logger.addHandler(sh)

    return logger


def resolve_output_path(path: Path) -> Path:
    """
    Если путь относительный — сохраняем рядом со скриптом (папка attached_assets/GESN/).
    Если абсолютный — используем как есть.
    """
    if path.is_absolute():
        return path
    base_dir = Path(__file__).resolve().parent
    return base_dir / path


def main() -> int:
    ap = argparse.ArgumentParser(description="ГЭСН PDF → SQLite (точные матрицы по координатам)")
    ap.add_argument("--pdf", required=True, type=Path, help="Путь к PDF (например ГЭСН01.pdf)")
    ap.add_argument("--db", required=True, type=Path, help="Путь к SQLite файлу (создастся при необходимости)")
    ap.add_argument("--log", required=True, type=Path, help="Путь к лог-файлу")
    ap.add_argument("--max-pages", type=int, default=None, help="Ограничение страниц для отладки")
    ap.add_argument("--verbose", action="store_true", help="Писать INFO также в stdout")
    ap.add_argument("--dry-run", action="store_true", help="Не записывать данные на диск (SQLite in-memory)")
    args = ap.parse_args()

    db_path = resolve_output_path(args.db)
    log_path = resolve_output_path(args.log)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    if not args.dry_run:
        db_path.parent.mkdir(parents=True, exist_ok=True)

    logger = setup_logger(log_path, verbose=args.verbose)
    logger.info("START pdf=%s db=%s", args.pdf, db_path)

    page_table = extract_tables_text(args.pdf, logger, max_pages=args.max_pages)

    if args.dry_run:
        logger.info("DRY_RUN enabled: sqlite file is ignored")
        conn = sqlite3.connect(":memory:")
    else:
        conn = sqlite3.connect(db_path)
    init_db(conn)

    # Состояние, которое тянется между страницами (до смены таблицы)
    current_table_code: Optional[str] = None
    current_norms: List[str] = []
    active_cols_map = ColsMap(cols={})
    table_first_page: Dict[str, int] = {}

    with pdfplumber.open(args.pdf) as pdf:
        pages = pdf.pages
        if args.max_pages:
            pages = pages[: args.max_pages]

        for page_no, page in enumerate(pages, start=1):
            try:
                meta = page_table.get(page_no)
                if meta:
                    # смена таблицы
                    if current_table_code != meta.table_code:
                        current_table_code = meta.table_code
                        current_norms = meta.norms
                        active_cols_map = ColsMap(cols={})
                        # фиксируем page_from для таблицы
                        table_first_page.setdefault(meta.table_code, page_no)
                        # сначала запись в gesn_table (FK для gesn_norm)
                        upsert_table(
                            conn,
                            meta.table_code,
                            meta.title,
                            meta.measure,
                            page_from=table_first_page.get(meta.table_code),
                            page_to=page_no,
                        )
                        insert_norms_for_table(conn, meta.table_code, meta.norms, meta.variants)
                        if not args.dry_run:
                            replace_work_steps(conn, meta.table_code, meta.work_steps)
                    else:
                        upsert_table(
                            conn,
                            meta.table_code,
                            meta.title,
                            meta.measure,
                            page_from=table_first_page.get(meta.table_code),
                            page_to=page_no,
                        )
                else:
                    # нет данных текстового прохода — пропускаем
                    continue

                # words (координаты)
                words = page.extract_words(
                    keep_blank_chars=False,
                    use_text_flow=True,
                )
                if not words:
                    continue

                header_y = find_phrase_y(words, "Код", "ресурса", y_tol=3.0)
                if header_y is None:
                    continue

                unit_right_x = find_unit_header_right_x(words, header_y, y_tol=3.0)
                if unit_right_x is None:
                    logger.warning("NO_UNIT_HEADER page=%s table=%s", page_no, current_table_code)
                    continue

                cols_map = build_cols_map(words, current_table_code, header_y, unit_right_x, header_height=90.0, x_tol=8.0)

                # Если колонки пустые — попробуем fallback: взять известные нормы текущей таблицы и "разложить" по найденным X-кластерам
                # (честный fallback: лучше, чем ничего; но логируем!)
                if not cols_map.cols:
                    logger.warning("NO_COLS_DETECTED page=%s table=%s (fallback disabled)", page_no, current_table_code)
                    # не умеем корректно привязать значения — пропускаем страницу
                    continue

                # Обновляем активную карту колонок (продолжения таблиц на след. страницах)
                # Если на странице подмножество колонок (например -06..-08), дополняем.
                before = set(active_cols_map.cols.keys())
                active_cols_map.cols.update(cols_map.cols)
                added = set(active_cols_map.cols.keys()) - before
                if added:
                    logger.info("COLS_ADDED page=%s table=%s added=%s", page_no, current_table_code, sorted(added))

                # Проверка: колонки должны быть подмножеством norms (если norms известны)
                if current_norms:
                    unexpected = [c for c in cols_map.cols.keys() if c not in set(current_norms)]
                    if unexpected:
                        logger.warning(
                            "COLS_NOT_IN_NORMS page=%s table=%s unexpected=%s",
                            page_no,
                            current_table_code,
                            unexpected,
                        )

                # Парсим матрицу только по колонкам текущей страницы (cols_map), чтобы не путаться со "старыми" колонками
                parse_page_matrix(
                    logger=logger,
                    conn=conn,
                    page_no=page_no,
                    words=words,
                    table_code=current_table_code,
                    cols_map=cols_map,
                    matrix_start_y=header_y,
                    value_x_max_dist=26.0,
                    min_fill_ratio=0.55,
                )
            except Exception as exc:
                logger.exception("PAGE_ERROR page=%s error=%s", page_no, exc)
                continue

    stats = conn.execute(
        """
SELECT
  (SELECT COUNT(*) FROM gesn_table) as tables,
  (SELECT COUNT(*) FROM gesn_norm) as norms,
  (SELECT COUNT(*) FROM gesn_resource) as resources,
  (SELECT COUNT(*) FROM gesn_value) as value_count,
  (SELECT COUNT(*) FROM gesn_work_step) as work_steps
"""
    ).fetchone()
    if stats:
        logger.info(
            "STATS tables=%d norms=%d resources=%d values=%d work_steps=%d",
            stats[0],
            stats[1],
            stats[2],
            stats[3],
            stats[4],
        )

    if not args.dry_run:
        conn.commit()
    conn.close()
    logger.info("DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

