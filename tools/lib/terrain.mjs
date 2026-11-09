// Elevation for the fun maps (tools/fly.mjs, tools/poster.mjs).
//
// Source: Mapzen "Terrarium" terrain tiles on AWS Open Data
// (s3.amazonaws.com/elevation-tiles-prod), a mosaic of SRTM, USGS NED/3DEP
// and others. Elevations are a DEM's, good for drawing, never for a summit
// height or a trailhead elevation in a plan.
//
// Tiles are fetched with curl (it follows the session's proxy; Node's fetch
// doesn't) and cached in .cache/terrain/, so a second run needs no network.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const TERRAIN_SOURCE = "Mapzen Terrarium terrain tiles (AWS Open Data; SRTM, USGS 3DEP and others)";
const CACHE = path.resolve(".cache/terrain");
const HOST = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const mem = new Map();

// A minimal PNG reader: 8-bit RGB or RGBA, not interlaced. That's every Terrarium tile.
export function decodePng(buf) {
  let p = 8, width = 0, height = 0, channels = 3;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      const depth = data[8], color = data[9], interlace = data[12];
      if (depth !== 8 || ![2, 6].includes(color) || interlace) throw new Error(`unsupported PNG (depth ${depth}, colour ${color}, interlace ${interlace})`);
      channels = color === 6 ? 4 : 3;
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * channels, out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[dst + x - channels] : 0, b = y ? out[dst + x - stride] : 0, c = x >= channels && y ? out[dst + x - stride - channels] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  return { width, height, channels, data: out };
}

function tile(z, x, y) {
  const n = 2 ** z;
  x = ((x % n) + n) % n; y = Math.max(0, Math.min(n - 1, y));
  const key = `${z}/${x}/${y}`;
  if (mem.has(key)) return mem.get(key);
  const file = path.join(CACHE, `${z}-${x}-${y}.png`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(CACHE, { recursive: true });
    execFileSync("curl", ["-sSf", "--retry", "4", "--retry-delay", "2", "-m", "60", "-o", file, `${HOST}/${key}.png`]);
  }
  const png = decodePng(fs.readFileSync(file)), el = new Float32Array(png.width * png.height);
  for (let i = 0, j = 0; i < el.length; i++, j += png.channels) el[i] = png.data[j] * 256 + png.data[j + 1] + png.data[j + 2] / 256 - 32768;
  mem.set(key, el);
  return el;
}

const px = (z, gx, gy) => tile(z, Math.floor(gx / 256), Math.floor(gy / 256))[(gy & 255) * 256 + (gx & 255)];

// Elevation in metres at a point, bilinear between tile pixels.
export function elevation(lon, lat, z) {
  const n = 256 * 2 ** z, s = Math.sin((lat * Math.PI) / 180);
  const fx = ((lon + 180) / 360) * n - 0.5, fy = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  return (px(z, x0, y0) * (1 - tx) + px(z, x0 + 1, y0) * tx) * (1 - ty) + (px(z, x0, y0 + 1) * (1 - tx) + px(z, x0 + 1, y0 + 1) * tx) * ty;
}

// The zoom whose pixels are about `metres` across at this latitude (capped: z12 is ~25 m).
export const zoomFor = (metres, lat, max = 12) =>
  Math.max(0, Math.min(max, Math.ceil(Math.log2((156543.03 * Math.cos((lat * Math.PI) / 180)) / metres))));

const KM_LAT = 110.574, kmLon = (lat) => 111.32 * Math.cos((lat * Math.PI) / 180);

// A grid of elevations over a box, row 0 at the north edge, evenly spaced in lon and lat.
// `cells` is the count along the longer side.
export function grid({ w, s, e, n }, cells, maxZoom = 12) {
  const lat0 = (s + n) / 2, wKm = (e - w) * kmLon(lat0), hKm = (n - s) * KM_LAT;
  const cell = Math.max(wKm, hKm) / (cells - 1);
  const nx = Math.max(2, Math.round(wKm / cell) + 1), ny = Math.max(2, Math.round(hKm / cell) + 1);
  const z = zoomFor(cell * 1000, lat0, maxZoom), data = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    data[j * nx + i] = elevation(w + ((e - w) * i) / (nx - 1), n - ((n - s) * j) / (ny - 1), z);
  return { w, s, e, n, nx, ny, z, wKm, hKm, data };
}

// Pad a lon/lat box by a fraction of its size and at least `minKm` on every side.
export function pad(box, frac, minKm) {
  const lat0 = (box.s + box.n) / 2;
  const dx = Math.max(((box.e - box.w) * frac), minKm / kmLon(lat0)), dy = Math.max((box.n - box.s) * frac, minKm / KM_LAT);
  return { w: box.w - dx, e: box.e + dx, s: box.s - dy, n: box.n + dy };
}

export const boxOf = (coords) => coords.reduce((b, [lon, lat]) => ({ w: Math.min(b.w, lon), e: Math.max(b.e, lon), s: Math.min(b.s, lat), n: Math.max(b.n, lat) }), { w: 180, e: -180, s: 90, n: -90 });

export function haversineKm([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180, a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
