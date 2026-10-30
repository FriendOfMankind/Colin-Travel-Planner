#!/usr/bin/env node
/* kepler.mjs — one trip as a ready-made Kepler.gl map: data and styling in one file.

     node tools/kepler.mjs <slug>      # writes site/maps/<slug>.kepler.json

   Drag the file onto kepler.gl/demo and the map opens set up: the day lines
   animate (Trip layer), the whole route sits faint underneath, the pins
   appear as the trace reaches their day, and hovering shows name, day and
   note. It's the saved-map format Kepler's own "Export Map → JSON" writes
   (src/schemas in keplergl/kepler.gl, checked against 3.2.6).

   Same data and same honesty as tools/geojson.mjs: verified places only,
   straight lines unless routes.yaml has a GPX for the day, and a fake
   08:00 → 18:00 clock that shows order, not time. */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { tripGeo, loadRoutes } from "./geojson.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// The day colors tools/geojson.mjs uses, so a day looks the same everywhere.
const PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#9a6324", "#469990", "#800000", "#808000", "#000075"];

// Field metadata exactly as Kepler's analyzer reports it, so the loader keeps it.
const F = {
  geojson: (name) => ({ name, type: "geojson", format: "", analyzerType: "GEOMETRY" }),
  int: (name) => ({ name, type: "integer", format: "", analyzerType: "INT" }),
  real: (name) => ({ name, type: "real", format: "", analyzerType: "FLOAT" }),
  str: (name) => ({ name, type: "string", format: "", analyzerType: "STRING" }),
  time: (name) => ({ name, type: "timestamp", format: "YYYY-M-D H:m", analyzerType: "DATETIME" }),
};

/** tripGeo output → Kepler's saved-map JSON. */
export function keplerMap(slug, g) {
  const legs = g.trip;
  const pins = g.flat.filter((f) => f.geometry.type === "Point" && f.properties.day != null);
  const days = [...new Set(legs.map((f) => f.properties.day))].sort((a, b) => a - b);
  const colors = days.map((d) => PALETTE[(d - 1) % PALETTE.length]);

  const route = {
    version: "v1",
    data: {
      id: "route", label: `${g.title}: days`, color: [67, 99, 216],
      fields: [F.geojson("_geojson"), F.int("day"), F.str("date"), F.str("title"), F.str("shape"), F.int("skipped")],
      allData: legs.map((f) => [f, f.properties.day, f.properties.date, f.properties.title, f.properties.shape, f.properties.skipped]),
    },
  };
  const stops = {
    version: "v1",
    data: {
      id: "pins", label: `${g.title}: stops`, color: [230, 25, 75],
      fields: [F.str("name"), F.int("day"), F.str("date"), F.str("title"), F.str("role"), F.str("note"), F.time("time"), F.real("lat"), F.real("lng")],
      allData: pins.map(({ properties: p, geometry: { coordinates: [lng, lat] } }) => [p.name, p.day, p.date, p.title, p.role, p.note ?? "", p.time, lat, lng]),
    },
  };

  const ts = legs.flatMap((f) => f.geometry.coordinates.map((c) => c[3] * 1000));
  const [t0, t1] = [Math.min(...ts), Math.max(...ts)];
  const pinTimes = pins.map((f) => f.properties.timestamp * 1000);
  const lats = pins.map((f) => f.geometry.coordinates[1]), lngs = pins.map((f) => f.geometry.coordinates[0]);
  const span = Math.max(Math.max(...lats) - Math.min(...lats), (Math.max(...lngs) - Math.min(...lngs)) / 1.5);
  const range = { name: "Trip days", type: "custom", category: "Custom", colors };

  const config = {
    version: "v1",
    config: {
      visState: {
        filters: [{
          dataId: ["pins"], id: "pins_by_time", name: ["time"], type: "timeRange",
          value: [Math.min(...pinTimes), Math.max(...pinTimes)],
          view: "enlarged", plotType: { type: "histogram" }, animationWindow: "incremental",
          syncedWithLayerTimeline: true, syncTimelineMode: 1, speed: 1,
        }],
        layers: [
          {
            id: "route_faint", type: "geojson",
            config: {
              dataId: "route", label: "Whole route", color: [140, 140, 140], columns: { geojson: "_geojson" }, isVisible: true,
              visConfig: { opacity: 0.25, thickness: 1.5, stroked: true, filled: false },
            },
            visualChannels: {},
          },
          {
            id: "route_trip", type: "trip",
            config: {
              dataId: "route", label: "Day by day", color: [67, 99, 216], columns: { geojson: "_geojson" }, isVisible: true,
              // Long enough that a day's line stays drawn for the rest of the trip.
              visConfig: { opacity: 0.9, thickness: 4, colorRange: range, trailLength: Math.ceil((t1 - t0) / 1000) + 86400, fadeTrail: false },
            },
            visualChannels: { colorField: { name: "day", type: "integer" }, colorScale: "ordinal" },
          },
          {
            id: "stops", type: "point",
            config: {
              dataId: "pins", label: "Stops", color: [255, 255, 255], columns: { lat: "lat", lng: "lng" }, isVisible: true,
              visConfig: { radius: 9, opacity: 0.95, outline: true, thickness: 2, strokeColor: [30, 30, 30], filled: true, colorRange: range },
            },
            visualChannels: { colorField: { name: "day", type: "integer" }, colorScale: "ordinal" },
          },
        ],
        interactionConfig: {
          tooltip: { enabled: true, fieldsToShow: {
            pins: [{ name: "name", format: null }, { name: "day", format: null }, { name: "date", format: null }, { name: "role", format: null }, { name: "note", format: null }],
            route: [{ name: "title", format: null }, { name: "day", format: null }, { name: "date", format: null }, { name: "shape", format: null }],
          } },
        },
        layerBlending: "normal",
        animationConfig: { currentTime: t0, speed: 1 },
      },
      mapState: {
        bearing: 0, pitch: 0, dragRotate: false, isSplit: false,
        latitude: (Math.max(...lats) + Math.min(...lats)) / 2, longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2,
        zoom: Math.max(2, Math.min(10, Math.log2(360 / Math.max(span, 0.05)) - 0.6)),
      },
      mapStyle: { styleType: "voyager", topLayerGroups: {}, visibleLayerGroups: { label: true, road: true, border: true, water: true, land: true, building: false } },
    },
  };

  return { datasets: [route, stops], config, info: { app: "kepler.gl", created_at: new Date().toString(), title: g.title, description: "Generated by tools/kepler.mjs. Straight lines unless a day has a road GPX; the clock spreads each day's stops 08:00–18:00." } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  if (!slug || !existsSync(join(ROOT, `trips/${slug}/trip.md`))) { console.error("usage: node tools/kepler.mjs <trip-slug>"); process.exit(1); }
  const groups = existsSync(join(ROOT, `trips/${slug}/places.yaml`)) ? YAML.parse(read(`trips/${slug}/places.yaml`)).groups ?? [] : [];
  const g = tripGeo(slug, read(`trips/${slug}/trip.md`), groups, loadRoutes(slug));
  if (g.trip.length === 0) { console.error(`${slug}: no day has two placed stops yet, so there's nothing to animate`); process.exit(1); }
  mkdirSync(join(ROOT, "site/maps"), { recursive: true });
  writeFileSync(join(ROOT, `site/maps/${slug}.kepler.json`), JSON.stringify(keplerMap(slug, g)));
  console.log(`wrote site/maps/${slug}.kepler.json: ${g.trip.length} day lines, ${g.flat.filter((f) => f.geometry.type === "Point" && f.properties.day != null).length} stops`);
}
