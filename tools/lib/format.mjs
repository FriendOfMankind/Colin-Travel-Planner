/* format.mjs — the trip.md format, both directions.

   One convention everywhere: machine data lives in YAML (the frontmatter, or
   a fenced ```yaml block under a heading), and everything a person or an AI
   reads for judgment is Markdown. `emitTrip` and `parseTrip` are inverses;
   tools/test/format.test.mjs holds them to that on real data, because a
   format that loses a field on the way through is a format that lies.

   Schedule lines are the one place with micro-syntax, because they are the
   thing most often edited from a phone:

     - 6:15 → 6:40 (25m) · drive · Text in Markdown · 📍 Maps search string
     - 1:50 → 2:10 (20m) · stop! · Text        ← "!" means warn: true

   Everything after the kind is Markdown; the maps query is optional and
   always last. */

import YAML from "yaml";

/** YAML as a person wants to read it on a phone: short lists of scalars on
    one line (`months: [9]`, `coords: [37, -84.2]`), everything else block. */
export function toYaml(v) {
  const doc = new YAML.Document(v);
  YAML.visit(doc, {
    Seq(_, n) {
      if (n.items.every((i) => YAML.isScalar(i)) && JSON.stringify(n.toJSON()).length <= 80) n.flow = true;
    },
  });
  return doc.toString({ lineWidth: 0 }).trimEnd();
}
const Y = toYaml;
const MEAL_KEYS = { b: "B", l: "L", d: "D" };

/* ------------------------------------------------------------------ parse */

/** Split Markdown into a heading tree. Fenced blocks are opaque. */
export function sections(md) {
  const root = { level: 0, title: "", body: [], children: [] };
  const stack = [root];
  let fence = false;
  for (const line of md.split("\n")) {
    if (/^```/.test(line)) fence = !fence;
    const m = !fence && /^(#{1,6}) (.*)$/.exec(line);
    if (m) {
      const node = { level: m[1].length, title: m[2].trim(), body: [], children: [] };
      while (stack.at(-1).level >= node.level) stack.pop();
      stack.at(-1).children.push(node);
      stack.push(node);
    } else stack.at(-1).body.push(line);
  }
  const finish = (n) => {
    n.text = n.body.join("\n").trim();
    delete n.body;
    n.children.forEach(finish);
    return n;
  };
  return finish(root);
}

export function splitFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return { data: {}, body: md };
  return { data: YAML.parse(m[1]) ?? {}, body: m[2] };
}

/** Pull the first ```yaml block out of a section body. */
export function yamlBlock(text) {
  const m = /```yaml[^\n]*\n([\s\S]*?)```/.exec(text);
  return {
    data: m ? YAML.parse(m[1]) : null,
    rest: m ? (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim() : text,
  };
}

const child = (node, title) => node?.children.find((c) => c.title.toLowerCase() === title.toLowerCase());

export function parseTable(text) {
  const rows = text.split("\n").filter((l) => /^\|/.test(l.trim()));
  if (rows.length < 2) return [];
  const cells = (l) =>
    l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  const head = cells(rows[0]);
  return rows.slice(2).map((r) => Object.fromEntries(cells(r).map((c, i) => [head[i], c])));
}

const SCHED = /^- (.+?)(?: \(([^()]*)\))? · (\w+)(!?) · (.*?)(?: · 📍 (.+))?$/;

export function parseSchedule(text) {
  return text.split("\n").filter((l) => l.startsWith("- ")).map((l) => {
    const m = SCHED.exec(l);
    if (!m) throw new Error(`Unparseable schedule line: ${l}`);
    const row = { kind: m[3], time: m[1], text: m[5] };
    if (m[2] !== undefined && m[2] !== "") row.est = m[2]; // "()" = no estimate, see emitSchedule
    if (m[6]) row.maps = m[6];
    if (m[4]) row.warn = true;
    return row;
  });
}

function parseDay(node) {
  const m = /^Day (\d+) — (.*?) · (.*)$/.exec(node.title);
  if (!m) throw new Error(`Bad day heading: ${node.title}`);
  const { data, rest } = yamlBlock(node.text);
  const day = { day: Number(m[1]), title: m[3], ...data };
  const sched = /\*\*Schedule\*\*\n([\s\S]*?)(?=\n\*\*Meals\*\*|$)/.exec(rest);
  if (sched) day.schedule = parseSchedule(sched[1]);
  const meals = /\*\*Meals\*\*\n([\s\S]*)$/.exec(rest);
  if (meals) {
    day.meals = {};
    for (const l of meals[1].split("\n")) {
      const mm = /^- ([BLD]): (.*)$/.exec(l);
      if (mm) day.meals[mm[1].toLowerCase()] = mm[2];
    }
  }
  const hl = child(node, "Highlights");
  const wn = child(node, "Warnings");
  if (hl) day.highlights = hl.text;
  if (wn) day.warnings = wn.text;
  return day;
}

/** trip.md → { registry, page } where page mirrors Trees' TRIP_DATA shape. */
export function parseTrip(md) {
  const { data: fm, body } = splitFrontmatter(md);
  const { page: pageMeta = {}, ...registry } = fm;
  const tree = sections(body);
  const top = tree.children[0] ?? { children: [] }; // the # Title node
  const sec = (t) => child(top, t);
  const page = { meta: { ...pageMeta } };
  const why = /^> (.*)$/m.exec(top.text ?? "");
  if (why) registry.why = why[1];

  const ov = sec("Overview");
  if (ov) {
    if (ov.text) page.meta.route = ov.text;
    page.meta.overviewCards = ov.children.map((c) => ({ h: c.title, p: c.text }));
  }
  const days = sec("Days");
  if (days) page.days = days.children.map(parseDay);

  const lodging = sec("Lodging");
  if (lodging) {
    const { data, rest } = yamlBlock(lodging.text);
    page.lodging = { ...data, rows: parseTable(rest).map(unTableLodging) };
  }

  const hikes = sec("Hikes");
  if (hikes) {
    const { before, table: t } = splitTable(hikes.text);
    page.hikes = { title: "Hikes & Trails", rows: parseTable(t).map(unTableHike) };
    if (before) page.hikes.summary = before;
  }

  const wx = sec("Weather");
  if (wx) {
    const lines = wx.text.split("\n");
    const tableEnd = lines.findLastIndex((l) => l.startsWith("|"));
    page.weather = parseTable(lines.slice(0, tableEnd + 1).join("\n")).map((r) => ({
      location: r.Location, elevation: r.Elevation, high: r.High, low: r.Low, notes: r.Notes,
    }));
    const note = lines.slice(tableEnd + 1).join("\n").trim();
    if (note) page.weatherNote = note;
  }

  const prov = sec("Provisions");
  if (prov) {
    const p = { summary: prov.text };
    for (const c of prov.children) {
      if (c.title === "Cooler") {
        const lines = c.text.split("\n");
        const i = lines.findIndex((l) => l.startsWith("|"));
        p.coolerNote = lines.slice(0, i).join("\n").trim();
        p.cooler = parseTable(lines.slice(i).join("\n")).map((r) => ({ days: r.Days, where: r.Where, state: r.State }));
      } else if (c.title === "Critical slots") {
        p.criticalSlots = c.text;
      } else {
        const lines = c.text.split("\n");
        const list = { group: c.title };
        const note = lines.filter((l) => !l.startsWith("- ")).join("\n").trim();
        if (note) list.note = note.replace(/^\*(.*)\*$/, "$1");
        list.items = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
        (p.lists ??= []).push(list);
      }
    }
    page.provisions = p;
  }

  const pack = sec("Packing");
  if (pack) page.packing = pack.children.map((c) => ({ category: c.title, items: checklist(c.text).map((x) => x.text) }));

  const res = sec("Reservations & checks");
  if (res) page.reservations = checklist(res.text).map((x) => (x.done ? { text: x.text, booked: true } : { text: x.text }));

  const oq = sec("Open questions");
  if (oq) {
    page.openQuestions = oq.children.map((c) => {
      const m = /^\*\*Blocks:\*\* (.*)\n?([\s\S]*)$/.exec(c.text);
      return { question: c.title, blocks: m ? m[1] : "", detail: (m ? m[2] : c.text).trim() };
    });
  }

  const field = sec("Field notes");
  if (field) {
    for (const c of field.children) {
      if (c.title === "Places") page.placesNote = c.text;
      if (c.title === "Offline regions") page.offlineRegions = c.text;
    }
  }

  const notes = sec("Notes");
  if (notes) page.notes = notes.children.map((c) => ({ heading: c.title, body: c.text }));

  return { registry, page };
}

/** Prose before a table, and the table itself. */
function splitTable(text) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.startsWith("|"));
  if (i < 0) return { before: text.trim(), table: "" };
  return { before: lines.slice(0, i).join("\n").trim(), table: lines.slice(i).join("\n") };
}

function checklist(text) {
  return text.split("\n").map((l) => /^- \[( |x)\] (.*)$/.exec(l)).filter(Boolean).map((m) => ({ done: m[1] === "x", text: m[2] }));
}

const blankNull = (v) => (v === "" ? null : v);

function unTableHike(r) {
  const day = /^\d+$/.test(r.Day) ? Number(r.Day) : r.Day;
  return { name: r.Name, day, distance: r.Distance, gain: r.Gain, difficulty: r.Difficulty, duration: r.Duration, notes: r.Notes };
}
function unTableLodging(r) {
  return { night: /^\d+$/.test(r.Night) ? Number(r.Night) : r.Night, date: r.Date, location: r.Location, type: r.Type, name: r.Name, cost: r.Cost, status: r.Status };
}

/* ------------------------------------------------------------------- emit */

const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
function table(head, rows) {
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
  ].join("\n");
}

export function emitSchedule(rows) {
  return rows.map((r) => {
    // A time that itself ends in "(…)" would be read back as an estimate, so
    // an empty "()" marks "no estimate" unambiguously in that one case.
    const est = r.est !== undefined ? ` (${r.est})` : /\)$/.test(r.time) ? " ()" : "";
    const maps = r.maps ? ` · 📍 ${r.maps}` : "";
    return `- ${r.time}${est} · ${r.kind}${r.warn ? "!" : ""} · ${r.text}${maps}`;
  }).join("\n");
}

function emitDay(d) {
  const { day, title, schedule, meals, highlights, warnings, ...rest } = d;
  const out = [`### Day ${day} — ${rest.date} · ${title}`, "", "```yaml", Y(rest), "```"];
  if (schedule?.length) out.push("", "**Schedule**", emitSchedule(schedule));
  if (meals) {
    out.push("", "**Meals**");
    for (const k of Object.keys(MEAL_KEYS)) if (meals[k] != null) out.push(`- ${MEAL_KEYS[k]}: ${meals[k]}`);
  }
  if (highlights) out.push("", "#### Highlights", "", highlights);
  if (warnings) out.push("", "#### Warnings", "", warnings);
  return out.join("\n");
}

/** { registry, page } (already Markdown-converted) → trip.md text. */
export function emitTrip({ registry, page, header = "" }) {
  const { meta = {} } = page;
  const { route, overviewCards, ...pageMeta } = meta;
  const { why, ...fm } = registry; // `why` lives once, in the body
  const out = ["---", Y({ ...fm, page: pageMeta }), "---", ""];
  if (header) out.push(header, "");
  out.push(`# ${registry.title}`, "");
  if (why) out.push(`> ${why}`, "");

  if (route || overviewCards) {
    out.push("## Overview", "");
    if (route) out.push(route, "");
    for (const c of overviewCards ?? []) out.push(`### ${c.h}`, "", c.p, "");
  }
  if (page.days) {
    out.push("## Days", "");
    for (const d of page.days) out.push(emitDay(d), "");
  }
  if (page.lodging) {
    const { rows, ...lod } = page.lodging;
    out.push("## Lodging", "", "```yaml", Y(lod), "```", "",
      table(["Night", "Date", "Location", "Type", "Name", "Cost", "Status"],
        rows.map((r) => [r.night, r.date, r.location, r.type, r.name, r.cost, r.status])), "");
  }
  if (page.hikes) {
    out.push("## Hikes", "", ...(page.hikes.summary ? [page.hikes.summary, ""] : []),
      table(["Name", "Day", "Distance", "Gain", "Difficulty", "Duration", "Notes"],
        page.hikes.rows.map((r) => [r.name, r.day, r.distance, r.gain, r.difficulty, r.duration, r.notes])), "");
  }
  if (page.weather) {
    out.push("## Weather", "",
      table(["Location", "Elevation", "High", "Low", "Notes"], page.weather.map((w) => [w.location, w.elevation, w.high, w.low, w.notes])), "");
    if (page.weatherNote) out.push(page.weatherNote, "");
  }
  if (page.provisions) {
    const p = page.provisions;
    out.push("## Provisions", "", p.summary ?? "", "");
    if (p.cooler) out.push("### Cooler", "", p.coolerNote ?? "", "", table(["Days", "Where", "State"], p.cooler.map((c) => [c.days, c.where, c.state])), "");
    if (p.criticalSlots) out.push("### Critical slots", "", p.criticalSlots, "");
    for (const l of p.lists ?? []) {
      out.push(`### ${l.group}`, "");
      if (l.note) out.push(`*${l.note}*`, "");
      out.push(...l.items.map((i) => `- ${i}`), "");
    }
  }
  if (page.packing) {
    out.push("## Packing", "");
    for (const c of page.packing) out.push(`### ${c.category}`, "", ...c.items.map((i) => `- [ ] ${i}`), "");
  }
  if (page.reservations) {
    out.push("## Reservations & checks", "", ...page.reservations.map((r) => `- [${r.booked ? "x" : " "}] ${r.text}`), "");
  }
  if (page.openQuestions) {
    out.push("## Open questions", "");
    for (const q of page.openQuestions) out.push(`### ${q.question}`, "", `**Blocks:** ${q.blocks}`, q.detail, "");
  }
  if (page.placesNote || page.offlineRegions) {
    out.push("## Field notes", "");
    if (page.placesNote) out.push("### Places", "", page.placesNote, "");
    if (page.offlineRegions) out.push("### Offline regions", "", page.offlineRegions, "");
  }
  if (page.notes) {
    out.push("## Notes", "");
    for (const n of page.notes) out.push(`### ${n.heading}`, "", n.body, "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
