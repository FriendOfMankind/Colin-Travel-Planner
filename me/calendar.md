---
topic: calendar
summary: Term dates, blocked dates and the horizon. Free windows are computed from this, never listed by hand.
source: Trees@c6e693c data/profile.js (rebuilt there 2026-09-04 from the Sept 2026 handoff, the 2026 MASTER trip files, the MEALS files and the Sept 3 2026 bucket list)
---

# Calendar

AVAILABILITY — the calendar constraint layer.

The hub's Calendar tab computes free windows from this rather than from a
hand-maintained list, so when the term dates change the gaps recompute
themselves. `classDays` is JS getDay(): 0=Sun … 6=Sat.

SOURCE: university academic calendar, transcribed 2026-09-04. Class-day
pattern is Colin's own schedule, not the university's.

```yaml
note: Free windows are computed from term dates and weekly class days. A window is only listed if it costs zero missed classes — deciding to skip one is a judgment call the calendar shouldn't make for you.
terms:
  - name: Fall 2026
    start: 2026-08-31
    end: 2026-12-11
    classDays: [ 1, 3 ]
    classNote: Mon in-person · Wed remote 11:00–3:00, taken from camp (needs Starlink sky view)
    noClass:
      - date: 2026-09-07
        name: Labor Day
      - start: 2026-10-19
        end: 2026-10-20
        name: Fall Break
      - date: 2026-11-11
        name: Veterans Day
      - start: 2026-11-25
        end: 2026-11-27
        name: Thanksgiving Break
  - name: Fall 2026 finals
    start: 2026-12-14
    end: 2026-12-18
    classDays: [ 1, 2, 3, 4, 5 ]
    classNote: Final exam week — treat the whole week as blocked
    noClass: []
  - name: Spring 2027
    start: 2027-01-19
    end: 2027-04-30
    classDays: [ 2, 4 ]
    classNote: Tue + Thu in person (Senior Project). Two anchors a week means Fri–Mon is the only routine window.
    noClass:
      - start: 2027-03-08
        end: 2027-03-12
        name: Spring Break
  - name: Spring 2027 finals
    start: 2027-05-03
    end: 2027-05-07
    classDays: [ 1, 2, 3, 4, 5 ]
    classNote: Final exam week
    noClass: []
blocked:
  - start: 2026-12-25
    end: 2026-12-30
    name: Frisco, CO — family (confirmed 2026-09-30; was "DATES UNCONFIRMED")
    confirmed: true
  - date: 2027-05-08
    name: 🎓 Commencement
    confirmed: true
horizon:
  date: 2027-08-31
  name: Full-time work starts
modeFit:
  - mode: fly
    minDays: 8
    label: Worth an airfare
  - mode: drive
    minDays: 5
    label: Long drive, 8–15 hrs each way
  - mode: weekend
    minDays: 3
    label: Inside a ~5 hr radius
```
