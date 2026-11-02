/* 远方清单 · 演示脚本
   只做界面与交互演示：所有数据来自 data.js，改动只存在当前页面里。 */
(() => {
  'use strict';

  const D = window.DATA;
  const WORLD = window.WORLD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n1 = v => Math.round(v * 10) / 10;
  let P = {};
  const T = Object.fromEntries(D.trips.map(t => [t.id, t]));
  const reindex = () => { P = Object.fromEntries(D.places.map(p => [p.id, p])); };
  reindex();

  /* ---------- 日期 ---------- */
  const pd = s => new Date(s + 'T00:00:00');
  const TODAY = pd(D.today);
  const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const daysUntil = s => Math.round((pd(s) - TODAY) / 864e5);
  const dot = s => s.replaceAll('-', '.');
  const md = s => s.slice(5).replace('-', '.');
  const yen = n => '¥' + Number(n).toLocaleString('en-US');

  /* ---------- 邮票图案：两色套印 + 纸白 ---------- */
  const f = {
    d: 'style="fill:var(--c2)"',
    m: 'style="fill:var(--c3)"',
    p: 'style="fill:var(--art-paper)"',
    b: 'style="fill:var(--c1)"'
  };
  const line = (c, w) => `style="fill:none;stroke:var(${c});stroke-width:${w};stroke-linecap:round;stroke-linejoin:round"`;
  const strokes = (list, c, h = 1.3, o = '.75') => list.map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${c} opacity="${o}"/>`).join('');

  const ART = {
    torii() {
      const gate = (cx, base, k, fill) => {
        const W = 62 * k, H = 64 * k, top = base - H, L = cx - W / 2, R = cx + W / 2;
        return `<path ${fill} d="M${n1(L - 6 * k)} ${n1(top - 3 * k)}Q${cx} ${n1(top + 4 * k)} ${n1(R + 6 * k)} ${n1(top - 3 * k)}L${n1(R + 4 * k)} ${n1(top + 4 * k)}Q${cx} ${n1(top + 10 * k)} ${n1(L - 4 * k)} ${n1(top + 4 * k)}Z"/>`
          + `<rect ${fill} x="${n1(L + k)}" y="${n1(top + 15 * k)}" width="${n1(W - 2 * k)}" height="${n1(4.5 * k)}"/>`
          + `<rect ${fill} x="${n1(cx - 2 * k)}" y="${n1(top + 6 * k)}" width="${n1(4 * k)}" height="${n1(10 * k)}"/>`
          + `<rect ${fill} x="${n1(L + 7 * k)}" y="${n1(top + 5 * k)}" width="${n1(5.5 * k)}" height="${n1(H - 5 * k)}"/>`
          + `<rect ${fill} x="${n1(R - 12.5 * k)}" y="${n1(top + 5 * k)}" width="${n1(5.5 * k)}" height="${n1(H - 5 * k)}"/>`;
      };
      return `<circle cx="70" cy="33" r="14" ${f.p}/><path d="M0 99Q50 92 100 99V125H0Z" ${f.m}/>`
        + gate(50, 96, .4, f.m) + gate(50, 98, .64, f.m) + gate(50, 112, 1, f.d);
    },
    spires() {
      const sp = (x, top, w) => {
        let s = `<path ${f.d} d="M${x - w / 2} 104V${top + 18}Q${x - w / 2} ${top + 4} ${x} ${top}Q${x + w / 2} ${top + 4} ${x + w / 2} ${top + 18}V104Z"/><circle cx="${x}" cy="${top - 3}" r="2.4" ${f.m}/>`;
        for (let y = top + 14; y < 82; y += 9) s += `<rect x="${x - 1}" y="${y}" width="2" height="4.5" ${f.p}/>`;
        return s;
      };
      let s = `<circle cx="50" cy="62" r="34" ${f.m} opacity=".5"/>` + sp(22, 44, 10) + sp(38, 24, 12) + sp(62, 24, 12) + sp(78, 44, 10);
      s += `<rect x="10" y="86" width="80" height="20" ${f.d}/>`;
      [20, 35, 50, 65, 80].forEach(x => { s += `<path ${f.p} d="M${x - 3.5} 106V97A3.5 3.5 0 0 1 ${x + 3.5} 97V106Z"/>`; });
      return s + `<rect y="106" width="100" height="19" ${f.m}/>`;
    },
    arches() {
      let s = `<circle cx="76" cy="24" r="10" ${f.p}/><rect y="36" width="100" height="70" ${f.d}/>`;
      [12, 38, 64, 90].forEach(x => { s += `<path ${f.b} d="M${x - 9} 106V64A9 9 0 0 1 ${x + 9} 64V106Z"/>`; });
      s += `<rect y="42" width="100" height="2" ${f.m}/><rect y="50" width="100" height="1" ${f.m} opacity=".6"/>`;
      [[8, 30, 11], [24, 24, 9], [90, 34, 10]].forEach(([x, y, r]) => { s += `<circle cx="${x}" cy="${y}" r="${r}" ${f.m}/>`; });
      return s + `<rect y="106" width="100" height="19" ${f.m}/>`;
    },
    towers() {
      const bud = (x, base, w, h, fill) => `<path ${fill} d="M${x - w / 2} ${base}V${n1(base - h * .45)}Q${x - w / 2} ${n1(base - h * .88)} ${x} ${base - h}Q${x + w / 2} ${n1(base - h * .88)} ${x + w / 2} ${n1(base - h * .45)}V${base}Z"/>`;
      const set = fill => bud(20, 82, 10, 26, fill) + bud(80, 82, 10, 26, fill) + bud(34, 80, 12, 36, fill) + bud(66, 80, 12, 36, fill) + bud(50, 78, 16, 50, fill) + `<rect x="6" y="78" width="88" height="6" ${fill}/>`;
      let s = `<circle cx="50" cy="34" r="12" ${f.p}/>` + set(f.d);
      [[50, 78, 16, 50], [34, 80, 12, 36], [66, 80, 12, 36]].forEach(([x, b, w, h]) => {
        for (let i = 1; i <= 3; i++) s += `<rect x="${x - w / 2}" y="${n1(b - h * .14 * i)}" width="${w}" height=".9" ${f.p} opacity=".6"/>`;
      });
      s += `<rect y="84" width="100" height="41" ${f.m}/><g transform="matrix(1 0 0 -1 0 168)" opacity=".35">${set(f.d)}</g>`;
      return s + strokes([[8, 93, 30], [52, 97, 36], [20, 105, 44], [66, 111, 26], [10, 117, 24], [48, 121, 30]], f.p, 1.3, '.7');
    },
    stupa() {
      let s = `<circle cx="72" cy="32" r="12" ${f.p}/><rect y="100" width="100" height="25" ${f.m}/>`;
      s += `<rect x="18" y="93" width="64" height="8" ${f.d}/><rect x="25" y="85" width="50" height="8" ${f.d}/><rect x="32" y="77" width="36" height="8" ${f.d}/>`;
      s += `<path ${f.d} d="M33 78Q33 54 50 51Q67 54 67 78Z"/><rect x="44" y="45" width="12" height="7" ${f.d}/><path ${f.d} d="M50 12L46.4 46H53.6Z"/>`;
      s += `<rect x="18" y="92.6" width="64" height="1.2" ${f.p}/><rect x="25" y="84.6" width="50" height="1.2" ${f.p}/><rect x="32" y="76.6" width="36" height="1.2" ${f.p}/><rect x="44" y="47.6" width="12" height="1" ${f.p}/>`;
      s += `<path ${line('--c2', 2.2)} d="M13 101Q16 82 11 64"/>`;
      [-165, -120, -70, -25, 20, 160].forEach(a => {
        const r = a * Math.PI / 180, cx = n1(11 + Math.cos(r) * 8), cy = n1(64 + Math.sin(r) * 6);
        s += `<ellipse cx="${cx}" cy="${cy}" rx="8.5" ry="2.3" transform="rotate(${a} ${cx} ${cy})" ${f.d}/>`;
      });
      return s;
    },
    mountains(o = {}) {
      let s = '';
      if (o.stars) {
        [[12, 14], [26, 24], [44, 10], [58, 20], [90, 36], [36, 34], [64, 6], [8, 40]].forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="${i % 3 ? .9 : 1.4}" ${f.p}/>`; });
        s += `<circle cx="80" cy="22" r="7" ${f.p}/><circle cx="83" cy="20.2" r="6.2" ${f.b}/>`;
      } else {
        s += `<circle cx="28" cy="32" r="9" ${f.p}/>`;
      }
      s += `<path ${f.m} d="M0 82L24 48L38 62L60 30L82 58L100 44V90H0Z"/>`;
      s += `<path ${f.p} d="M60 30L53.6 39.5L57.5 38.4L60.5 42L63.6 37.6L66.6 38.6Z"/><path ${f.p} d="M24 48L19.6 54.3L22.6 53.6L25 56L27.2 52.4L29.4 53Z"/>`;
      s += `<path ${f.d} d="M0 90L16 70L30 84L48 66L74 90Z"/><path ${f.d} d="M54 90L80 64L100 80V90Z"/>`;
      s += `<rect y="90" width="100" height="35" ${f.m} opacity=".6"/>`;
      s += strokes([[8, 96, 26], [46, 100, 36], [18, 107, 40], [62, 113, 24], [6, 119, 20], [40, 121, 28]], f.p, 1.3, '.85');
      if (o.stars) [[8, 112], [14, 108], [86, 110], [92, 114]].forEach(([x, y]) => { s += `<rect x="${x}" y="${y}" width="2.6" height="11" rx="1.3" ${f.p}/>`; });
      return s;
    },
    glacier() {
      let s = `<path ${line('--c3', 3)} d="M-5 30Q25 14 50 28T105 24" opacity=".8"/><path ${line('--c3', 1.6)} d="M-5 40Q28 26 54 38T105 34" opacity=".55"/>`;
      [[14, 12], [40, 7], [76, 10], [90, 18], [60, 15]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r=".9" ${f.p}/>`; });
      s += `<path ${f.d} d="M0 78L14 66L26 72L40 56L56 70L70 60L86 72L100 64V82H0Z"/>`;
      s += `<path ${f.p} d="M40 56L35 61L39 60.4L41.6 63L43.8 59.6Z"/><path ${f.p} d="M70 60L66 64L69 63.6L71 65.4L73 62.4Z"/>`;
      s += `<rect y="82" width="100" height="43" ${f.m} opacity=".55"/>`;
      s += `<path ${f.p} d="M8 98L16 86L28 84L36 98Z"/><path ${f.m} d="M22 85L28 84L36 98L27 98Z"/>`;
      s += `<path ${f.p} d="M48 104L56 90L67 88L75 94L79 104Z"/><path ${f.m} d="M67 88L75 94L79 104L69 104Z"/><path ${f.p} d="M80 115L86 108L94 110L97 115Z"/>`;
      return s + strokes([[4, 108, 20], [30, 112, 18], [56, 118, 30], [10, 121, 24]], f.p, 1.2, '.7');
    },
    bamboo() {
      let s = `<path ${f.p} d="M38 125Q47 98 50 66Q53 98 62 125Z" opacity=".85"/>`;
      [[3, 6, 'd'], [14, 4, 'm'], [24, 7, 'd'], [34, 4, 'm'], [64, 4, 'm'], [72, 7, 'd'], [84, 4, 'm'], [92, 6, 'd']].forEach(([x, w, c], i) => {
        s += `<rect x="${x}" y="-2" width="${w}" height="128" ${f[c]}/>`;
        for (let y = 10 + (i % 3) * 5; y < 125; y += 17 + (i % 2) * 4) s += `<rect x="${n1(x - .6)}" y="${y}" width="${n1(w + 1.2)}" height="1.4" ${f.p} opacity=".75"/>`;
      });
      [[10, 20, -30], [20, 34, 35], [30, 14, -25], [68, 22, 30], [78, 10, -35], [90, 30, 25], [42, 40, -40], [58, 46, 35]].forEach(([x, y, a]) => {
        s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="1.8" transform="rotate(${a} ${x} ${y})" ${f.d}/>`;
      });
      return s;
    },
    hillcity() {
      let s = `<circle cx="78" cy="22" r="10" ${f.p}/>`;
      [[6, 84, 12, 18], [19, 76, 11, 22], [31, 70, 13, 20], [45, 66, 10, 24], [56, 64, 12, 18], [69, 66, 11, 22], [81, 70, 13, 20]].forEach(([x, b, w, h], i) => {
        const y = b - h;
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h + 24}" ${i % 2 ? f.p : f.m}/><path ${f.d} d="M${x - 1.5} ${y}L${n1(x + w / 2)} ${y - 6}L${x + w + 1.5} ${y}Z"/>`;
        s += `<rect x="${x + 2.5}" y="${y + 5}" width="2.6" height="4" ${f.d}/><rect x="${x + w - 5}" y="${y + 5}" width="2.6" height="4" ${f.d}/>`;
      });
      s += `<path ${f.d} d="M0 90Q46 74 100 84V125H0Z"/>`;
      s += `<path ${line('--art-paper', .8)} d="M0 90Q50 84 100 79" opacity=".7"/><path ${line('--art-paper', 1)} d="M44 99L50 87"/>`;
      s += `<rect x="22" y="98" width="42" height="17" rx="3" ${f.m}/>`;
      [26, 36, 46].forEach(x => { s += `<rect x="${x}" y="101" width="7" height="6" ${f.p}/>`; });
      return s + `<rect x="56" y="101" width="5" height="6" ${f.p}/><rect x="22" y="110" width="42" height="1.5" ${f.d} opacity=".5"/><rect y="117" width="100" height="1.5" ${f.p} opacity=".45"/>`;
    },
    domes() {
      let s = `<circle cx="24" cy="26" r="9" ${f.p}/>`;
      [11, 85].forEach(x => { s += `<rect x="${x}" y="36" width="4" height="58" ${f.d}/><path ${f.d} d="M${x - .4} 36L${x + 2} 18L${x + 4.4} 36Z"/><rect x="${x - 1}" y="52" width="6" height="2" ${f.d}/>`; });
      s += `<path ${f.d} d="M28 72A22 22 0 0 1 72 72Z"/><rect x="49.2" y="43" width="1.6" height="8" ${f.d}/>`;
      s += `<path ${f.d} d="M19 82A10 10 0 0 1 39 82Z"/><path ${f.d} d="M61 82A10 10 0 0 1 81 82Z"/><rect x="17" y="72" width="66" height="22" ${f.d}/>`;
      [26, 34, 42, 50, 58, 66, 74].forEach(x => { s += `<path ${f.p} d="M${x - 2} 91V86A2 2 0 0 1 ${x + 2} 86V91Z" opacity=".8"/>`; });
      s += `<rect y="94" width="100" height="31" ${f.m} opacity=".65"/><path ${f.p} d="M56 106H86L82 112H60Z"/><rect x="64" y="100" width="12" height="6" ${f.p}/><rect x="72" y="96" width="2.4" height="4" ${f.d}/>`;
      return s + strokes([[6, 102, 30], [14, 114, 26], [50, 119, 40]], f.p, 1.2, '.7');
    },
    lanterns() {
      const yAt = x => { const t = (x + 2) / 104; return (1 - t) ** 2 * 18 + 2 * (1 - t) * t * 42 + t * t * 18; };
      let s = '';
      [[2, 58, 14], [18, 50, 12], [32, 60, 16], [50, 46, 12], [64, 56, 14], [80, 48, 18]].forEach(([x, y, w], i) => {
        s += `<rect x="${x}" y="${y}" width="${w}" height="${92 - y}" style="fill:#000;opacity:.22"/>`;
        for (let k = 0; k < 3; k++) s += `<rect x="${x + 3 + (k % 2) * 5}" y="${y + 6 + k * 9}" width="2.4" height="3" ${f.d} opacity="${i % 2 ? .35 : .55}"/>`;
      });
      s += `<path ${line('--c2', .8)} d="M-2 18Q50 42 102 18" opacity=".7"/>`;
      [12, 31, 50, 69, 88].forEach(x => {
        const y = n1(yAt(x));
        s += `<circle cx="${x}" cy="${n1(y + 15)}" r="13" ${f.m} opacity=".2"/><rect x="${x - .4}" y="${y}" width=".8" height="4" ${f.d}/>`;
        s += `<rect x="${x - 7}" y="${n1(y + 4)}" width="14" height="21" rx="7" ${f.m}/>`;
        for (let k = 1; k < 4; k++) s += `<rect x="${x - 7}" y="${n1(y + 4 + k * 5)}" width="14" height=".8" style="fill:#000;opacity:.16"/>`;
        s += `<rect x="${x - 4.5}" y="${n1(y + 3)}" width="9" height="3" rx="1" style="fill:#000;opacity:.4"/><rect x="${x - 4.5}" y="${n1(y + 23)}" width="9" height="3" rx="1" style="fill:#000;opacity:.4"/>`;
        s += `<rect x="${x - 4}" y="${100 + (x % 7)}" width="8" height="1.6" ${f.m} opacity=".75"/><rect x="${x - 2.5}" y="${107 + (x % 5)}" width="5" height="1.4" ${f.d} opacity=".55"/>`;
      });
      return s + `<rect y="92" width="100" height="1" ${f.d} opacity=".5"/>`;
    },
    cup() {
      let s = `<rect x="14" y="10" width="72" height="54" ${f.p} opacity=".55"/><rect x="48.8" y="10" width="2.4" height="54" ${f.b}/><rect x="14" y="35.8" width="72" height="2.4" ${f.b}/>`;
      s += `<rect y="94" width="100" height="31" ${f.m}/><path ${line('--c2', 1.6)} d="M42 56q-4-6 0-12t0-12M52 54q-4-6 0-12t0-12M62 56q-4-6 0-12t0-12" opacity=".45"/>`;
      s += `<ellipse cx="50" cy="96" rx="31" ry="5" ${f.d}/><path ${line('--c2', 4.2)} d="M70 71q12 0 10 9q-2 7-12 6"/>`;
      s += `<path ${f.d} d="M28 64H72Q72 90 56 94H44Q28 90 28 64Z"/><ellipse cx="50" cy="64.5" rx="22" ry="4" ${f.m}/>`;
      return s + `<path ${f.p} d="M50 68.2c-1.6-2.4-5.6-2.4-5.2.3.3 1.6 3.4 2.6 5.2 3.6 1.8-1 4.9-2 5.2-3.6.4-2.7-3.6-2.7-5.2-.3Z"/>`;
    },
    bowl() {
      let s = `<circle cx="50" cy="44" r="28" ${f.p} opacity=".5"/><path ${line('--c2', 1.5)} d="M40 50q-4-6 0-12t0-12M52 46q-4-6 0-12t0-12" opacity=".4"/>`;
      s += `<rect x="58" y="16" width="2.6" height="58" rx="1.3" transform="rotate(26 59 45)" ${f.d}/><rect x="64" y="16" width="2.6" height="58" rx="1.3" transform="rotate(33 65 45)" ${f.d}/>`;
      s += `<path ${f.m} d="M24 74Q28 60 40 62Q50 52 60 60Q72 56 76 74Z"/>`;
      s += `<rect x="36" y="62" width="10" height="9" rx="2" ${f.d}/><rect x="49" y="59" width="10" height="10" rx="2" ${f.d}/><rect x="60" y="64" width="9" height="8" rx="2" ${f.d}/>`;
      s += `<rect x="38" y="63.4" width="6" height="1.4" ${f.p} opacity=".7"/><rect x="51" y="60.6" width="6" height="1.4" ${f.p} opacity=".7"/>`;
      s += `<path ${f.d} d="M16 72H84Q82 98 58 102H42Q18 98 16 72Z"/><rect x="19" y="78" width="62" height="2.2" ${f.p}/>`;
      return s + `<rect x="40" y="101" width="20" height="5" ${f.d}/><rect y="106" width="100" height="19" ${f.m}/>`;
    },
    trees() {
      let s = `<circle cx="76" cy="24" r="9" ${f.p}/><rect y="96" width="100" height="29" ${f.m}/>`;
      [[16, 56, 15, 'd'], [36, 68, 10, 'm'], [86, 58, 14, 'd'], [68, 72, 8, 'd']].forEach(([x, y, r, c]) => {
        s += `<rect x="${n1(x - 1.6)}" y="${y}" width="3.2" height="${97 - y}" ${f.d}/><circle cx="${x}" cy="${y}" r="${r}" ${f[c]}/>`;
      });
      s += `<path ${f.p} d="M40 97L53 74L66 97Z"/><path ${f.d} d="M50.4 97L53 84L55.6 97Z"/>`;
      [[28, 40, 30], [58, 34, -20], [46, 50, 50], [74, 46, 10]].forEach(([x, y, a]) => { s += `<rect x="${x}" y="${y}" width="3" height="2" transform="rotate(${a} ${x} ${y})" ${f.m}/>`; });
      return s;
    },
    fruits() {
      let s = '';
      for (let i = 0; i < 10; i++) s += `<rect x="${i * 10}" y="0" width="10" height="20" ${i % 2 ? f.p : f.d}/><circle cx="${i * 10 + 5}" cy="20" r="5" ${i % 2 ? f.p : f.d}/>`;
      s += `<rect x="30" y="34" width="40" height="10" ${f.p}/><rect x="36" y="38" width="28" height="1.6" ${f.d} opacity=".6"/>`;
      [[6, 58], [36, 58], [66, 58], [6, 84], [36, 84], [66, 84]].forEach(([x, y], k) => {
        s += `<rect x="${x}" y="${y}" width="28" height="16" ${f.d}/><rect x="${x}" y="${y + 7}" width="28" height="1" ${f.b} opacity=".35"/>`;
        for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) s += `<circle cx="${n1(x + 4 + c * 6.6)}" cy="${y - 1 + r * 4}" r="3.4" ${k % 2 ? f.m : f.p}/>`;
      });
      return s + `<rect y="104" width="100" height="21" ${f.m}/>`;
    }
  };
  const TYPE_ART = { 建筑: ['arches', ['#E9DFD0', '#6B3A22', '#C48C5C']], 餐馆: ['bowl', ['#F4D6CF', '#8A2618', '#DD7B5E']], 城市: ['hillcity', ['#F4D8D5', '#7B2A37', '#E3A35A']], 自然: ['mountains', ['#D5E7EB', '#1C4B5A', '#7DB4C1']], 咖啡: ['cup', ['#EBDDCB', '#56331E', '#BA875D']] };

  const art = (k, o = {}, ratio = 'slice') => `<svg class="art" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid ${ratio}" aria-hidden="true">${(ART[k] || ART.mountains)(o)}</svg>`;
  const cvars = c => `--c1:${c[0]};--c2:${c[1]};--c3:${c[2]}`;

  /* ---------- 邮戳 ---------- */
  let pmSeq = 0;
  function postmark(top, date, { bottom = '已去过', cls = '' } = {}) {
    const id = 'pmt' + (++pmSeq);
    const waves = [30, 42, 54, 66].map(y => `<path d="M2 ${y}q6-5 12 0t12 0t12 0t12 0t12 0t12 0t12 0t12 0"/>`).join('');
    return `<svg class="pm ${cls}" viewBox="0 0 200 100" aria-hidden="true"><g filter="url(#ink)">`
      + `<g fill="none" stroke="currentColor" stroke-width="2.2">${waves}</g>`
      + `<circle cx="150" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="2.6"/>`
      + `<circle cx="150" cy="50" r="38.5" fill="none" stroke="currentColor" stroke-width="1.1"/>`
      + `<path d="M113 41H187M113 59H187" stroke="currentColor" stroke-width="1.1"/>`
      + `<path id="${id}a" d="M123.5 50A26.5 26.5 0 0 1 176.5 50" fill="none"/>`
      + `<path id="${id}b" d="M115 50A35 35 0 0 0 185 50" fill="none"/>`
      + `<text class="pm-top"><textPath href="#${id}a" startOffset="50%" text-anchor="middle">${esc(top)}</textPath></text>`
      + `<text class="pm-date" x="150" y="54.2" text-anchor="middle">${esc(date)}</text>`
      + `<text class="pm-bot"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${esc(bottom)}</textPath></text>`
      + `</g></svg>`;
  }
  const pmCity = p => (p.local ? '上海' : p.city.split(' ')[0]);

  /* ---------- 邮票 ---------- */
  function stampFace(p, size = '') {
    const country = p.local ? `沪 · ${p.country}` : p.country;
    const label = size === 'xs' ? '' : `<span class="stamp-country">${esc(country)}</span><span class="stamp-denom">${p.want}<small>分</small></span>`;
    return `<div class="stamp ${size}"><div class="stamp-face" style="${cvars(p.c)}">${art(p.art, p)}${label}</div></div>`;
  }
  function stamp(p, { size = '', mark = false, clip = false, thunk = false } = {}) {
    let extra = '';
    if (mark && p.state === 'been') extra += postmark(pmCity(p), dot(p.been), { cls: thunk ? 'thunk' : '' });
    if (clip && p.state === 'plan' && p.trip) extra += `<span class="clip">${esc(T[p.trip].subtitle)}${p.day ? ` · D${p.day}` : ''}</span>`;
    return `<div class="stamp-wrap">${stampFace(p, size)}${extra}</div>`;
  }

  function stateLine(p) {
    if (p.state === 'been') return `<span class="st st-been">${dot(p.been).slice(0, 7)} 去过</span>`;
    if (p.state === 'plan') return `<span class="st st-plan">${esc(T[p.trip].subtitle)}${p.day ? ` · Day ${p.day}` : ''}</span>`;
    return '<span class="st st-want">想去</span>';
  }

  function slot(p, { acts = false, thunk = false } = {}) {
    const where = p.local ? `上海 · ${p.city}` : `${p.city}`;
    let a = '';
    if (acts) {
      if (p.state === 'want') a = `<button class="btn btn-sm" data-act="plan" data-id="${p.id}">加入行程</button><button class="btn btn-sm btn-quiet" data-act="been" data-id="${p.id}">标记去过</button>`;
      else if (p.state === 'plan') a = `<a class="btn btn-sm" href="#trip" data-trip="${p.trip}">看行程</a><button class="btn btn-sm btn-quiet" data-act="been" data-id="${p.id}">标记去过</button>`;
      else a = `<a class="btn btn-sm" href="#memories">${D.memories.some(m => m.place === p.id) ? '看回忆' : '写回忆'}</a>`;
      a = `<div class="slot-acts">${a}</div>`;
    }
    return `<article class="slot" data-id="${p.id}">${stamp(p, { mark: true, clip: true, thunk })}
      <div class="caption">
        <h3>${esc(p.name)}</h3>
        <div class="loc">${p.local ? '<span class="local">本地</span>' : ''}<span>${esc(where)} · ${esc(p.type)}</span></div>
        <div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
        <div>${stateLine(p)}</div>
      </div>${a}</article>`;
  }

  const ICON_SEARCH = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg>';

  const STATUS = { plan: ['st-plan', '计划中'], draft: ['st-draft', '草拟'], done: ['st-done', '已完成'], going: ['st-plan', '进行中'] };
  const statusPill = s => `<span class="st ${STATUS[s][0]}">${STATUS[s][1]}</span>`;

  /* ---------- 车票（行程卡） ---------- */
  function pass(t, { lg = false, kicker = '', action = '' } = {}) {
    const holes = 25, on = Math.round(t.progress / 100 * holes);
    const len = t.end ? Math.round((pd(t.end) - pd(t.start)) / 864e5) + 1 : null;
    const dates = t.end ? (t.start === t.end ? `${md(t.start)}<small>${WD[pd(t.start).getDay()]} · 1 天</small>` : `${md(t.start)}–${md(t.end)}<small>共 ${len} 天</small>`) : `${t.start.replace('-', '.')}<small>日期待定</small>`;
    const over = t.spent > t.budget;
    const pct = Math.min(100, Math.round(t.spent / t.budget * 100));
    let stub;
    if (t.status === 'done') {
      stub = `<div class="countdown"><small>回来</small><b>${Math.round((TODAY - pd(t.end)) / 864e5 / 30)}</b><span>个月了</span></div><a class="btn btn-sm" href="#memories">看回忆</a>`;
    } else if (t.status === 'draft') {
      stub = `<div class="countdown"><small>还在草拟</small><b>${t.progress}<span style="font-size:.4em">%</span></b><span>想清楚了</span></div><a class="btn btn-sm" href="#sort">用攻略补全</a>`;
    } else {
      stub = `<div class="countdown"><small>出发前</small><b>${daysUntil(t.start)}</b><span>天</span></div>${action}`;
    }
    const H = lg ? 'h2' : 'h3';
    return `<article class="pass ${lg ? 'lg' : ''}">
      <div class="pass-main">
        <div class="pass-head"><span class="pass-kicker">${esc(kicker || (t.local ? '本地 · 一日' : '旅行'))}</span>${statusPill(t.status)}</div>
        <${H} class="pass-title">${esc(t.title)}<small>${esc(t.subtitle)}</small></${H}>
        <div class="leg">
          <div class="port"><b>${esc(t.leg.from[0])}</b><span>${esc(t.leg.from[1])}</span><time>${esc(t.leg.from[2])}</time></div>
          <div class="leg-line"><span>${esc(t.leg.via)}</span></div>
          <div class="port r"><b>${esc(t.leg.to[0])}</b><span>${esc(t.leg.to[1])}</span><time>${esc(t.leg.to[2]) || '&nbsp;'}</time></div>
        </div>
        <dl class="pass-meta">
          <div><dt>日期</dt><dd>${dates}</dd></div>
          <div><dt>${t.status === 'done' ? '花费 / 预算' : '已订 / 预算'}</dt><dd>${yen(t.spent)} / ${yen(t.budget)}</dd><div class="budget-bar ${over ? 'over' : ''}"><i style="width:${pct}%"></i></div></div>
          <div><dt>同行</dt><dd style="font-family:var(--f-body)">${esc(t.people)}</dd></div>
        </dl>
        <div class="punch"><span class="punch-label">准备进度 <b>${t.progress}%</b></span><span class="holes" role="img" aria-label="准备进度 ${t.progress}%">${Array.from({ length: holes }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span></div>
      </div>
      <div class="pass-stub">${stub}</div>
    </article>`;
  }

  function checkItem(x, i, tripId) {
    return `<li><label class="check"><input type="checkbox" data-trip="${tripId}" data-i="${i}" ${x.done ? 'checked' : ''}><span class="box" aria-hidden="true"></span><span class="txt">${esc(x.text)}${x.due ? `<span class="due">${esc(x.due)}</span>` : ''}${x.meta ? `<span class="aside">${esc(x.meta)}</span>` : ''}</span></label></li>`;
  }

  /* ============================== 总览 ============================== */
  function renderHome() {
    const k = T.kyoto;
    const prep = k.materials.prep;
    const undone = prep.filter(x => !x.done);
    const doneN = prep.length - undone.length;
    const by = s => D.places.filter(p => p.state === s);
    const tripsActive = D.trips.filter(t => t.status !== 'done').length;
    const fanIds = ['lisbon', 'tekapo', 'istanbul'];
    const recent = [...D.places].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 6);
    const localWants = D.places.filter(p => p.local && p.state !== 'been').sort((a, b) => b.want - a.want).slice(0, 4);
    const lastMemo = D.memories[0];
    const lm = P[lastMemo.place];
    const weeksAgo = Math.round((TODAY - pd(lastMemo.date)) / 864e5 / 7);
    const nextDue = undone.find(x => x.due);
    const sag = P.sagrada;

    $('#view-home').innerHTML = `
      <div class="home-top">
        <div class="today">${dot(D.today)} · ${WD[TODAY.getDay()]} · ${D.home.city}</div>
        <label class="field" for="q-home">${ICON_SEARCH}<input id="q-home" type="search" placeholder="搜地点、标签，回车跳到想去" autocomplete="off"></label>
      </div>

      <section class="hero">
        <h1><span class="d">${daysUntil(k.start)}</span> 天后，<br>去京都看红叶。</h1>
        <p class="lede">还有 <b>${undone.length} 件准备事项</b>没做完${nextDue ? `，最近的一件是<b>${esc(nextDue.due)} ${esc(nextDue.text)}</b>` : ''}。</p>
      </section>

      <section class="route" aria-label="从想去到回忆的四个阶段">
        <a class="station" href="#places">
          <div class="obj"><div class="fan">${fanIds.map(id => stamp(P[id], { size: 'sm' })).join('')}</div></div>
          <span class="st st-want">想去</span>
          <div class="count">${by('want').length}<small>处</small></div>
          <p>刷到喜欢的，先记下来</p>
        </a>
        <div class="hop" aria-hidden="true"><span>加入行程</span></div>
        <a class="station" href="#trip">
          <div class="obj"><div class="mini-ticket"><div class="a"><b>PVG → KIX</b><span>11.20 · 红叶七日</span></div><div class="b">计划中</div></div></div>
          <span class="st st-plan">计划中</span>
          <div class="count">${by('plan').length}<small>处 · ${tripsActive} 次行程</small></div>
          <p>排进某一次旅行的某一天</p>
        </a>
        <div class="hop" aria-hidden="true"><span>出发</span></div>
        <a class="station" href="#map">
          <div class="obj"><div class="been-obj">${stamp(sag, { size: 'sm' })}${postmark('巴塞罗那', dot(sag.been), { cls: 'thunk' })}</div></div>
          <span class="st st-been">已去过</span>
          <div class="count">${by('been').length}<small>处</small></div>
          <p>盖上日期，就算数了</p>
        </a>
        <div class="hop" aria-hidden="true"><span>回填</span></div>
        <a class="station" href="#memories">
          <div class="obj"><div class="mini-card"><div class="photo" style="${cvars(lm.c)}">${art(lm.art, lm)}</div><div class="lines"><span class="hand">肉桂卷很好</span><i></i><i></i><i></i><i></i></div></div></div>
          <span class="st st-memo">回忆</span>
          <div class="count">${D.memories.length}<small>段</small></div>
          <p>评价、花费、照片，都补上</p>
        </a>
      </section>

      <div class="home-grid">
        <section>
          <div class="sh"><h2>下一次出发</h2><a class="more" href="#trip">全部 ${D.trips.length} 次行程</a></div>
          ${pass(k, { kicker: '下一次出发', action: '<a class="btn btn-sm" href="#trip" data-trip="kyoto">打开行程</a>' })}
        </section>
        <section>
          <div class="sh"><h2>出发前要做的</h2><span class="meta">${doneN}/${prep.length} 已完成</span></div>
          <div class="sheet prep-card"><ul class="prep-list">${prep.map((x, i) => [x, i]).filter(([x]) => !x.done).map(([x, i]) => checkItem(x, i, 'kyoto')).join('')}</ul></div>
        </section>
      </div>

      <section>
        <div class="sh"><h2>最近记下的</h2><a class="more" href="#places">全部 ${D.places.length} 处</a></div>
        <div class="album-strip">${recent.map(p => slot(p)).join('')}</div>
      </section>

      <div class="home-trio">
        <section class="sheet panel">
          <div class="sh"><h2>城里想去的</h2><span class="meta">本地 ${D.places.filter(p => p.local).length} 处</span></div>
          <ul class="local-list">${localWants.map(p => `<li>${stamp(p, { size: 'xs' })}<div><b>${esc(p.name)}</b><span>${esc(p.city)} · ${p.state === 'plan' ? '已排进本周六' : esc(p.tags.join(' · '))}</span></div><span class="w">${p.want} 分</span></li>`).join('')}</ul>
        </section>
        <section class="sheet memo-peek">
          <div class="sh"><h2>最近的回忆</h2><a class="more" href="#memories">全部 ${D.memories.length} 段</a></div>
          <div class="peek">
            <div class="photo-mount"><i></i><i></i><i></i><i></i><div class="photo" style="${cvars(lm.c)}">${art(lm.art, lm)}</div></div>
            <div><blockquote>${esc(lastMemo.note)}</blockquote><div class="who">${esc(lm.name)} · ${esc(lm.city)} · ${weeksAgo} 周前 · ${lastMemo.rating} 分</div></div>
          </div>
        </section>
        <section class="airmail teaser">
          <h2>一键整理</h2>
          <p>聊天记录、攻略整段贴进来，自动拆成下面五类，确认后一次写进行程。</p>
          <div class="flow"><span class="tag">行程信息</span><span class="tag">地点</span><span class="tag">日程</span><span class="tag">资料</span><span class="tag">回忆</span></div>
          <div class="eg"><span class="q">“嵯峨野小火车 11月3号早上10点开放预约”</span><span class="to"><span class="cat">资料 · 准备</span>11.03 10:00 抢小火车票</span></div>
          <a class="btn btn-seal" href="#sort">去整理</a>
        </section>
      </div>`;
  }

  /* ============================== 想去 ============================== */
  const pf = { scope: 'all', type: '', state: '', sort: 'want', q: '' };
  const TYPES = ['建筑', '餐馆', '城市', '自然', '咖啡'];

  function renderPlaces() {
    const total = D.places.length, local = D.places.filter(p => p.local).length;
    $('#view-places').innerHTML = `
      <header class="vh">
        <div><h1>想去</h1><p class="sub">一共 <b>${total}</b> 处 · 远方 <b>${total - local}</b> · 本地 <b>${local}</b>　面值就是想去程度，满分 5 分</p></div>
        <div class="vh-actions"><button class="btn btn-seal" data-open="wish">记下一个想去</button></div>
      </header>
      <div class="filters" role="group" aria-label="筛选">
        <div class="seg" role="group" aria-label="范围">${[['all', '全部'], ['far', '远方'], ['local', '本地']].map(([v, l]) => `<button data-f="scope" data-v="${v}" aria-pressed="${pf.scope === v}">${l}</button>`).join('')}</div>
        <div class="chips" role="group" aria-label="类型">${TYPES.map(t => `<button class="chip" data-f="type" data-v="${t}" aria-pressed="${pf.type === t}">${t}</button>`).join('')}</div>
        <div class="chips" role="group" aria-label="状态">${[['want', '想去'], ['plan', '计划中'], ['been', '已去过']].map(([v, l]) => `<button class="chip" data-f="state" data-v="${v}" aria-pressed="${pf.state === v}"><i class="sw ${v}"></i>${l}</button>`).join('')}</div>
        <label class="sr-only" for="sort-places">排序</label>
        <select id="sort-places" class="sort-sel"><option value="want">按想去程度</option><option value="added">按最近记下</option><option value="name">按名称</option></select>
        <label class="field" for="q-places">${ICON_SEARCH}<input id="q-places" type="search" placeholder="搜名称、城市、标签" value="${esc(pf.q)}" autocomplete="off"></label>
      </div>
      <div class="album" id="album" aria-live="polite"></div>`;
    $('#sort-places').value = pf.sort;
    renderAlbum();
  }

  function renderAlbum(thunkId) {
    const q = pf.q.trim().toLowerCase();
    let list = D.places.filter(p =>
      (pf.scope === 'all' || (pf.scope === 'local') === !!p.local) &&
      (!pf.type || p.type === pf.type) &&
      (!pf.state || p.state === pf.state) &&
      (!q || [p.name, p.city, p.country, ...p.tags].join(' ').toLowerCase().includes(q)));
    const sorters = { want: (a, b) => b.want - a.want || b.added.localeCompare(a.added), added: (a, b) => b.added.localeCompare(a.added), name: (a, b) => a.name.localeCompare(b.name, 'zh-CN') };
    list.sort(sorters[pf.sort]);
    $('#album').innerHTML = list.length
      ? list.map(p => slot(p, { acts: true, thunk: p.id === thunkId })).join('')
      : `<div class="empty"><b>没有符合的地点</b>换个筛选条件，或者把它记下来。<div style="margin-top:14px"><button class="btn btn-seal" data-open="wish">记下一个想去</button></div></div>`;
  }

  /* ============================== 行程 ============================== */
  let curTrip = 'kyoto', curTab = 'prep';
  const TABS = [['prep', '准备'], ['guide', '攻略'], ['booking', '预订'], ['note', '备注']];

  function renderTrip() {
    const t = T[curTrip];
    const cnt = s => D.trips.filter(x => x.status === s).length;
    $('#view-trip').innerHTML = `
      <header class="vh">
        <div><h1>行程</h1><p class="sub"><b>${D.trips.length}</b> 次旅行 · 计划中 <b>${cnt('plan')}</b> · 草拟 <b>${cnt('draft')}</b> · 已完成 <b>${cnt('done')}</b></p></div>
        <div class="vh-actions"><button class="btn btn-quiet" data-toast="新建行程：演示版里先用现有的四次旅行看看效果。">新建行程</button><a class="btn btn-seal" href="#sort">把攻略整理进来</a></div>
      </header>
      <div class="trip-tabs" role="tablist" aria-label="选择行程">${D.trips.map(x => `<button class="trip-tab" role="tab" aria-selected="${x.id === curTrip}" data-trip="${x.id}"><b>${esc(x.title)}</b><small>${x.end ? `${md(x.start)}${x.start !== x.end ? ' — ' + md(x.end) : ''}` : x.start.replace('-', '.') + ' · 待定'}</small>${statusPill(x.status)}</button>`).join('')}</div>
      ${pass(t, { lg: true, action: '<a class="btn btn-sm" href="#sort">整理攻略</a>' })}
      <div class="trip-body">
        <section aria-label="每日安排">
          <div class="sh"><h2>每日安排</h2><span class="meta">${t.days.length ? `${t.days.reduce((n, d) => n + d.items.length, 0)} 项` : ''}</span></div>
          ${t.days.length ? `<div class="days">${t.days.map((d, i) => dayBlock(d, i < 4, t)).join('')}</div>`
            : `<div class="no-days"><b>还没排日程</b><p>先把收藏的攻略贴进一键整理，它会按天拆出安排；也可以从"想去"里挑地点加进来。</p><a class="btn btn-seal" href="#sort">用攻略生成日程</a></div>`}
        </section>
        <aside class="folder" aria-label="计划资料">
          <div class="folder-tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === curTab}" data-tab="${k}">${l}<span class="num">${t.materials[k].length}</span></button>`).join('')}</div>
          <div class="folder-body" id="folder-body" role="tabpanel">${folderBody(t)}</div>
        </aside>
      </div>`;
  }

  function dayBlock(d, open, t) {
    return `<details class="day" ${open ? 'open' : ''}>
      <summary><span class="day-n">Day ${d.n}</span><span class="day-t"><h3>${esc(d.title)}</h3><span class="d">${d.date} ${d.wd}</span></span><span class="day-c">${d.items.length} 项</span></summary>
      <ol class="items">${d.items.map(it => itemRow(it)).join('')}</ol>
    </details>`;
  }

  function itemRow(it) {
    const p = it.place && P[it.place];
    const dotCls = p ? (p.state === 'been' ? 'been' : 'place') : '';
    const tags = [];
    if (it.tag) tags.push(`<span class="tag ${it.tag[0]}">${esc(it.tag[1])}</span>`);
    if (p) tags.push(`<span class="tag">来自想去 · ${p.want} 分</span>`);
    return `<li class="item"><time>${esc(it.t)}</time><span class="dot ${dotCls}" aria-hidden="true"></span>
      <div class="item-b"><span class="k">${esc(it.kind)}</span><b>${esc(it.title)}</b>${it.note ? `<p>${esc(it.note)}</p>` : ''}${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}</div>
      ${p ? `<div class="thumb">${stamp(p, { size: 'xs' })}</div>` : ''}</li>`;
  }

  function folderBody(t) {
    const m = t.materials;
    if (curTab === 'prep') {
      const done = m.prep.filter(x => x.done).length;
      return m.prep.length ? `<h3>准备事项<span class="num">${done}/${m.prep.length}</span></h3><ul class="prep-list">${m.prep.map((x, i) => checkItem(x, i, t.id)).join('')}</ul>` : emptyTab('准备事项');
    }
    if (curTab === 'guide') {
      return m.guide.length ? `<h3>攻略<span class="num">${m.guide.length} 篇</span></h3><ul class="guide-list">${m.guide.map(g => `<li><span class="src ${g.src === '小红书' ? 'xhs' : g.src === '官网' ? 'web' : ''}">${esc(g.src)}</span><a href="#trip" data-toast="演示版不跳转外链：${esc(g.title)}">${esc(g.title)}</a><small>${esc(g.by)} · 收藏于 ${esc(g.saved)}</small></li>`).join('')}</ul>` : emptyTab('攻略');
    }
    if (curTab === 'booking') {
      const sum = m.booking.reduce((n, b) => n + b.price, 0);
      return m.booking.length ? `<h3>预订<span class="num">${m.booking.length} 项</span></h3><div class="bookings">${m.booking.map(b => `<div class="bk"><div class="bk-kind">${esc(b.kind)}</div><div class="bk-b"><div class="top"><b>${esc(b.title)}</b><span class="num">${yen(b.price)}</span></div>${b.lines.map(l => `<span>${esc(l)}</span>`).join('')}<span class="ref">${esc(b.code)} · 确认号 ${esc(b.ref)}</span></div></div>`).join('')}
        <div class="bk-total"><span>已订合计</span><b>${yen(sum)}</b></div></div>` : emptyTab('预订');
    }
    return m.note.length ? `<h3>备注</h3><div class="note-paper">${m.note.map(n => `<p>${esc(n)}</p>`).join('')}</div>` : emptyTab('备注');
  }
  const emptyTab = name => `<div class="no-days" style="border:0;padding:12px 0"><b>还没有${name}</b><p>可以手动添加，也可以把聊天记录贴进一键整理，自动归到这里。</p><a class="btn btn-sm" href="#sort">去整理</a></div>`;

  /* ============================== 地图 ============================== */
  let mapMode = 'world', mapSel = '关西';
  const K = WORLD.k;
  function proj(lng, lat) {
    const l = lng * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
    const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [n1(WORLD.w / 2 + x * K), n1(-y * K - WORLD.y0)];
  }
  const LBL = { 关西: ['京都 · 大阪', 'r'], 冰岛南岸: ['冰岛', 'r'], 里斯本: ['里斯本', 'l'], 暹粒: ['吴哥窟', 'r'], 南岛: ['特卡波湖', 'l'], 伊斯坦布尔: ['伊斯坦布尔', 'r'], 巴塞罗那: ['巴塞罗那', 'b'], 清迈: ['清迈', 'l'], 大理: ['大理', 'l'] };
  const RANK = { want: 0, plan: 1, been: 2 };

  function clusters() {
    const map = new Map();
    D.places.filter(p => !p.local && (p.lat || p.lng)).forEach(p => {
      const key = ['fushimi', 'arashiyama', 'sakamichi', 'dotonbori'].includes(p.id) ? '关西' : p.city;
      if (!map.has(key)) map.set(key, { key, places: [], lat: 0, lng: 0 });
      map.get(key).places.push(p);
    });
    return [...map.values()].map(c => {
      c.lat = c.places.reduce((n, p) => n + p.lat, 0) / c.places.length;
      c.lng = c.places.reduce((n, p) => n + p.lng, 0) / c.places.length;
      c.state = c.places.map(p => p.state).sort((a, b) => RANK[a] - RANK[b])[0];
      if (c.places.some(p => p.state === 'plan')) c.state = 'plan';
      c.trip = c.places.find(p => p.trip)?.trip;
      return c;
    });
  }

  function pinShape(state, x, y) {
    if (state === 'want') return `<circle class="want" cx="${x}" cy="${y}" r="5"/>`;
    if (state === 'plan') return `<rect class="plan" x="${n1(x - 4.6)}" y="${n1(y - 4.6)}" width="9.2" height="9.2" transform="rotate(45 ${x} ${y})"/>`;
    return `<circle class="been-ring" cx="${x}" cy="${y}" r="7.5"/><circle class="been" cx="${x}" cy="${y}" r="4.2"/>`;
  }
  function arc(a, b, bend = .22) {
    const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    let nx = -(y2 - y1), ny = x2 - x1;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const len = Math.hypot(nx, ny) || 1, d = Math.hypot(x2 - x1, y2 - y1) * bend;
    return `M${x1} ${y1}Q${n1(mx + nx / len * d)} ${n1(my + ny / len * d)} ${x2} ${y2}`;
  }

  function worldSvg() {
    const cs = clusters();
    const home = proj(D.home.lng, D.home.lat);
    let routes = '', pins = '';
    cs.forEach(c => {
      const xy = proj(c.lng, c.lat);
      c.xy = xy;
      if (c.state === 'plan') routes += `<path class="rt ${T[c.trip]?.status === 'draft' ? 'draft' : 'plan'}" d="${arc(home, xy)}"/>`;
      if (c.state === 'been') routes += `<path class="rt been" d="${arc(home, xy, .18)}"/>`;
    });
    cs.forEach(c => {
      const [x, y] = c.xy, [name, side] = LBL[c.key] || [c.key, 'r'];
      const label = c.places.length > 1 ? `${name} ×${c.places.length}` : name;
      const lx = side === 'l' ? x - 11 : side === 'b' ? x : x + 11, ly = side === 'b' ? y + 20 : y + 4;
      const anchor = side === 'l' ? 'end' : side === 'b' ? 'middle' : 'start';
      const sel = c.key === mapSel;
      pins += `<g class="pin ${sel ? 'sel' : ''}" tabindex="0" role="button" aria-label="${esc(label)}，${c.places.length} 处" data-c="${esc(c.key)}">
        <circle class="hit" cx="${x}" cy="${y}" r="14"/>${sel ? `<circle class="sel-ring" cx="${x}" cy="${y}" r="12"/>` : ''}${pinShape(c.state, x, y)}
        <text class="pin-label ${sel ? 'sel' : ''}" x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(label)}</text></g>`;
    });
    pins += `<g class="pin ${mapSel === '上海' ? 'sel' : ''}" tabindex="0" role="button" aria-label="上海，家，本地 ${D.places.filter(p => p.local).length} 处" data-c="上海">
      <circle class="hit" cx="${home[0]}" cy="${home[1]}" r="14"/>${mapSel === '上海' ? `<circle class="sel-ring" cx="${home[0]}" cy="${home[1]}" r="12"/>` : ''}
      <rect class="home" x="${home[0] - 6}" y="${home[1] - 6}" width="12" height="12" rx="1.5"/><text x="${home[0]}" y="${home[1] + 3.6}" text-anchor="middle" style="font:400 9px var(--f-display);fill:var(--on-seal)">沪</text>
      <text class="pin-label" x="${home[0] + 9}" y="${home[1] + 19}">上海 · 家</text></g>`;
    return `<svg class="map-svg" viewBox="0 0 ${WORLD.w} ${WORLD.h}" role="img" aria-label="世界地图：想去、计划中、已去过的地点">
      <path class="ocean" d="${WORLD.outline}"/><path class="grat" d="${WORLD.grat}"/><path class="land" d="${WORLD.land}"/><path class="edge" d="${WORLD.outline}"/>
      ${routes}${pins}</svg>`;
  }

  function cityXY(p) {
    return [n1((p.lng - 121.38) / .22 * 1000), n1(435 - (p.lat - 31.17) / .17 * 435)];
  }
  function citySvg() {
    const locals = D.places.filter(p => p.local && (p.lat || p.lng));
    let pins = '';
    locals.forEach(p => {
      const [x, y] = cityXY(p), sel = mapSel === p.id;
      pins += `<g class="pin ${sel ? 'sel' : ''}" tabindex="0" role="button" aria-label="${esc(p.name)}" data-c="${p.id}"><circle class="hit" cx="${x}" cy="${y}" r="14"/>${sel ? `<circle class="sel-ring" cx="${x}" cy="${y}" r="12"/>` : ''}${pinShape(p.state, x, y)}
        <text class="pin-label ${sel ? 'sel' : ''}" x="${x + 12}" y="${y + 4}">${esc(p.name)}</text></g>`;
    });
    return `<svg class="map-svg" viewBox="0 0 1000 435" role="img" aria-label="上海本地地图">
      <rect class="ocean" width="1000" height="435"/>
      <path class="road" d="M0 312C200 298 360 286 520 262S760 226 1000 214"/>
      <path class="road" d="M452 0C448 120 440 220 430 300S410 400 400 435"/>
      <path class="road ring" d="M300 170C380 132 560 140 610 200S600 360 520 380 320 400 280 330 240 200 300 170Z"/>
      <path class="road" d="M120 0L250 435M700 0C690 120 640 200 600 270"/>
      <path class="river" stroke-width="22" d="M560 445C540 360 470 300 500 256C520 225 600 232 650 262C700 290 760 200 800 140C830 90 880 40 910 -10"/>
      <path class="river" stroke-width="8" d="M-5 236C80 210 140 260 220 238C300 216 340 250 400 236C450 225 470 252 500 246"/>
      <text class="city-label" x="612" y="330">黄浦江</text><text class="city-label" x="60" y="214">苏州河</text>
      <g><rect class="home" x="${327 - 6}" y="${368 - 6}" width="12" height="12" rx="1.5" style="fill:var(--seal)"/><text x="327" y="371.6" text-anchor="middle" style="font:400 9px var(--f-display);fill:var(--on-seal)">家</text></g>
      ${pins}</svg>`;
  }

  function renderMap() {
    const far = D.places.filter(p => !p.local), local = D.places.filter(p => p.local);
    const scope = mapMode === 'world' ? far : local;
    const n = s => scope.filter(p => p.state === s).length;
    const groups = [['want', '想去'], ['plan', '计划中'], ['been', '已去过']];
    $('#view-map').innerHTML = `
      <header class="vh">
        <div><h1>地图</h1><p class="sub">有经纬度的地点都在这里 · 远方 <b>${far.length}</b> · 本地 <b>${local.length}</b></p></div>
        <div class="vh-actions"><div class="seg" role="group" aria-label="地图范围">${[['world', '远方'], ['city', '本地 · 上海']].map(([v, l]) => `<button data-map="${v}" aria-pressed="${mapMode === v}">${l}</button>`).join('')}</div></div>
      </header>
      <div class="map-wrap">
        <section class="sheet map-card">
          <div class="map-bar">
            <div class="legend"><span><i class="swatch want"></i>想去 <span class="num">${n('want')}</span></span><span><i class="swatch plan"></i>计划中 <span class="num">${n('plan')}</span></span><span><i class="swatch been"></i>已去过 <span class="num">${n('been')}</span></span><span><i class="swatch home"></i>家</span></div>
            <span class="map-note">${mapMode === 'world' ? '虚线：计划中的航线　实线：去过的' : '示意图，不按真实比例'}</span>
          </div>
          <div class="map-scroll">${mapMode === 'world' ? worldSvg() : citySvg()}</div>
        </section>
        <div class="map-side">
          <div id="sel-card">${selCard()}</div>
          <div class="state-groups">${groups.map(([s, l]) => `<div><h3>${l}</h3><ul>${scope.filter(p => p.state === s).map(p => `<li><button data-pick="${p.id}">${esc(p.name)}</button></li>`).join('') || '<li style="font-size:13px;color:var(--ink-3)">暂无</li>'}</ul></div>`).join('')}</div>
        </div>
      </div>`;
  }

  function selCard() {
    let title, where, list;
    if (mapMode === 'city') {
      const p = P[mapSel] || D.places.find(x => x.local);
      title = p.name; where = `上海 · ${p.country} · ${p.city}`; list = [p];
    } else if (mapSel === '上海') {
      list = D.places.filter(p => p.local); title = '上海'; where = `家 · 本地 ${list.length} 处，切到"本地"看细节`;
    } else {
      const c = clusters().find(x => x.key === mapSel) || clusters()[0];
      list = c.places; title = (LBL[c.key] || [c.key])[0]; where = `${[...new Set(list.map(p => p.country))].join(' · ')} · ${list.length} 处`;
    }
    return `<section class="sheet sel-card" aria-live="polite"><div><h2>${esc(title)}</h2><div class="where">${esc(where)}</div></div>
      <ul class="sel-list">${list.map(p => `<li>${stamp(p, { size: 'xs' })}<div><b>${esc(p.name)}</b>${stateLine(p)}</div></li>`).join('')}</ul></section>`;
  }

  /* ============================== 回忆 ============================== */
  function renderMemories() {
    const been = D.places.filter(p => p.state === 'been');
    const pending = been.filter(p => !D.memories.some(m => m.place === p.id));
    const total = D.memories.reduce((n, m) => n + m.costCny, 0);
    const years = [...new Set(D.memories.map(m => m.date.slice(0, 4)))];
    $('#view-memories').innerHTML = `
      <header class="vh">
        <div><h1>回忆</h1><p class="sub"><b>${D.memories.length}</b> 段 · 去过 <b>${been.length}</b> 处 · 一共花了 <b>${yen(total)}</b></p></div>
        <div class="vh-actions"><button class="btn btn-seal" data-toast="演示版：这里会打开回填表单，评价、花费、照片一次填完。">写一段回忆</button></div>
      </header>
      ${pending.map(p => `<div class="backfill"><div class="txt"><b>${esc(p.name)}</b> · ${esc(p.city)}　${dot(p.been)} 去过，还没写回忆。</div><button class="btn btn-sm" data-toast="演示版：会打开「${esc(p.name)}」的回填表单。">现在写</button></div>`).join('')}
      ${years.map(y => {
        const ms = D.memories.filter(m => m.date.startsWith(y));
        return `<section class="year"><div class="year-h"><h2>${y}</h2><span>${ms.length} 段 · ${[...new Set(ms.map(m => P[m.place].local ? '上海' : P[m.place].city))].join('、')}</span></div>
          <div class="cards">${ms.map((m, i) => postcard(m, i)).join('')}</div></section>`;
      }).join('')}`;
  }

  function postcard(m, i) {
    const p = P[m.place];
    const [y, mo, d] = m.date.split('-');
    const tilt = [-.5, .45, -.3, .6, -.2][i % 5];
    return `<article class="postcard" style="--tilt:${tilt}deg">
      <div>
        <div class="photo-mount"><i></i><i></i><i></i><i></i><div class="photo" style="${cvars(p.c)}">${art(p.art, p)}<span class="stamp-date">'${y.slice(2)} ${+mo} ${+d}</span></div></div>
        <div class="photo-count" style="${cvars(p.c)}"><span class="thumbs"><b></b><b></b><b></b></span>${m.photos} 张照片</div>
      </div>
      <div class="pc-back">
        <div class="head"><h3>${esc(p.name)}</h3><div class="where">${esc(p.local ? '上海 · ' + p.city : p.country + ' · ' + p.city)}</div></div>
        <div class="corner">${stamp(p, { size: 'xs' })}${postmark(pmCity(p), dot(m.date))}</div>
        <p class="hand">${esc(m.note)}</p>
        <div class="facts"><span>评价 <span class="dots" role="img" aria-label="${m.rating} 分，满分 5 分">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= m.rating ? 'on' : ''}"></i>`).join('')}</span></span><span>花费 <b>${esc(m.cost)}</b></span><span>${dot(m.date)}</span></div>
      </div>
    </article>`;
  }

  /* ============================== 一键整理 ============================== */
  let sortRun = 0, written = false;
  function renderSort() {
    const prov = D.providers.find(p => p.active);
    $('#view-sort').innerHTML = `
      <header class="vh">
        <div><h1>一键整理</h1><p class="sub">把聊天记录、攻略整段贴进来，拆成行程信息、地点、日程、资料、回忆，确认后一次写入。</p></div>
        <div class="vh-actions"><a class="btn btn-quiet" href="#providers">AI 服务商：${esc(prov.name)}</a></div>
      </header>
      <div class="sort-grid">
        <div class="sort-left">
          <div class="sort-opts">
            <div class="sel-field"><label for="sort-trip">整理到</label><select id="sort-trip">${D.trips.filter(t => t.status !== 'done').map(t => `<option value="${t.id}">${esc(t.title)} ${esc(t.subtitle)}</option>`).join('')}</select></div>
            <div class="sel-field"><label for="sort-prov">使用</label><select id="sort-prov">${D.providers.map(p => `<option value="${p.id}" ${p.active ? 'selected' : ''}>${esc(p.name)} · ${esc(p.model)}</option>`).join('')}</select></div>
          </div>
          <div class="envelope airmail">
            <div class="env-head"><b>贴进来的内容</b><span id="char-n">${D.aiSample.length} 字</span></div>
            <label class="sr-only" for="sort-text">贴进来的内容</label>
            <textarea id="sort-text" spellcheck="false">${esc(D.aiSample)}</textarea>
          </div>
          <div class="sort-acts">
            <button class="btn btn-seal" id="run-sort">拆开整理</button>
            <button class="btn btn-quiet" id="clear-sort">清空</button>
            <p>整理结果先列在右边，勾掉不要的，再写入。</p>
          </div>
        </div>
        <section aria-label="整理结果">
          <div class="result-h"><h2>整理结果</h2><span class="meta" id="sort-meta">2 分钟前 · ${esc(prov.name)} · 用时 6.2 秒</span></div>
          <div class="trays" id="trays">${traysHtml()}</div>
          <div class="commit"><p id="commit-txt"></p><button class="btn btn-seal" id="commit-btn">全部写入</button></div>
        </section>
      </div>`;
    updateCommit();
  }

  function traysHtml() {
    const r = D.aiResult;
    let i = 0;
    const ck = inner => `<li class="slip" style="--i:${i++}"><label class="check"><input type="checkbox" checked><span class="box" aria-hidden="true"></span><span class="txt">${inner}</span></label></li>`;
    const tray = (title, n, body, wide) => `<div class="tray sheet ${wide ? 'wide' : ''}"><div class="tray-h"><h3>${title}</h3><span class="n">${n}</span></div>${body}</div>`;
    return tray('行程信息', r.trip.length, `<ul class="slips">${r.trip.map(x => ck(`<span class="diff"><span>${esc(x.field)}</span><del>${esc(x.from)}</del><span aria-hidden="true">→</span><ins>${esc(x.to)}</ins><span class="op upd">更新</span><span class="why">依据：${esc(x.why)}</span></span>`)).join('')}</ul>`, true)
      + tray('地点', r.places.length, `<ul class="slips">${r.places.map(x => ck(`<span class="row-art"><span class="mini-art">${stamp({ ...x, want: 4, art: x.art, c: x.c, country: '' }, { size: 'xs' })}</span><span><b>${esc(x.name)}</b><span class="s">${esc(x.meta)}</span></span><span class="op new">新地点</span></span>`)).join('')}</ul>`)
      + tray('日程', r.items.length, `<ul class="slips">${r.items.map(x => ck(`<span class="row"><span><span class="w">${esc(x.when)}</span><br><b>${esc(x.title)}</b><span class="s">${esc(x.note)}</span></span><span class="op ${x.op}">${x.op === 'new' ? '新增' : '更新'}</span></span>`)).join('')}</ul>`)
      + tray('资料', r.materials.length, `<ul class="slips">${r.materials.map(x => ck(`<span class="row"><span><b>${esc(x.title)}</b>${x.note ? `<span class="s">${esc(x.note)}</span>` : ''}</span><span class="cat">${esc(x.cat)}</span></span>`)).join('')}</ul>`)
      + tray('回忆', r.memories.length, `<div class="tray-empty">这段内容讲的都是还没去的安排，没有可以记成回忆的。</div>`);
  }

  function updateCommit() {
    const n = $$('#trays input[type=checkbox]:checked').length;
    const t = T[$('#sort-trip')?.value || 'kyoto'];
    $('#commit-txt').innerHTML = written ? `已写入「${esc(t.title)} ${esc(t.subtitle)}」` : `已选 <b>${n}</b> 条，写入「${esc(t.title)} ${esc(t.subtitle)}」`;
    const b = $('#commit-btn');
    b.disabled = written || n === 0;
    b.textContent = written ? '已写入' : `写入 ${n} 条`;
  }

  /* ============================== AI 服务商 ============================== */
  function renderProviders() {
    $('#view-providers').innerHTML = `
      <header class="vh">
        <div><h1>AI 服务商</h1><p class="sub">兼容 OpenAI 接口的服务都能接入，一键整理时用启用中的那一个。</p></div>
        <div class="vh-actions"><a class="btn btn-quiet" href="#sort">回到一键整理</a></div>
      </header>
      <div class="prov-grid">
        <div class="prov-list">${D.providers.map(p => `
          <article class="prov sheet ${p.active ? 'on' : ''}">
            <div class="prov-top"><h3>${esc(p.name)}</h3><span class="used">${esc(p.used)}</span></div>
            <dl><dt>接口地址</dt><dd>${esc(p.base)}</dd><dt>模型</dt><dd>${esc(p.model)}</dd><dt>密钥</dt><dd>${esc(p.key)}</dd></dl>
            <div class="acts">${p.active ? '' : `<button class="btn btn-sm" data-use="${p.id}">设为启用</button>`}<button class="btn btn-sm btn-quiet" data-toast="演示版：会打开「${esc(p.name)}」的编辑表单。">编辑</button><button class="btn btn-sm btn-quiet" data-toast="${esc(p.name)} 连接正常，模型有响应（0.8 秒）。">测试连接</button></div>
            ${p.active ? '<span class="rubber" aria-label="使用中">使用中</span>' : ''}
          </article>`).join('')}
        </div>
        <form class="sheet prov-form" id="prov-form" novalidate>
          <h2>添加服务商</h2>
          <p>填好以后先测试连接，通过了再保存。</p>
          <div class="sel-field"><label for="pv-name">名称</label><input id="pv-name" placeholder="比如：Kimi" autocomplete="off"></div>
          <div class="sel-field"><label for="pv-base">接口地址</label><input id="pv-base" placeholder="https://api.moonshot.cn/v1" autocomplete="off"></div>
          <div class="sel-field"><label for="pv-model">模型</label><input id="pv-model" placeholder="moonshot-v1-32k" autocomplete="off"></div>
          <div class="sel-field"><label for="pv-key">密钥</label><input id="pv-key" type="password" placeholder="sk-…" autocomplete="off"></div>
          <div class="row"><button type="button" class="btn" id="pv-test">测试连接</button><button type="submit" class="btn btn-seal">保存</button></div>
          <p class="hint">密钥只保存在你自己的服务器上，页面里只显示后四位。</p>
        </form>
      </div>`;
  }

  /* ============================== 记下一个想去 ============================== */
  function wishPreview() {
    const type = $('input[name=w-type]:checked').value;
    const [artK, c] = TYPE_ART[type];
    const city = $('#w-city').value.trim();
    const local = $('#w-local').checked;
    const parts = city.split(/[，,、\s]+/).filter(Boolean);
    const p = { name: $('#w-name').value.trim() || '新的想去', want: +$('input[name=w-want]:checked').value, art: artK, c, local, country: local ? (parts[0] || '本地') : (parts[1] || parts[0] || '远方'), city: parts[0] || '' };
    $('#wish-stamp').innerHTML = stamp(p);
    return p;
  }

  /* ============================== 路由与导航 ============================== */
  const VIEWS = ['home', 'places', 'trip', 'map', 'memories', 'sort', 'providers'];
  function navCounts() {
    $('[data-n=places]').textContent = D.places.length;
    $('[data-n=trip]').textContent = D.trips.length;
    $('[data-n=memories]').textContent = D.memories.length;
  }
  function route() {
    let v = location.hash.slice(1);
    if (!VIEWS.includes(v)) v = 'home';
    VIEWS.forEach(k => { $('#view-' + k).hidden = k !== v; });
    $$('.nav a').forEach(a => (a.dataset.v === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    document.title = v === 'home' ? '远方清单' : `${$(`.nav a[data-v=${v}] .lbl`).textContent} · 远方清单`;
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function renderAll() {
    renderHome(); renderPlaces(); renderTrip(); renderMap(); renderMemories(); renderSort(); renderProviders(); navCounts();
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('button, a, .pin');
    if (!el) return;

    if (el.dataset.toast) { e.preventDefault(); toast(el.dataset.toast); return; }
    if (el.dataset.open === 'wish') { openWish(); return; }

    // 想去 · 筛选
    if (el.dataset.f) {
      const k = el.dataset.f, v = el.dataset.v;
      pf[k] = k === 'scope' ? v : (pf[k] === v ? '' : v);
      $$(`[data-f=${k}]`).forEach(b => b.setAttribute('aria-pressed', String(pf[k] === b.dataset.v)));
      renderAlbum();
      return;
    }
    // 想去 · 操作
    if (el.dataset.act) {
      const p = P[el.dataset.id];
      if (el.dataset.act === 'been') {
        p.state = 'been'; p.been = D.today; delete p.day;
        renderAlbum(p.id); renderHome(); renderMap(); renderMemories();
        toast(`已盖章：${p.name} 记为去过（${dot(D.today)}）`);
      } else if (el.dataset.act === 'plan') {
        p.state = 'plan'; p.trip = p.local ? 'weekend' : 'iceland';
        renderAlbum(); renderHome(); renderMap();
        toast(`已加入「${T[p.trip].title} ${T[p.trip].subtitle}」，日程里还没排具体哪天。`);
      }
      return;
    }
    // 行程
    if (el.dataset.trip && (el.classList.contains('trip-tab') || el.getAttribute('href') === '#trip')) {
      curTrip = el.dataset.trip;
      renderTrip();
      return;
    }
    if (el.dataset.tab) {
      curTab = el.dataset.tab;
      $$('.folder-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === curTab)));
      $('#folder-body').innerHTML = folderBody(T[curTrip]);
      return;
    }
    // 地图
    if (el.dataset.map) {
      mapMode = el.dataset.map;
      mapSel = mapMode === 'world' ? '关西' : 'banceng';
      renderMap();
      return;
    }
    if (el.classList.contains('pin')) { mapSel = el.dataset.c; renderMap(); return; }
    if (el.dataset.pick) {
      const p = P[el.dataset.pick];
      if (p.local) { mapMode = 'city'; mapSel = p.id; }
      else { mapMode = 'world'; mapSel = clusters().find(c => c.places.includes(p)).key; }
      renderMap();
      return;
    }
    // 一键整理
    if (el.id === 'run-sort') {
      const txt = $('#sort-text').value.trim();
      if (!txt) { toast('先把要整理的内容贴进来。'); $('#sort-text').focus(); return; }
      el.disabled = true; el.textContent = '正在拆信…';
      $('#sort-meta').textContent = '正在请求 ' + $('#sort-prov').selectedOptions[0].textContent + '…';
      const run = ++sortRun;
      setTimeout(() => {
        if (run !== sortRun) return;
        written = false;
        const trays = $('#trays');
        trays.classList.remove('sorting');
        trays.innerHTML = traysHtml();
        void trays.offsetWidth;
        trays.classList.add('sorting');
        el.disabled = false; el.textContent = '重新整理';
        $('#sort-meta').textContent = '刚刚 · ' + $('#sort-prov').selectedOptions[0].textContent.split(' · ')[0] + ' · 用时 1.6 秒';
        updateCommit();
      }, 1600);
      return;
    }
    if (el.id === 'clear-sort') { $('#sort-text').value = ''; $('#char-n').textContent = '0 字'; $('#sort-text').focus(); return; }
    if (el.id === 'commit-btn') {
      const n = $$('#trays input[type=checkbox]:checked').length;
      const t = T[$('#sort-trip').value];
      written = true; updateCommit();
      toast(`已写入 ${n} 条到「${t.title} ${t.subtitle}」`);
      return;
    }
    // 服务商
    if (el.dataset.use) {
      D.providers.forEach(p => { p.active = p.id === el.dataset.use; });
      renderProviders(); renderSort();
      toast(`已启用 ${D.providers.find(p => p.active).name}，之后的整理都用它。`);
      return;
    }
    if (el.id === 'pv-test') {
      const base = $('#pv-base').value.trim(), key = $('#pv-key').value.trim();
      toast(base && key ? '连接正常，模型有响应（0.8 秒）。' : '先填好接口地址和密钥，再测试连接。');
      return;
    }
    if (el.id === 'wish-cancel') { $('#wish').close(); return; }
  });

  document.addEventListener('keydown', e => {
    const pin = e.target.closest?.('.pin');
    if (pin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pin.click(); }
    if (e.target.id === 'q-home' && e.key === 'Enter') {
      pf.q = e.target.value; renderPlaces(); location.hash = 'places';
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'q-places') { pf.q = e.target.value; renderAlbum(); }
    if (e.target.id === 'sort-text') $('#char-n').textContent = e.target.value.length + ' 字';
    if (e.target.closest('#wish-form')) wishPreview();
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'sort-places') { pf.sort = t.value; renderAlbum(); return; }
    if (t.matches('input[data-trip][data-i]')) {
      T[t.dataset.trip].materials.prep[+t.dataset.i].done = t.checked;
      renderHome();
      if (curTrip === t.dataset.trip && curTab === 'prep') $('#folder-body').innerHTML = folderBody(T[curTrip]);
      return;
    }
    if (t.closest('#trays') || t.id === 'sort-trip') { updateCommit(); return; }
    if (t.closest('#wish-form')) wishPreview();
  });

  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'prov-form') {
      const name = $('#pv-name').value.trim(), base = $('#pv-base').value.trim(), key = $('#pv-key').value.trim();
      if (!name || !base || !key) { toast('名称、接口地址和密钥都要填。'); return; }
      D.providers.push({ id: 'p' + Date.now(), name, base, model: $('#pv-model').value.trim() || '未填写', key: 'sk-••••••••••••' + key.slice(-4), active: false, used: '刚刚添加' });
      renderProviders(); renderSort();
      toast(`已保存：${name}`);
      return;
    }
    if (e.target.id === 'wish-form') {
      const name = $('#w-name').value.trim();
      if (!name) { $('#w-name').focus(); toast('先写下地点的名字。'); return; }
      const p = wishPreview();
      const tags = $('#w-tags').value.trim().split(/\s+/).filter(Boolean);
      D.places.unshift({ ...p, id: 'w' + Date.now(), name, type: $('input[name=w-type]:checked').value, tags, state: 'want', added: D.today, lat: 0, lng: 0 });
      reindex();
      pf.scope = 'all'; pf.type = ''; pf.state = ''; pf.q = ''; pf.sort = 'added';
      renderPlaces(); renderHome(); navCounts();
      $('#wish').close();
      location.hash = 'places';
      toast(`已收进想去：${name}`);
    }
  });

  function openWish() {
    const dlg = $('#wish');
    $('#wish-form').reset();
    wishPreview();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(() => $('#w-name').focus(), 30);
  }

  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

  const d = TODAY;
  const CN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const cnDay = n => (n <= 10 ? CN[n] : n < 20 ? '十' + CN[n - 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : ''));
  $('#date-v').textContent = `${CN[d.getMonth() + 1]}月${cnDay(d.getDate())}日　${WD[d.getDay()]}`;

  renderAll();
  route();
})();
