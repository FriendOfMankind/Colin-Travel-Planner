/* booking.mjs — when each unbooked reservation opens, computed from the
   files. now.mjs prints it; ics.mjs turns it into calendar alarms.

   A window's date is the first night minus me/booking.md's leadMonths for
   that system, or a published `opens:` date a booking row carries with its
   `opensSource:`. Never typed arithmetic. `releaseET` on a system row is the
   clock time the window opens, in Eastern time (Colin is in Ohio). */

import YAML from "yaml";
import { monthsBefore } from "./dates.mjs";

/** me/booking.md text → { [system]: { lead, anytime, releaseET } }. */
export function bookingSystems(md) {
  const out = {};
  for (const m of md.matchAll(/```yaml\n([\s\S]*?)```/g)) {
    for (const row of YAML.parse(m[1]) ?? []) {
      out[row.system] = { lead: row.leadMonths ?? null, anytime: !!row.anytime, releaseET: row.releaseET ?? null };
    }
  }
  return out;
}

/** Every unbooked booking row across trips → { slug, title, b, opens, anytime, releaseET }. */
export function bookingWindows(trips, systems) {
  const out = [];
  for (const t of trips) for (const b of t.r.booking ?? []) {
    if (b.booked || b.done || !b.target) continue;
    const sys = systems[b.system] ?? {};
    const opens = b.opens && b.opensSource ? String(b.opens) : sys.lead == null ? null : monthsBefore(b.target, sys.lead);
    out.push({ t, b, opens, anytime: !opens && !!sys.anytime, releaseET: b.releaseET ?? sys.releaseET ?? null });
  }
  return out;
}
