import assert from "node:assert/strict";
import test from "node:test";

test("AOSR PDF export returns a non-empty PDF buffer", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  if (!process.env.DATABASE_URL) {
    // pdfGenerator imports storage/db modules, which require DATABASE_URL at import time.
    process.env.DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/postgres";
  }

  try {
    const { generateAosrPdf } = await import("../../server/pdfGenerator");
    const pdfBuffer = await generateAosrPdf({
      actNumber: "SMOKE-1",
      actDate: "2026-02-13",
      city: "Москва",
      objectName: "Тестовый объект",
      objectAddress: "г. Москва, ул. Тестовая, д. 1",
      workDescription: "Смоук-тест генерации PDF",
      dateStart: "2026-02-10",
      dateEnd: "2026-02-13",
    });

    assert.ok(Buffer.isBuffer(pdfBuffer), "Expected Buffer from generateAosrPdf");
    assert.ok(pdfBuffer.length > 1024, "Expected non-trivial PDF size");
    assert.equal(pdfBuffer.subarray(0, 4).toString("utf8"), "%PDF");
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});
