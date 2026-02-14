import assert from "node:assert/strict";
import test from "node:test";
import { generateAosrPdf } from "../../server/pdfGenerator";

test("AOSR PDF export returns a non-empty PDF buffer", async () => {
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
});
