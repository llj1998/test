'use strict';
// Pixi 的坐标冒险 — deterministic frame renderer. render(t) draws one frame at time t (seconds).
const W = 1920, H = 1080, FPS = 24, DUR = 88;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let T = 0, FR = 0, BOIL = 0;

const COL = {
  coral: '#E2604C', teal: '#2A9A8C', mustard: '#E4A62E', cream: '#F2E6CB', creamL: '#FAF3E2',
  char: '#2A2725', ink: '#161514', pencil: '#857C70', rim: '#FDF8EC', term: '#EDE3CF'
};

/* ---------------- utils ---------------- */
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: x => x,
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  sine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  back: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  bounce: x => { const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + .75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + .9375;
    return n1 * (x -= 2.625 / d1) * x + .984375; }
};
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function h2(a, b) { let x = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x9e37, 0x165667b1); x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// stop-motion boil: every 3 frames each element shifts by 1-2px
function J(id, amp = 1.6) { const k = typeof id === 'string' ? strHash(id) : id; return [Math.round((h2(k, BOIL) - .5) * 2 * amp), Math.round((h2(k + 999, BOIL) - .5) * 2 * amp)]; }
function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mix(h1, h2c, t) { const a = hexRgb(h1), b = hexRgb(h2c); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const pop = (t, t0, d = .32) => t < t0 ? 0 : E.back(P(t, t0, t0 + d));
const fadeIO = (t, a, b, c, d) => t < a || t > d ? 0 : t < b ? P(t, a, b) : t < c ? 1 : 1 - P(t, c, d);
const arc = (a, b, p, h) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p) - h * 4 * p * (1 - p)];

/* ---------------- geometry ---------------- */
const U = 76, OX = 960, OY = 600;
const gx = x => OX + x * U, gy = y => OY - y * U;
const G = (x, y) => [gx(x), gy(y)];
const PAPER = { cx: 960, cy: 585, w: 1728, h: 870 };
const fmtN = n => (n < 0 ? '–' : '') + Math.abs(n);

/* ---------------- textures ---------------- */
const PAT = {};
function gouache(col) {
  const key = 'g' + col; if (PAT[key]) return PAT[key];
  const S = 256, c = mk(S, S), g = c.getContext('2d'), R = mulberry(strHash(key));
  g.fillStyle = col; g.fillRect(0, 0, S, S); g.lineCap = 'round';
  const [cr, cg, cb] = hexRgb(col), lum = (cr * .3 + cg * .59 + cb * .11) / 255, m = lum > .8 ? .28 : 1;
  for (let i = 0; i < 240; i++) {
    const x = R() * S, y = R() * S, len = 30 + R() * 150, w = 1 + R() * 6, ang = (R() - .5) * .45, light = R() < .5;
    g.strokeStyle = light ? `rgba(255,248,232,${(.03 + R() * .08) * m})` : `rgba(45,22,10,${(.03 + R() * .07) * m})`; g.lineWidth = w;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len); g.stroke(); }
  }
  const id = g.getImageData(0, 0, S, S), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; if (R() < .01) { d[i] += 45; d[i + 1] += 42; d[i + 2] += 38; } }
  g.putImageData(id, 0, 0);
  return PAT[key] = ctx.createPattern(c, 'repeat');
}
function crayon(col) {
  const key = 'c' + col; if (PAT[key]) return PAT[key];
  const S = 200, c = mk(S, S), g = c.getContext('2d'), R = mulberry(strHash(key));
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${.25 + R() * .75})`; g.fillRect(R() * S, R() * S, 1 + R() * 2.4, 1 + R() * 1.4); }
  for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(0,0,0,${.15 + R() * .3})`; g.fillRect(R() * S, R() * S, 6 + R() * 30, 1); }
  return PAT[key] = ctx.createPattern(c, 'repeat');
}
function paperTex(base, seed) {
  const S = 512, c = mk(S, S), g = c.getContext('2d'), R = mulberry(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const id = g.getImageData(0, 0, S, S), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.1; }
  g.putImageData(id, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 380; i++) {
    const x = R() * S, y = R() * S, l = 6 + R() * 26, a = R() * Math.PI;
    g.strokeStyle = R() < .6 ? `rgba(255,255,250,${.10 + R() * .15})` : `rgba(120,95,60,${.05 + R() * .08})`; g.lineWidth = .6 + R() * .8;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a) * l * .5 + 3, y + oy + Math.sin(a) * l * .5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); }
  }
  return c;
}

/* ---------------- torn paper shapes ---------------- */
const rectBase = (w, h) => g => [[-w / 2 - g, -h / 2 - g], [w / 2 + g, -h / 2 - g], [w / 2 + g, h / 2 + g], [-w / 2 - g, h / 2 + g]];
const circBase = (r, n = 40) => g => { const a = []; for (let i = 0; i < n; i++) { const th = i / n * Math.PI * 2; a.push([Math.cos(th) * (r + g), Math.sin(th) * (r + g)]); } return a; };
const starBase = (r1, r2) => g => { const a = []; for (let i = 0; i < 10; i++) { const th = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? r2 + g * .8 : r1 + g * 1.5; a.push([Math.cos(th) * r, Math.sin(th) * r]); } return a; };
const polyBase = pts => g => { let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length; return pts.map(([x, y]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; return [x + dx / d * g, y + dy / d * g]; }); };
function torn(base, seed, rough, step) {
  const R = mulberry(seed), out = [], n = base.length; let lf = 0;
  for (let e = 0; e < n; e++) {
    const a = base[e], b = base[(e + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = Math.max(1, Math.ceil(len / step));
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    for (let i = 0; i < k; i++) { const u = i / k; lf = lf * .65 + (R() - .5) * rough; const off = lf + (R() - .5) * rough * .7; out.push([a[0] + (b[0] - a[0]) * u + nx * off, a[1] + (b[1] - a[1]) * u + ny * off]); }
  }
  return out;
}
const SHAPES = new Map();
const shape = (key, fn) => { if (!SHAPES.has(key)) SHAPES.set(key, fn()); return SHAPES.get(key); };
function pathPts(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
// draws a torn-paper cutout centered at current origin: white fibrous rim + gouache body + cardboard shadow
function cutout(key, base, col, o = {}) {
  const { rough = 2.4, step = 6, rim = 3, shadow = 1, alpha = 1, fillAlpha = 1, noRim = false } = o;
  const outer = shape(key + 'o', () => torn(base(rim), strHash(key) + 1, rough * 1.3, step));
  const inner = shape(key + 'i', () => torn(base(0), strHash(key) + 2, rough, step));
  ctx.save(); ctx.globalAlpha *= alpha;
  if (shadow) { ctx.shadowColor = `rgba(20,12,6,${.34 * shadow})`; ctx.shadowBlur = 8; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6; }
  if (!noRim) { pathPts(outer); ctx.fillStyle = COL.rim; ctx.fill(); ctx.shadowColor = 'transparent'; }
  pathPts(inner); ctx.globalAlpha *= fillAlpha; ctx.fillStyle = gouache(col); ctx.fill();
  ctx.restore();
}

/* ---------------- strokes ---------------- */
function resample(pts, seg) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / seg)); for (let k = 1; k <= n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); }
  return out;
}
function wob(pts, id, amp, seg = 22) { const r = seg ? resample(pts, seg) : pts; return r.map((p, i) => [p[0] + (h2(id * 131 + i, BOIL) - .5) * 2 * amp, p[1] + (h2(id * 137 + i + 7777, BOIL) - .5) * 2 * amp]); }
function cutPoly(pts, f) {
  if (f >= 1) return pts; if (f <= 0) return [pts[0], pts[0]];
  let L = 0; const ls = [0];
  for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(L); }
  const tg = L * f, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { if (ls[i] <= tg) out.push(pts[i]); else { const u = (tg - ls[i - 1]) / ((ls[i] - ls[i - 1]) || 1); out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); break; } }
  return out;
}
function polyline(p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); }
function stroke(pts, col, w, o = {}) {
  const { alpha = 1, id = 1, amp = .8, partial = 1, dash = null, seg = 22 } = o;
  if (alpha <= 0.001) return;
  let p = partial < 1 ? cutPoly(pts, partial) : pts; if (p.length < 2) return;
  p = amp ? wob(p, id, amp, seg) : p;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = crayon(col); ctx.lineWidth = w; polyline(p); ctx.stroke();
  ctx.globalAlpha *= .55; ctx.lineWidth = w * .5; ctx.translate(.8, -.7); polyline(p); ctx.stroke();
  ctx.restore();
}
function arrowHead(x, y, ang, sz, col, w, o = {}) {
  const a1 = ang + Math.PI * .82, a2 = ang - Math.PI * .82;
  stroke([[x + Math.cos(a1) * sz, y + Math.sin(a1) * sz], [x, y], [x + Math.cos(a2) * sz, y + Math.sin(a2) * sz]], col, w, Object.assign({ seg: 0 }, o));
}

/* ---------------- text ---------------- */
function txt(s, x, y, o = {}) {
  const { font = 'PH', size = 40, col = COL.char, align = 'center', alpha = 1, scale = 1, rot = 0, jit = 1 } = o;
  if (alpha <= .001 || scale <= .001) return;
  const [jx, jy] = jit ? J(strHash(s) + Math.round(x * 7 + y), 1.2) : [0, 0];
  ctx.save(); ctx.translate(x + jx, y + jy); if (rot) ctx.rotate(rot); ctx.scale(scale, scale); ctx.globalAlpha *= alpha;
  ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, 0, 0); ctx.restore();
}
function runsWidth(rs, size, font) { let w = 0; for (const r of rs) { ctx.font = `${size}px ${r[2] || font}`; w += ctx.measureText(r[0]).width; } return w; }
function runs(rs, x, y, o = {}) {
  const { size = 40, font = 'PH', alpha = 1, scale = 1 } = o;
  if (alpha <= .001 || scale <= .001) return;
  ctx.save(); const w = runsWidth(rs, size, font);
  ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha *= alpha; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  let cx = -w / 2;
  for (const r of rs) { ctx.font = `${size}px ${r[2] || font}`; ctx.fillStyle = r[1]; ctx.fillText(r[0], cx, 0); cx += ctx.measureText(r[0]).width; }
  ctx.restore();
}
// paper tag holding content
function tag(key, cx, cy, w, h, col, content, o = {}) {
  const { scale = 1, rot = 0, alpha = 1, sx = 1 } = o;
  if (scale <= .001 || alpha <= .001) return;
  const [jx, jy] = J(key, 1.3);
  ctx.save(); ctx.translate(cx + jx, cy + jy); ctx.rotate(rot); ctx.scale(scale * sx, scale); ctx.globalAlpha *= alpha;
  cutout(key, rectBase(w, h), col, { rough: 2 });
  content && content();
  ctx.restore();
}
function chip(key, x, y, r, col, label, o = {}) {
  const { scale = 1, alpha = 1 } = o; if (scale <= .001 || alpha <= .001) return;
  const [jx, jy] = J(key, 1);
  ctx.save(); ctx.translate(x + jx, y + jy); ctx.scale(scale, scale); ctx.globalAlpha *= alpha;
  cutout(key, circBase(r, 28), col, { rough: 1.6, step: 5 });
  txt(label, 0, 1, { size: r * 1.25, col: COL.creamL, jit: 0 });
  ctx.restore();
}

/* ---------------- star & sparkles ---------------- */
function star(x, y, o = {}) {
  const { scale = 1, rot = 0, alpha = 1, ghost = 0, key = 'star', r1 = 30, r2 = 13 } = o;
  if (scale <= .001 || alpha <= .001) return;
  const [jx, jy] = J(key, 1.2);
  ctx.save(); ctx.translate(x + jx, y + jy); ctx.rotate(rot); ctx.scale(scale, scale); ctx.globalAlpha *= alpha;
  if (ghost < 1) { ctx.save(); ctx.globalAlpha *= (1 - ghost); cutout(key, starBase(r1, r2), COL.mustard, { rough: 1.4, step: 4 }); ctx.restore(); }
  if (ghost > 0) {
    ctx.save(); ctx.globalAlpha *= ghost;
    const b = starBase(r1, r2)(0); pathPts(b); ctx.fillStyle = rgba(COL.mustard, .28); ctx.fill();
    stroke(b.concat([b[0]]), COL.char, 3, { dash: [7, 6], seg: 0, amp: .6, id: strHash(key) % 1000 });
    ctx.restore();
  }
  ctx.restore();
}
function sparkles(x, y, t, t0, n, seed, col = COL.mustard, spread = 70) {
  const p = (t - t0) / .8; if (p < 0 || p > 1) return;
  const R = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = spread * (.5 + R() * .6) * E.out(p), s = (5 + R() * 6) * (1 - p);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    ctx.save(); ctx.translate(px, py); ctx.rotate(p * 3 + i); ctx.fillStyle = col;
    ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * .3 : s; const th = k * Math.PI / 4; ctx.lineTo(Math.cos(th) * r, Math.sin(th) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
function dotPt(x, y, o = {}) {
  const { scale = 1, alpha = 1, key = 'dot', r = 9 } = o; if (scale <= .001 || alpha <= .001) return;
  const [jx, jy] = J(key, 1);
  ctx.save(); ctx.translate(x + jx, y + jy); ctx.scale(scale, scale); ctx.globalAlpha *= alpha;
  ctx.fillStyle = rgba(COL.mustard, .55); pathPts(shape(key + 'h', () => torn(circBase(r * 1.9, 22)(0), strHash(key), 1.6, 4))); ctx.fill();
  ctx.fillStyle = gouache(COL.char); pathPts(shape(key + 'c', () => torn(circBase(r, 18)(0), strHash(key) + 5, .9, 3))); ctx.fill();
  ctx.restore();
}

/* ---------------- Pixi (character) ---------------- */
const PIXI_MASK = ['01111110', '11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '01111110'];
const PIXI_SHADE = [];
(function () { const R = mulberry(77); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { let f = (R() - .5) * .12; if (r < 2 && c < 3) f += .12; if (r >= 6) f -= .09; if (c >= 6) f -= .05; PIXI_SHADE[r * 8 + c] = f > 0 ? mix(COL.coral, '#FFF3E0', f) : mix(COL.coral, '#3A0E08', -f); } })();
function drawPixi(st) {
  const { x, y, lx = 0, ly = 0, blink = 0, tilt = 0, feet = 1, walk = 0, mouth = 0, alpha = 1, eyes = 1 } = st;
  if (alpha <= 0.001) return;
  const [jx, jy] = J('pixi', 1.2), S = 8, bx = -32, by = -64 - 8 * feet;
  ctx.save(); ctx.translate(x + jx, y + jy); ctx.rotate(tilt); ctx.globalAlpha *= alpha;
  // outline + feet (charcoal) with cardboard shadow
  ctx.save(); ctx.shadowColor = 'rgba(15,8,4,.4)'; ctx.shadowBlur = 7; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;
  ctx.fillStyle = COL.char; ctx.beginPath();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (PIXI_MASK[r][c] === '1') ctx.rect(bx + c * S - 3.5, by + r * S - 3.5, S + 7, S + 7);
  if (feet > .01) { const fh = 9 * feet, lu = 3 * Math.max(0, Math.sin(walk)), ru = 3 * Math.max(0, -Math.sin(walk)); ctx.rect(-25, -fh - lu, 14, fh); ctx.rect(11, -fh - ru, 14, fh); }
  ctx.fill(); ctx.restore();
  // pixel body
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (PIXI_MASK[r][c] === '1') { ctx.fillStyle = PIXI_SHADE[r * 8 + c]; ctx.fillRect(bx + c * S, by + r * S, S, S); }
  ctx.save(); ctx.globalAlpha *= .35; ctx.fillStyle = gouache(COL.coral); ctx.beginPath();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (PIXI_MASK[r][c] === '1') ctx.rect(bx + c * S, by + r * S, S, S);
  ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(90,25,12,.13)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 1; i < 8; i++) { ctx.moveTo(bx + i * S, by); ctx.lineTo(bx + i * S, by + 64); ctx.moveTo(bx, by + i * S); ctx.lineTo(bx + 64, by + i * S); }
  ctx.stroke();
  // eyes (snap to pixel grid)
  if (eyes > .01) {
    ctx.globalAlpha *= eyes;
    const ex = Math.round(clamp(lx, -1, 1)), ey = Math.round(clamp(ly, -1, 1));
    const eh = Math.max(3, 16 * (1 - blink));
    for (const col of [2, 5]) {
      const X = bx + (col + ex) * S, Y = by + (2 + ey) * S + 16 - eh;
      ctx.fillStyle = COL.ink; ctx.fillRect(X, Y, S, eh);
      if (blink < .3) { ctx.fillStyle = '#FFF6E6'; ctx.fillRect(X + 1, Y + 2, 3, 3); }
    }
    if (mouth > .5) { ctx.fillStyle = COL.ink; ctx.fillRect(-4, by + (5 + Math.max(0, ey)) * S + 1, 8, 7); }
  }
  ctx.restore();
}

/* ---------------- timeline data ---------------- */
let BIGX = 0, PREFW = 0, CURX = 0; // computed after font load
const CURY = 568; // cursor bottom in big prompt
const MT = [380, 305]; // top of the function machine (Pixi stands here)
const CARDS = [[420, 600], [960, 600], [1500, 600]];
const CYC = [{ s: 49.9, f: 1 }, { s: 52.3, f: .92 }, { s: 54.4, f: .85 }, { s: 56.3, f: .8 }];
const CYX = [-1, 0, 1, 2], ROWY = [680, 745, 810, 875];
const CMDS = [[6.4, 'locate ★'], [10.4, 'number line'], [21.0, 'x = 3  →  ?'], [28.2, 'add y-axis'], [32.6, 'plot (3, 2)'], [39.0, '(3, 2) ≠ (2, 3)'], [42.6, 'quadrants'], [49.0, 'rule: x → 2x + 1'], [60.6, 'y = 2x + 1'], [63.4, 'y = kx + 1'], [68.2, 'y = x²'], [72.8, 'each x → one y'], [76.8, 'recap'], [83.3, '']];
const TYPE_RATE = 20;
let HOPS = [];
function buildHops() {
  HOPS = [];
  const hop = (t0, t1, a, b, h, o = {}) => HOPS.push(Object.assign({ t0, t1, a, b, h }, o));
  hop(3.8, 5.0, [CURX, CURY + 8], G(0, 0), 170);
  hop(6.8, 7.15, G(0, 0), G(0, 0), 26); hop(7.25, 7.6, G(0, 0), G(0, 0), 26);
  hop(12.4, 13.15, G(0, 0), G(1, 0), 46, { n: 0 }); hop(13.2, 13.95, G(1, 0), G(2, 0), 46, { n: 1 }); hop(14.0, 14.75, G(2, 0), G(3, 0), 46, { n: 2 });
  hop(17.4, 18.3, G(3, 0), G(3, 0), 95, { boing: 1 });
  hop(32.4, 33.3, G(3, 0), G(0, 0), 110);
  hop(33.6, 34.25, G(0, 0), G(1, 0), 36, { n: 0 }); hop(34.3, 34.95, G(1, 0), G(2, 0), 36, { n: 1 }); hop(35.0, 35.65, G(2, 0), G(3, 0), 36, { n: 2 });
  hop(36.1, 36.85, G(3, 0), G(3, 1), 34, { n: 3 }); hop(36.9, 37.65, G(3, 1), [gx(3), gy(2) - 26], 34, { n: 4 });
  hop(38.2, 39.0, [gx(3), gy(2) - 26], G(5, 0), 80);
  hop(48.8, 49.8, G(5, 0), MT, 260);
  CYC.forEach(c => hop(c.s + .6 * c.f, c.s + .9 * c.f, MT, MT, 18, { stomp: 1 }));
  hop(61.4, 62.3, MT, G(0, 1), 200);
  hop(76.3, 78.1, G(0, 0), [CARDS[0][0], 437], 330, { chime: 0 });
  hop(79.6, 80.4, [CARDS[0][0], 437], [CARDS[1][0], 437], 120, { chime: 1 });
  hop(81.2, 82.0, [CARDS[1][0], 437], [CARDS[2][0], 437], 120, { chime: 2 });
  hop(83.3, 84.5, [CARDS[2][0], 437], [CURX, CURY + 8], 200);
}
// slope k(t) for scene 6 dial
function kAt(t) {
  if (t < 63.8) return 2;
  if (t < 65.0) return lerp(2, .5, E.io(P(t, 63.8, 65.0)));
  if (t < 65.4) return .5;
  if (t < 66.6) return lerp(.5, -1, E.io(P(t, 65.4, 66.6)));
  if (t < 67.0) return -1;
  return lerp(-1, 1, E.io(P(t, 67.0, 67.9)));
}
const morphS = t => E.io(P(t, 68.2, 69.8));      // line -> parabola
const backS = t => E.io(P(t, 76.6, 77.6));       // parabola -> 2x+1 for recap
function curveY(x, t) {
  if (t < 63.8) return 2 * x + 1;
  if (t < 68.2) return kAt(t) * x + 1;
  if (t < 76.6) { const s = morphS(t); return (1 - s) * (x + 1) + s * x * x; }
  const s = backS(t); return (1 - s) * x * x + s * (2 * x + 1);
}
const skateX = t => { const p = P(t, 70.0, 72.6); return 1.9 * (1 - p) * Math.sin(2 * Math.PI * (t - 70.0) / 1.3); };
const beamX6 = t => lerp(-2.35, 2.35, E.sine(P(t, 73.0, 75.6)));

/* face keyframes: [t, lx, ly, mouth] */
const LOOK = [[0, 0, 0, 0], [2.9, -1, 0, 0], [3.3, 1, 0, 0], [3.7, 0, 0, 0], [5.6, 0, -1, 0], [6.4, 1, -1, 0], [7.6, 0, -1, 1], [8.6, 0, -1, 0], [8.9, 0, 1, 0], [9.6, 0, 0, 0],
  [12.3, 1, 0, 0], [15.2, -1, 0, 0], [16.6, 0, -1, 0], [18.4, 0, -1, 1], [19.0, 0, 0, 0],
  [20.0, 0, -1, 0], [21.4, 0, 1, 0], [21.9, 0, -1, 0], [22.4, 0, 1, 0], [23.6, 0, -1, 1], [24.0, 0, 1, 1], [24.4, 0, -1, 1], [24.8, 0, 1, 1], [25.2, 0, 0, 1], [25.8, 0, 0, 0], [26.4, -1, 0, 0], [28.6, -1, -1, 0], [30.2, 0, 0, 0],
  [32.4, -1, 0, 0], [33.5, 1, 0, 0], [36.0, 0, -1, 0], [37.7, 1, 0, 0], [38.2, -1, -1, 0], [41.0, 0, -1, 0], [42.6, 0, -1, 0], [43.3, -1, -1, 0], [44.0, -1, 1, 0], [44.7, 0, 1, 0], [45.6, 0, 0, 0],
  [47.6, -1, 0, 0], [49.0, -1, -1, 0], [58.2, 1, 0, 0], [59.8, 1, -1, 1], [60.8, 1, 0, 0], [61.4, 1, 1, 0],
  [62.6, 0, 0, 0], [63.2, 1, 1, 0], [66.0, 1, 0, 0], [67.9, 0, 0, 0], [68.4, 0, 1, 1], [69.8, 0, 0, 0], [70.0, 0, 0, 1], [72.5, 0, 0, 0], [72.7, -1, 0, 0],
  [77.0, 1, 0, 0], [78.2, 1, 0, 0], [80.5, 1, 0, 0], [82.1, 0, -1, 0], [83.0, -1, -1, 0], [84.6, 0, 0, 0]];
const BLINKS = [4.2, 9.4, 13.9, 19.4, 22.9, 27.4, 31.5, 35.8, 41.2, 46.0, 51.0, 55.5, 59.2, 64.6, 69.2, 74.35, 79.0, 81.5, 84.0];
function face(t) {
  let k = LOOK[0]; for (const f of LOOK) if (t >= f[0]) k = f;
  let lx = k[1], ly = k[2], mouth = k[3];
  // machine cycles: look at funnel, then output
  for (const c of CYC) { const u = (t - c.s) / c.f; if (u >= 0 && u < 2.2) { if (u < 1.1) { lx = -1; ly = 0; } else if (u < 1.55) { lx = 1; ly = 1; } else { lx = 1; ly = 0; } } }
  if (t >= 72.7 && t < 76.3) { const bx = beamX6(t); lx = bx < -.35 ? -1 : bx > .35 ? 1 : 0; ly = Math.abs(bx) < .35 ? -1 : 0; mouth = Math.abs(bx) < .35 ? 1 : 0; }
  let blink = 0;
  for (const b of BLINKS) { const d = t - b; if (d >= 0 && d < .18) blink = Math.max(blink, 1 - Math.abs(d - .09) / .09); }
  return { lx, ly, mouth, blink };
}

function pixiState(t) {
  const feet = t < 3.0 ? 0 : t < 3.25 ? P(t, 3.0, 3.25) : t < 84.6 ? 1 : t < 84.9 ? 1 - P(t, 84.6, 84.9) : 0;
  let x = CURX, y = CURY + 8 * feet, tilt = 0, walk = 0;
  let last = null, active = null;
  for (const h of HOPS) { if (t >= h.t0) last = h; if (t >= h.t0 && t < h.t1) active = h; }
  if (active) {
    const p = (t - active.t0) / (active.t1 - active.t0); [x, y] = arc(active.a, active.b, p, active.h);
    const dx = active.b[0] - active.a[0]; if (Math.abs(dx) > 5) tilt = .16 * Math.sign(dx) * Math.sin(p * Math.PI);
    walk = p * Math.PI * 2;
  } else if (last && !(t >= 84.5)) { [x, y] = last.b; }
  if (t >= 84.5) { x = CURX; y = CURY + 8 * feet; }
  // scene 6: riding the graph
  if (t >= 62.3 && t < 76.3) {
    let px = 0;
    if (t >= 70.0 && t < 72.6) px = skateX(t);
    const py = curveY(px, t);
    x = gx(px); y = gy(py);
    let slope;
    if (t < 68.2) slope = t < 63.8 ? 2 : kAt(t); else slope = (1 - morphS(t)) * 1 + morphS(t) * 2 * px;
    const amt = t < 62.8 ? E.io(P(t, 62.3, 62.8)) : 1;
    tilt = -Math.atan(slope) * (t >= 70 && t < 72.6 ? .85 : .55) * amt;
    if (t >= 70 && t < 72.6) walk = (t - 70) * 9;
  }
  const f = face(t);
  let alpha = 1, eyes = 1, blink = f.blink;
  // start: Pixi is the terminal cursor
  if (t < 2.5) { eyes = 0; const ph = t; alpha = (ph >= .3 && ph < .8) || (ph >= 1.2 && ph < 1.7) || ph >= 2.1 ? 1 : 0; }
  else if (t < 2.75) blink = Math.max(blink, 1 - P(t, 2.6, 2.75));
  if (t >= 85.0) { blink = Math.max(blink, P(t, 85.0, 85.15)); if (t >= 85.5) eyes = 0; if (t >= 85.8) alpha = ((t - 85.8) % 1) < .55 ? 1 : 0; }
  return { x, y, tilt, feet, walk, lx: f.lx, ly: f.ly, mouth: f.mouth, blink, alpha, eyes };
}

/* ---------------- static layers ---------------- */
let BG, PAPERC, PAPERSH, PAPER_INNER, GRAIN, VIG;
const PPAD = 44;
function buildStatic() {
  // terminal on a dark desk
  BG = mk(W, H); const g = BG.getContext('2d');
  g.fillStyle = '#0c0b0a'; g.fillRect(0, 0, W, H);
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 40; g.shadowOffsetY = 12; rr(36, 28, 1848, 1024, 20); g.fillStyle = '#1b1a19'; g.fill(); g.restore();
  g.save(); rr(36, 28, 1848, 1024, 20); g.clip();
  const gr = g.createLinearGradient(0, 28, 0, 1052); gr.addColorStop(0, '#1f1e1c'); gr.addColorStop(1, '#161514'); g.fillStyle = gr; g.fillRect(36, 28, 1848, 1024);
  g.fillStyle = '#2a2826'; g.fillRect(36, 28, 1848, 48);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(36, 76, 1848, 2);
  for (let y = 78; y < 1052; y += 3) { g.fillStyle = 'rgba(255,255,255,.012)'; g.fillRect(36, y, 1848, 1); }
  g.restore();
  g.strokeStyle = '#3a3734'; g.lineWidth = 2; rr(36, 28, 1848, 1024, 20); g.stroke();
  [[COL.coral, 72], [COL.mustard, 102], [COL.teal, 132]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 52, 8.5, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = '#9b948a'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = '20px JB'; const w1 = g.measureText('pixi@grid  ·  ').width; g.font = '22px ZK'; const w2 = g.measureText('平面直角坐标系 · 函数').width;
  g.font = '20px JB'; g.fillText('pixi@grid  ·  ', 960 - (w1 + w2) / 2, 53); g.font = '22px ZK'; g.fillText('平面直角坐标系 · 函数', 960 - (w1 + w2) / 2 + w1, 52);
  // paper stage
  const w = PAPER.w, h = PAPER.h; PAPERC = mk(w + PPAD * 2, h + PPAD * 2); const p = PAPERC.getContext('2d'); p.translate(w / 2 + PPAD, h / 2 + PPAD);
  const outer = torn(rectBase(w, h)(4), 11, 5, 7), inner = torn(rectBase(w, h)(0), 12, 3.4, 6);
  PAPER_INNER = inner.map(([x, y]) => [x + PAPER.cx, y + PAPER.cy]);
  const pp = (pts, gg) => { gg.beginPath(); gg.moveTo(pts[0][0], pts[0][1]); pts.forEach(q => gg.lineTo(q[0], q[1])); gg.closePath(); };
  pp(outer, p); p.fillStyle = COL.rim; p.fill();
  p.save(); pp(inner, p); p.clip(); p.fillStyle = p.createPattern(paperTex(COL.cream, 5), 'repeat'); p.fillRect(-w / 2 - 20, -h / 2 - 20, w + 40, h + 40);
  const R = mulberry(9); for (let i = 0; i < 14; i++) { const x = (R() - .5) * w, y = (R() - .5) * h, r = 120 + R() * 300; const rg = p.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, R() < .5 ? 'rgba(255,250,235,.10)' : 'rgba(150,115,70,.05)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); p.fillStyle = rg; p.fillRect(x - r, y - r, 2 * r, 2 * r); }
  p.restore();
  PAPERSH = mk(w + PPAD * 2, h + PPAD * 2); const s = PAPERSH.getContext('2d'); s.translate(w / 2 + PPAD, h / 2 + PPAD); s.filter = 'blur(10px)'; pp(outer, s); s.fillStyle = 'rgba(0,0,0,.6)'; s.fill();
  // grain + vignette
  GRAIN = mk(256, 256); const gg2 = GRAIN.getContext('2d'); const id = gg2.createImageData(256, 256); const R2 = mulberry(3);
  for (let i = 0; i < id.data.length; i += 4) { const v = R2() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gg2.putImageData(id, 0, 0);
  VIG = mk(W, H); const v = VIG.getContext('2d'); const vg = v.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)'); v.fillStyle = vg; v.fillRect(0, 0, W, H);
}

/* ---------------- prompt ---------------- */
function curCmd(t) { let c = null; for (const k of CMDS) if (t >= k[0]) c = k; if (!c) return ''; const n = Math.floor((t - c[0]) * TYPE_RATE); return c[1].slice(0, Math.max(0, n)); }
function promptMode(t) { return t < 3.6 ? 0 : t < 4.6 ? E.io(P(t, 3.6, 4.6)) : t < 83.4 ? 1 : t < 84.4 ? 1 - E.io(P(t, 83.4, 84.4)) : 0; }
function drawPrompt(t) {
  const m = promptMode(t), size = lerp(60, 28, m), x0 = lerp(BIGX, 84, m), y0 = lerp(CURY - 6, 124, m);
  ctx.save(); ctx.font = `${size}px JB`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(42,154,140,.25)'; ctx.shadowBlur = 10;
  let x = x0;
  for (const [s, c] of [['pixi@grid', COL.teal], [':~', COL.mustard], ['$ ', COL.term]]) { ctx.fillStyle = c; ctx.fillText(s, x, y0); x += ctx.measureText(s).width; }
  if (m > .99) {
    const cmd = curCmd(t); ctx.fillStyle = COL.term; ctx.fillText(cmd, x, y0); x += ctx.measureText(cmd).width;
    if (((t * 2) % 2) < 1.25) { ctx.shadowColor = 'transparent'; ctx.strokeStyle = COL.coral; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y0 - 24, 16, 30); }
  }
  ctx.restore();
}

/* ---------------- stage content ---------------- */
function qMarkPts() {
  const pts = [], cx = 960, cy = 372, r = 58;
  for (let i = 0; i <= 80; i++) { const th = (160 + (450 - 160) * i / 80) * Math.PI / 180; pts.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]); }
  const sx = pts[80][0], sy = pts[80][1];
  for (let i = 1; i <= 20; i++) pts.push([sx, sy + 34 * i / 20]);
  return pts;
}
const QPTS = qMarkPts();
const LINEPTS = QPTS.map((_, i) => [lerp(gx(-11), gx(11), i / (QPTS.length - 1)), OY]);

function xAxis(t) {
  if (t < 7.6) return;
  if (t < 9.9) {
    const pd = P(t, 7.6, 8.4);
    let pts = QPTS;
    if (t >= 8.8) pts = QPTS.map((q, i) => { const p = E.io(clamp((t - 8.8 - .3 * Math.abs(i / QPTS.length - .45)) / .8)); return [lerp(q[0], LINEPTS[i][0], p), lerp(q[1], LINEPTS[i][1], p)]; });
    stroke(pts, COL.char, t < 8.8 ? 12 : lerp(12, 6, P(t, 8.8, 9.6)), { partial: t < 8.8 ? E.out(pd) : 1, id: 3, seg: t < 8.8 ? 0 : 22 });
    // question-mark dot falls to become the origin
    if (t >= 8.4) { const p = E.in(P(t, 8.95, 9.6)); const y = lerp(512, OY, p); const r = lerp(11, 9, p);
      ctx.save(); ctx.fillStyle = gouache(p > .98 ? COL.mustard : COL.char); const [jx, jy] = J('qdot'); ctx.beginPath(); ctx.arc(OX + jx, y + jy, r * pop(t, 8.4, .25), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    return;
  }
  stroke([[gx(-11), OY], [gx(11), OY]], COL.char, 6, { id: 3 });
  const a = pop(t, 10.0); if (a > 0) { ctx.save(); ctx.translate(gx(11), OY); ctx.scale(a, a); arrowHead(0, 0, 0, 20, COL.char, 6, { id: 4 }); ctx.restore(); }
}
function yAxis(t) {
  if (t < 28.0) return;
  const p = E.out(P(t, 28.0, 28.6));
  stroke([[OX, OY], [OX, lerp(OY, gy(5.6), p)]], COL.char, 6, { id: 5 });
  stroke([[OX, OY], [OX, lerp(OY, gy(-5.4), p)]], COL.char, 6, { id: 6 });
  const a = pop(t, 28.6); if (a > 0) { ctx.save(); ctx.translate(OX, gy(5.6)); ctx.scale(a, a); arrowHead(0, 0, -Math.PI / 2, 20, COL.char, 6, { id: 7 }); ctx.restore(); }
}
function xLabelStyle(i, t) {
  let col = COL.char, sc = 1;
  if (i === 1 && t >= 13.15 && t < 19.4) { sc = 1 + .3 * Math.exp(-(t - 13.15) * 5); }
  if (i === 2 && t >= 13.95 && t < 19.4) { sc = 1 + .3 * Math.exp(-(t - 13.95) * 5); }
  if (i === 3 && ((t >= 14.75 && t < 19.4) || (t >= 35.65 && t < 47.5))) { col = COL.coral; const t0 = t < 30 ? 14.75 : 35.65; sc = 1.15 + .3 * Math.exp(-(t - t0) * 5); }
  if (i === -2 && t >= 15.6 && t < 19.4) { col = COL.teal; sc = 1.15 + .3 * Math.exp(-(t - 15.6) * 5); }
  return [col, sc];
}
function ticksAndLabels(t) {
  if (t >= 10.0) for (let i = -10; i <= 10; i++) {
    const s = pop(t, 10.0 + Math.abs(i) * .06, .25); if (s <= 0) continue;
    const [jx, jy] = J(500 + i, 1); const x = gx(i) + jx;
    stroke([[x, OY - 9 * s + jy], [x, OY + 9 * s + jy]], COL.char, 4, { amp: 0, seg: 0 });
    if (i !== 0) { const ls = pop(t, 11.0 + Math.abs(i) * .05, .3); const [c, sc] = xLabelStyle(i, t); txt(fmtN(i), gx(i), 640, { size: 30, col: c, scale: ls * sc, alpha: .9 }); }
  }
  if (t >= 11.0) { // origin label: 0 -> O
    const m = P(t, 31.8, 32.2);
    txt('0', OX, 640, { size: 30, alpha: (1 - m) * .9, scale: pop(t, 11.0, .3) });
    txt('O', OX - 22, 630, { size: 34, alpha: m, scale: pop(t, 31.8, .3) });
  }
  if (t >= 28.4) for (let j = -5; j <= 5; j++) {
    if (j === 0) continue; const s = pop(t, 28.4 + Math.abs(j) * .07, .25); if (s <= 0) continue;
    const [jx, jy] = J(600 + j, 1); const y = gy(j) + jy;
    stroke([[OX - 9 * s + jx, y], [OX + 9 * s + jx, y]], COL.char, 4, { amp: 0, seg: 0 });
    const ls = pop(t, 29.0 + Math.abs(j) * .06, .3); let col = COL.char, sc = 1;
    if (j === 2 && t >= 37.65 && t < 47.5) { col = COL.teal; sc = 1.15 + .3 * Math.exp(-(t - 37.65) * 5); }
    txt(fmtN(j), OX - 24, gy(j), { size: 30, col, scale: ls * sc, alpha: .9, align: 'right' });
  }
  // axis names
  txt('x', 1790, 566, { size: 48, col: COL.coral, scale: pop(t, 31.2) });
  txt('y', OX + 30, 180, { size: 48, col: COL.teal, scale: pop(t, 31.5) });
}
function grid(t) {
  if (t < 30) return;
  ctx.save(); ctx.globalAlpha *= .5 * (t > 76.6 ? 1 : 1);
  for (let i = -11; i <= 11; i++) {
    if (i === 0) continue; const p = E.out(P(t, 30.0 + Math.abs(i) * .05, 30.5 + Math.abs(i) * .05)); if (p <= 0) continue;
    stroke([[gx(i), OY], [gx(i), lerp(OY, gy(5.6), p)]], COL.pencil, 1.7, { id: 40 + i, amp: .7 });
    stroke([[gx(i), OY], [gx(i), lerp(OY, gy(-5.4), p)]], COL.pencil, 1.7, { id: 80 + i, amp: .7 });
  }
  for (let j = -5; j <= 5; j++) {
    if (j === 0) continue; const p = E.out(P(t, 30.5 + Math.abs(j) * .08, 31.2 + Math.abs(j) * .08)); if (p <= 0) continue;
    stroke([[OX, gy(j)], [lerp(OX, gx(11), p), gy(j)]], COL.pencil, 1.7, { id: 120 + j, amp: .7 });
    stroke([[OX, gy(j)], [lerp(OX, gx(-11), p), gy(j)]], COL.pencil, 1.7, { id: 140 + j, amp: .7 });
  }
  ctx.restore();
}
function beam(x, top, bot, w, alpha) {
  if (alpha <= .001) return;
  const [jx] = J('beam', 1);
  ctx.save(); ctx.globalAlpha *= alpha;
  for (const [k, a] of [[2.6, .07], [1.7, .12], [1, .22], [.4, .3]]) { ctx.fillStyle = rgba(COL.mustard, a); ctx.fillRect(x - w * k / 2 + jx, top, w * k, bot - top); }
  ctx.globalAlpha *= .25; ctx.fillStyle = gouache(COL.mustard); ctx.fillRect(x - w / 2 + jx, top, w, bot - top);
  ctx.restore();
}
function quadrants(t) {
  if (t < 42.5 || t > 47.5) return;
  const Q = [
    { c: [1384, 382], w: 832, h: 420, col: COL.mustard, t0: 42.6, name: '第一象限', s: ['+', '+'], lp: [1560, 250] },
    { c: [536, 382], w: 832, h: 420, col: COL.teal, t0: 43.3, name: '第二象限', s: ['–', '+'], lp: [380, 250] },
    { c: [536, 808], w: 832, h: 400, col: COL.coral, t0: 44.0, name: '第三象限', s: ['–', '–'], lp: [380, 880] },
    { c: [1384, 808], w: 832, h: 400, col: '#B9A27A', t0: 44.7, name: '第四象限', s: ['+', '–'], lp: [1560, 880] }];
  const fo = 1 - P(t, 46.6, 47.4);
  Q.forEach((q, i) => {
    const p = E.out(P(t, q.t0, q.t0 + .45)); if (p <= 0) return;
    const dx = (q.c[0] - OX) * .08 * (1 - p), dy = (q.c[1] - OY) * .08 * (1 - p);
    const [jx, jy] = J('quad' + i, 1.2);
    ctx.save(); ctx.translate(q.c[0] + dx + jx, q.c[1] + dy + jy); ctx.rotate((1 - p) * .03 * (i % 2 ? -1 : 1)); ctx.globalAlpha *= p * fo;
    cutout('quad' + i, rectBase(q.w, q.h), q.col, { rough: 4, step: 9, fillAlpha: .2, shadow: .25, noRim: true });
    ctx.restore();
    const ls = pop(t, q.t0 + .2) * fo;
    txt(q.name, q.lp[0], q.lp[1], { font: 'ZK', size: 42, scale: ls, col: COL.char });
    runs([['(', COL.char], [q.s[0], COL.coral], [', ', COL.char], [q.s[1], COL.teal], [')', COL.char]], q.lp[0], q.lp[1] + 54, { size: 44, scale: ls });
  });
}
const tag32 = (sc, al) => tag('tag32', 1300, 470, 150, 60, COL.creamL, () => runs([['(', COL.char], ['3', COL.coral], [', ', COL.char], ['2', COL.teal], [')', COL.char]], 0, 2, { size: 44 }), { scale: sc, alpha: al });

function graphPts(t, x0, x1, step = .04) { const out = []; for (let x = x0; x <= x1 + 1e-9; x += step) { const y = curveY(x, t); out.push([gx(x), clamp(gy(y), -300, 1400)]); } return out; }
function graphLine(t) {
  if (t < 59.8) return;
  if (t < 63.8) { stroke(graphPts(t, -3.2, 2.3), COL.char, 7, { partial: E.io(P(t, 59.8, 60.8)), id: 9, amp: .5, seg: 0 }); return; }
  let p = 1; if (t >= 82.0 && t < 83.2) p = E.io(P(t, 82.0, 82.6));
  stroke(graphPts(t, -11, 11, .05), COL.char, 7, { id: 9, amp: .5, seg: 0, partial: p });
}
function lineTagText(t) {
  if (t < 63.8) return 'y = 2x + 1';
  if (t < 68.2) { const k = Math.round(kAt(t) * 2) / 2; if (k === 0) return 'y = 1'; const ks = k === 1 ? 'x' : k === -1 ? '–x' : fmtN(k) + 'x'; return `y = ${ks} + 1`; }
  if (t < 76.6) return t < 69.1 ? 'y = x + 1' : 'y = x²';
  return t < 77.1 ? 'y = x²' : 'y = 2x + 1';
}
function lineTag(t) {
  if (t < 60.6) return;
  const sc = pop(t, 60.6);
  let flip = 1; // squash on text change
  for (const tc of [69.1, 77.1]) { const d = Math.abs(t - tc); if (d < .15) flip = Math.max(.05, d / .15); }
  tag('linetag', 1450, 250, 280, 68, COL.mustard, () => txt(lineTagText(t), 0, 2, { size: 44, jit: 0 }), { scale: sc, sx: flip, rot: -.02 });
}
function eachTag(t) {
  if (t < 74.0) return; const al = 1 - P(t, 76.0, 76.5); if (al <= 0) return;
  tag('eachtag', 520, 262, 360, 70, COL.creamL, () => runs([['每个 ', COL.char, 'ZK'], ['x', COL.coral], [' → 唯一的 ', COL.char, 'ZK'], ['y', COL.teal]], 0, 2, { size: 36 }), { scale: pop(t, 74.0), alpha: al, rot: .015 });
}

/* scene 5: card with machine + table */
function cardDX(t) { return t < 48.2 ? lerp(-640, 0, E.out(P(t, 47.5, 48.2))) : t < 62.5 ? 0 : lerp(0, -660, E.in(P(t, 62.5, 63.3))); }
function machineShake(t) { for (const c of CYC) { const u = (t - c.s) / c.f; if (u >= .6 && u < 1.15) return [Math.sin(t * 70) * 3.5, Math.cos(t * 53) * 1.6]; } if (t >= 58.2 && t < 59.6) return [Math.sin(t * 80) * 2, 0]; return [0, 0]; }
function drawCard(t) {
  if (t < 47.5 || t > 63.3) return;
  const dx = cardDX(t);
  ctx.save(); ctx.translate(dx, 0);
  ctx.save(); const [jx, jy] = J('card', 1.2); ctx.translate(324 + jx, 600 + jy); ctx.rotate(-.012); cutout('card', rectBase(392, 800), COL.creamL, { rough: 3.2, step: 8 }); ctx.restore();
  // table lines
  const lp = E.out(P(t, 48.3, 48.9));
  stroke([[325, 555], [325, 935]], COL.char, 4, { partial: lp, id: 21 });
  stroke([[160, 625], [490, 625]], COL.char, 4, { partial: lp, id: 22 });
  if (t >= 48.4) { txt('x', 240, 590, { size: 52, col: COL.coral, alpha: P(t, 48.2, 48.4) }); txt('y', 410, 590, { size: 52, col: COL.teal, alpha: P(t, 48.2, 48.4) }); }
  CYC.forEach((c, i) => {
    const x = CYX[i], y = 2 * x + 1;
    txt(fmtN(x), 240, ROWY[i], { size: 44, col: COL.coral, scale: pop(t, c.s) });
    txt(fmtN(y), 410, ROWY[i], { size: 44, col: COL.teal, scale: pop(t, c.s + 1.5 * c.f) });
  });
  // machine
  if (t >= 48.4) {
    const my = lerp(-560, 0, E.bounce(P(t, 48.4, 49.0))); const [sx, sy] = machineShake(t);
    ctx.save(); ctx.translate(sx, my + sy);
    ctx.save(); ctx.translate(250, 272); cutout('funnel', polyBase([[-45, -32], [45, -32], [20, 33], [-20, 33]]), COL.teal, { rough: 1.6, step: 5 }); ctx.restore();
    ctx.save(); ctx.translate(470, 440); cutout('chute', rectBase(56, 30), COL.coral, { rough: 1.4, step: 5 }); ctx.restore();
    ctx.save(); ctx.translate(325, 385); cutout('machine', rectBase(240, 160), COL.mustard, { rough: 2.2, step: 6 });
    txt('×2 +1', 0, 4, { font: 'CV', size: 64, col: COL.char });
    ctx.fillStyle = COL.char; for (const [a, b] of [[-104, -64], [104, -64], [-104, 64], [104, 64]]) { ctx.beginPath(); ctx.arc(a, b, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); ctx.restore();
  }
  ctx.restore();
}
function cardFlying(t) { // chips, pair dots, particles (drawn above Pixi)
  if (t < 47.5 || t > 64.5) return;
  // tag (3,2) splitting into table header
  if (t >= 47.5 && t < 48.5) {
    const p = E.io(P(t, 47.6, 48.4));
    tag('tag32', 1300, 470, 150, 60, COL.creamL, null, { alpha: 1 - P(t, 47.6, 47.9), scale: 1 - .3 * P(t, 47.6, 47.9) });
    const a3 = [1300 - 25, 472], a2 = [1300 + 25, 472];
    const p3 = arc(a3, [240, 590], p, 120), p2 = arc(a2, [410, 590], p, 120);
    txt('3', p3[0], p3[1], { size: lerp(44, 52, p), col: COL.coral, alpha: 1 - P(t, 48.2, 48.4) });
    txt('2', p2[0], p2[1], { size: lerp(44, 52, p), col: COL.teal, alpha: 1 - P(t, 48.2, 48.4) });
  }
  CYC.forEach((c, i) => {
    const u = (t - c.s) / c.f; const x = CYX[i], y = 2 * x + 1;
    if (u >= .15 && u < .62) { const p = E.sine(P(u, .15, .6)); const q = arc([240, ROWY[i]], [250, 240], p, 90); chip('xc' + i, q[0], q[1], 22, COL.coral, fmtN(x), { scale: 1 - .5 * P(u, .45, .6) }); }
    if (u >= 1.1 && u < 1.52) { const p = E.sine(P(u, 1.1, 1.5)); const q = arc([500, 440], [410, ROWY[i]], p, 70); chip('yc' + i, q[0], q[1], 22, COL.teal, fmtN(y), { scale: lerp(.6, 1, P(u, 1.1, 1.2)) }); }
    if (u >= 1.55) {
      const p = E.sine(P(u, 1.55, 1.95)); const q = arc([325, ROWY[i]], G(x, y), p, 120);
      const fade = 1 - P(t, 63.8, 64.4);
      dotPt(q[0], q[1], { key: 'pd' + i, scale: u < 1.95 ? .8 : 1 + .4 * Math.exp(-(u - 1.95) * 8), alpha: fade });
      if (u >= 1.95) txt(`(${fmtN(x)}, ${fmtN(y)})`, gx(x) + (x < 0 ? -18 : 20), gy(y) + (x < 0 ? 30 : -20), { size: 28, align: x < 0 ? 'right' : 'left', alpha: (1 - P(t, 62.5, 63.0)) * P(u, 1.95, 2.1) * .85 });
    }
  });
  // particle rain: every x in between also has its y
  if (t >= 58.2 && t < 61.0) {
    for (let k = 0; k < 48; k++) {
      const x = -3.2 + k * 5.5 / 47, ts = 58.2 + ((k * 17) % 48) * .028; if (t < ts) continue;
      const p = E.sine(P(t, ts, ts + .55)); const q = arc([500, 440], G(x, 2 * x + 1), p, 140);
      ctx.fillStyle = COL.char; ctx.globalAlpha = 1 - P(t, 60.0, 60.8); ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
}
/* scene 6: slope dial */
function dial(t) {
  if (t < 63.0 || t > 68.6) return;
  const dy = t < 63.6 ? lerp(320, 0, E.back(P(t, 63.0, 63.6))) : t > 67.9 ? lerp(0, 380, E.in(P(t, 67.9, 68.5))) : 0;
  const cx = 1640, cy = 860 + dy, k = kAt(t), ang = k * 50 * Math.PI / 180;
  ctx.save();
  for (let kk = -2; kk <= 2; kk += .5) { const a = kk * 50 * Math.PI / 180 - Math.PI / 2; stroke([[cx + Math.cos(a) * 80, cy + Math.sin(a) * 80], [cx + Math.cos(a) * (Number.isInteger(kk) ? 94 : 88), cy + Math.sin(a) * (Number.isInteger(kk) ? 94 : 88)]], COL.char, 3, { amp: 0, seg: 0 }); }
  for (const kk of [-2, -1, 0, 1, 2]) { const a = kk * 50 * Math.PI / 180 - Math.PI / 2; txt(fmtN(kk), cx + Math.cos(a) * 116, cy + Math.sin(a) * 116, { size: 28 }); }
  ctx.save(); const [jx, jy] = J('dial'); ctx.translate(cx + jx, cy + jy); cutout('dial', circBase(70, 36), COL.teal, { rough: 1.8, step: 6 });
  ctx.rotate(ang); stroke([[0, 0], [0, -58]], COL.char, 8, { amp: 0, seg: 0 }); ctx.rotate(-ang);
  cutout('dialcap', circBase(17, 18), COL.creamL, { rough: 1, step: 4, shadow: .6 });
  ctx.restore();
  txt('k', cx - 150, cy - 70, { size: 56, col: COL.coral });
  ctx.restore();
}

function drawStars(t) {
  // real star: falls in at 5.4, sits at (3,2), leaves at 48.6
  if (t >= 5.4 && t < 48.6) {
    const [tx, ty] = G(3, 2); let x = tx, y = ty, rot = Math.sin(t * 1.3) * .06, sc = 1 + .03 * Math.sin(t * 2.1);
    if (t < 6.4) { const p = P(t, 5.4, 6.4); y = lerp(-60, ty, E.bounce(p)); x = tx + Math.sin(p * 7) * 40 * (1 - p); rot = (1 - E.out(p)) * Math.PI * 3; }
    if (t >= 37.65 && t < 38.3) { const p = P(t, 37.65, 38.3); y -= Math.sin(p * Math.PI) * 26; sc *= 1 + .25 * Math.sin(p * Math.PI); }
    if (t >= 47.8) sc *= 1 - E.in(P(t, 47.8, 48.6));
    const ghost = Math.min(P(t, 23.4, 23.8), 1 - P(t, 25.6, 26.2));
    star(x, y, { rot, scale: sc, ghost: t >= 23.4 && t < 26.2 ? ghost : 0 });
    sparkles(tx, ty, t, 6.4, 12, 41); sparkles(tx, ty - 26, t, 37.65, 14, 43);
  }
  // ghost stars: one number cannot pin down the point
  if (t >= 21.4 && t < 26.2) {
    [4.4, 3.3, -1.6, -3.4].forEach((yy, i) => {
      const s = pop(t, 21.4 + i * .5) * (1 - E.in(P(t, 25.6, 26.1)));
      star(gx(3), gy(yy), { key: 'gs' + i, ghost: 1, scale: s, rot: Math.sin(t * 3 + i) * .12 });
    });
  }
  // (2,3) ghost for order comparison
  if (t >= 40.1 && t < 42.5) {
    const al = 1 - P(t, 41.9, 42.5), [x, y] = G(2, 3);
    stroke([[x, y], [x, OY]], COL.coral, 3, { dash: [9, 8], partial: P(t, 40.2, 40.8), alpha: al * .8, id: 31 });
    stroke([[x, y], [OX, y]], COL.teal, 3, { dash: [9, 8], partial: P(t, 40.2, 40.8), alpha: al * .8, id: 32 });
    star(x, y, { key: 'g23', ghost: 1, scale: pop(t, 40.1), alpha: al });
  }
}

function drawStage(t) {
  // stage transform (drop-in, recap shrink, final drop)
  if (t < 3.9) return;
  let tx = 0, ty = 0, sc = 1, rot = 0;
  if (t < 4.7) { const p = P(t, 3.9, 4.7); ty = lerp(-1080, 0, E.out(p)); rot = lerp(-.1, 0, E.out(p)); }
  else if (t < 5.4) rot = Math.sin((t - 4.7) * 25) * Math.exp(-(t - 4.7) * 8) * .01;
  if (t >= 76.6) { const s = E.io(P(t, 76.6, 78.0)); sc = lerp(1, .234, s); tx = lerp(0, 1500 - PAPER.cx, s); ty = lerp(0, 565 - PAPER.cy, s); ty += cardDrop(t, 2); rot = cardDropRot(t, 2); ty += cardBounce(t, 2); }
  if (t >= 84.0) return;
  const [jx, jy] = J('paper', 1);
  ctx.save();
  ctx.translate(PAPER.cx + tx + jx, PAPER.cy + ty + jy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-PAPER.cx, -PAPER.cy);
  ctx.drawImage(PAPERSH, PAPER.cx - PAPER.w / 2 - PPAD + 8, PAPER.cy - PAPER.h / 2 - PPAD + 12);
  ctx.drawImage(PAPERC, PAPER.cx - PAPER.w / 2 - PPAD, PAPER.cy - PAPER.h / 2 - PPAD);
  ctx.save(); pathPts(PAPER_INNER); ctx.clip();
  quadrants(t);
  grid(t);
  // S3 beam: rises from x=3, slides to x=0, becomes the y-axis
  if (t >= 20.0 && t < 28.9) {
    const rise = E.out(P(t, 20.0, 21.2)), bx = gx(lerp(3, 0, E.io(P(t, 26.4, 28.0)))), w = lerp(46, 6, P(t, 28.0, 28.6));
    beam(bx, lerp(OY, 150, rise), lerp(OY, 1020, rise), w, 1 - P(t, 28.2, 28.9));
  }
  if (t >= 72.6 && t < 76.6) beam(gx(beamX6(t)), 150, 1020, 46, P(t, 72.6, 72.9) * (1 - P(t, 76.0, 76.6)));
  yAxis(t); xAxis(t); ticksAndLabels(t);
  // origin dot
  if (t >= 9.6) { ctx.save(); const [jx2, jy2] = J('odot'); ctx.fillStyle = gouache(COL.mustard); ctx.beginPath(); ctx.arc(OX + jx2, OY + jy2, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // S2 trails & pin
  if (t >= 12.4 && t < 19.4) {
    const al = 1 - P(t, 18.6, 19.4), px = Math.max(OX, pixiState(t).x);
    stroke([[OX, OY - 1], [Math.min(px, gx(3)), OY - 1]], COL.coral, 10, { alpha: al * .9, id: 11 });
    if (t >= 15.6) stroke([[OX, OY - 1], [lerp(OX, gx(-2), E.out(P(t, 15.6, 16.2))), OY - 1]], COL.teal, 10, { alpha: al * .9, id: 12 });
    if (t >= 15.2) { const py = lerp(-300, 0, E.bounce(P(t, 15.2, 15.7))); ctx.save(); ctx.globalAlpha *= al; ctx.translate(gx(-2), py);
      stroke([[0, OY], [0, OY - 62]], COL.char, 4, { amp: 0, seg: 0 }); ctx.translate(14, OY - 52); cutout('flag', polyBase([[-14, -12], [24, 0], [-14, 12]]), COL.teal, { rough: 1, step: 4 }); ctx.restore(); }
  }
  // S3 tag x = 3
  if (t >= 21.2 && t < 26.4) tag('x3tag', gx(3), 196, 130, 54, COL.coral, () => txt('x = 3', 0, 2, { size: 38, col: COL.creamL, jit: 0 }), { scale: pop(t, 21.2), alpha: 1 - P(t, 26.0, 26.4) });
  // S4 path to (3,2)
  if (t >= 33.6 && t < 48.2) {
    const al = 1 - P(t, 47.5, 48.2), ps = pixiState(t);
    const ex = t < 35.65 ? Math.max(OX, ps.x) : gx(3);
    stroke([[OX, OY - 1], [ex, OY - 1]], COL.coral, 10, { alpha: al * .9, id: 13 });
    if (t >= 36.1) { const ey = t < 37.65 ? Math.min(OY, ps.y + (t > 36.9 ? 26 * P(t, 36.9, 37.65) : 0)) : gy(2); stroke([[gx(3), OY], [gx(3), ey]], COL.teal, 7, { dash: [16, 10], alpha: al, id: 14 }); }
    if (t >= 37.9) stroke([[gx(3) - 30, gy(2)], [OX, gy(2)]], COL.char, 3, { dash: [8, 8], partial: E.out(P(t, 37.9, 38.4)), alpha: al * .55, id: 15 });
  }
  graphLine(t);
  // stamped dots from the vertical scan
  if (t >= 72.6 && t < 77.0) [-2, -1, 0, 1, 2].forEach((xx, i) => { const tp = 73.0 + 2.6 * (Math.acos(1 - 2 * ((xx + 2.35) / 4.7)) / Math.PI); if (t >= tp) dotPt(gx(xx), gy(xx * xx), { key: 'sd' + i, r: 7, scale: 1 + .5 * Math.exp(-(t - tp) * 8), alpha: 1 - P(t, 76.4, 76.8) }); });
  if (t >= 72.6 && t < 76.6) { const bx = beamX6(t); const al = P(t, 72.6, 72.9) * (1 - P(t, 76.0, 76.6)); dotPt(gx(bx), gy(bx * bx), { key: 'bd', r: 9, scale: 1.2, alpha: al }); chip('beamx', gx(bx), OY + 2, 20, COL.coral, 'x', { alpha: al }); }
  ctx.restore(); // unclip
  drawStars(t);
  if (t >= 37.9 && t < 47.6) tag32(pop(t, 37.9), 1);
  if (t >= 39.0 && t < 42.5) { // copy flips to (2,3)
    const p = E.io(P(t, 39.0, 39.5)), fl = P(t, 39.5, 40.1), sx = Math.abs(Math.cos(fl * Math.PI)), swapped = fl > .5;
    const [cx, cy] = [lerp(1300, 1045, p), lerp(470, 300, p)];
    tag('tag23', cx, cy, 150, 60, COL.creamL, () => runs(swapped ? [['(', COL.char], ['2', COL.coral], [', ', COL.char], ['3', COL.teal], [')', COL.char]] : [['(', COL.char], ['3', COL.coral], [', ', COL.char], ['2', COL.teal], [')', COL.char]], 0, 2, { size: 44 }), { sx: Math.max(.04, sx), alpha: 1 - P(t, 41.9, 42.5), rot: .03 });
  }
  if (t >= 37.9 && t < 47.6) sparkles(1300, 470, t, 37.9, 6, 44, COL.coral, 50);
  lineTag(t); eachTag(t);
  // question mark (scene 1) handled inside xAxis
  ctx.restore();
}

/* ---------------- recap cards ---------------- */
function cardDrop(t, i) { return t < 83.2 ? 0 : 760 * E.in(P(t, 83.2 + i * .1, 84.0 + i * .1)); }
function cardDropRot(t, i) { return t < 83.2 ? 0 : (i - 1) * .2 * E.in(P(t, 83.2 + i * .1, 84.0 + i * .1)); }
function cardBounce(t, i) { const tl = [78.1, 80.4, 82.0][i]; const d = t - tl; return d > 0 && d < .6 ? Math.sin(d * 18) * 9 * Math.exp(-d * 7) : 0; }
function recapCards(t, layer) {
  if (t < 77.0 || t > 84.4) return;
  if (layer === 'back') { // card 3 frame sits behind the shrinking stage
    const al = P(t, 77.4, 77.9); if (al <= 0) return;
    const [cx, cy] = CARDS[2];
    ctx.save(); ctx.translate(cx, cy + cardDrop(t, 2) + cardBounce(t, 2)); ctx.rotate(cardDropRot(t, 2)); ctx.globalAlpha *= al;
    cutout('rc2', rectBase(440, 330), COL.creamL, { rough: 2.6, step: 7 });
    txt('规则 → 图像', 0, 118, { font: 'ZK', size: 36 });
    ctx.restore(); return;
  }
  const arrows = [[650, 730, 78.3], [1190, 1270, 78.6]];
  arrows.forEach(([a, b, t0], i) => { const p = E.out(P(t, t0, t0 + .4)); if (p <= 0) return; const al = 1 - P(t, 83.2, 83.6); stroke([[a, 600], [lerp(a, b, p), 600]], COL.mustard, 6, { id: 60 + i, alpha: al }); if (p > .95) arrowHead(b, 600, 0, 18, COL.mustard, 6, { id: 62 + i, alpha: al }); });
  [0, 1].forEach(i => {
    const t0 = 77.0 + i * .25, p = E.out(P(t, t0, t0 + .9)); if (p <= 0) return;
    const [cx, cy] = CARDS[i], [jx, jy] = J('rc' + i, 1.2);
    ctx.save(); ctx.translate(cx + jx, cy + lerp(620, 0, p) + cardDrop(t, i) + cardBounce(t, i) + jy); ctx.rotate(lerp(i ? -.1 : .12, i ? .014 : -.02, p) + cardDropRot(t, i));
    cutout('rc' + i, rectBase(440, 330), COL.creamL, { rough: 2.6, step: 7 });
    if (i === 0) {
      ctx.save(); ctx.globalAlpha *= .45; for (let a = -3; a <= 10; a++) stroke([[-120 + a * 30, -140], [-120 + a * 30, 60]], COL.pencil, 1.2, { amp: .5, id: 300 + a }); for (let b = -2; b <= 5; b++) stroke([[-190, 20 - b * 30], [190, 20 - b * 30]], COL.pencil, 1.2, { amp: .5, id: 320 + b }); ctx.restore();
      stroke([[-190, 20], [185, 20]], COL.char, 4, { id: 340 }); arrowHead(185, 20, 0, 12, COL.char, 4, { id: 341 });
      stroke([[-120, 60], [-120, -140]], COL.char, 4, { id: 342 }); arrowHead(-120, -140, -Math.PI / 2, 12, COL.char, 4, { id: 343 });
      stroke([[-120, 18], [-30, 18]], COL.coral, 7, { id: 344 });
      stroke([[-30, 20], [-30, -40]], COL.teal, 5, { dash: [10, 7], id: 345 });
      const tw = t >= 78.1 && t < 78.8 ? 1 + .3 * Math.sin(P(t, 78.1, 78.8) * Math.PI) : 1;
      star(-30, -40, { key: 'mstar', r1: 18, r2: 8, scale: tw, rot: Math.sin(t * 1.5) * .08 });
      runs([['(', COL.char], ['3', COL.coral], [', ', COL.char], ['2', COL.teal], [')', COL.char]], 90, -70, { size: 40 });
      txt('两个数 → 一个点', 0, 118, { font: 'ZK', size: 36 });
    } else {
      const [sx, sy] = t >= 80.4 && t < 81.0 ? [Math.sin(t * 70) * 3, 0] : [0, 0];
      ctx.save(); ctx.translate(sx, -50 + sy); cutout('mmach', rectBase(150, 96), COL.mustard, { rough: 1.8 }); txt('×2 +1', 0, 3, { font: 'CV', size: 46 }); ctx.restore();
      const cp = t >= 80.4 && t < 81.2 ? E.sine(P(t, 80.4, 81.2)) : 0;
      chip('mcx', -150 + cp * 30, -50, 22, COL.coral, 'x'); chip('mcy', 150 + cp * 12, -50, 22, COL.teal, 'y');
      stroke([[-122, -50], [-84, -50]], COL.char, 4, { id: 350 }); arrowHead(-84, -50, 0, 10, COL.char, 4, { id: 351 });
      stroke([[84, -50], [122, -50]], COL.char, 4, { id: 352 }); arrowHead(122, -50, 0, 10, COL.char, 4, { id: 353 });
      runs([['每个 ', COL.char, 'ZK'], ['x', COL.coral], [' → 唯一的 ', COL.char, 'ZK'], ['y', COL.teal]], 0, 118, { size: 36 });
    }
    ctx.restore();
  });
}

/* ---------------- frame ---------------- */
function render(t) {
  T = t; FR = Math.round(t * FPS); BOIL = Math.floor(FR / 3);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(BG, 0, 0);
  // clip everything to the terminal body
  ctx.save(); ctx.beginPath(); ctx.rect(38, 78, 1844, 972); ctx.clip();
  recapCards(t, 'back');
  drawStage(t);
  recapCards(t, 'front');
  drawCard(t);
  dial(t);
  drawPrompt(t);
  drawPixi(pixiState(t));
  cardFlying(t);
  // closing title
  if (t >= 85.2) txt('平面直角坐标系 · 函数', 960, 690, { font: 'ZK', size: 52, col: COL.term, alpha: P(t, 85.2, 86.2) * .9 });
  ctx.restore();
  // grain + vignette + fades
  ctx.save(); ctx.globalAlpha = .06; ctx.globalCompositeOperation = 'overlay'; const ox = Math.floor(h2(1, BOIL) * 256), oy = Math.floor(h2(2, BOIL) * 256);
  ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
  ctx.drawImage(VIG, 0, 0);
  const fade = Math.max(1 - P(t, 0, .5), P(t, 87.1, 88.0));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}

/* ---------------- sound cues (exported for the audio builder) ---------------- */
function buildCues() {
  const C = []; const cue = (t, type, o = {}) => C.push(Object.assign({ t: +t.toFixed(3), type }, o));
  cue(0, 'hum');
  [.3, 1.2, 2.1].forEach(t => cue(t, 'blip')); cue(2.6, 'boop'); cue(3.0, 'pop', { p: 1.4 });
  for (const [t0, s] of CMDS) { const n = [...s].length; for (let i = 0; i < n; i++) if (s[i] !== ' ') cue(t0 + i / TYPE_RATE, 'type', { v: (i * 7) % 5 }); }
  for (const h of HOPS) {
    if (h.stomp) { cue(h.t1, 'thump'); continue; }
    cue(h.t0, 'hop', { p: h.n !== undefined ? h.n : -1 });
    if (h.boing) cue(h.t1, 'boing'); else if (h.chime === undefined) cue(h.t1, 'land');
  }
  cue(3.9, 'paper', { d: .8 }); cue(4.62, 'slap');
  cue(5.4, 'fall'); cue(6.05, 'twinkle');
  cue(7.6, 'scribble', { d: .8 }); cue(8.4, 'pop', { p: .8 }); cue(8.8, 'stretch'); cue(9.55, 'tick', { p: 0 });
  for (let i = 0; i <= 10; i++) cue(10.0 + i * .06, 'tick', { p: i });
  cue(10.0, 'pop', { p: 1.1 });
  for (let i = 1; i <= 10; i++) cue(11.0 + i * .05, 'tickSoft', { p: i });
  cue(15.2, 'fall', { short: 1 }); cue(15.45, 'pin'); cue(15.6, 'scribble', { d: .6 });
  cue(19.4, 'twinkle', { soft: 1 });
  cue(20.0, 'shimmer', { d: 1.4 }); [0, 1, 2, 3].forEach(i => cue(21.4 + i * .5, 'popGhost', { p: i })); cue(21.2, 'pin');
  cue(23.6, 'wonder'); cue(25.6, 'poof'); cue(26.4, 'whoosh', { d: 1.6 }); cue(28.0, 'scribble', { d: .6 });
  for (let j = 0; j <= 5; j++) cue(28.4 + j * .07, 'tick', { p: j + 2 });
  cue(30.0, 'pencil', { d: 2.2 }); cue(31.2, 'pop', { p: 1.0 }); cue(31.5, 'pop', { p: 1.2 }); cue(31.8, 'pop', { p: .9 });
  cue(37.65, 'twinkle'); cue(37.9, 'pin'); cue(37.9, 'scribble', { d: .5 });
  cue(39.0, 'whoosh', { d: .5, soft: 1 }); cue(39.5, 'flip'); cue(40.1, 'popGhost', { p: 2 }); cue(41.9, 'poof');
  [42.6, 43.3, 44.0, 44.7].forEach((t, i) => { cue(t, 'paper', { d: .4, soft: 1 }); cue(t + .2, 'note', { p: [0, 2, 4, 7][i] }); });
  cue(46.6, 'paper', { d: .7, soft: 1 });
  cue(47.5, 'paper', { d: .6 }); cue(47.6, 'whoosh', { d: .8, soft: 1 }); cue(48.3, 'scribble', { d: .6 }); cue(48.62, 'thud');
  CYC.forEach((c, i) => {
    cue(c.s, 'scribble', { d: .25 }); cue(c.s + .15 * c.f, 'hop', { p: 5 }); cue(c.s + .6 * c.f, 'plink');
    cue(c.s + .62 * c.f, 'chug', { d: .5 * c.f }); cue(c.s + 1.1 * c.f, 'ding', { p: i }); cue(c.s + 1.5 * c.f, 'scribble', { d: .2 });
    cue(c.s + 1.95 * c.f, 'popDot', { p: i });
  });
  cue(58.2, 'chug', { d: 1.4 }); cue(58.25, 'patter', { d: 1.9 }); cue(59.8, 'scribble', { d: 1.0 }); cue(60.6, 'pin'); cue(60.6, 'twinkle', { soft: 1 });
  cue(62.5, 'paper', { d: .7 }); cue(63.25, 'thud', { soft: 1 });
  { let prev = Math.floor(kAt(63.8) * 4); for (let f = Math.round(63.8 * FPS); f <= Math.round(67.95 * FPS); f++) { const k = Math.floor(kAt(f / FPS) * 4); if (k !== prev) { cue(f / FPS, 'click', { p: k }); prev = k; } } }
  cue(67.9, 'whoosh', { d: .5, soft: 1 }); cue(68.2, 'stretch', { long: 1 });
  cue(70.0, 'slide', { d: 2.6 }); cue(72.6, 'shimmer', { d: 1.0 });
  [-2, -1, 0, 1, 2].forEach(xx => cue(73.0 + 2.6 * (Math.acos(1 - 2 * ((xx + 2.35) / 4.7)) / Math.PI), 'ping', { p: xx * xx }));
  cue(74.0, 'pin'); cue(76.0, 'shimmer', { d: .8, down: 1 });
  cue(76.6, 'whoosh', { d: 1.4 }); cue(77.0, 'paper', { d: .6 }); cue(77.25, 'paper', { d: .6 });
  cue(78.3, 'scribble', { d: .4 }); cue(78.6, 'scribble', { d: .4 });
  [78.1, 80.4, 82.0].forEach((t, i) => cue(t, 'chime', { p: i }));
  cue(80.45, 'chug', { d: .4 }); cue(82.0, 'scribble', { d: .6 });
  cue(83.2, 'paper', { d: .9 }); cue(84.9, 'pop', { p: .6 }); cue(85.8, 'blip'); cue(86.8, 'blip');
  return C.sort((a, b) => a.t - b.t);
}

/* ---------------- boot ---------------- */
window.READY = false;
(async () => {
  await Promise.all([document.fonts.load('40px ZK', '平面直角坐标系函数第一二三四象限两个数一点每唯的规则图像'), document.fonts.load('40px PH'), document.fonts.load('40px CV'), document.fonts.load('40px JB')]);
  ctx.font = '60px JB'; PREFW = ctx.measureText('pixi@grid:~$ ').width; BIGX = 960 - (PREFW + 64) / 2; CURX = BIGX + PREFW + 32;
  buildStatic(); buildHops();
  window.CUES = buildCues();
  window.render = render;
  window.renderFrame = i => render(i / FPS);
  window.READY = true;
  if (!navigator.webdriver) { // live preview when opened in a browser
    const t0 = performance.now(); const loop = () => { const t = ((performance.now() - t0) / 1000) % DUR; render(t); requestAnimationFrame(loop); }; loop();
  }
})();
