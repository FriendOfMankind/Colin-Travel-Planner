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
