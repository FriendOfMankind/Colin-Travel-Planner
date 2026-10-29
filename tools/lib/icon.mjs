/* icon.mjs — the home-screen icon, drawn from one shape list so the SVG
   and the PNGs can't drift apart: a forest square, a blaze-yellow sun and a
   ridge line, in the site's own colours (site/src/app.css).

   iOS ignores SVG for apple-touch-icon and Android wants 192/512 PNGs, so
   the PNGs are rasterised here with node:zlib. No image dependency. */

import { deflateSync } from "node:zlib";

const BG = "#2e6a4f", SUN = "#e4b02e", RIDGE = "#f4f6f3";
// On a 64-unit grid. Kept inside the middle 80% so a round mask doesn't clip it.
const SUN_C = { x: 42, y: 22, r: 6.5 };
const RIDGE_PTS = [[8, 50], [24, 25], [33, 38], [41, 29], [56, 50]];

export function svgIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${BG}"/>`
    + `<circle cx="${SUN_C.x}" cy="${SUN_C.y}" r="${SUN_C.r}" fill="${SUN}"/>`
    + `<path d="M${RIDGE_PTS.map((p) => p.join(" ")).join("L")}Z" fill="${RIDGE}"/></svg>`;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function inside(x, y, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function colourAt(x, y) {
  if (inside(x, y, RIDGE_PTS)) return RIDGE;
  if ((x - SUN_C.x) ** 2 + (y - SUN_C.y) ** 2 <= SUN_C.r ** 2) return SUN;
  return BG;
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
export function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** A square RGB PNG of the icon, 4×4 supersampled so the edges are smooth. */
export function pngIcon(size) {
  const S = 4, raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const c = rgb(colourAt(((x + (sx + 0.5) / S) * 64) / size, ((y + (sy + 0.5) / S) * 64) / size));
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(acc[k] / (S * S));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolour
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
