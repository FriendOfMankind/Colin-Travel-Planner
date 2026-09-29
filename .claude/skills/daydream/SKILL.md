---
name: daydream
description: Explore travel ideas without planning a trip. Riff on one wishlist idea, chase an activity that caught Colin's eye ("I want to see synchronous fireflies"), hunt for hidden gems, or ask "what fits 10 days in May?". Research lands in wishlist/<slug>.md as dated notes with sources. Use when Colin says "/daydream", "daydream", "what about…", "I've been thinking about…", "where could I…", "hidden gems", or asks about a place that isn't a planned trip.
---

# /daydream: explore without committing

This is the sandbox. Exploring is the point, and nothing here needs a date or a booking. `me/working-rules.md` says it plainly: don't comment on plans changing or staying unbooked, and don't push to book. Your job is to make the daydream **better informed**: find the thing he didn't know, say which of his own rules an idea breaks, and keep what you learn so the next daydream starts ahead of this one.

## 1. Work out which kind of daydream this is

| Colin says | Mode | Start from |
|---|---|---|
| "/daydream capitol-reef", "tell me more about the Uintas" | **Riff on one idea** | `wishlist/<slug>.md`, all of it, research notes included |
| "I want to raft something big", "where can I see hellbenders?" | **Chase an activity** | `me/adventures.md` (his rules for that activity), then search |
| "hidden gems in the Southwest", "what's weird near Utah?" | **Find gems** | `me/principles.md`, `me/hiking.md`, then search |
| "what fits 10 days in May?", "something I can drive to in April" | **Match a window** | `INDEX.md` wishlist lines (`months`, `mode`), `me/calendar.md` |

If it's unclear, ask one multiple-choice question. Don't guess.

## 2. Read what he already knows and wants

Always read `INDEX.md` first (it lists every idea with its months and mode), plus these:

- `me/principles.md`, `me/hiking.md`, `me/travel-style.md` and `me/camping.md`: the ceilings and the shape of a good day
- `me/declined.md`: **never re-propose a declined activity.** If an idea hinges on one, say so and stop.
- `me/adventures.md`: rivers, caves, wildlife, fossils, and the swap rule for when one earns a day
- `me/calendar.md`: the horizon (full-time work starts 2027-08-31) and `modeFit`, which sets the minimum days a fly or drive trip is worth

**Search before you add.** `grep -ril "<place or activity>" wishlist/ trips/`. The idea may already exist, or may already have been declined on purpose. `wishlist/kenai-peninsula.md` records a PNW + Alaska bundle that was considered and declined. Don't re-open a decision like that cold. Name it, and ask whether he wants to.

## 3. Research

- **Tools that work:** Firecrawl search and scrape, the AllTrails MCP (trail stats, nearby trails) and AccuWeather (climate normals by month).
- **Blocked here:** `nps.gov`, `recreation.gov`, `parks.canada.ca`, `overpass-api.de` and `nominatim.openstreetmap.org`. Facts from those sites come back only as search-result snippets. Label them that way: *(source: nps.gov/xxx, search snippet, 2026-10)*.
- **Every fact gets a source and the date you read it.** A daydream is where unverified leads are welcome, but they stay labelled: ✅ read on the page itself · 📋 from a search snippet or secondary source · ⚠️ unverified lead or inference.
- **What makes a hidden gem, for Colin:** a place that answers "why does this landscape look like this?"; one that's quiet because it's hard to find, not because it's bad; one where the effort-to-payoff ratio fits a car-camping, day-hiking trip. Blue Heron taught that "polished and interpretive" disappoints and "raw and explorable" delights (`trips/kentucky-2026/log.md`).
- **Turn his own rules on the idea.** If it breaks a ceiling, a principle or the horizon, say so specifically, citing the file. Ask whether it gets harder to do on two weeks of PTO after 2027-08-31. That question is what decides a trip's priority in `me/calendar.md`, not your enthusiasm.

## 4. Talk first, then offer to keep it

Reply conversationally: what you found, what surprised you, what it costs, and what you couldn't confirm. Keep it short on a phone. Then offer **multiple choice** for what happens to it:

- **Keep the notes** on an existing idea (the default when riffing)
- **Add it** as a new idea
- **Update the pitch:** the idea's *Why* or *Next* changed because of what we learned
- **Drop it**, with a one-line reason in the notes so it isn't re-researched from scratch
- **Nothing:** it was just chat

Don't write anything he didn't pick.

## 5. Write it down

**Research notes** go under `## Research notes` in `wishlist/<slug>.md`, newest last, as a level-3 heading:

```markdown
### 2026-10-02 · Fireflies at Congaree
- ✅ Synchronous fireflies (*Photuris frontalis*) peak mid-May to early June *(source: example.org/page, 2026-10-02)*
- 📋 Lottery-free, unlike Elkmont *(source: nps.gov/cong, search snippet, 2026-10-02)*
- ⚠️ Would pair with a Sipsey trip? Not checked
- Colin: "that's the one I'd drive for" *(stated 2026-10-02)*
```

**Update, don't append.** If a note makes the *Why* or *Next* wrong, change that text in place, add `(was: …)` if the history matters, and set `updated:` to today.

**A new idea** is `wishlist/<slug>.md` in the same shape as its neighbours. Copy one. It needs:

- `slug`, `title`, `subtitle`, `status: wishlist`
- `months` and `mode` (`drive` / `fly` / `weekend`). **These are required.** They're what "what fits May?" matches against, and an idea without them can never be offered for a window.
- `region`, `tags`, `updated` (today), and `source: daydream YYYY-MM-DD`
- `## Why`, `## Next`, `## Research notes`

**Never invent:** a coordinate (leave `coords` out unless you copied a region centroid from a source), a price, a fee, a booking window or opening hours. Write `TBD` or name the source. A sunrise or booking-window date is computed, never typed.

**Promoting an idea to a trip** means `trips/<slug>/` with a real `trip.md`. That's `/new-trip`'s job, and `/new-trip` isn't built yet for this repo. Say so, and keep the research here until it is.

## 6. Save it

```bash
npm test && node tools/index.mjs
git add -A && git commit -m "daydream: <slug> — <what was learned>"
git push -u origin <session branch>
```

Open a PR into `main` and **merge it once checks pass**, but only if the diff touches nothing beyond `wishlist/` and `INDEX.md`. Picking "keep" or "add" is Colin's approval for that. Anything else (a `me/` change, a trip plan) waits for him. A preference that surfaced while daydreaming ("I'd never do a boat tour") belongs to `/remember`, not in a wishlist note. Offer it.

## Verify it landed. Never skip this step.

```bash
git fetch origin main && git merge-base --is-ancestor HEAD origin/main && echo IN-MAIN
```

If `IN-MAIN` didn't print, make the first line of your reply: *"⚠️ Saved on branch `<name>` but NOT in memory yet."* Never report a daydream as saved when it isn't on `main`.
