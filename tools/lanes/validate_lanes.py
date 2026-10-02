"""Validate every lane edge against Natural Earth 50m land. Exits 1 on any crossing.
Usage: python validate_lanes.py [path/to/ne_50m_land.geojson]
"""
import json, sys, math
from shapely.geometry import shape, LineString
from shapely.ops import unary_union
from shapely import affinity
from shapely.strtree import STRtree
from lanes_data import NODES, EDGES

import os, urllib.request
land_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "ne_50m_land.geojson")
if not os.path.exists(land_path):
    print("downloading Natural Earth 50m land ->", land_path)
    urllib.request.urlretrieve("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson", land_path)
gj = json.load(open(land_path))
polys = [shape(f["geometry"]) for f in gj["features"]]
land = unary_union(polys)
# duplicate land shifted +-360 so antimeridian-unwrapped segments are tested correctly
land_all = unary_union([land, affinity.translate(land, xoff=360), affinity.translate(land, xoff=-360)])

def seg(a, b):
    (x1, y1), (x2, y2) = NODES[a], NODES[b]
    if x2 - x1 > 180: x2 -= 360
    if x1 - x2 > 180: x2 += 360
    return LineString([(x1, y1), (x2, y2)])

bad = 0
for e in EDGES:
    a, b = e[0], e[1]
    for n in (a, b):
        if n not in NODES:
            print("UNKNOWN NODE", n); bad += 1
    if len(e) > 2 and e[2] == "canal":
        continue
    s = seg(a, b)
    inter = s.intersection(land_all)
    if not inter.is_empty and inter.length > 1e-6:
        print(f"LAND CROSSING {a:7s}-{b:7s} len={inter.length:.3f} deg  at {inter.representative_point().coords[0]}")
        bad += 1
# nodes themselves must be at sea
from shapely.geometry import Point
for n, (x, y) in NODES.items():
    if land_all.contains(Point(x, y)):
        print(f"NODE ON LAND {n} {x},{y}"); bad += 1
print("edges:", len(EDGES), "nodes:", len(NODES), "problems:", bad)
sys.exit(1 if bad else 0)
