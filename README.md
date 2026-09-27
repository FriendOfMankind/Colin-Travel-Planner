# Trail Notes, rebuilt

Colin's travel planner and second brain. Every trip (planned, dreamed or done), every preference and every lesson from the road lives here as plain Markdown and YAML. Two ways in:

- **Ask or change things from the Claude app.** "Where do I sleep on the 17th?" "Remember I bought the liner." "Log: Honey Creek was muddy." Claude reads [`INDEX.md`](INDEX.md) first, then only the files it needs. Every change is a commit.
- **Glance at the website in the field.** It's generated from the same files and works offline. *(Phase 3, not built yet. The old site in `FriendOfMankind/Trees` is still the live one.)*

## Layout

```
INDEX.md            generated map of everything. Start here
me/                 who Colin is: food, hiking, gear, calendar, principles… one topic per file
trips/<slug>/
  trip.md           the plan: YAML frontmatter for facts, Markdown for everything else
  places.yaml       every place, with a coordinate only if one was verified
  log.md            what actually happened: planning history, trip notes, the retro
evals/              the test that decides whether this format works for an AI
tools/              importer from Trees, INDEX generator, format library + tests
```

[`CLAUDE.md`](CLAUDE.md) has the rules for answering, editing and remembering.
