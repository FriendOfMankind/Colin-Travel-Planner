(() => {
  const D = window.TN;
  const $view = document.getElementById("view");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem("tn:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("tn:" + k, JSON.stringify(v)); } catch {} },
  };

  /* ---------------------------------------------------------- dates */
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const fmt = (s) => { const d = parse(s); return `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`; };
  const short = (s) => { const d = parse(s); return { m: MON[d.getMonth()], d: d.getDate(), w: DOW[d.getDay()] }; };

  /** "Now" is the real clock unless the preview control overrides it. */
  function now() {
    const o = store.get("previewAt", null);
    const d = o ? new Date(o) : new Date();
    return { date: iso(d), minutes: d.getHours() * 60 + d.getMinutes(), preview: !!o, raw: d };
  }

  /** Schedule times carry no AM/PM ("11:00 → 3:00"); they only ever move
      forward within a day, so roll anything that jumps backwards by 12h. */
  function startMinutes(rows) {
    let last = -1;
    return rows.map((r) => {
      const m = /(\d{1,2}):(\d{2})/.exec(r.time);
      if (!m) return null;
      let t = (+m[1] % 12) * 60 + +m[2];
      if (/PM/i.test(r.time) && +m[1] < 12) t += 720;
      while (last >= 0 && t < last - 60) t += 720;
      last = t;
      return t;
    });
  }


  /** "1h 30m" / "45m" / "35m + 25m" → minutes; "—" or blank → 0. */
  const estMin = (e) => { let m = 0; for (const x of String(e ?? "").matchAll(/(\d+)\s*h/g)) m += 60 * +x[1]; for (const x of String(e ?? "").matchAll(/(\d+)\s*m\b/g)) m += +x[1]; return m; };
  const hm = (m) => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? " " + (m % 60) + "m" : ""}` : `${m}m`;
  const clock = (t) => { const h = Math.floor(t / 60) % 24, m = t % 60; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  function load(d) {
    const mins = startMinutes(d.schedule);
    const sum = (kinds) => d.schedule.reduce((a, r, i) => a + (kinds.includes(r.kind) && !/optional/i.test(r.time) ? estMin(r.est) : 0), 0);
    const first = mins.find((m, i) => m != null && !/optional/i.test(d.schedule[i].time + d.schedule[i].title));
    return { wake: first, hike: sum(["hike", "view", "ruins"]), drive: sum(["drive", "shuttle"]) };
  }
  function askPrompt(t, d, where) {
    return `I'm on ${t.title}, Day ${d.n} (${fmt(d.date)}: ${strip(d.title)}).${where ? ` The plan says I should be at: ${where}.` : ""} Something came up: [describe it]. Using the trip plan in trips/${t.slug}/ and my preferences in me/, give me 2–3 alternatives for the rest of today, and tell me what each one costs (time, a booking, or tomorrow).`;
  }

  const tripState = (t, today) => {
    if (!t.start) return "idea";
    if (today < t.start) return "upcoming";
    if (t.end && today > t.end) return "past";
    return "active";
  };
  const mapsUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  /* --------------------------------------------------------- pieces */
  function dayCard(t, d, opts = {}) {
    const s = short(d.date);
    const mins = startMinutes(d.schedule);
    const nextIdx = opts.nowMinutes != null ? mins.findIndex((m, i) => m != null && (mins[i + 1] ?? 1e9) > opts.nowMinutes) : -1;
    const sum = [d.driving && `Drive ${strip(d.driving)}`, d.overnight && `Sleep: ${strip(d.overnight.name)}`].filter(Boolean);
    const rows = d.schedule.map((r, i) => `
      <div class="srow k-${esc(r.kind)}${r.warn ? " warn" : ""}${i === nextIdx ? " is-next" : ""}">
        <div><span class="t">${esc(r.time)}</span><span class="k">${esc(r.kind)}</span></div>
        <div>
          <div class="what">${r.star ? '<span class="star" title="Highlight">★</span>' : ""}${r.title}${r.checked ? ' <span class="chip accent" title="Distance and time checked against AllTrails" style="vertical-align:2px">stats checked</span>' : ""}</div>
          ${(r.est || r.maps) ? `<div class="extra">${r.est && r.est !== "—" ? `<span class="chip">${esc(r.est)}</span>` : ""}${r.maps ? `<a class="maps" target="_blank" rel="noopener" href="${mapsUrl(r.maps)}">Maps ↗</a>` : ""}</div>` : ""}
          ${r.detail ? `<details><summary>Details</summary><div>${r.detail}</div></details>` : ""}
        </div>
      </div>`).join("");
    const o = d.overnight;
    return `
    <details class="day${opts.today ? " is-today" : ""}" id="day-${d.n}" ${opts.open ? "open" : ""}>
      <summary>
        <div class="dnum"><b>${d.n}</b><span>${s.w} ${s.m} ${s.d}</span></div>
        <div><h3>${opts.today ? '<span class="today-tag">Today</span>' : ""}${d.title}</h3>
          <div class="sumline">${sum.map((x) => `<span>${esc(x)}</span>`).join("")}</div></div>
        <span class="caret" aria-hidden="true">›</span>
      </summary>
      <div class="day-body">
        ${opts.today && !opts.hideNext && nextIdx >= 0 ? `<div class="nextup"><div class="eyebrow">Next up · ${esc(d.schedule[nextIdx].time)}</div><div class="what">${d.schedule[nextIdx].title}</div>${d.schedule[nextIdx].maps ? `<a class="maps" target="_blank" rel="noopener" href="${mapsUrl(d.schedule[nextIdx].maps)}">Maps ↗</a>` : ""}</div>` : ""}
        ${opts.today ? `<div><div class="eyebrow" style="margin-bottom:4px">Schedule</div><div class="sched">${rows}</div></div>` : ""}
        ${d.tagline ? `<div class="muted" style="font-style:italic">${d.tagline}</div>` : ""}
        <div class="facts">
          ${d.sun ? `<div><div class="eyebrow">Light</div><div class="mono" style="font-size:13px">First ${esc(d.sun.firstLight)} · Rise ${esc(d.sun.sunrise)}<br>Set ${esc(d.sun.sunset)} · Dark ${esc(d.sun.dark)}</div></div>` : ""}
          ${o ? `<div><div class="eyebrow">Tonight</div><div><b>${o.name}</b>${o.place ? `, ${o.place}` : ""}</div>${o.confirmation ? `<div class="muted" style="font-size:13px">${o.confirmation}</div>` : ""}${o.checkin ? `<div class="muted" style="font-size:13px">${o.checkin}</div>` : ""}</div>` : ""}
          ${d.slack ? `<div><div class="eyebrow">Slack</div><div style="font-size:13.5px">${d.slack}</div></div>` : ""}
        </div>
        ${d.noSignal ? `<div class="nosignal"><b>No signal:</b> ${d.noSignal}</div>` : ""}
        ${opts.today ? "" : `<div><div class="eyebrow" style="margin-bottom:4px">Schedule</div><div class="sched">${rows}</div></div>`}
        ${Object.keys(d.meals).length ? `<div><div class="eyebrow" style="margin-bottom:6px">Food</div><div class="meals">${["b", "l", "d"].filter((k) => d.meals[k]).map((k) => `<b>${k.toUpperCase()}</b><div>${d.meals[k]}</div>`).join("")}</div></div>` : ""}
        ${d.warnings ? `<div class="callout prose">${d.warnings}</div>` : ""}
        <div class="row"><button type="button" class="btn ask" data-ask="${esc(askPrompt(t, d, nextIdx >= 0 ? strip(d.schedule[nextIdx].title) : ""))}">Ask Claude about this day</button><span class="ask-msg muted" style="font-size:12.5px"></span></div>
        ${d.highlights ? `<details class="fold panel"><summary>Why this day</summary><div class="prose">${d.highlights}</div></details>` : ""}
      </div>
    </details>`;
  }

  function tripHeader(t, sec) {
    const today = now().date;
    const st = tripState(t, today);
    const when = st === "upcoming" ? `${daysBetween(today, t.start)} days out` : st === "active" ? `Day ${daysBetween(t.start, today) + 1} of ${t.days.length}` : st === "past" ? "Done" : "No dates";
    const nightsBooked = t.booking.filter((b) => b.booked).length;
    const tabs = [["plan", "Plan"], ["places", "Places"], ["prep", "Prep", t.questions.length + t.reservations.filter((r) => !r.done).length], ["journal", "Journal", t.log.entries.length]];
    return `
      <div class="head">
        <a class="back" href="#trips">← Trips</a>
        <div class="eyebrow">${esc(t.datesLabel ?? "")} · ${esc(when)}</div>
        <h1>${esc(t.title)}</h1>
        ${t.why ? `<div class="sub">${t.why}</div>` : ""}
        <div class="stats">
          <div><b>${t.days.length}</b><span>days</span></div>
          <div><b>${nightsBooked}/${t.booking.length}</b><span>bookings made</span></div>
          <div><b>${t.located.verified}/${t.located.total}</b><span>places located</span></div>
          <div><b>${t.questions.length}</b><span>open questions</span></div>
        </div>
      </div>
      <nav class="seg" aria-label="Trip sections">${tabs.map(([k, l, n]) => `<a href="#t-${t.slug}-${k}" ${k === sec ? 'aria-current="page"' : ""}>${l}${n ? `<span class="count">${n}</span>` : ""}</a>`).join("")}</nav>`;
  }

  const checkRow = (id, html, done) => {
    const ticked = done || store.get(id, false);
    return `<label class="check${ticked ? " done" : ""}"><input type="checkbox" data-store="${esc(id)}" ${ticked ? "checked" : ""} ${done ? "disabled" : ""}><span>${html}</span></label>`;
  };

  /* ---------------------------------------------------------- views */
  const V = {};

  V.now = () => {
    const n = now();
    const active = D.trips.find((t) => tripState(t, n.date) === "active");
    const next = D.trips.filter((t) => tripState(t, n.date) === "upcoming").sort((a, b) => a.start < b.start ? -1 : 1)[0];
    let top = "";
    if (active) {
      const d = active.days.find((x) => x.date === n.date);
      const mins = startMinutes(d.schedule);
      const cur = mins.findIndex((m, i) => m != null && m <= n.minutes && (mins[i + 1] ?? 1e9) > n.minutes);
      const nxt = mins.findIndex((m) => m != null && m > n.minutes);
      const sunset = d.sun && /(\d+):(\d+)/.exec(d.sun.sunset);
      const sunsetMin = sunset ? ((+sunset[1] % 12) + 12) * 60 + +sunset[2] : null;
      const tomorrow = active.days.find((x) => x.n === d.n + 1);
      const tFirst = tomorrow?.schedule.find((r) => !/optional/i.test(r.time));
      top = `<div class="stack">
        <div class="eyebrow">${esc(active.title)} · Day ${d.n} of ${active.days.length}</div>
        <div class="pace panel">
          <div><div class="eyebrow">The plan has you at</div><div class="pace-now">${cur >= 0 ? `<span class="mono">${esc(d.schedule[cur].time)}</span> ${d.schedule[cur].title}` : nxt >= 0 ? "Before the day's first item" : "Done for the day"}</div></div>
          <div class="pace-grid">
            <div><div class="eyebrow">Next</div><div>${nxt >= 0 ? `<span class="mono">${esc(d.schedule[nxt].time.split("→")[0].trim())}</span> ${d.schedule[nxt].title}` : "—"}</div></div>
            <div><div class="eyebrow">To sunset</div><div class="mono">${sunsetMin != null ? (sunsetMin > n.minutes ? hm(sunsetMin - n.minutes) : "after sunset") : "—"}</div></div>
            <div><div class="eyebrow">Tomorrow starts</div><div>${tFirst ? `<span class="mono">${esc(tFirst.time.split("→")[0].trim())}</span> ${tFirst.title}` : "Home"}</div></div>
          </div>
          ${d.slack ? `<div class="pace-slack"><div class="eyebrow">If you're behind</div><div>${d.slack}</div></div>` : ""}
        </div>
        ${dayCard(active, d, { open: true, today: true, hideNext: true, nowMinutes: n.minutes })}
        <div class="row"><a class="btn" href="#t-${active.slug}-plan">Whole plan</a><a class="btn" href="#t-${active.slug}-places">Places</a></div>
      </div>`;
    } else if (next) {
      const days = daysBetween(n.date, next.start);
      const tasks = [
        ...next.reservations.filter((r) => !r.done).map((r) => ({ cls: "warn", html: r.text, where: "Prep · checks" })),
        ...next.questions.map((q) => ({ cls: "", html: q.q, where: `Prep · open question${q.blocks ? " · blocks " + strip(q.blocks).slice(0, 60) : ""}` })),
        ...D.gearNeeds.map((g) => ({ cls: g.state === "need" ? "warn" : "", html: `${g.name} <span class="pill pill-${g.state}">${g.state}</span>`, where: "Me · gear" })),
      ];
      top = `<div class="hero">
          <div class="eyebrow">Next trip</div>
          <div class="countdown">${days}<small>day${days === 1 ? "" : "s"}</small></div>
          <h2><a href="#t-${next.slug}-plan" style="text-decoration:none">${esc(next.title)}</a></h2>
          <div>${esc(next.datesLabel ?? "")} · ${esc(next.region ?? "")}</div>
          ${next.next ? `<div style="font-size:14px;opacity:.85">${next.next}</div>` : ""}
        </div>
        <div class="section">
          <div class="row" style="justify-content:space-between"><h2>Before you go</h2><span class="muted mono" style="font-size:12px">${tasks.length} items</span></div>
          <div class="panel divide">${tasks.slice(0, 8).map((t) => `<div class="task ${t.cls}"><span class="dot"></span><div><div>${t.html}</div><div class="where">${esc(t.where)}</div></div></div>`).join("")}</div>
          ${tasks.length > 8 ? `<a class="btn" href="#t-${next.slug}-prep">All ${tasks.length} in Prep</a>` : ""}
        </div>`;
    } else {
      top = `<div class="hero"><div class="eyebrow">No trip scheduled</div><h2>Nothing on the calendar</h2></div>`;
    }
    const recent = D.trips.flatMap((t) => t.log.entries.map((e) => ({ ...e, t }))).sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 4);
    return `<div class="stack">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h1>Now</h1><span class="mono muted" style="font-size:13px">${fmt(n.date)}${n.preview ? " · preview" : ""}</span></div>
      ${top}
      <div class="section">
        <h2>Recently logged</h2>
        <div class="panel divide">${recent.map((e) => `<a class="entry" style="text-decoration:none;color:inherit" href="#t-${e.t.slug}-journal"><time>${fmt(e.date)}</time><div><div style="font-weight:500">${e.title}</div><div class="muted" style="font-size:13px">${esc(e.t.title)}</div></div></a>`).join("")}</div>
      </div>
      <div class="section">
        <div class="eyebrow">Preview a date</div>
        <div class="preview">
          <label for="pv">See this screen as if it were</label>
          <input id="pv" type="datetime-local" value="${n.preview ? n.raw.toISOString().slice(0, 16) : ""}">
          <button type="button" id="pv-trip">Oct 18, 9:00 AM</button>
          ${n.preview ? '<button type="button" id="pv-clear">Back to today</button>' : ""}
        </div>
      </div>
    </div>`;
  };

  V.trips = () => {
    const today = now().date;
    const groups = { active: [], upcoming: [], past: [], idea: [] };
    for (const t of D.trips) (groups[tripState(t, today)] ?? []).push(t);
    const row = (t) => {
      const s = t.start ? short(t.start) : null;
      const st = tripState(t, today);
      const meta = st === "past" ? (t.log.retro.length ? "Retro written" : "Retro pending") : st === "upcoming" ? `${daysBetween(today, t.start)} days out · ${t.days.length} days` : st === "idea" ? `${t.status} · ${t.datesLabel ?? "no dates"}` : "On the road";
      return `<a class="trip-row" href="#t-${t.slug}-${st === "past" ? "journal" : "plan"}">
        <div class="date">${s ? `${s.m}<b>${s.d}</b>` : "—"}</div>
        <div><h3>${esc(t.title)}</h3><div class="meta">${esc(t.region ?? "")} · ${esc(meta)}</div></div>
        <span class="go" aria-hidden="true">›</span></a>`;
    };
    const block = (title, list) => list.length ? `<div class="section"><h2>${title}</h2><div class="panel divide">${list.map(row).join("")}</div></div>` : "";
    return `<div class="stack"><h1>Trips</h1>
      ${block("On the road", groups.active)}${block("Coming up", groups.upcoming)}${block("Not scheduled", groups.idea)}${block("Done", groups.past.reverse())}
      ${ideasBlock()}
    </div>`;
  };

  /* Ideas: filter by month and by drive/fly, both remembered on this phone. */
  function ideasBlock() {
    const month = store.get("ideaMonth", 0), mode = store.get("ideaMode", "");
    const list = (D.ideas ?? []).filter((i) => (!month || i.months.includes(month)) && (!mode || i.mode === mode));
    const chip = (key, val, label, cur) => `<button type="button" class="chip${cur === val ? " accent" : ""}" data-filter="${key}" data-val="${esc(val)}">${label}</button>`;
    const modes = [...new Set((D.ideas ?? []).map((i) => i.mode).filter(Boolean))].sort();
    return `<div class="section"><h2>Ideas <span class="muted" style="font-weight:400">${list.length} of ${(D.ideas ?? []).length}</span></h2>
      <div class="filters">${chip("ideaMonth", 0, "Any month", month)}${MON.map((m, i) => chip("ideaMonth", i + 1, m, month)).join("")}</div>
      <div class="filters">${chip("ideaMode", "", "Any way", mode)}${modes.map((m) => chip("ideaMode", m, m, mode)).join("")}</div>
      <div class="panel divide">${list.map((i) => `<a class="trip-row" href="#w-${i.slug}">
        <div class="date">${esc(i.mode)}</div>
        <div><h3>${esc(i.title)}</h3><div class="meta">${esc(i.region)}${i.length ? " · " + esc(i.length) : ""}${i.noteCount ? ` · ${i.noteCount} note${i.noteCount === 1 ? "" : "s"}` : ""}</div><div class="meta">${esc(i.subtitle)}</div></div>
        <span class="go" aria-hidden="true">›</span></a>`).join("") || '<div class="pad muted">Nothing on the list fits that. Which is itself a daydream prompt.</div>'}</div></div>`;
  }

  V.idea = (i) => {
    const ask = `Let's daydream about ${i.title} (wishlist/${i.slug}.md). /daydream ${i.slug} — [what caught your eye: an activity, a season, a question]`;
    return `<div class="stack"><a class="back" href="#trips">← Trips</a>
      <div><div class="eyebrow">Idea · ${esc(i.region)}</div><h1>${esc(i.title)}</h1><p class="muted" style="margin:0">${esc(i.subtitle)}</p></div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${i.months.map((m) => `<span class="chip">${MON[m - 1]}</span>`).join("")}${i.mode ? `<span class="chip accent">${esc(i.mode)}</span>` : ""}${i.length ? `<span class="chip">${esc(i.length)}</span>` : ""}</div>
      ${i.window ? `<div class="panel pad"><div class="eyebrow">When</div><div>${i.window}</div></div>` : ""}
      <div class="panel pad prose">${i.why}</div>
      <div class="panel pad"><div class="eyebrow">Next</div><div class="prose">${i.next}</div></div>
      <div class="section"><h2>Research notes</h2><div class="panel pad prose">${i.notes || '<p class="muted">Nothing yet. Every fact <code>/daydream</code> finds lands here with its source.</p>'}</div></div>
      <div class="row"><button type="button" class="btn ask" data-ask="${esc(ask)}">Daydream about this</button><span class="ask-msg muted" style="font-size:12.5px"></span></div>
      <p class="muted" style="font-size:12.5px">Updated ${esc(i.updated)} · <code>wishlist/${esc(i.slug)}.md</code></p></div>`;
  };

  V.trip = (t, sec) => {
    const n = now();
    let body = "";
    if (sec === "plan") {
      const loads = t.days.map(load);
      const maxM = Math.max(600, ...loads.map((l) => l.hike + l.drive));
      body = `<div class="stack">
        <div class="panel glance">
          <div class="glance-head"><span>Day</span><span>Wake</span><span>On foot / driving</span><span>Sleep</span></div>
          ${t.days.map((d, i) => { const l = loads[i]; const early = l.wake != null && l.wake < 6 * 60 + 30; return `<a class="glance-row${d.date === n.date ? " is-today" : ""}" href="#t-${t.slug}-plan" data-day="${d.n}">
            <span class="gd"><b>${d.n}</b> ${short(d.date).w}</span>
            <span class="gw mono${early ? " early" : ""}">${l.wake != null ? clock(l.wake).replace(" AM", "").replace(" PM", "p") : "—"}</span>
            <span class="gb"><span class="bars"><i class="h" style="width:${(100 * l.hike) / maxM}%"></i><i class="dr" style="width:${(100 * l.drive) / maxM}%"></i></span><span class="mono gl">${hm(l.hike)} · ${hm(l.drive)}</span></span>
            <span class="gs">${d.overnight ? strip(d.overnight.name).replace(/ Campground| — .*/g, "") : "Home"}</span></a>`; }).join("")}
          <div class="glance-key muted"><span><i class="h"></i> on foot</span><span><i class="dr"></i> driving</span><span><span class="mono early" style="padding:0 4px">6:00</span> wake before 6:30</span></div>
        </div>
        ${t.days.map((d) => dayCard(t, d, { open: d.date === n.date, today: d.date === n.date, nowMinutes: d.date === n.date ? n.minutes : null })).join("")}
        ${t.route ? `<details class="fold panel"><summary>Route and overview</summary><div class="prose">${t.route}${t.overview.map((c) => `<h3>${c.h}</h3>${c.p}`).join("")}</div></details>` : ""}
        ${t.notes.length ? `<details class="fold panel"><summary>Why the plan looks like this</summary><div class="prose">${t.notes.map((x) => `<h3>${x.h}</h3>${x.body}`).join("")}</div></details>` : ""}
      </div>`;
    } else if (sec === "places") {
      body = `<div class="stack">
        ${t.places.map((g) => `<div class="section" style="margin-top:6px"><div class="eyebrow">${esc(g.group)}</div><div class="panel divide">${g.places.map((p) => `
          <div class="place"><div><div class="pn">${p.star ? '<span class="star" style="color:var(--today)">★</span> ' : ""}${esc(p.name)}</div>
          <div class="pm">${p.note || ""}${p.days ? ` · Day ${esc(p.days)}` : ""}</div>
          <div class="loc ${p.verified ? "ok" : "no"}">${p.verified ? `✓ ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : "Not located: search only"}</div></div>
          ${p.maps || p.verified ? `<a class="maps" target="_blank" rel="noopener" href="${p.verified ? mapsUrl(p.lat + "," + p.lng) : mapsUrl(p.maps)}">Maps ↗</a>` : ""}</div>`).join("")}</div></div>`).join("")}
        ${t.hikes.length ? `<div class="section"><h2>Hikes</h2><div class="panel tbl"><table><thead><tr><th>Hike</th><th>Day</th><th>Dist</th><th>Gain</th><th>Time</th></tr></thead><tbody>${t.hikes.map((h) => `<tr><td>${h.name} <a class="maps" style="margin-left:4px" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(strip(h.name).replace(/[⭐✅]/g, "").trim() + " AllTrails")}">AllTrails ↗</a></td><td class="num">${h.day ?? ""}</td><td class="num">${h.distance ?? ""}</td><td class="num">${h.gain ?? ""}</td><td class="num">${h.duration ?? ""}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
        <div class="muted" style="font-size:12.5px">Map view comes next: pins for the ${t.located.verified} located places, from the vendored map library so it works offline.</div>
      </div>`;
    } else if (sec === "prep") {
      body = `<div class="stack">
        <div class="section" style="margin-top:6px"><h2>Bookings</h2><div class="panel divide">${t.booking.map((b) => `<div class="task ${b.booked ? "" : "warn"}"><span class="dot" style="background:${b.booked ? "var(--ok)" : "var(--warn)"}"></span><div>${b.what}<div class="where">${esc(b.system)} · ${b.booked ? "booked" : "not booked"}</div></div></div>`).join("")}</div></div>
        <div class="section"><h2>Checks</h2><div class="panel divide">${t.reservations.map((r, i) => checkRow(`${t.slug}:res:${i}`, r.text, r.done)).join("")}</div></div>
        ${t.questions.length ? `<div class="section"><h2>Open questions</h2><div class="panel divide">${t.questions.map((q) => `<details class="fold"><summary>${strip(q.q)}</summary><div class="prose">${q.blocks ? `<p class="muted"><b>Blocks:</b> ${q.blocks}</p>` : ""}${q.detail}</div></details>`).join("")}</div></div>` : ""}
        ${t.provisions ? `<div class="section"><h2>Food and shopping</h2><div class="panel pad prose">${t.provisions.summary}</div>${t.provisions.critical ? `<div class="callout prose">${t.provisions.critical}</div>` : ""}
          ${t.provisions.stops.map((s, si) => `<details class="fold panel"><summary>${strip(s.group)}</summary><div>${s.note ? `<p class="muted" style="font-size:13.5px;margin:0 0 6px">${s.note}</p>` : ""}${s.items.map((it, ii) => checkRow(`${t.slug}:shop:${si}:${ii}`, it, false)).join("")}</div></details>`).join("")}</div>` : ""}
        <div class="section"><h2>Packing</h2>${t.packing.map((c, ci) => `<details class="fold panel"><summary>${strip(c.category)}</summary><div>${c.items.map((it, ii) => checkRow(`${t.slug}:pack:${ci}:${ii}`, it, false)).join("")}</div></details>`).join("")}</div>
        ${t.weather.length ? `<div class="section"><h2>Weather</h2><div class="panel tbl"><table><thead><tr><th>Where</th><th>High</th><th>Low</th><th>Notes</th></tr></thead><tbody>${t.weather.map((w) => `<tr><td>${esc(w.location)}</td><td class="num">${esc(w.high)}</td><td class="num">${esc(w.low)}</td><td>${w.notes}</td></tr>`).join("")}</tbody></table></div>${t.weatherNote ? `<div class="muted prose" style="font-size:13px">${t.weatherNote}</div>` : ""}</div>` : ""}
        <div class="muted" style="font-size:12.5px">Ticks save on this phone only. The plan files are the record.</div>
      </div>`;
    } else {
      body = `<div class="stack">
        ${t.log.retro.map((r) => `<div class="section" style="margin-top:6px"><h2>${r.title}</h2><div class="panel pad prose">${r.html}</div></div>`).join("")}
        <div class="section"><h2>Log</h2><div class="panel divide">${t.log.entries.slice().reverse().map((e) => `<div class="entry"><time>${fmt(e.date)}</time><div><h3>${e.title}</h3><div class="prose">${e.html}</div></div></div>`).join("") || '<div class="pad muted">Nothing logged yet. Use /log from the Claude app.</div>'}</div></div>
      </div>`;
    }
    return tripHeader(t, sec) + `<div style="margin-top:16px">${body}</div>`;
  };

  V.kitchen = () => {
    const k = D.kitchen, T = k.targets;
    const slots = ["Breakfast", "Lunch", "Dinner", "Snacks"];
    const card = (m) => {
      const kc = m.t.protein_g * 4 + m.t.carbs_g * 4 + m.t.fat_g * 9 || 1;
      return `<div class="meal"><div class="row" style="justify-content:space-between"><h3>${esc(m.name)}</h3><span class="mono muted" style="font-size:12px">${m.id}${m.est ? " · est." : ""}</span></div>
        <div class="macros"><span><b>${m.t.kcal}</b> kcal</span><span><b>${m.t.protein_g}</b> g protein</span><span><b>${m.t.carbs_g}</b> g carbs</span><span><b>${m.t.fat_g}</b> g fat</span></div>
        <div class="bar" title="Share of calories: protein, carbs, fat"><i style="width:${(m.t.protein_g * 400) / kc}%;background:var(--accent)"></i><i style="width:${(m.t.carbs_g * 400) / kc}%;background:var(--today)"></i><i style="width:${(m.t.fat_g * 900) / kc}%;background:var(--water)"></i></div>
        ${m.method ? `<div style="font-size:14px;color:var(--ink-2)">${m.method}</div>` : ""}
        <details><summary class="muted" style="font-size:13px;cursor:pointer">Ingredients</summary><div style="font-size:13px;margin-top:6px">${m.items.map((i) => `${i.qty} × ${esc(i.name)} <span class="muted">(${esc(i.serving)})</span>`).join("<br>")}</div></details></div>`;
    };
    return `<div class="stack"><h1>Kitchen</h1>
      <div class="panel pad"><div class="eyebrow">Daily target</div><div class="macros" style="margin-top:6px"><span><b>${T.kcal}</b> kcal</span><span><b>${T.protein_g.join("–")}</b> g protein</span><span><b>${T.carbs_g.join("–")}</b> g carbs</span><span><b>${T.fat_g.join("–")}</b> g fat</span></div>
      <div class="row muted" style="font-size:12px;margin-top:8px;gap:14px"><span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px"></span> protein</span><span><span style="display:inline-block;width:8px;height:8px;background:var(--today);border-radius:2px"></span> carbs</span><span><span style="display:inline-block;width:8px;height:8px;background:var(--water);border-radius:2px"></span> fat</span></div></div>
      ${slots.map((s) => { const ms = k.meals.filter((m) => m.slot === s); return ms.length ? `<div class="section"><h2>${s}</h2><div class="panel divide">${ms.map(card).join("")}</div></div>` : ""; }).join("")}
      <details class="fold panel"><summary>Shopping list</summary><div class="prose">${k.shopping}</div></details>
    </div>`;
  };

  V.me = () => `<div class="stack"><h1>Me</h1><p class="muted" style="margin:0">What Claude knows about you. Change any of it by telling Claude: <span class="mono">/remember …</span></p>
    <div class="panel divide">${D.me.map((m) => `<a class="me-link" href="#me-${m.id}"><div><h3>${esc(m.id.replace(/-/g, " "))}</h3><p>${esc(m.summary)}</p></div><span class="go muted" aria-hidden="true">›</span></a>`).join("")}</div></div>`;

  V.meFile = (m) => `<div class="stack"><a class="back" href="#me">← Me</a><h1 style="text-transform:capitalize">${esc(m.id.replace(/-/g, " "))}</h1><p class="muted" style="margin:0">${esc(m.summary)}</p>
    ${m.lists.declined ? `<div class="panel pad"><div class="eyebrow">Declined</div><ul>${m.lists.declined.map((x) => `<li>${esc(x.what)}</li>`).join("")}</ul></div>` : ""}
    ${m.lists.avoid ? `<div class="panel pad"><div class="eyebrow">Never</div><ul>${m.lists.avoid.map((x) => `<li>${esc(x.what)}</li>`).join("")}</ul></div>` : ""}
    <div class="panel pad prose">${m.html}</div>
    ${m.lists.dislikes ? `<details class="fold panel"><summary>Rejected dishes (${m.lists.dislikes.length})</summary><div><ul>${m.lists.dislikes.map((x) => `<li>${esc(x.what)}</li>`).join("")}</ul></div></details>` : ""}</div>`;

  /* --------------------------------------------------------- router */
  function render() {
    const h = (location.hash || "#now").slice(1);
    let html, tab = "now";
    const tm = /^t-(.+?)(?:-(plan|places|prep|journal))?$/.exec(h);
    if (tm && D.trips.find((t) => t.slug === tm[1])) {
      html = V.trip(D.trips.find((t) => t.slug === tm[1]), tm[2] ?? "plan"); tab = "trips";
    } else if (h.startsWith("w-") && (D.ideas ?? []).find((i) => i.slug === h.slice(2))) {
      html = V.idea(D.ideas.find((i) => i.slug === h.slice(2))); tab = "trips";
    } else if (h.startsWith("me-") && D.me.find((m) => m.id === h.slice(3))) {
      html = V.meFile(D.me.find((m) => m.id === h.slice(3))); tab = "me";
    } else if (V[h] && ["now", "trips", "kitchen", "me"].includes(h)) { html = V[h](); tab = h; }
    else html = V.now();
    $view.innerHTML = html + `<div class="foot">Built ${esc(D.builtAt.slice(0, 16).replace("T", " "))} UTC from the Colin-Travel-Planner files.</div>`;
    document.querySelectorAll(".tabbar a").forEach((a) => { if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const today = $view.querySelector(".day.is-today");
    if (today && tm) today.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }

  $view.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.store) { store.set(el.dataset.store, el.checked); el.closest(".check")?.classList.toggle("done", el.checked); }
    if (el.id === "pv" && el.value) { store.set("previewAt", el.value); render(); }
  });
  $view.addEventListener("click", (e) => {
    const g = e.target.closest(".glance-row");
    if (g) { e.preventDefault(); const el = document.getElementById("day-" + g.dataset.day); if (el) { el.open = true; el.scrollIntoView({ block: "start", behavior: "smooth" }); } return; }
    const a = e.target.closest("[data-ask]");
    if (a) {
      const msg = a.parentElement.querySelector(".ask-msg");
      const text = a.dataset.ask;
      const fallback = () => { msg.innerHTML = `<textarea readonly rows="4" style="width:100%;font:12px var(--mono)">${esc(text)}</textarea>`; msg.querySelector("textarea").select(); };
      try { navigator.clipboard.writeText(text).then(() => { msg.textContent = "Copied. Paste it into the Claude app and fill in what came up."; }, fallback); } catch { fallback(); }
      return;
    }
    const f = e.target.closest("[data-filter]");
    if (f) { const v = f.dataset.val, y = window.scrollY; store.set(f.dataset.filter, f.dataset.filter === "ideaMonth" ? Number(v) : v); render(); window.scrollTo(0, y); return; }
    if (e.target.id === "pv-trip") { store.set("previewAt", "2026-10-18T09:00"); render(); }
    if (e.target.id === "pv-clear") { store.set("previewAt", null); render(); }
  });
  window.addEventListener("hashchange", render);
  render();
})();
