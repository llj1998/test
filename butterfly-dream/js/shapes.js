'use strict';
/* 栩栩 · 形状库：把剪影 / 文字采样成点云，以及 3D 蝴蝶、蛹、花海、光尘 */
(() => {
const { TAU, clamp, lerp, mulberry, PS } = XU;
const SH = XU.SH = {};
XU.tick = 0;
const hj = (i, k) => { const v = Math.sin(i * 12.9898 + XU.tick * 78.233 + k * 37.719) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
SH.hj = hj;
const SERIF = '"Noto Serif SC","Songti SC","STSong","SimSun",serif';

/* ---------- 采样器：画布亮度 = 粒子密度，R=亮度 G=标记 ---------- */
function sample(cw, chh, ww, n, draw, seed = 1, origin = null) {
  const c = document.createElement('canvas'); c.width = cw; c.height = chh;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, cw, chh);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g, cw, chh);
  const d = g.getImageData(0, 0, cw, chh).data, idx = [], cum = []; let tot = 0;
  for (let p = 0; p < cw * chh; p++) { const v = d[p * 4] / 255; if (v > .04) { tot += v; idx.push(p); cum.push(tot); } }
  const r = mulberry(seed), X = new Float32Array(n), Y = new Float32Array(n), B = new Float32Array(n), G = new Float32Array(n);
  const sc = ww / cw, ox = origin ? origin[0] : cw / 2, oy = origin ? origin[1] : chh / 2;
  for (let i = 0; i < n; i++) {
    if (!tot) { X[i] = (r() - .5) * ww; Y[i] = (r() - .5) * ww * chh / cw; continue; }
    const u = r() * tot; let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < u) lo = m + 1; else hi = m; }
    const p = idx[lo], px = p % cw, py = (p / cw) | 0;
    X[i] = (px + r() - ox) * sc; Y[i] = -(py + r() - oy) * sc; B[i] = d[p * 4] / 255; G[i] = d[p * 4 + 1] / 255;
  }
  return { n, X, Y, B, G };
}
const gc = v => `rgb(${v},${v},${v})`;
function frameRect(g, x, y, w, h, v, lw) { g.strokeStyle = gc(v); g.lineWidth = lw; g.strokeRect(x, y, w, h); }
function wingPath(g, k, ox, oy, mirror = 1) { // 原始翅膀坐标（单位≈翼展 1/100），k=缩放
  const X = x => ox + mirror * x * k, Y = y => oy + y * k;
  const fw = new Path2D(); fw.moveTo(X(2), Y(-4)); fw.bezierCurveTo(X(12), Y(-28), X(32), Y(-46), X(50), Y(-42)); fw.bezierCurveTo(X(54), Y(-32), X(48), Y(-14), X(40), Y(-3)); fw.bezierCurveTo(X(28), Y(1), X(14), Y(2), X(2), Y(1)); fw.closePath();
  const hw = new Path2D(); hw.moveTo(X(2), Y(1)); hw.bezierCurveTo(X(18), Y(0), X(36), Y(6), X(39), Y(17)); hw.bezierCurveTo(X(40), Y(27), X(31), Y(33), X(25), Y(35)); hw.lineTo(X(24), Y(50)); hw.quadraticCurveTo(X(21), Y(53), X(19), Y(49)); hw.lineTo(X(19), Y(37)); hw.bezierCurveTo(X(12), Y(35), X(4), Y(26), X(2), Y(9)); hw.closePath();
  return { fw, hw };
}
function greyBfly(g, cx, cy, k, v = 170) { for (const m of [-1, 1]) { const w = wingPath(g, k, cx, cy, m); g.fillStyle = gc(v); g.fill(w.fw); g.fill(w.hw); g.strokeStyle = gc(255); g.lineWidth = 1; g.stroke(w.fw); g.stroke(w.hw); } g.fillStyle = '#000'; g.fillRect(cx - k * 2, cy - k * 20, k * 4, k * 46); }
function bust(g, cx, cy, k, tieY) { // 正面人物（头+肩），k=缩放
  g.fillStyle = gc(80); g.beginPath(); g.moveTo(cx - 95 * k, cy + 170 * k); g.quadraticCurveTo(cx - 90 * k, cy + 75 * k, cx - 40 * k, cy + 70 * k); g.lineTo(cx + 40 * k, cy + 70 * k); g.quadraticCurveTo(cx + 90 * k, cy + 75 * k, cx + 95 * k, cy + 170 * k); g.closePath(); g.fill();
  g.fillStyle = gc(225); g.beginPath(); g.moveTo(cx - 22 * k, cy + 70 * k); g.lineTo(cx + 22 * k, cy + 70 * k); g.lineTo(cx, cy + 125 * k); g.closePath(); g.fill();
  g.fillStyle = '#000'; const ty = tieY ?? cy + 75 * k; g.beginPath(); g.moveTo(cx - 7 * k, ty); g.lineTo(cx + 7 * k, ty); g.lineTo(cx + 10 * k, cy + 170 * k); g.lineTo(cx - 10 * k, cy + 170 * k); g.closePath(); g.fill();
  g.fillStyle = gc(170); g.beginPath(); g.ellipse(cx, cy, 34 * k, 43 * k, 0, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5 * k; g.stroke();
  g.fillStyle = gc(70); g.beginPath(); g.ellipse(cx, cy - 14 * k, 36 * k, 30 * k, 0, Math.PI, TAU); g.fill();
  g.fillStyle = '#000'; g.fillRect(cx - 19 * k, cy + 2 * k, 11 * k, 2.5 * k); g.fillRect(cx + 8 * k, cy + 2 * k, 11 * k, 2.5 * k);
}
function standing(g, cx, by, k, v = 1) { // 全身站立人物
  g.fillStyle = gc(Math.round(90 * v)); g.beginPath(); g.moveTo(cx - 20 * k, by - 100 * k); g.lineTo(cx + 20 * k, by - 100 * k); g.lineTo(cx + 17 * k, by); g.lineTo(cx + 4 * k, by); g.lineTo(cx, by - 55 * k); g.lineTo(cx - 4 * k, by); g.lineTo(cx - 17 * k, by); g.closePath(); g.fill();
  g.fillStyle = gc(Math.round(110 * v)); g.beginPath(); g.moveTo(cx - 30 * k, by - 168 * k); g.quadraticCurveTo(cx, by - 178 * k, cx + 30 * k, by - 168 * k); g.lineTo(cx + 27 * k, by - 95 * k); g.lineTo(cx - 27 * k, by - 95 * k); g.closePath(); g.fill();
  g.strokeStyle = gc(Math.round(200 * v)); g.lineWidth = 1.5 * k; g.stroke();
  g.fillStyle = gc(Math.round(230 * v)); g.beginPath(); g.moveTo(cx - 9 * k, by - 171 * k); g.lineTo(cx + 9 * k, by - 171 * k); g.lineTo(cx, by - 140 * k); g.closePath(); g.fill();
  g.fillStyle = '#000'; g.fillRect(cx - 3 * k, by - 167 * k, 6 * k, 40 * k);
  g.fillStyle = gc(Math.round(185 * v)); g.beginPath(); g.ellipse(cx, by - 192 * k, 15 * k, 19 * k, 0, 0, TAU); g.fill(); g.strokeStyle = gc(Math.round(255 * v)); g.lineWidth = 1.6 * k; g.stroke();
  g.fillStyle = gc(Math.round(70 * v)); g.beginPath(); g.ellipse(cx, by - 202 * k, 15.5 * k, 10 * k, 0, Math.PI, TAU); g.fill();
}

/* ---------- 点云定义（延迟生成，等字体就绪） ---------- */
const DEFS = {
  title: () => sample(640, 360, 16, 11000, g => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 150px ${SERIF}`; g.fillText('栩　栩', 320, 165);
    g.font = '400 20px Georgia,serif'; g.fillStyle = gc(160); g.fillText('W  H  O  S  E     D  R  E  A  M', 320, 268);
  }, 3),
  bed: () => bedroom(),
  mir: () => mirror(),
  d0559: () => digits('05:59'), d0600: () => digits('06:00'),
  face: () => sample(320, 360, 8, 6000, g => { g.fillStyle = gc(40); g.fillRect(0, 0, 320, 360); bust(g, 160, 150, 2.1, 999); g.fillStyle = '#fff'; g.beginPath(); g.arc(122, 158, 14, 0, TAU); g.arc(198, 158, 14, 0, TAU); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(122, 158, 6, 0, TAU); g.arc(198, 158, 6, 0, TAU); g.fill(); }, 24),
  umb: () => sample(80, 80, 1.05, 170, g => {
    g.fillStyle = gc(110); g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; g.lineTo(40 + Math.cos(a) * 36, 40 + Math.sin(a) * 36); } g.closePath(); g.fill();
    g.strokeStyle = gc(210); g.lineWidth = 2; g.stroke(); g.lineWidth = 1.6; for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; g.beginPath(); g.moveTo(40, 40); g.lineTo(40 + Math.cos(a) * 36, 40 + Math.sin(a) * 36); g.stroke(); }
  }, 5),
  stripes: () => sample(640, 360, 16, 5000, g => { g.fillStyle = gc(70); for (let x = 86; x < 560; x += 31) g.fillRect(x, 0, 15, 360); }, 6),
  subway: () => sample(640, 360, 16, 12000, g => {
    g.fillStyle = gc(40); g.fillRect(50, 40, 540, 232); frameRect(g, 50, 40, 540, 232, 150, 2);
    for (const wx of [80, 150, 430, 500]) { g.fillStyle = gc(25); g.fillRect(wx, 70, 58, 62); frameRect(g, wx, 70, 58, 62, 140, 2); for (let q = 0; q < 3; q++) { g.fillStyle = gc(175); g.beginPath(); g.arc(wx + 12 + q * 17, 104, 6, 0, TAU); g.fill(); g.fillStyle = gc(80); g.fillRect(wx + 5 + q * 17, 112, 14, 20); } }
    g.fillStyle = gc(30); g.fillRect(250, 58, 140, 214); frameRect(g, 250, 58, 140, 214, 235, 3);
    for (let q = 0; q < 6; q++) standing(g, 262 + q * 23, 300, .75, .8);
    g.fillStyle = gc(160); g.fillRect(0, 286, 640, 4); g.fillStyle = gc(55); g.fillRect(0, 290, 640, 70);
  }, 7),
  person: () => sample(120, 260, 1.84, 1600, g => standing(g, 60, 250, 1.15), 8),
  personDim: () => sample(120, 260, 1.84, 900, g => standing(g, 60, 250, 1.15, .7), 9),
  desk: () => sample(640, 360, 16, 15000, g => {
    g.fillStyle = gc(22); g.fillRect(0, 0, 640, 360);
    g.fillStyle = gc(55); g.fillRect(180, 55, 104, 82); frameRect(g, 180, 55, 104, 82, 240, 4); greyBfly(g, 232, 92, .62, 185);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(232, 80, 2.5, 0, TAU); g.fill(); g.fillStyle = gc(210); g.fillRect(205, 118, 54, 10);
    g.fillStyle = gc(60); g.fillRect(330, 60, 175, 115); frameRect(g, 330, 60, 175, 115, 210, 4);
    g.strokeStyle = gc(130); g.lineWidth = 1; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(330 + i * 29, 62); g.lineTo(330 + i * 29, 173); g.stroke(); } for (let j = 1; j < 8; j++) { g.beginPath(); g.moveTo(332, 60 + j * 14); g.lineTo(503, 60 + j * 14); g.stroke(); }
    g.fillStyle = gc(120); g.fillRect(410, 175, 14, 40); g.fillRect(385, 212, 64, 5);
    g.strokeStyle = gc(150); g.lineWidth = 1; g.beginPath(); g.moveTo(498, 64); g.lineTo(492, 140); g.stroke(); g.fillStyle = gc(200); g.fillRect(470, 138, 44, 54); g.fillStyle = '#000'; g.fillRect(480, 144, 24, 20);
    g.font = '700 9px monospace'; g.textAlign = 'center'; g.fillText('No.0417', 492, 176); g.font = `700 10px ${SERIF}`; g.fillText('周', 492, 188);
    g.fillStyle = gc(150); g.fillRect(0, 225, 640, 3); g.fillStyle = gc(35); g.fillRect(0, 228, 640, 132);
    g.fillStyle = gc(85); g.fillRect(285, 248, 175, 36); g.strokeStyle = '#000'; g.lineWidth = 1.5; for (let i = 1; i < 14; i++) { g.beginPath(); g.moveTo(285 + i * 12.5, 248); g.lineTo(285 + i * 12.5, 284); g.stroke(); }
    frameRect(g, 190, 232, 34, 40, 200, 3);
  }, 10),
  office: () => sample(640, 360, 16, 15000, g => {
    g.fillStyle = gc(20); g.fillRect(0, 0, 640, 360);
    g.fillStyle = gc(40); g.fillRect(95, 40, 145, 132); for (let i = 0; i < 6; i++) { g.fillStyle = gc(60 + (i % 2) * 14); g.fillRect(96 + i * 25, 172 - (40 + (i * 37) % 70), 20, 40 + (i * 37) % 70); }
    frameRect(g, 95, 40, 145, 132, 230, 3); g.fillStyle = gc(200); g.fillRect(166, 40, 3, 132); g.fillRect(95, 98, 145, 3);
    g.fillStyle = gc(50); g.beginPath(); g.arc(320, 52, 23, 0, TAU); g.fill(); g.strokeStyle = gc(240); g.lineWidth = 3; g.stroke();
    g.fillStyle = gc(55); g.fillRect(450, 60, 58, 46); frameRect(g, 450, 60, 58, 46, 220, 2.5); greyBfly(g, 479, 80, .38, 180);
    g.fillStyle = gc(105); g.fillRect(0, 190, 640, 2);
    g.fillStyle = gc(60); g.fillRect(395, 120, 138, 92); frameRect(g, 395, 120, 138, 92, 210, 3);
    g.strokeStyle = gc(125); g.lineWidth = 1; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(395 + i * 23, 122); g.lineTo(395 + i * 23, 210); g.stroke(); } for (let j = 1; j < 8; j++) { g.beginPath(); g.moveTo(397, 120 + j * 11.5); g.lineTo(531, 120 + j * 11.5); g.stroke(); }
    g.fillStyle = gc(110); g.fillRect(457, 212, 14, 38);
    g.fillStyle = gc(75); g.beginPath(); g.moveTo(262, 252); g.quadraticCurveTo(265, 212, 296, 205); g.lineTo(344, 205); g.quadraticCurveTo(375, 212, 378, 252); g.closePath(); g.fill();
    g.fillStyle = gc(150); g.fillRect(0, 250, 640, 3); g.fillStyle = gc(32); g.fillRect(0, 253, 640, 107);
    g.fillStyle = gc(80); g.fillRect(258, 262, 124, 24); g.strokeStyle = '#000'; g.lineWidth = 1.2; for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(258 + i * 12.4, 262); g.lineTo(258 + i * 12.4, 286); g.stroke(); }
    frameRect(g, 183, 222, 28, 32, 190, 2.5);
  }, 11),
  head: () => sample(100, 120, 1.05, 800, g => {
    g.fillStyle = gc(175); g.beginPath(); g.ellipse(50, 62, 36, 46, 0, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
    g.fillStyle = gc(70); g.beginPath(); g.ellipse(50, 46, 38, 32, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#000'; g.fillRect(28, 64, 14, 3); g.fillRect(58, 64, 14, 3);
  }, 12),
  clockF: () => sample(640, 360, 16, 8000, g => {
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(320, 180, 120, 0, TAU); g.stroke(); g.fillStyle = gc(40); g.beginPath(); g.arc(320, 180, 116, 0, TAU); g.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.lineWidth = i % 3 ? 3 : 6; g.beginPath(); g.moveTo(320 + Math.cos(a) * 98, 180 + Math.sin(a) * 98); g.lineTo(320 + Math.cos(a) * 112, 180 + Math.sin(a) * 112); g.stroke(); }
  }, 13),
  keys: () => sample(640, 360, 16, 9000, g => {
    const L = 'QWERTYASDFGHZXCVBNJJJJJJ'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 26px monospace';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 120 + c * 68 + r * 9, y = 60 + r * 62; g.fillStyle = gc(55); g.fillRect(x, y, 58, 52); frameRect(g, x, y, 58, 52, 220, 2.5); g.fillStyle = '#fff'; g.fillText(L[r * 6 + c], x + 29, y + 27); }
  }, 14),
  sheet: () => sample(640, 360, 16, 9000, g => {
    g.strokeStyle = gc(120); g.lineWidth = 1.2; g.font = '500 12px monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let r = 0; r < 12; r++) for (let c = 0; c < 7; c++) { const x = 100 + c * 63, y = 34 + r * 25; g.strokeRect(x, y, 63, 25); g.fillStyle = gc(230); g.fillText(((r * 7 + c) * 7919 % 99991 / 100).toFixed(2), x + 58, y + 13); }
  }, 15),
  coffee: () => sample(640, 360, 16, 8000, g => {
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(320, 180, 110, 0, TAU); g.stroke(); g.lineWidth = 14; g.beginPath(); g.arc(440, 180, 30, -1.1, 1.1); g.stroke();
    g.fillStyle = gc(50); g.beginPath(); g.arc(320, 180, 90, 0, TAU); g.fill(); g.strokeStyle = gc(140); g.lineWidth = 2; for (const r of [30, 55, 78]) { g.beginPath(); g.arc(320, 180, r, 0, TAU); g.stroke(); }
  }, 16),
  stamp: () => sample(640, 360, 16, 8000, g => { g.strokeStyle = '#fff'; g.lineWidth = 9; g.strokeRect(200, 105, 240, 150); g.fillStyle = '#fff'; g.font = `700 92px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('已阅', 320, 184); }, 17),
  printer: () => sample(640, 360, 16, 8000, g => {
    g.fillStyle = gc(200); g.fillRect(230, 30, 180, 150); g.fillStyle = '#000'; for (let i = 0; i < 7; i++) g.fillRect(250, 50 + i * 18, 130 - (i % 3) * 30, 4);
    g.fillStyle = gc(50); g.fillRect(170, 170, 300, 110); frameRect(g, 170, 170, 300, 110, 220, 3); g.fillStyle = '#000'; g.fillRect(200, 176, 240, 8); g.fillStyle = '#fff'; g.beginPath(); g.arc(440, 230, 6, 0, TAU); g.fill();
  }, 18),
  profile: () => sample(320, 360, 8, 7000, g => { // S15 右半：侧趴熟睡，头朝左
    g.fillStyle = gc(160); g.fillRect(0, 238, 320, 3); g.fillStyle = gc(35); g.fillRect(0, 241, 320, 120);
    g.fillStyle = gc(80); g.beginPath(); g.moveTo(80, 240); g.bezierCurveTo(80, 160, 160, 130, 230, 150); g.bezierCurveTo(290, 168, 315, 210, 320, 240); g.closePath(); g.fill();
    g.fillStyle = gc(95); g.beginPath(); g.ellipse(95, 228, 70, 14, 0, 0, TAU); g.fill();
    g.fillStyle = gc(175); g.beginPath(); g.ellipse(70, 196, 38, 44, -.25, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.moveTo(34, 188); g.quadraticCurveTo(20, 198, 34, 206); g.fill(); g.stroke();
    g.fillStyle = gc(70); g.beginPath(); g.ellipse(84, 178, 36, 32, -.25, Math.PI * 1.05, Math.PI * 2.2); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 2.5; g.beginPath(); g.arc(52, 190, 6, .3, Math.PI - .3); g.stroke();
  }, 19),
  wing: () => sample(120, 120, 60, XU.N > 30000 ? 4300 : 3000, g => {
    const w = wingPath(g, 2, 0, 60); g.fillStyle = 'rgb(150,0,0)'; g.fill(w.fw); g.fillStyle = 'rgb(150,255,0)'; g.fill(w.hw);
    g.strokeStyle = 'rgb(255,0,0)'; g.lineWidth = 2; g.stroke(w.fw); g.strokeStyle = 'rgb(255,255,0)'; g.stroke(w.hw);
  }, 20, [0, 60]),
  text1: () => sample(640, 360, 16, 8000, g => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `400 44px ${SERIF}`;
    g.fillText('不知周之梦为胡蝶与，', 320, 150); g.fillText('胡蝶之梦为周与？', 320, 212);
    g.font = `400 15px ${SERIF}`; g.fillStyle = gc(150); g.fillText('——《庄子 · 齐物论》', 320, 268);
  }, 21),
  credits: () => sample(640, 360, 16, 7000, g => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 40px ${SERIF}`; g.fillText('栩　栩', 320, 120);
    g.fillStyle = gc(170); g.font = '400 15px Georgia,serif'; g.fillText('Whose Dream', 320, 160);
    g.font = `400 15px ${SERIF}`; g.fillText('动画短片设计案 · 粒子动态分镜', 320, 205); g.fillText('2D 黑白 · 雨　　3D 彩色 · 晴', 320, 232); g.fillText('正片 2′45″', 320, 259);
  }, 22),
  frameEmpty: () => sample(640, 360, 16, 9000, g => {
    g.fillStyle = gc(22); g.fillRect(0, 0, 640, 360);
    g.fillStyle = gc(60); g.fillRect(220, 70, 200, 170); frameRect(g, 220, 70, 200, 170, 245, 6); frameRect(g, 234, 84, 172, 142, 130, 1.5);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(320, 128, 5, 0, TAU); g.fill(); g.fillRect(319, 132, 2, 30);
    g.fillStyle = gc(220); g.fillRect(270, 205, 100, 18); g.fillStyle = '#000'; g.font = 'italic 12px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Papilio bianor', 320, 214);
  }, 23)
};
function digits(txt) { return sample(160, 60, 4, 700, g => { g.font = '700 22px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 80, 30); }, 34); }
function bedroom() {
  return sample(640, 360, 16, 12500, g => {
    g.fillStyle = gc(38); g.fillRect(250, 40, 140, 110); for (let i = 0; i < 6; i++) { g.fillStyle = gc(58 + (i % 2) * 12); const h = 30 + (i * 29) % 60; g.fillRect(252 + i * 23, 150 - h, 18, h); }
    frameRect(g, 250, 40, 140, 110, 225, 3); g.fillStyle = gc(200); g.fillRect(318, 40, 3, 110); g.fillRect(250, 94, 140, 3);
    g.fillStyle = gc(60); g.fillRect(120, 222, 400, 52); frameRect(g, 120, 222, 400, 52, 150, 2);
    g.fillStyle = gc(165); g.beginPath(); g.ellipse(160, 214, 30, 12, 0, 0, TAU); g.fill();
    g.fillStyle = gc(150); g.beginPath(); g.ellipse(330, 224, 160, 40, 0, Math.PI, TAU); g.closePath(); g.fill(); g.strokeStyle = gc(235); g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = '#000'; g.lineWidth = 2.5; for (let i = -4; i <= 4; i++) { const x = 330 + i * 33, top = 224 - Math.sqrt(Math.max(0, 1 - ((i * 33) / 160) ** 2)) * 40; g.beginPath(); g.moveTo(x - 6, top + 3); g.quadraticCurveTo(x + 5, top + 20, x, 223); g.stroke(); }
    g.fillStyle = gc(50); g.fillRect(470, 230, 75, 45); frameRect(g, 470, 230, 75, 45, 140, 2);
    g.fillStyle = gc(120); g.fillRect(0, 275, 640, 2);
  }, 30);
}
function mirror() {
  return sample(640, 360, 16, 13000, g => {
    g.fillStyle = gc(30); g.fillRect(205, 25, 230, 300);
    g.fillStyle = gc(45); g.fillRect(232, 50, 74, 90); frameRect(g, 232, 50, 74, 90, 120, 2);
    bust(g, 320, 150, 1, 999);
    frameRect(g, 205, 25, 230, 300, 245, 5);
  }, 32);
}
const CACHE = {};
SH.get = name => CACHE[name] || (CACHE[name] = DEFS[name]());

/* ---------- 发射：点云 → 粒子目标 ---------- */
SH.emit = (cl, o = {}) => {
  const x0 = o.x || 0, y0 = o.y || 0, z0 = o.z || 0, sx = o.sx ?? o.s ?? 1, sy = o.sy ?? o.s ?? 1, cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
  const col = o.col || [.82, .82, .8], fn = typeof col === 'function' ? col : null, a = o.a ?? 1, size = o.size ?? .028, occ = o.occ ?? 0, jit = o.jit || 0, bmin = o.bmin ?? .3;
  const to = Math.min(cl.n, o.to ?? cl.n);
  for (let i = o.from || 0; i < to; i++) {
    const px = cl.X[i] * sx, py = cl.Y[i] * sy, rx = px * cr - py * sr, ry = px * sr + py * cr, b = cl.B[i], al = a * (bmin + (1 - bmin) * b), id = PS.i;
    const jx = jit ? hj(id, 1) * jit : 0, jy = jit ? hj(id, 2) * jit : 0;
    if (fn) { const c = fn(i, b, x0 + rx, y0 + ry); PS.put(x0 + rx + jx, y0 + ry + jy, z0 + (c[5] || 0), c[0], c[1], c[2], al * c[3], size * (c[4] ?? 1), occ); }
    else PS.put(x0 + rx + jx, y0 + ry + jy, z0, col[0], col[1], col[2], al, size, occ);
  }
};
/* 几何图元：沿线 / 矩形边 / 圆周 / 圆盘撒点 */
SH.line = (x1, y1, x2, y2, n, o = {}) => { const c = o.col || [.85, .85, .82]; for (let i = 0; i < n; i++) { const t = (i + .5) / n, j = o.jit ? hj(PS.i, 1) * o.jit : 0; PS.put(lerp(x1, x2, t) + j, lerp(y1, y2, t) + (o.jit ? hj(PS.i, 2) * o.jit : 0), o.z || 0, c[0], c[1], c[2], o.a ?? 1, o.size ?? .03, o.occ ?? 0); } };
SH.rect = (cx, cy, w, h, n, o = {}) => { const per = 2 * (w + h); for (let i = 0; i < n; i++) { let d = (i + .5) / n * per, x, y; if (d < w) { x = cx - w / 2 + d; y = cy + h / 2; } else if ((d -= w) < h) { x = cx + w / 2; y = cy + h / 2 - d; } else if ((d -= h) < w) { x = cx + w / 2 - d; y = cy - h / 2; } else { d -= w; x = cx - w / 2; y = cy - h / 2 + d; } const c = o.col || [.85, .85, .82]; PS.put(x + (o.jit ? hj(PS.i, 1) * o.jit : 0), y + (o.jit ? hj(PS.i, 2) * o.jit : 0), o.z || 0, c[0], c[1], c[2], o.a ?? 1, o.size ?? .03, o.occ ?? 0); } };
SH.circle = (cx, cy, r, n, o = {}) => { const c = o.col || [.85, .85, .82], ry = o.ry ?? r; for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU + (o.ph || 0); PS.put(cx + Math.cos(a) * r, cy + Math.sin(a) * ry, (o.z || 0) + (o.zr ? Math.sin(a) * o.zr : 0), c[0], c[1], c[2], o.a ?? 1, o.size ?? .03, o.occ ?? 0); } };
SH.disc = (cx, cy, r, n, o = {}) => { const c = o.col || [.85, .85, .82]; for (let i = 0; i < n; i++) { const a = i * 2.39996, d = Math.sqrt((i + .5) / n) * r; PS.put(cx + Math.cos(a) * d, cy + Math.sin(a) * d * (o.sq ?? 1), o.z || 0, c[0], c[1], c[2], o.a ?? 1, o.size ?? .03, o.occ ?? 0); } };

/* ---------- 雨 ---------- */
SH.rain = (t, o = {}) => {
  const LS = XU.LS, n = o.n || 900, r = mulberry(o.seed || 77), x0 = o.x0 ?? -9, x1 = o.x1 ?? 9, y0 = o.y0 ?? -5, y1 = o.y1 ?? 5, len = o.len || .55, ang = o.ang ?? .2, sp = o.sp || 13, a = o.a ?? .35, c = o.col || [.85, .87, .9];
  const hh = y1 - y0 + len, cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
  for (let i = 0; i < n; i++) {
    const bx = x0 - 1 + r() * (x1 - x0 + 2 + hh * ang), s = sp * (.7 + r() * .6), al = a * (.4 + r() * .6), z = o.z ? (r() - .5) * o.z : 0;
    const y = y1 - ((r() * hh + t * s) % hh), x = bx - (y1 - y) * ang;
    const ax = x, ay = y, bx2 = x + len * ang, by2 = y + len;
    LS.add(ax * cr - ay * sr, ax * sr + ay * cr, z, bx2 * cr - by2 * sr, bx2 * sr + by2 * cr, z, c[0], c[1], c[2], al, 0);
  }
};

/* ---------- 3D 碧凤蝶 ---------- */
const TEAL = [.05, .95, .78], BLUE = [.12, .42, 1], DARK = [.02, .035, .04], UNDER = [.42, .36, .29], RED = [1, .22, .28];
const NOTCH = [[51, -40, 6], [44, -12, 5], [37, 18, 5], [25, 47, 4], [47, -30, 5]];
SH.bfly = (o) => {
  const W = SH.get('wing'), s = (o.s || 1) / 100, fa = o.flap || 0, ca = Math.cos(fa), sa = Math.sin(fa);
  const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  const ox = o.x || 0, oy = o.y || 0, oz = o.z || 0, fade = o.fade || 0, under = o.under || 0, dis = o.dis || 0, gray = o.gray || 0, al = o.a ?? 1, ph = o.ph || 0, hue = o.hue || 0, size = o.size ?? .03;
  const tr = (bx, by, bz) => { // 机体系 → 世界：先滚转(z)，再俯仰(x)，再偏航(y)
    let x = bx * cr - by * sr, y = bx * sr + by * cr, z = bz;
    let y2 = y * cp - z * sp, z2 = y * sp + z * cp; y = y2; z = z2;
    const x2 = x * cy + z * sy; z = -x * sy + z * cy; return [ox + x2 * s, oy + y * s, oz + z * s];
  };
  for (const side of [-1, 1]) for (let i = 0; i < W.n; i++) {
    const X = W.X[i], Y = W.Y[i], yo = -Y, hind = W.G[i] > .5, edge = W.B[i] > .8;
    let band = hind ? Math.exp(-((X - 16) ** 2 + (yo - 14) ** 2) / 260) : Math.exp(-((X - 22) ** 2 + (yo + 16) ** 2) / 300);
    const w = .5 + .5 * Math.sin(ph + X * .09 + yo * .05 + side * .7 + hue);
    let c = [lerp(TEAL[0], BLUE[0], w), lerp(TEAL[1], BLUE[1], w), lerp(TEAL[2], BLUE[2], w)];
    let r = DARK[0] + (c[0] - DARK[0]) * band, g = DARK[1] + (c[1] - DARK[1]) * band, b = DARK[2] + (c[2] - DARK[2]) * band;
    let a = .55 + band * 1.1 + (edge ? .25 : 0), occ = .92 - band * .45;
    if (edge) { r += .1 * band; g += .2 * band; b += .2 * band; }
    if (hind && (X - 29) ** 2 + (yo - 30) ** 2 < 18) { r = RED[0]; g = RED[1]; b = RED[2]; a = 1.3; occ = .5; }
    if (!hind && X > 41 && Math.abs(yo + 24) < 14 && W.B[i] > .6) { r += .5; g += .6; b += .55; a += .3; }
    if (under > 0) { const k = under; const pb = Math.exp(-((X - 20) ** 2) / 40); r = lerp(r, UNDER[0] + pb * .25, k); g = lerp(g, UNDER[1] + pb * .22, k); b = lerp(b, UNDER[2] + pb * .15, k); a = lerp(a, .85, k); occ = lerp(occ, .95, k); }
    if (fade > 0) { const m = (r + g + b) / 3; r = lerp(r, m * .9 + .08, fade); g = lerp(g, m * .85 + .06, fade); b = lerp(b, m * .8 + .05, fade); a *= 1 - fade * .35; }
    if (gray) { const m = (r + g + b) / 3 * 1.6 + .08; r = g = b = m; occ = 0; a = .45 + band * .8; }
    if (o.tatter) for (const [nx, ny, nr] of NOTCH) if ((X - nx) ** 2 + (yo - ny) ** 2 < nr * nr) a = 0;
    let [px, py, pz] = tr(side * X * ca, Y, X * sa);
    const rs = PS.RND[(PS.i % PS.N) * 4 + 3];
    if (dis > 0 && rs < dis) { const k = (dis - rs) * 4; px += k * (o.wind ? o.wind[0] : .9) + Math.sin(rs * 40 + k) * k * .3; py += k * (o.wind ? o.wind[1] : .35) + Math.cos(rs * 31) * k * .25; pz += Math.sin(rs * 17) * k * .4; a *= Math.max(0, 1 - k * .35); }
    PS.put(px, py, pz, r, g, b, a * al, size * (edge ? 1.15 : 1), occ * (o.occMul ?? 1));
  }
  for (let i = 0; i < 160; i++) { // 躯干
    const t = i / 160, by = lerp(19, -27, t), wdt = by > 12 ? 4 : by > 2 ? 3.4 : 2.6 * (1 - (2 - by) / 40), ang = i * 2.4;
    const [px, py, pz] = tr(Math.cos(ang) * wdt * .6, by, Math.sin(ang) * wdt * .6 + 1);
    PS.put(px, py, pz, gray ? .5 : .05, gray ? .5 : .07, gray ? .5 : .07, al * (gray ? .6 : .9), size, gray ? 0 : .95);
  }
  for (const sd of [-1, 1]) for (let i = 0; i < 24; i++) { const t = i / 23, [px, py, pz] = tr(sd * (1.5 + 10.5 * t), 19 + 22 * t - 4 * t * t, 1 + 2 * t); PS.put(px, py, pz, gray ? .5 : .06, gray ? .5 : .08, gray ? .5 : .1, al * (i > 20 ? 1.2 : .8), size * (i > 20 ? 1.4 : .8), gray ? 0 : .9); }
};
/* 鳞粉印：贴在玻璃上的蝶形彩色粉末 */
SH.dust = (o) => {
  const W = SH.get('wing'), s = (o.s || 1) / 100, t = o.t || 0, drip = o.drip || 0, step = o.step || 2;
  for (const side of [-1, 1]) for (let i = 0; i < W.n; i += step) {
    const X = W.X[i], Y = W.Y[i], rs = PS.RND[(PS.i % PS.N) * 4 + 3];
    const hcol = .5 + .5 * Math.sin(X * .11 + Y * .07);
    let px = (o.x || 0) + side * X * s, py = (o.y || 0) + Y * s;
    let a = (o.a ?? 1) * (.35 + .65 * rs);
    if (drip > 0 && rs < .45) { const fall = Math.max(0, drip * (1.2 + rs * 3) - rs * 2); py -= fall; px += Math.sin(i) * .02; a *= Math.max(.15, 1 - fall * .35); }
    PS.put(px, py, o.z || 0, lerp(.05, .14, hcol), lerp(.92, .45, hcol), lerp(.75, 1, hcol), a, (o.size || .03) * (.7 + rs * .8), 0);
  }
};

/* ---------- 蛹 ---------- */
SH.chrys = (o) => {
  const n = o.n || 2600, s = o.s || 1, x0 = o.x || 0, y0 = o.y || 0, z0 = o.z || 0, emp = o.empty || 0, crack = o.crack || 0, t = o.t || 0;
  for (let i = 0; i < n; i++) {
    const h = (i + .5) / n, th = i * 2.39996 + (o.sway || 0);
    const r = Math.pow(Math.sin(Math.PI * Math.min(1, h * 1.04)), .75) * .36 * (1 - .25 * h) + .02;
    const x = Math.cos(th) * r, z = Math.sin(th) * r, y = -h * 2.2;
    const face = Math.abs(Math.cos(th)), rim = Math.pow(face, 3);
    let cr = lerp(.12, .7, rim), cg = lerp(.55, 1, rim), cb = lerp(.22, .55, rim), a = .55 + rim * 1.1;
    if (emp) { cr = lerp(cr, .95, emp); cg = lerp(cg, .92, emp); cb = lerp(cb, .8, emp); a *= 1 - emp * .5; }
    let px = x, pz = z;
    if (crack > 0 && Math.abs(Math.sin(th) - 1) < .08 && h < crack) { cr = 1; cg = 1; cb = .85; a = 1.4; px += Math.sin(h * 40) * .02; }
    PS.put(x0 + px * s, y0 + y * s, z0 + pz * s, cr, cg, cb, a * (o.a ?? 1), .03 * s, emp ? .25 : .7);
  }
  if (!emp) for (let i = 0; i < 500; i++) { // 蛹内折叠的翅膀微光
    const W = SH.get('wing'), k = (i * 7) % W.n, X = W.X[k], Y = W.Y[k];
    const w = .5 + .5 * Math.sin(t * 1.4 + X * .1);
    PS.put(x0 + (X * .0045 - .05) * s, y0 + (-.75 + Y * .012) * s, z0 + .05 * s, lerp(.05, .2, w), lerp(.9, .5, w), lerp(.7, 1, w), .5 + .5 * Math.sin(t * 2 + i), .022 * s, 0);
  }
};

/* ---------- 3D 花海 ---------- */
const FLN = XU.N > 30000 ? 1100 : 650, FL = [];
{
  const r = mulberry(42), pal = [[1, .32, .2], [1, .82, .2], [.95, .25, .58], [.55, .42, 1], [1, .97, .9], [1, .6, .12], [1, .5, .72], [.35, .78, 1]];
  for (let i = 0; i < FLN; i++) FL.push({ u: r() * 2 - 1, z: r() * 90, h: .25 + r() * .55, s: .06 + r() * .06, c: pal[(r() * pal.length) | 0], p: r() * TAU });
}
SH.field = (o) => {
  const camZ = o.camZ || 0, gy = o.gy ?? -1.2, t = o.t || 0, L = 90, dusk = o.dusk || 0, sway = o.sway ?? 1, kk = PS.k;
  for (const f of FL) {
    const zz = ((f.z - camZ) % L + L) % L + .4, wz = -(camZ + zz), wx = f.u * (1.4 + zz * .78);
    const fog = Math.min(1, zz / L), sw = Math.sin(t * 1.5 + f.p) * .06 * sway * f.h;
    PS.k = zz > L - 3 ? 1e6 : kk;
    const a = (1 - fog * .85) * (o.a ?? 1);
    let [r, g, b] = f.c; if (dusk) { r = lerp(r, .35, dusk); g = lerp(g, .12, dusk); b = lerp(b, .25, dusk); }
    const hx = wx + sw, hy = gy + f.h;
    for (let k = 0; k < 7; k++) { const an = k / 7 * TAU + f.p; PS.put(hx + Math.cos(an) * f.s, hy + Math.sin(an) * f.s * .45, wz + Math.sin(an) * f.s * .6, r, g, b, a * 1.1, .05, .45); }
    PS.put(hx, hy + .01, wz, 1, .85, .35, a * 1.2, .045, .4);
    for (let k = 1; k <= 3; k++) PS.put(wx + sw * k / 4, gy + f.h * (k / 4), wz, .2 * (1 - dusk), .5 * (1 - dusk * .7), .18, a * .5, .03, .6);
  }
  PS.k = kk;
};
/* 光尘 / 花粉 */
SH.motes = (o) => {
  const n = o.n || 900, r = mulberry(o.seed || 91), t = o.t || 0, c = o.col || [1, .9, .6], cx = o.cx || 0, cy = o.cy || 0, cz = o.cz || 0, R = o.r || 6;
  for (let i = 0; i < n; i++) {
    const bx = (r() * 2 - 1) * R * 1.6, by = (r() * 2 - 1) * R * .7, bz = -r() * R * 2, sp = .1 + r() * .25, ph = r() * TAU;
    PS.put(cx + bx + Math.sin(t * sp + ph) * .4, cy + by + Math.sin(t * sp * 1.3 + ph * 2) * .25 + (o.rise ? (t * o.rise * sp) % 3 : 0), cz + bz, c[0], c[1], c[2], (o.a ?? .6) * (.3 + .7 * Math.abs(Math.sin(t * .8 + ph))), o.size || .035, 0);
  }
};
})();
