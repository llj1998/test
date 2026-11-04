'use strict';
/* 栩栩 · 场次 S19–E3：觉、水洼翻转、字卡 */
(() => {
const { TAU, clamp, lerp, ss, ease, mulberry, PS, SH, U, SC } = XU;
const R1 = () => PS.RND[(PS.i % PS.N) * 4 + 1], R2 = () => PS.RND[(PS.i % PS.N) * 4 + 2];
const black = () => { const p = XU.post; p.bg = ['#000', '#000', '#000', '#000']; p.bloom = .9; p.thresh = .3; p.grain = .05; p.vig = .3; };

/* ---------- S19 鳞粉印 ---------- */
SC.s19 = (lt, t) => {
  XU.tick = Math.floor(t * 12); const tq = XU.tick / 12;
  U.post2D(); const p = XU.post; p.bg = ['#0c0c0e', '#16171a', '#16171a', '#09090a'];
  if (lt < 2.2) { PS.k = U.kr(lt, 4, 60); U.office(tq, { night: 1, sleep: 1 - ss(.6, 1.6, lt), hour: 11, min: 40 }); return; }
  const k = lt - 2.2;
  PS.k = U.kr(k, 4, 1e3, .8); p.bloom = .9; p.thresh = .3;
  const r = mulberry(61); for (let i = 0; i < 45; i++) PS.put(-8 + r() * 16, -4.5 + r() * 5.5, 0, .7, .7, .68, .16 + .14 * r(), .3 + r() * .45, 0);
  const r2 = mulberry(62); for (let i = 0; i < 170; i++) { const x = -8 + r2() * 16, y = -4.5 + r2() * 9; PS.put(x, y, 0, .8, .82, .86, .45 + .4 * r2(), .03 + r2() * .06, .2); }
  SH.rain(tq, { n: 500, a: .2, ang: .02, len: .8, sp: 10, seed: 64 });
  SH.dust({ x: 0, y: 1.1, s: 5.6, a: 1.25, drip: k * .9, step: 1, size: .032 });
  for (const x of [-4.4, 4.4]) SH.line(x, -4.7, x, 4.7, 120, { col: [.02, .02, .02], a: 1, occ: 1, size: .13 });
  const pr = ease(clamp((k - 2.3) / 2.2)), hx = .6, hy = lerp(-8, -1.1, pr), on = k > 2.3 ? 1 : 0;
  SH.disc(hx + .2, hy - 1.75, .78, 420, { col: [.7, .7, .68], a: .9 * on, sq: 1.25, occ: .9 });
  for (let w = -2; w <= 2; w++) SH.line(hx + w * .05, hy - 1, hx + w * .05, hy, 40, { col: [.5, .5, .49], a: .7 * on, occ: .9, size: .05 });
  SH.disc(hx, hy, .13, 40, { col: [.95, .95, .92], a: (pr > .98 ? 1.5 : .9) * on });
  for (let f = 0; f < 3; f++) SH.disc(hx + .38 + f * .28, hy - .95 - f * .06, .17, 40, { col: [.7, .7, .68], a: .85 * on, occ: .9 });
};
/* ---------- S20 不打伞 ---------- */
SC.s20 = (lt, t) => {
  U.post2D(); const p = XU.post; p.bg = ['#0e0e10', '#1b1c1f', '#1b1c1f', '#0b0b0c'];
  PS.k = U.kr(lt < 1.6 ? lt : lt - 1.6, 4, 60);
  if (lt < 1.6) {
    const open = 1 - ss(.5, 1.3, lt);
    for (let i = 0; i < 600; i++) PS.put(2.2 + R1() * 1.9 * Math.max(open, .02), -3.2 + R2() * 7, 0, .85, .85, .82, open > 0 ? .55 : 0, .05);
    SH.line(-1, -4, -1, 3.2, 160, { a: .8, size: .04 }); SH.line(-1.8, -4, -.2, -4, 40, { a: .7 }); SH.line(-1, 2.9, -.3, 2.4, 25, { a: .8 }); SH.line(-1, 2.9, -1.7, 2.4, 25, { a: .8 });
    SH.circle(-.15, 2.2, .18, 30, { a: .9 });
    for (let i = 0; i < 320; i++) { const u = R1(), v = R2(), yy = lerp(2, -1.6, u), wd = lerp(.3, .03, u); PS.put(-.15 + (v - .5) * wd * 2, yy, 0, .55, .56, .6, .85, .04, .5); }
    SH.line(-.15, -1.6, -.15, -2.1, 14, { a: .9 });
    return;
  }
  const k = lt - 1.6, r = mulberry(81);
  for (let b = 0; b < 11; b++) { const bx = -8.6 + b * 1.6, bh = 3 + r() * 3.5; SH.rect(bx + .7, -1.3 + bh / 2, 1.4, bh, 70, { a: .3, size: .025 }); for (let j = 0; j < 8; j++) { const lit = r() < .4; PS.put(bx + .2 + r() * 1, -1 + r() * bh * .9, 0, .85, .85, .78, lit ? .8 : 0, .055); } }
  SH.line(-9, -1.3, 9, -1.3, 200, { a: .45 });
  SH.line(2.2, -1.3, 2.2, 3.6, 90, { a: .7, size: .04 }); SH.line(1.8, 3.7, 2.6, 3.7, 20, { a: 1.2 });
  for (let i = 0; i < 700; i++) { const u = R1(), v = R2(), half = lerp(.15, 2.3, v); PS.put(2.2 + (u * 2 - 1) * half, lerp(3.6, -1.3, v) + Math.sin(t * 2 + i) * .02, 0, .9, .9, .86, .17 * (1 - v * .4), .035); }
  for (let i = 0; i < 200; i++) PS.put(2.2 + (R1() - .5) * .8, -1.4 - R2() * 2.6, 0, .8, .8, .78, .22, .03);
  for (let q = 0; q < 3; q++) {
    const x = 10 - ((k * (1.9 + q * .5) + q * 4.1) % 20), sc = 1 + q * .08, feet = -1.35 - q * .15;
    U.cloud(SH.get('personDim'), { x, y: feet + 1.84 * sc, s: sc, col: [.6, .62, .66], a: .9 });
    for (let i = 0; i < 160; i++) { const an = Math.PI * R1(), rr = .95 * sc * Math.sqrt(R2()); PS.put(x + Math.cos(an) * rr, feet + 3.95 * sc + Math.sin(an) * rr * .55, 0, .28, .28, .31, .95, .065, 1); }
  }
  const px = lerp(-4.5, 1.6, ss(0, 3.2, k)), bob = k < 3.2 ? Math.abs(Math.sin(k * 5)) * .05 : 0, look = ss(3.5, 4.3, k);
  U.cloud(SH.get('person'), { x: px, y: -1.35 + 1.84 * 1.3 + bob + look * .06, s: 1.3, col: [.95, .95, .97], a: 1.2, jit: .01 });
  SH.rain(t, { n: 1200, a: .3, ang: .12, len: .5, sp: 14, seed: 88 });
  SH.rain(t, { x0: .4, x1: 4, y0: -1.3, y1: 3.6, n: 220, a: .6, seed: 89 });
};
/* ---------- S21 / S22 水洼与镜像翻转 ---------- */
function mirror(t, roll) {
  XU.cam2D(roll); const p = XU.post, tq = Math.floor(t * 12) / 12; XU.tick = Math.floor(t * 12);
  p.bg = ['#141416', '#1e1f22', '#1e1f22', '#141416']; p.split = 1; p.sdir = [Math.sin(roll), -Math.cos(roll)]; p.soff = 0; p.sbg = ['#8fcff2', '#1b56ad'];
  p.bloom = .9; p.thresh = .42; p.grain = .06; p.vig = .6;
  const wx = 2.6, wy = -2.7, sx = wx * Math.cos(roll) - wy * Math.sin(roll), sy = wx * Math.sin(roll) + wy * Math.cos(roll);
  p.sun = [.5 + sx / 16, .5 + sy / 9, .08, .9]; p.sunCol = '#fff6dc';
  U.cloud(SH.get('person'), { x: 0, y: 1.84 * 1.05, s: 1.05, col: [.93, .93, .96], a: 1.2, jit: .01 });
  SH.line(-4, 0, -4, 6, 120, { a: .6, size: .04 });
  for (let i = 0; i < 40; i++) PS.put(-4 + (R1() - .5) * 1.2, 4.6 + (R2() - .5) * .8, 0, .9, .9, .86, .15, .4 + R1() * .4, 0);
  SH.rain(tq, { x0: -10, x1: 10, y0: .05, y1: 10, n: 700, a: .3, seed: 91 });
  const r = mulberry(93);
  for (let c = 0; c < 6; c++) { const cx = -7 + c * 2.8 + Math.sin(t * .1 + c) * .3, cy = -3.2 - r() * 1.2; for (let i = 0; i < 110; i++) { const a = R1() * TAU, d = Math.sqrt(R2()), w = .9 + r() * .2; PS.put(cx + Math.cos(a) * d * 1.1 * w + (i % 3 - 1) * .35, cy + Math.sin(a) * d * .35, 0, 1, 1, 1, .45, .09, .3); } }
  SH.bfly({ x: Math.sin(t * .9) * .25, y: -2.2 + Math.sin(t * 1.3) * .12, z: 0, s: 2.1, flap: Math.abs(Math.sin(t * Math.PI * 1.5)) * 1.25, roll: Math.PI, ph: t });
  SH.motes({ n: 200, col: [1, .95, .7], a: .6, r: 4, cy: -2.6, cz: 2, t, seed: 94 });
  SH.line(-10, 0, 10, 0, 420, { col: [1, 1, 1], a: 1, size: .03 });
  for (let i = 0; i < 6; i++) { const ph = (t * .6 + i / 6) % 1, rad = .2 + ph * .9; SH.circle(-6 + i * 2.4, 0, rad, 40, { ry: rad * .14, a: .6 * (1 - ph) }); }
}
SC.s21 = (lt, t) => {
  if (lt < 2) {
    U.post2D(); XU.tick = Math.floor(t * 12); const tq = XU.tick / 12, p = XU.post; p.bg = ['#18181a', '#202124', '#202124', '#141416']; p.bloom = .85;
    PS.k = U.kr(lt, 4, 1e3, .6);
    const r = mulberry(23); for (let i = 0; i < 700; i++) PS.put(-8 + r() * 16, -4.5 + r() * 9, 0, .5, .5, .5, .25, .03);
    const rad = th => 3.3 * (1 + .12 * Math.sin(3 * th) + .08 * Math.cos(5 * th));
    for (let i = 0; i < 2600; i++) { const th = R1() * TAU, d = Math.sqrt(R2()) * rad(th) * .97, x = Math.cos(th) * d, y = Math.sin(th) * d * .58 + .3, v = (y + 1.6) / 3.8; PS.put(x, y, 0, lerp(.75, .12, v), lerp(.9, .45, v), lerp(1, .9, v), .55, .05, .9); }
    for (let i = 0; i < 360; i++) { const th = i / 360 * TAU; PS.put(Math.cos(th) * rad(th), Math.sin(th) * rad(th) * .58 + .3, 0, .85, .85, .85, 1, .03); }
    SH.bfly({ x: Math.sin(t) * .3, y: .5, z: .2, s: 1.6, flap: Math.abs(Math.sin(t * Math.PI * 1.5)) * 1.2, ph: t });
    for (const sx of [-.65, .65]) SH.disc(sx, -3.9, .45, 120, { sq: .55, col: [.12, .12, .13], occ: 1, size: .07 });
    const r3 = mulberry(24); for (let i = 0; i < 10; i++) { const x = -7 + r3() * 14, y = -4 + r3() * 8, ph = (tq * 1.5 + r3()) % 1; SH.circle(x, y, .1 + ph * .5, 30, { ry: (.1 + ph * .5) * .6, a: .5 * (1 - ph) }); }
    return;
  }
  PS.k = U.kr(lt - 2, 4, 1e3, .5);
  mirror(t, ease(clamp((lt - 2.6) / 4)) * Math.PI);
};
SC.s22 = (lt, t) => {
  PS.k = 1e6;
  mirror(t, Math.PI);
  const q = clamp(lt / .5); PS.put(0, -6 + 6 * q * q, .5, 1, 1, 1, lt < .5 ? 1.6 : 0, .09);
  for (let i = 0; i < 7; i++) { const kk = lt - .5 - i * .16, on = kk > 0, rad = Math.max(.01, kk * 6); SH.circle(0, 0, rad, 220, { col: i % 2 ? [.1, .9, .78] : [.95, .95, .92], a: on ? Math.max(0, 1 - kk * .55) : 0, size: .035 }); }
  const p = XU.post, wa = ss(1.3, 2, lt) * (1 - ss(2.1, 2.6, lt)), ba = ss(2.1, 2.8, lt);
  if (ba > 0) { p.fade = ba; p.fadeCol = '#000000'; } else { p.fade = wa; p.fadeCol = '#ffffff'; }
};
/* ---------- 片尾 ---------- */
SC.e1 = (lt, t) => {
  black(); PS.k = 2.6; PS.swirl = .8;
  U.cloud(SH.get('text1'), { col: [.95, .94, .9], a: 1.25, size: .026, scat: 2.5, dis: ss(6.1, 7, lt), wind: [.3, 1.4], rev: (i, x, y, rs) => {
    const line = y > 0 ? 0 : y > -1.6 ? 1 : 2, ts = line === 0 ? .3 + (x + 5.5) / 1.1 * .22 : line === 1 ? 2.5 + (x + 4.4) / 1.1 * .22 : 4.6;
    return ss(ts + rs * .2, ts + .7 + rs * .3, lt);
  } });
};
SC.e2 = (lt, t) => {
  black(); PS.k = 2.6; PS.swirl = .6;
  U.cloud(SH.get('credits'), { col: [.92, .92, .9], a: 1.1, size: .026, scat: 2.5, dis: ss(4.9, 5.9, lt), rev: (i, x, y, rs) => ss(.2 + (2 - y) * .2 + rs * .3, .9 + (2 - y) * .2 + rs * .4, lt) });
  SH.disc(0, -3, .07, 24, { col: [.1, .9, .78], a: ss(1.5, 2.2, lt) * (1 - ss(4.9, 5.6, lt)) * 1.5, size: .04 });
};
SC.e3 = (lt, t) => {
  U.post2D(); PS.k = U.kr(lt, 5, 60, .6);
  U.cloud(SH.get('frameEmpty'), { s: 1 + lt * .03, jit: .012 });
  XU.post.fade = ss(1.5, 2, lt);
};
})();
