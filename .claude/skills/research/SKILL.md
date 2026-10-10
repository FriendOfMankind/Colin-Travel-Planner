---
name: research
description: Deep research sweep for a trip or idea. Build or refresh its research tree (covered / thin / gap), sweep sources in Colin's preferred order (official pages, Reddit via Apify, YouTube transcripts, blogs, AllTrails, weather), log every finding with provenance, apply plain facts to the plan, and hand Colin a fetch list for walled sources like Facebook and Instagram. Use when Colin says "/research", "research <trip>", "do a sweep", "youtube research", "what don't we know about <trip>", or asks for a research tree.
---

# /research: fill the gaps, show the map

Read `me/research.md` first. It holds his preferences, and they override anything below.

## 1. Load the tree

- For a trip: `trips/<slug>/research.md`. For an idea: a `## Research tree` section in `wishlist/<slug>.md`.
- If there isn't one yet, build it from the plan. Make one branch per leg or region, then one leaf per stop, activity or logistics item (ferries, campgrounds, roads, weather, food, cross-cutting risks). Each leaf gets a status and its best sources so far:
  - ✅ **covered**: an official or first-hand source answers the questions that matter
  - 🟡 **thin**: partly known, or only secondhand, or out of date
  - ⬜ **gap**: nothing yet
  - 🔒 **walled**: the answer lives where I can't read it, so it goes on the fetch list
- Read `log.md` before marking anything. Don't re-research what's already logged.

## 2. Pick targets

Go for ⬜ and 🟡 leaves that **could hurt him or kill a day** (`CLAUDE.md` rule 4), then the ones that decide a booking or a date, then the nice-to-knows. Say which ones you're doing.

## 3. Sweep, in this order

1. **Official pages** (park, ferry, operator). Blocked sites only give search snippets, so label them 📋.
2. **Reddit, through Apify** (`me/research.md` has the input and the rules). Run one subreddit-scoped search per ⬜/🟡/🔒 leaf, using the local name for the place, then read the comments, not just the post. Reddit is the default answer for "what's it actually like in <month>". Don't route it to the fetch list anymore.
3. **YouTube.** Search `site:youtube.com <place> <activity>`, then scrape the best 3–6 for the full transcript and description (Firecrawl scrape, markdown). Prefer recent uploads and the same season. Note the uploader, the upload date, the trip month, and whether it was a sponsored or press trip. Check each description for a linked Google My Maps or location list: that's a pre-geocoded gem list (log the link; coordinates still come from Colin). Pull comments through Apify only per the rule in `me/research.md`.
4. **Blogs and trail sites**, plus AllTrails and AccuWeather through their MCP tools.
5. **Walled sources** (Facebook private groups, Instagram). Search for them, note the exact group or account, and add them to the fetch list. Don't pretend a snippet is the thread.

**Rabbit holes.** Any place name that turns up in two independent local sources (two Reddit commenters, a commenter and a small vlogger) but isn't in `trip.md` is a gem lead. Log it as ⚠️ with both sources and offer it to Colin as a multiple-choice question. Don't add it to the plan yourself.

**Recency and season.** Weight every finding by how recent it is and whether it's the same season. A 2018 comment about June bugs is a data point, not a forecast; say the year next to it. Conditions can vary year to year, so when locals disagree, report the split rather than averaging it.

## 4. Write it down

- **`log.md`**: one dated entry per sweep. Group findings by source, and put the uploader, date and trip month on every video. Quote the useful lines.
- **`trip.md`**: apply facts in place with a "(was: …)" note and provenance. **Decisions don't go in.** A change of plan is a question for Colin, multiple choice.
- **The tree**: update each leaf you touched (status, best sources, the open question), and date it.
- Run `npm test && node tools/index.mjs`. Then branch, PR, and end with "⚠️ not in memory yet, merge PR #N".

## 5. Report

Keep it short, because he's on a phone:
1. **What changes the plan**, with context and options, and your pick
2. **What's newly settled**
3. **Gaps still open**
4. **Fetch list**: group or account, the exact search, and what to look for
5. **Spend**: what the Apify calls cost, roughly
