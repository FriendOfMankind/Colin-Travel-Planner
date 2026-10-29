import { test } from "node:test";
import assert from "node:assert/strict";
import { easternToUtc, fold, buildIcs } from "../ics.mjs";

test("Eastern release times convert across daylight saving", () => {
  assert.equal(easternToUtc("2027-01-14", "10:00"), "20270114T150000Z"); // EST, UTC-5
  assert.equal(easternToUtc("2027-07-01", "10:00"), "20270701T140000Z"); // EDT, UTC-4
});

test("folding never splits a multibyte character", () => {
  const line = "SUMMARY:" + "🚨 Book: Ünïcödé ".repeat(10);
  for (const part of fold(line).split("\r\n ")) {
    assert.ok(Buffer.byteLength(part) <= 73);
    assert.ok(!part.includes("�"));
  }
  assert.equal(fold(line).split("\r\n ").join(""), line);
});

test("only windows that haven't opened become events", () => {
  const t = { slug: "x" };
  const ics = buildIcs([
    { t, b: { what: "Past", system: "s" }, opens: "2026-01-01", releaseET: "10:00" },
    { t, b: { what: "Future", system: "s" }, opens: "2027-01-14", releaseET: null },
  ], "2026-10-29");
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.match(ics, /DTSTART;VALUE=DATE:20270114/);
});
