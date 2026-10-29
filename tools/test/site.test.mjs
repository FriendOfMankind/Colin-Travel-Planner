import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { scriptJson, serviceWorker, manifest } from "../lib/site.mjs";
import { pngIcon, svgIcon, crc32 } from "../lib/icon.mjs";

test("the data blob can't close its <script> tag and still parses", () => {
  const data = { html: "<p>a</p><script>x</script><!-- c --> <b>", n: [1, "</SCRIPT>"] };
  const s = scriptJson(data);
  assert.ok(!/<\/script/i.test(s));
  assert.ok(!s.includes("<!--"));
  assert.deepEqual(JSON.parse(s), data);
  assert.deepEqual(new Function(`return ${s}`)(), data); // as the page reads it
});

test("the service worker is valid JS, versioned, and precaches the page", () => {
  const src = serviceWorker("abc123", ["index.html", "icon.svg"]);
  assert.doesNotThrow(() => new Function(src));
  assert.match(src, /const VERSION = "tn-abc123"/);
  assert.match(src, /"\.\/index\.html","\.\/icon\.svg"/);
});

test("the manifest's icons are files the build writes", () => {
  const m = manifest();
  assert.equal(m.start_url, "./#now");
  for (const i of m.icons) assert.match(i.src, /^icon(-\d+\.png|\.svg)$/);
});

test("the icon PNG is well formed at the requested size", () => {
  const png = pngIcon(48);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.readUInt32BE(16), 48);
  assert.equal(png.readUInt32BE(20), 48);
  // Every chunk's CRC checks out, and the pixels inflate to 48 rows of 1 + 48×3 bytes.
  let at = 8, idat = [];
  while (at < png.length) {
    const len = png.readUInt32BE(at), type = png.subarray(at + 4, at + 8).toString("ascii");
    assert.equal(png.readUInt32BE(at + 8 + len), crc32(png.subarray(at + 4, at + 8 + len)), type);
    if (type === "IDAT") idat.push(png.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  assert.equal(inflateSync(Buffer.concat(idat)).length, 48 * (1 + 48 * 3));
  assert.match(svgIcon(), /^<svg [^>]*viewBox="0 0 64 64"/);
});

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
});
