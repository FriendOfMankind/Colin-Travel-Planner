# Garden runs

One row per /gardener run. The last row's commit is where the next run's scope starts (`node tools/garden.mjs --scope`). Counts: **raised** by the finders, **survived** the verifier, then what Colin did with them. Over time the survived/raised ratio is the gardener's precision, and the seeds in `evals/questions.md` it found are its recall.

| Date | Commit | Mode | Mechanical | Raised | Survived | Fixed | Dismissed | Missed (found later by hand) |
|---|---|---|---|---|---|---|---|---|
| 2026-10-12 | `8fcb62c` | trial: Colin slice only (1 finder + verifier, ~216k subagent tokens) | 0 | 9 | 6 (+1 overruled on review: hiking.md:50, now a mechanical check) | 0 (waiting on Colin) | 0 | 0 |
| 2026-10-30 | `3ccb098` | mechanical (landed from PR #80) | 1 | 0 | 0 | 1 (me/hiking.md:54) | 0 | 0 |
