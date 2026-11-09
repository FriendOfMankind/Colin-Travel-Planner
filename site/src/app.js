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

  /** A row struck through in trip.md ("- ~~7:55 → 9:55 …~~ Cut") is not part of the day. */
  const isCut = (r) => /^~~/.test(r.time);
  /** The start of the next timed row after row i (cut and untimed rows skipped). */
  const after = (mins, i) => mins.slice(i + 1).find((m) => m != null) ?? 1e9;
  /** Schedule times carry no AM/PM ("11:00 → 3:00"); they only ever move
      forward within a day, so roll anything that jumps backwards by 12h. */
  function startMinutes(rows) {
    let last = -1;
    return rows.map((r) => {
      const m = /(\d{1,2}):(\d{2})/.exec(r.time);
      if (!m || isCut(r)) return null;
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
    const sum = (kinds) => d.schedule.reduce((a, r, i) => a + (kinds.includes(r.kind) && !/optional/i.test(r.time) && !isCut(r) ?estMin(r.est) : 0), 0);
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
  /** Served from GitHub Pages (or any web server), not claude.ai or a file. */
  // claude.ai never lets a page save an .ics (blob links do nothing, and the
  // downloads capability's allowlist has no calendar type), so off Pages the
  // button points at the Pages copy, which .github/workflows/pages.yml deploys.
  const PAGES_URL = "https://friendofmankind.github.io/Colin-Travel-Planner/";
  /** Where Colin drops pins (docs/MAPS.md step 2; source tools/coordsheet.html). Private: opens signed in. */
  const LEDGER_URL = "https://claude.ai/artifact/79opjP1N8qdZqLrR5ifdUT";
  const hosted = /^https?:$/.test(location.protocol) && !/(^|\.)claude(usercontent)?\.(ai|com)$/.test(location.hostname);
  const mapsUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  // Satellite view lives in Google Maps: the claude.ai page can't load outside tiles (Maps URLs API, basemap=satellite).
  const satUrl = (lat, lng, zoom = 16) => `https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lng}&zoom=${zoom}&basemap=satellite`;

  /* --------------------------------------------------------- pieces */
  /** The day's pinned stops in Google's satellite view, framed to fit them (build.mjs dayRoute). */
  const satBtn = (r) => r?.sat ? `<a class="btn" target="_blank" rel="noopener" href="${satUrl(r.sat.lat, r.sat.lng, r.sat.zoom)}">Satellite ↗</a>` : "";
  function routeBlock(r) {
    const n = r.links.length;
    return `<div class="route"><div class="eyebrow" style="margin-bottom:6px">Day route · ${r.total} stops${r.pinned ? ` · ${r.pinned} pinned` : ""}</div>
      <div class="row">${r.links.map((l, i) => `<a class="btn" target="_blank" rel="noopener" href="${esc(l.url)}">${n > 1 ? `Part ${i + 1} of ${n}` : "Open in Google Maps"} ↗</a>`).join("")}${satBtn(r)}</div>
      <div class="muted" style="font-size:12.5px;margin-top:6px">${r.links.map((l, i) => `${n > 1 ? `<b>${i + 1}.</b> ` : ""}${l.from ? esc(l.from) : "Your location"} → ${l.stops.map(esc).join(" → ")}`).join("<br>")}</div></div>`;
  }
  function dayCard(t, d, opts = {}) {
    const s = short(d.date);
    const mins = startMinutes(d.schedule);
    const nextIdx = opts.nowMinutes != null ? mins.findIndex((m, i) => m != null && after(mins, i) > opts.nowMinutes) : -1;
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
        ${d.route ? routeBlock(d.route) : ""}
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
    const when = st === "upcoming" ? `${daysBetween(today, t.start)} days out` : st === "active" ? `Day ${daysBetween(t.start, today) + 1} of ${t.days.length}` : st === "past" ? "Done" : t.target ? `${/target/i.test(t.datesLabel ?? "") ? "" : "target "}${daysBetween(today, t.target)} days out` : "No dates";
    const nightsBooked = t.booking.filter((b) => b.booked).length;
    const tabs = [["plan", "Plan"], ["places", "Places"], ["prep", "Prep", t.questions.length + t.reservations.filter((r) => !r.done).length], ["journal", "Journal", t.log.entries.length]];
    return `
      <div class="head">
        <a class="back" href="#trips">← Trips</a>
        <div class="eyebrow">${esc(t.datesLabel ?? "")} · ${esc(when)}</div>
        <h1>${esc(t.title)}</h1>
        ${t.why ? `<div class="sub${strip(t.why).length > 220 ? " clamp" : ""}">${t.why}</div>${strip(t.why).length > 220 ? `<button type="button" class="more" data-more>More</button>` : ""}` : ""}
        <div class="stats">
          <div><b>${t.days.length}</b><span>days</span></div>
          <div><b>${nightsBooked}/${t.booking.length}</b><span>bookings made</span></div>
          <div><b>${t.located.verified}/${t.located.total}</b><span>places located</span></div>
          <div><b>${t.questions.length}</b><span>open questions</span></div>
        </div>
        ${t.mymaps || invitesFor(t.slug).length ? `<div class="links">${t.mymaps ? `<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/d/viewer?mid=${encodeURIComponent(t.mymaps)}">My Map ↗</a>` : ""}${invitesFor(t.slug).map((p) => `<a class="btn" target="_blank" rel="noopener" href="${esc(p.url)}">Invite: ${esc(p.title)} · ${esc(PSTATUS[p.status] ?? p.status)}${p.behind ? " ⚠" : ""} ↗</a>`).join("")}</div>` : ""}
      </div>
      <nav class="seg" aria-label="Trip sections">${tabs.map(([k, l, n]) => `<a href="#t-${t.slug}-${k}" ${k === sec ? 'aria-current="page"' : ""}>${l}${n ? `<span class="count">${n}</span>` : ""}</a>`).join("")}</nav>`;
  }

  const checkRow = (id, html, done) => {
    const ticked = done || store.get(id, false);
    return `<label class="check${ticked ? " done" : ""}"><input type="checkbox" data-store="${esc(id)}" ${ticked ? "checked" : ""} ${done ? "disabled" : ""}><span>${html}</span></label>`;
  };

  /* ------------------------------------------------------ field card */
  /** Today on one screen: where the plan has you, the day as compact rows,
      light left, tonight's camp and tomorrow's start. Sun times come from
      the trip's computed _gen/sun.json; with none, the card says so. */
  const startOf = (r) => r.time.split("→")[0].replace(/~~/g, "").trim();
  const toMin = (s, pm) => { const m = /(\d{1,2}):(\d{2})/.exec(s ?? ""); return m ? ((+m[1] % 12) + (pm || /PM/i.test(s) ? 12 : 0)) * 60 + +m[2] : null; };
  function fieldCard(t, d, n) {
    const mins = startMinutes(d.schedule);
    const cur = mins.findIndex((m, i) => m != null && m <= n.minutes && after(mins, i) > n.minutes);
    const nxt = mins.findIndex((m) => m != null && m > n.minutes);
    const sunset = d.sun ? toMin(d.sun.sunset, true) : null;
    const dark = d.sun ? toMin(d.sun.dark, true) : null;
    const tomorrow = t.days.find((x) => x.n === d.n + 1);
    const tFirst = tomorrow?.schedule.find((r) => !/optional/i.test(r.time));
    const o = d.overnight;
    const left = (m) => (m > n.minutes ? hm(m - n.minutes) : null);
    const rows = d.schedule.map((r, i) => {
      const past = mins[i] != null && i !== cur && after(mins, i) <= n.minutes;
      const est = r.est && r.est !== "—" ? r.est : "";
      return `<div class="frow${i === nxt ? " is-next" : ""}${i === cur ? " is-now" : ""}${past ? " is-past" : ""}${isCut(r) ? " is-cut" : ""}${r.warn ? " warn" : ""}">
        <span class="ft mono">${esc(startOf(r))}</span>
        <span class="fw">${isCut(r) ? '<span class="tag">Cut</span>' : ""}${i === cur ? '<span class="tag">Now</span>' : i === nxt ? '<span class="tag">Next</span>' : ""}${r.title}</span>
        <span class="fe mono">${esc(est)}</span>
        ${r.maps ? `<a class="maps" target="_blank" rel="noopener" href="${mapsUrl(r.maps)}">Maps ↗</a>` : "<span></span>"}
      </div>`;
    }).join("");
    return `<div class="stack field">
      <div><div class="eyebrow">${esc(t.title)} · Day ${d.n} of ${t.days.length}</div><h2>${d.title}</h2></div>
      <div class="panel fcard">
        <div class="fgrid">
          <div><div class="eyebrow">To sunset</div><div class="big mono">${sunset == null ? "—" : left(sunset) ?? "Set"}</div>
            <div class="muted small">${d.sun ? `Set ${esc(d.sun.sunset)} · dark ${esc(d.sun.dark)}${sunset <= n.minutes && dark != null && left(dark) ? ` · ${left(dark)} to dark` : ""}` : "Sun times not computed for this trip"}</div></div>
          <div><div class="eyebrow">Tomorrow starts</div><div class="small">${tFirst ? `<span class="mono">${esc(startOf(tFirst))}</span> ${tFirst.title}` : "Last day of the plan"}</div></div>
        </div>
        <div class="frows">${rows || '<div class="muted pad">No schedule for today.</div>'}</div>
        ${o ? `<div class="tonight">
          <div><div class="eyebrow">Tonight</div><div><b>${o.name}</b>${o.place ? `, ${o.place}` : ""}</div>
            ${o.confirmation ? `<div class="small">${o.confirmation}</div>` : ""}${o.checkin ? `<div class="muted small">${o.checkin}</div>` : ""}</div>
          ${o.maps || o.place ? `<a class="maps" target="_blank" rel="noopener" href="${mapsUrl(o.maps || strip(o.name).replace(/\s+—.*$/, "") + ", " + strip(o.place))}">Maps ↗</a>` : ""}
        </div>` : ""}
        ${d.slack ? `<div class="fslack"><div class="eyebrow">If you're behind</div><div>${d.slack}</div></div>` : ""}
      </div>
      ${d.warnings ? `<div class="callout prose">${d.warnings}</div>` : ""}
      <div class="row">
        ${d.route ? d.route.links.map((l, i, a) => `<a class="btn" target="_blank" rel="noopener" href="${esc(l.url)}">${a.length > 1 ? `Route ${i + 1}/${a.length}` : "Day route"} ↗</a>`).join("") + satBtn(d.route) : ""}
        <a class="btn" href="#t-${t.slug}-plan">Whole day</a>
        <button type="button" class="btn ask" data-ask="${esc(askPrompt(t, d, nxt >= 0 ? strip(d.schedule[nxt].title) : ""))}">Ask Claude</button>
        <span class="ask-msg muted" style="font-size:12.5px"></span>
      </div>
    </div>`;
  }

  /* --------------------------------------------------- booking windows */
  /** Grouped against this phone's date, so a copy cached a week ago still
      says "open now" on the right day. The dates themselves are built. */
  function bookingGroups(today) {
    const w = D.booking ?? [];
    const by = (k) => (a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0);
    return {
      open: w.filter((x) => x.opens && x.opens <= today).sort(by("target")),
      soon: w.filter((x) => x.opens && x.opens > today).sort(by("opens")),
      anytime: w.filter((x) => x.anytime).sort(by("target")),
      unknown: w.filter((x) => !x.opens && !x.anytime).sort(by("target")),
    };
  }
  /** Now's slice of To-do: the counts, the first people to chase and the next windows to open. */
  function todoCard(today) {
    const T = todo(today);
    const top = [...T.ask.slice(0, 3).map(askRow), ...T.soon.slice(0, 2).map((x) => askRow({ kind: "send", verb: `Window opens ${fmt(x.opens)}, ${outIn(today, x.opens)}`, html: x.what, where: `${x.trip} · ${x.system}`, href: "#todo" }))];
    return `<div class="section">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h2>To-do</h2><span class="muted mono" style="font-size:12px">${T.n.ask} ask · ${T.n.book} book · ${T.n.pins} pin · ${T.n.buy} buy</span></div>
      ${top.length ? `<div class="panel divide">${top.join("")}</div>` : ""}
      <a class="btn" href="#todo">All of it in To-do ›</a></div>`;
  }

  /* ---------------------------------------------------------- views */
  const V = {};

  V.book = () => {
    const today = now().date;
    const g = bookingGroups(today);
    const row = (x, right) => `<div class="brow${x.opens === today ? " is-today" : ""}"><div>
      <div>${x.what}</div>
      <div class="where"><a href="#t-${x.slug}-prep">${esc(x.trip)}</a> · ${esc(x.system)}${x.published ? " · published date" : ""}</div></div>
      <div class="when mono">${right}</div></div>`;
    const block = (title, note, list, right) => list.length ? `<div class="section"><div><h2>${title} <span class="count-inline">${list.length}</span></h2>${note ? `<div class="muted small">${note}</div>` : ""}</div><div class="panel divide">${list.map((x) => row(x, right(x))).join("")}</div></div>` : "";
    const fmtY = (s) => fmt(s) + (s.slice(0, 4) === today.slice(0, 4) ? "" : ` ${s.slice(0, 4)}`);
    const rel = (x) => (x.releaseET ? `<br>${clock(toMin(x.releaseET))} ET` : "");
    return `<div class="stack"><a class="back" href="#todo">← To-do</a><h1>Booking windows</h1>
      <p class="muted" style="margin:0">Every reservation not marked booked. Opening dates are computed (first night minus the lead time in <code>me/booking.md</code>) or a published release date.</p>
      ${block("Open now", "The window has opened.", g.open, (x) => `<span class="muted">opened</span><br>${fmtY(x.opens)}`)}
      ${block("Opens soon", "", g.soon, (x) => { const d = daysBetween(today, x.opens); return `${fmtY(x.opens)}${rel(x)}<br><b>${d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`}</b>`; })}
      ${block("Bookable anytime", "No rolling window for these.", g.anytime, (x) => `<span class="muted">for</span><br>${fmtY(x.target)}`)}
      ${block("Window unknown", "Confirm these by hand.", g.unknown, (x) => `<span class="muted">for</span><br>${fmtY(x.target)}`)}
      ${D.ics ? `<div class="panel pad"><div class="eyebrow">Calendar alarms</div>
        <p style="margin:4px 0 10px;font-size:14px">One event per window that hadn't opened when this page was built: at the release minute when it's known, with an alarm the evening before (and 10 minutes ahead for a timed release). Re-importing updates the same events.</p>
        ${hosted
          ? `<a class="btn primary" href="booking-alarms.ics">Add to calendar (.ics)</a>`
          : `<a class="btn primary" href="${PAGES_URL}booking-alarms.ics" target="_blank" rel="noopener">Get the .ics</a>
        <p class="muted" style="margin:8px 0 0;font-size:12.5px">This copy can't hand over a calendar file, so the button opens the GitHub Pages copy. That works once Pages is turned on (Settings → Pages → Source: GitHub Actions).</p>`}</div>` : ""}
      <p class="note">Same computation as <code>tools/now.mjs</code> and <code>tools/ics.mjs</code>. Mark a row <code>booked: true</code> in its <code>trip.md</code> to drop it.</p>
    </div>`;
  };

  V.now = () => {
    const n = now();
    const active = D.trips.find((t) => tripState(t, n.date) === "active");
    // Like tools/now.mjs: a trip with only a target date still counts as next,
    // labelled as a target so it never reads as booked.
    const when = (t) => t.start ?? t.target;
    const next = D.trips.filter((t) => tripState(t, n.date) === "upcoming" || (!t.start && t.target > n.date && !["done", "shelved"].includes(t.status)))
      .sort((a, b) => when(a) < when(b) ? -1 : 1)[0];
    let top = "";
    if (active) {
      const d = active.days.find((x) => x.date === n.date);
      top = d ? fieldCard(active, d, n) : `<div class="hero"><div class="eyebrow">On the road</div><h2><a href="#t-${active.slug}-plan" style="text-decoration:none">${esc(active.title)}</a></h2><div>No day in the plan for ${fmt(n.date)}.</div></div>`;
    } else if (next) {
      const days = daysBetween(n.date, when(next));
      top = `<div class="hero">
          <div class="eyebrow">Next trip${next.start ? "" : ` · target ${fmt(next.target)}, not booked`}</div>
          <div class="countdown">${days}<small>day${days === 1 ? "" : "s"}</small></div>
          <h2><a href="#t-${next.slug}-plan" style="text-decoration:none">${esc(next.title)}</a></h2>
          <div>${esc(next.datesLabel ?? "")} · ${esc(next.region ?? "")}</div>
          ${next.next ? `<div class="hero-next">${next.next}</div>` : ""}
        </div>`;
    } else {
      top = `<div class="hero"><div class="eyebrow">No trip scheduled</div><h2>Nothing on the calendar</h2></div>`;
    }
    const recent = D.trips.flatMap((t) => t.log.entries.map((e) => ({ ...e, t }))).sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 4);
    return `<div class="stack">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h1>Now</h1><span class="mono muted" style="font-size:13px">${fmt(n.date)}${n.preview ? " · preview" : ""}</span></div>
      ${top}
      ${todoCard(n.date)}
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
    // Undated trips have no place on the timeline, so they keep a list.
    const undated = groups.idea.filter((t) => !t.target);
    return `<div class="stack"><h1>Trips</h1>
      ${block("On the road", groups.active)}
      ${D.timeline ? timelineBlock(today) : block("Coming up", groups.upcoming)}
      ${block("Not scheduled", undated)}
      ${block("Done", groups.past.reverse())}
      <a class="panel booksum" href="#ideas"><div><div class="eyebrow">Ideas</div><div>${(D.ideas ?? []).length} potential trips and ${(D.bucket ?? []).filter((b) => b.status === "want").length} bucket-list places</div></div><span class="go muted" aria-hidden="true">›</span></a>
    </div>`;
  };

  /* ------------------------------------------------------------ timeline */
  /* Today → the horizon (me/calendar.md), built by tools/lib/timeline.mjs:
     a year grid (a row per month, a square per day) over the same story as a
     list in date order: trips, pencilled ideas (a wishlist file with start:),
     open stretches, and the calendar's marks. Days already past fade. */
  const TRIP_COLORS = ["#c0643a", "#1f7a80", "#2c5e8c", "#5b7a2e", "#9a4f8c", "#b08a1e"];
  const DOWS = (iso) => DOW[parse(iso).getDay()];
  const range2 = (a, b) => a === b ? `${DOWS(a)} ${fmt(a).slice(4)}` : `${fmt(a)} → ${fmt(b)}`;
  const FIT = { fly: "Room for a fly trip", drive: "Room for a drive trip", weekend: "Room for a weekend away" };
  const plainWhat = (h) => strip(h).replace(/\s*\(.*$/, "").replace(/,.*$/, "").trim();
  function tripChips(t, today) {
    const chips = [];
    for (const p of invitesFor(t.slug)) {
      chips.push(`<a class="chip ${p.status === "in" ? "ok" : p.status === "draft" || p.status === "unknown" ? "draft" : ""}" target="_blank" rel="noopener" href="${esc(p.url)}">Invite: ${esc(PSTATUS[p.status] ?? p.status)}${p.behind ? " ⚠" : ""} ↗</a>`);
    }
    const ws = (D.booking ?? []).filter((w) => w.slug === t.slug);
    const openNow = ws.filter((w) => w.opens && w.opens <= today);
    const soon = ws.filter((w) => w.opens && w.opens > today).sort((a, b) => a.opens < b.opens ? -1 : 1);
    const any = ws.filter((w) => w.anytime);
    const first = openNow[0] ? `<span class="chip warn">${esc(plainWhat(openNow[0].what))}: book now</span>`
      : soon[0] ? `<span class="chip">${esc(plainWhat(soon[0].what))}: opens ${fmt(soon[0].opens).slice(4)}</span>`
      : any[0] ? `<span class="chip">${esc(plainWhat(any[0].what))}: book anytime</span>` : "";
    if (first) chips.push(first);
    if (ws.length > 1) chips.push(`<span class="chip">+${ws.length - 1} booking${ws.length > 2 ? "s" : ""}</span>`);
    if (t.questions?.length) chips.push(`<span class="chip">${t.questions.length} open question${t.questions.length === 1 ? "" : "s"}</span>`);
    return chips.length ? `<div class="chips">${chips.join("")}</div>` : "";
  }
  function timelineBlock(today) {
    const T = D.timeline;
    const tripsBy = Object.fromEntries(D.trips.map((t) => [t.slug, t]));
    const ideasBy = Object.fromEntries((D.ideas ?? []).map((i) => [i.slug, i]));
    const items = T.items.filter((x) => x.end >= today);
    const color = {};
    items.filter((x) => x.type === "trip").forEach((x, i) => { color[x.slug] = TRIP_COLORS[i % TRIP_COLORS.length]; });

    // The grid: a row per month from today's month to the horizon.
    const kindOf = {};
    for (let i = 0, d = parse(T.from); i < T.days.length; i++, d.setDate(d.getDate() + 1)) kindOf[iso(d)] = T.days[i];
    const first = parse(T.from), last = parse(T.to);
    let grid = "";
    for (let y = first.getFullYear(), m = first.getMonth(); y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth()); m === 11 ? (y++, m = 0) : m++) {
      let cells = "";
      for (let day = 1; day <= 31; day++) {
        const dt = new Date(y, m, day);
        if (dt.getMonth() !== m) { cells += '<i class="tc none"></i>'; continue; }
        const d = iso(dt), k = kindOf[d];
        if (!k) { cells += `<i class="tc past"></i>`; continue; }
        const cls = k === "c" ? "class" : k === "b" ? "block" : k === "f" ? "free" : k.startsWith("i:") ? "idea" : "trip";
        const gap = cls === "free" && items.some((x) => x.type === "gap" && d >= x.start && d <= x.end);
        const style = cls === "trip" ? ` style="background:${color[k.slice(5)] ?? "var(--accent)"}"` : "";
        cells += `<i class="tc ${gap ? "gap" : cls}${d < today ? " past" : ""}${d === today ? " now" : ""}"${style} title="${d}"></i>`;
      }
      grid += `<div class="trow"><span class="tm">${MON[m]}</span><div class="tcells">${cells}</div></div>`;
    }

    // The summary: the plan in one line.
    const gaps = items.filter((x) => x.type === "gap");
    const nextTrip = items.find((x) => x.type === "trip");
    const nt = nextTrip && tripsBy[nextTrip.slug];
    const pencils = items.filter((x) => x.type === "idea").length + gaps.reduce((a, g) => a + g.pencilled.length, 0);
    const lead = `${nt ? `Next: <b>${esc(nt.title)}</b>, ${nextTrip.start <= today ? "on the road" : `in ${daysBetween(today, nextTrip.start)} days`}. ` : ""}Before ${T.horizon?.date ? fmt(T.horizon.date).slice(4) : fmt(T.to).slice(4)}: ${items.filter((x) => x.type === "trip").length} trips, ${pencils} pencilled in, ${gaps.length} open stretches (${gaps.reduce((a, g) => a + g.days, 0)} days).`;

    const ideaLink = (slug) => ideasBy[slug] ? `<a href="#w-${slug}">${esc(ideasBy[slug].title)}</a>` : esc(slug);
    const ideaChips = (slug) => (D.proposals ?? []).filter((p) => p.wishlist === slug && !p.trip && !["superseded", "out"].includes(p.status))
      .map((p) => `<a class="chip ${p.status === "in" ? "ok" : "draft"}" target="_blank" rel="noopener" href="${esc(p.url)}">${p.format === "doc" ? "Doc" : "Invite"}: ${esc(PSTATUS[p.status] ?? p.status)} ↗</a>`).join("");
    const pen = (slug) => (T.pencilled ?? []).find((p) => p.slug === slug);
    const row = (x) => {
      if (x.type === "trip") {
        const t = tripsBy[x.slug]; if (!t) return "";
        const out = x.start > today ? `in ${daysBetween(today, x.start)} days` : "on the road";
        return `<div class="tl-it trip" style="--c:${color[x.slug]}"><a class="panel tl-card" href="#t-${t.slug}-plan">
          <div class="when">${range2(x.start, x.end)} · ${out}</div><h3>${esc(t.title)}</h3>
          <div class="meta">${t.days.length || daysBetween(x.start, x.end) + 1} days · ${esc(t.status)}</div></a>${tripChips(t, today)}</div>`;
      }
      if (x.type === "idea") {
        const i = ideasBy[x.slug];
        return `<div class="tl-it idea"><div class="panel tl-card idea"><div class="when">${range2(x.start, x.end)} · pencilled in</div>
          <h3>${ideaLink(x.slug)}</h3><div class="meta">${esc(i?.subtitle ?? "")}</div>${ideaChips(x.slug) ? `<div class="chips">${ideaChips(x.slug)}</div>` : ""}</div></div>`;
      }
      if (x.type === "gap") {
        // Only pencilled ideas are named as the plan. The rest are listed, not ranked:
        // a few by name, many as a count to open (by month and length, me/calendar.md).
        const top = x.ideas.length <= 3 ? x.ideas : [], rest = x.ideas.length > 3 ? x.ideas : [];
        const pencil = x.pencilled.map((slug) => { const p = pen(slug); return `<div class="tl-pen"><b>Pencilled in:</b> ${ideaLink(slug)}${p ? `, ${range2(p.start, p.end)}` : ""} ${ideaChips(slug)}</div>`; }).join("");
        return `<div class="tl-it gap"><div class="tl-gap"><div class="when">${range2(x.start < today ? today : x.start, x.end)}</div>
          <div class="t">${x.end >= today ? daysBetween(x.start < today ? today : x.start, x.end) + 1 : x.days} days open${x.label ? ` · ${esc(x.label)}` : ""}</div>
          ${x.fit ? `<div class="fit">${FIT[x.fit.mode] ?? esc(x.fit.label)}</div>` : ""}
          ${pencil || '<div class="fit muted">Nothing pencilled in.</div>'}
          ${top.length ? `<div class="tl-ideas">${pencil ? "Also fits" : "Fits"}: ${top.map(ideaLink).join(", ")}${rest.length ? "" : ""}</div>` : ""}
          ${rest.length ? `<details class="tl-more"><summary>${rest.length} ideas fit by month and length</summary><div>${rest.map(ideaLink).join(", ")}</div></details>` : ""}</div></div>`;
      }
      if (x.type === "term") return `<div class="tl-it mark"><div class="tl-term">${esc(x.title)} ${fmt(x.start).slice(4)} · ${esc(x.detail.replace(/until (\d{4}-\d\d-\d\d)/, (_, d) => "until " + fmt(d).slice(4)))}</div></div>`;
      return `<div class="tl-it mark${x.horizon ? " end" : ""}"><div class="when">${range2(x.start, x.end)}</div><div class="t">${esc(x.title)}</div>${x.horizon ? '<div class="muted" style="font-size:13px">After this, trips come out of PTO.</div>' : ""}</div>`;
    };
    const cur = T.current && today <= T.current.end ? ` · ${esc(T.current.name)}, ${T.current.classDays.join("/")} classes until ${fmt(T.current.end).slice(4)}` : "";
    return `<div class="section"><h2>The plan</h2>
      <div class="tl-lead">${lead}</div>
      <div class="panel"><div class="tgrid" aria-hidden="true">${grid}</div>
        <div class="tlegend"><span><i style="background:${TRIP_COLORS[0]}"></i>Trip</span><span><i class="lg-idea"></i>Pencilled in</span><span><i class="lg-gap"></i>Open 5+ days</span><span><i class="lg-class"></i>Class</span><span><i class="lg-block"></i>Finals, family</span><span><i class="lg-free"></i>Free</span></div></div>
      <div class="tl">
        <div class="tl-it now"><div><span class="t">Today · ${fmt(today)}</span><span class="when">${cur}</span></div></div>
        ${items.map(row).join("")}
      </div></div>`;
  }

  /* Invite pages for the people joining a trip (share/proposals.yaml). Live
     ones first; parked and replaced ones fold away. Each opens the claude.ai page. */
  /** The live invite pages for one trip: its own, plus pages covering several trips. */
  const invitesFor = (slug) => (D.proposals ?? []).filter((p) => (p.trips ?? [p.trip]).includes(slug) && !["superseded", "parked", "out"].includes(p.status));
  const PSTATUS = { draft: "Draft", sent: "Sent", in: "They're in", out: "Said no", parked: "Parked", superseded: "Replaced", unknown: "Status?" };
  function proposalsBlock() {
    const all = D.proposals ?? [];
    if (!all.length) return "";
    const plan = planName;
    const row = (p) => `<a class="trip-row" target="_blank" rel="noopener" href="${esc(p.url)}">
        <div class="date"><span class="pill pill-${p.status === "in" ? "own" : p.status === "unknown" ? "unknown" : ""}" style="min-width:0">${PSTATUS[p.status] ?? esc(p.status)}</span></div>
        <div><h3>${esc(p.title)}</h3><div class="meta">${esc(p.for)} · ${esc(plan(p))}</div>
        <div class="meta">${p.format === "doc" ? "Doc" : "Page"} as of ${fmt(p.asOf)}${p.behind ? ` · <span class="chip warn">${p.behind.changed ? `plan moved ${short(p.behind.changed).m} ${short(p.behind.changed).d}` : "out of date"}</span>` : ""}</div>
        ${p.behind?.stale ? `<div class="meta">${p.behind.stale}</div>` : ""}${p.note ? `<div class="meta">${p.note}</div>` : ""}</div>
        <span class="go" aria-hidden="true">↗</span></a>`;
    const live = all.filter((p) => !["parked", "superseded", "out"].includes(p.status));
    const rest = all.filter((p) => !live.includes(p));
    return `<div class="section"><div><h2>Invite pages <span class="count-inline">${live.length} live</span></h2>
      <div class="note">Every page made for people joining a trip (<code>share/proposals.yaml</code>). They stay private until shared.</div></div>
      ${live.length ? `<div class="panel divide">${live.map(row).join("")}</div>` : ""}
      ${rest.length ? `<details class="fold panel"><summary>Parked, replaced or declined (${rest.length})</summary><div class="divide">${rest.map(row).join("")}</div></details>` : ""}</div>`;
  }

  /* Potential trips: grouped by the horizon test (me/calendar.md), filtered
     by month and drive/fly. Filters are remembered on this phone. */
  const HORIZON = {
    "only-now": ["Only now", "Won't fit two weeks of PTO after Aug 2027. The free summer is for these."],
    confirmed: ["Confirmed", "Happening, no trip page yet."],
    keeps: ["Keeps", "Fits in PTO later. No rush."],
    weekend: ["Weekend", "Inside the weekend radius. Weekends outlast the horizon."],
  };
  function ideasBlock({ top = false } = {}) {
    const month = store.get("ideaMonth", 0), mode = store.get("ideaMode", "");
    const all = D.ideas ?? [];
    const list = all.filter((i) => (!month || i.months.includes(month)) && (!mode || i.mode === mode));
    const chip = (key, val, label, cur) => `<button type="button" class="chip${cur === val ? " accent" : ""}" data-filter="${key}" data-val="${esc(val)}">${label}</button>`;
    const modes = [...new Set(all.map((i) => i.mode).filter(Boolean))].sort();
    const row = (i) => `<a class="trip-row nodate" href="#w-${i.slug}">
        <div><h3>${esc(i.title)}</h3><div class="meta">${i.mode ? `<span class="mode">${esc(i.mode)}</span> · ` : ""}${esc(i.region)}${i.length ? " · " + esc(i.length) : ""}${i.noteCount ? ` · ${i.noteCount} note${i.noteCount === 1 ? "" : "s"}` : ""}${bucketFor({ idea: i.slug }).length ? ` · ${bucketFor({ idea: i.slug }).length} on bucket list` : ""}</div><div class="meta">${esc(i.subtitle)}</div></div>
        <span class="go" aria-hidden="true">›</span></a>`;
    const groups = Object.keys(HORIZON).map((h) => [h, list.filter((i) => i.horizon === h)]).filter(([, l]) => l.length);
    return `<div class="section"${top ? ' style="margin-top:0"' : ""}><h2>Potential trips <span class="count-inline">${list.length} of ${all.length}</span></h2>
      <div class="filters">${chip("ideaMonth", 0, "Any month", month)}${MON.map((m, i) => chip("ideaMonth", i + 1, m, month)).join("")}</div>
      <div class="filters">${chip("ideaMode", "", "Any way", mode)}${modes.map((m) => chip("ideaMode", m, m, mode)).join("")}</div>
      ${groups.map(([h, l]) => `<div class="section" style="margin-top:10px"><div><div class="eyebrow">${HORIZON[h][0]} · ${l.length}</div><div class="note">${HORIZON[h][1]}</div></div><div class="panel divide">${l.map(row).join("")}</div></div>`).join("")
        || '<div class="panel pad muted">Nothing on the list fits that. Which is itself a daydream prompt.</div>'}</div>`;
  }

  /* ------------------------------------------------------------- to-do */
  /* Everything that needs a move, across every live trip, from data the
     page already has: invite pages and open questions with a **Waiting on:**
     line (Ask people), unbooked rows and their windows (Book), the rest of
     the open questions and unchecked checks (Decide & check), and gear still
     need/unknown (Buy). Nothing here is ticked on the site: a thing is done
     when its file says so. */
  const norm = (h) => strip(h).toLowerCase().replace(/[^a-z0-9]/g, "");
  const whenOf = (t) => t.start ?? t.target ?? "9999";
  const liveTrips = (today) => D.trips.filter((t) => !["done", "shelved"].includes(t.status) && tripState(t, today) !== "past")
    .sort((a, b) => (whenOf(a) < whenOf(b) ? -1 : 1));
  /** A check that repeats a booking row ("**CLE ⇄ DUB round trip** booked…") shows once, under Book. */
  const isBookingCheck = (t, r) => {
    const lead = norm((/^\W*<strong>(.*?)<\/strong>/.exec(r.text) ?? [])[1] ?? "");
    return lead.length >= 8 && t.booking.some((b) => { if (b.booked) return false; const w = norm(b.what); return w.startsWith(lead) || lead.startsWith(w); });
  };
  const outIn = (today, iso) => { const d = daysBetween(today, iso); return d === 0 ? "today" : d < 0 ? `${-d} days ago` : `in ${d} day${d === 1 ? "" : "s"}`; };
  /** A proposal's date: its trip's, else its pencilled idea's. */
  const proposalWhen = (p) => {
    const t = (p.trips ?? [p.trip]).map((s) => D.trips.find((x) => x.slug === s)).filter(Boolean)[0];
    return t ? whenOf(t) : (D.timeline?.pencilled ?? []).find((x) => x.slug === p.wishlist)?.start ?? "9999";
  };
  const planName = (p) => p.trip ? (p.trips ?? [p.trip]).map((s) => D.trips.find((t) => t.slug === s)?.title ?? s).join(" + ") : ((D.ideas ?? []).find((i) => i.slug === p.wishlist)?.title ?? p.wishlist);

  let todoMemo = null;
  function todo(today) {
    if (todoMemo?.today === today) return todoMemo.v;
    const v = todoFor(today);
    todoMemo = { today, v };
    return v;
  }
  function todoFor(today) {
    const trips = liveTrips(today);
    const ask = [];
    for (const p of D.proposals ?? []) {
      if (["parked", "superseded", "out"].includes(p.status)) continue;
      const verb = p.behind ? "Update the page" : p.status === "draft" ? "Send the page" : p.status === "sent" ? "Waiting on replies" : p.status === "unknown" ? "Status unknown" : null;
      if (!verb) continue;
      ask.push({ when: proposalWhen(p), kind: p.status === "sent" && !p.behind ? "wait" : "send", verb, html: esc(p.title), who: esc(p.for), where: planName(p), href: p.url, ext: true,
        note: p.behind ? (p.behind.stale || (p.behind.changed ? `The plan moved ${fmt(p.behind.changed)}.` : "")) : "" });
    }
    for (const t of trips) for (const q of t.questions) {
      if (q.waitingOn) ask.push({ when: whenOf(t), kind: "wait", verb: "Ask", verbWho: q.waitingOn, html: q.q, where: t.title, href: `#t-${t.slug}-prep`, note: q.blocks ? `Blocks: ${q.blocks}` : "" });
    }
    ask.sort((a, b) => (a.when < b.when ? -1 : a.when > b.when ? 1 : 0));

    // The same groups as the #book page, so the two can't disagree.
    const { open: openNow, soon, anytime, unknown } = bookingGroups(today);
    const byTrip = trips.map((t) => ({ t, rows: [...anytime, ...unknown].filter((x) => x.slug === t.slug) })).filter((g) => g.rows.length);

    const plan = trips.map((t) => ({
      t,
      decide: t.questions.filter((q) => !q.waitingOn),
      checks: t.reservations.filter((r) => !r.done && !isBookingCheck(t, r)),
    })).filter((g) => g.decide.length || g.checks.length);

    // Places on a live trip with no verified coordinate: the Pin Ledger's job.
    const pins = trips.map((t) => ({ t, places: t.places.flatMap((g) => g.places.filter((p) => !p.verified).map((p) => ({ ...p, group: g.group }))) })).filter((g) => g.places.length);
    const buy = D.gearNeeds ?? [];
    const nBook = openNow.length + soon.length + byTrip.reduce((a, g) => a + g.rows.length, 0);
    const nPlan = plan.reduce((a, g) => a + g.decide.length + g.checks.length, 0);
    const nPins = pins.reduce((a, g) => a + g.places.length, 0);
    return { trips, ask, openNow, soon, byTrip, plan, pins, buy, n: { ask: ask.length, book: nBook, plan: nPlan, pins: nPins, buy: buy.length } };
  }

  const askRow = (x) => `<a class="todo-row ${x.kind}" href="${esc(x.href)}"${x.ext ? ' target="_blank" rel="noopener"' : ""}>
      <span class="dot"></span>
      <div><div class="todo-verb">${esc(x.verb)}${x.verbWho ? ` <span class="who">${x.verbWho}</span>` : ""}</div>
      <div class="todo-what">${x.html}</div>
      ${x.who ? `<div class="todo-who">For: ${x.who}</div>` : ""}
      <div class="where">${esc(x.where)}${x.note ? ` · ${x.note}` : ""}</div></div>
      <span class="go" aria-hidden="true">${x.ext ? "↗" : "›"}</span></a>`;

  V.todo = () => {
    const today = now().date;
    const T = todo(today);
    const head = (id, title, n, note) => `<div id="todo-${id}"><h2>${title} <span class="count-inline">${n}</span></h2>${note ? `<div class="note">${note}</div>` : ""}</div>`;
    const tripLabel = (t) => `${esc(t.title)} <span class="muted mono" style="font-size:12px">${t.start ? outIn(today, t.start) : t.target ? `target ${outIn(today, t.target)}` : "no dates"}</span>`;
    const bookRow = (x, right) => `<div class="brow"><div><div>${x.what}</div><div class="where"><a href="#t-${x.slug}-prep">${esc(x.trip)}</a> · ${esc(x.system)}</div></div><div class="when mono">${right}</div></div>`;
    const stat = (id, n, label) => `<button type="button" data-jump="todo-${id}" aria-label="${n} ${esc(strip(label))}, jump to the list"><b>${n}</b> <span>${label}</span></button>`;
    // Decide & check counts the nearest trip only: 54 across every trip is a number nobody can act on.
    const firstPlan = T.plan[0];
    return `<div class="stack">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h1>To-do</h1><span class="mono muted" style="font-size:13px">${fmt(today)}</span></div>
      <p class="note" style="margin:0">Every open thread across the live trips. It reads the files, so a thing leaves this list when its file says it's done: tell Claude (<span class="mono">log:</span>, <span class="mono">we booked…</span>, <span class="mono">they're in</span>).</p>
      <div class="stats stats-btn">${stat("ask", T.n.ask, "ask people")}${stat("book", T.n.book, "to book")}${firstPlan ? stat("plan", firstPlan.decide.length + firstPlan.checks.length, `decide &amp; check · ${esc(firstPlan.t.title)}`) : stat("plan", 0, "decide &amp; check")}${stat("pins", T.n.pins, "to pin")}${stat("buy", T.n.buy, "to buy")}</div>

      <div class="section">${head("ask", "Ask people", T.n.ask, "Invite pages to send or chase, and open questions someone else has to answer (a <code>**Waiting on:**</code> line in <code>trip.md</code>). Soonest trip first.")}
        ${T.ask.length ? `<div class="panel divide">${T.ask.map(askRow).join("")}</div>` : '<div class="panel pad muted">Nobody to chase.</div>'}</div>

      <div class="section">${head("book", "Book", T.n.book, "Not marked booked. Opening dates are computed from <code>me/booking.md</code>.")}
        ${T.openNow.length ? `<div class="eyebrow">Open now</div><div class="panel divide">${T.openNow.map((x) => bookRow(x, `<span class="muted">opened</span><br>${fmt(x.opens)}`)).join("")}</div>` : ""}
        ${T.soon.length ? `<div class="eyebrow">Windows not open yet</div><div class="panel divide">${T.soon.map((x) => bookRow(x, `${fmt(x.opens)}<br><b>${outIn(today, x.opens)}</b>`)).join("")}</div>` : ""}
        ${T.byTrip.length ? `<div class="eyebrow">Bookable anytime, or window unknown</div>${T.byTrip.map((g, i) => `<details class="fold panel"${i === 0 ? " open" : ""}><summary><span>${tripLabel(g.t)} · ${g.rows.length}</span></summary><div class="divide flush">${g.rows.map((x) => bookRow(x, x.anytime ? `<span class="muted">anytime</span>` : `<span class="muted">window</span><br>unknown`)).join("")}</div></details>`).join("")}` : ""}
        <a class="btn" href="#book">Every booking window, with calendar alarms ›</a></div>

      <div class="section">${head("pins", "Pins", T.n.pins, "Places on a live trip with no checked coordinate, so no Maps pin, map line or offline GPX yet. Place each in the Pin Ledger (about 30 seconds: Find in Maps, long-press, copy, paste), then tell Claude <span class=\"mono\">pins are in</span>.")}
        <a class="btn primary" target="_blank" rel="noopener" href="${LEDGER_URL}">Open the Pin Ledger ↗</a>
        ${T.pins.map((g, i) => `<details class="fold panel"${i === 0 ? " open" : ""}><summary><span>${tripLabel(g.t)} · ${g.places.length}</span></summary><div class="divide flush">${g.places.map((p) => `<div class="place"><div><div class="pn">${esc(p.name)}</div><div class="pm">${esc(p.group)}${p.note ? ` · ${p.note}` : ""}</div></div><div class="links">${p.maps ? `<a class="maps" target="_blank" rel="noopener" href="${mapsUrl(p.maps)}">Find in Maps ↗</a>` : ""}</div></div>`).join("")}</div></details>`).join("") || '<div class="panel pad muted">Every place on the live trips is pinned.</div>'}</div>

      <div class="section">${head("plan", "Decide & check", T.n.plan, "Open questions that are yours to answer, and the unchecked checks (ones that repeat a booking are under Book).")}
        ${T.plan.map((g, i) => `<details class="fold panel"${i === 0 ? " open" : ""}><summary><span>${tripLabel(g.t)} · ${g.decide.length + g.checks.length}</span></summary><div class="divide flush">
          ${g.decide.map((q) => `<a class="todo-row decide" href="#t-${g.t.slug}-prep"><span class="dot"></span><div><div class="todo-verb">Decide</div><div class="todo-what">${q.q}</div>${q.blocks ? `<div class="where">Blocks: ${q.blocks}</div>` : ""}</div><span class="go" aria-hidden="true">›</span></a>`).join("")}
          ${g.checks.map((r) => `<a class="todo-row check-row" href="#t-${g.t.slug}-prep"><span class="dot"></span><div><div class="todo-verb">Check</div><div class="todo-what">${r.text}</div></div><span class="go" aria-hidden="true">›</span></a>`).join("")}
        </div></details>`).join("") || '<div class="panel pad muted">Nothing open.</div>'}</div>

      <div class="section">${head("buy", "Buy", T.n.buy, "Gear still <code>need</code> or <code>unknown</code> in <code>me/gear.md</code>.")}
        ${T.buy.length ? `<div class="panel divide">${T.buy.map((g) => `<a class="todo-row ${g.state === "need" ? "send" : "wait"}" href="#me-gear"><span class="dot"></span><div><div class="todo-what">${g.name}</div></div><span class="pill pill-${g.state}">${g.state}</span></a>`).join("")}</div>` : '<div class="panel pad muted">Kit is complete.</div>'}</div>

      ${proposalsBlock()}
    </div>`;
  };

  /* ------------------------------------------------------------ bucket */
  const KIND_LABEL = { hike: "Hike", walk: "City walk", view: "View", waterfall: "Waterfall", lake: "Lake", swim: "Swim", river: "River", campground: "Campground", city: "City", ruin: "Ruin", cave: "Cave", geology: "Geology", wildlife: "Wildlife", fossil: "Fossils & rocks", food: "Food", drive: "Drive", other: "Other" };
  /** Items tied to a trip or idea, plus (for a trip) the wanted ones in its states. */
  function bucketFor({ trip, idea, states = [] }) {
    return (D.bucket ?? []).filter((b) => (trip && b.trip === trip) || (idea && b.wishlist === idea) || (states.includes(b.state) && b.status === "want" && !b.trip));
  }
  function bucketRow(b, opts = {}) {
    const link = b.trip ? D.trips.find((t) => t.slug === b.trip) : null;
    const idea = b.wishlist ? (D.ideas ?? []).find((i) => i.slug === b.wishlist) : null;
    const mark = b.status === "done" ? '<span class="chip accent">✓ done</span>' : b.status === "dropped" ? '<span class="chip warn">dropped</span>' : "";
    return `<div class="place"><div>
      <div class="pn">${esc(b.name)} ${mark}</div>
      <div class="pm"><span class="chip">${esc(KIND_LABEL[b.kind] ?? b.kind)}</span> ${esc(b.where)}${b.months.length ? ` · ${b.months.map((m) => MON[m - 1]).join("/")}` : ""}</div>
      <div class="pm">${b.why}</div>
      ${b.verdict ? `<div class="pm"><b>Verdict:</b> ${b.verdict}</div>` : ""}${b.reason ? `<div class="pm"><b>Dropped:</b> ${b.reason}</div>` : ""}
      ${!opts.noLinks && (link || idea) ? `<div class="pm">${link ? `<a href="#t-${link.slug}-${b.status === "done" ? "journal" : "plan"}">${esc(link.title)} ›</a>` : ""}${idea ? `<a href="#w-${idea.slug}">${esc(idea.title)} ›</a>` : ""}</div>` : ""}
    </div></div>`;
  }

  const ideasSeg = (cur) => `<nav class="seg" aria-label="Ideas">${[["ideas", "Potential trips", (D.ideas ?? []).length], ["bucket", "Bucket list", (D.bucket ?? []).filter((b) => b.status === "want").length]].map(([k, l, n]) => `<a href="#${k}"${k === cur ? ' aria-current="page"' : ""}>${l}<span class="count">${n}</span></a>`).join("")}</nav>`;

  V.ideas = () => `<div class="stack"><h1>Ideas</h1>
    <p class="note" style="margin:0">Someday, in two sizes: potential trips (<code>wishlist/</code>, a place plus a season) and single places worth the detour (<code>bucket.yaml</code>). Add either by telling Claude: <span class="mono">daydream…</span> or <span class="mono">save that spot…</span></p>
    ${ideasSeg("ideas")}${ideasBlock({ top: true })}</div>`;

  V.bucket = () => {
    const all = D.bucket ?? [];
    const status = store.get("bStatus", "want"), kind = store.get("bKind", ""), state = store.get("bState", "");
    const list = all.filter((b) => (!status || b.status === status) && (!kind || b.kind === kind) && (!state || b.state === state));
    const chip = (key, val, label, cur) => `<button type="button" class="chip${cur === val ? " accent" : ""}" data-filter="${key}" data-val="${esc(val)}">${label}</button>`;
    const kinds = Object.keys(KIND_LABEL).filter((k) => all.some((b) => b.kind === k));
    const states = [...new Set(all.map((b) => b.state))].sort();
    const n = (s) => all.filter((b) => b.status === s).length;
    const byState = {};
    for (const b of list) (byState[b.state] ??= []).push(b);
    return `<div class="stack"><h1>Ideas</h1>
      <p class="note" style="margin:0">Someday, in two sizes: potential trips (<code>wishlist/</code>, a place plus a season) and single places worth the detour (<code>bucket.yaml</code>). Add either by telling Claude: <span class="mono">daydream…</span> or <span class="mono">save that spot…</span></p>
      ${ideasSeg("bucket")}
      <p class="muted" style="margin:0">${n("want")} to do, ${n("done")} done.</p>
      <div class="filters">${chip("bStatus", "want", `Want ${n("want")}`, status)}${chip("bStatus", "done", `Done ${n("done")}`, status)}${n("dropped") ? chip("bStatus", "dropped", `Dropped ${n("dropped")}`, status) : ""}${chip("bStatus", "", "All", status)}</div>
      <div class="filters">${chip("bKind", "", "Any kind", kind)}${kinds.map((k) => chip("bKind", k, KIND_LABEL[k], kind)).join("")}</div>
      <div class="filters">${chip("bState", "", "Anywhere", state)}${states.map((s) => chip("bState", s, s, state)).join("")}</div>
      ${Object.keys(byState).sort().map((st) => `<div class="section" style="margin-top:10px"><div class="eyebrow">${esc(st)} · ${byState[st].length}</div><div class="panel divide">${byState[st].map((b) => bucketRow(b)).join("")}</div></div>`).join("")
        || '<div class="panel pad muted">Nothing matches.</div>'}
      <p class="note"><code>bucket.yaml</code></p></div>`;
  };

  V.idea = (i) => {
    const ask = `Let's daydream about ${i.title} (wishlist/${i.slug}.md). /daydream ${i.slug} — [what caught your eye: an activity, a season, a question]`;
    return `<div class="stack"><a class="back" href="#ideas">← Ideas</a>
      <div><div class="eyebrow">Idea · ${esc(i.region)}</div><h1>${esc(i.title)}</h1><p class="muted" style="margin:0">${esc(i.subtitle)}</p></div>
      <div class="row" style="flex-wrap:wrap;gap:6px">${i.months.map((m) => `<span class="chip">${MON[m - 1]}</span>`).join("")}${i.mode ? `<span class="chip accent">${esc(i.mode)}</span>` : ""}${i.length ? `<span class="chip">${esc(i.length)}</span>` : ""}</div>
      ${i.window ? `<div class="panel pad"><div class="eyebrow">When</div><div>${i.window}</div></div>` : ""}
      <div class="panel pad prose">${i.why}</div>
      <div class="panel pad"><div class="eyebrow">Next</div><div class="prose">${i.next}</div></div>
      ${bucketFor({ idea: i.slug }).length ? `<div class="section"><h2>On the bucket list</h2><div class="panel divide">${bucketFor({ idea: i.slug }).map((b) => bucketRow(b, { noLinks: true })).join("")}</div></div>` : ""}
      <div class="section"><h2>Research notes</h2><div class="panel pad prose">${i.notes || '<p class="muted">Nothing yet. Every fact <code>/daydream</code> finds lands here with its source.</p>'}</div></div>
      <div class="row"><button type="button" class="btn ask" data-ask="${esc(ask)}">Daydream about this</button><span class="ask-msg muted" style="font-size:12.5px"></span></div>
      <p class="note">Updated ${esc(i.updated)} · <code>wishlist/${esc(i.slug)}.md</code></p></div>`;
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
        <h2 class="sr-only">Days</h2>
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
          <div class="links">${p.maps || p.verified ? `<a class="maps" target="_blank" rel="noopener" href="${p.verified ? mapsUrl(p.lat + "," + p.lng) : mapsUrl(p.maps)}">Maps ↗</a>` : ""}${p.verified && p.lat != null ? `<a class="maps" target="_blank" rel="noopener" href="${satUrl(p.lat, p.lng)}">Satellite ↗</a>` : ""}</div></div>`).join("")}</div></div>`).join("")}
        ${t.hikes.length ? `<div class="section"><h2>Hikes</h2><div class="panel tbl" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table><thead><tr><th>Hike</th><th>Day</th><th>Dist</th><th>Gain</th><th>Time</th></tr></thead><tbody>${t.hikes.map((h) => `<tr><td>${h.name} <a class="maps" style="margin-left:4px" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(strip(h.name).replace(/[⭐✅]/g, "").trim() + " AllTrails")}">AllTrails ↗</a></td><td class="num">${h.day ?? ""}</td><td class="num">${h.distance ?? ""}</td><td class="num">${h.gain ?? ""}</td><td class="num">${h.duration ?? ""}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
        ${(() => { const bl = bucketFor({ trip: t.slug, states: t.states }); if (!bl.length) return "";
          const on = bl.filter((b) => b.trip === t.slug), near = bl.filter((b) => b.trip !== t.slug);
          return `<div class="section"><h2>Bucket list</h2>${on.length ? `<div class="eyebrow">On this trip</div><div class="panel divide">${on.map((b) => bucketRow(b, { noLinks: true })).join("")}</div>` : ""}${near.length ? `<div class="eyebrow" style="margin-top:6px">Also in ${esc(t.states.join(", "))}, not on the plan</div><div class="panel divide">${near.map((b) => bucketRow(b)).join("")}</div>` : ""}</div>`; })()}
      </div>`;
    } else if (sec === "prep") {
      body = `<div class="stack">
        <div class="section" style="margin-top:6px"><h2>Bookings</h2><div class="panel divide">${t.booking.map((b) => `<div class="task ${b.booked ? "" : "warn"}"><span class="dot" style="background:${b.booked ? "var(--ok)" : "var(--warn)"}"></span><div>${b.what}<div class="where">${esc(b.system)} · ${b.booked ? "booked" : "not booked"}</div></div></div>`).join("")}</div></div>
        <div class="section"><h2>Checks</h2><div class="panel divide">${t.reservations.map((r, i) => checkRow(`${t.slug}:res:${i}`, r.text, r.done)).join("")}</div></div>
        ${t.questions.length ? `<div class="section"><h2>Open questions</h2><div class="panel divide">${t.questions.map((q) => `<details class="fold"><summary>${strip(q.q)}</summary><div class="prose">${q.blocks ? `<p class="muted"><b>Blocks:</b> ${q.blocks}</p>` : ""}${q.waitingOn ? `<p class="muted"><b>Waiting on:</b> ${q.waitingOn}</p>` : ""}${q.detail}</div></details>`).join("")}</div></div>` : ""}
        ${t.provisions ? `<div class="section"><h2>Food and shopping</h2><div class="panel pad prose">${t.provisions.summary}</div>${t.provisions.critical ? `<div class="callout prose">${t.provisions.critical}</div>` : ""}
          ${t.provisions.stops.map((s, si) => `<details class="fold panel"><summary>${strip(s.group)}</summary><div>${s.note ? `<p class="muted" style="font-size:13.5px;margin:0 0 6px">${s.note}</p>` : ""}${s.items.map((it, ii) => checkRow(`${t.slug}:shop:${si}:${ii}`, it, false)).join("")}</div></details>`).join("")}</div>` : ""}
        <div class="section"><h2>Packing</h2>${t.packing.map((c, ci) => `<details class="fold panel"><summary>${strip(c.category)}</summary><div>${c.items.map((it, ii) => checkRow(`${t.slug}:pack:${ci}:${ii}`, it, false)).join("")}</div></details>`).join("")}</div>
        ${t.weather.length ? `<div class="section"><h2>Weather</h2><div class="panel tbl" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table><thead><tr><th>Where</th><th>High</th><th>Low</th><th>Notes</th></tr></thead><tbody>${t.weather.map((w) => `<tr><td>${esc(w.location)}</td><td class="num">${esc(w.high)}</td><td class="num">${esc(w.low)}</td><td>${w.notes}</td></tr>`).join("")}</tbody></table></div>${t.weatherNote ? `<div class="muted prose" style="font-size:13px">${t.weatherNote}</div>` : ""}</div>` : ""}
        <div class="note">Ticks save on this phone only. The plan files are the record.</div>
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
    return `<div class="stack"><a class="back" href="#me">← Me</a><h1>Kitchen</h1>
      <div class="panel pad"><div class="eyebrow">Daily target</div><div class="macros" style="margin-top:6px"><span><b>${T.kcal}</b> kcal</span><span><b>${T.protein_g.join("–")}</b> g protein</span><span><b>${T.carbs_g.join("–")}</b> g carbs</span><span><b>${T.fat_g.join("–")}</b> g fat</span></div>
      <div class="row muted" style="font-size:12px;margin-top:8px;gap:14px"><span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px"></span> protein</span><span><span style="display:inline-block;width:8px;height:8px;background:var(--today);border-radius:2px"></span> carbs</span><span><span style="display:inline-block;width:8px;height:8px;background:var(--water);border-radius:2px"></span> fat</span></div></div>
      ${slots.map((s) => { const ms = k.meals.filter((m) => m.slot === s); return ms.length ? `<div class="section"><h2>${s}</h2><div class="panel divide">${ms.map(card).join("")}</div></div>` : ""; }).join("")}
      <details class="fold panel"><summary>Shopping list</summary><div class="prose">${k.shopping}</div></details>
    </div>`;
  };

  V.me = () => `<div class="stack"><h1>Me</h1><p class="muted" style="margin:0">What Claude knows about you. Change any of it by telling Claude: <span class="mono">/remember …</span></p>
    <div class="panel divide">${D.kitchen ? `<a class="me-link" href="#kitchen"><div><h2>kitchen</h2><p>The staples menu: ${D.kitchen.meals.length} meals with computed macros, the daily target and the shopping list.</p></div><span class="go muted" aria-hidden="true">›</span></a>` : ""}${D.me.map((m) => `<a class="me-link" href="#me-${m.id}"><div><h2>${esc(m.id.replace(/-/g, " "))}</h2><p>${esc(m.summary)}</p></div><span class="go muted" aria-hidden="true">›</span></a>`).join("")}</div></div>`;

  V.meFile = (m) => `<div class="stack"><a class="back" href="#me">← Me</a><h1 style="text-transform:capitalize">${esc(m.id.replace(/-/g, " "))}</h1><p class="muted" style="margin:0">${esc(m.summary)}</p>
    ${m.lists.declined ? `<div class="panel pad"><div class="eyebrow">Declined</div><ul>${m.lists.declined.map((x) => `<li>${esc(x.what)}</li>`).join("")}</ul></div>` : ""}
    ${m.lists.avoid ? `<div class="panel pad"><div class="eyebrow">Never</div><ul>${m.lists.avoid.map((x) => `<li>${esc(x.what)}</li>`).join("")}</ul></div>` : ""}
    <div class="panel pad prose">${m.html}</div>
    ${m.lists.dislikes ? `<details class="fold panel"><summary>Rejected dishes (${m.lists.dislikes.length})</summary><div><ul>${m.lists.dislikes.map((x) => `<li>${esc(x.what)}</li>`).join("")}</ul></div></details>` : ""}</div>`;

  /* --------------------------------------------------------- router */
  function render() {
    const h = (location.hash || "#now").slice(1);
    let html, tab = "now";
    const tm = /^t-(.+?)(?:-(plan|map|places|prep|journal))?$/.exec(h);
    if (tm && D.trips.find((t) => t.slug === tm[1])) {
      // "map" is the old Map tab (removed 2026-10-30): an old bookmark lands on the plan.
      html = V.trip(D.trips.find((t) => t.slug === tm[1]), !tm[2] || tm[2] === "map" ? "plan" : tm[2]); tab = "trips";
    } else if (h.startsWith("w-") && (D.ideas ?? []).find((i) => i.slug === h.slice(2))) {
      html = V.idea(D.ideas.find((i) => i.slug === h.slice(2))); tab = "ideas";
    } else if (h.startsWith("me-") && D.me.find((m) => m.id === h.slice(3))) {
      html = V.meFile(D.me.find((m) => m.id === h.slice(3))); tab = "me";
    } else if (h === "book") { html = V.book(); tab = "todo"; }
    else if (h === "kitchen") { html = V.kitchen(); tab = "me"; }
    else if (h === "bucket") { html = V.bucket(); tab = "ideas"; }
    else if (V[h] && ["now", "todo", "trips", "ideas", "me"].includes(h)) { html = V[h](); tab = h; }
    else html = V.now();
    $view.innerHTML = `<div class="netstate" id="netstate"></div>` + html + `<div class="foot">Built ${esc(D.builtAt.slice(0, 16).replace("T", " "))} UTC from the Colin-Travel-Planner files.</div>`;
    netState();
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
    const mo = e.target.closest("[data-more]");
    if (mo) { const sub = mo.previousElementSibling; const open = sub.classList.toggle("open"); mo.textContent = open ? "Less" : "More"; mo.setAttribute("aria-expanded", open); return; }
    const j = e.target.closest("[data-jump]");
    if (j) { document.getElementById(j.dataset.jump)?.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
    const f = e.target.closest("[data-filter]");
    if (f) { const v = f.dataset.val, y = window.scrollY; store.set(f.dataset.filter, f.dataset.filter === "ideaMonth" ? Number(v) : v); render(); window.scrollTo(0, y); return; }
    if (e.target.id === "pv-trip") { store.set("previewAt", "2026-10-18T09:00"); render(); }
    if (e.target.id === "pv-clear") { store.set("previewAt", null); render(); }
  });
  window.addEventListener("hashchange", render);
  window.addEventListener("online", netState);
  window.addEventListener("offline", netState);

  /* ---------------------------------------------------------- offline */
  /* On GitHub Pages the page sits beside sw.js, the manifest and the icons.
     The claude.ai copy and a file:// copy have none of them, so nothing is
     registered there and the page behaves exactly as before. */
  function netState() {
    const el = document.getElementById("netstate");
    if (!el) return;
    const built = new Date(D.builtAt), age = Math.max(0, Math.round((Date.now() - built) / 6e4));
    const ago = age < 90 ? `${age} min ago` : age < 36 * 60 ? `${Math.round(age / 60)} h ago` : `${Math.round(age / 1440)} days ago`;
    const off = navigator.onLine === false;
    el.className = "netstate" + (off ? " off" : "");
    el.innerHTML = `<span class="dot"></span><span>${off ? "Offline" : "Online"} · built ${MON[built.getMonth()]} ${built.getDate()}, ${clock(built.getHours() * 60 + built.getMinutes())} · <span class="muted">${ago}</span></span>`;
  }
  if (hosted) {
    try {
      for (const [rel, href, type] of [["manifest", "manifest.webmanifest"], ["icon", "icon.svg", "image/svg+xml"], ["apple-touch-icon", "apple-touch-icon.png"]]) {
        const l = document.createElement("link"); l.rel = rel; l.href = href; if (type) l.type = type; document.head.appendChild(l);
      }
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
    } catch {}
  }

  render();
})();
