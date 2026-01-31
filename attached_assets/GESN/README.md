<!--
/**
 * @file: README.md
 * @description: Инструкция по использованию парсера ГЭСН (PDF → SQLite)
 * @dependencies: pdfplumber, sqlite3, python3
 * @created: 2026-01-30
 */
-->

# ГЭСН PDF → SQLite Parser

Скрипт для извлечения данных из справочников ГЭСН (PDF) в SQLite.

## Установка (Ubuntu 22.04)

```bash
cd /home/serg45/projects/TelegramJurnalRabot/attached_assets/GESN

# Создание виртуального окружения
python3 -m venv .venv
source .venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt
```

## Запуск

### Куда сохраняются результаты

- Если `--db` задан **относительным путём** (например `gesn01.sqlite3`), итоговый файл будет создан в папке `attached_assets/GESN/` (рядом со скриптом).
- Если `--db` задан **абсолютным путём**, файл будет создан ровно по этому пути.
- Аналогично для `--log`: относительный путь сохраняется рядом со скриптом.
- В режиме `--dry-run` SQLite-файл **не создаётся** (БД в памяти), но лог пишется как обычно.

### Полный парсинг

```bash
python3 gesn_pdf_to_sqlite.py \
  --pdf "ГЭСН01.pdf" \
  --db "gesn01.sqlite3" \
  --log "parse_gesn01.log" \
  --verbose
```

### Быстрая отладка (первые N страниц)

```bash
python3 gesn_pdf_to_sqlite.py \
  --pdf "ГЭСН01.pdf" \
  --db "gesn01.sqlite3" \
  --log "parse_gesn01.log" \
  --max-pages 80 \
  --verbose
```

### Dry-run (без сохранения SQLite на диск)

```bash
python3 gesn_pdf_to_sqlite.py \
  --pdf "ГЭСН01.pdf" \
  --db "gesn01.sqlite3" \
  --log "parse_gesn01.log" \
  --max-pages 20 \
  --dry-run \
  --verbose
```

### Парсинг всех сборников

```bash
for pdf in ГЭСН*.pdf; do
  base="${pdf%.pdf}"
  python3 gesn_pdf_to_sqlite.py \
    --pdf "$pdf" \
    --db "${base,,}.sqlite3" \
    --log "parse_${base,,}.log" \
    --verbose
done
```

## Структура базы данных

```
gesn_table       - Таблицы ГЭСН (01-01-001, заголовок, измеритель)
gesn_work_step   - Состав работ (пошаговое описание)
gesn_norm        - Нормы (01-01-001-01, вариант)
gesn_resource    - Ресурсы (код, наименование, ед.изм.)
gesn_value       - Значения (норма × ресурс → число)
```

## Что смотреть в лог-файле

| Тег | Значение |
|-----|----------|
| `COLS_ADDED` | Колонки норм успешно распознаны |
| `COLS_NOT_IN_NORMS` | Заголовок колонок не совпал со списком норм |
| `UNMAPPED_VALUE` | Число не привязано к колонке (проблема X-координат) |
| `UNMAPPED_VALUE_CONT` | То же для строк-продолжений |
| `LOW_FILL` | Мало заполненных колонок — проверить вручную |
| `VALUES_WITHOUT_CODE` | Числа есть, а код ресурса не найден |
| `PENDING_NO_VALUES` | Ресурс без значений (аномалия) |
| `NO_COLS_DETECTED` | Не удалось распознать колонки на странице |
| `PAGE_ERROR` | Исключение при обработке страницы (парсинг продолжится дальше) |
| `STATS` | Итоговая статистика (кол-во таблиц/норм/ресурсов/значений/шагов работ) |

## Просмотр результатов

```bash
# Открыть базу
sqlite3 gesn01.sqlite3

# Примеры запросов
.tables
.schema gesn_value

-- Количество записей
SELECT COUNT(*) FROM gesn_table;
SELECT COUNT(*) FROM gesn_norm;
SELECT COUNT(*) FROM gesn_resource;
SELECT COUNT(*) FROM gesn_value;

-- Значения для конкретной нормы
SELECT r.resource_code, r.name, r.unit, v.value
FROM gesn_value v
JOIN gesn_resource r ON v.resource_code = r.resource_code
WHERE v.norm_code = '01-01-001-01';
```

## Известные ограничения

- Парсинг координатный — чувствителен к шрифтам и отступам PDF
- Порог `value_x_max_dist=26` может требовать настройки для других сборников
- "Состав работ" пишется в `gesn_work_step`, но возможны повторы (если PDF дублирует секцию на страницах)
