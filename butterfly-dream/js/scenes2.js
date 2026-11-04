'use strict';
/* 栩栩 · 场次 S10–S18：晴（3D 彩色粒子）与交织 */
(() => {
const { TAU, clamp, lerp, ss, ease, hsl, mulberry, PS, SH, U, SC } = XU;
const G = [.8, .82, .86];
const HALF = Math.PI / 2;
const cam3 = (eye, at, fov = .95) => { XU.cam = { eye, at, up: [0, 1, 0], fov }; };
const dew = (x, y, n, a) => { for (let i = 0; i < n; i++) { const r = PS.RND[(PS.i % PS.N) * 4 + 1]; PS.put(x + Math.sin(i * 2.7) * .22, y - .3 - i * .3, .32, .95, 1, 1, a * (1 + r), .09, .3); } };
const flowerGrid = (t, a = 1) => {
  const pal = [[1, .32, .2], [1, .82, .2], [.95, .25, .58], [.55, .42, 1], [1, .97, .9], [1, .6, .12], [1, .5, .72], [.35, .78, 1]];
  for (let r = -1; r < 7; r++) for (let c = 0; c < 8; c++) {
    const i = (r + 1) * 8 + c, ph = i * 1.37, z = 1.06;
    const x = (-5.2 + c * 1.475 + (r % 2 ? .37 : 0) + Math.sin(t * 1.3 + ph) * .09) * z, y = (5.6 - ((r + 1) * 1.375) % 11 + Math.cos(t * 1.1 + ph * 1.7) * .09) * z, col = pal[i % 8];
    for (let p = 0; p < 8; p++) { const an = p / 8 * TAU + Math.sin(t * .8 + ph) * .3; for (let k = 0; k < 22; k++) { const u = PS.RND[(PS.i % PS.N) * 4 + 1], v = PS.RND[(PS.i % PS.N) * 4 + 2] * 2 - 1, w = Math.sin(u * Math.PI) * .15 * v; PS.put(x + Math.cos(an) * (.08 + u * .5) - Math.sin(an) * w, y + Math.sin(an) * (.08 + u * .5) + Math.cos(an) * w, 0, col[0], col[1], col[2], a * (1.3 - u * .5), .06, .55); } }
    SH.disc(x, y, .14, 12, { col: [1, .85, .35], a: a * 1.3, size: .05, occ: .4 });
  }
};
const petals = (t, n, box, a = .9) => {
  const r = mulberry(66), pal = [[1, .35, .25], [1, .82, .25], [.95, .3, .6], [1, 1, 1], [1, .6, .15]], k0 = PS.k; PS.k = 1e6;
  for (let i = 0; i < n; i++) { const sp = .3 + r() * .5, x = ((r() * box[0] - t * sp * .7) % box[0] + box[0]) % box[0] - box[0] / 2, y = box[1] / 2 - ((r() * box[1] + t * sp) % box[1]), z = (r() - .5) * box[2], c = pal[i % 5]; PS.put(x, y, z, c[0], c[1], c[2], a * (.5 + .5 * Math.sin(t * 3 + i)), .06, .4); }
  PS.k = k0;
};
const blades = (t, n, col, sway = 1) => {
  const r = mulberry(17);
  for (let b = 0; b < n; b++) { const x = (r() * 2 - 1) * 9, h = 1.2 + r() * 2.6, lean = (r() - .5) * 1.2 + Math.sin(t * 1.1 + b) * .15 * sway; for (let k = 0; k < 40; k++) { const u = k / 39; PS.put(x + lean * u * u, -4.7 + h * u, 0, col[0], col[1], col[2], 1, .1 * (1.2 - u * .7), 1); } }
};

/* ---------- S10 破蛹 ---------- */
SC.s10 = (lt, t) => {
  U.postDawn(); const p = XU.post; p.sun = [.8, .82, lerp(.08, .15, ss(0, 9, lt)), lerp(.8, 1.3, ss(0, 9, lt))];
  cam3([Math.sin(t * .3) * .15, Math.sin(t * .4) * .08, 10], [0, 0, 0], XU.cam.fov);
  PS.k = U.kr(lt, 8, 45, 1);
  U.twig();
  const crack = ss(1.8, 2.4, lt), out = ss(2.4, 4.2, lt);
  SH.chrys({ x: 0, y: 2.55, s: 1.3, t, crack, empty: out > .5 ? 1 : 0, sway: lt > 1 && lt < 2.4 ? Math.sin(lt * 18) * .03 : 0 });
  dew(0, 2.4, 5, lt < 7.5 && out < .5 ? 1 : 0);
  const u = ss(4.2, 10.4, lt);
  SH.bfly({ x: 0, y: lerp(1, -.35, out), z: .15, s: lerp(.9, 3.4, u) * lerp(.4, 1, out), flap: lerp(1.25, .1, u), fade: (1 - u) * .75, ph: t * .6, a: out });
  if (lt > 7.5) { const k = lt - 7.5, y = -.4 - k * .6 - k * k * .2; PS.k = 1e6; PS.put(.45, y, .3, 1, 1, 1, 1.6, .1, .2); for (let c = 0; c < 7; c++) { const h = hsl(c * 50, 1, .6), an = -1 + c * .18; PS.put(.45 + Math.cos(an) * .18, y + Math.sin(an) * .18, .3, h[0], h[1], h[2], .9, .05, 0); } }
  else { PS.k = 1e6; for (let c = 0; c < 8; c++) PS.put(0, 0, 0, 0, 0, 0, 0, .05); }
  PS.k = 30; SH.motes({ n: 500, col: [1, .9, .7], a: .55, r: 6, t, rise: .15, seed: 5 });
};
/* ---------- S11 初飞 ---------- */
SC.s11 = (lt, t) => {
  if (lt < 6) {
    U.postNoon(.56);
    const camZ = lt * 5.5, ex = Math.sin(lt * .7) * .3;
    cam3([ex, -.35, -camZ], [ex * .7, -.5, -camZ - 10]);
    PS.k = U.kr(lt, 6, 1e3, .7);
    SH.field({ camZ, gy: -1.2, t });
    const wob = 1 - ss(0, 3, lt);
    const bx = ex + Math.sin(lt * 1.7) * .9 * (.5 + .5 * wob) + Math.sin(lt * 9) * .2 * wob, by = -.55 + Math.sin(lt * 2.3) * .2 + Math.sin(lt * 11) * .12 * wob;
    SH.bfly({ x: bx, y: by, z: -camZ - 3.2, s: 1.15, flap: Math.abs(Math.sin(lt * Math.PI * (3 + 1.4 * wob))) * 1.25, pitch: -1.2, yaw: Math.sin(lt * 1.7) * .3, roll: Math.sin(lt * 7) * .35 * wob, ph: t });
    SH.motes({ n: 600, col: [1, .95, .7], a: .7, r: 12, cz: -12, cy: -.3, t, seed: 6, size: .03 });
    const p = XU.post; p.focus = 3.4; p.dof = 1.3;
  } else {
    const k = lt - 6, p = XU.post; p.bg = ['#2b7a35', '#46a04a', '#46a04a', '#256a2c']; p.bloom = .9; p.thresh = .45; p.grain = .03; p.vig = .55;
    PS.k = U.kr(k, 6, 1e3, .5);
    flowerGrid(t);
    SH.bfly({ x: Math.sin(k * 2) * 1.1, y: -5.5 + k * 3.1, z: .5, s: 1.5, flap: Math.abs(Math.sin(k * Math.PI * 3.6)) * 1.3, roll: Math.sin(k * 2) * .3, ph: t });
  }
};
/* ---------- S12 相遇 ---------- */
SC.s12 = (lt, t) => {
  const p = XU.post; p.bg = ['#06286a', '#3f95dc', '#3f95dc', '#3f95dc']; p.hz = .02; p.sun = [.5, .8, .1, 1.3]; p.sunCol = '#fff6d8'; p.bloom = 1; p.thresh = .45; p.grain = .03; p.vig = .45; p.focus = 10; p.dof = .7;
  cam3([0, lt * .15, 10], [0, lt * .25, 0], XU.cam.fov);
  PS.k = U.kr(lt, 6, 1e3, .7);
  const a = lt * 2.4;
  for (const [ph, hue] of [[0, 0], [Math.PI, -38]]) { const an = a + ph; SH.bfly({ x: Math.cos(an) * 1.9, y: -2.2 + lt * .48, z: Math.sin(an) * 1.9, s: 1.5, flap: Math.abs(Math.sin(t * Math.PI * 3.2 + ph)) * 1.3, pitch: -.9, yaw: -an, ph: t + ph, hue }); }
  petals(t, 420, [18, 11, 8]);
  SH.motes({ n: 500, col: [1, .95, .75], a: .6, r: 6, cz: 4, t, rise: .2, seed: 7 });
};
/* ---------- S13 午憩 · 闪回 ---------- */
const FLASHES = XU.FLASHES = [[2.2, 3 / 24], [3.0, 5 / 24], [3.8, 8 / 24], [4.6, 12 / 24]];
XU.inFlash = lt => { for (let i = 0; i < FLASHES.length; i++) { const [s, d] = FLASHES[i]; if (lt >= s && lt < s + d) return i; } return -1; };
SC.s13 = (lt, t) => {
  const fi = XU.inFlash(lt);
  if (fi >= 0) {
    U.post2D(); XU.tick = Math.floor(t * 12); PS.k = 1e6;
    if (fi === 0) U.cloud(SH.get('keys'), { jit: .02 });
    else if (fi === 1) { U.cloud(SH.get('clockF'), { jit: .02 }); SH.line(0, 0, Math.sin(t * 2.4) * 2.5, Math.cos(t * 2.4) * 2.5, 50, { a: 1.3 }); }
    else if (fi === 2) { for (let r = -1; r < 7; r++) for (let c = 0; c < 8; c++) U.cloud(SH.get('umb'), { x: -5.2 + c * 1.475 + (r % 2 ? .37 : 0), y: 5.6 - (r + 1) * 1.375, s: 1.1, col: [.62, .64, .68], jit: .02 }); }
    else U.cloud(SH.get('face'), { s: 1.1, jit: .02 });
    SH.rain(t, { n: 700, a: .32, seed: 13 });
    return;
  }
  const p = XU.post; p.bg = ['#6fae4a', '#b8e090', '#b8e090', '#2f6a2a']; p.hz = .45; p.sun = [.22, .86, .14, .9]; p.sunCol = '#fff2c8'; p.bloom = .9; p.thresh = .45; p.grain = .03; p.vig = .5; p.focus = 6.2; p.dof = 1.6;
  cam3([0, .7, 6], [0, -.6, 0]);
  PS.k = lt < .6 ? U.kr(lt, 6, 1e3, .6) : 1e6;
  for (let k = 0; k < 10; k++) { const an = k / 10 * TAU + Math.sin(t * .6) * .03; for (let i = 0; i < 230; i++) { const u = PS.RND[(PS.i % PS.N) * 4 + 1], w = (PS.RND[(PS.i % PS.N) * 4 + 2] - .5) * Math.sin(u * Math.PI) * .6, d = .35 + u * 2.1, y = -1.55 + u * u * .35; const c = [1, lerp(.62, .3, u), lerp(.25, .45, u)]; PS.put(Math.cos(an) * d - Math.sin(an) * w, y, Math.sin(an) * d + Math.cos(an) * w, c[0], c[1], c[2], 1.2, .075, .85); } }
  SH.disc(0, -1.5, .45, 260, { col: [1, .8, .2], a: 1.1, size: .05, occ: .7 });
  SH.motes({ n: 350, col: [1, 1, .8], a: .6, r: 5, cz: 2, t, seed: 8, size: .05 });
  if (lt < 1.6) { const ld = ss(0, 1.2, lt); SH.bfly({ x: lerp(2.6, 0, ld), y: lerp(2.2, -1.05, ld), z: lerp(-1, 0, ld), s: 2.3, flap: Math.abs(Math.cos(lt * Math.PI * (6 - 3.6 * ld))) * 1.2, pitch: lerp(-.4, -1.1, ld), ph: t }); }
  else if (lt < 5.3) SH.bfly({ x: 0, y: -1.1, z: 0, s: 2.6, flap: 1.44, pitch: -HALF, yaw: -HALF, under: 1, ph: t, roll: Math.sin(lt * 1.5) * .02 });
  else { const k = lt - 5.3, lift = ss(.35, 1.7, k); SH.bfly({ x: lerp(0, 3.2, lift), y: lerp(-1.05, 2.8, lift), z: lerp(0, -2, lift), s: 2.5, flap: k < .15 ? lerp(1.44, .1, k / .15) : Math.abs(Math.sin(k * Math.PI * 7)) * 1.2, pitch: lerp(-.5, -1.1, lift), under: 1 - ss(0, .12, k), ph: t }); if (k < .25) p.fade = .35 * (1 - k / .25), p.fadeCol = '#ffffff'; }
};
/* ---------- S14 窗 ---------- */
SC.s14 = (lt, t) => {
  U.postNoon(.56); const p = XU.post; p.sun = [.2, .86, .07, 1];
  const pr = ease(clamp(lt / 9.2)), camZ = pr * 21.5, sh = lt > 9.2 && lt < 9.6 ? (1 - (lt - 9.2) / .4) * .06 : 0;
  cam3([Math.sin(t * 190) * sh, -.25 + Math.cos(t * 170) * sh, -camZ], [0, -.3, -camZ - 10]);
  PS.k = U.kr(lt, 6, 1e3, .7);
  SH.field({ camZ, gy: -1.2, t });
  const WZ = -26, k0 = PS.k;
  U.cloud(SH.get('office'), { x: 0, y: .5, z: WZ, s: .38, clip: [-1.28, 1.28, -1.18, 2.18], a: .95, size: .014, jit: .004 });
  SH.rect(0, .5, 2.6, 3.4, 460, { z: WZ, col: [1, .97, .9], a: 1.3, size: .05, occ: .8 });
  SH.line(0, -1.2, 0, 2.2, 90, { z: WZ, col: [1, .97, .9], a: 1.1, size: .04, occ: .8 }); SH.line(-1.3, .9, 1.3, .9, 70, { z: WZ, col: [1, .97, .9], a: 1.1, size: .04, occ: .8 });
  for (let i = 0; i < 260; i++) { const u = PS.RND[(PS.i % PS.N) * 4 + 1], v = PS.RND[(PS.i % PS.N) * 4 + 2], x = -1.25 + u * 2.5, y = -1.15 + v * 3.3, streak = Math.abs((x + 1.2) * 1.3 - (y + 1.1) * .5 - .4) < .25; PS.put(x, y, WZ + .02, .7, .88, 1, streak ? .9 : .18, streak ? .03 : .05, 0); }
  PS.k = k0;
  if (lt < 9.2) { const bz = -camZ - lerp(3, 4.4, ss(5, 9.2, lt)); SH.bfly({ x: Math.sin(lt * 1.4) * .7 * (1 - pr), y: -.45 + pr * 1.05 + Math.sin(lt * 3) * .12, z: bz, s: .95, flap: Math.abs(Math.sin(lt * Math.PI * (3 + pr * 2))) * 1.25, pitch: -1.2, yaw: Math.sin(lt * 1.4) * .25, ph: t }); }
  else { SH.bfly({ x: 0, y: .62, z: WZ + .06, s: .95, flap: .05, ph: t }); p.fade = Math.max(0, .85 - (lt - 9.2) * 3); p.fadeCol = '#ffffff'; }
  p.focus = 3.6; p.dof = .9;
};
/* ---------- S15 隔着玻璃 ---------- */
SC.s15 = (lt, t) => {
  XU.tick = Math.floor(t * 12); const tq = XU.tick / 12;
  if (lt < 4.5) {
    U.post2D(); PS.k = U.kr(lt, 5, 1e3, .8);
    U.office(tq, { sleep: 1 });
    const slide = ss(1, 4.5, lt) * 1.25;
    SH.dust({ x: 0, y: 1.25, s: 5.2, a: ss(1, 2.2, lt) * 1.1, step: 2, size: .035 });
    SH.bfly({ x: 0, y: 1.25 - slide, z: .5, s: 5.2, flap: .06 + ss(1, 4.2, lt) * .25, roll: .04 * slide, ph: t });
    return;
  }
  const k = lt - 4.5, p = XU.post;
  p.bg = ['#5fb4ee', '#cdeec0', '#cdeec0', '#3f8a3a']; p.hz = .42; p.split = 1; p.sdir = [1, 0]; p.soff = 0; p.sbg = ['#2a2b30', '#17181b']; p.bloom = .8; p.thresh = .45; p.grain = .06; p.vig = .6; p.sun = [.12, .85, .1, .7];
  PS.k = U.kr(k, 5, 1e3, .6);
  const r = mulberry(41); for (let i = 0; i < 70; i++) { const x = -8.6 + r() * 8.2, y = (r() - .5) * 8.5, c = hsl(40 + r() * 120, .8, .75); PS.put(x, y, 0, c[0], c[1], c[2], .14 + .12 * Math.sin(t + i), .5 + r() * .6, 0); }
  SH.bfly({ x: -1.25, y: -.25 + k * .04, z: 0, s: 3.1, flap: 1.44, pitch: -HALF, yaw: -HALF, under: 1, ph: t });
  U.cloud(SH.get('profile'), { x: 4, y: 0, jit: .012 });
  SH.rain(tq, { x0: 0, x1: 9, n: 450, a: .3, seed: 31 });
  SH.line(0, -4.7, 0, 4.7, 300, { col: [1, 1, 1], a: 1.3, size: .03 });
};
/* ---------- S16 黄昏 ---------- */
SC.s16 = (lt, t) => {
  const p = XU.post; p.bg = ['#1c1240', '#b8445f', '#5a2236', '#120a14']; p.hz = .24; p.sun = [.62, .3, .06, 1.6]; p.sunCol = '#ffcf8a'; p.bloom = 1; p.thresh = .4; p.grain = .04; p.vig = .65; p.focus = 10; p.dof = .5;
  cam3([0, 0, 10], [0, 0, 0], XU.cam.fov);
  PS.k = U.kr(lt, 5, 1e3, .8);
  blades(t, 60, [.07, .04, .09]);
  for (let i = 0; i < 300; i++) { const u = (i % 60) / 59, w = (Math.floor(i / 60) / 4 - .5) * .7 * Math.sin(u * Math.PI); const x = -3.9 + u * 3.2, y = -1.25 + u * .38 + w; PS.put(x, y, 0, .1, .15, .07, 1, .07, 1); }
  for (let i = 0; i < 80; i++) { const u = i / 79; PS.put(-3.9 + u * 3.2, -1.25 + u * .38 + .35 * Math.sin(u * Math.PI) + .02, 0, 1, .62, .35, .9, .035, 0); }
  for (let e = 0; e < 4; e++) PS.put(-3.1 + e * .28, -1.05 + (e % 2) * .08, .05, 1, .96, .86, lt > 1.3 + e * .9 ? 1.5 : 0, .11, .5);
  if (lt < 5.5) SH.bfly({ x: -1.5, y: -.45, z: 0, s: 2.4, flap: 1.44, pitch: -HALF, yaw: -HALF, under: 1, fade: .45, tatter: 1, ph: t });
  else { const k = lt - 5.5, pr = ease(k / 6.5); SH.bfly({ x: lerp(-1.5, 2.8, pr), y: lerp(-.45, -3, pr) + Math.sin(pr * Math.PI) * 1.6, z: lerp(0, -12, pr), s: 2.4, flap: Math.abs(Math.sin(k * Math.PI * 2.4)) * 1.2, pitch: -1.1, yaw: .9, fade: .5 + pr * .3, tatter: 1, ph: t }); }
  SH.motes({ n: 400, col: [1, .7, .4], a: .5, r: 6, t, rise: .3, seed: 9 });
};
/* ---------- S17 合翅 ---------- */
SC.s17 = (lt, t) => {
  const dark = ss(4.2, 7.6, lt), p = XU.post, mixB = (c, k) => { const v = XU.hex(c); return [v[0] * (1 - k), v[1] * (1 - k), v[2] * (1 - k)]; };
  p.bg = ['#1c1240', '#b8445f', '#5a2236', '#120a14'].map(c => mixB(c, .35 + .65 * dark)); p.hz = .24; p.sun = [.62, .18, .1, 1.2 * (1 - dark)]; p.sunCol = '#ff9a60'; p.bloom = 1; p.thresh = .35; p.grain = .05; p.vig = .7;
  p.fade = ss(6.6, 8, lt);
  cam3([0, 0, 10], [0, 0, 0], XU.cam.fov);
  PS.k = U.kr(lt, 5, 1e3, .8);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 70; i++) { const u = i / 69; PS.put(-1.4 + 1.4 * u + (k - 1) * .05, -4.7 + 3.2 * Math.sqrt(u), 0, .1, .12, .06, 1 - dark, .07, 1); }
  const base = ease(clamp((lt - .5) / 5.5)), breath = Math.max(0, Math.sin(lt * 2.4)) * .25 * (1 - base);
  SH.bfly({ x: 0, y: -.1, z: 0, s: 6, flap: clamp(base * 1.45 - breath, 0, 1.45), tatter: 1, fade: .6, ph: t * .3, dis: ss(4.6, 7.8, lt), wind: [.5, 1.1], a: 1 - dark * .3 });
  SH.motes({ n: 300, col: [1, .55, .3], a: .5 * (1 - dark), r: 6, t, rise: .35, seed: 10 });
};
/* ---------- S18 铃 ---------- */
SC.s18 = (lt, t) => {
  const p = XU.post; p.bg = ['#000', '#000', '#000', '#000']; p.bloom = .9; p.grain = .06; p.vig = .3;
  PS.k = 1e6; PS.drift = [0, .03, 0];
  const on = lt > .8 && Math.floor(lt * 3) % 2 === 0 ? 1 : .12;
  SH.rect(1.1, -3.2, .55, 1, 120, { col: [.9, .9, .88], a: on * 1.2, size: .03 });
  for (let i = 0; i < 112; i++) PS.put(.9 + (i % 8) * .057, -3.62 + Math.floor(i / 8) * .06, 0, .9, .9, .88, on * .5, .03);
};
})();
