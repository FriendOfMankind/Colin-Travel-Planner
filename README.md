# Trail Notes, rebuilt

Colin's travel planner and second brain. Every trip (planned, dreamed or done), every preference and every lesson from the road lives here as plain Markdown and YAML. Two ways in:

- **Ask or change things from the Claude app.** "Where do I sleep on the 17th?" "Remember I bought the liner." "Log: Honey Creek was muddy." Every session opens with a briefing computed from these files (`tools/now.mjs`): the next trip, what's open, what's due. Every change is a commit.
- **Glance at the website in the field.** It's generated from the same files. Today that's a private claude.ai page (see `CLAUDE.md`), and it isn't offline-capable yet. The old Trees site was frozen on 2026-09-29.

## Layout

```
INDEX.md            generated map of everything. Start here
me/                 who Colin is: food, hiking, gear, calendar, principles… one topic per file
trips/<slug>/
  trip.md           the plan: YAML frontmatter for facts, Markdown for everything else
  places.yaml       every place, with a coordinate only if one was verified
  log.md            what actually happened: planning history, trip notes, the retro
wishlist/<slug>.md  ideas: the pitch, the next step, dated research notes (/daydream)
evals/              the test that decides whether this format works for an AI
tools/              the briefing (now.mjs), INDEX + site generators, format library + tests
.claude/            skills (/log /remember /daydream /preflight /retro) and the session-start hook
```

[`CLAUDE.md`](CLAUDE.md) has the rules for answering, editing and remembering.
