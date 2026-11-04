'use strict';
/* 栩栩 · 声音：Web Audio 实时合成（雨、风、闹铃主题、古琴拨弦、鸟鸣） */
(() => {
const { ss, mulberry } = XU;
let AC = null, master, rainG, windG, revIn, NOISE, muted = false;
const NT = { D3: 146.83, A3: 220, D4: 293.66, E4: 329.63, Fs4: 369.99, A4: 440, B4: 493.88, D5: 587.33, E5: 659.25, D6: 1174.66 };
const THEME = [['A4', 0], ['B4', .42], ['D5', .84], ['B4', 1.5], ['A4', 1.92], ['Fs4', 2.6], ['E4', 3.05]];
function init() {
  if (AC) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  AC = new C(); master = AC.createGain(); master.gain.value = muted ? 0 : .9; master.connect(AC.destination);
  const len = AC.sampleRate * 3, ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
  const conv = AC.createConvolver(); conv.buffer = ir; const rg = AC.createGain(); rg.gain.value = .4; conv.connect(rg).connect(master); revIn = conv;
  NOISE = AC.createBuffer(1, AC.sampleRate * 3, AC.sampleRate); const nd = NOISE.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const loop = (rate, filters, g) => { const s = AC.createBufferSource(); s.buffer = NOISE; s.loop = true; s.playbackRate.value = rate; let n = s; for (const f of filters) n = n.connect(f); n.connect(g).connect(master); s.start(); };
  const bq = (type, f) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; return b; };
  rainG = AC.createGain(); rainG.gain.value = 0; loop(1, [bq('highpass', 700), bq('lowpass', 7000)], rainG);
  windG = AC.createGain(); windG.gain.value = 0; const lp = bq('lowpass', 380), lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = .15; lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency); lfo.start(); loop(.5, [lp], windG);
}
const PLK = {};
function pluckBuf(f) {
  const key = Math.round(f * 10); if (PLK[key]) return PLK[key];
  const sr = AC.sampleRate, len = Math.floor(sr * 3.2), N = Math.max(2, Math.round(sr / f)), b = AC.createBuffer(1, len, sr), d = b.getChannelData(0);
  let prev = 0; for (let i = 0; i < N; i++) { prev = prev * .55 + (Math.random() * 2 - 1) * .45; d[i] = prev; }
  const dec = f < 300 ? .998 : .996; for (let i = N; i < len; i++) d[i] = dec * .5 * (d[i - N] + (i - N - 1 >= 0 ? d[i - N - 1] : 0));
  return (PLK[key] = b);
}
const at = w => AC.currentTime + (w || 0);
function pluck(f, vol = .45, when = 0, wet = .7) { const s = AC.createBufferSource(); s.buffer = pluckBuf(f); const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); const w = AC.createGain(); w.gain.value = wet; g.connect(w).connect(revIn); s.start(at(when)); }
function beep(f, dur = .12, vol = .08, when = 0) { const o = AC.createOscillator(); o.type = 'square'; o.frequency.value = f; const g = AC.createGain(), t0 = at(when); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .005); g.gain.setValueAtTime(vol, t0 + dur - .02); g.gain.linearRampToValueAtTime(0, t0 + dur); o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + .02); }
function click(vol = .3, when = 0, freq = 3000, dur = .03) { const s = AC.createBufferSource(); s.buffer = NOISE; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 2; const g = AC.createGain(), t0 = at(when); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); s.connect(bp).connect(g).connect(master); s.start(t0, Math.random() * 2, dur + .05); }
function thud(vol = .6, when = 0, f0 = 120) { const o = AC.createOscillator(), g = AC.createGain(), t0 = at(when); o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + .25); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .4); o.connect(g).connect(master); o.start(t0); o.stop(t0 + .45); }
function plink(vol = .35, when = 0) { const o = AC.createOscillator(), g = AC.createGain(), t0 = at(when); o.frequency.setValueAtTime(1600, t0); o.frequency.exponentialRampToValueAtTime(700, t0 + .12); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .3); o.connect(g); g.connect(master); const w = AC.createGain(); w.gain.value = 1.2; g.connect(w).connect(revIn); o.start(t0); o.stop(t0 + .35); }
function whoosh(vol = .25, when = 0, dur = .5) { const s = AC.createBufferSource(); s.buffer = NOISE; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .8; const g = AC.createGain(), t0 = at(when); bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(1200, t0 + dur * .5); bp.frequency.exponentialRampToValueAtTime(350, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * .4); g.gain.linearRampToValueAtTime(0, t0 + dur); s.connect(bp).connect(g).connect(master); s.start(t0, Math.random(), dur + .05); }
function chirp(vol = .06, when = 0) { const o = AC.createOscillator(), g = AC.createGain(), t0 = at(when), f = 2600 + Math.random() * 1500; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + .06); o.frequency.exponentialRampToValueAtTime(f * .9, t0 + .12); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + .14); o.connect(g).connect(master); o.start(t0); o.stop(t0 + .16); }
function theme(kind, oct = 1, vol = .45) { for (const [n, dt] of THEME) { const f = NT[n] * oct; if (kind === 'beep') beep(f, .11, .07, dt * .36); else pluck(f, vol, dt); } }

/* ---------- 事件表（全局时间，与分镜对齐） ---------- */
const EV = [], ev = (t, fn) => EV.push({ t, fn });
ev(1.4, () => plink(.4));
ev(9.5, () => theme('beep')); ev(10.75, () => theme('beep')); ev(11.35, () => click(.4, 0, 1500, .05));
ev(15.6, () => whoosh(.12, 0, .4));
for (let x = 17; x < 24; x += .5) ev(x + .02, () => { thud(.18, 0, 85); click(.08, 0, 2400); });
ev(25.3, () => whoosh(.3, 0, .6)); ev(26.42, () => { thud(.45, 0, 220); plink(.12); }); ev(27.9, () => whoosh(.25, 0, .5));
for (let x = 29; x < 36; x++) ev(x, () => click(.12, 0, 2600, .02));
{ let d = .75, acc = 36; while (acc < 44) { ev(acc, () => { click(.35, 0, 1800); thud(.16, 0, 70); }); ev(acc + d / 2, () => click(.18, 0, 3200, .02)); acc += d; d = Math.max(.16, d * .86); } }
ev(42, () => pluck(NT.E5, .12, 0, 1));
for (let x = 44; x < 48; x++) ev(x, () => click(.12, 0, 2600, .02));
ev(48, () => { thud(.8, 0, 90); for (let i = 0; i < 6; i++) click(.25, i * .04, 2000, .03); });
ev(50.5, () => click(.3, 0, 2000)); ev(51.3, () => click(.25, 0, 1800, .05)); ev(52.1, () => { click(.18, 0, 1500, .08); pluck(NT.A3, .25); });
ev(53, () => pluck(NT.D4, .3)); ev(54, () => pluck(NT.E4, .3)); ev(55.1, () => pluck(NT.A4, .3)); ev(56.3, () => pluck(NT.D6, .15)); ev(57.8, () => pluck(NT.B4, .25));
ev(61.9, () => { click(.4, 0, 700, .12); plink(.1); }); ev(64.4, () => whoosh(.12, 0, 1.2));
ev(65, () => pluck(NT.D4, .35)); ev(67, () => pluck(NT.A4, .35)); ev(69, () => pluck(NT.D5, .35)); ev(70.6, () => pluck(NT.E5, .3));
ev(72.2, () => { theme('pluck'); pluck(NT.D3, .3); }); ev(76.6, () => { theme('pluck'); pluck(NT.A3, .3); });
ev(82, () => { theme('pluck', 2, .3); pluck(NT.D3, .35); pluck(NT.D4, .2); }); ev(86.4, () => { theme('pluck', 2, .3); pluck(NT.A3, .3); });
{ const r = mulberry(5); for (let x = 73; x < 105; x += .6 + r() * 2.2) ev(x, () => chirp()); for (let x = 108.4; x < 116; x += 1 + r() * 2) ev(x, () => chirp(.05)); }
ev(91.2, () => whoosh(.25, 0, .5));
for (const s of [2.2, 3, 3.8, 4.6]) ev(91 + s, () => { click(.4, 0, 1800); beep(NT.A4 * 2, .06, .05); thud(.2, 0, 70); });
ev(96.3, () => { whoosh(.35, 0, .4); pluck(NT.B4, .4); });
ev(99.5, () => pluck(NT.D4, .25)); ev(103, () => pluck(NT.A4, .2)); ev(107.2, () => thud(1, 0, 70));
ev(108.6, () => pluck(NT.D5, .25)); ev(111, () => pluck(NT.A4, .25)); ev(113.4, () => pluck(NT.B4, .25));
ev(117, () => pluck(NT.D3, .4)); ev(120.5, () => pluck(NT.A3, .35)); ev(124, () => pluck(NT.D3, .35)); ev(127, () => pluck(NT.E4, .25));
ev(129.5, () => pluck(NT.A3, .3)); ev(133, () => pluck(NT.D4, .12));
ev(137, () => theme('beep')); ev(138.3, () => theme('beep'));
ev(145.3, () => click(.15, 0, 900, .05)); ev(148.6, () => thud(.3, 0, 110));
ev(157.2, () => { theme('pluck', 1, .35); theme('beep'); pluck(NT.D3, .3); });
ev(162.5, () => { plink(.5); plink(.15, .35); plink(.06, .7); });
ev(166, () => whoosh(.3, 0, .45)); ev(178.4, () => click(.12, 0, 2600, .02));
EV.sort((a, b) => a.t - b.t);
let idx = 0;
const inF = t => t >= 91 && t < 98 && XU.inFlash && XU.inFlash(t - 91) >= 0;
function rainLevel(t) {
  if (t < 50) return .3 * ss(0, 2, t); if (t < 60) return .3 * (1 - ss(50, 58, t)); if (inF(t)) return .5;
  if (t < 108) return 0; if (t < 116) return .14; if (t < 136) return 0; if (t < 140) return .05; if (t < 148) return .3; if (t < 155) return .42; if (t < 162) return .2; if (t < 165) return .2 * (1 - ss(163, 165, t)); if (t > 172 && t < 178) return .08; return 0;
}
function windLevel(t) { if (t < 58) return 0; if (t < 98) return .3 * ss(58, 62, t); if (t < 107.2) return .3 + ss(98, 107, t) * .5; if (t < 108) return 0; if (t < 116) return .2; if (t < 128) return .25 * (1 - ss(124, 128, t)); if (t >= 155 && t < 162) return .18; return 0; }
XU.AU = {
  init() { init(); if (AC && AC.state === 'suspended') AC.resume(); },
  reset(t) { idx = EV.findIndex(e => e.t >= t); if (idx < 0) idx = EV.length; },
  run(t) { while (idx < EV.length && EV[idx].t <= t) { const e = EV[idx++]; if (AC && !muted && t - e.t < .25) { try { e.fn(); } catch (err) { /* 忽略 */ } } } },
  amb(t, playing) { if (!AC) return; const on = playing && !muted ? 1 : 0, now = AC.currentTime; rainG.gain.setTargetAtTime(rainLevel(t) * on, now, .08); windG.gain.setTargetAtTime(windLevel(t) * on, now, .15); },
  mute(m) { muted = m; if (AC) master.gain.setTargetAtTime(m ? 0 : .9, AC.currentTime, .05); }
};
})();
