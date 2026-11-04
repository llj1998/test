'use strict';
/* 栩栩 · 场次 S01–S09：序、雨（2D 黑白粒子）、入梦 */
(() => {
const { TAU, clamp, lerp, ss, ease, hsl, PS, SH } = XU;
const SC = XU.SC = {};
const G = [.9, .92, .97];
const U = XU.U = {};

/* ---------- 共用 ---------- */
U.post2D = () => { const p = XU.post; p.bg = ['#141518', '#202125', '#202125', '#0e0f11']; p.hz = .5; p.bloom = .75; p.thresh = .22; p.grain = .045; p.vig = .75; p.sizeMul = 1.4; };
U.postDawn = () => { const p = XU.post; p.bg = ['#1e1634', '#9a5872', '#4a3040', '#120e16']; p.hz = .3; p.sun = [.8, .82, .1, 1.2]; p.sunCol = '#ffd9a8'; p.bloom = .95; p.thresh = .38; p.grain = .03; p.vig = .55; };
U.postNoon = (hz = .55) => { const p = XU.post; p.bg = ['#0f4fa8', '#7fc4f0', '#8fcf6a', '#2f6e2c']; p.hz = hz; p.sun = [.78, .86, .07, 1]; p.sunCol = '#fff6dc'; p.bloom = .85; p.thresh = .45; p.grain = .03; p.vig = .5; };
U.kr = (lt, a = 3, b = 40, d = 1.2) => lerp(a, b, ss(0, d, lt));
/* 点云发射：支持缩放、旋转、抖动（线条沸腾）、溶解（被风吹散）、显现（从尘埃聚拢）、裁切 */
U.cloud = (cl, o = {}) => {
  const x0 = o.x || 0, y0 = o.y || 0, z0 = o.z || 0, sx = o.sx ?? o.s ?? 1, sy = o.sy ?? o.s ?? 1, cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
  const col = o.col || G, cf = typeof col === 'function', a = o.a ?? 1.35, size = o.size ?? .028, occ = o.occ ?? 0, jit = o.jit || 0, bmin = o.bmin ?? .3, dis = o.dis || 0, w = o.wind || [.5, 1.3], clip = o.clip, sc = o.scat || 3;
  for (let i = 0; i < cl.n; i++) {
    const id = PS.i, rs = PS.RND[(id % PS.N) * 4 + 3], px = cl.X[i] * sx, py = cl.Y[i] * sy;
    let x = x0 + px * cr - py * sr, y = y0 + px * sr + py * cr, z = z0, al = a * (bmin + (1 - bmin) * cl.B[i]);
    if (jit) { x += SH.hj(id, 1) * jit; y += SH.hj(id, 2) * jit; }
    if (dis > 0) { const k = Math.max(0, dis * 1.6 - rs) * 2.5; if (k > 0) { x += k * w[0] + Math.sin(rs * 50 + k) * k * .5; y += k * w[1] + Math.cos(rs * 37) * k * .3; z += Math.sin(rs * 13) * k * .5; al *= Math.max(0, 1 - k * .45); } }
    if (o.rev) { const r = clamp(o.rev(i, cl.X[i], cl.Y[i], rs)); if (r < 1) { const k = 1 - r; x += Math.sin(rs * 91) * k * sc; y += Math.cos(rs * 57) * k * sc; z += Math.sin(rs * 23) * k * sc * .6; al *= r * r; } }
    if (clip && (x < clip[0] || x > clip[1] || y < clip[2] || y > clip[3])) al = 0;
    const c = cf ? col(x, y, cl.B[i]) : col;
    PS.put(x, y, z, c[0], c[1], c[2], al, size, occ);
  }
};
const MONT = ['clockF', 'keys', 'sheet', 'coffee', 'stamp', 'printer'];
U.cut = lt => { let d = .75, acc = 0, i = 0; while (acc + d <= lt && i < 80) { acc += d; d = Math.max(.16, d * .86); i++; } return { i, k: lt - acc, kind: MONT[i % 6] }; };
/* 表格格子 → 蝶翅鳞片：cs 格宽（世界单位），m 形变 0..1 */
U.scales = (cs, m, t, budget, al = 1) => {
  const cw = cs, ch = cs * lerp(.42, .62, m), cols = Math.ceil(8.6 / cw) + 1, rows = Math.ceil(5 / ch) + 1;
  const cells = (2 * cols + 2) * (2 * rows + 1), per = clamp(Math.floor(budget / cells), 8, 260), nOut = Math.ceil(per * (m > .15 ? .5 : 1)), nIn = per - nOut;
  for (let j = rows; j >= -rows; j--) {
    const off = (((j % 2) + 2) % 2) * cw * .5 * m, yT = j * ch + ch / 2, yB = j * ch - ch / 2, b = ch * .8 * m;
    for (let i = -cols - 1; i <= cols; i++) {
      const x0 = i * cw - cw / 2 + off;
      const hh = 186 + 24 * Math.sin(i * .7 + j * .45 + t * .9) + 12 * Math.sin(j * .3 - t * .6);
      const c = m > 0 ? hsl(hh, .8 * m, lerp(.86, .55, m)) : [.82, .83, .86];
      const lo = lerp(.75, 1.1, m);
      for (let k = 0; k < nOut; k++) {
        const u = (k + .5) / nOut; let x, y;
        if (u < .3) { x = x0 + u / .3 * cw; y = yT; }
        else if (u < .42) { x = x0 + cw; y = yT - (u - .3) / .12 * ch; }
        else if (u < .88) { const s = (u - .42) / .46; x = x0 + cw - s * cw; y = yB - b * Math.sin(Math.PI * s); }
        else { x = x0; y = yB + (u - .88) / .12 * ch; }
        PS.put(x, y, 0, c[0], c[1], c[2], al * lo, .028, 0);
      }
      for (let k = 0; k < nIn; k++) {
        const s = PS.RND[(PS.i % PS.N) * 4 + 1], v = PS.RND[(PS.i % PS.N) * 4 + 2], x = x0 + s * cw, yb = yB - b * Math.sin(Math.PI * s) * .9;
        const sh = .5 + .5 * Math.sin(t * 2.2 + i * 1.3 + j * .7 + s * 3);
        PS.put(x, lerp(yb, yT, v), 0, c[0] * (.6 + .5 * sh), c[1] * (.6 + .5 * sh), c[2] * (.6 + .5 * sh), al * m * (.25 + .45 * sh), .034, 0);
      }
    }
  }
};
U.twig = (a = 1) => {
  for (let i = 0; i < 520; i++) { const u = i / 520, x = lerp(-9.5, 9.5, u), y = 2.75 + (u - .5) * .5 - Math.sin(u * Math.PI) * .3 + ((i % 3) - 1) * .045; PS.put(x, y, 0, .33, .23, .15, a * .95, .075, 1); }
  for (const [x, y, r] of [[-5.2, 2.6, -.5], [3.6, 2.8, .4], [6.5, 2.95, -.3]]) for (let i = 0; i < 90; i++) { const u = i / 90, l = Math.sin(u * Math.PI) * .22, d = (i % 2 ? 1 : -1) * l * PS.RND[(PS.i % PS.N) * 4 + 1]; PS.put(x + Math.cos(r) * u * 1 - Math.sin(r) * d, y + Math.sin(r) * u * 1 + Math.cos(r) * d, 0, .4, .7, .3, a * .9, .05, .7); }
};
U.office = (t, o = {}) => {
  const night = o.night, sl = o.sleep || 0;
  U.cloud(SH.get('office'), { a: o.a ?? 1, jit: o.jit ?? .012, col: night ? (x, y) => (x > 1.8 && x < 5.4 && y > -.85 && y < 1.6) ? [.95, .95, .92] : [.42, .43, .47] : G });
  const ha = ((o.hour ?? 3) % 12 + (o.min ?? 0) / 60) / 12 * TAU, ma = (o.min ?? 0) / 60 * TAU;
  SH.line(0, 3.2, Math.sin(ha) * .32, 3.2 + Math.cos(ha) * .32, 14, { a: 1.2 }); SH.line(0, 3.2, Math.sin(ma) * .48, 3.2 + Math.cos(ma) * .48, 18, { a: 1.2 });
  if (!o.absent) {
    if (sl > .3) for (const sd of [-1, 1]) SH.disc(sd * .85, -1.72, .95, 150, { sq: .22, col: [.42, .42, .45], a: ss(.3, .7, sl) * .9 });
    U.cloud(SH.get('head'), { x: 0, y: lerp(.12, -1.33, sl), s: 1.22, rot: -sl * .35, a: night ? .85 : 1, jit: o.jit ?? .012 });
  }
  if (o.jjj) { const n = Math.min(48, Math.floor(o.jjj / 4)); for (let c = 0; c < 48; c++) for (let k = 0; k < 6; k++) PS.put(1.98 + (c % 6) * .57 + k * .075, 1.38 - Math.floor(c / 6) * .29, 0, 1, 1, 1, c < n ? 1.1 : 0, .03); }
  SH.rain(t, { x0: -5.6, x1: -2.05, y0: .2, y1: 3.48, n: 90, a: .38, len: .3, sp: 8, seed: 11 });
};

/* ---------- S01 序：一滴雨 ---------- */
SC.s01 = (lt, t) => {
  const p = XU.post; p.bg = ['#000', '#000', '#000', '#000']; p.bloom = 1; p.thresh = .25; p.grain = .05; p.vig = .3;
  PS.k = 1e6;
  const fall = clamp((lt - .5) / .95);
  for (let k = 0; k < 14; k++) { const q = clamp(fall - k * .012); PS.put(0, 5 - 5.2 * q * q, 0, 1, 1, 1, lt > .5 && lt < 1.45 ? 1.5 - k * .1 : 0, .07 - k * .003); }
  for (let r = 0; r < 5; r++) { const kk = lt - 1.4 - r * .4, on = kk > 0, rad = Math.max(.01, kk * 2.1); SH.circle(0, 0, rad, 260, { ry: rad * .26, a: on ? Math.max(0, .9 - kk * .14) : 0, size: .026, col: [.85, .9, 1] }); }
  if (lt > 2.2) {
    PS.k = 1.8; PS.swirl = .9;
    U.cloud(SH.get('title'), { col: [.94, .93, .9], a: 1.15, size: .03, rev: (i, x, y, rs) => ss(2.4 + rs * .4, 4.2 + rs * .8, lt), scat: 4, dis: ss(6.1, 7.9, lt), wind: [.2, 1.6] });
  }
  if (lt > 6.4) SH.rain(t, { n: 400, a: .25 * ss(6.4, 8, lt) });
};
/* ---------- S02 茧 ---------- */
SC.s02 = (lt, t) => {
  U.post2D(); PS.k = U.kr(lt);
  const alarm = lt > 1.5 && lt < 3.4;
  U.cloud(SH.get('bed'), { jit: alarm ? .045 : .012 });
  const k0 = PS.k; if (lt > 1.5 && lt < 2.2) PS.k = 5;
  U.cloud(SH.get(lt < 1.5 ? 'd0559' : 'd0600'), { x: 4.7, y: -.8, col: [1, 1, 1], a: alarm && Math.floor(lt * 4) % 2 ? .5 : 1.3, size: .03, jit: alarm ? .03 : .008 });
  PS.k = k0;
  const arm = ss(2.4, 3.3, lt);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 70; i++) { const u = i / 69 * arm, x = 3 + u * 1.35, y = -.85 + Math.sin(u * Math.PI) * .35 + (k - 1) * .06; PS.put(x, y, 0, .85, .85, .83, arm > 0 ? .9 : 0, .035); }
  if (alarm) for (const d of [0, Math.PI]) SH.circle(4.7, -.8, 1.1 + (lt * 1.4 % .35), 40, { ph: d - .5, a: .6, ry: .55 });
  SH.rain(t, { x0: -1.75, x1: 1.75, y0: .75, y1: 3.5, n: 80, a: .42, len: .32, sp: 9, seed: 5 });
};
/* ---------- S03 领带 ---------- */
SC.s03 = (lt, t) => {
  U.post2D(); PS.k = U.kr(lt);
  const z = 1 + lt * .03, j = lt > 2.8 && lt < 3.2 ? .05 : .012;
  U.cloud(SH.get('mir'), { s: z, jit: j });
  const ky = lerp(-2.65, -1.2, ss(.4, 2.6, lt)) * z;
  for (let k = -2; k <= 2; k++) SH.line(k * .045 * z, ky, k * .085 * z, -3.6 * z, 46, { col: [.03, .03, .035], a: 1, occ: 1, size: .07 });
  SH.disc(0, ky, .15 * z, 40, { col: [.03, .03, .035], occ: 1, size: .07 });
  SH.disc(0, ky - .42 * z, .38 * z, 170, { col: [.78, .78, .76], a: lt < 2.9 ? .85 : 0, sq: .62 });
  SH.rain(t, { x0: -2.2 * z, x1: -.35 * z, y0: 1 * z, y1: 3.25 * z, n: 40, a: .35, len: .28, sp: 8, seed: 8 });
};
/* ---------- S04 伞阵 ---------- */
SC.s04 = (lt, t) => {
  U.post2D(); PS.k = U.kr(lt, 3, 60);
  const z = 1 + lt * .035, um = SH.get('umb');
  U.cloud(SH.get('stripes'), { s: z, a: .8 });
  const stepOf = l => Math.floor(l / .5) + ss(0, .35, (((l % .5) + .5) % .5) / .5);
  for (let r = -1; r < 7; r++) for (let c = 0; c < 8; c++) {
    const him = r === 3 && c === 4, s = stepOf(him ? lt - .25 : lt);
    const y = 5.6 - (((r + 1) * 1.375 + s * .325) % 11), x = -5.2 + c * 1.475 + (r % 2 ? .37 : 0);
    U.cloud(um, { x: x * z, y: y * z, s: 1.1 * z, col: him ? [1, 1, 1] : [.62, .64, .68], a: him ? 1.35 : 1, jit: .008 });
  }
  SH.rain(t, { n: 1100, a: .3, ang: .06, len: .4, sp: 16, seed: 3 });
};
/* ---------- S05 挤出 ---------- */
SC.s05 = (lt, t) => {
  U.post2D(); PS.k = U.kr(lt, 3, 60);
  U.cloud(SH.get('subway'), { jit: .01 });
  const op = ss(1.2, 2, lt) * (1 - ss(3.9, 4.6, lt));
  const him = () => {
    let sx = 1, sy = 1, sc = 1.3, feet = -2.3;
    if (lt < 2.4) { const q = ss(1.4, 2.3, lt); sx = 1 - .32 * q; sy = 1 + .16 * q; }
    else { const k = lt - 2.4, pop = ss(0, .22, k), st = ss(.22, .9, k); sx = lerp(lerp(.68, 1.25, pop), 1, st); sy = lerp(lerp(1.16, .84, pop), 1, st); sc = 1.3 + pop * .45; feet = -2.3 - pop * 1.3; }
    U.cloud(SH.get('person'), { x: 0, y: feet + 1.84 * sc * sy, sx: sc * sx, sy: sc * sy, col: [.95, .95, .97], a: 1.2, jit: .01 });
  };
  if (lt < 2.4) him();
  for (const sd of [-1, 1]) {
    const cx = sd * (.875 + 1.75 * op);
    for (let gx = 0; gx < 16; gx++) for (let gy = 0; gy < 48; gy++) PS.put(cx - .8 + gx * .107, .375 - 2.6 + gy * .111, 0, .1, .1, .11, 1, .09, 1);
    SH.rect(cx, .375, 1.75, 5.35, 200, { a: .9 }); SH.rect(cx, 1.4, 1.1, 2.2, 110, { a: .6 });
  }
  if (lt >= 2.4) him();
};
/* ---------- S06 格子 ---------- */
SC.s06 = (lt, t) => {
  U.post2D();
  if (lt < 3.4) {
    PS.k = U.kr(lt, 3, 60);
    const z = Math.pow(3.4, ss(.3, 3.3, lt)), cs = 2;
    for (let gx = -4; gx <= 4; gx++) for (let gy = -3; gy <= 3; gy++) {
      const sx = (gx * cs - 2) * z, sy = (gy * cs) * z;
      SH.rect(sx, sy, (cs - .25) * z, (cs - .25) * z, Math.round(64 * Math.min(z, 3.4)), { a: .9, jit: .01 });
      SH.line(sx - .6 * z, sy + .55 * z, sx + .6 * z, sy + .55 * z, 14, { a: .45 });
      SH.disc(sx, sy - .15 * z, .22 * z, 26, { col: [.92, .92, .92], a: 1.1 });
    }
  } else {
    PS.k = U.kr(lt - 3.4, 3, 50);
    const k = 1 + ss(3.6, 7, lt) * .3, fx = -2.2, fy = 2.1;
    U.cloud(SH.get('desk'), { x: fx * (1 - k), y: fy * (1 - k), s: k, jit: .012 });
  }
};
/* ---------- S07 重复 ---------- */
SC.s07 = (lt, t) => {
  U.post2D();
  if (lt >= 6 && lt < 6 + 2 / 12) { PS.k = 1e6; U.scales(1.1, 1, t, 16000, 2.2); XU.post.bg = ['#03181c', '#06292f', '#06292f', '#021014']; XU.post.bloom = 1; return; }
  const { k, kind } = U.cut(lt);
  PS.k = lt > 6.1 && lt < 6.45 ? 1e6 : 16; PS.swirl = .6;
  U.cloud(SH.get(kind), { jit: kind === 'stamp' && k < .15 ? .08 : .015 });
  if (kind === 'clockF') { SH.line(0, 0, Math.sin(t * .2) * 1.7, Math.cos(t * .2) * 1.7, 34, { a: 1.3, size: .04 }); SH.line(0, 0, Math.sin(t * 2.4) * 2.5, Math.cos(t * 2.4) * 2.5, 50, { a: 1.3 }); }
  if (kind === 'coffee') for (let r = 0; r < 2; r++) SH.circle(0, 0, ((k * 1.2 + r * .5) % 1) * 2.2 + .05, 90, { a: .7 });
};
/* ---------- S08 下午三点 ---------- */
SC.s08 = (lt, t) => {
  U.post2D(); PS.k = U.kr(lt, 4, 60);
  let sl = 0; for (const [n, d] of [[1, .16], [2.1, .24], [3, .34]]) { const k = lt - n; if (k > 0 && k < .6) sl = Math.max(sl, Math.sin(k / .6 * Math.PI) * d); }
  if (lt > 4) sl = ss(4, 4.25, lt);
  U.office(t, { sleep: sl, jjj: lt > 4.3 ? (lt - 4.3) * 110 : 0 });
};
/* ---------- S09 入梦：格子 → 鳞片 → 蛹 ---------- */
SC.s09 = (lt, t) => {
  const p = XU.post;
  const m = ss(1.4, 4.6, lt < 2.5 ? Math.floor(lt * 12) / 12 : lt);
  p.bg = [0, 1, 2, 3].map(i => { const a = XU.hex(['#1c1d21', '#2a2b30', '#2a2b30', '#141518'][i]), b = XU.hex(['#021316', '#05252b', '#05252b', '#020c0e'][i]); return [lerp(a[0], b[0], m), lerp(a[1], b[1], m), lerp(a[2], b[2], m)]; });
  p.bloom = lerp(.55, 1, m); p.grain = lerp(.1, .03, m); p.vig = .7;
  if (lt < 6.2) {
    const q = lt < 2.5 ? Math.floor(lt * 12) / 12 : lt;
    PS.k = lt < .8 ? U.kr(lt, 4, 60, .8) : 1e6;
    U.scales(.5 * Math.exp(q * .4), m, q, XU.N > 30000 ? 17000 : 11000, 1 - ss(5.2, 6.2, lt));
  }
  if (lt > 5.2) {
    const a = ss(5.2, 6.4, lt), k = ease((lt - 5.2) / 4.8);
    const bgA = p.bg.map(c => typeof c === 'string' ? XU.hex(c) : c); U.postDawn(); // 渐变到黎明
    XU.cam = { eye: [0, lerp(1.2, 0, k), lerp(2.4, 10, k)], at: [0, lerp(1.2, 0, k), 0], up: [0, 1, 0], fov: XU.cam.fov };
    PS.k = U.kr(lt - 5.2, 6, 40, 1);
    U.twig(a); SH.chrys({ x: 0, y: 2.55, s: 1.3, t, a, dew: 1 });
    SH.motes({ n: 300, col: [1, .95, .85], a: .5 * a, r: 5, t, seed: 4 });
    if (a < 1) { const d = XU.post; d.bg = d.bg.map((c, i) => { const x = XU.hex(c), y = bgA[i]; return [lerp(y[0], x[0], a), lerp(y[1], x[1], a), lerp(y[2], x[2], a)]; }); d.sun[3] *= a; }
  }
};
})();
