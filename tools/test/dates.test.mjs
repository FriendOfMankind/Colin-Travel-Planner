import { test } from "node:test";
import assert from "node:assert/strict";
import { monthsBefore } from "../lib/dates.mjs";

test("booking windows count back whole months from the first night", () => {
  assert.equal(monthsBefore("2027-07-15", 6), "2027-01-15"); // recreation.gov, Slough Creek
  assert.equal(monthsBefore("2027-03-08", 6), "2026-09-08"); // across a year boundary
  assert.equal(monthsBefore("2027-08-31", 6), "2027-02-28"); // clamped, not rolled into March
  assert.equal(monthsBefore("2028-08-31", 6), "2028-02-29"); // leap year
  assert.equal(monthsBefore("2027-03-05", 12), "2026-03-05");
});

test("day-counted windows (Cadillac's 90 days) count back calendar days", async () => {
  const { daysBefore, bookingWindows } = await import("../lib/booking.mjs");
  assert.equal(daysBefore("2027-05-26", 90), "2027-02-25");
  assert.equal(daysBefore("2027-03-01", 1), "2027-02-28");
  const [w] = bookingWindows([{ r: { booking: [{ system: "s", what: "x", target: "2027-05-26" }] } }], { s: { lead: null, leadDays: 90 } });
  assert.equal(w.opens, "2027-02-25");
});
