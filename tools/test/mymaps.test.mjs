import { test } from "node:test";
import assert from "node:assert/strict";
import { readKml, compare, staleCount } from "../mymaps.mjs";

const pin = (name, lng, lat) => `<Placemark><name>${name}</name><Point><coordinates>${lng},${lat},0</coordinates></Point></Placemark>`;
const line = (name, c) => `<Placemark><name>${name}</name><LineString><tessellate>1</tessellate><coordinates>${c}</coordinates></LineString></Placemark>`;
const kml = (...p) => `<kml><Document><Folder>${p.join("")}</Folder></Document></kml>`;

test("readKml: CDATA and entities in names, altitude dropped", () => {
  const k = readKml(kml(pin("<![CDATA[St. John's]]>", -52.7, 47.56), line("Day 1 · A &amp; B", "-1,2,0 -1.5,2.5,0")));
  assert.deepEqual([...k.pins], [["St. John's", [-52.7, 47.56]]]);
  assert.deepEqual([...k.lines], [["Day 1 · A & B", [[-1, 2], [-1.5, 2.5]]]]);
});

test("compare: a current map is clean; drift is named", () => {
  const want = readKml(kml(pin("Camp", -110, 44), pin("Trailhead", -110.1, 44.1), line("Day 1 · Go", "-110,44 -110.1,44.1")));
  assert.equal(staleCount(compare(want, want)), 0);
  const got = readKml(kml(pin("Camp", -110.002, 44), pin("Old spot", -100, 40), line("Day 1 · Go", "-110,44 -110.2,44.1"), line("Day 2 · Gone", "0,0 1,1")));
  const d = compare(want, got);
  assert.deepEqual(d.pinsMissing, ["Trailhead"]);
  assert.deepEqual(d.pinsExtra, ["Old spot"]);
  assert.equal(d.pinsMoved.length, 1); // 0.002° of longitude at 44° N is ~160 m
  assert.deepEqual(d.linesChanged, ["Day 1 · Go"]);
  assert.deepEqual(d.linesExtra, ["Day 2 · Gone"]);
});
