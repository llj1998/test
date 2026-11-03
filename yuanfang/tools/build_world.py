#!/usr/bin/env python3
"""重新生成 world.js：把 Natural Earth 110m 陆地轮廓（TopoJSON）投影成 SVG path。

投影：Natural Earth I，宽 1000，裁掉南纬 57° 以南和北纬 84° 以北。
app.js 里的 proj() 用的是同一套公式和常数（WORLD.k、WORLD.y0），改这里要一起改。

获取数据（world-atlas 2.0.2，ISC 许可）：
    npm pack world-atlas@2.0.2 && tar -xzf world-atlas-2.0.2.tgz
用法：
    python3 tools/build_world.py package/land-110m.json world.js

跨越 180° 经线的环（楚科奇、斐济）会被收拢到同一侧，否则会画出横贯全图的直线。
"""
import json, math, sys

if len(sys.argv) != 3:
    raise SystemExit(__doc__)
src, out = sys.argv[1], sys.argv[2]
topo = json.load(open(src))
sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
arcs = []
for arc in topo['arcs']:
    x = y = 0; pts = []
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x*sx+tx, y*sy+ty))
    arcs.append(pts)
def arc_pts(i):
    return arcs[i] if i >= 0 else list(reversed(arcs[~i]))
def ring(idx):
    pts = []
    for i in idx:
        a = arc_pts(i)
        pts.extend(a if not pts else a[1:])
    return pts
W = 1000
K = W / (2*math.pi*0.8707)
def proj(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    p2 = p*p; p4 = p2*p2
    x = l*(0.8707 - 0.131979*p2 + p4*(-0.013791 + p4*(0.003971*p2 - 0.001529*p4)))
    y = p*(1.007226 + p2*(0.015085 + p4*(-0.044475 + 0.028874*p2 - 0.005916*p4)))
    return (W/2 + x*K, -y*K)
TOP, BOT = 84, -57
y0 = proj(0, TOP)[1]; y1 = proj(0, BOT)[1]
H = y1 - y0
def fmt(v): 
    s = f"{v:.1f}"
    return s[:-2] if s.endswith('.0') else s
parts = []
geom = topo['objects']['land']
geoms = geom['geometries'] if geom['type']=='GeometryCollection' else [geom]
for g in geoms:
    polys = g['arcs'] if g['type']=='MultiPolygon' else [g['arcs']]
    for poly in polys:
        for r in poly:
            pts = ring(r)
            if max(p[1] for p in pts) < -58: continue
            if any(abs(pts[i][0]-pts[i-1][0]) > 180 for i in range(1, len(pts))):
                east = sum(1 for p in pts if p[0] > 0) >= len(pts) / 2
                pts = [((180 if east else -180) if (p[0] < -90 if east else p[0] > 90) else p[0], p[1]) for p in pts]
            prev=None; d=[]
            for lon, lat in pts:
                X, Y = proj(lon, lat); Y -= y0
                q=(fmt(X),fmt(Y))
                if q==prev: continue
                d.append(('M' if not d else 'L')+q[0]+' '+q[1]); prev=q
            if len(d) > 3: parts.append(''.join(d)+'Z')
land = ''.join(parts).replace('L',' ').replace('M ',"M")
# compact: use implicit L after M by space separation
grat = []
for lon in range(-180, 181, 30):
    d=[]
    for lat in range(BOT, TOP+1, 2):
        X,Y = proj(lon,lat); d.append(('M' if not d else 'L')+fmt(X)+' '+fmt(Y-y0))
    grat.append(''.join(d))
for lat in (-30, 0, 30, 60):
    d=[]
    for lon in range(-180, 181, 3):
        X,Y = proj(lon,lat); d.append(('M' if not d else 'L')+fmt(X)+' '+fmt(Y-y0))
    grat.append(''.join(d))
outline=[]
for lat in range(BOT, TOP+1, 2):
    X,Y=proj(-180,lat); outline.append(fmt(X)+' '+fmt(Y-y0))
for lat in range(TOP, BOT-1, -2):
    X,Y=proj(180,lat); outline.append(fmt(X)+' '+fmt(Y-y0))
with open(out,'w') as f:
    f.write("/* 世界陆地轮廓：Natural Earth 110m（world-atlas, ISC），Natural Earth I 投影预计算。 */\n")
    f.write("window.WORLD = " + json.dumps({"w": W, "h": round(H,1), "k": K, "y0": y0, "land": land, "grat": ''.join(grat), "outline": "M"+" L".join(outline)+"Z"}, ensure_ascii=False) + ";\n")
print(W, H, len(land))
