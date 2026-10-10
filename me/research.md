---
topic: research
summary: How Colin wants trips researched. Locals' knowledge first, a research tree per trip, YouTube sweeps, fetch lists for walled sources, and concerns brought with context and a first pass of research done.
source: Stated by Colin in the 2026-10-07/08 Newfoundland sessions
---

# Research

The workflow that uses this is `/research` (`.claude/skills/research/SKILL.md`).

## What he values

- **Locals and recent visitors over brochures.** Deep research into niche, specific places, and the things people post publicly on YouTube, Facebook groups, Instagram and Reddit *(stated 2026-10-07)*. These sources are best for what's happening on the ground right now, local knowledge, and the things official pages won't say. Bookable facts (prices, hours, schedules) still need an official source *(agreed 2026-10-08)*.
- **A research tree for each trip.** It shows what's covered, what's thin and what's still a gap, so research builds up instead of restarting *(asked 2026-10-08)*. It lives in `trips/<slug>/research.md`.
- **YouTube sweeps.** Pull full transcripts and log the practical bits with the uploader, the upload date and the trip month *(asked 2026-10-08)*. Recent videos and same-season trips count most.
- **Concerns come with context and a first pass of research already done.** Don't hand him a bare risk. Say what it is, why it matters, what you already checked, and the options *(stated 2026-10-07: "do some preliminary research yourself before")*.
- **Detail over name-dropping.** In an overview, every stop gets its main attractions, not just a place name *(stated 2026-10-07)*.

## Reddit and YouTube through Apify *(tested 2026-10-10)*

The 2026-10-07 test said Reddit was walled. It isn't: the **Apify MCP** reads it.

- **Reddit:** use `trudax/reddit-scraper-lite`. It returns posts and full comment trees with dates and upvotes.
  - **Always scope to a subreddit** (`searchCommunityName`). Unscoped, "blackflies Gros Morne June" came back with an Adirondacks thread first; scoped to r/newfoundland, "bugs June" returned two on-topic threads and 15 comments from locals.
  - Use short, local queries ("bugs June", "Pistolet Bay", "Burgeo") with `maxPostCount` 3–5 and `sort: relevance`, then re-run with `sort: new` for current conditions.
  - Typical input: `{"searches":["…"],"searchCommunityName":"<sub>","searchPosts":true,"skipCommunity":true,"skipUserPosts":true,"maxPostCount":5,"maxItems":40,"sort":"relevance","time":"all"}`. Fetch the dataset with `fields: dataType,title,body,createdAt,upVotes,url`.
  - Subreddits to try: the province or state sub, the park sub, and the activity sub (r/campingandhiking, r/vandwellers, r/overlanding).
  - The gold is in the comments: replies from locals that correct the original poster, and "while you're there, detour to…" gem leads. Log those as ⚠️ leads.
- **YouTube comments:** use `streamers/youtube-comments-scraper` (it needs `maxTotalChargeUsd` ≥ 0.50; that's a cap, not the charge). On big-channel vlogs the comments are mostly fan mail: 30 comments on the A+K Newfoundland vlog held about two useful lines. **Pull comments only on small or local channels, or on videos whose transcript raises a question** (a road, a closure, "is this still open?").
- **Cost discipline:** every Apify call sets `maxTotalChargeUsd`, starting small (0.50). Reddit costs roughly half a cent per item and comments about 0.2¢ each. A whole /research sweep should cost cents, not dollars. Say what a sweep spent.
- **Before trusting these numbers:** the Apify connector has to be enabled in the Claude Code session. If its tools aren't there, say so and fall back to the fetch list.

## Walled sources

- Still walled: **Facebook private groups, Instagram, TikTok**. Search shows a snippet at most *(Instagram and public Facebook groups untested through Apify as of 2026-10-10. Don't test on Colin's account, and don't log in to anything)*.
- When one of those holds the answer, **give Colin a fetch list**: the group or account, the exact search terms, and what to look for. He pastes the text or sends screenshots *(stated 2026-10-07: "if you ever want me to look things up on places you can't reach just let me know")*.
- Pasting tips worth repeating to him: tap "See more" before copying, copy one post at a time, and screenshots are fine *(2026-10-08)*.
- Machine summaries at the top of a thread (Meta AI and the like) aren't a source. Read the comments.
- Claude in Chrome could automate this from his computer: Chrome only, not Firefox *(support.claude.com, snippet, 2026-10-08)*. Not set up. If it ever is, keep it to targeted reads, not bulk scraping: Meta's terms and his account are at stake.

## Labelling (same as everywhere)

✅ read on the page · 📋 search snippet or secondhand · ⚠️ unverified lead or my inference. A social post is 📋 with who, where and when: *(source: r/newfoundland via Colin, 2026-10-08)*. One stranger's post is one data point.
