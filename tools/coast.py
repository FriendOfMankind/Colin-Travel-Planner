"""coast.py — a detailed coastline around where a trip actually goes, for the Map tab.

The page's base coast is Natural Earth 1:10m, about a kilometre of detail: fine for
"where is the sea", useless zoomed in on a harbour. This pulls Overture's land
polygons (built from the OpenStreetMap coastline, metre-level) inside a corridor
around the trip's pins and road lines, and writes them to trips/<slug>/coast.json.
The build ships that in the page, so the map stays offline.

Only the corridor gets detail; the rest keeps the coarse coast. A corridor piece
with no sea in it (inland) is dropped, since it would only redraw land as land.

Run after build (it reads site/maps/<slug>.geojson):
  node tools/build.mjs && python3 tools/coast.py <slug>
Needs: pip install pyarrow shapely
"""

import argparse
import json
import math
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as pfs
from shapely import box, union_all, wkb
from shapely.geometry import LineString, MultiPolygon, Polygon, mapping

ROOT = Path(__file__).resolve().parent.parent
RELEASE = "2026-10-21.0"
SOURCE = f"Overture Maps base/land {RELEASE} (OpenStreetMap coastline), clipped by tools/coast.py"
PIN_KM = 12     # detail this far around every pin
LINE_KM = 5     # and this far either side of every road line
TOL = 0.00015   # degrees, ~15 m: below what a phone screen shows at the page's deepest zoom over a town
MIN_SEA = 0.02  # a corridor piece needs this share of sea to be worth shipping
MIN_RING = 1e-6  # square degrees, roughly a hectare: islets and ponds smaller than this are dropped


def land_dataset():
    kw = {}
    if os.environ.get("HTTPS_PROXY"):
        p = urlparse(os.environ["HTTPS_PROXY"])
        kw["proxy_options"] = {"scheme": "http", "host": p.hostname, "port": p.port}
    fs = pfs.S3FileSystem(anonymous=True, region="us-west-2", **kw)
    return ds.dataset(f"overturemaps-us-west-2/release/{RELEASE}/theme=base/type=land/", filesystem=fs, format="parquet")


def around(x, y, km):
    dy = km / 111.0
    dx = dy / max(math.cos(math.radians(y)), 0.2)
    return box(x - dx, y - dy, x + dx, y + dy)


def corridor(fc):
    """Boxes around pins and along road lines (flights skipped), merged into pieces."""
    shapes = []
    for f in fc["features"]:
        g, p = f["geometry"], f["properties"]
        if g["type"] == "Point":
            shapes.append(around(*g["coordinates"], PIN_KM))
        elif p.get("kind") == "leg":
            cs = g["coordinates"]
            fly = {i for a, b in p.get("fly", []) for i in range(a, b)}  # segment i joins cs[i] → cs[i+1]
            run = []
            for i, c in enumerate(cs):
                run.append(c)
                if i in fly or i == len(cs) - 1:
                    if len(run) > 1:
                        line = LineString(run).simplify(0.01)
                        lat = sum(y for _, y in line.coords) / len(line.coords)
                        shapes.append(line.buffer(LINE_KM / 111.0 / max(math.cos(math.radians(lat)), 0.2), cap_style="square", quad_segs=1))
                    run = [c] if i not in fly else []
    u = union_all(shapes)
    return list(u.geoms) if isinstance(u, MultiPolygon) else [u]


def rings(geom):
    polys = geom.geoms if hasattr(geom, "geoms") else [geom]
    out = []
    for p in polys:
        if not isinstance(p, Polygon) or p.is_empty:
            continue
        for r in [p.exterior, *p.interiors]:
            if Polygon(r).area < MIN_RING:
                continue
            cs = [[round(x, 5), round(y, 5)] for x, y in r.coords]
            if len(cs) >= 4:
                out.append(cs)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    a = ap.parse_args()
    fc = json.loads((ROOT / f"site/maps/{a.slug}.geojson").read_text())
    pieces = corridor(fc)
    if not pieces:
        sys.exit(f"{a.slug}: no placed pins")
    d = land_dataset()
    b = lambda k: pc.field("bbox", k)
    t = time.time()
    areas, land, verts, kept = [], [], 0, 0
    for piece in pieces:
        x0, y0, x1, y1 = piece.bounds
        flt = (b("xmax") >= x0) & (b("xmin") <= x1) & (b("ymax") >= y0) & (b("ymin") <= y1) & (pc.field("subtype") == "land")
        geoms = [wkb.loads(g) for g in d.to_table(filter=flt, columns=["geometry"])["geometry"].to_pylist()]
        here = union_all(geoms).intersection(piece) if geoms else Polygon()
        if piece.area and 1 - here.area / piece.area < MIN_SEA:
            continue  # all land: the coarse coast already says so
        kept += 1
        area = piece.simplify(0.002)
        areas += rings(area)
        lr = rings(here.simplify(TOL))
        land += lr
        verts += sum(len(r) for r in lr)
    print(f"{a.slug}: {len(pieces)} corridor piece(s), {kept} with sea, {verts:,} coast vertices, {time.time() - t:.0f}s", file=sys.stderr)
    out = ROOT / f"trips/{a.slug}/coast.json"
    if not areas:
        if out.exists():
            out.unlink()
        print(f"{a.slug}: no coast near the route; nothing written", file=sys.stderr)
        return
    out.write_text(json.dumps({"source": SOURCE, "areas": areas, "land": land}, separators=(",", ":")) + "\n")
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:,.0f} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
