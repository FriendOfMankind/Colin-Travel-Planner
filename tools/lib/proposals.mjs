/* proposals.mjs — the invite-page tracker, share/proposals.yaml.

   A proposal is a page Colin sends to people he's inviting on a trip. The
   page lives on claude.ai; this file keeps the list of them, who each is
   for, where it stands, and the date its content is as of, so a page that
   has fallen behind its plan gets noticed before it's sent. */

import YAML from "yaml";

export const STATUSES = ["draft", "sent", "in", "out", "parked", "superseded", "unknown"];
/** Still in play: someone may read it, so it should match the plan. */
export const LIVE = ["draft", "sent", "in", "unknown"];
export const FORMATS = ["page", "doc"];

export const parseProposals = (text) => YAML.parse(text) ?? [];

/** Every trip a proposal belongs to: `trip`, then any in `also` (a page
    that covers more than one trip, like the ride-along page). */
export const tripsOf = (p) => [p.trip, ...(p.also ?? [])].filter(Boolean);

const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

/** The newest dated change in a proposal's plan: the last log entry of its
    trip, or its wishlist file's `updated:`. `read(rel)` returns the file's
    text or null. Returns { date, where } or null. */
export function planChanged(p, read) {
  let best = null;
  for (const slug of tripsOf(p)) {
    const log = read(`trips/${slug}/log.md`) ?? "";
    const d = [...log.matchAll(/^## (\d{4}-\d{2}-\d{2}) · /gm)].map((m) => m[1]).sort().pop();
    if (d && (!best || d > best.date)) best = { date: d, where: `trips/${slug}/log.md` };
  }
  if (p.wishlist) {
    const m = /^updated:\s*(\S+)/m.exec(read(`wishlist/${p.wishlist}.md`) ?? "");
    if (m && (!best || m[1] > best.date)) best = { date: m[1], where: `wishlist/${p.wishlist}.md` };
  }
  return best;
}

/** A live proposal is behind when its plan changed after it was last
    published or re-checked, or when a known mismatch is written down. */
export function behind(p, read) {
  if (!LIVE.includes(p.status)) return null;
  const synced = later(String(p.asOf ?? ""), p.checked ? String(p.checked) : "");
  const c = planChanged(p, read);
  const moved = c && c.date > synced ? c : null;
  return moved || p.stale ? { since: synced, changed: moved, stale: p.stale ?? null } : null;
}
