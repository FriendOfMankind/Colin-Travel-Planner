---
topic: declined
summary: Activities considered and declined. Re-proposing these wastes his time.
source: Trees@c6e693c data/profile.js (rebuilt there 2026-09-04 from the Sept 2026 handoff, the 2026 MASTER trip files, the MEALS files and the Sept 3 2026 bucket list)
declined:
  - what: Mountain biking, including renting one in Brevard
    terms: [ mountain bike, mountain biking ]
  - what: Bridge Walk, highline and zipline tickets (New River Gorge)
    terms: [ bridge walk, highline, zipline ]
    allow: [ highline trail ]
  - what: Big South Fork Scenic Railway
    terms: [ scenic railway ]
  - what: Via ferrata at Torrent Falls
    terms: [ via ferrata ]
  - what: The Cumberland Falls moonbow
    terms: [ moonbow ]
  - what: Dedicated stargazing sessions (driving to a dark-sky site, waiting up for it). Stars seen during a night hike or night exploring are great; narrowed 2026-09-27, was "Stargazing"
    terms: [ stargazing, stargaze ]
  - what: Breweries
    terms: [ brewery, breweries ]
---

# Declined

The list is `declined` in this file's frontmatter. `terms` are what the validator greps itineraries for; `allow` are phrases that contain a term but are fine.

Considered and declined. Re-proposing these wastes his time.

`terms` is what tools/validate.mjs greps trip content for, so a declined
thing reappearing in an itinerary is caught by the validator instead of by
reading the page. Keep terms specific enough not to fire on ordinary prose.

⚠️ Live conflict, unresolved on purpose: stargazing is declined here, and
the Maui 2027 page schedules a dark-sky window on the morning of 5/19. The
declined list is from the Sept 2026 handoff; Maui was planned earlier. The
validator now reports this every run rather than leaving it as a comment
nobody reads. Resolve it in one direction — don't silence it.

**Resolved 2026-09-27:** stars at Blevins farm during a night exploration were part of a highlight. The rule is *incidental is great, dedicated sessions are no*, and the entry above was narrowed to match. *(confirmed: kentucky-2026 log)* The Maui 5/19 "dark-sky window" still needs checking against this once Maui is migrated: is it a dedicated session, or part of something else?
