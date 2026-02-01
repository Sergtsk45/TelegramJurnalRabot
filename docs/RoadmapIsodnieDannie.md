1. Общая логика экрана «Исходные данные»
Целевая ментальная модель пользователя

Объект → Участники → Документы → Материалы → Детализация

Именно в таком порядке человек думает на стройке.

2. Верх экрана — контекст, не данные 
 
2.1 Баннер «Объект» (фиксированный) 📌 Важно:
Баннер — не форма. Это якорь контекста. Нажатие → модалка с редактированием.
Содержит:

Название объекта

Короткий адрес / шифр

Статус (черновик / в работе)

Примечания UI:

(S) sticky-блок: объект + стороны всегда сверху.

Кнопки “+” и “Скан” прямо в строке раздела — самый быстрый вход в действие.

2.2 Горизонтальная карусель ролей (chips / cards)

Формат:

Заказчик

Подрядчик

Проектировщик

Ответственные лица

Каждый элемент:

Иконка роли

Название юрлица / ФИО

Индикатор заполненности (● ○)

💡 UX-фишка:

Если данные подтянуты по ИНН → зелёная галка

Если вручную → серая

3. Основная зона — не «таблица», а сценарии
3.1 Карточки-разделы (не табы!)

Почему карточки, а не классические табы:

пальцем проще

сразу видно, что внутри

можно показывать счётчики

Карточки:

📦 Материалы

📄 Документы качества (сертификаты, паспорта)

📐 Исполнительные схемы

🧪 Протоколы / испытания

Каждая карточка:

Название

Краткое описание

Счётчик (12 материалов, 5 документов)

CTA «Добавить»

┌──────────────────────────────────────────┐
│ Исходные                                 |
├──────────────────────────────────────────┤
│ [ Объект: ЖК Сосны, Корпус 2   ▾ ]  (S)  │  ← sticky при скролле
│ Адрес: … (одной строкой)                 │
├──────────────────────────────────────────┤
│ Стороны/участники (горизонтальный скролл)│
│ ┌────────────┐ ┌────────────┐ ┌────────┐ │
│ │Заказчик    │ │Подрядчик   │ │Проект..│ │
│ │ООО “...”   │ │ООО “...”   │ │АО “...”│ │
│ │ИНН …       │ │ИНН …       │ │ИНН …   │ │
│ └────────────┘ └────────────┘ └────────┘ │
│                                          │
├──────────────────────────────────────────┤
│ Разделы                                  │
│ ┌──────────────────────────────────────┐ │
│ │ Материалы                   128  ›   │ │
│ │ + Поставка   Скан           (chips)  │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Документы качества            54  ›  │ │
│ │ + Документ   Скан                    │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Исполнительные схемы          12  ›  │ │
│ │ + Схема      Скан                    │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Протоколы/испытания          18  ›   │ │
│ │ + Протокол   Скан                    │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘

4. Главная боль — материалы с кучей параметров
Решение: НЕ форма. Мастер + шаблоны + партии

┌────────────────────────────┐
│ ← Материалы            ➕  │
├────────────────────────────┤
│ [ 🔍 Поиск по материалам ] │
│ [ из справочника | локальные ] (tabs)
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ Труба стальная DN100   │ │
│ │ 2 партии • 3 док-та    │ │
│ │ Сертификаты: 2         │ │
│ │ [ Партии ] [ Док-ты ]  │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Манометр ДМ2010        │ │
│ │ 1 партия • 1 паспорт   │ │
│ │ [ Партии ] [ Док-ты ]  │ │
│ └────────────────────────┘ │
└────────────────────────────┘

👉 ➕ или «Добавить» → ЭКРАН 2 (мастер добавления)
👉 Тап по материалу → ЭКРАН 5 (карточка материала)

ЭКРАН 2. Мастер добавления материала — Шаг 1

┌────────────────────────────┐
│ ← Добавить материал        │
├────────────────────────────┤
│ Что вы хотите сделать?     │
│                            │
│ (●) Добавить из справочника│
│ (○) Создать новый материал │
│                            │
│                [ Далее ]   │
└────────────────────────────┘

ЭКРАН 3A. Шаг 2 (из справочника)

┌────────────────────────────┐
│ ← Справочник материалов    │
├────────────────────────────┤
│ [ 🔍 Поиск: труба DN ]     │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ Труба стальная DN100   │ │
│ │ ГОСТ 10704-91          │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Труба DN80             │ │
│ │ ГОСТ …                 │ │
│ └────────────────────────┘ │
└────────────────────────────┘
👉 выбор → сразу ЭКРАН 4 (поставка)

ЭКРАН 3B. Шаг 2 (новый материал)

┌────────────────────────────┐
│ ← Новый материал           │
├────────────────────────────┤
│ Наименование               │
│ [ Труба стальная DN100 ]   │
│ Тип                        │
│ [ Материал ▾ ]             │
│ Ед. измерения              │
│ [ м ▾ ]                    │
│                            │
│                [ Далее ]   │
└────────────────────────────┘

ЭКРАН 4. Шаг 3 — Поставка / партия

┌────────────────────────────┐
│ ← Поставка / партия        │
├────────────────────────────┤
│ Поставщик                 │
│ [ ООО «МеталлСнаб» ]      │
│ Производитель             │
│ [ Северсталь ]            │
│ Номер партии              │
│ [ 12345 ]                 │
│ Дата поставки             │
│ [ 12.02.2026 ]            │
│ Количество                │
│ [ 120 ] м                 │
│                            │
│                [ Далее ]   │
└────────────────────────────┘

ЭКРАН 5. Шаг 4 — Документы

┌────────────────────────────┐
│ ← Документы                │
├────────────────────────────┤
│ Добавить документ          │
│ [ 📷 Скан ] [ 📎 Файл ]     │
│ [ ✍️ Ввести вручную ]      │
├────────────────────────────┤
│ ✔ Сертификат №123         │
│   от 01.03.2024            │
│   [ ✓ Использовать в актах]│
└────────────────────────────┘

👉 OCR → автозаполнение → подтверждение
👉 «Готово» → возврат в список материалов

ЭКРАН 6. Карточка материала (детально)

┌────────────────────────────┐
│ ← Труба стальная DN100     │
├────────────────────────────┤
│ 📦 Поставки (2)           │
│ ▾ Партия №12345           │
│   120 м • 12.02.2026      │
│   ▸ Паспорт оборудования  │
│ ▾ Партия №67890           │
│   80 м • 20.03.2026       │
├────────────────────────────┤
│ 📄 Документы качества      │
│ ☑ Сертификат №123 (2024)  │
│ ☐ Сертификат №456 (2023)   │
│                            │
│ ⭐ Сохранить в справочник   │
└────────────────────────────┘

ЭКРАН 7. Документы качества (глобально)

┌────────────────────────────┐
│ ← Документы качества       │
├────────────────────────────┤
│ [ 🔍 Поиск ]               │
├────────────────────────────┤
│ Сертификат №123           │
│ ГОСТ 10704-91             │
│ Используется в 3 объектах │
│                           │
│ Сертификат №456           │
│ Архивный                  │
└────────────────────────────┘
🎯 Что важно в этом wireframe

❌ нет таблиц

❌ нет длинных форм

✅ всё сценариями

✅ материал ≠ партия ≠ документ

✅ один и тот же сертификат:

много материалов

много объектов

один раз в приложениях АОСР

0) Цель и UX-принципы (держим как “definition of done”)
Цель экрана “Материалы”

Быстро добавить материал без простыней полей

Развести:

Материал (тип/модель)

Партия/поставка (на объекте)

Документы (сертификаты/паспорта)

Дать быстрый выход в АОСР:

выбрать какой сертификат применяется

собрать уникальные приложения

Принципы UX (обязательные)

Progressive disclosure: по умолчанию видим только главное, детали — в раскрытии/втором экране

Один экран — одна задача

Нет таблиц на мобилке

Все тяжёлые формы — только мастером (wizard)

“Сохранить” появляется только когда есть изменения

1) UI/UX Wireframe: экран “Материалы” (максимально конкретно)
1.1 Роуты фронта

/source — Исходные (карточки)

/source/materials — Материалы (список)

/source/materials/:id — Материал (детально)

/source/documents — Документы качества (глобальный реестр + привязки)

1.2 Экран A: /source/materials — список материалов объекта
Верхняя панель

← Материалы

справа ➕ (добавить)

ниже строка поиска

ниже сегмент-фильтр:

Все | Из справочника | Локальные | Требуют внимания

Карточка материала в списке (одна строка = один material на объекте)
[Название материала]
[бейджи] 2 партии • 3 док-та • Сертификаты:2 • Паспорта:1
[кнопки] Партии   Документы
[индикатор] ⚠ если нет “док-та качества для актов”

Действия на экране списка

Tap по карточке → детальный экран материала

Tap Партии → открывается bottom sheet со списком партий + “Добавить партию”

Tap Документы → bottom sheet со связанными документами + “Привязать документ”

Tap ➕ → открывается Bottom Sheet “Добавить”:

➕ Добавить из справочника

➕ Создать новый материал

📄 Добавить документ качества (быстрый переход в документы и привязку)

Empty state (очень важно)

Если список пуст:

иллюстрация + 2 кнопки:

Добавить из справочника

Создать новый материал

1.3 Экран B: “Добавить материал” (wizard 4 шага)
Шаг 1: Выбор источника

Из справочника

Новый материал

Шаг 2: Материал

если справочник → поиск и выбор (показываем name, ГОСТ/ТУ, модель)

если новый → 3 поля:

Наименование

Категория (материал/оборудование/изделие)

Ед. изм.
Кнопка: Далее

Шаг 3: Партия/поставка (опционально можно “пропустить”)

Поля:

Поставщик (select из ролей/контрагентов, или текст в MVP)

Производитель/завод

№ партии

Дата поставки

Количество + единица

Кнопки: Пропустить / Далее

Шаг 4: Документы

Кнопки:

📷 Скан (заглушка под OCR)

📎 Файл

✍️ Вручную
После добавления документа — показываем карточку документа с чекбоксом:

✓ Использовать в актах (по умолчанию включено)
Кнопка: Готово

1.4 Экран C: /source/materials/:id — материал детально
Header

← Название материала
справа меню ⋯:

⭐ Сохранить в справочник (если локальный)

Изменить основные данные

Удалить (в dev / под гейт)

Блок 1: Основное

Наименование

ГОСТ/ТУ/модель (если есть)

Ед. изм.

Бейдж: Справочник или Локальный

Блок 2: Партии (accordion list)

Каждая партия:

Партия №, дата, количество

кнопки:

Документы партии

Редактировать

Блок 3: Документы (самое важное)

Табы:

Качество (сертификаты/декларации)

Паспорта

Прочее

Внутри — список документов с:

номер/дата/тип

бейдж global / project

чекбокс Использовать в актах

кнопка Открыть

Кнопка снизу: + Привязать документ (открывает выбор: из реестра / загрузить новый)

Блок 4: Готовность к актам (UX-контроль)

Плашка статуса:

✅ “Готово для актов” (если есть минимум 1 doc quality с use_in_acts=true)

⚠ “Нет документа качества для актов” + кнопка Добавить

1.5 Экран D: Документ (просмотр + привязки)

Открывается как modal/страница:

тип, номер, дата, кем выдан

файл preview/скачать

список привязок:

к каким объектам

к каким материалам

к каким партиям

кнопки:

Привязать ещё

Снять привязку

use_in_acts переключатель (на уровне привязки)

2) DB: схема (Drizzle) — что добавить в shared/schema.ts

Ниже — минимально достаточный набор таблиц с соблюдением правил из rulesdb.mdc.

**Важно**: 
- Все `id` — `bigint GENERATED ALWAYS AS IDENTITY`
- Все таблицы имеют `created_at` и `updated_at` (timestamptz) + триггер `set_updated_at()`
- Все FK имеют явную политику `ON DELETE`
- Все статусы/типы — с CHECK constraints
- `objectId` вместо `projectId` (унификация с существующей схемой)

---

### 2.1 materials_catalog — глобальный справочник материалов

```typescript
materials_catalog = pgTable('materials_catalog', {
  id: bigint('id').generatedAlwaysAsIdentity().primaryKey(),
  name: text('name').notNull(),
  category: text('category'), // 'material' | 'equipment' | 'product'
  standardRef: text('standard_ref'), // ГОСТ/ТУ
  baseUnit: text('base_unit'),
  params: jsonb('params').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // soft delete
}, (t) => ({
  nameIdx: index('materials_catalog_name_idx').on(t.name),
  uniqueName: unique('materials_catalog_name_uniq').on(t.name).where(sql`deleted_at IS NULL`),
}));
```

**CHECK constraints** (добавить в миграции):
```sql
ALTER TABLE materials_catalog 
  ADD CONSTRAINT materials_catalog_category_check 
  CHECK (category IN ('material', 'equipment', 'product') OR category IS NULL);
```

---

### 2.2 project_materials — материал в рамках объекта

```typescript
project_materials = pgTable('project_materials', {
  id: bigint('id').generatedAlwaysAsIdentity().primaryKey(),
  objectId: integer('object_id').notNull().references(() => objects.id, { onDelete: 'restrict' }),
  catalogMaterialId: bigint('catalog_material_id').references(() => materialsCatalog.id, { onDelete: 'setNull' }),
  nameOverride: text('name_override'),
  baseUnitOverride: text('base_unit_override'),
  paramsOverride: jsonb('params_override').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  objectIdIdx: index('project_materials_object_id_idx').on(t.objectId),
  catalogIdIdx: index('project_materials_catalog_id_idx').on(t.catalogMaterialId),
}));
```

---

### 2.3 material_batches — партии/поставки

```typescript
material_batches = pgTable('material_batches', {
  id: bigint('id').generatedAlwaysAsIdentity().primaryKey(),
  objectId: integer('object_id').notNull().references(() => objects.id, { onDelete: 'restrict' }),
  projectMaterialId: bigint('project_material_id').notNull().references(() => projectMaterials.id, { onDelete: 'cascade' }),
  supplierName: text('supplier_name'), // MVP: текст, позже FK на контрагентов
  manufacturer: text('manufacturer'),
  plant: text('plant'),
  batchNumber: text('batch_number'),
  deliveryDate: date('delivery_date'),
  quantity: numeric('quantity', { precision: 14, scale: 3 }), // доменный масштаб для объёмов/масс
  unit: text('unit'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectMaterialIdIdx: index('material_batches_project_material_id_idx').on(t.projectMaterialId),
  quantityCheck: check('material_batches_quantity_check', sql`quantity IS NULL OR quantity >= 0`),
}));
```

---

### 2.4 documents — единый реестр документов

```typescript
documents = pgTable('documents', {
  id: bigint('id').generatedAlwaysAsIdentity().primaryKey(),
  docType: text('doc_type').notNull(),
  scope: text('scope').notNull().default('project'),
  title: text('title'),
  docNumber: text('doc_number'),
  docDate: date('doc_date'),
  issuer: text('issuer'),
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
  meta: jsonb('meta').default({}),
  fileUrl: text('file_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  docTypeIdx: index('documents_doc_type_idx').on(t.docType),
  scopeIdx: index('documents_scope_idx').on(t.scope),
  docNumberIdx: index('documents_doc_number_idx').on(t.docNumber),
}));
```

**CHECK constraints**:
```sql
ALTER TABLE documents 
  ADD CONSTRAINT documents_doc_type_check 
  CHECK (doc_type IN ('certificate', 'declaration', 'passport', 'protocol', 'scheme', 'other'));

ALTER TABLE documents 
  ADD CONSTRAINT documents_scope_check 
  CHECK (scope IN ('global', 'project'));

ALTER TABLE documents
  ADD CONSTRAINT documents_valid_dates_check
  CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to);
```

---

### 2.5 document_bindings — связи документа

```typescript
document_bindings = pgTable('document_bindings', {
  id: bigint('id').generatedAlwaysAsIdentity().primaryKey(),
  documentId: bigint('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  objectId: integer('object_id').references(() => objects.id, { onDelete: 'cascade' }),
  projectMaterialId: bigint('project_material_id').references(() => projectMaterials.id, { onDelete: 'cascade' }),
  batchId: bigint('batch_id').references(() => materialBatches.id, { onDelete: 'cascade' }),
  bindingRole: text('binding_role').notNull().default('quality'),
  useInActs: boolean('use_in_acts').notNull().default(true),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  documentIdIdx: index('document_bindings_document_id_idx').on(t.documentId),
  projectMaterialIdIdx: index('document_bindings_project_material_id_idx').on(t.projectMaterialId),
  objectIdIdx: index('document_bindings_object_id_idx').on(t.objectId),
}));
```

**CHECK constraints**:
```sql
ALTER TABLE document_bindings 
  ADD CONSTRAINT document_bindings_role_check 
  CHECK (binding_role IN ('quality', 'passport', 'protocol', 'scheme', 'other'));

-- Хотя бы одна привязка должна быть указана
ALTER TABLE document_bindings
  ADD CONSTRAINT document_bindings_has_target_check
  CHECK (object_id IS NOT NULL OR project_material_id IS NOT NULL OR batch_id IS NOT NULL);
```

**Важно**: один документ может иметь много связей (разные объекты/материалы/партии).

---

### 2.6 act_material_usages — строки для п.3 "применены" (для АОСР)

```typescript
act_material_usages = pgTable('act_material_usages', {
  id: bigint('id').generatedAlwaysAsIdentity().primaryKey(),
  actId: integer('act_id').notNull().references(() => acts.id, { onDelete: 'cascade' }),
  projectMaterialId: bigint('project_material_id').notNull().references(() => projectMaterials.id, { onDelete: 'restrict' }),
  workId: integer('work_id').references(() => works.id, { onDelete: 'setNull' }), // связь материал ↔ работа
  batchId: bigint('batch_id').references(() => materialBatches.id, { onDelete: 'setNull' }),
  qualityDocumentId: bigint('quality_document_id').references(() => documents.id, { onDelete: 'restrict' }),
  note: text('note'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actIdIdx: index('act_material_usages_act_id_idx').on(t.actId),
  orderIdx: index('act_material_usages_order_idx').on(t.actId, t.orderIndex),
}));
```

**Комментарий**: `workId` добавлен для связи материал ↔ работа (для п.3 АОСР "при выполнении работ применены").
---

### 2.7 act_document_attachments — приложения акта (уникально)

**Важно**: эта таблица **НЕ заменяет** существующую `attachments`. Разделение:
- `attachments` — произвольные файлы акта (фото, сканы, заметки)
- `act_document_attachments` — формальные приложения к АОСР (документы качества из реестра)

```typescript
act_document_attachments = pgTable('act_document_attachments', {
  id: bigint('id').generatedAlwaysAsIdentity().primaryKey(),
  actId: integer('act_id').notNull().references(() => acts.id, { onDelete: 'cascade' }),
  documentId: bigint('document_id').notNull().references(() => documents.id, { onDelete: 'restrict' }),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actIdIdx: index('act_document_attachments_act_id_idx').on(t.actId),
  uniqActDoc: unique('act_document_attachments_act_doc_uniq').on(t.actId, t.documentId),
  orderIdx: index('act_document_attachments_order_idx').on(t.actId, t.orderIndex),
}));
```

**Гарантия**: `UNIQUE(actId, documentId)` — один документ не добавится в акт дважды.

---

### 2.8 Триггеры для updated_at (обязательно)

Для всех таблиц с `updated_at` нужно добавить триггер в миграции:

```sql
-- Функция триггера (создать один раз)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применить к каждой таблице
CREATE TRIGGER materials_catalog_updated_at
  BEFORE UPDATE ON materials_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER project_materials_updated_at
  BEFORE UPDATE ON project_materials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER material_batches_updated_at
  BEFORE UPDATE ON material_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 2.9 Индексы (сводная таблица)

| Таблица | Индекс | Назначение |
|---------|--------|------------|
| `materials_catalog` | `name` | Поиск по названию |
| `project_materials` | `object_id` | Список материалов объекта |
| `project_materials` | `catalog_material_id` | Обратная связь к справочнику |
| `material_batches` | `project_material_id` | Партии материала |
| `documents` | `doc_type`, `scope`, `doc_number` | Фильтрация и поиск |
| `document_bindings` | `document_id` | Привязки документа |
| `document_bindings` | `project_material_id` | Документы материала |
| `document_bindings` | `object_id` | Документы объекта |
| `act_material_usages` | `act_id` | Материалы акта |
| `act_material_usages` | `(act_id, order_index)` | Сортировка в акте |
| `act_document_attachments` | `act_id` | Приложения акта |
| `act_document_attachments` | `(act_id, document_id)` UNIQUE | Дедупликация |
| `act_document_attachments` | `(act_id, order_index)` | Сортировка приложений |

---

3) API: контракты и эндпоинты (Express + shared/routes.ts)

Ниже — MVP-минимум, чтобы UI жил.

3.1 Справочник материалов

GET /api/materials-catalog?query=...

POST /api/materials-catalog (создать новый)

POST /api/project-materials/:id/save-to-catalog
→ создаёт запись в catalog и привязывает catalogMaterialId

3.2 Материалы объекта

GET /api/objects/:objectId/materials

возвращает список project_materials + агрегаты:

batchesCount

docsCount

qualityDocsCount

hasUseInActsQualityDoc

POST /api/objects/:objectId/materials

создаёт project_material (из catalog или локальный)

GET /api/project-materials/:id

детально + партии + документы (bindings)

PATCH /api/project-materials/:id

правка overrides

3.3 Партии

POST /api/project-materials/:id/batches

PATCH /api/material-batches/:id

DELETE /api/material-batches/:id (под гейт)

3.4 Документы и привязки

POST /api/documents (создать документ + файл)

GET /api/documents?query=&docType=&scope=

POST /api/document-bindings (привязать документ)

PATCH /api/document-bindings/:id (useInActs/isPrimary)

DELETE /api/document-bindings/:id

3.5 Привязки к акту (для АОСР)

GET /api/acts/:id/material-usages

PUT /api/acts/:id/material-usages (bulk replace списком)

GET /api/acts/:id/document-attachments

PUT /api/acts/:id/document-attachments (bulk replace, сервер сам dedupe)

4) PDF АОСР: как собрать п.3 и “Приложения” (сервер)
4.1 Что нужно получить при POST /api/acts/:id/export

Перед генерацией PDF сервер делает:

act_material_usages по actId (в порядке orderIndex)

act_document_attachments по actId (уникально, в порядке)

Подтягивает:

project_materials (+ при наличии materials_catalog для базовых полей)

documents (номер/дата/тип)

4.2 Формирование текста для п.3 “При выполнении работ применены:”

Генерируем строку на каждую запись usage:

Пример шаблона:

Материал: {name} ({standardRef}) — Документ: {docType} №{docNumber} от {docDate}

Если qualityDocumentId отсутствует:

Материал: {name} — документ качества: не указан (и помечаем ⚠, но PDF должен собраться)

Итоговый p3MaterialsText:

нумерованный список 1) ... 2) ...

4.3 Формирование “Приложения”

Берём act_document_attachments:

нумерованный список:

Приложение 1 — Сертификат соответствия №... от ...

Приложение 2 — Паспорт №... от ...

Важно:

Если один и тот же документ фигурирует в нескольких usages — в приложениях он один раз, потому что таблица attachments уникальная.

4.4 Как это встраивается в текущий генератор

В server/pdfGenerator.ts (у вас уже есть подстановки плейсхолдеров):

добавляем построение:

p3MaterialsText

attachmentsText

и подставляем в шаблон АОСР (у вас плейсхолдеры уже используются)

5) Инструкция для Cursor: что именно создавать/менять (файлы латиницей)
5.1 Frontend: новые страницы

Создать:

client/src/pages/SourceData.tsx (если ещё нет нового дизайна карточек)

client/src/pages/SourceMaterials.tsx (список)

client/src/pages/SourceMaterialDetail.tsx (детальная)

client/src/pages/SourceDocuments.tsx (реестр документов)

Компоненты (переиспользуемые):

client/src/components/materials/MaterialCard.tsx

client/src/components/materials/MaterialAddSheet.tsx

client/src/components/materials/MaterialWizard.tsx

client/src/components/documents/DocumentCard.tsx

client/src/components/documents/DocumentBindDialog.tsx

Хуки (React Query):

client/src/hooks/use-materials.ts

client/src/hooks/use-documents.ts

client/src/hooks/use-act-materials.ts

5.2 Frontend: роутинг (Wouter)

В client/src/App.tsx добавить маршруты:

/source → SourceData

/source/materials → SourceMaterials

/source/materials/:id → SourceMaterialDetail

/source/documents → SourceDocuments

5.3 Backend: маршруты

В server/routes.ts добавить группы:

materialsCatalog

projectMaterials

materialBatches

documents

documentBindings

actMaterialUsages

actDocumentAttachments

5.4 Storage слой

В server/storage.ts добавить методы:

searchMaterialsCatalog(query)

listProjectMaterials(objectId) (с агрегатами)

getProjectMaterial(id) (с партиями + bindings)

createProjectMaterial(...)

createBatch(...), updateBatch(...)

createDocument(...), searchDocuments(...)

createBinding(...), updateBinding(...)

getActMaterialUsages(actId), replaceActMaterialUsages(actId, list)

getActDocAttachments(actId), replaceActDocAttachments(actId, list)

5.5 Shared routes (Zod)

В shared/routes.ts добавить схемы:

MaterialCatalog

ProjectMaterial

MaterialBatch

Document

DocumentBinding

ActMaterialUsage

ActDocumentAttachment

6) UI-детали, которые делают “максимально эргономично”
6.1 Быстрые действия в списке материалов

свайп вправо: “Добавить партию”

свайп влево: “Привязать документ”
(если не хотите свайпы — кнопки в карточке достаточно)

6.2 Авто-подсказки “чего не хватает”

Если у материала:

нет ни одного quality документа с useInActs=true
→ показываем:

⚠ бейдж “Не готово для актов”

CTA “Добавить сертификат”

6.3 Мульти-сертификаты

В детальном экране:

чекбоксы на каждом сертификате:

Использовать в актах

Основной (radio/звезда) — только один isPrimary=true

6.4 “Сохранить в справочник”

Показывать только если:

catalogMaterialId == null
и только для блока “Основное”, без партий/доков.

7) Как связать это с АОСР в UI (минимально, но правильно)

Добавить на экран акта (или в акт-редактор) блок:

“Материалы для п.3”

выбрать из материалов объекта

выбрать сертификат (если их несколько)

упорядочить

“Приложения”

автособрать из выбранных сертификатов + паспортов

пользователь может отключить документ (toggle)

Это можно сделать позже, но модель уже должна это поддерживать.

---

## 8) Разрешение коллизии: attachments vs act_document_attachments

**Решение**: использовать **две отдельные таблицы** (вариант B).

### Семантика разделения

| Таблица | Назначение | Пример использования |
|---------|------------|----------------------|
| `attachments` | Произвольные файлы акта (фото, сканы, заметки) | "фото_монтажа.jpg", "схема_от_прораба.pdf", "заметка.txt" |
| `act_document_attachments` | Формальные приложения к АОСР (документы качества из реестра `documents`) | Сертификат №123, Паспорт №456, Протокол испытаний №789 |

### Почему две таблицы, а не одна?

1. **Чистая нормализация**: документ качества хранится в одном месте (`documents`), используется многократно в разных актах без дублирования
2. **Дедупликация**: `UNIQUE(actId, documentId)` гарантирует, что один документ не добавится в акт дважды
3. **Целостность**: `ON DELETE RESTRICT` на `documentId` — документ нельзя удалить из реестра, пока используется в актах
4. **Простота валидации**: все поля `NOT NULL`, никаких `OR` в CHECK constraints
5. **Независимая эволюция**: можно расширять функциональность документов качества (привязки к материалам, партиям) без влияния на простые файлы

### Стратегия миграции

1. **Сейчас**: создать новые таблицы `documents`, `document_bindings`, `act_document_attachments`
2. **Переходный период**: старые данные в `attachments` остаются как есть, новый функционал использует новые таблицы
3. **Позже (опционально)**: если нужно — мигрировать старые `attachments` с `type IN ('certificate', 'passport')` в `documents` + `act_document_attachments`
4. **В PDF-генераторе**: объединить оба источника при формировании раздела "Приложения"

### Пример кода для PDF-генератора

```typescript
// Формальные приложения (документы качества)
const docAttachments = await db
  .select({
    id: documents.id,
    docType: documents.docType,
    docNumber: documents.docNumber,
    docDate: documents.docDate,
    orderIndex: actDocumentAttachments.orderIndex,
  })
  .from(actDocumentAttachments)
  .innerJoin(documents, eq(documents.id, actDocumentAttachments.documentId))
  .where(eq(actDocumentAttachments.actId, actId))
  .orderBy(actDocumentAttachments.orderIndex);

// Дополнительные файлы (если нужны в PDF)
const fileAttachments = await db
  .select()
  .from(attachments)
  .where(eq(attachments.actId, actId));

// Формируем раздел "Приложения"
const appendixText = docAttachments
  .map((d, i) => `${i+1}. ${d.docType} №${d.docNumber} от ${formatDate(d.docDate)}`)
  .join('\n');
```

Это обеспечивает:
- Уникальность документов в приложениях (один сертификат = одна строка)
- Правильную нумерацию
- Возможность добавлять дополнительные файлы из `attachments` при необходимости