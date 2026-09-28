---
topic: booking
summary: When each reservation system opens. The Agenda derives real dates from these; never hand-compute one.
source: Trees@c6e693c data/profile.js (rebuilt there 2026-09-04 from the Sept 2026 handoff, the 2026 MASTER trip files, the MEALS files and the Sept 3 2026 bucket list)
---

# Booking windows

Booking timing. **History of the recreation.gov row, because it has flipped twice:** an early version said "10:00 AM ET" with no source; it was then changed to "7 AM local"; in Sept 2026 it was corrected back to **10:00 AM ET** (= 7 AM PT, one instant nationwide), this time citing recreation.gov's own booking-tips article. The row below is the current value. *(Rewritten 2026-09-28: the old paragraph said "10 AM ET was invented" directly above a row saying 10 AM ET, which a fresh session rightly flagged as a contradiction.)* Re-check anything that would end a trip if wrong.

`system` is the id a trip's `booking` declaration references, and
`leadMonths` is what lets the hub work out the actual date the window opens
instead of leaving it as arithmetic for a human at 6 AM. Rows where the
window genuinely varies leave it null on purpose: the Agenda then says
"window unknown — confirm it" rather than inventing a date, which is the
same contract as `verified: false` on a waypoint.

leadMonths is counted back from the FIRST NIGHT being booked, not from the
trip's start date.

```yaml
- system: recreation.gov
  leadMonths: 6
  what: recreation.gov (most USFS / NPS)
  when: 6-month rolling window, releases **7 AM Pacific = 10 AM Eastern**
  note: ⚠️ Corrected Sept 2026. This row said "7 AM local", meaning the campground's own zone. recreation.gov's own booking-tips article says **7am PT / 8am MT / 10am ET** — one instant nationwide — "but not always". From Ohio the alarm is **10:00 AM** no matter where the campground is. Confirm on the facility's own page; small campgrounds go in seconds.
- system: reservenevada
  leadMonths: 11
  what: Nevada State Parks (reservenevada.com)
  when: 11-month rolling window
  note: Must be booked at least 72 hrs ahead; $5 non-refundable transaction fee. Valley of Fire is reservation-only — no first-come fallback.
- system: pima-county
  leadMonths: 12
  what: Pima County parks (Gilbert Ray, Tucson)
  when: Up to 1 year ahead; the whole Sept 1 – Apr 30 season opens at once
  note: '✅ Verified Sept 2026 from pima.gov: Gilbert Ray is reservation-only, cash and first-come camping are gone, and the 2026–27 season was bookable from Sept 1 2026. Max 3 sites per transaction. A separate older source says "at least 72 hours in advance" — that is a MINIMUM lead time, not the window. 520-724-5159.'
- system: state-park
  leadMonths: null
  what: State park campgrounds
  when: Varies wildly — 30 days to 1 year
  note: Confirm the window as soon as the trip is real. Getting this wrong is the most common way to lose a site.
- system: private
  leadMonths: null
  what: Private campgrounds
  when: Usually anytime
  note: Call about after-hours arrival. Office cutoffs are the most common day-one failure.
- system: first-come
  leadMonths: null
  reservable: false
  what: First-come dispersed
  when: No reservation possible
  note: Arrive early, drive the road once from the top, take the first acceptable site. Bail-out named in advance.
- system: glacier-np
  leadMonths: null
  what: Glacier NP
  when: Vehicle reservations are a separate system from camping
  note: You can hold one without the other. Verify the current year early.
- system: buffalo-nr
  leadMonths: 6
  what: Buffalo National River
  when: 6-month window, minimum 5 days in advance
  note: Reservations required at Steel Creek, Ozark, Carver, Tyler Bend and Rush since Mar 13 2026. Older first-come guidance is dead.
- system: baxter-sp
  leadMonths: 4
  what: Baxter State Park
  when: Rolling 4 months
  note: First night plus 3 consecutive nights bookable online together as of summer 2026. Separate Day Use Parking Reservation for the Katahdin trailheads.
- system: flights
  leadMonths: null
  what: Flights
  when: ~11 months when schedules open; sweet spot 2–5 months
  note: A range, not a deadline — deliberately left underivable.
- system: rental-car
  leadMonths: null
  what: Rental car / Turo
  when: 2–3 months, re-check monthly
  note: Free cancellation means book early and rebook if the price drops.
```
