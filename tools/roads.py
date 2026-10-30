#!/usr/bin/env python3
"""roads.py: real road lines for a trip's days, from Overture Maps road data.

    python3 tools/roads.py <slug>            # writes trips/<slug>/routes/day-N.gpx + routes.yaml
    python3 tools/roads.py <slug> --day 5    # one day only

Every routing service is blocked from Claude sessions (OSRM, Valhalla,
OpenRouteService, Geofabrik). Overture's transportation data on S3 is not,
so this routes locally: it pulls the roads in the trip's box (major classes
everywhere, every class within ~4 km of each stop), builds a graph from the
segments' connectors, snaps each stop to its nearest drivable road and finds
the fastest path with rough per-class speeds. Ferries come from Overture's
water segments.

A hop the plan flies (the leg's `flyHops`) is a great-circle arc, written as
its own <trk> typed "fly", never routed. Each stretch of ground joined by
road (Ireland, Marseille) gets its own pull, so a flight doesn't drag in
every road between them.

It reads each day's stop order from site/maps/<slug>.geojson, so run
`node tools/build.mjs` first. The stops are the trip's verified pins; this
never moves or invents one. Limits it doesn't hide: one-way streets, turn
restrictions and closures are ignored, the speeds are class guesses rather
than real travel times, and the short hop from a stop to its nearest road is
drawn straight. Good enough to draw the route, not to navigate by.

Needs: pip install pyarrow shapely networkx numpy
"""

import argparse, functools, json, math, operator, os, sys, time
from pathlib import Path
from urllib.parse import urlparse

import networkx as nx
import numpy as np
import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as pfs
from shapely import wkb
from shapely.geometry import LineString
from shapely.ops import substring

ROOT = Path(__file__).resolve().parent.parent
RELEASE = "2026-10-21.0"
SOURCE = f"Overture Maps transportation {RELEASE} (OpenStreetMap-derived), routed by tools/roads.py"
MAJOR = ["motorway", "trunk", "primary", "secondary", "tertiary"]
# km/h by class. Guesses for drawing a plausible route, not for timing one.
SPEED = {"motorway": 105, "trunk": 90, "primary": 80, "secondary": 70, "tertiary": 60, "residential": 40,
         "living_street": 20, "unclassified": 45, "service": 20, "track": 15, "unknown": 30, None: 30}
NOT_DRIVABLE = {"footway", "cycleway", "pedestrian", "steps", "path", "bridleway", "sidewalk", "crosswalk"}
FERRY_KMH, FERRY_PENALTY_H = 30, 1.0  # a crossing costs boarding time, so short detours by road win
TERMINAL_M = 3000  # a stop this close to a ferry line counts as being at that terminal
SNAP_LIMIT_M = 3000
MIN_NETWORK = 200  # nodes; smaller islands of road are parking lots and data scraps, not somewhere to snap


def s3():
    kw = {}
    if os.environ.get("HTTPS_PROXY"):
        p = urlparse(os.environ["HTTPS_PROXY"])
        kw["proxy_options"] = {"scheme": "http", "host": p.hostname, "port": p.port}
    fs = pfs.S3FileSystem(anonymous=True, region="us-west-2", **kw)
    return ds.dataset(f"overturemaps-us-west-2/release/{RELEASE}/theme=transportation/type=segment/", filesystem=fs, format="parquet")


def pull(dataset, flt):
    return dataset.to_table(columns=["id", "subtype", "class", "connectors", "geometry"], filter=flt).to_pylist()


def box(x0, y0, x1, y1):
    b = lambda k: pc.field("bbox", k)
    return (b("xmax") >= x0) & (b("xmin") <= x1) & (b("ymax") >= y0) & (b("ymin") <= y1)


def metres(coords):
    total = 0.0
    for (x0, y0), (x1, y1) in zip(coords, coords[1:]):
        p0, p1 = math.radians(y0), math.radians(y1)
        a = math.sin((p1 - p0) / 2) ** 2 + math.cos(p0) * math.cos(p1) * math.sin(math.radians(x1 - x0) / 2) ** 2
        total += 12742000 * math.asin(min(1, math.sqrt(a)))
    return total


def graph(rows):
    """Segments → graph on connector ids. Edge carries its geometry and hours."""
    g = nx.Graph()
    pos = {}
    for r in rows:
        if r["subtype"] == "road" and r["class"] in NOT_DRIVABLE:
            continue
        conns = sorted(r["connectors"] or [], key=lambda c: c["at"])
        if len(conns) < 2:
            continue
        line = wkb.loads(r["geometry"])
        ferry = r["subtype"] == "water"
        kmh = FERRY_KMH if ferry else SPEED.get(r["class"], 30)
        for a, b in zip(conns, conns[1:]):
            part = substring(line, a["at"], b["at"], normalized=True)
            coords = list(part.coords) if part.geom_type == "LineString" else [part.coords[0]] * 2
            m = metres(coords)
            hours = m / 1000 / kmh + (FERRY_PENALTY_H if ferry else 0)
            u, v = a["connector_id"], b["connector_id"]
            if u == v:
                continue
            pos.setdefault(u, coords[0]); pos.setdefault(v, coords[-1])
            if not g.has_edge(u, v) or g[u][v]["hours"] > hours:
                g.add_edge(u, v, hours=hours, coords=coords, ferry=ferry)
    return g, pos


def snapper(g, pos):
    """→ snap(a, b): both ends of a hop onto one road network, the one that fits the pair best.
    Ireland and France are separate networks, and an old town's lanes can be islands of their own,
    so the nearest road to each end alone can leave the two ends with no path between them."""
    comps = [c for c in sorted(nx.connected_components(g), key=len, reverse=True) if len(c) >= MIN_NETWORK] or [max(nx.connected_components(g), key=len)]
    ids = [n for c in comps for n in c if n in pos]
    edges = np.cumsum([0] + [sum(n in pos for n in c) for c in comps])  # ids run network by network
    xy = np.array([pos[n] for n in ids])
    def nearest(lng, lat):  # per network: index of its node closest to (lng, lat)
        d = ((xy[:, 0] - lng) * math.cos(math.radians(lat))) ** 2 + (xy[:, 1] - lat) ** 2
        return {k: int(edges[k] + np.argmin(d[edges[k]:edges[k + 1]])) for k in range(len(comps)) if edges[k + 1] > edges[k]}
    def snap(a, b):
        na, nb = nearest(*a), nearest(*b)
        cost = lambda k: metres([a, tuple(xy[na[k]])]) + metres([b, tuple(xy[nb[k]])])
        k = min(na, key=cost)
        return (ids[na[k]], metres([a, tuple(xy[na[k]])])), (ids[nb[k]], metres([b, tuple(xy[nb[k]])]))
    return snap, sum(len(c) for c in comps)


def ferry_between(g, pos, a, b):
    """Terminal to terminal: when both stops sit at ends of one ferry line, the plan means that
    sailing, even when driving round to a different ferry would be quicker on paper (Argentia →
    North Sydney vs. crossing the island to Port aux Basques). Returns the water path or None."""
    water = g.edge_subgraph([(u, v) for u, v, f in g.edges(data="ferry") if f])
    if not water.number_of_nodes():
        return None
    near = lambda pt: [n for n in water.nodes if metres([pt, pos[n]]) <= TERMINAL_M]
    best = None
    for s in near(a):
        for t in near(b):
            if s != t and nx.has_path(water, s, t):
                p = nx.shortest_path(water, s, t, weight="hours")
                h = nx.path_weight(water, p, weight="hours")
                if best is None or h < best[0]:
                    best = (h, p)
    return best[1] if best else None


def path_coords(g, pos, nodes):
    """The path's geometry, each edge turned to run from the node it leaves."""
    out = []
    for u, v in zip(nodes, nodes[1:]):
        c = g[u][v]["coords"]
        if metres([pos[u], c[0]]) > metres([pos[u], c[-1]]):
            c = c[::-1]
        out.extend(c if not out else c[1:])
    return out


def gpx(name, parts):
    def trk(fly, coords):
        pts = "\n".join(f'<trkpt lat="{y:.6f}" lon="{x:.6f}"/>' for x, y in coords)
        return f'<trk><name>{name}{" (flight)" if fly else ""}</name>{"<type>fly</type>" if fly else ""}<trkseg>\n{pts}\n</trkseg></trk>'
    body = "\n".join(trk(f, c) for f, c in parts)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="tools/roads.py" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>{name}</name><desc>{SOURCE}</desc></metadata>\n{body}\n</gpx>\n'


def arc(a, b, n=48):
    """Great-circle a → b, ends included (the same arc tools/geojson.mjs draws)."""
    v = lambda x, y: np.array([math.cos(math.radians(y)) * math.cos(math.radians(x)), math.cos(math.radians(y)) * math.sin(math.radians(x)), math.sin(math.radians(y))])
    p, q = v(*a), v(*b)
    w = math.acos(min(1.0, float(p @ q)))
    if w < 1e-9:
        return [tuple(a), tuple(b)]
    out = []
    for i in range(n + 1):
        t = i / n
        x, y, z = (math.sin((1 - t) * w) * p + math.sin(t * w) * q) / math.sin(w)
        out.append((math.degrees(math.atan2(y, x)), math.degrees(math.atan2(z, math.hypot(x, y)))))
    return out


def regions(stops, flys):
    """Stops joined by a ground hop share a region; a flight splits them. → [(xmin, ymin, xmax, ymax)]."""
    parent = {}
    find = lambda k: k if parent.setdefault(k, k) == k else find(parent[k])
    for day, cs in stops.items():
        for i, (a, b) in enumerate(zip(cs, cs[1:])):
            find(tuple(a)); find(tuple(b))
            if i + 2 not in flys.get(day, ()):
                parent[find(tuple(a))] = find(tuple(b))
    groups = {}
    for k in list(parent):
        groups.setdefault(find(k), []).append(k)
    return [(min(x for x, _ in g), min(y for _, y in g), max(x for x, _ in g), max(y for _, y in g)) for g in groups.values()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug"); ap.add_argument("--day", type=int)
    a = ap.parse_args()
    fc = json.loads((ROOT / f"site/maps/{a.slug}.geojson").read_text())
    legs = [f for f in fc["features"] if f["properties"].get("kind") == "leg" and (a.day is None or f["properties"]["day"] == a.day)]
    # A road line already in routes.yaml stands in for the straight one, so start from the stops themselves.
    stops = {f["properties"]["day"]: [f2["geometry"]["coordinates"] for f2 in sorted(
        (p for p in fc["features"] if p["geometry"]["type"] == "Point" and p["properties"].get("day") == f["properties"]["day"]),
        key=lambda p: p["properties"]["seq"])] for f in legs}
    flys = {f["properties"]["day"]: set(f["properties"].get("flyHops", [])) for f in legs}  # seq of each flight's landing stop
    pts = [c for cs in stops.values() for c in cs]
    if not pts:
        sys.exit(f"{a.slug}: no day has two placed stops")
    d = s3()
    t = time.time()
    rows = []
    for x0, y0, x1, y1 in regions(stops, flys):
        rows += pull(d, box(x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5)
                     & (((pc.field("subtype") == "road") & pc.field("class").isin(MAJOR)) | (pc.field("subtype") == "water")))
    near = functools.reduce(operator.or_, [box(x - 0.05, y - 0.035, x + 0.05, y + 0.035) for x, y in {tuple(p) for p in pts}])
    rows += pull(d, near & (pc.field("subtype") == "road") & ~pc.field("class").isin(MAJOR))
    print(f"pulled {len(rows):,} segments in {time.time() - t:.0f}s", file=sys.stderr)
    g, pos = graph(rows)
    snap, size = snapper(g, pos)
    print(f"graph {g.number_of_nodes():,} nodes, {size:,} in networks of {MIN_NETWORK}+", file=sys.stderr)

    rdir = ROOT / f"trips/{a.slug}/routes"; rdir.mkdir(exist_ok=True)
    ry = ROOT / f"trips/{a.slug}/routes.yaml"
    entries = {}
    if ry.exists():
        import yaml  # optional; only to keep other days' entries
        for e in yaml.safe_load(ry.read_text()) or []:
            entries[int(e["day"])] = e
    for day, cs in sorted(stops.items()):
        parts, ferry, worst, flown, gaps = [], False, 0, 0.0, 0  # parts: [(fly, coords)]
        for i, ((x0, y0), (x1, y1)) in enumerate(zip(cs, cs[1:])):
            if i + 2 in flys.get(day, ()):
                seg, fly = arc((x0, y0), (x1, y1)), True
                flown += metres(seg)
            else:
                fly = False
                (u, du), (v, dv) = snap((x0, y0), (x1, y1))
                worst = max(worst, du, dv)
                try:
                    sail = ferry_between(g, pos, (x0, y0), (x1, y1))
                    if sail:  # road to the terminal, the sailing, road from the other terminal
                        nodes = nx.shortest_path(g, u, sail[0], weight="hours")[:-1] + sail + nx.shortest_path(g, sail[-1], v, weight="hours")[1:]
                    else:
                        nodes = nx.shortest_path(g, u, v, weight="hours")
                except nx.NetworkXNoPath:  # the two ends sit on road networks the data doesn't join
                    nodes, gaps = [], gaps + 1
                ferry |= any(g[p][q]["ferry"] for p, q in zip(nodes, nodes[1:]))
                seg = [(x0, y0)] + (path_coords(g, pos, nodes) if len(nodes) > 1 else []) + [(x1, y1)]
            if parts and parts[-1][0] == fly:
                parts[-1][1].extend(seg[1:])
            else:
                parts.append((fly, list(seg)))
        ground = sum(metres(c) for f, c in parts if not f)
        note = f"day {day}: {len(cs)} stops, {ground / 1609.344:,.0f} mi drawn{f' + {flown / 1609.344:,.0f} flown' if flown else ''}{', with a ferry' if ferry else ''}"
        if worst > SNAP_LIMIT_M:
            note += f", ⚠ a stop is {worst / 1000:.1f} km from the nearest road in the data, so that end is straight"
        if gaps:
            note += f", ⚠ {gaps} hop(s) with no road between, drawn straight"
        print(note, file=sys.stderr)
        simp = [(f, c if f else list(LineString(c).simplify(0.0002).coords)) for f, c in parts]
        (rdir / f"day-{day}.gpx").write_text(gpx(f"{a.slug} day {day}", simp))
        entries[day] = {"day": day, "file": f"routes/day-{day}.gpx", "source": SOURCE}
    body = "".join(f"- day: {e['day']}\n  file: {e.get('file') or e.get('files')}\n  source: \"{e['source']}\"\n" for _, e in sorted(entries.items()))
    ry.write_text("# Road lines per day. Each needs a source (tests enforce it). tools/roads.py writes these; a GPX Colin\n# exports from Google Maps can replace any one.\n" + body)


if __name__ == "__main__":
    main()
