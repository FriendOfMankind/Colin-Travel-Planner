/* The bucket list only works if it stays one fact, one home: pointers must
   name real trips and ideas, nothing carries a coordinate, and every item
   says why it's worth the detour. These run on the real bucket.yaml. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseBucket, checkBucket, horizonOf } from "../lib/bucket.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const known = {
  trips: new Set(readdirSync(join(ROOT, "trips")).filter((s) => existsSync(join(ROOT, "trips", s, "trip.md")))),
  ideas: new Set(readdirSync(join(ROOT, "wishlist")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))),
};

test("bucket.yaml is valid", () => {
  const { items } = parseBucket(readFileSync(join(ROOT, "bucket.yaml"), "utf8"));
  assert.ok(items.length > 0, "not empty");
  assert.deepEqual(checkBucket(items, known), []);
});

const base = { id: "x", name: "X", kind: "hike", where: "Somewhere, Ohio", state: "OH", why: "because", status: "want", source: "test", added: "2026-09-30" };
const errs = (over) => checkBucket([{ ...base, ...over }], known);

test("the checks catch what they claim to", () => {
  assert.deepEqual(errs({}), []);
  assert.match(errs({ lat: 40.1, lng: -82 }).join(), /no coordinates/);
  assert.match(errs({ why: "" }).join(), /why is required/);
  assert.match(errs({ kind: "beach" }).join(), /kind must be/);
  assert.match(errs({ state: "Ohio" }).join(), /two-letter/);
  assert.match(errs({ trip: "no-such-trip" }).join(), /doesn't exist in trips/);
  assert.match(errs({ wishlist: "no-such-idea" }).join(), /doesn't exist in wishlist/);
  assert.match(errs({ status: "done" }).join(), /done needs a trip/);
  assert.deepEqual(errs({ status: "done", when: "2019" }), []);
  assert.match(errs({ status: "dropped" }).join(), /reason/);
  assert.match(errs({ months: [0, 13] }).join(), /months/);
  assert.match(checkBucket([base, base], known).join(), /duplicate id/);
});

test("horizon: an explicit value wins, otherwise it's derived", () => {
  assert.deepEqual(horizonOf({ horizon: "only-now", days: 5 }), { horizon: "only-now", derived: false });
  assert.equal(horizonOf({ mode: "weekend", days: 20 }).horizon, "weekend");
  assert.equal(horizonOf({ mode: "drive", days: 26 }).horizon, "only-now");
  assert.equal(horizonOf({ mode: "fly", days: 10 }).horizon, "keeps");
  assert.equal(horizonOf({ mode: "fly" }).horizon, "keeps");
});
