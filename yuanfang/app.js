/* 远方清单 · 演示脚本
   只做界面与交互演示：所有数据来自 data.js，改动只存在当前页面里，刷新即恢复。
   设计上的几个约定：
   - 任何会改数据的操作都走 act()，自动带「撤销」。
   - 记东西永远只要一步：/ 或「+」打开搜索框，输入名字回车就存下，其余信息以后再补。
   - 点任何一枚邮票都打开同一个地点抽屉，状态链上的下一步就是抽屉里最显眼的按钮。 */
(() => {
  'use strict';

  const D = window.DATA;
  const WORLD = window.WORLD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n1 = v => Math.round(v * 10) / 10;
  let P = {}, T = {};
  const reindex = () => {
    P = Object.fromEntries(D.places.map(p => [p.id, p]));
    T = Object.fromEntries(D.trips.map(t => [t.id, t]));
  };
  reindex();

  /* ---------- 日期与小工具 ---------- */
  const pd = s => new Date(s + 'T00:00:00');
  const TODAY = pd(D.today);
  const MONTH = TODAY.getMonth() + 1;
  const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const daysUntil = s => Math.round((pd(s) - TODAY) / 864e5);
  const dot = s => s.replaceAll('-', '.');
  const md = s => s.slice(5).replace('-', '.');
  const yen = n => '¥' + Math.round(Number(n)).toLocaleString('en-US');
  const toMin = s => { const m = /^(\d{1,2})[:：](\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const span = m => (m >= 60 ? `${Math.floor(m / 60)} 小时${m % 60 ? ` ${m % 60} 分` : ''}` : `${m} 分钟`);
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const norm = s => String(s || '').replace(/[\s·・,，、]/g, '').toLowerCase();

  const alive = () => D.places.filter(p => !p.dropped);
  const areaOf = p => p.area || (p.local ? '上海' : (p.city || '未分组'));
  const memosOf = id => D.memories.filter(m => m.place === id);
  const activeTrips = () => D.trips.filter(t => t.status !== 'done');
  const whereOf = p => (p.local ? `上海 · ${p.city}` : [p.country, p.city].filter(Boolean).join(' · ') || '还没填地方');

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
  const TYPES = ['建筑', '餐馆', '城市', '自然', '咖啡'];
  const TYPE_ART = { 建筑: ['arches', ['#E9DFD0', '#6B3A22', '#C48C5C']], 餐馆: ['bowl', ['#F4D6CF', '#8A2618', '#DD7B5E']], 城市: ['hillcity', ['#F4D8D5', '#7B2A37', '#E3A35A']], 自然: ['mountains', ['#D5E7EB', '#1C4B5A', '#7DB4C1']], 咖啡: ['cup', ['#EBDDCB', '#56331E', '#BA875D']] };

  const art = (k, o = {}) => `<svg class="art" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(ART[k] || ART.mountains)(o)}</svg>`;
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
  const pmCity = p => (p.local ? '上海' : (p.city || p.country || '远方').split(' ')[0]);

  /* ---------- 邮票 ---------- */
  const fresh = new Set();          // 刚盖章的地点：渲染时播放盖章动画
  const freshItems = new WeakSet(); // 刚加进日程的条目：渲染时闪一下

  function stampFace(p, size = '') {
    const country = p.local ? `沪 · ${p.country}` : p.country;
    const label = size === 'xs' ? '' : `<span class="stamp-country">${esc(country)}</span><span class="stamp-denom">${p.want}<small>分</small></span>`;
    return `<div class="stamp ${size}"><div class="stamp-face" style="${cvars(p.c)}">${art(p.art, p)}${label}</div></div>`;
  }
  function stamp(p, { size = '', mark = false, clip = false, open = false } = {}) {
    let extra = '';
    if (mark && p.state === 'been' && p.been) extra += postmark(pmCity(p), dot(p.been), { cls: fresh.has(p.id) ? 'thunk' : '' });
    if (clip && p.state === 'plan' && T[p.trip]) extra += `<span class="clip">${esc(T[p.trip].subtitle)}${p.day ? ` · D${p.day}` : ''}</span>`;
    return `<div class="stamp-wrap ${p.dropped ? 'is-dropped' : ''}" ${open ? `data-place="${p.id}"` : ''}>${stampFace(p, size)}${extra}</div>`;
  }

  function stateLine(p) {
    if (p.dropped) return '<span class="st st-draft">已放下</span>';
    if (p.state === 'been') return `<span class="st st-been">${p.been ? dot(p.been).slice(0, 7) + ' ' : ''}去过</span>`;
    if (p.state === 'plan' && T[p.trip]) return `<span class="st st-plan">${esc(T[p.trip].subtitle)}${p.day ? ` · Day ${p.day}` : ''}</span>`;
    return '<span class="st st-want">想去</span>';
  }

  function months(p, sm = false) {
    const on = p.season || [];
    const label = on.length ? `最适合 ${on.join('、')} 月` : '全年都可以';
    return `<span class="months ${sm ? 'sm' : ''}" role="img" aria-label="${label}">${Array.from({ length: 12 }, (_, i) => `<i class="${on.includes(i + 1) ? 'on' : ''} ${i + 1 === MONTH ? 'now' : ''}">${sm ? '' : i + 1}</i>`).join('')}</span>`;
  }

  function slot(p, { acts = false } = {}) {
    let a = '';
    if (acts) {
      if (p.dropped) a = `<button class="btn btn-sm" data-undrop="${p.id}">重新想去</button>`;
      else if (p.state === 'want') a = `<button class="btn btn-sm" data-plan="${p.id}">加入行程</button><button class="btn btn-sm btn-quiet" data-been="${p.id}">标记去过</button>`;
      else if (p.state === 'plan') a = `<a class="btn btn-sm" href="#trip" data-trip="${p.trip}">看行程</a><button class="btn btn-sm btn-quiet" data-been="${p.id}">盖章</button>`;
      else a = memosOf(p.id).length ? '<a class="btn btn-sm" href="#memories">看回忆</a>' : `<button class="btn btn-sm" data-memo="${p.id}">写回忆</button>`;
      a = `<div class="slot-acts">${a}</div>`;
    }
    return `<article class="slot" data-id="${p.id}">${stamp(p, { mark: true, clip: true, open: true })}
      <div class="caption">
        <h3><button class="linklike" data-place="${p.id}">${esc(p.name)}</button></h3>
        <div class="loc">${p.local ? '<span class="local">本地</span>' : ''}<span>${esc(p.local ? p.city : (p.city || '还没填城市'))} · ${esc(p.type)}</span></div>
        ${p.tags.length ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
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
    const dates = t.end ? (t.start === t.end ? `${md(t.start)}<small>${WD[pd(t.start).getDay()]} · 1 天</small>` : `${md(t.start)}–${md(t.end)}<small>共 ${len} 天</small>`) : `${esc(t.start.replace('-', '.'))}<small>日期待定</small>`;
    const over = t.budget && t.spent > t.budget;
    const pct = t.budget ? Math.min(100, Math.round(t.spent / t.budget * 100)) : 0;
    let stub;
    if (t.status === 'done') {
      stub = `<div class="countdown"><small>回来</small><b>${Math.round((TODAY - pd(t.end)) / 864e5 / 30)}</b><span>个月了</span></div><a class="btn btn-sm" href="#memories">看回忆</a>`;
    } else if (t.status === 'draft') {
      stub = `<div class="countdown"><small>还在草拟</small><b>${t.progress}<span class="pct">%</span></b><span>想清楚了</span></div><a class="btn btn-sm" href="#sort">用攻略补全</a>`;
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
          <div><dt>${t.status === 'done' ? '花费 / 预算' : '已订 / 预算'}</dt><dd>${yen(t.spent)} / ${t.budget ? yen(t.budget) : '未定'}</dd><div class="budget-bar ${over ? 'over' : ''}"><i style="width:${pct}%"></i></div></div>
          <div><dt>同行</dt><dd style="font-family:var(--f-body)">${esc(t.people)}</dd></div>
        </dl>
        <div class="punch"><span class="punch-label">准备进度 <b>${t.progress}%</b></span><span class="holes" role="img" aria-label="准备进度 ${t.progress}%">${Array.from({ length: holes }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span></div>
      </div>
      <div class="pass-stub">${stub}</div>
    </article>`;
  }

  function checkItem(x, i, tripId) {
    return `<li><label class="check"><input type="checkbox" data-prep="${tripId}" data-i="${i}" ${x.done ? 'checked' : ''}><span class="box" aria-hidden="true"></span><span class="txt">${esc(x.text)}${x.due ? `<span class="due">${esc(x.due)}</span>` : ''}${x.meta ? `<span class="aside">${esc(x.meta)}</span>` : ''}</span></label></li>`;
  }

  /* ---------- 改数据：统一入口，自动可撤销 ---------- */
  function act(msg, fn, opts = {}) {
    const snap = structuredClone(D);
    fn();
    refresh();
    toast(msg, { undo: () => { restore(snap); opts.onUndo?.(); refresh(); toast('已撤销'); }, action: opts.action });
  }
  function restore(snap) {
    Object.keys(D).forEach(k => { delete D[k]; });
    Object.assign(D, snap);
  }

  function markBeen(p, date) {
    p.state = 'been';
    p.been = date;
    delete p.dropped;
    fresh.add(p.id);
  }
  function addToTrip(p, tripId, dayN, time = '待定') {
    const t = T[tripId];
    if ((p.trip && T[p.trip] && p.trip !== tripId) || p.day) removeFromDays(p);
    p.state = 'plan';
    p.trip = tripId;
    delete p.dropped;
    if (dayN && t.days[dayN - 1]) {
      p.day = dayN;
      const it = { t: time, kind: p.type, title: p.name, note: p.note || '', place: p.id };
      insertItem(t.days[dayN - 1], it);
      openDays(tripId).add(dayN - 1);
      freshItems.add(it);
    } else {
      delete p.day;
    }
  }
  function removeFromDays(p) {
    D.trips.forEach(t => t.days.forEach(d => { d.items = d.items.filter(it => it.place !== p.id); }));
  }
  function insertItem(day, it) {
    day.items.push(it);
    day.items.sort((a, b) => (toMin(a.t) ?? 9999) - (toMin(b.t) ?? 9999));
  }
  function suggestedTrip(p) {
    return activeTrips().filter(t => !!t.local === !!p.local).find(t => t.area === areaOf(p)) || null;
  }

  /* ============================== 总览 ============================== */
  function seasonPicks() {
    const pool = alive().filter(p => p.state === 'want' && (p.season || []).includes(MONTH));
    const hasTrip = p => !p.local && suggestedTrip(p) && suggestedTrip(p).days.length;
    const withTrip = pool.filter(hasTrip).sort((a, b) => b.want - a.want);
    const locals = pool.filter(p => p.local).sort((a, b) => b.want - a.want);
    const far = pool.filter(p => !p.local && !hasTrip(p)).sort((a, b) => b.want - a.want);
    const out = [...withTrip.slice(0, 1), ...locals.slice(0, 1), ...far.slice(0, 2)];
    [...withTrip, ...locals, ...far].forEach(p => { if (out.length < 4 && !out.includes(p)) out.push(p); });
    return out.slice(0, 4);
  }
  function seasonCard(p) {
    const t = suggestedTrip(p);
    let why = p.seasonNote || '', btn;
    if (p.local && T.weekend) {
      why += '，就在城里';
      btn = `<button class="btn btn-sm" data-quickplan="${p.id}" data-to="weekend">排进本周六</button>`;
    } else if (t && t.days.length) {
      why += `。你 ${md(t.start)}–${md(t.end)} 正好在${t.area}`;
      btn = `<button class="btn btn-sm btn-seal" data-plan="${p.id}" data-pre="${t.id}">加进${esc(t.subtitle)}</button>`;
    } else {
      btn = `<button class="btn btn-sm btn-quiet" data-place="${p.id}">看看</button>`;
    }
    return `<article class="sea-card">
      <div class="sea-stamp">${stamp(p, { size: 'sm', open: true })}</div>
      <div class="sea-b">
        <h3><button class="linklike" data-place="${p.id}">${esc(p.name)}</button></h3>
        <p>${esc(why)}</p>
        ${months(p, true)}
        <div>${btn}</div>
      </div>
    </article>`;
  }

  function renderHome() {
    const k = T.kyoto;
    const prep = k.materials.prep;
    const undone = prep.filter(x => !x.done);
    const doneN = prep.length - undone.length;
    const by = s => alive().filter(p => p.state === s);
    const tripsActive = activeTrips().length;
    const fanIds = ['lisbon', 'tekapo', 'istanbul'].filter(id => P[id]);
    const recent = [...alive()].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 6);
    const localWants = alive().filter(p => p.local && p.state !== 'been').sort((a, b) => b.want - a.want).slice(0, 4);
    const memos = [...D.memories].sort((a, b) => b.date.localeCompare(a.date));
    const lastMemo = memos[0];
    const lm = P[lastMemo.place];
    const weeksAgo = Math.max(1, Math.round(Math.abs(TODAY - pd(lastMemo.date)) / 864e5 / 7));
    const nextDue = undone.find(x => x.due);
    const sag = P.sagrada;
    const picks = seasonPicks();

    $('#view-home').innerHTML = `
      <div class="home-top">
        <div class="today">${dot(D.today)} · ${WD[TODAY.getDay()]} · ${D.home.city}</div>
        <button class="field field-btn" data-open="palette">${ICON_SEARCH}<span>搜索，或记下一个想去</span><kbd>/</kbd></button>
      </div>

      <section class="hero">
        <h1><span class="d">${daysUntil(k.start)}</span> 天后，<br>去京都看红叶。</h1>
        <p class="lede">还有 <b>${undone.length} 件准备事项</b>没做完${nextDue ? `，最近的一件是<b>${esc(nextDue.due)} ${esc(nextDue.text)}</b>` : ''}。</p>
        <a class="more hero-link" href="#today">出发那天，这一页会换成「今天」：下一站、预订、打卡都在一处 →</a>
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
        <div class="hop" aria-hidden="true"><span>到了，盖章</span></div>
        <a class="station" href="#map">
          <div class="obj"><div class="been-obj">${stamp(sag, { size: 'sm' })}${postmark('巴塞罗那', dot(sag.been), { cls: 'thunk' })}</div></div>
          <span class="st st-been">已去过</span>
          <div class="count">${by('been').length}<small>处</small></div>
          <p>盖上日期，就算数了</p>
        </a>
        <div class="hop" aria-hidden="true"><span>回填</span></div>
        <a class="station" href="#memories">
          <div class="obj"><div class="mini-card"><div class="photo" style="${cvars(lm.c)}">${art(lm.art, lm)}</div><div class="lines"><span class="hand">${esc((lastMemo.note || '').slice(0, 6))}</span><i></i><i></i><i></i><i></i></div></div></div>
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
          <div class="sheet prep-card"><ul class="prep-list">${prep.map((x, i) => [x, i]).filter(([x]) => !x.done).map(([x, i]) => checkItem(x, i, 'kyoto')).join('') || '<li class="hint">都准备好了。</li>'}</ul></div>
        </section>
      </div>

      ${picks.length ? `<section class="season">
        <div class="sh"><h2>${MONTH} 月，正是时候</h2><span class="meta">按每个地方最合适的季节挑出来的</span></div>
        <div class="sea-row">${picks.map(seasonCard).join('')}</div>
      </section>` : ''}

      <section>
        <div class="sh"><h2>最近记下的</h2><a class="more" href="#places">全部 ${alive().length} 处</a></div>
        <div class="album-strip">${recent.map(p => slot(p)).join('')}</div>
      </section>

      <div class="home-trio">
        <section class="sheet panel">
          <div class="sh"><h2>城里想去的</h2><button class="btn btn-sm" data-open="draw">帮我挑一个</button></div>
          <ul class="local-list">${localWants.map(p => `<li>${stamp(p, { size: 'xs', open: true })}<div><button class="linklike" data-place="${p.id}">${esc(p.name)}</button><span>${esc(p.city)} · ${p.state === 'plan' ? '已排进本周六' : esc(p.tags.join(' · '))}</span></div><span class="w">${p.want} 分</span></li>`).join('')}</ul>
        </section>
        <section class="sheet memo-peek">
          <div class="sh"><h2>最近的回忆</h2><a class="more" href="#memories">全部 ${D.memories.length} 段</a></div>
          <div class="peek">
            <div class="photo-mount"><i></i><i></i><i></i><i></i><div class="photo" style="${cvars(lm.c)}">${lastMemo.img ? `<img src="${lastMemo.img}" alt="">` : art(lm.art, lm)}</div></div>
            <div><blockquote>${esc(lastMemo.note || '只盖了章，还没写。')}</blockquote><div class="who">${esc(lm.name)} · ${esc(lm.local ? lm.city : lm.city || lm.country)} · ${weeksAgo} 周前${lastMemo.rating ? ` · ${lastMemo.rating} 分` : ''}</div></div>
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
  const pf = { scope: 'all', type: '', state: '', season: false, sort: 'want', q: '', view: 'album' };

  function renderPlaces() {
    const all = alive(), local = all.filter(p => p.local).length, dropped = D.places.length - all.length;
    $('#view-places').innerHTML = `
      <header class="vh">
        <div><h1>想去</h1><p class="sub">一共 <b>${all.length}</b> 处 · 远方 <b>${all.length - local}</b> · 本地 <b>${local}</b>　面值就是想去程度，满分 5 分</p></div>
        <div class="vh-actions">
          <div class="seg" role="group" aria-label="怎么看">${[['album', '邮票册'], ['area', '按地方']].map(([v, l]) => `<button data-pview="${v}" aria-pressed="${pf.view === v}">${l}</button>`).join('')}</div>
          <button class="btn btn-seal" data-open="palette">记下一个想去</button>
        </div>
      </header>
      ${pf.view === 'album' ? `
      <div class="filters" role="group" aria-label="筛选">
        <div class="seg" role="group" aria-label="范围">${[['all', '全部'], ['far', '远方'], ['local', '本地']].map(([v, l]) => `<button data-f="scope" data-v="${v}" aria-pressed="${pf.scope === v}">${l}</button>`).join('')}</div>
        <div class="chips" role="group" aria-label="类型">${TYPES.map(t => `<button class="chip" data-f="type" data-v="${t}" aria-pressed="${pf.type === t}">${t}</button>`).join('')}</div>
        <div class="chips" role="group" aria-label="状态">${[['want', '想去'], ['plan', '计划中'], ['been', '已去过']].map(([v, l]) => `<button class="chip" data-f="state" data-v="${v}" aria-pressed="${pf.state === v}"><i class="sw ${v}"></i>${l}</button>`).join('')}
          <button class="chip" data-f="season" aria-pressed="${pf.season}"><i class="sw season"></i>${MONTH} 月适合</button>
          ${dropped ? `<button class="chip" data-f="state" data-v="dropped" aria-pressed="${pf.state === 'dropped'}">已放下 ${dropped}</button>` : ''}</div>
        <label class="sr-only" for="sort-places">排序</label>
        <select id="sort-places" class="sort-sel"><option value="want">按想去程度</option><option value="added">按最近记下</option><option value="name">按名称</option></select>
        <label class="field" for="q-places">${ICON_SEARCH}<input id="q-places" type="search" placeholder="搜名称、城市、标签" value="${esc(pf.q)}" autocomplete="off"></label>
      </div>
      <div class="album" id="album" aria-live="polite"></div>` : `<p class="areas-lede">同一趟能顺路去的地方放在一起。攒够了，就排一次行程。</p><div class="areas">${areaCards()}</div>`}`;
    if (pf.view === 'album') {
      $('#sort-places').value = pf.sort;
      renderAlbum();
    }
  }

  function renderAlbum() {
    const q = norm(pf.q);
    const base = pf.state === 'dropped' ? D.places.filter(p => p.dropped) : alive();
    const list = base.filter(p =>
      (pf.scope === 'all' || (pf.scope === 'local') === !!p.local) &&
      (!pf.type || p.type === pf.type) &&
      (!pf.state || pf.state === 'dropped' || p.state === pf.state) &&
      (!pf.season || (p.season || []).includes(MONTH)) &&
      (!q || norm([p.name, p.city, p.country, p.area, ...p.tags].join(' ')).includes(q)));
    const sorters = { want: (a, b) => b.want - a.want || b.added.localeCompare(a.added), added: (a, b) => b.added.localeCompare(a.added), name: (a, b) => a.name.localeCompare(b.name, 'zh-CN') };
    list.sort(sorters[pf.sort]);
    const el = $('#album');
    if (!el) return;
    el.innerHTML = list.length
      ? list.map(p => slot(p, { acts: true })).join('')
      : `<div class="empty"><b>没有符合的地点</b>${q ? `清单里没有「${esc(pf.q)}」。` : '换个筛选条件试试。'}<div style="margin-top:14px"><button class="btn btn-seal" data-open="palette" data-q="${esc(pf.q)}">${q ? `记下「${esc(pf.q)}」` : '记下一个想去'}</button></div></div>`;
  }

  function areaCards() {
    const groups = new Map();
    alive().forEach(p => { const a = areaOf(p); if (!groups.has(a)) groups.set(a, []); groups.get(a).push(p); });
    const cards = [...groups.entries()].map(([area, ps]) => {
      const n = s => ps.filter(p => p.state === s).length;
      const wants = ps.filter(p => p.state === 'want');
      const local = ps.some(p => p.local);
      const trip = activeTrips().find(t => t.area === area);
      const seasonAll = [...new Set(wants.flatMap(p => p.season || []))].sort((a, b) => a - b);
      let hint, cta, rank;
      if (local) {
        hint = `城里还有 ${n('want')} 处想去，周末随时能走。`;
        cta = '<button class="btn btn-sm" data-open="draw">帮我挑一个</button>';
        rank = 1;
      } else if (trip && wants.length) {
        hint = `「${trip.subtitle}」${trip.end ? md(trip.start) + ' 出发' : '还在草拟'}，还有 ${wants.length} 处想去没排进去。`;
        cta = `<a class="btn btn-sm btn-seal" href="#trip" data-trip="${trip.id}" data-focus="cands">挑进行程</a>`;
        rank = 0;
      } else if (trip) {
        hint = `都排进「${trip.subtitle}」了。`;
        cta = `<a class="btn btn-sm" href="#trip" data-trip="${trip.id}">看行程</a>`;
        rank = 3;
      } else if (wants.length >= 2) {
        hint = `攒了 ${wants.length} 处，够专门跑一趟了。${seasonAll.length ? `${seasonAll.join('、')} 月去最合适。` : ''}`;
        cta = `<button class="btn btn-sm btn-seal" data-newtrip-area="${esc(area)}">排一次行程</button>`;
        rank = 0.5;
      } else if (wants.length) {
        hint = wants[0].seasonNote ? `${wants[0].seasonNote}。再攒几处，或者单独去一趟。` : '再攒几处，或者单独去一趟。';
        cta = `<button class="btn btn-sm" data-place="${wants[0].id}">看看</button>`;
        rank = 2;
      } else {
        hint = `都去过了 · ${ps.reduce((k, p) => k + memosOf(p.id).length, 0)} 段回忆。`;
        cta = '<a class="btn btn-sm btn-quiet" href="#memories">看回忆</a>';
        rank = 4;
      }
      return { rank, size: ps.length, html: `<article class="area-card sheet">
        <header><h3>${esc(area)}</h3><span class="area-n">${['want', 'plan', 'been'].filter(s => n(s)).map(s => `<span class="mk ${s}" title="${{ want: '想去', plan: '计划中', been: '已去过' }[s]}">${n(s)}</span>`).join('')}</span></header>
        <div class="area-stamps">${ps.slice(0, 7).map(p => stamp(p, { size: 'xs', open: true })).join('')}${ps.length > 7 ? `<span class="more-n">+${ps.length - 7}</span>` : ''}</div>
        <p>${esc(hint)}</p>
        <div class="acts">${cta}</div>
      </article>` };
    });
    return cards.sort((a, b) => a.rank - b.rank || b.size - a.size).map(c => c.html).join('');
  }

  /* ============================== 行程 ============================== */
  let curTrip = 'kyoto', curTab = 'prep';
  const TABS = [['prep', '准备'], ['guide', '攻略'], ['booking', '预订'], ['note', '备注']];
  const openSets = {};
  const openDays = id => (openSets[id] ||= new Set([0, 1, 2, 3]));

  function candidates(t) {
    return alive().filter(p => p.state === 'want' && areaOf(p) === t.area && !!p.local === !!t.local);
  }
  function seasonFit(p, t) {
    const m = t.end ? pd(t.start).getMonth() + 1 : null;
    if (m && (p.season || []).includes(m)) return `${p.seasonNote || ''} · 时间正好`;
    return p.seasonNote || p.note || p.tags.join(' · ');
  }

  function renderTrip() {
    if (!T[curTrip]) curTrip = D.trips[0].id;
    const t = T[curTrip];
    const cnt = s => D.trips.filter(x => x.status === s).length;
    const cands = candidates(t);
    const od = openDays(t.id);
    $('#view-trip').innerHTML = `
      <header class="vh">
        <div><h1>行程</h1><p class="sub"><b>${D.trips.length}</b> 次旅行 · 计划中 <b>${cnt('plan')}</b> · 草拟 <b>${cnt('draft')}</b> · 已完成 <b>${cnt('done')}</b></p></div>
        <div class="vh-actions">${t.id === D.todaySim.trip ? '<a class="btn" href="#today">预览出发当天</a>' : ''}<a class="btn btn-seal" href="#sort">把攻略整理进来</a></div>
      </header>
      <div class="trip-tabs" role="tablist" aria-label="选择行程">${D.trips.map(x => `<button class="trip-tab" role="tab" aria-selected="${x.id === curTrip}" data-trip="${x.id}"><b>${esc(x.title)}</b><small>${x.end ? `${md(x.start)}${x.start !== x.end ? ' — ' + md(x.end) : ''}` : esc(x.start.replace('-', '.')) + ' · 待定'}</small>${statusPill(x.status)}</button>`).join('')}</div>
      ${pass(t, { lg: true, action: '<a class="btn btn-sm" href="#sort">整理攻略</a>' })}
      <div class="trip-body">
        <section aria-label="每日安排">
          ${cands.length && t.status !== 'done' ? `<div class="cands" id="cands">
            <div class="cands-h"><b>${esc(t.area)}还有 ${cands.length} 处想去，没排进来</b><span>选一天就加进去</span></div>
            <ul>${cands.map(p => `<li>${stamp(p, { size: 'xs', open: true })}<div class="cb"><button class="linklike" data-place="${p.id}">${esc(p.name)}</button><span>${esc(seasonFit(p, t))}</span></div>
              <label class="sr-only" for="cand-${p.id}">把${esc(p.name)}加到哪一天</label>
              <select id="cand-${p.id}" class="add-sel" data-cand="${p.id}"><option value="">加到…</option>${t.days.map(d => `<option value="${d.n}">Day ${d.n} · ${d.date} ${esc(d.title)}</option>`).join('')}<option value="0">先放进来，不定哪天</option></select></li>`).join('')}</ul>
          </div>` : ''}
          <div class="sh"><h2>每日安排</h2><span class="meta">${t.days.length ? `${t.days.reduce((n, d) => n + d.items.length, 0)} 项${t.status !== 'done' ? ' · 拖动可以调整顺序' : ''}` : ''}</span></div>
          ${t.days.length ? `<div class="days">${t.days.map((d, i) => dayBlock(d, i, od.has(i), t)).join('')}</div>`
            : `<div class="no-days"><b>还没排日程</b><p>先把收藏的攻略贴进一键整理，它会按天拆出安排；也可以从"想去"里挑地点加进来。</p><a class="btn btn-seal" href="#sort">用攻略生成日程</a></div>`}
        </section>
        <aside class="folder" aria-label="计划资料">
          <div class="folder-tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === curTab}" data-tab="${k}">${l}<span class="num">${t.materials[k].length}</span></button>`).join('')}</div>
          <div class="folder-body" id="folder-body" role="tabpanel">${folderBody(t)}</div>
        </aside>
      </div>`;
  }

  function dayBlock(d, di, open, t) {
    const editable = t.status !== 'done';
    return `<details class="day" ${open ? 'open' : ''} data-di="${di}">
      <summary><span class="day-n">Day ${d.n}</span><span class="day-t"><h3>${esc(d.title)}</h3><span class="d">${d.date} ${d.wd}</span></span><span class="day-c">${d.items.length} 项</span></summary>
      <ol class="items" data-di="${di}">${d.items.map((it, ii) => itemRow(it, di, ii, editable)).join('')}</ol>
      ${editable ? `<form class="quick-add" data-di="${di}"><label class="sr-only" for="qa-${t.id}-${di}">给 Day ${d.n} 加一项</label><span aria-hidden="true">＋</span><input id="qa-${t.id}-${di}" placeholder="加一项，比如：15:30 哲学之道" autocomplete="off" enterkeyhint="done"></form>` : ''}
    </details>`;
  }

  function itemRow(it, di, ii, editable) {
    const p = it.place && P[it.place];
    const dotCls = p ? (p.state === 'been' ? 'been' : 'place') : '';
    const tags = [];
    if (it.tag) tags.push(`<span class="tag ${it.tag[0]}">${esc(it.tag[1])}</span>`);
    if (p) tags.push(`<span class="tag">来自想去 · ${p.want} 分</span>`);
    return `<li class="item ${freshItems.has(it) ? 'fresh' : ''}" ${editable ? `draggable="true" data-di="${di}" data-ii="${ii}"` : ''}>
      <time>${esc(it.t)}</time><span class="dot ${dotCls}" aria-hidden="true"></span>
      <div class="item-b"><span class="k">${esc(it.kind)}</span>${p ? `<button class="linklike" data-place="${p.id}">${esc(it.title)}</button>` : `<b>${esc(it.title)}</b>`}${it.note ? `<p>${esc(it.note)}</p>` : ''}${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}</div>
      <div class="item-side">${p ? `<div class="thumb">${stamp(p, { size: 'xs', open: true })}</div>` : ''}${editable ? `<button class="item-rm" data-rm="${di}:${ii}" aria-label="移除 ${esc(it.title)}" title="移除">×</button>` : ''}</div></li>`;
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
      return m.booking.length ? `<h3>预订<span class="num">${m.booking.length} 项</span></h3><div class="bookings">${m.booking.map((b, i) => `<div class="bk"><div class="bk-kind">${esc(b.kind)}</div><div class="bk-b"><div class="top"><b>${esc(b.title)}</b><span class="num">${yen(b.price)}</span></div>${b.lines.map(l => `<span>${esc(l)}</span>`).join('')}<span class="ref">${esc(b.code)} · 确认号 ${esc(b.ref)}<button class="linklike sm" data-show="${t.id}:${i}">出示</button></span></div></div>`).join('')}
        <div class="bk-total"><span>已订合计</span><b>${yen(sum)}</b></div></div>` : emptyTab('预订');
    }
    return m.note.length ? `<h3>备注</h3><div class="note-paper">${m.note.map(n => `<p>${esc(n)}</p>`).join('')}</div>` : emptyTab('备注');
  }
  const emptyTab = name => `<div class="no-days" style="border:0;padding:12px 0"><b>还没有${name}</b><p>可以手动添加，也可以把聊天记录贴进一键整理，自动归到这里。</p><a class="btn btn-sm" href="#sort">去整理</a></div>`;

  /* ============================== 今天（出发当天的样子） ============================== */
  function renderToday() {
    const s = D.todaySim, t = T[s.trip], d = t && t.days[s.day - 1];
    if (!d) { $('#view-today').innerHTML = ''; return; }
    const now = toMin(s.now);
    const items = d.items;
    const done = it => !!it.simDone;
    if (!s._init) {
      Object.entries(s.done).forEach(([i, v]) => { if (items[+i]) items[+i].simDone = v; });
      s._init = true;
    }
    const cur = items.findIndex(it => !done(it));
    const nxt = items.findIndex((it, i) => i > cur && !done(it));
    const ci = items[cur], ni = items[nxt];
    const sd = pd(s.date);
    const spentJ = s.spend.reduce((n, x) => n + x.jpy, 0);
    const bookingsToday = [...items.filter(it => it.booking != null).map(it => it.booking), 1].filter((v, i, a) => a.indexOf(v) === i);
    let nowCard;
    if (ci) {
      const st = toMin(ci.t), p = ci.place && P[ci.place];
      const label = st == null ? '时间待定' : st <= now ? `${ci.t} 开始 · 已经 ${span(now - st)}` : `${ci.t} · 还有 ${span(st - now)}`;
      nowCard = `<section class="now-card" aria-label="现在">
        <div class="now-top"><span class="now-tag">${st != null && st <= now ? '现在' : '接下来'}</span><span class="num">${label}</span></div>
        <div class="now-main">${p ? `<div class="now-stamp">${stamp(p, { size: 'sm', open: true })}</div>` : ''}<div><h2>${esc(ci.title)}</h2>${ci.note ? `<p>${esc(ci.note)}</p>` : ''}${ci.go ? `<p class="go">怎么去：${esc(ci.go)}</p>` : ''}</div></div>
        <div class="now-acts"><button class="btn btn-seal" data-ckitem="${cur}">到了，盖章</button><button class="btn" data-toast="演示：会用地图 App 导航到「${esc(ci.title)}」">导航过去</button>${ci.booking != null ? `<button class="btn" data-show="${t.id}:${ci.booking}">出示预订</button>` : ''}</div>
      </section>`;
    } else {
      nowCard = `<section class="now-card"><div class="now-top"><span class="now-tag">今天</span></div><div class="now-main"><div><h2>今天的安排都走完了</h2><p>趁还记得，给今天写两句。</p></div></div><div class="now-acts"><a class="btn btn-seal" href="#memories">去写回忆</a></div></section>`;
    }
    let list = '', lineDone = false;
    items.forEach((it, i) => {
      const st = toMin(it.t);
      if (!lineDone && st != null && st > now) { list += `<li class="now-line"><span>现在 ${s.now}</span></li>`; lineDone = true; }
      list += `<li class="tl ${done(it) ? 'done' : ''} ${i === cur ? 'cur' : ''}"><time>${esc(it.t)}</time><span class="tl-dot" aria-hidden="true"></span>
        <div class="tl-b"><b>${esc(it.title)}</b><small>${done(it) ? `${esc(it.simDone)} 盖章` : esc(it.go || it.note || '')}</small></div>
        ${done(it) ? '<span class="tl-mark">已盖章</span>' : i !== cur ? `<button class="linklike sm" data-ckitem="${i}">盖章</button>` : ''}</li>`;
    });
    if (!lineDone) list += `<li class="now-line"><span>现在 ${s.now}</span></li>`;
    $('#view-today').innerHTML = `
      <div class="sim-bar"><span>演示：假设今天是 ${sd.getMonth() + 1} 月 ${sd.getDate()} 日（${WD[sd.getDay()]}）${s.now}，你在京都，这是「${esc(t.subtitle)}」的第 ${s.day} 天。</span><a href="#trip" data-trip="${t.id}">回到行程</a></div>
      <header class="today-h">
        <p class="kicker">${esc(t.subtitle)} · Day ${s.day} / ${t.days.length} · ${esc(s.weather)}</p>
        <h1>${esc(d.title)}</h1>
        <p class="today-dots" role="img" aria-label="今天 ${items.length} 项，完成 ${items.filter(done).length} 项">${items.map(it => `<i class="${done(it) ? 'on' : ''}"></i>`).join('')}<span>${items.filter(done).length}/${items.length}</span></p>
      </header>
      <div class="today-grid">
        <div class="today-main">
          ${nowCard}
          ${ni ? `<div class="next-line"><span class="lbl">下一项</span><b>${esc(ni.t)} ${esc(ni.title)}</b><span>${toMin(ni.t) != null ? `还有 ${span(toMin(ni.t) - now)}` : ''}${ni.go ? ' · ' + esc(ni.go) : ''}</span></div>` : ''}
          <ol class="timeline">${list}</ol>
        </div>
        <aside class="today-side">
          <section class="sheet panel">
            <div class="sh"><h2>今天要用的预订</h2></div>
            <ul class="bk-mini">${bookingsToday.map(bi => { const b = t.materials.booking[bi]; return b ? `<li><span class="bk-k">${esc(b.kind)}</span><div><b>${esc(b.title)}</b><small>${esc(b.lines[0])}</small></div><button class="btn btn-sm" data-show="${t.id}:${bi}">出示</button></li>` : ''; }).join('')}</ul>
          </section>
          <section class="sheet panel">
            <div class="sh"><h2>今天花了</h2><span class="spend-sum"><b class="num">${spentJ.toLocaleString('en-US')} 円</b><small>约 ${yen(spentJ * s.rate)}</small></span></div>
            <ul class="spend-list">${s.spend.map(x => `<li><time>${esc(x.t)}</time><span class="cat">${esc(x.cat)}</span><span class="w">${esc(x.what || x.cat)}</span><span class="num">${x.jpy.toLocaleString('en-US')} 円</span></li>`).join('')}</ul>
            <form class="spend-form" id="spend-form">
              <div class="spend-in"><label class="sr-only" for="sp-amt">金额（日元）</label><input id="sp-amt" inputmode="decimal" placeholder="金额" autocomplete="off"><span>円</span>
                <label class="sr-only" for="sp-what">买了什么</label><input id="sp-what" placeholder="买了什么，可不填" autocomplete="off"></div>
              <div class="radio-chips sm">${['吃饭', '交通', '门票', '购物'].map((c, i) => `<label><input type="radio" name="sp-cat" value="${c}" ${i === 0 ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div>
              <button class="btn btn-sm" type="submit">记一笔</button>
            </form>
          </section>
        </aside>
      </div>`;
  }

  /* ============================== 地图 ============================== */
  let mapMode = 'world', mapSel = '关西';
  const K = WORLD.k;
  function proj(lng, lat) {
    const l = lng * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
    const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [n1(WORLD.w / 2 + x * K), n1(-y * K - WORLD.y0)];
  }
  const LBL = { 关西: ['京都 · 大阪', 'r'], 冰岛: ['冰岛', 'r'], 里斯本: ['里斯本', 'l'], 吴哥: ['吴哥窟', 'r'], 新西兰南岛: ['特卡波湖', 'l'], 伊斯坦布尔: ['伊斯坦布尔', 'r'], 巴塞罗那: ['巴塞罗那', 'b'], 清迈: ['清迈', 'l'], 大理: ['大理', 'l'] };
  const RANK = { want: 0, plan: 1, been: 2 };

  function clusters() {
    const map = new Map();
    alive().filter(p => !p.local && (p.lat || p.lng)).forEach(p => {
      const key = areaOf(p);
      if (!map.has(key)) map.set(key, { key, places: [] });
      map.get(key).places.push(p);
    });
    return [...map.values()].map(c => {
      c.lat = c.places.reduce((n, p) => n + p.lat, 0) / c.places.length;
      c.lng = c.places.reduce((n, p) => n + p.lng, 0) / c.places.length;
      c.state = c.places.map(p => p.state).sort((a, b) => RANK[a] - RANK[b])[0];
      if (c.places.some(p => p.state === 'plan')) c.state = 'plan';
      c.trip = c.places.find(p => p.state === 'plan' && p.trip)?.trip;
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
    const len = Math.hypot(nx, ny) || 1, dd = Math.hypot(x2 - x1, y2 - y1) * bend;
    return `M${x1} ${y1}Q${n1(mx + nx / len * dd)} ${n1(my + ny / len * dd)} ${x2} ${y2}`;
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
    const nLocal = alive().filter(p => p.local).length;
    pins += `<g class="pin ${mapSel === '上海' ? 'sel' : ''}" tabindex="0" role="button" aria-label="上海，家，本地 ${nLocal} 处" data-c="上海">
      <circle class="hit" cx="${home[0]}" cy="${home[1]}" r="14"/>${mapSel === '上海' ? `<circle class="sel-ring" cx="${home[0]}" cy="${home[1]}" r="12"/>` : ''}
      <rect class="home" x="${home[0] - 6}" y="${home[1] - 6}" width="12" height="12" rx="1.5"/><text x="${home[0]}" y="${home[1] + 3.6}" text-anchor="middle" style="font:400 9px var(--f-display);fill:var(--on-seal)">沪</text>
      <text class="pin-label" x="${home[0] + 9}" y="${home[1] + 19}">上海 · 家</text></g>`;
    return `<svg class="map-svg" viewBox="0 0 ${WORLD.w} ${WORLD.h}" role="img" aria-label="世界地图：想去、计划中、已去过的地点">
      <path class="ocean" d="${WORLD.outline}"/><path class="grat" d="${WORLD.grat}"/><path class="land" d="${WORLD.land}"/><path class="edge" d="${WORLD.outline}"/>
      ${routes}${pins}</svg>`;
  }
  const cityXY = p => [n1((p.lng - 121.38) / .22 * 1000), n1(435 - (p.lat - 31.17) / .17 * 435)];
  function citySvg() {
    let pins = '';
    alive().filter(p => p.local && (p.lat || p.lng)).forEach(p => {
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
      <g><rect class="home" x="321" y="362" width="12" height="12" rx="1.5" style="fill:var(--seal)"/><text x="327" y="371.6" text-anchor="middle" style="font:400 9px var(--f-display);fill:var(--on-seal)">家</text></g>
      ${pins}</svg>`;
  }
  function renderMap() {
    const far = alive().filter(p => !p.local), local = alive().filter(p => p.local);
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
          <div class="state-groups">${groups.map(([s, l]) => `<div><h3>${l}</h3><ul>${scope.filter(p => p.state === s).map(p => `<li><button data-pick="${p.id}">${esc(p.name)}</button></li>`).join('') || '<li class="hint">暂无</li>'}</ul></div>`).join('')}</div>
        </div>
      </div>`;
  }
  function selCard() {
    let title, where, list;
    if (mapMode === 'city') {
      const p = P[mapSel] && P[mapSel].local ? P[mapSel] : alive().find(x => x.local);
      title = p.name; where = `上海 · ${p.country} · ${p.city}`; list = [p];
    } else if (mapSel === '上海') {
      list = alive().filter(p => p.local); title = '上海'; where = `家 · 本地 ${list.length} 处，切到"本地"看细节`;
    } else {
      const cs = clusters();
      const c = cs.find(x => x.key === mapSel) || cs[0];
      list = c.places; title = (LBL[c.key] || [c.key])[0]; where = `${[...new Set(list.map(p => p.country))].join(' · ')} · ${list.length} 处`;
    }
    return `<section class="sheet sel-card" aria-live="polite"><div><h2>${esc(title)}</h2><div class="where">${esc(where)}</div></div>
      <ul class="sel-list">${list.map(p => `<li>${stamp(p, { size: 'xs', open: true })}<div><button class="linklike" data-place="${p.id}">${esc(p.name)}</button>${stateLine(p)}</div></li>`).join('')}</ul></section>`;
  }

  /* ============================== 回忆 ============================== */
  function renderMemories() {
    const been = alive().filter(p => p.state === 'been');
    const pending = been.filter(p => !memosOf(p.id).length);
    const total = D.memories.reduce((n, m) => n + (m.costCny || 0), 0);
    const memos = [...D.memories].sort((a, b) => b.date.localeCompare(a.date));
    const years = [...new Set(memos.map(m => m.date.slice(0, 4)))];
    $('#view-memories').innerHTML = `
      <header class="vh">
        <div><h1>回忆</h1><p class="sub"><b>${D.memories.length}</b> 段 · 去过 <b>${been.length}</b> 处 · 一共花了 <b>${yen(total)}</b></p></div>
        <div class="vh-actions">${pending.length ? `<button class="btn btn-seal" data-memo="${pending[0].id}">补写回忆</button>` : ''}</div>
      </header>
      ${pending.length ? `<section class="backfill">
        <div class="txt"><b>${pending.length} 处去过，还没写回忆</b>趁还记得，一处花一分钟。</div>
        <ul>${pending.map(p => `<li>${stamp(p, { size: 'xs', open: true })}<span><b>${esc(p.name)}</b><small>${p.been ? dot(p.been) : ''} 去过</small></span><button class="btn btn-sm" data-memo="${p.id}">现在写</button></li>`).join('')}</ul>
      </section>` : ''}
      ${years.map(y => {
        const ms = memos.filter(m => m.date.startsWith(y));
        return `<section class="year"><div class="year-h"><h2>${y}</h2><span>${ms.length} 段 · ${[...new Set(ms.map(m => P[m.place] ? (P[m.place].local ? '上海' : P[m.place].city) : ''))].filter(Boolean).join('、')}</span></div>
          <div class="cards">${ms.map((m, i) => postcard(m, i)).join('')}</div></section>`;
      }).join('')}`;
  }
  function postcard(m, i) {
    const p = P[m.place];
    if (!p) return '';
    const [y, mo, d] = m.date.split('-');
    const tilt = [-.5, .45, -.3, .6, -.2][i % 5];
    return `<article class="postcard" style="--tilt:${tilt}deg">
      <div>
        <div class="photo-mount"><i></i><i></i><i></i><i></i><div class="photo" style="${cvars(p.c)}">${m.img ? `<img src="${m.img}" alt="${esc(p.name)} 的照片">` : art(p.art, p)}<span class="stamp-date">'${y.slice(2)} ${+mo} ${+d}</span></div></div>
        <div class="photo-count" style="${cvars(p.c)}"><span class="thumbs"><b></b><b></b><b></b></span>${m.photos} 张照片</div>
      </div>
      <div class="pc-back">
        <div class="head"><h3><button class="linklike" data-place="${p.id}">${esc(p.name)}</button></h3><div class="where">${esc(whereOf(p))}</div></div>
        <div class="corner">${stamp(p, { size: 'xs' })}${postmark(pmCity(p), dot(m.date))}</div>
        <p class="hand">${esc(m.note || '只盖了章，还没写。')}</p>
        <div class="facts"><span>评价 <span class="dots" role="img" aria-label="${m.rating} 分，满分 5 分">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= m.rating ? 'on' : ''}"></i>`).join('')}</span></span>${m.cost ? `<span>花费 <b>${esc(m.cost)}</b></span>` : ''}<span>${dot(m.date)}</span></div>
      </div>
    </article>`;
  }

  /* ============================== 一键整理 ============================== */
  let sortRun = 0, written = false, sortSrc = 'text';
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
            <div class="sel-field"><label for="sort-trip">整理到</label><select id="sort-trip">${activeTrips().map(t => `<option value="${t.id}">${esc(t.title)} ${esc(t.subtitle)}</option>`).join('')}</select></div>
            <div class="sel-field"><label for="sort-prov">使用</label><select id="sort-prov">${D.providers.map(p => `<option value="${p.id}" ${p.active ? 'selected' : ''}>${esc(p.name)} · ${esc(p.model)}</option>`).join('')}</select></div>
          </div>
          <div class="seg src-seg" role="group" aria-label="内容来源">${[['text', '粘贴文字'], ['shot', '聊天截图'], ['link', '攻略链接']].map(([v, l]) => `<button data-src="${v}" aria-pressed="${sortSrc === v}">${l}</button>`).join('')}</div>
          ${sortSrc === 'shot' ? `<label class="dropzone" for="shot-file"><b>选几张聊天截图</b><span>会先识别出文字，填进下面再整理</span><input type="file" id="shot-file" accept="image/*" multiple class="sr-only"></label>` : ''}
          ${sortSrc === 'link' ? `<form class="link-form" id="link-form"><div class="sel-field"><label for="sort-link">攻略链接</label><input id="sort-link" placeholder="粘贴小红书、公众号或网页链接" autocomplete="off"></div><button class="btn btn-sm" type="submit">读取正文</button></form>` : ''}
          <div class="envelope airmail">
            <div class="env-head"><b>贴进来的内容</b><span id="char-n">${D.aiSample.length} 字</span></div>
            <label class="sr-only" for="sort-text">贴进来的内容</label>
            <textarea id="sort-text" spellcheck="false">${esc(D.aiSample)}</textarea>
          </div>
          <div class="sort-acts">
            <button class="btn btn-seal" id="run-sort">拆开整理</button>
            <button class="btn btn-quiet" id="clear-sort">清空</button>
            <p>结果先列在右边，勾掉不要的再写入；写入后也能撤销。</p>
          </div>
        </div>
        <section aria-label="整理结果">
          <div class="result-h"><h2>整理结果</h2><span class="meta" id="sort-meta">2 分钟前 · ${esc(prov.name)} · 用时 6.2 秒</span></div>
          <p class="result-note">已经在清单里的地点和日程会合并，不会重复创建。</p>
          <div class="trays" id="trays">${traysHtml()}</div>
          <div class="commit"><p id="commit-txt"></p><button class="btn btn-seal" id="commit-btn">全部写入</button></div>
        </section>
      </div>`;
    updateCommit();
  }
  function traysHtml() {
    const r = D.aiResult;
    let i = 0;
    const ck = (k, idx, inner) => `<li class="slip" style="--i:${i++}"><label class="check"><input type="checkbox" data-k="${k}" data-idx="${idx}" checked><span class="box" aria-hidden="true"></span><span class="txt">${inner}</span></label></li>`;
    const tray = (title, n, body, wide) => `<div class="tray sheet ${wide ? 'wide' : ''}"><div class="tray-h"><h3>${title}</h3><span class="n">${n}</span></div>${body}</div>`;
    const byName = name => alive().find(p => norm(p.name) === norm(name));
    return tray('行程信息', r.trip.length, `<ul class="slips">${r.trip.map((x, j) => ck('trip', j, `<span class="diff"><span>${esc(x.field)}</span><del>${esc(x.from)}</del><span aria-hidden="true">→</span><ins>${esc(x.to)}</ins><span class="op upd">更新</span><span class="why">依据：${esc(x.why)}</span></span>`)).join('')}</ul>`, true)
      + tray('地点', r.places.length, `<ul class="slips">${r.places.map((x, j) => {
        const ex = (x.match && P[x.match]) || byName(x.name);
        const pv = ex || { ...x, want: 3, country: '' };
        return ck('place', j, `<span class="row-art"><span class="mini-art">${stamp(pv, { size: 'xs' })}</span><span><b>${esc(ex ? ex.name : x.name)}</b><span class="s">${ex ? `已在想去里 · ${ex.state === 'plan' ? '已排进行程' : '还没排'}` : esc(x.meta)}</span></span><span class="op ${ex ? 'link' : 'new'}">${ex ? '合并' : '新地点'}</span></span>`);
      }).join('')}</ul>`)
      + tray('日程', r.items.length, `<ul class="slips">${r.items.map((x, j) => ck('item', j, `<span class="row"><span><span class="w">Day ${x.day}${x.t ? ' · ' + esc(x.t) : ''}</span><br><b>${esc(x.title || x.match)}</b><span class="s">${x.op === 'upd' ? `原有「${esc(x.match)}」· ` : ''}${esc(x.note)}</span></span><span class="op ${x.op}">${x.op === 'new' ? '新增' : '更新'}</span></span>`)).join('')}</ul>`)
      + tray('资料', r.materials.length, `<ul class="slips">${r.materials.map((x, j) => ck('mat', j, `<span class="row"><span><b>${esc(x.title)}</b>${x.note ? `<span class="s">${esc(x.note)}</span>` : ''}</span><span class="cat">${esc(x.cat)}${x.match ? ' · 合并' : ''}</span></span>`)).join('')}</ul>`)
      + tray('回忆', r.memories.length, '<div class="tray-empty">这段内容讲的都是还没去的安排，没有可以记成回忆的。</div>');
  }
  function updateCommit() {
    if (!$('#commit-txt')) return;
    const n = $$('#trays input[type=checkbox]:checked').length;
    const t = T[$('#sort-trip')?.value] || T.kyoto;
    $('#commit-txt').innerHTML = written ? `已写入「${esc(t.title)} ${esc(t.subtitle)}」` : `已选 <b>${n}</b> 条，写入「${esc(t.title)} ${esc(t.subtitle)}」`;
    const b = $('#commit-btn');
    b.disabled = written || n === 0;
    b.textContent = written ? '已写入' : `写入 ${n} 条`;
  }
  function commitSort() {
    const r = D.aiResult, t = T[$('#sort-trip').value];
    const picked = $$('#trays input[type=checkbox]:checked').map(c => [c.dataset.k, +c.dataset.idx]);
    act(`已写入 ${picked.length} 条到「${t.title} ${t.subtitle}」`, () => {
      picked.forEach(([k, i]) => {
        if (k === 'trip') t.budget = r.trip[i].value;
        if (k === 'place') {
          const x = r.places[i];
          if (!(x.match && P[x.match]) && !alive().some(p => norm(p.name) === norm(x.name))) {
            const [a, c] = TYPE_ART[x.type || '餐馆'];
            D.places.unshift({ id: uid(), name: x.name, city: '京都', country: '日本', area: t.area, type: x.type || '餐馆', want: 3, tags: [], lat: 0, lng: 0, state: 'want', art: x.art || a, c: x.c || c, added: D.today, season: [], src: { from: '一键整理', title: '小林的聊天记录' } });
          }
        }
        if (k === 'item') {
          const x = r.items[i], day = t.days[x.day - 1];
          if (!day) return;
          if (x.op === 'new') {
            if (day.items.some(v => v.title === x.title)) return;
            const it = { t: x.t, kind: '景点', title: x.title, note: x.note, place: x.place };
            insertItem(day, it); freshItems.add(it); openDays(t.id).add(x.day - 1);
            const p = x.place && P[x.place];
            if (p) { removeFromDays(p); insertItem(day, it); p.state = 'plan'; p.trip = t.id; p.day = x.day; }
          } else {
            const it = day.items.find(v => v.title === x.match);
            if (it) { if (x.title) it.title = x.title; it.note = x.note; freshItems.add(it); openDays(t.id).add(x.day - 1); }
          }
        }
        if (k === 'mat') {
          const x = r.materials[i], m = t.materials;
          if (x.key === 'prep') { const ex = m.prep.find(v => v.text === x.title); if (ex) ex.due = '11.03 10:00 开抢'; else m.prep.push({ text: x.title, done: false }); }
          else if (x.key === 'guide') m.guide.unshift({ src: '小红书', title: x.title, by: '小林分享', saved: md(D.today) });
          else m.note.push(x.title);
        }
      });
    }, { action: { label: '去看行程', fn: () => { curTrip = t.id; renderTrip(); location.hash = 'trip'; } }, onUndo: () => { written = false; updateCommit(); } });
    written = true;
    updateCommit();
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

  /* ============================== 搜索，或记下一个想去 ============================== */
  const pal = { q: '', sel: 0, detail: false, parsed: null, parsing: false, items: [] };
  const TYPE_KW = [['咖啡', /咖啡|cafe|coffee|面包|甜品|茶室|烘焙/i], ['餐馆', /面|饭|菜|烧|餐|火锅|生煎|小笼|拉面|小吃|酒家|食堂|烤|串|寿司|鸡|鱼|饺|粉|市场/], ['建筑', /寺|宫|塔|堂|教堂|城堡|神社|大社|桥|阁|美术馆|博物馆|大楼|院/], ['自然', /湖|山|海|公园|林|岛|瀑布|峡|谷|草原|沙滩|冰川|之道/]];
  const KNOWN = [['京都', '日本', '关西'], ['大阪', '日本', '关西'], ['奈良', '日本', '关西'], ['宇治', '日本', '关西'], ['东京', '日本', '东京'], ['里斯本', '葡萄牙', '里斯本'], ['冰岛', '冰岛', '冰岛'], ['清迈', '泰国', '清迈'], ['大理', '中国', '大理'], ['巴塞罗那', '西班牙', '巴塞罗那'], ['伊斯坦布尔', '土耳其', '伊斯坦布尔'], ['巴黎', '法国', '巴黎'], ['首尔', '韩国', '首尔']];
  const DISTRICT = [[/武康|衡山|安福|复兴|徐家汇/, '徐汇'], [/愚园|新华|定西/, '长宁'], [/思南|进贤|黄河|南京东|外滩/, '黄浦'], [/静安|延平|巨鹿/, '静安'], [/杨浦|五角场|军工/, '杨浦']];
  const SAMPLE_LINK = 'https://www.xiaohongshu.com/explore/66f2a1c0 京都哲学之道｜秋天散步路线';

  function guess(q) {
    const type = (TYPE_KW.find(([, re]) => re.test(q)) || ['城市'])[0];
    const k = KNOWN.find(([c]) => q.includes(c));
    const road = !k ? (q.match(/([一-龥]{1,4}路)/) || [])[1] : '';
    const dist = !k && DISTRICT.find(([re]) => re.test(q));
    const local = !k && (!!road || !!dist || /上海/.test(q));
    let name = q.trim();
    if (road && name.replace(road, '').trim()) name = name.replace(road, '').trim();
    if (k && name.replace(k[0], '').replace(/^[\s·,，]+/, '').trim()) name = name.replace(k[0], '').replace(/^[\s·,，]+/, '').trim();
    return { name, type, local, city: k ? k[0] : (local ? (road || '上海') : ''), country: k ? k[1] : (local ? (dist ? dist[1] : '上海') : ''), area: k ? k[2] : (local ? '上海' : ''), want: 3 };
  }
  function draftPlace(x) {
    const [a, c] = TYPE_ART[x.type];
    return { id: uid(), name: x.name, city: x.city || '', country: x.country || '', area: x.area || (x.local ? '上海' : (x.city || '未分组')), local: !!x.local, type: x.type, want: x.want || 3, tags: x.tags || [], lat: 0, lng: 0, state: 'want', art: a, c, added: D.today, season: x.season || [], seasonNote: x.seasonNote, note: x.note, src: x.src };
  }
  function palItems() {
    const q = pal.q.trim(), out = [];
    if (!q) {
      [...alive()].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 3).forEach(p => out.push({ kind: 'place', p, group: '最近记下' }));
      activeTrips().slice(0, 2).forEach(t => out.push({ kind: 'trip', t, group: '跳到' }));
      out.push({ kind: 'go', href: 'today', label: '今天', meta: '出发当天的样子（演示）', group: '跳到' });
      out.push({ kind: 'go', href: 'sort', label: '一键整理', meta: '把聊天记录、攻略拆成条目', group: '跳到' });
      return out;
    }
    const nq = norm(q);
    const isLink = /https?:\/\//.test(q);
    const hits = isLink ? [] : alive().filter(p => norm([p.name, p.city, p.area, ...p.tags].join(' ')).includes(nq) || nq.includes(norm(p.name))).slice(0, 5);
    const create = isLink ? (pal.parsing ? { kind: 'parsing', group: '记下新的' } : pal.parsed ? { kind: 'create', x: pal.parsed, group: '记下新的' } : null)
      : { kind: 'create', x: guess(q), group: '记下新的', again: hits.some(p => norm(p.name).includes(nq) || nq.includes(norm(p.name))) };
    const placeRows = hits.map(p => ({ kind: 'place', p, group: '已经在清单里' }));
    if (placeRows.length) out.push(...placeRows);
    if (create) out.push(create);
    if (!isLink) {
      D.trips.filter(t => norm(t.title + t.subtitle + t.area).includes(nq)).forEach(t => out.push({ kind: 'trip', t, group: '行程' }));
      D.memories.filter(m => P[m.place] && norm(P[m.place].name + m.note).includes(nq)).slice(0, 2).forEach(m => out.push({ kind: 'memo', m, group: '回忆' }));
    }
    return out;
  }
  function openPalette(q = '') {
    Object.assign(pal, { q, sel: 0, detail: false, parsed: null, parsing: false });
    const dlg = $('#palette');
    dlg.innerHTML = `<div class="pal">
      <div class="pal-in"><span class="pal-stamp" id="pal-stamp" aria-hidden="true"></span><label class="sr-only" for="pal-q">搜索，或记下一个想去</label><input id="pal-q" autocomplete="off" placeholder="搜索，或记下一个想去…" enterkeyhint="go"><button class="kbd-x" data-close aria-label="关闭">esc</button></div>
      <div class="pal-body" id="pal-body" role="listbox" aria-label="结果"></div>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 确定</span><span><kbd>tab</kbd> 补充详情再存</span></div>
    </div>`;
    $('#pal-q').value = q;
    showDialog(dlg);
    renderPal();
    $('#pal-q').focus();
    if (/https?:\/\//.test(q)) parseLink(q);
  }
  function parseLink(q) {
    pal.parsing = true; pal.parsed = null; renderPal();
    setTimeout(() => {
      if (pal.q !== q) return;
      pal.parsing = false;
      pal.parsed = { name: '哲学之道', city: '京都', country: '日本', area: '关西', type: '自然', local: false, want: 3, tags: ['散步', '红叶'], season: [4, 11], seasonNote: '4 月樱花，11 月红叶', note: '从南禅寺走到银阁寺，大约 2 公里。', src: { from: /xiaohongshu|xhslink/.test(q) ? '小红书' : '网页', title: '京都哲学之道｜秋天散步路线' } };
      renderPal();
    }, 750);
  }
  function renderPal() {
    const body = $('#pal-body');
    if (!body) return;
    const items = pal.items = palItems();
    if (pal.sel >= items.length || items[pal.sel]?.kind === 'parsing') pal.sel = Math.max(0, items.findIndex(x => x.kind !== 'parsing'));
    const draft = items.find(x => x.kind === 'create');
    $('#pal-stamp').innerHTML = draft ? stamp(draftPlace(draft.x), { size: 'xs' }) : '<span class="blank-stamp"></span>';
    if (pal.detail && draft) { body.innerHTML = palDetail(draft.x); return; }
    let html = '', g = '';
    items.forEach((it, i) => {
      if (it.group !== g) { g = it.group; html += `<div class="pal-g">${esc(g)}</div>`; }
      const sel = `aria-selected="${i === pal.sel}"`;
      if (it.kind === 'parsing') html += `<div class="pal-row parsing"><span class="spin" aria-hidden="true"></span><span><b>正在读取链接…</b><small>识别地点、城市和类型</small></span></div>`;
      if (it.kind === 'create') {
        const x = it.x;
        html += `<button class="pal-row create" role="option" ${sel} data-pal="${i}"><span class="plus" aria-hidden="true">＋</span><span><b>${it.again ? '仍然记下' : '记下'}「${esc(x.name)}」</b><small>${esc(x.type)} · ${esc(x.local ? `本地 · ${x.city}` : (x.city || '城市还没填'))} · 想去 ${x.want} 分${x.src ? ` · 来自${esc(x.src.from)}「${esc(x.src.title)}」` : ''}</small></span><kbd>↵</kbd></button>`;
      }
      if (it.kind === 'place') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}">${stamp(it.p, { size: 'xs' })}<span><b>${esc(it.p.name)}</b><small>${esc(whereOf(it.p))}</small></span>${stateLine(it.p)}</button>`;
      if (it.kind === 'trip') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}"><span class="ico plan" aria-hidden="true"></span><span><b>${esc(it.t.title)} ${esc(it.t.subtitle)}</b><small>${it.t.end ? `${md(it.t.start)} — ${md(it.t.end)}` : '日期待定'}</small></span>${statusPill(it.t.status)}</button>`;
      if (it.kind === 'memo') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}"><span class="ico memo" aria-hidden="true"></span><span><b>${esc(P[it.m.place].name)}</b><small>${esc(it.m.note.slice(0, 28))}…</small></span></button>`;
      if (it.kind === 'go') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}"><span class="ico go" aria-hidden="true">→</span><span><b>${esc(it.label)}</b><small>${esc(it.meta)}</small></span></button>`;
    });
    if (!pal.q.trim()) {
      html = `<div class="pal-hints"><span>试试：</span><button class="chip" data-hint="${esc(SAMPLE_LINK)}">粘贴一个小红书链接</button><button class="chip" data-hint="武康路 新开的面包店">武康路 新开的面包店</button><button class="chip" data-hint="稻荷">稻荷</button></div>` + html;
    }
    body.innerHTML = html;
    body.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }
  function palDetail(x) {
    return `<form class="pal-detail" id="pal-form">
      <div class="pd-prev">${stamp(draftPlace(x))}<p>填一点，邮票就跟着变一点。</p></div>
      <div class="pd-fields">
        <div class="two"><div class="sel-field"><label for="pd-name">地点</label><input id="pd-name" value="${esc(x.name)}" autocomplete="off"></div>
        <div class="sel-field"><label for="pd-city">城市，国家</label><input id="pd-city" value="${esc([x.city, x.local ? '' : x.country].filter(Boolean).join('，'))}" placeholder="京都，日本" autocomplete="off"></div></div>
        <fieldset><legend>类型</legend><div class="radio-chips">${TYPES.map(t => `<label><input type="radio" name="pd-type" value="${t}" ${t === x.type ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>想去程度</legend><div class="radio-chips denoms">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="pd-want" value="${n}" ${n === x.want ? 'checked' : ''}><span>${n}<small>分</small></span></label>`).join('')}</div></fieldset>
        <div class="sel-field"><label for="pd-note">为什么想去</label><input id="pd-note" value="${esc(x.note || '')}" placeholder="一句话就够，比如：秋天配红叶很好看" autocomplete="off"></div>
        <div class="two"><div class="sel-field"><label for="pd-tags">标签</label><input id="pd-tags" value="${esc((x.tags || []).join(' '))}" placeholder="用空格分开" autocomplete="off"></div>
        <label class="switch"><input type="checkbox" id="pd-local" ${x.local ? 'checked' : ''}> 本地（上海）</label></div>
        <div class="pd-foot"><button type="button" class="btn btn-quiet" data-pdback>返回</button><button type="submit" class="btn btn-seal">收进想去</button></div>
      </div>
    </form>`;
  }
  function readPalDetail(base) {
    const city = $('#pd-city').value.trim().split(/[，,、\s]+/).filter(Boolean);
    const local = $('#pd-local').checked;
    const g = guess(city.join(' '));
    return { ...base, name: $('#pd-name').value.trim() || base.name, type: $('input[name=pd-type]:checked').value, want: +$('input[name=pd-want]:checked').value, local,
      city: city[0] || (local ? '上海' : ''), country: local ? (g.local ? g.country : (base.local ? base.country : '上海')) : (city[1] || g.country || base.country || ''), area: local ? '上海' : (g.area || (city[0] === base.city ? base.area : city[0]) || ''),
      note: $('#pd-note').value.trim(), tags: $('#pd-tags').value.trim().split(/\s+/).filter(Boolean) };
  }
  function savePlace(x) {
    const p = draftPlace(x);
    const t = suggestedTrip(p);
    $('#palette').close();
    act(`已记下「${p.name}」`, () => { D.places.unshift(p); }, {
      action: t && t.days.length ? { label: `加进${t.subtitle}`, fn: () => openDrawer(p.id, { trip: t.id }) } : { label: '补充信息', fn: () => openDrawer(p.id) }
    });
  }
  function runPal(i) {
    const it = pal.items[i];
    if (!it || it.kind === 'parsing') return;
    if (it.kind === 'create') { savePlace(it.x); return; }
    $('#palette').close();
    if (it.kind === 'place') openDrawer(it.p.id);
    if (it.kind === 'trip') { curTrip = it.t.id; renderTrip(); location.hash = 'trip'; }
    if (it.kind === 'memo') location.hash = 'memories';
    if (it.kind === 'go') location.hash = it.href;
  }

  /* ============================== 地点抽屉 ============================== */
  const dr = { id: null, trip: null, moving: false };
  function openDrawer(id, { trip = null } = {}) {
    const p = P[id];
    if (!p) return;
    dr.id = id;
    dr.moving = false;
    dr.trip = trip || (p.state === 'want' ? suggestedTrip(p)?.id : p.trip) || null;
    renderDrawer();
    showDialog($('#drawer'));
    $('#drawer .dr-x')?.focus();
  }
  function renderDrawer() {
    const dlg = $('#drawer');
    const p = P[dr.id];
    if (!p) { if (dlg.open) dlg.close(); return; }
    const ms = memosOf(p.id);
    const steps = [
      ['want', '想去', `${dot(p.added)} 记下`, true],
      ['plan', '计划中', p.trip && T[p.trip] ? `${T[p.trip].subtitle}${p.day ? ' · Day ' + p.day : ''}` : (p.state === 'been' ? '没排行程' : '还没排'), p.state === 'plan' || (p.state === 'been' && !!p.trip)],
      ['been', '已去过', p.state === 'been' && p.been ? dot(p.been) : '还没去', p.state === 'been'],
      ['memo', '回忆', ms.length ? `${ms.length} 段` : '还没写', ms.length > 0]
    ];
    const curIdx = steps.map(s => s[3]).lastIndexOf(true);
    let main;
    if (p.dropped) {
      main = `<div class="dr-act"><p class="dr-say">已经放下了。如果又想去了，随时拿回来。</p><button class="btn btn-seal" data-undrop="${p.id}">重新想去</button></div>`;
    } else if (p.state === 'want') {
      main = `<div class="dr-act"><h3>加入行程</h3>${planPicker(p)}</div>`;
    } else if (p.state === 'plan' && T[p.trip]) {
      const t = T[p.trip];
      main = `<div class="dr-act"><p class="dr-say">排在「${esc(t.title)} ${esc(t.subtitle)}」${p.day ? ` Day ${p.day} · ${t.days[p.day - 1]?.date || ''}` : '，还没定哪天'}。</p>
        <div class="dr-btns"><button class="btn btn-seal" data-ckplace="${p.id}">到了，盖章</button>${t.days.length ? `<button class="btn" data-move="${p.id}" aria-expanded="${dr.moving}">${p.day ? '换一天' : '定一天'}</button>` : ''}<button class="btn btn-quiet" data-unplan="${p.id}">移出行程</button></div>
        ${dr.moving ? dayChips(t, p.day) : ''}
        ${t.end && daysUntil(t.start) > 0 ? `<p class="dr-tip">出发后，在「今天」页里到一处点一下就能盖章。</p>` : ''}</div>`;
    } else {
      main = `<div class="dr-act"><p class="dr-say">${p.been ? `${dot(p.been)} 去过。` : '去过。'}${ms.length ? `写过 ${ms.length} 段回忆。` : '还没写回忆。'}</p>
        <div class="dr-btns">${ms.length ? '<a class="btn" href="#memories" data-close>看回忆</a>' : `<button class="btn btn-seal" data-memo="${p.id}">写回忆</button>`}${p.local ? `<button class="btn ${ms.length ? 'btn-seal' : ''}" data-memo="${p.id}" data-again="1">又去了一次</button>` : ''}</div></div>`;
    }
    dlg.innerHTML = `<div class="drawer-in">
      <header class="dr-head">
        <button class="dr-x" data-close aria-label="关闭">×</button>
        <div class="dr-stamp">${stamp(p, { mark: true, clip: true })}</div>
        <div class="dr-id">
          <p class="dr-where">${p.local ? '<span class="local">本地</span>' : ''}${esc(whereOf(p))} · ${esc(p.type)}</p>
          <h2 id="dr-title">${esc(p.name)}</h2>
          <div class="dr-want" role="radiogroup" aria-label="想去程度">${[1, 2, 3, 4, 5].map(n => `<button role="radio" aria-checked="${n === p.want}" data-want="${n}">${n}<small>分</small></button>`).join('')}</div>
        </div>
      </header>
      <ol class="chain" aria-label="这个地方走到了哪一步">${steps.map(([k, l, s, on], i) => `<li class="${on ? 'on' : ''} ${i === curIdx ? 'cur' : ''}"><i class="mk ${k}"></i><b>${l}</b><small>${esc(s)}</small></li>`).join('')}</ol>
      ${main}
      <section class="dr-sec"><h3>什么时候去</h3>${months(p)}<p class="dr-note-s">${esc(p.seasonNote || '没有特别的季节，什么时候都行。')}</p></section>
      <section class="dr-sec"><h3>为什么想去</h3>
        <label class="sr-only" for="dr-note">为什么想去</label><textarea id="dr-note" class="hand-in" rows="2" placeholder="写一句，以后翻到时还记得为什么。">${esc(p.note || '')}</textarea>
        ${p.src ? `<p class="dr-src"><span class="src ${p.src.from === '小红书' ? 'xhs' : ''}">${esc(p.src.from)}</span>${esc(p.src.title)}</p>` : ''}</section>
      <section class="dr-sec"><h3>标签</h3><div class="dr-tags">${p.tags.map((t, i) => `<span class="tag">${esc(t)}<button class="tag-x" data-untag="${i}" aria-label="删掉标签 ${esc(t)}">×</button></span>`).join('')}<form id="tag-form" class="tag-form"><label class="sr-only" for="tag-in">加一个标签</label><input id="tag-in" placeholder="＋ 标签" autocomplete="off"></form></div></section>
      <footer class="dr-foot"><span>${dot(p.added)} 记下${p.src ? ' · 来自' + esc(p.src.from) : ''}</span>${!p.dropped && p.state !== 'been' ? `<button class="btn btn-sm btn-quiet" data-drop="${p.id}">不想去了</button>` : ''}</footer>
    </div>`;
  }
  function planPicker(p) {
    const ts = activeTrips().filter(t => !!t.local === !!p.local).sort((a, b) => (b.area === areaOf(p)) - (a.area === areaOf(p)));
    return `<div class="picker">${ts.map(t => {
      const match = t.area === areaOf(p), on = dr.trip === t.id;
      return `<div class="pick ${on ? 'on' : ''}"><button class="pick-t" data-pick-trip="${t.id}" aria-expanded="${on}"><b>${esc(t.title)} ${esc(t.subtitle)}</b><small>${t.end ? `${md(t.start)}${t.end !== t.start ? '–' + md(t.end) : ''}` : '日期待定'}${match ? ` · 同在${esc(t.area)}` : ''}</small></button>
        ${on ? (t.days.length ? dayChips(t) : `<div class="day-chips"><button data-pick-day="0" data-trip-id="${t.id}"><b>放进这次行程</b><small>还没排日程</small></button></div>`) : ''}</div>`;
    }).join('')}<button class="pick-new" data-newtrip-area="${esc(areaOf(p))}" data-with="${p.id}">＋ 为${esc(areaOf(p))}新建一次行程</button></div>`;
  }
  function dayChips(t, cur) {
    return `<div class="day-chips" role="group" aria-label="选一天">${t.days.map(d => `<button data-pick-day="${d.n}" data-trip-id="${t.id}" ${cur === d.n ? 'aria-current="true"' : ''}><b>Day ${d.n}</b><small>${d.date} ${esc(d.title)}</small></button>`).join('')}<button data-pick-day="0" data-trip-id="${t.id}"><b>不定哪天</b><small>先放进这次行程</small></button></div>`;
  }

  /* ============================== 盖章 / 写回忆 ============================== */
  const ck = { place: null, item: null, mode: 'checkin', date: D.today, time: '', rate: 0, cur: '¥', photos: [], sim: false };
  function openCheckin({ place = null, item = null, mode = 'checkin', date = D.today, time = '', sim = false }) {
    const p = place && P[place];
    Object.assign(ck, { place, item, mode, date, time, rate: 0, photos: [], sim, cur: p && p.country === '日本' ? '円' : p && p.country === '西班牙' ? '€' : '¥' });
    renderSheet();
    showDialog($('#sheet'));
    setTimeout(() => $('#ck-note')?.focus(), 500);
  }
  function renderSheet() {
    const p = ck.place && P[ck.place];
    const name = p ? p.name : ck.item?.title;
    const where = p ? whereOf(p) : '';
    const memo = ck.mode === 'memo';
    $('#sheet').innerHTML = `<form class="ck" id="ck-form">
      <header class="ck-h"><div><h2>${memo ? '写回忆' : '盖个章'}：${esc(name)}</h2><p>${dot(ck.date)}${ck.time ? ' ' + ck.time : ''}${where ? ' · ' + esc(where) : ''}</p></div><button type="button" class="dr-x" data-close aria-label="关闭">×</button></header>
      ${!memo && p ? `<div class="ck-stage">${stamp(p, { size: 'sm' })}${postmark(pmCity(p), dot(ck.date), { cls: 'thunk' })}</div>` : ''}
      <div class="ck-f"><label for="ck-note">一句话<span>${memo ? '' : '可以不写'}</span></label><textarea id="ck-note" class="hand-in" rows="3" placeholder="${p && p.type === '咖啡' ? '比如：拿铁一般，但窗外的八坂塔很好看' : '比如：人比想象的少，下次秋天再来'}"></textarea></div>
      ${p ? `<div class="ck-f"><span class="lbl" id="rate-l">评分</span><div class="rate" role="radiogroup" aria-labelledby="rate-l">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="${n === ck.rate}" aria-label="${n} 分" data-rate="${n}" class="${n <= ck.rate ? 'on' : ''}"></button>`).join('')}</div></div>` : ''}
      <div class="ck-row">
        <div class="sel-field"><label for="ck-cost">花费</label><input id="ck-cost" inputmode="decimal" placeholder="0" autocomplete="off"></div>
        <div class="seg sm" role="group" aria-label="币种">${['円', '¥', '€'].map(c => `<button type="button" data-cur="${c}" aria-pressed="${ck.cur === c}">${c}</button>`).join('')}</div>
      </div>
      ${p ? `<div class="ck-f"><span class="lbl">照片</span><div class="ck-photos"><label class="ph-add" for="ck-file" aria-label="添加照片">＋</label><input type="file" id="ck-file" accept="image/*" multiple class="sr-only"><span id="ck-thumbs"></span></div></div>` : ''}
      <footer class="ck-foot">${!memo ? '<button type="button" class="btn btn-quiet" data-ck="stamp-only">只盖章，回头再写</button>' : ''}<button class="btn btn-seal" type="submit">${memo ? '存进回忆' : '盖章，写进回忆'}</button></footer>
    </form>`;
  }
  function saveCheckin(stampOnly) {
    const p = ck.place && P[ck.place];
    const note = $('#ck-note').value.trim();
    const amt = parseFloat($('#ck-cost').value);
    const rate = { '円': .048, '¥': 1, '€': 7.8 }[ck.cur];
    const hasMemo = !stampOnly && p && (note || ck.rate || amt || ck.photos.length);
    const { item, sim, time, date, cur, mode } = ck;
    const photos = ck.photos.slice(), r = ck.rate;
    if (mode === 'memo' && !hasMemo) { toast('写一句话、打个分或者加张照片，再存。'); $('#ck-note').focus(); return; }
    $('#sheet').close();
    const msg = mode === 'memo' ? `已存进回忆：${p.name}` : `已盖章：${p ? p.name : item.title}${hasMemo ? '，写进回忆了' : ''}`;
    act(msg, () => {
      if (p && mode !== 'memo') markBeen(p, date);
      if (item) { if (sim) item.simDone = time; else item.done = true; }
      if (hasMemo) {
        D.memories.unshift({ place: p.id, date, rating: r, cost: amt ? (cur === '円' ? `${amt.toLocaleString('en-US')} 円` : cur + amt.toLocaleString('en-US')) : '', costCny: amt ? Math.round(amt * rate) : 0, photos: photos.length, note, img: photos[0] });
      }
      if (sim && amt) D.todaySim.spend.push({ t: time, cat: p && (p.type === '咖啡' || p.type === '餐馆') ? '吃饭' : '门票', what: p ? p.name : item.title, jpy: cur === '円' ? amt : Math.round(amt * rate / .048) });
    }, hasMemo ? { action: { label: '看回忆', fn: () => { location.hash = 'memories'; } } } : {});
  }

  /* ============================== 帮我挑一个 ============================== */
  const drw = { cat: 'all', pick: null, rolling: false };
  const DRAW_CATS = [['all', '都行'], ['餐馆', '吃饭'], ['咖啡', '咖啡'], ['自然', '走走']];
  const drawPool = () => alive().filter(p => p.local && p.state === 'want' && (drw.cat === 'all' || p.type === drw.cat));
  function openDraw() {
    drw.pick = null;
    showDialog($('#draw'));
    roll();
  }
  function roll() {
    const pool = drawPool();
    drw.rolling = pool.length > 1;
    renderDraw();
    setTimeout(() => {
      const prev = drw.pick;
      const cands = pool.filter(p => p !== prev);
      const list = cands.length ? cands : pool;
      const total = list.reduce((n, p) => n + p.want * p.want, 0);
      let r = Math.random() * total;
      drw.pick = list.find(p => (r -= p.want * p.want) < 0) || list[0] || null;
      drw.rolling = false;
      renderDraw();
    }, pool.length > 1 ? 950 : 0);
  }
  function renderDraw() {
    const pool = drawPool(), p = drw.pick;
    $('#draw').innerHTML = `<div class="draw">
      <header class="ck-h"><div><h2>今天去哪家</h2><p>从城里想去的 ${pool.length} 处里挑，想去程度越高越容易抽到。</p></div><button type="button" class="dr-x" data-close aria-label="关闭">×</button></header>
      <div class="seg sm" role="group" aria-label="想做什么">${DRAW_CATS.map(([v, l]) => `<button data-draw-cat="${v}" aria-pressed="${drw.cat === v}">${l}</button>`).join('')}</div>
      <div class="draw-stage ${drw.rolling ? 'rolling' : ''}" aria-live="polite">
        ${drw.rolling ? pool.slice(0, 5).map((x, i) => `<div class="draw-card" style="--k:${i}">${stamp(x, { size: 'sm' })}</div>`).join('')
          : p ? `<div class="draw-pick">${stamp(p)}</div>` : '<p class="hint">这一类里没有想去的了，换一个试试。</p>'}
      </div>
      ${p && !drw.rolling ? `<div class="draw-res"><h3>${esc(p.name)}</h3><p>${esc(p.city)} · ${p.want} 分${p.note ? ' · ' + esc(p.note) : ''}</p></div>` : '<div class="draw-res"><h3>&nbsp;</h3><p>&nbsp;</p></div>'}
      <footer class="ck-foot"><button class="btn btn-quiet" data-draw="again" ${drw.rolling ? 'disabled' : ''}>换一个</button>${p && !drw.rolling ? '<button class="btn btn-seal" data-draw="go">就去这家，排进本周六</button>' : ''}</footer>
    </div>`;
  }

  /* ============================== 出示预订 ============================== */
  function openShow(key) {
    const [tid, bi] = key.split(':');
    const b = T[tid]?.materials.booking[+bi];
    if (!b) return;
    $('#showbk').innerHTML = `<div class="show">
      <div class="show-tk">
        <div class="show-kind">${esc(b.kind)}</div>
        <div class="show-b"><p class="show-code">${esc(b.code)}</p><h2>${esc(b.title)}</h2>${b.lines.map(l => `<p>${esc(l)}</p>`).join('')}
          <p class="show-lbl">确认号</p><p class="show-ref" id="show-ref">${esc(b.ref)}</p></div>
      </div>
      <p class="hint">把这一页给工作人员看就行。</p>
      <footer class="ck-foot"><button class="btn" data-copy="${esc(b.ref)}">复制确认号</button><button class="btn btn-seal" data-close>好了</button></footer>
    </div>`;
    showDialog($('#showbk'));
  }

  /* ============================== 路由、导航、提示条 ============================== */
  const VIEWS = ['home', 'places', 'trip', 'map', 'memories', 'sort', 'providers', 'today'];
  const VIEW_NAME = { home: '总览', places: '想去', trip: '行程', map: '地图', memories: '回忆', sort: '一键整理', providers: '设置', today: '今天' };
  function navCounts() {
    $$('[data-n=places]').forEach(e => { e.textContent = alive().length; });
    $$('[data-n=trip]').forEach(e => { e.textContent = D.trips.length; });
    $$('[data-n=memories]').forEach(e => { e.textContent = D.memories.length; });
  }
  function route() {
    let v = location.hash.slice(1);
    if (!VIEWS.includes(v)) v = 'home';
    VIEWS.forEach(k => { $('#view-' + k).hidden = k !== v; });
    const navV = v === 'today' ? 'trip' : v;
    $$('[data-nav]').forEach(a => (a.dataset.nav === navV ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('#mtitle').textContent = VIEW_NAME[v];
    document.title = v === 'home' ? '远方清单' : `${VIEW_NAME[v]} · 远方清单`;
  }

  let toastTimer, toastFns = {};
  function toast(msg, { undo, action } = {}) {
    const el = $('#toast');
    toastFns = { u: undo, a: action?.fn };
    el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-ta="a">${esc(action.label)}</button>` : ''}${undo ? '<button data-ta="u">撤销</button>' : ''}`;
    el.classList.toggle('has-act', !!(undo || action));
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), undo || action ? 6000 : 2600);
  }

  function showDialog(dlg) {
    if (dlg.open) return;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  function refresh() {
    reindex();
    renderHome(); renderPlaces(); renderTrip(); renderMap(); renderMemories(); renderProviders(); renderToday(); navCounts();
    if ($('#drawer').open) renderDrawer();
    setTimeout(() => fresh.clear(), 60);
  }

  /* ---------- 点击 ---------- */
  document.addEventListener('click', e => {
    const tgt = e.target;
    if (tgt.tagName === 'DIALOG') { tgt.close(); return; }
    const el = tgt.closest('button, a, .pin, [data-place]');
    if (!el) return;
    const ds = el.dataset;

    if (ds.ta) { const fn = toastFns[ds.ta]; $('#toast').classList.remove('show'); if (fn) fn(); return; }
    if (ds.toast) { e.preventDefault(); toast(ds.toast); return; }
    if (ds.close !== undefined && el.closest('dialog')) { el.closest('dialog').close(); if (el.tagName === 'BUTTON') return; }
    if (ds.open === 'palette') { openPalette(ds.q || ''); return; }
    if (ds.open === 'draw') { openDraw(); return; }

    // 搜索框
    if (ds.hint) { const i = $('#pal-q'); i.value = ds.hint; pal.q = ds.hint; pal.sel = 0; pal.parsed = null; pal.parsing = false; if (/https?:\/\//.test(ds.hint)) parseLink(ds.hint); else renderPal(); i.focus(); return; }
    if (ds.pal) { runPal(+ds.pal); return; }
    if (ds.pdback !== undefined) { pal.detail = false; renderPal(); $('#pal-q').focus(); return; }

    // 地点：打开抽屉、状态链上的动作
    if (ds.plan) { openDrawer(ds.plan, { trip: ds.pre || null }); return; }
    if (ds.place && !el.closest('dialog')) { e.preventDefault(); openDrawer(ds.place); return; }
    if (ds.quickplan) {
      const p = P[ds.quickplan], t = T[ds.to];
      act(`已把「${p.name}」排进${t.subtitle}`, () => addToTrip(p, t.id, 1), { action: { label: '看行程', fn: () => { curTrip = t.id; renderTrip(); location.hash = 'trip'; } } });
      return;
    }
    if (ds.been) { const p = P[ds.been]; act(`已盖章：${p.name} 记为去过（${dot(D.today)}）`, () => markBeen(p, D.today), { action: { label: '写两句', fn: () => openCheckin({ place: p.id, mode: 'memo' }) } }); return; }
    if (ds.memo) { if ($('#drawer').open) $('#drawer').close(); openCheckin({ place: ds.memo, mode: ds.again ? 'checkin' : 'memo' }); return; }
    if (ds.ckplace) { $('#drawer').close(); openCheckin({ place: ds.ckplace, mode: 'checkin' }); return; }
    if (ds.pickTrip) { dr.trip = dr.trip === ds.pickTrip ? null : ds.pickTrip; renderDrawer(); return; }
    if (ds.pickDay !== undefined) {
      const p = P[dr.id], tid = ds.tripId || dr.trip, t = T[tid], n = +ds.pickDay;
      dr.moving = false;
      act(n ? `已排进「${t.subtitle}」Day ${n}` : `已放进「${t.subtitle}」，还没定哪天`, () => addToTrip(p, tid, n), { action: { label: '看行程', fn: () => { $('#drawer').close(); curTrip = tid; renderTrip(); location.hash = 'trip'; } } });
      return;
    }
    if (ds.move) { dr.moving = !dr.moving; renderDrawer(); return; }
    if (ds.unplan) { const p = P[ds.unplan]; act(`已把「${p.name}」移出行程`, () => { removeFromDays(p); p.state = 'want'; delete p.trip; delete p.day; }); return; }
    if (ds.want) { const p = P[dr.id]; p.want = +ds.want; refresh(); toast(`想去程度改成 ${p.want} 分`); return; }
    if (ds.untag !== undefined) { const p = P[dr.id]; p.tags.splice(+ds.untag, 1); refresh(); return; }
    if (ds.drop) { const p = P[ds.drop]; $('#drawer').close(); act(`已放下「${p.name}」，在想去里能找回来`, () => { removeFromDays(p); p.dropped = true; if (p.state === 'plan') { p.state = 'want'; delete p.trip; delete p.day; } }); return; }
    if (ds.undrop) { const p = P[ds.undrop]; act(`「${p.name}」回到想去了`, () => { delete p.dropped; }); return; }
    if (ds.newtripArea) {
      const area = ds.newtripArea;
      const ps = ds.with ? [P[ds.with]] : alive().filter(p => areaOf(p) === area && p.state === 'want');
      const id = uid();
      if ($('#drawer').open) $('#drawer').close();
      act(`已为${area}新建一次行程，放进了 ${ps.length} 处`, () => {
        const local = ps.some(p => p.local);
        D.trips.push({ id, title: area, subtitle: '新的旅行', area, start: String(TODAY.getFullYear() + 1), end: '', status: 'draft', local, progress: 5, budget: 0, spent: 0, people: '我', leg: { from: ['PVG', '上海浦东', '日期待定'], to: [area.slice(0, 3), area, ''], via: '还没定怎么去' }, days: [], materials: { prep: [], guide: [], booking: [], note: [] } });
        reindex();
        ps.forEach(p => { p.state = 'plan'; p.trip = id; delete p.day; });
        curTrip = id;
      }, { action: { label: '去看看', fn: () => { location.hash = 'trip'; } } });
      return;
    }

    // 今天
    if (ds.ckitem !== undefined) {
      const s = D.todaySim, it = T[s.trip].days[s.day - 1].items[+ds.ckitem];
      openCheckin({ place: it.place || null, item: it, mode: 'checkin', date: s.date, time: s.now, sim: true });
      return;
    }
    if (ds.show) { openShow(ds.show); return; }
    if (ds.copy) {
      const ok = () => toast('确认号已复制');
      const fallback = () => { const r = document.createRange(); r.selectNodeContents($('#show-ref')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('已选中确认号，手动复制一下'); };
      try { navigator.clipboard.writeText(ds.copy).then(ok, fallback); } catch { fallback(); }
      return;
    }

    // 帮我挑一个
    if (ds.drawCat) { drw.cat = ds.drawCat; drw.pick = null; roll(); return; }
    if (ds.draw === 'again') { roll(); return; }
    if (ds.draw === 'go') { const p = drw.pick; $('#draw').close(); act(`就去「${p.name}」，已排进本周六`, () => addToTrip(p, 'weekend', 1, '12:00'), { action: { label: '看行程', fn: () => { curTrip = 'weekend'; renderTrip(); location.hash = 'trip'; } } }); return; }

    // 想去：视图与筛选
    if (ds.pview) { pf.view = ds.pview; renderPlaces(); return; }
    if (ds.f) {
      const k = ds.f;
      if (k === 'season') pf.season = !pf.season;
      else if (k === 'scope') pf.scope = ds.v;
      else pf[k] = pf[k] === ds.v ? '' : ds.v;
      renderPlaces();
      return;
    }

    // 行程
    if (ds.trip && (el.classList.contains('trip-tab') || el.getAttribute('href') === '#trip')) {
      curTrip = ds.trip;
      renderTrip();
      if (ds.focus === 'cands') setTimeout(() => $('#cands')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      return;
    }
    if (ds.tab) {
      curTab = ds.tab;
      $$('.folder-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === curTab)));
      $('#folder-body').innerHTML = folderBody(T[curTrip]);
      return;
    }
    if (ds.rm) {
      const [di, ii] = ds.rm.split(':').map(Number), t = T[curTrip], it = t.days[di].items[ii];
      act(`已移除「${it.title}」`, () => {
        t.days[di].items.splice(ii, 1);
        const p = it.place && P[it.place];
        if (p && p.state === 'plan') { p.state = 'want'; delete p.trip; delete p.day; }
      });
      return;
    }

    // 地图
    if (ds.map) { mapMode = ds.map; mapSel = mapMode === 'world' ? '关西' : 'banceng'; renderMap(); return; }
    if (el.classList.contains('pin')) { mapSel = ds.c; renderMap(); return; }
    if (ds.pick) {
      const p = P[ds.pick];
      if (p.local) { mapMode = 'city'; mapSel = p.id; } else { mapMode = 'world'; mapSel = areaOf(p); }
      renderMap();
      return;
    }

    // 一键整理
    if (ds.src) { sortSrc = ds.src; const txt = $('#sort-text').value; renderSort(); $('#sort-text').value = txt; $('#char-n').textContent = txt.length + ' 字'; return; }
    if (el.id === 'run-sort') {
      if (!$('#sort-text').value.trim()) { toast('先把要整理的内容贴进来。'); $('#sort-text').focus(); return; }
      el.disabled = true; el.textContent = '正在拆信…';
      $('#sort-meta').textContent = '正在请求 ' + $('#sort-prov').selectedOptions[0].textContent + '…';
      const run = ++sortRun;
      setTimeout(() => {
        if (run !== sortRun || !$('#trays')) return;
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
    if (el.id === 'commit-btn') { commitSort(); return; }

    // 服务商
    if (ds.use) {
      D.providers.forEach(p => { p.active = p.id === ds.use; });
      renderProviders(); renderSort();
      toast(`已启用 ${D.providers.find(p => p.active).name}，之后的整理都用它。`);
      return;
    }
    if (el.id === 'pv-test') {
      toast($('#pv-base').value.trim() && $('#pv-key').value.trim() ? '连接正常，模型有响应（0.8 秒）。' : '先填好接口地址和密钥，再测试连接。');
      return;
    }

    // 盖章表单
    if (ds.rate) { ck.rate = ck.rate === +ds.rate ? 0 : +ds.rate; $$('#sheet [data-rate]').forEach(b => { b.classList.toggle('on', +b.dataset.rate <= ck.rate); b.setAttribute('aria-checked', String(+b.dataset.rate === ck.rate)); }); return; }
    if (ds.cur) { ck.cur = ds.cur; $$('#sheet [data-cur]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cur === ck.cur))); return; }
    if (ds.ck === 'stamp-only') { saveCheckin(true); }
  });

  /* ---------- 键盘 ---------- */
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = ['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable;
    const anyOpen = $$('dialog').some(d => d.open);
    if (!typing && !anyOpen && (e.key === '/' || e.key === 'n') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); openPalette(); return; }
    if (e.target.id === 'pal-q') {
      const n = pal.items.length;
      const selectable = i => pal.items[i] && pal.items[i].kind !== 'parsing';
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) {
        e.preventDefault();
        let i = pal.sel;
        for (let k = 0; k < n; k++) { i = (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; if (selectable(i)) break; }
        pal.sel = i; renderPal();
      }
      if (e.key === 'Enter') { e.preventDefault(); if (selectable(pal.sel)) runPal(pal.sel); }
      if (e.key === 'Tab' && !e.shiftKey && pal.items.some(x => x.kind === 'create')) { e.preventDefault(); pal.detail = true; renderPal(); $('#pd-name')?.focus(); }
    }
    const pin = e.target.closest?.('.pin');
    if (pin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pin.click(); }
  });

  /* ---------- 输入 ---------- */
  const syncDetailStamp = () => {
    const draft = pal.items.find(x => x.kind === 'create');
    const el = $('#pal-form .pd-prev .stamp-wrap');
    if (draft && el) el.outerHTML = stamp(draftPlace(readPalDetail(draft.x)));
  };
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'q-places') { pf.q = t.value; renderAlbum(); return; }
    if (t.id === 'sort-text') { $('#char-n').textContent = t.value.length + ' 字'; return; }
    if (t.id === 'pal-q') {
      pal.q = t.value; pal.sel = 0; pal.detail = false;
      if (/https?:\/\//.test(pal.q)) { if (!pal.parsed && !pal.parsing) parseLink(pal.q); else renderPal(); }
      else { pal.parsed = null; pal.parsing = false; renderPal(); }
      return;
    }
    if (t.closest('#pal-form')) syncDetailStamp();
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'sort-places') { pf.sort = t.value; renderAlbum(); return; }
    if (t.dataset.prep) {
      T[t.dataset.prep].materials.prep[+t.dataset.i].done = t.checked;
      renderHome();
      if (curTrip === t.dataset.prep && curTab === 'prep') $('#folder-body').innerHTML = folderBody(T[curTrip]);
      return;
    }
    if (t.dataset.cand) {
      if (t.value === '') return;
      const p = P[t.dataset.cand], tr = T[curTrip], n = +t.value;
      act(n ? `已把「${p.name}」排进 Day ${n}` : `已把「${p.name}」放进「${tr.subtitle}」`, () => addToTrip(p, tr.id, n));
      return;
    }
    if (t.closest('#trays') || t.id === 'sort-trip') { updateCommit(); return; }
    if (t.id === 'dr-note') { P[dr.id].note = t.value.trim(); toast('记下了'); return; }
    if (t.id === 'ck-file' && t.files.length) {
      Array.from(t.files).slice(0, 6).forEach(file => {
        const r = new FileReader();
        r.onload = () => { ck.photos.push(r.result); $('#ck-thumbs').innerHTML = ck.photos.map(src => `<img src="${src}" alt="">`).join(''); };
        r.readAsDataURL(file);
      });
      return;
    }
    if (t.id === 'shot-file' && t.files.length) {
      $('#sort-text').value = D.aiSample;
      $('#char-n').textContent = D.aiSample.length + ' 字';
      toast(`演示：从 ${t.files.length} 张截图里识别出 ${D.aiSample.split('\n').filter(Boolean).length} 行文字，已填进下面`);
      return;
    }
    if (t.closest('#pal-form')) syncDetailStamp();
  });

  /* ---------- 提交 ---------- */
  document.addEventListener('submit', e => {
    e.preventDefault();
    const fm = e.target;
    if (fm.id === 'prov-form') {
      const name = $('#pv-name').value.trim(), base = $('#pv-base').value.trim(), key = $('#pv-key').value.trim();
      if (!name || !base || !key) { toast('名称、接口地址和密钥都要填。'); return; }
      D.providers.push({ id: uid(), name, base, model: $('#pv-model').value.trim() || '未填写', key: 'sk-••••••••••••' + key.slice(-4), active: false, used: '刚刚添加' });
      renderProviders(); renderSort();
      toast(`已保存：${name}`);
      return;
    }
    if (fm.id === 'pal-form') {
      const draft = pal.items.find(x => x.kind === 'create');
      if (!$('#pd-name').value.trim()) { $('#pd-name').focus(); return; }
      savePlace(readPalDetail(draft.x));
      return;
    }
    if (fm.id === 'ck-form') { saveCheckin(false); return; }
    if (fm.id === 'link-form') {
      if (!$('#sort-link').value.trim()) { $('#sort-link').focus(); toast('先粘贴一个链接。'); return; }
      $('#sort-text').value = D.aiSample;
      $('#char-n').textContent = D.aiSample.length + ' 字';
      toast('演示：已读取正文，填进下面了');
      return;
    }
    if (fm.id === 'tag-form') {
      const v = $('#tag-in').value.trim();
      if (!v) return;
      P[dr.id].tags.push(...v.split(/\s+/));
      refresh();
      $('#tag-in')?.focus();
      return;
    }
    if (fm.classList.contains('quick-add')) {
      const input = fm.querySelector('input'), v = input.value.trim();
      if (!v) return;
      const di = +fm.dataset.di, t = T[curTrip];
      const m = /^\s*(\d{1,2})[:：](\d{2})\s*(.*)$/.exec(v);
      const time = m ? `${m[1].padStart(2, '0')}:${m[2]}` : '待定';
      const title = (m ? m[3] : v).trim() || v;
      const nt = norm(title);
      const p = nt.length >= 2 ? alive().find(x => x.state !== 'been' && (norm(x.name).includes(nt) || nt.includes(norm(x.name)))) : null;
      const g = guess(title);
      const kind = /车|地铁|巴士|航班|机场|→|电铁/.test(title) ? '交通' : g.type === '城市' ? '景点' : g.type;
      act(`已加到 Day ${t.days[di].n}：${time} ${p ? p.name : title}${p ? '（来自想去）' : ''}`, () => {
        if (p) { removeFromDays(p); p.state = 'plan'; p.trip = t.id; p.day = t.days[di].n; }
        const it = { t: time, kind: p ? p.type : kind, title: p ? p.name : title, note: p ? (p.note || '') : '', place: p ? p.id : undefined };
        insertItem(t.days[di], it);
        freshItems.add(it);
        openDays(t.id).add(di);
      });
      setTimeout(() => $(`#qa-${t.id}-${di}`)?.focus(), 30);
      return;
    }
    if (fm.id === 'spend-form') {
      const amt = parseFloat($('#sp-amt').value);
      if (!amt) { $('#sp-amt').focus(); toast('先填金额。'); return; }
      const cat = $('input[name=sp-cat]:checked').value;
      const what = $('#sp-what').value.trim();
      act(`记了一笔：${amt.toLocaleString('en-US')} 円`, () => {
        D.todaySim.spend.push({ t: D.todaySim.now, cat, what: what || cat, jpy: amt });
      });
      setTimeout(() => $('#sp-amt')?.focus(), 30);
    }
  });

  /* ---------- 拖动调整日程 ---------- */
  let drag = null;
  const clearDrop = () => $$('.drop-before, .drop-end').forEach(x => x.classList.remove('drop-before', 'drop-end'));
  document.addEventListener('dragstart', e => {
    const li = e.target.closest?.('.item[draggable]');
    if (!li) return;
    drag = { di: +li.dataset.di, ii: +li.dataset.ii };
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${drag.di}:${drag.ii}`);
  });
  document.addEventListener('dragover', e => {
    if (!drag) return;
    const li = e.target.closest?.('.item[draggable]'), ol = e.target.closest?.('.items');
    if (!li && !ol) return;
    e.preventDefault();
    clearDrop();
    if (li) li.classList.add('drop-before'); else ol.classList.add('drop-end');
  });
  document.addEventListener('drop', e => {
    if (!drag) return;
    const li = e.target.closest?.('.item[draggable]'), ol = e.target.closest?.('.items');
    if (!li && !ol) return;
    e.preventDefault();
    const t = T[curTrip], from = drag;
    const toDi = li ? +li.dataset.di : +ol.dataset.di;
    let toIi = li ? +li.dataset.ii : t.days[toDi].items.length;
    drag = null;
    if (toDi === from.di && (toIi === from.ii || toIi === from.ii + 1)) { clearDrop(); return; }
    const it = t.days[from.di].items[from.ii];
    act(`已把「${it.title}」挪到 Day ${t.days[toDi].n}`, () => {
      const [moved] = t.days[from.di].items.splice(from.ii, 1);
      if (from.di === toDi && from.ii < toIi) toIi--;
      t.days[toDi].items.splice(toIi, 0, moved);
      const p = moved.place && P[moved.place];
      if (p) p.day = t.days[toDi].n;
      freshItems.add(moved);
      openDays(t.id).add(toDi);
    });
  });
  document.addEventListener('dragend', () => {
    drag = null;
    $$('.dragging').forEach(x => x.classList.remove('dragging'));
    clearDrop();
  });

  document.addEventListener('toggle', e => {
    const d = e.target;
    if (!d.matches?.('details.day')) return;
    const set = openDays(curTrip), di = +d.dataset.di;
    if (d.open) set.add(di); else set.delete(di);
  }, true);

  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

  const CN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const cnDay = n => (n <= 10 ? CN[n] : n < 20 ? '十' + CN[n - 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : ''));
  $('#date-v').textContent = `${CN[TODAY.getMonth() + 1]}月${cnDay(TODAY.getDate())}日　${WD[TODAY.getDay()]}`;

  refresh();
  renderSort();
  route();
})();
