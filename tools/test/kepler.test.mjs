import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { tripGeo, loadRoutes } from "../geojson.mjs";
import { keplerMap } from "../kepler.mjs";

const TRIPS = join(dirname(fileURLToPath(import.meta.url)), "../../trips");

// Kepler binds layers, filters and tooltips to datasets by id, and reads each
// row positionally against its fields. A mismatch loads as an empty map.
for (const slug of readdirSync(TRIPS)) {
  const places = join(TRIPS, slug, "places.yaml");
  const g = tripGeo(slug, readFileSync(join(TRIPS, slug, "trip.md"), "utf8"), existsSync(places) ? YAML.parse(readFileSync(places, "utf8")).groups : [], loadRoutes(slug));
  if (!g.trip.length) continue;
  test(`${slug}: Kepler map binds to its own datasets and fields`, () => {
    const m = keplerMap(slug, g);
    const ids = new Set(m.datasets.map((d) => d.data.id));
    for (const d of m.datasets) {
      const names = d.data.fields.map((f) => f.name);
      for (const row of d.data.allData) assert.equal(row.length, names.length, `${d.data.id}: row width`);
      for (const f of d.data.fields) assert.ok(f.format !== undefined && f.analyzerType, `${d.data.id}.${f.name}: format + analyzerType, or Kepler re-guesses the type`);
    }
    const vs = m.config.config.visState;
    const field = (id, name) => m.datasets.find((d) => d.data.id === id).data.fields.some((f) => f.name === name);
    for (const l of vs.layers) {
      assert.ok(ids.has(l.config.dataId), `${l.id}: dataset ${l.config.dataId}`);
      for (const col of Object.values(l.config.columns)) assert.ok(field(l.config.dataId, col), `${l.id}: column ${col}`);
    }
    for (const f of vs.filters) for (const [i, id] of f.dataId.entries()) assert.ok(field(id, f.name[i]), `${f.id}: ${id}.${f.name[i]}`);
    for (const [id, fs] of Object.entries(vs.interactionConfig.tooltip.fieldsToShow)) for (const f of fs) assert.ok(field(id, f.name), `tooltip ${id}.${f.name}`);
    assert.ok(vs.layers.some((l) => l.type === "trip"), "has the animated layer");
  });
}
