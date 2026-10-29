#!/usr/bin/env node
/* ics.mjs — booking alarms as a calendar file.

     node tools/ics.mjs [out.ics]    # default: site/booking-alarms.ics

   One event per booking window that hasn't opened yet, computed exactly as
   the briefing computes it (lib/booking.mjs). If the system's release time
   is known (`releaseET` in me/booking.md), the event sits at that minute in
   Eastern time with alarms the evening before and 10 minutes ahead.
   Otherwise it's an all-day event. Rerun it whenever dates move: each UID is
   stable, so re-importing updates events instead of duplicating them. */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTrip } from "./lib/format.mjs";
import { bookingSystems, bookingWindows } from "./lib/booking.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const TODAY = new Date().toISOString().slice(0, 10);
const plain = (s) => String(s ?? "").replace(/\*\*|\*|`/g, "").replace(/\s+/g, " ").trim();
const esc = (s) => plain(s).replace(/([,;\\])/g, "\\$1");

const trips = readdirSync(join(ROOT, "trips")).filter((s) => existsSync(join(ROOT, "trips", s, "trip.md")))
  .map((slug) => ({ slug, ...parseTrip(read(`trips/${slug}/trip.md`)) }))
  .map((t) => ({ slug: t.slug, r: t.registry }))
  .filter((t) => !["done", "shelved"].includes(t.r.status));

/** "YYYY-MM-DD" + "HH:MM" Eastern → UTC "YYYYMMDDTHHMMSSZ". */
export function easternToUtc(iso, hm) {
  const [h, m] = hm.split(":").map(Number);
  const guess = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h, m);
  // What does New York read at that UTC instant? The gap is the offset.
  const ny = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess));
  const p = Object.fromEntries(ny.map((x) => [x.type, x.value]));
  const seen = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess + (guess - seen)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(windows, today = TODAY) {
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//colin-travel-planner//booking alarms//EN", "X-WR-CALNAME:Booking windows"];
  for (const w of windows.filter((x) => x.opens && x.opens >= today).sort((a, b) => (a.opens < b.opens ? -1 : 1))) {
    const uid = `${w.t.slug}-${plain(w.b.what).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}@colin-travel-planner`;
    const what = plain(w.b.what);
    out.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
    if (w.releaseET) {
      const start = easternToUtc(w.opens, w.releaseET);
      out.push(`DTSTART:${start}`, `DURATION:PT15M`);
    } else {
      out.push(`DTSTART;VALUE=DATE:${w.opens.replace(/-/g, "")}`);
    }
    out.push(`SUMMARY:${esc(`🚨 Book: ${what}`)}`,
      `DESCRIPTION:${esc(`${w.b.system} window opens${w.releaseET ? ` ${w.releaseET} ET` : ""}. Trip: ${w.t.slug}. ${w.b.note ?? ""}`)}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Tomorrow: book ${what}`)}`, "TRIGGER:-PT15H", "END:VALARM");
    if (w.releaseET) out.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`10 min: book ${what}`)}`, "TRIGGER:-PT10M", "END:VALARM");
    out.push("END:VEVENT");
  }
  out.push("END:VCALENDAR");
  // RFC 5545 wants CRLF and lines folded at 75 octets.
  return out.map(fold).join("\r\n") + "\r\n";
}

/** Fold one content line at 73 bytes without splitting a character. */
export function fold(line) {
  const parts = [""];
  for (const ch of line) {
    if (Buffer.byteLength(parts.at(-1) + ch) > 73) parts.push("");
    parts[parts.length - 1] += ch;
  }
  return parts.join("\r\n ");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] ?? join(ROOT, "site", "booking-alarms.ics");
  const ics = buildIcs(bookingWindows(trips, bookingSystems(read("me/booking.md"))));
  writeFileSync(file, ics);
  console.log(`wrote ${file}: ${(ics.match(/BEGIN:VEVENT/g) ?? []).length} events`);
}
