/* 远方清单 · 第三版
   这一版能真的用起来：
   - 数据存在本机浏览器里（localStorage），可以导出、导入、清空重来；
   - 「一键整理」会调用你在设置里填的 OpenAI 兼容服务（下载到本地打开时可用）；
   - 日期是真实日期：倒计时、截止时间、行程状态（草拟 / 计划中 / 进行中 / 已完成）都由日期推算。
   几个约定：
   - 改数据的操作都走 act()：自动保存，可撤销。
   - 记东西只要一步：首页投递口或按 / 打开的输入框，名字回车就存；长内容交给 AI 分拣。
   - 首页是「下一步」：每一条都是把某个地方往「想去 → 计划中 → 已去过 → 回忆」推一格。 */
(() => {
  'use strict';

  const SAMPLE = window.DATA;
  const WORLD = window.WORLD;
  const STORE_KEY = 'yuanfang/v3';
  const D = {};
  const clone = o => JSON.parse(JSON.stringify(o));
  let storageOk = true, lastSaved = null, saveTimer;
  (function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { storageOk = false; }
    Object.assign(D, saved && saved.version === 3 && Array.isArray(saved.places) ? saved : clone(SAMPLE));
    D.snoozed ||= {}; D.prefs ||= {};
  })();
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(D)); storageOk = true; lastSaved = new Date(); }
      catch { storageOk = false; }
    }, 150);
  }

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
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const NOW = new Date();
  const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  const todayISO = () => iso(TODAY);
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const MONTH = TODAY.getMonth() + 1;
  const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const pd = s => new Date(s + 'T00:00:00');
  const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
  const daysUntil = s => Math.round((pd(s) - TODAY) / 864e5);
  const daysSince = s => (isDate(s) ? -daysUntil(s) : 0);
  const dot = s => String(s || '').replaceAll('-', '.');
  const md = s => (isDate(s) ? s.slice(5).replace('-', '.') : String(s || '').replace('-', '.'));
  const yen = n => '¥' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const toMin = s => { const m = /^(\d{1,2})[:：](\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const span = m => (m >= 60 ? `${Math.floor(m / 60)} 小时${m % 60 ? ` ${m % 60} 分` : ''}` : `${m} 分钟`);
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const norm = s => String(s || '').replace(/[\s·・,，、|｜]/g, '').toLowerCase();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const RATE = { '¥': 1, '円': .048, '€': 7.8, '$': 7.2, 'kr': .052, '฿': .2, '₩': .0052 };
  function dueLabel(due) {
    if (!due) return '';
    const [d, t = ''] = String(due).split(' ');
    if (!isDate(d)) return due;
    const k = daysUntil(d);
    const w = k === 0 ? '今天' : k === 1 ? '明天' : k === 2 ? '后天' : k < 0 ? `过期 ${-k} 天` : k < 7 ? WD[pd(d).getDay()] : md(d);
    return `${w}${t ? ' ' + t : ''}`;
  }
  const dueDays = due => { const d = String(due || '').split(' ')[0]; return isDate(d) ? daysUntil(d) : null; };

  const alive = () => D.places.filter(p => !p.dropped);
  const areaOf = p => p.area || (p.local ? D.home.city : (p.city || '未分组'));
  const memosOf = id => D.memories.filter(m => m.place === id);
  const whereOf = p => (p.local ? `${D.home.city} · ${p.city}` : [p.country, p.city].filter(Boolean).join(' · ') || '还没填地方');

  /* 常见城市的大致坐标：记地点时没填坐标，就先放在城市中心，地图上能看到 */
  const CITY = {
    京都: [35.0116, 135.7681, '日本', '关西'], 大阪: [34.6937, 135.5023, '日本', '关西'], 奈良: [34.6851, 135.8048, '日本', '关西'], 宇治: [34.8844, 135.7999, '日本', '关西'], 神户: [34.6901, 135.1955, '日本', '关西'],
    东京: [35.6762, 139.6503, '日本', '东京'], 镰仓: [35.3192, 139.5467, '日本', '东京'], 北海道: [43.0642, 141.3469, '日本', '北海道'], 札幌: [43.0618, 141.3545, '日本', '北海道'], 冲绳: [26.2124, 127.6809, '日本', '冲绳'],
    首尔: [37.5665, 126.978, '韩国', '首尔'], 济州: [33.4996, 126.5312, '韩国', '济州'], 台北: [25.033, 121.5654, '中国台湾', '台北'], 香港: [22.3193, 114.1694, '中国香港', '香港'], 澳门: [22.1987, 113.5439, '中国澳门', '澳门'],
    清迈: [18.7883, 98.9853, '泰国', '清迈'], 曼谷: [13.7563, 100.5018, '泰国', '曼谷'], 普吉: [7.8804, 98.3923, '泰国', '普吉'], 新加坡: [1.3521, 103.8198, '新加坡', '新加坡'], 巴厘岛: [-8.4095, 115.1889, '印度尼西亚', '巴厘岛'], 暹粒: [13.3671, 103.8448, '柬埔寨', '吴哥'],
    北京: [39.9042, 116.4074, '中国', '北京'], 上海: [31.2304, 121.4737, '中国', '上海'], 杭州: [30.2741, 120.1551, '中国', '杭州'], 苏州: [31.2989, 120.5853, '中国', '苏州'], 南京: [32.0603, 118.7969, '中国', '南京'],
    成都: [30.5728, 104.0668, '中国', '成都'], 重庆: [29.563, 106.5516, '中国', '重庆'], 西安: [34.3416, 108.9398, '中国', '西安'], 广州: [23.1291, 113.2644, '中国', '广州'], 深圳: [22.5431, 114.0579, '中国', '深圳'],
    厦门: [24.4798, 118.0894, '中国', '厦门'], 大理: [25.6065, 100.2676, '中国', '大理'], 丽江: [26.8721, 100.2299, '中国', '丽江'], 拉萨: [29.652, 91.1721, '中国', '拉萨'], 长沙: [28.2282, 112.9388, '中国', '长沙'], 武汉: [30.5928, 114.3055, '中国', '武汉'], 青岛: [36.0671, 120.3826, '中国', '青岛'],
    里斯本: [38.7223, -9.1393, '葡萄牙', '里斯本'], 辛特拉: [38.8029, -9.3817, '葡萄牙', '里斯本'], 波尔图: [41.1579, -8.6291, '葡萄牙', '波尔图'], 巴塞罗那: [41.3874, 2.1686, '西班牙', '巴塞罗那'], 马德里: [40.4168, -3.7038, '西班牙', '马德里'],
    巴黎: [48.8566, 2.3522, '法国', '巴黎'], 伦敦: [51.5072, -0.1276, '英国', '伦敦'], 罗马: [41.9028, 12.4964, '意大利', '罗马'], 佛罗伦萨: [43.7696, 11.2558, '意大利', '佛罗伦萨'], 威尼斯: [45.4408, 12.3155, '意大利', '威尼斯'],
    伊斯坦布尔: [41.0082, 28.9784, '土耳其', '伊斯坦布尔'], 冰岛: [64.9631, -19.0208, '冰岛', '冰岛'], 雷克雅未克: [64.1466, -21.9426, '冰岛', '冰岛'], 纽约: [40.7128, -74.006, '美国', '纽约'], 悉尼: [-33.8688, 151.2093, '澳大利亚', '悉尼']
  };

  /* ---------- 行程：状态、里程碑、进度都由数据推算 ---------- */
  function tripStatus(t) {
    if (!isDate(t.start)) return 'draft';
    if (TODAY < pd(t.start)) return 'plan';
    if (TODAY > pd(isDate(t.end) ? t.end : t.start)) return 'done';
    return 'going';
  }
  const tripLen = t => (isDate(t.start) ? Math.round((pd(isDate(t.end) ? t.end : t.start) - pd(t.start)) / 864e5) + 1 : 0);
  const booked = t => t.materials.booking.reduce((n, b) => n + (+b.price || 0), 0);
  const spentOf = t => (t.spent != null ? t.spent : booked(t));
  const activeTrips = () => D.trips.filter(t => tripStatus(t) !== 'done');
  const tripName = t => t.subtitle || t.title;
  const TRANSPORT = /机票|航班|火车|高铁|车票|船票|大巴/, STAY = /酒店|民宿|住宿|旅馆|青旅|露营/;
  function milestones(t) {
    const ms = [];
    const len = tripLen(t);
    ms.push({ k: 'date', l: '定日期', done: isDate(t.start), hint: isDate(t.start) ? (len > 1 ? `${md(t.start)}–${md(t.end)}` : md(t.start)) : (t.start ? `大概 ${md(t.start)}` : '还没定') });
    if (!t.local) {
      const ok = t.materials.booking.some(b => TRANSPORT.test(b.kind));
      ms.push({ k: 'go', l: '订交通', done: ok, hint: ok ? '已订' : '机票 / 火车' });
    }
    if (!t.local && (len > 1 || !isDate(t.start))) {
      const ok = t.materials.booking.some(b => STAY.test(b.kind));
      ms.push({ k: 'stay', l: '订住宿', done: ok, hint: ok ? '已订' : '酒店 / 民宿' });
    }
    const filled = t.days.filter(d => d.items.length).length;
    ms.push({ k: 'days', l: '排日程', done: t.days.length > 0 && filled === t.days.length, hint: t.days.length ? `${filled}/${t.days.length} 天` : '还没排' });
    const pr = t.materials.prep, pdn = pr.filter(x => x.done).length;
    ms.push({ k: 'prep', l: '准备', done: pr.length > 0 && pdn === pr.length, hint: pr.length ? `${pdn}/${pr.length}` : '还没列' });
    return ms;
  }
  const nextMilestone = t => milestones(t).find(m => !m.done);
  function progress(t) {
    if (tripStatus(t) === 'done') return 100;
    const ms = milestones(t), pr = t.materials.prep;
    let sc = ms.filter(m => m.done).length;
    if (!ms.find(m => m.k === 'prep').done && pr.length) sc += pr.filter(x => x.done).length / pr.length;
    return Math.round(sc / ms.length * 100);
  }
  function nextTrip() {
    const ts = D.trips.filter(t => ['going', 'plan'].includes(tripStatus(t)));
    return ts.find(t => tripStatus(t) === 'going') || ts.sort((a, b) => a.start.localeCompare(b.start))[0] || null;
  }
  function syncDays(t) {
    if (!isDate(t.start)) return;
    const n = tripLen(t);
    const days = t.days.slice().sort((a, b) => a.n - b.n);
    while (days.length < n) days.push({ n: days.length + 1, title: '', items: [] });
    if (days.length > n) days.splice(n).forEach(d => days[n - 1].items.push(...d.items));
    days.forEach((d, i) => { const s = addDays(t.start, i); d.n = i + 1; d.date = md(s); d.wd = WD[pd(s).getDay()]; });
    t.days = days;
    D.places.forEach(p => { if (p.trip === t.id && p.day > n) p.day = n; });
  }

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
  const STATUS = { plan: ['st-plan', '计划中'], draft: ['st-draft', '草拟'], done: ['st-done', '已完成'], going: ['st-going', '进行中'] };
  const statusPill = s => `<span class="st ${STATUS[s][0]}">${STATUS[s][1]}</span>`;

  /* ---------- 车票（行程卡）与里程碑 ---------- */
  function ladder(t, interactive = false) {
    const st = tripStatus(t), ms = milestones(t), nx = ms.find(m => !m.done);
    const endDone = st === 'going' || st === 'done';
    return `<ol class="ladder" aria-label="这次旅行准备到哪一步了">${ms.map(m => {
      const isNext = m === nx && st !== 'done';
      const inner = `<i class="hole ${m.done ? 'on' : ''}" aria-hidden="true"></i><b>${m.l}</b><small>${esc(m.hint)}</small>`;
      return `<li class="${m.done ? 'done' : ''} ${isNext ? 'next' : ''}">${interactive && !m.done && st !== 'done' ? `<button class="rung" data-ms="${m.k}" data-trip-id="${t.id}" title="${m.l}">${inner}</button>` : `<span class="rung">${inner}</span>`}</li>`;
    }).join('')}<li class="end ${endDone ? 'done' : ''}"><span class="rung"><i class="hole ${endDone ? 'on' : ''}" aria-hidden="true"></i><b>${st === 'done' ? '回来了' : '出发'}</b><small>${st === 'plan' ? `${daysUntil(t.start)} 天后` : st === 'going' ? '进行中' : st === 'done' ? md(t.end || t.start) : ''}</small></span></li></ol>`;
  }
  function pass(t, { lg = false, kicker = '', action = '' } = {}) {
    const st = tripStatus(t), len = tripLen(t);
    const dates = isDate(t.start) ? (len === 1 ? `${md(t.start)}<small>${WD[pd(t.start).getDay()]} · 1 天</small>` : `${md(t.start)}–${md(t.end)}<small>共 ${len} 天</small>`) : `${esc(t.start ? md(t.start) : '待定')}<small>${t.start ? '大概的月份' : '日期待定'}</small>`;
    const sp = spentOf(t), over = t.budget && sp > t.budget, pct = t.budget ? Math.min(100, Math.round(sp / t.budget * 100)) : 0;
    let stub;
    if (st === 'done') stub = `<div class="countdown"><small>回来</small><b>${Math.max(1, Math.round((TODAY - pd(isDate(t.end) ? t.end : t.start)) / 864e5 / 30))}</b><span>个月了</span></div><a class="btn btn-sm" href="#memories">看回忆</a>`;
    else if (st === 'going') stub = `<div class="countdown"><small>今天是第</small><b>${daysSince(t.start) + 1}</b><span>天</span></div><a class="btn btn-sm btn-seal" href="#today">打开今天</a>`;
    else if (st === 'draft') { const nx = nextMilestone(t); stub = `<div class="countdown"><small>还在草拟</small><b>${progress(t)}<span class="pct">%</span></b><span>准备好了</span></div>${nx ? `<button class="btn btn-sm btn-seal" data-ms="${nx.k}" data-trip-id="${t.id}">${nx.l}</button>` : ''}`; }
    else stub = `<div class="countdown"><small>出发前</small><b>${daysUntil(t.start)}</b><span>天</span></div>${action}`;
    const from = t.leg?.from || [D.home.city, '出发', isDate(t.start) ? md(t.start) : ''];
    const to = t.leg?.to || [t.area || t.title, '', isDate(t.end) ? md(t.end) : ''];
    const H = lg ? 'h2' : 'h3';
    return `<article class="pass ${lg ? 'lg' : ''} ${t.leg ? '' : 'noleg'}">
      <div class="pass-main">
        <div class="pass-head"><span class="pass-kicker">${esc(kicker || (t.local ? `${D.home.city} · 本地` : '旅行'))}</span>${statusPill(st)}</div>
        <${H} class="pass-title">${esc(t.title)}${t.subtitle ? `<small>${esc(t.subtitle)}</small>` : ''}</${H}>
        <div class="leg">
          <div class="port"><b>${esc(from[0])}</b><span>${esc(from[1])}</span><time>${esc(from[2]) || '&nbsp;'}</time></div>
          <div class="leg-line"><span>${esc(t.leg?.via || '')}</span></div>
          <div class="port r"><b>${esc(to[0])}</b><span>${esc(to[1])}</span><time>${esc(to[2]) || '&nbsp;'}</time></div>
        </div>
        <dl class="pass-meta">
          <div><dt>日期</dt><dd>${dates}</dd></div>
          <div><dt>${st === 'done' ? '花费 / 预算' : '已订 / 预算'}</dt><dd>${yen(sp)} / ${t.budget ? yen(t.budget) : '未定'}</dd><div class="budget-bar ${over ? 'over' : ''}"><i style="width:${pct}%"></i></div></div>
          <div><dt>同行</dt><dd style="font-family:var(--f-body)">${esc(t.people || '我')}</dd></div>
        </dl>
        ${ladder(t, lg)}
      </div>
      <div class="pass-stub">${stub}</div>
    </article>`;
  }

  function checkItem(x, i, tripId, removable = false) {
    const k = dueDays(x.due);
    return `<li class="mat-li"><label class="check"><input type="checkbox" data-prep="${tripId}" data-i="${i}" ${x.done ? 'checked' : ''}><span class="box" aria-hidden="true"></span><span class="txt">${esc(x.text)}${x.due ? `<span class="due ${k != null && k <= 1 && !x.done ? 'hot' : ''}">${esc(dueLabel(x.due))}</span>` : ''}${x.meta ? `<span class="aside">${esc(x.meta)}</span>` : ''}</span></label>${removable ? `<button class="mat-rm" data-delmat="prep:${i}" aria-label="删掉 ${esc(x.text)}">×</button>` : ''}</li>`;
  }

  /* ---------- 改数据：统一入口，自动保存，可撤销 ---------- */
  function act(msg, fn, opts = {}) {
    const snap = structuredClone(D);
    fn();
    save();
    refresh();
    if (msg) toast(msg, { undo: () => { restore(snap); opts.onUndo?.(); save(); refresh(); toast('已撤销'); }, action: opts.action });
  }
  function restore(snap) {
    Object.keys(D).forEach(k => { delete D[k]; });
    Object.assign(D, snap);
    D.snoozed ||= {}; D.prefs ||= {};
    reindex();
  }
  function markBeen(p, date) {
    p.state = 'been';
    p.been = date;
    delete p.dropped;
    fresh.add(p.id);
  }
  function addToTrip(p, tripId, dayN, time = '待定') {
    const t = T[tripId];
    removeFromDays(p);
    p.state = 'plan';
    p.trip = tripId;
    delete p.dropped;
    if (dayN && t.days[dayN - 1]) {
      p.day = dayN;
      const it = { t: time, kind: p.type, title: p.name, note: p.note || '', place: p.id };
      insertItem(t.days[dayN - 1], it);
      openDays(tripId).add(dayN - 1);
      freshItems.add(it);
    } else delete p.day;
  }
  function unplan(p) {
    removeFromDays(p);
    if (p.state === 'plan') p.state = 'want';
    delete p.trip; delete p.day;
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
  const localTrip = () => activeTrips().filter(t => t.local && isDate(t.start)).sort((a, b) => a.start.localeCompare(b.start))[0] || null;
  function nextSaturday() {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return iso(d);
  }

  /* ============================== 总览：投递口 + 下一步 ============================== */
  /* 每一条「下一步」都写明它把东西从哪一格推到哪一格，按急不急排序；不想现在处理的可以「稍后」（藏一周） */
  function msWhy(t, m) {
    if (m.k === 'date') {
      const months = [...new Set(alive().filter(p => p.trip === t.id || areaOf(p) === t.area).flatMap(p => p.season || []))].sort((a, b) => a - b);
      return t.start ? `大概是 ${md(t.start)}，定下具体哪几天，机票才好看` : months.length ? `这里 ${months.join('、')} 月最合适，先定个日子` : '先定个日子，其他事才能往下排';
    }
    if (m.k === 'go') return '还没订机票或火车';
    if (m.k === 'stay') return '还没订住的地方';
    if (m.k === 'days') return t.days.length ? `还有 ${t.days.length - t.days.filter(d => d.items.length).length} 天空着` : '日期定了，可以按天排了';
    return '';
  }
  function nextSteps() {
    const out = [];
    const add = (key, o) => { if (D.snoozed[key] && D.snoozed[key] >= todayISO()) return; out.push({ key, ...o }); };
    const going = D.trips.find(t => tripStatus(t) === 'going');
    if (going) add(`going:${going.id}`, { rank: -2, from: 'plan', to: 'been', stage: '今天', title: `「${tripName(going)}」第 ${daysSince(going.start) + 1} 天`, why: '今天的安排、预订和打卡都在一页里', btn: '<a class="btn btn-sm btn-seal" href="#today">打开今天</a>' });
    activeTrips().forEach(t => t.materials.prep.forEach((x, i) => {
      if (x.done) return;
      const k = dueDays(x.due);
      if (k == null || k > 7) return;
      add(`prep:${t.id}:${norm(x.text)}`, { rank: k <= 0 ? -1 : k * .4, from: 'plan', stage: '准备', title: x.text, why: `${dueLabel(x.due)} · ${tripName(t)}`, hot: k <= 1, btn: `<button class="btn btn-sm btn-seal" data-prepdone="${t.id}:${i}">做完了</button>` });
    }));
    alive().filter(p => p.state === 'want' && !p.local && (p.season || []).length).forEach(p => {
      const t = suggestedTrip(p);
      if (!t || !t.days.length || !isDate(t.start) || !p.season.includes(pd(t.start).getMonth() + 1)) return;
      add(`fit:${p.id}`, { rank: 1.2, from: 'want', to: 'plan', stage: '排进行程', title: p.name, place: p, why: `${p.seasonNote || '季节正好'}，你 ${md(t.start)} 正好在${t.area}`, btn: `<button class="btn btn-sm btn-seal" data-plan="${p.id}" data-pre="${t.id}">加进${esc(tripName(t))}</button>` });
    });
    activeTrips().forEach(t => {
      const m = nextMilestone(t);
      if (!m || m.k === 'prep') return;
      const st = tripStatus(t);
      add(`ms:${t.id}:${m.k}`, { rank: st === 'draft' ? 3.5 : 1.6 + Math.max(0, daysUntil(t.start)) / 20, from: 'plan', stage: m.l, title: `${t.title}${t.subtitle ? ' · ' + t.subtitle : ''}`, why: msWhy(t, m), btn: `<button class="btn btn-sm" data-ms="${m.k}" data-trip-id="${t.id}">${m.l}</button>` });
    });
    alive().filter(p => p.state === 'been' && !memosOf(p.id).length).forEach(p => {
      add(`memo:${p.id}`, { rank: 2.4 + Math.min(3, daysSince(p.been) / 90), from: 'been', to: 'memo', stage: '写回忆', title: p.name, place: p, why: `${dot(p.been)} 去过，趁还记得写两句`, btn: `<button class="btn btn-sm" data-memo="${p.id}">写两句</button>` });
    });
    const groups = {};
    alive().filter(p => p.state === 'want' && !p.local).forEach(p => { (groups[areaOf(p)] ||= []).push(p); });
    Object.entries(groups).forEach(([area, ps]) => {
      if (ps.length < 2 || activeTrips().some(t => t.area === area)) return;
      const months = [...new Set(ps.flatMap(p => p.season || []))].sort((a, b) => a - b);
      add(`area:${area}`, { rank: 4, from: 'want', to: 'plan', stage: '排一次行程', title: `${area}攒了 ${ps.length} 处`, stamps: ps, why: months.length ? `${months.join('、')} 月去最合适` : '够专门跑一趟了', btn: `<button class="btn btn-sm" data-newtrip-area="${esc(area)}">排一次行程</button>` });
    });
    const lw = alive().filter(p => p.local && p.state === 'want');
    if (lw.length >= 2) add(`weekend:${nextSaturday()}`, { rank: TODAY.getDay() >= 4 || TODAY.getDay() === 0 ? 2 : 4.5, from: 'want', to: 'been', stage: '这周末', title: '这周末去哪？', stamps: lw, why: `城里还有 ${lw.length} 处想去`, btn: '<button class="btn btn-sm" data-open="draw">帮我挑一个</button>' });
    alive().filter(p => p.state === 'want' && daysSince(p.touched || p.added) > 365).forEach(p => {
      add(`stale:${p.id}`, { rank: 6, from: 'want', stage: '还想去吗', title: p.name, place: p, why: `${dot(p.added).slice(0, 7)} 记下的，一年多没动了`, btn: `<button class="btn btn-sm" data-keep="${p.id}">还想去</button><button class="btn btn-sm btn-quiet" data-drop="${p.id}">放下</button>` });
    });
    return out.sort((a, b) => a.rank - b.rank);
  }
  function stepRow(s, i) {
    if (!(i === 0 || s.hot)) s = { ...s, btn: s.btn.replace(/btn btn-sm btn-seal/g, 'btn btn-sm') };
    const flow = `<span class="flow" aria-hidden="true"><span class="fl">${s.from ? `<i class="mk ${s.from}"></i>` : ''}${s.to ? `<i class="arr">→</i><i class="mk ${s.to}"></i>` : ''}</span><em>${esc(s.stage)}</em></span>`;
    const vis = s.place ? stamp(s.place, { size: 'xs', open: true }) : s.stamps ? `<span class="mini-stack">${s.stamps.slice(0, 3).map(p => stamp(p, { size: 'xs' })).join('')}</span>` : '';
    return `<li class="step ${s.hot ? 'hot' : ''}">
      ${flow}
      <div class="step-b">${vis}<div class="step-t"><b>${s.place ? `<button class="linklike" data-place="${s.place.id}">${esc(s.title)}</button>` : esc(s.title)}</b><small>${esc(s.why)}</small></div></div>
      <div class="step-acts">${s.btn}<button class="snooze" data-snooze="${esc(s.key)}" title="这条先放一周" aria-label="稍后再说：${esc(s.title)}">稍后</button></div>
    </li>`;
  }

  /* 投递口：短的直接记下；带链接的先按分享文字认出地点；长的交给 AI 分拣 */
  function parseShare(q) {
    const url = (q.match(/https?:\/\/[^\s，。]+/) || [])[0] || '';
    const rest = q.replace(url, ' ').replace(/\s+/g, ' ').trim();
    const title = rest.split(/[｜|\n]/)[0].replace(/^(【.*?】|复制.*?打开|.*?发布了一篇小红书笔记，快来看吧！)/, '').trim();
    return { url, rest, title };
  }
  const srcOf = url => (/xiaohongshu|xhslink/.test(url) ? '小红书' : /bilibili|b23\.tv/.test(url) ? 'B站' : /mp\.weixin/.test(url) ? '公众号' : /douyin/.test(url) ? '抖音' : /dianping/.test(url) ? '大众点评' : '网页');
  function inboxPlan(text) {
    const q = text.trim();
    if (!q) return { kind: 'empty' };
    const sh = parseShare(q);
    if (sh.url && sh.title && sh.title.length <= 30 && !q.includes('\n')) {
      const g = guess(sh.title);
      return { kind: 'link', x: { ...g, src: { from: srcOf(sh.url), title: sh.rest || sh.title, url: sh.url } } };
    }
    if (q.includes('\n') || q.length > 30 || sh.url) return { kind: 'ai' };
    const dup = findPlace(q);
    return { kind: 'create', x: guess(q), dup };
  }
  function inboxHint(plan) {
    const prov = activeProvider();
    if (plan.kind === 'empty') return '<span>回车记下；一整段聊天或攻略，会交给 AI 分拣</span>';
    if (plan.kind === 'ai') return `<span><kbd>↵</kbd> 交给 AI 分拣：拆出地点、日程、准备事项${prov && !prov.demo ? '' : '（还没接上自己的 AI 服务商）'}</span>`;
    if (plan.kind === 'link') return `<span><kbd>↵</kbd> 记下「${esc(plan.x.name)}」· ${esc(plan.x.type)}${plan.x.city ? ' · ' + esc(plan.x.city) : ''} · 来自${esc(plan.x.src.from)}</span><button type="button" class="linklike sm" data-inbox="ai">交给 AI 分拣</button>`;
    const x = plan.x;
    return `${plan.dup ? `<span class="dup">清单里已经有<button type="button" class="linklike" data-place="${plan.dup.id}">「${esc(plan.dup.name)}」</button></span>` : ''}<span><kbd>↵</kbd> ${plan.dup ? '仍然' : ''}记下「${esc(x.name)}」· ${esc(x.type)} · ${esc(x.local ? `本地 · ${x.city}` : (x.city || '城市以后再填'))}</span>`;
  }
  let inboxText = '';
  function submitInbox(mode) {
    const text = ($('#inbox')?.value || '').trim();
    if (!text) { $('#inbox')?.focus(); return; }
    const plan = inboxPlan(text);
    if (mode === 'ai' || plan.kind === 'ai') { inboxText = ''; sendToSort(text); return; }
    inboxText = '';
    savePlace(plan.x);
  }

  let showAllSteps = false;
  function renderHome() {
    const nt = nextTrip();
    const st = nt ? tripStatus(nt) : null;
    const steps = nextSteps();
    const shown = showAllSteps ? steps : steps.slice(0, 6);
    const by = s => alive().filter(p => p.state === s);
    const waiting = k => steps.filter(s => s.from === k && s.to).length;
    const fanIds = by('want').slice(0, 3);
    const beenP = by('been').sort((a, b) => (b.been || '').localeCompare(a.been || ''))[0];
    const memos = [...D.memories].sort((a, b) => b.date.localeCompare(a.date));
    const lm = memos[0] && P[memos[0].place];
    const top = steps.find(s => s.hot) || steps[0];
    let h1, lede;
    if (nt && st === 'going') { h1 = `今天是「${esc(tripName(nt))}」<br>第 <span class="d">${daysSince(nt.start) + 1}</span> 天。`; lede = '安排、预订、打卡都在「今天」页。'; }
    else if (nt) { h1 = `<span class="d">${daysUntil(nt.start)}</span> 天后，<br>${esc(nt.slogan || '去' + nt.title)}。`; lede = ''; }
    else if (alive().length) { h1 = '想去的地方，<br>一件件变成去过。'; lede = ''; }
    else { h1 = '记下第一个<br>想去的地方。'; lede = '名字就够了，城市、季节、为什么想去，都可以以后再补。'; }
    if (!lede) lede = steps.length ? `有 <b>${steps.length} 件事</b>可以往前推一步${top ? `，最急的是<b>${esc(top.title)}</b>（${esc(top.why.split(' · ')[0])}）` : ''}。` : '现在没有要做的事。想到什么，往投递口里放。';

    $('#view-home').innerHTML = `
      ${D.sample && !D.prefs.hideSample ? `<div class="sample-bar"><span>现在显示的是示例数据，先看看用起来什么样。你的改动会存在这台设备上。</span><span class="sb-acts"><button class="btn btn-sm" data-sample="clear">清空，开始记自己的</button><button class="btn btn-sm btn-quiet" data-sample="hide">先留着</button></span></div>` : ''}
      <div class="home-top">
        <div class="today">${dot(todayISO())} · ${WD[TODAY.getDay()]} · ${esc(D.home.city)}</div>
        <button class="field field-btn" data-open="palette">${ICON_SEARCH}<span>搜索地点、行程、回忆</span><kbd>/</kbd></button>
      </div>
      <div class="home-hero">
        <section class="hero">
          <h1>${h1}</h1>
          <p class="lede">${lede}</p>
        </section>
        <section class="inbox airmail" aria-label="投递口">
          <div class="inbox-h"><b>投递口</b><span>名字、链接、一整段聊天都行</span></div>
          <label class="sr-only" for="inbox">要记下或整理的内容</label>
          <textarea id="inbox" rows="3" placeholder="比如：武康路新开的面包店&#10;或者粘贴一篇小红书、一段微信聊天" enterkeyhint="send">${esc(inboxText)}</textarea>
          <div class="inbox-f"><div class="inbox-hint" id="inbox-hint" aria-live="polite">${inboxHint(inboxPlan(inboxText))}</div><button class="btn btn-seal" id="inbox-go">投递</button></div>
        </section>
      </div>

      <section class="steps-wrap" aria-label="下一步">
        <div class="sh"><h2>下一步</h2><span class="meta">${steps.length ? `${steps.length} 件 · 每件都把一个地方往前推一格` : ''}</span></div>
        ${steps.length ? `<ol class="steps">${shown.map((x, i) => stepRow(x, i)).join('')}</ol>${steps.length > 6 ? `<button class="more steps-more" data-allsteps>${showAllSteps ? '收起' : `再看 ${steps.length - 6} 件`}</button>` : ''}`
          : alive().length ? `<div class="empty-note"><b>都推完了</b>想去的、要准备的、该写回忆的，现在都没有落下的。</div>` : `<div class="empty-note"><b>还没有要做的事</b>往右上的投递口里放第一个想去的地方。攒多了，这里会提醒你哪些可以排进行程、哪些季节正好。</div>`}
      </section>

      ${nt ? `<section class="home-pass">
        <div class="sh"><h2>${st === 'going' ? '正在进行' : '下一次出发'}</h2><a class="more" href="#trip" data-trip="${nt.id}">全部 ${D.trips.length} 次行程</a></div>
        ${pass(nt, { kicker: st === 'going' ? '正在进行' : '下一次出发', action: `<a class="btn btn-sm" href="#trip" data-trip="${nt.id}">打开行程</a>` })}
      </section>` : ''}

      <section class="route" aria-label="从想去到回忆的四个阶段">
        <a class="station" href="#places">
          <div class="obj">${fanIds.length ? `<div class="fan">${fanIds.map(p => stamp(p, { size: 'sm' })).join('')}</div>` : '<span class="obj-empty">还没有邮票</span>'}</div>
          <span class="st st-want">想去</span>
          <div class="count">${by('want').length}<small>处</small></div>
          <p>${waiting('want') ? `<b>${waiting('want')} 件</b>可以往前推` : '刷到喜欢的，先记下来'}</p>
        </a>
        <div class="hop" aria-hidden="true"><span>加入行程</span></div>
        <a class="station" href="#trip">
          <div class="obj">${nt ? `<div class="mini-ticket"><div class="a"><b>${esc((nt.leg?.from?.[0] || D.home.city) + ' → ' + (nt.leg?.to?.[0] || nt.area))}</b><span>${isDate(nt.start) ? md(nt.start) : '日期待定'} · ${esc(tripName(nt))}</span></div><div class="b">计划中</div></div>` : '<span class="obj-empty">还没有行程</span>'}</div>
          <span class="st st-plan">计划中</span>
          <div class="count">${by('plan').length}<small>处 · ${activeTrips().length} 次行程</small></div>
          <p>${waiting('plan') ? `<b>${waiting('plan')} 件</b>可以往前推` : '排进某一次旅行的某一天'}</p>
        </a>
        <div class="hop" aria-hidden="true"><span>到了，盖章</span></div>
        <a class="station" href="#map">
          <div class="obj">${beenP ? `<div class="been-obj">${stamp(beenP, { size: 'sm' })}${postmark(pmCity(beenP), dot(beenP.been || ''), { cls: 'thunk' })}</div>` : '<span class="obj-empty">还没有邮戳</span>'}</div>
          <span class="st st-been">已去过</span>
          <div class="count">${by('been').length}<small>处</small></div>
          <p>${waiting('been') ? `<b>${waiting('been')} 处</b>还没写回忆` : '盖上日期，就算数了'}</p>
        </a>
        <div class="hop" aria-hidden="true"><span>回填</span></div>
        <a class="station" href="#memories">
          <div class="obj">${lm ? `<div class="mini-card"><div class="photo" style="${cvars(lm.c)}">${memos[0].img ? `<img src="${memos[0].img}" alt="">` : art(lm.art, lm)}</div><div class="lines"><span class="hand">${esc((memos[0].note || '').slice(0, 6))}</span><i></i><i></i><i></i><i></i></div></div>` : '<span class="obj-empty">还没有明信片</span>'}</div>
          <span class="st st-memo">回忆</span>
          <div class="count">${D.memories.length}<small>段</small></div>
          <p>评价、花费、照片，都补上</p>
        </a>
      </section>`;
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
      : `<div class="empty"><b>${alive().length ? '没有符合的地点' : '邮票册还是空的'}</b>${q ? `清单里没有「${esc(pf.q)}」。` : '换个筛选条件试试。'}<div style="margin-top:14px"><button class="btn btn-seal" data-open="palette" data-q="${esc(pf.q)}">${q ? `记下「${esc(pf.q)}」` : '记下一个想去'}</button></div></div>`;
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
  let curTrip = D.trips[0]?.id || null, curTab = 'prep', bkPreset = '', editDay = null;
  const TABS = [['prep', '准备'], ['guide', '攻略'], ['booking', '预订'], ['note', '备注']];
  const openSets = {};
  const openDays = id => (openSets[id] ||= new Set([0, 1, 2, 3]));
  const BK_KINDS = ['机票', '火车', '酒店', '民宿', '门票', '其他'];

  function candidates(t) {
    return alive().filter(p => p.state === 'want' && areaOf(p) === t.area && !!p.local === !!t.local);
  }
  function seasonFit(p, t) {
    const m = isDate(t.start) ? pd(t.start).getMonth() + 1 : null;
    if (m && (p.season || []).includes(m)) return `${p.seasonNote || ''} · 时间正好`;
    return p.seasonNote || p.note || p.tags.join(' · ');
  }

  function renderTrip() {
    if (!T[curTrip]) curTrip = (nextTrip() || D.trips[0] || {}).id || null;
    const t = T[curTrip];
    const cnt = s => D.trips.filter(x => tripStatus(x) === s).length;
    const sim = D.todaySim && T[D.todaySim.trip];
    if (!t) {
      $('#view-trip').innerHTML = `<header class="vh"><div><h1>行程</h1><p class="sub">还没有行程</p></div><div class="vh-actions"><button class="btn btn-seal" data-tripnew>新建行程</button></div></header>
        <div class="no-days big"><b>想去的地方攒够了，就排一次</b><p>可以从「想去」里按地方挑，也可以先建一个空行程，把攻略贴进一键整理，让它按天拆好。</p><div class="row"><button class="btn btn-seal" data-tripnew>新建行程</button><a class="btn" href="#places">去想去里挑</a></div></div>`;
      return;
    }
    const st = tripStatus(t), editable = st !== 'done';
    const cands = candidates(t);
    const od = openDays(t.id);
    $('#view-trip').innerHTML = `
      <header class="vh">
        <div><h1>行程</h1><p class="sub"><b>${D.trips.length}</b> 次旅行 · 进行中 <b>${cnt('going')}</b> · 计划中 <b>${cnt('plan')}</b> · 草拟 <b>${cnt('draft')}</b> · 已完成 <b>${cnt('done')}</b></p></div>
        <div class="vh-actions"><button class="btn" data-tripnew>新建行程</button><a class="btn btn-seal" href="#sort">把攻略整理进来</a></div>
      </header>
      <div class="trip-tabs" role="tablist" aria-label="选择行程">${[...D.trips].sort((a, b) => ['going', 'plan', 'draft', 'done'].indexOf(tripStatus(a)) - ['going', 'plan', 'draft', 'done'].indexOf(tripStatus(b)) || String(a.start).localeCompare(String(b.start))).map(x => `<button class="trip-tab" role="tab" aria-selected="${x.id === curTrip}" data-trip="${x.id}"><b>${esc(x.title)}</b><small>${isDate(x.start) ? `${md(x.start)}${x.end && x.end !== x.start ? ' — ' + md(x.end) : ''}` : esc(md(x.start) || '日期待定')}</small>${statusPill(tripStatus(x))}</button>`).join('')}</div>
      ${pass(t, { lg: true, action: sim && sim.id === t.id ? '<a class="btn btn-sm" href="#today">预览出发当天</a>' : '' })}
      <div class="trip-tools"><button class="btn btn-sm btn-quiet" data-tripedit="${t.id}">改行程信息</button></div>
      <div class="trip-body">
        <section aria-label="每日安排">
          ${cands.length && editable ? `<div class="cands" id="cands">
            <div class="cands-h"><b>${esc(t.area)}还有 ${cands.length} 处想去，没排进来</b><span>选一天就加进去</span></div>
            <ul>${cands.map(p => `<li>${stamp(p, { size: 'xs', open: true })}<div class="cb"><button class="linklike" data-place="${p.id}">${esc(p.name)}</button><span>${esc(seasonFit(p, t))}</span></div>
              <label class="sr-only" for="cand-${p.id}">把${esc(p.name)}加到哪一天</label>
              <select id="cand-${p.id}" class="add-sel" data-cand="${p.id}"><option value="">加到…</option>${t.days.map(d => `<option value="${d.n}">Day ${d.n} · ${d.date}${d.title ? ' ' + esc(d.title) : ''}</option>`).join('')}<option value="0">先放进来，不定哪天</option></select></li>`).join('')}</ul>
          </div>` : ''}
          <div class="sh"><h2>每日安排</h2><span class="meta">${t.days.length ? `${t.days.reduce((n, d) => n + d.items.length, 0)} 项${editable ? ' · 拖动可以调整顺序' : ''}` : ''}</span></div>
          ${t.days.length ? `<div class="days">${t.days.map((d, i) => dayBlock(d, i, od.has(i), t, editable)).join('')}</div>`
            : isDate(t.start) ? `<div class="no-days"><b>日期定了，可以按天排了</b><p>${tripLen(t)} 天，每天一页。也可以把攻略贴进一键整理，让它直接按天拆。</p><div class="row"><button class="btn btn-seal" data-ms="days" data-trip-id="${t.id}">生成 ${tripLen(t)} 天</button><a class="btn" href="#sort">用攻略生成</a></div></div>`
            : `<div class="no-days"><b>先定日期，再按天排</b><p>不确定具体哪天也没关系，先写个大概月份。</p><div class="row"><button class="btn btn-seal" data-ms="date" data-trip-id="${t.id}">定日期</button><a class="btn" href="#sort">先把攻略整理进来</a></div></div>`}
        </section>
        <aside class="folder" aria-label="计划资料">
          <div class="folder-tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === curTab}" data-tab="${k}">${l}<span class="num">${t.materials[k].length}</span></button>`).join('')}</div>
          <div class="folder-body" id="folder-body" role="tabpanel">${folderBody(t)}</div>
        </aside>
      </div>`;
  }

  function dayBlock(d, di, open, t, editable) {
    return `<details class="day" ${open ? 'open' : ''} data-di="${di}">
      <summary><span class="day-n">Day ${d.n}</span><span class="day-t"><h3 class="${d.title ? '' : 'untitled'}">${esc(d.title || '还没写这天去哪')}</h3><span class="d">${esc(d.date || '')} ${esc(d.wd || '')}</span></span><span class="day-c">${d.items.length} 项</span></summary>
      ${editable && (!d.title || editDay === di) ? `<div class="day-title"><label class="sr-only" for="dt-${t.id}-${di}">Day ${d.n} 的主题</label><input id="dt-${t.id}-${di}" class="dt-in" data-dt="${di}" value="${esc(d.title || '')}" placeholder="这天主要去哪，比如：岚山" autocomplete="off"></div>` : ''}
      <ol class="items" data-di="${di}">${d.items.map((it, ii) => itemRow(it, di, ii, editable)).join('')}</ol>
      ${editable ? `<div class="day-foot"><form class="quick-add" data-di="${di}"><label class="sr-only" for="qa-${t.id}-${di}">给 Day ${d.n} 加一项</label><span aria-hidden="true">＋</span><input id="qa-${t.id}-${di}" placeholder="加一项，比如：15:30 哲学之道" autocomplete="off" enterkeyhint="done"></form>${d.title && editDay !== di ? `<button class="linklike sm" data-editday="${di}">改这天的主题</button>` : ''}</div>` : ''}
    </details>`;
  }

  function itemRow(it, di, ii, editable) {
    const p = it.place && P[it.place];
    const dotCls = it.doneAt || (p && p.state === 'been') ? 'been' : p ? 'place' : '';
    const tags = [];
    if (it.tag) tags.push(`<span class="tag ${it.tag[0]}">${esc(it.tag[1])}</span>`);
    if (it.doneAt) tags.push(`<span class="tag ok">${esc(it.doneAt)} 盖章</span>`);
    if (p) tags.push(`<span class="tag">来自想去 · ${p.want} 分</span>`);
    return `<li class="item ${freshItems.has(it) ? 'fresh' : ''}" ${editable ? `draggable="true" data-di="${di}" data-ii="${ii}"` : ''}>
      <time>${esc(it.t)}</time><span class="dot ${dotCls}" aria-hidden="true"></span>
      <div class="item-b"><span class="k">${esc(it.kind)}</span>${p ? `<button class="linklike" data-place="${p.id}">${esc(it.title)}</button>` : `<b>${esc(it.title)}</b>`}${it.note ? `<p>${esc(it.note)}</p>` : ''}${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}</div>
      <div class="item-side">${p ? `<div class="thumb">${stamp(p, { size: 'xs', open: true })}</div>` : ''}${editable ? `<button class="item-rm" data-rm="${di}:${ii}" aria-label="移除 ${esc(it.title)}" title="移除">×</button>` : ''}</div></li>`;
  }

  function folderBody(t) {
    const m = t.materials, ed = tripStatus(t) !== 'done';
    const rm = (k, i, label) => (ed ? `<button class="mat-rm" data-delmat="${k}:${i}" aria-label="删掉 ${esc(label)}">×</button>` : '');
    if (curTab === 'prep') {
      const done = m.prep.filter(x => x.done).length;
      return `<h3>准备事项<span class="num">${m.prep.length ? `${done}/${m.prep.length}` : ''}</span></h3>
        ${m.prep.length ? `<ul class="prep-list">${m.prep.map((x, i) => checkItem(x, i, t.id, ed)).join('')}</ul>` : '<p class="hint">出发前要办的事列在这里，到期前会出现在首页。</p>'}
        ${ed ? `<form class="mat-add" data-add="prep"><label class="sr-only" for="add-prep">加一项准备</label><input id="add-prep" placeholder="加一项，比如：11.10 前换好日元" autocomplete="off"><button class="btn btn-sm">加上</button></form>` : ''}`;
    }
    if (curTab === 'guide') {
      return `<h3>攻略<span class="num">${m.guide.length ? m.guide.length + ' 篇' : ''}</span></h3>
        ${m.guide.length ? `<ul class="guide-list">${m.guide.map((g, i) => `<li class="mat-li"><span class="src ${g.src === '小红书' ? 'xhs' : g.src === '官网' ? 'web' : ''}">${esc(g.src)}</span>${g.url ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.title)}</a>` : `<b class="g-t">${esc(g.title)}</b>`}<small>${esc(g.by || '')}${g.saved ? ` · 收藏于 ${esc(g.saved)}` : ''}</small>${rm('guide', i, g.title)}</li>`).join('')}</ul>` : '<p class="hint">把看过的攻略链接收在这里，出发前不用再翻收藏夹。</p>'}
        ${ed ? `<details class="add-more"><summary>＋ 收藏一篇攻略</summary><form class="mat-form" data-add="guide">
          <div class="sel-field"><label for="ag-url">链接</label><input id="ag-url" name="url" placeholder="粘贴链接或分享文字" autocomplete="off"></div>
          <div class="sel-field"><label for="ag-title">标题</label><input id="ag-title" name="title" placeholder="可以不填，会从分享文字里取" autocomplete="off"></div>
          <button class="btn btn-sm btn-seal">收藏</button></form></details>` : ''}`;
    }
    if (curTab === 'booking') {
      const sum = booked(t);
      return `<h3>预订<span class="num">${m.booking.length ? m.booking.length + ' 项' : ''}</span></h3>
        ${m.booking.length ? `<div class="bookings">${m.booking.map((b, i) => `<div class="bk mat-li"><div class="bk-kind">${esc(b.kind)}</div><div class="bk-b"><div class="top"><b>${esc(b.title)}</b><span class="num">${b.price ? yen(b.price) : ''}</span></div>${(b.lines || []).map(l => `<span>${esc(l)}</span>`).join('')}<span class="ref">${esc(b.code || '')}${b.ref ? ` · 确认号 ${esc(b.ref)}` : ''}${b.ref ? `<button class="linklike sm" data-show="${t.id}:${i}">出示</button>` : ''}</span></div>${rm('booking', i, b.title)}</div>`).join('')}
          <div class="bk-total"><span>已订合计</span><b>${yen(sum)}</b></div></div>` : '<p class="hint">机票、住宿、门票的确认号放这里，出发当天一键出示。</p>'}
        ${ed ? `<details class="add-more" ${bkPreset ? 'open' : ''}><summary>＋ 加一项预订</summary><form class="mat-form" data-add="booking">
          <div class="radio-chips sm" role="radiogroup" aria-label="类型">${BK_KINDS.map(k => `<label><input type="radio" name="bk-kind" value="${k}" ${k === (bkPreset || '机票') ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div>
          <div class="sel-field"><label for="ab-title">名称</label><input id="ab-title" name="title" placeholder="比如：MU729 浦东 → 关西" autocomplete="off"></div>
          <div class="sel-field"><label for="ab-line">时间</label><input id="ab-line" name="line" placeholder="比如：11.20 09:40 → 13:05" autocomplete="off"></div>
          <div class="two"><div class="sel-field"><label for="ab-ref">确认号</label><input id="ab-ref" name="ref" autocomplete="off"></div><div class="sel-field"><label for="ab-price">金额（元）</label><input id="ab-price" name="price" inputmode="decimal" autocomplete="off"></div></div>
          <button class="btn btn-sm btn-seal">加上</button></form></details>` : ''}`;
    }
    return `<h3>备注</h3>
      ${m.note.length ? `<div class="note-paper">${m.note.map((n, i) => `<p class="mat-li">${esc(n)}${rm('note', i, n)}</p>`).join('')}</div>` : '<p class="hint">临时想到的事、和同行的约定，随手记一句。</p>'}
      ${ed ? `<form class="mat-form" data-add="note"><label class="sr-only" for="an-text">记一句备注</label><textarea id="an-text" class="hand-in" rows="2" placeholder="记一句……"></textarea><button class="btn btn-sm">记下</button></form>` : ''}`;
  }

  /* 行程信息表单：新建和修改共用 */
  let tripForm = { id: null, withIds: [], area: '' };
  function openTripSheet(id = null, { area = '', withIds = [], focus = '' } = {}) {
    const t = id ? T[id] : null;
    tripForm = { id, withIds, area: t ? t.area : area };
    const areas = [...new Set([...alive().map(areaOf), ...D.trips.map(x => x.area)].filter(Boolean))];
    const local = t ? !!t.local : area === D.home.city;
    $('#sheet').innerHTML = `<form class="ck" id="trip-form">
      <header class="ck-h"><div><h2>${t ? '改行程信息' : '新建一次行程'}</h2><p>${t ? '改了日期，每天的安排会跟着调整' : '先填能填的，其他以后再补'}</p></div><button type="button" class="dr-x" data-close aria-label="关闭">×</button></header>
      <div class="two"><div class="sel-field"><label for="tf-title">去哪儿</label><input id="tf-title" list="tf-areas" value="${esc(t ? t.title : area)}" placeholder="比如：京都 · 大阪" autocomplete="off"><datalist id="tf-areas">${areas.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
        <div class="sel-field"><label for="tf-sub">给它起个名字</label><input id="tf-sub" value="${esc(t?.subtitle || '')}" placeholder="比如：红叶七日" autocomplete="off"></div></div>
      <div class="two"><div class="sel-field"><label for="tf-start">出发</label><input type="date" id="tf-start" value="${t && isDate(t.start) ? t.start : ''}"></div>
        <div class="sel-field"><label for="tf-end">回来</label><input type="date" id="tf-end" value="${t && isDate(t.end) ? t.end : ''}"></div></div>
      <div class="sel-field"><label for="tf-month">还没定具体哪天？先写个大概月份</label><input type="month" id="tf-month" value="${t && !isDate(t.start) && t.start ? t.start : ''}"></div>
      <div class="two"><div class="sel-field"><label for="tf-budget">预算（元）</label><input id="tf-budget" inputmode="numeric" value="${t?.budget || ''}" autocomplete="off"></div>
        <div class="sel-field"><label for="tf-people">和谁</label><input id="tf-people" value="${esc(t?.people || '我')}" autocomplete="off"></div></div>
      <label class="switch"><input type="checkbox" id="tf-local" ${local ? 'checked' : ''}> 就在${esc(D.home.city)}，本地走走</label>
      ${withIds.length ? `<div class="tf-with"><span class="lbl">会把这 ${withIds.length} 处想去放进来</span><div class="area-stamps">${withIds.map(i => P[i] ? stamp(P[i], { size: 'xs' }) : '').join('')}</div></div>` : ''}
      <footer class="ck-foot">${t ? `<button type="button" class="btn btn-quiet danger" data-tripdel="${t.id}">删除这次行程</button><span class="grow"></span>` : ''}<button type="button" class="btn btn-quiet" data-close>取消</button><button class="btn btn-seal" type="submit">${t ? '保存' : '建好了'}</button></footer>
    </form>`;
    showDialog($('#sheet'));
    setTimeout(() => $(focus === 'date' ? '#tf-start' : '#tf-title')?.focus(), 80);
  }
  function saveTripForm() {
    const title = $('#tf-title').value.trim();
    if (!title) { $('#tf-title').focus(); toast('先写去哪儿。'); return; }
    let start = $('#tf-start').value, end = $('#tf-end').value;
    const month = $('#tf-month').value;
    if (start && end && end < start) { $('#tf-end').focus(); toast('回来的日子早于出发了，改一下。'); return; }
    if (start && !end) end = start;
    if (!start && end) start = end;
    if (!start && month) start = month;
    const budget = parseFloat($('#tf-budget').value) || 0;
    const fields = { title, subtitle: $('#tf-sub').value.trim(), start: start || '', end: isDate(start) ? end : '', budget, people: $('#tf-people').value.trim() || '我', local: $('#tf-local').checked };
    const { id, withIds } = tripForm;
    $('#sheet').close();
    if (id) {
      act(`已保存「${fields.title}」`, () => { const t = T[id]; Object.assign(t, fields); if (t.local) t.area = D.home.city; syncDays(t); });
      return;
    }
    const nid = uid();
    const area = fields.local ? D.home.city : (tripForm.area || (alive().map(areaOf).find(a => title.includes(a)) || title));
    act(`已新建「${fields.subtitle || fields.title}」${withIds.length ? `，放进了 ${withIds.length} 处` : ''}`, () => {
      const t = { id: nid, ...fields, area, cur: fields.local ? '¥' : (CITY[title.split(/[ ·]/)[0]]?.[2] === '日本' ? '円' : '¥'), slogan: `去${title.split(' · ')[0]}${fields.subtitle ? '：' + fields.subtitle : ''}`, days: [], materials: { prep: [], guide: [], booking: [], note: [] }, expenses: [] };
      D.trips.push(t);
      reindex();
      syncDays(t);
      withIds.forEach(pid => { if (P[pid]) addToTrip(P[pid], nid, 0); });
      curTrip = nid;
    }, { action: { label: '去看看', fn: () => { location.hash = 'trip'; } } });
  }
  /* 点里程碑：直接带到能完成它的地方 */
  function doMilestone(k, tid) {
    const t = T[tid];
    if (!t) return;
    const go = fn => { if (curTrip !== tid || location.hash !== '#trip') { curTrip = tid; location.hash = 'trip'; renderTrip(); } setTimeout(fn, 60); };
    if (k === 'date') { openTripSheet(tid, { focus: 'date' }); return; }
    if (k === 'go' || k === 'stay') { curTab = 'booking'; bkPreset = k === 'go' ? '机票' : '民宿'; go(() => { renderTrip(); bkPreset = ''; const f = $('#folder-body'); f?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#ab-title')?.focus(); }); return; }
    if (k === 'days') {
      if (!t.days.length && isDate(t.start)) { act(`已生成 ${tripLen(t)} 天`, () => syncDays(t)); if (location.hash !== '#trip') { curTrip = tid; location.hash = 'trip'; } return; }
      go(() => { const di = t.days.findIndex(d => !d.items.length); if (di >= 0) { openDays(tid).add(di); renderTrip(); const el = $(`#qa-${tid}-${di}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus({ preventScroll: true }); } });
      return;
    }
    if (k === 'prep') { curTab = 'prep'; go(() => { renderTrip(); $('#folder-body')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#add-prep')?.focus({ preventScroll: true }); }); }
  }
  /* 「11.10 前换好日元」→ 截止 11.10；「11.03 10:00 抢票」→ 截止 11.03 10:00 */
  function parseDue(text) {
    const m = /^(\d{1,2})[.\/月](\d{1,2})日?\s*(\d{1,2}[:：]\d{2})?\s*(前|之前)?\s*(.+)$/.exec(text.trim());
    if (!m) return { text: text.trim() };
    let y = TODAY.getFullYear();
    const ds = `${y}-${pad(+m[1])}-${pad(+m[2])}`;
    if (daysUntil(ds) < -60) y++;
    const due = `${y}-${pad(+m[1])}-${pad(+m[2])}${m[3] ? ' ' + m[3].replace('：', ':').padStart(5, '0') : ''}`;
    return { text: m[5].trim(), due };
  }

  /* ============================== 今天 ============================== */
  function todayCtx() {
    const going = D.trips.find(t => tripStatus(t) === 'going');
    if (going && going.days.length) {
      const di = clamp(daysSince(going.start), 0, going.days.length - 1);
      return { t: going, di, date: todayISO(), now: nowHM(), sim: false };
    }
    const s = D.todaySim, t = s && T[s.trip];
    if (t && t.days[s.day - 1]) return { t, di: s.day - 1, date: s.date, now: s.now, sim: true, weather: s.weather };
    return null;
  }
  function renderToday() {
    const c = todayCtx();
    if (!c) {
      $('#view-today').innerHTML = `<header class="vh"><div><h1>今天</h1><p class="sub">出发那天，这里会显示当天的安排、预订和打卡。</p></div></header><div class="no-days big"><b>现在没有进行中的旅行</b><p>行程的日期到了，这一页会自动换成当天的样子。</p><a class="btn btn-seal" href="#trip">看看行程</a></div>`;
      return;
    }
    const { t, di } = c, d = t.days[di], now = toMin(c.now);
    if (c.sim && !D.todaySim._init) { Object.entries(D.todaySim.done || {}).forEach(([i, v]) => { if (d.items[+i]) d.items[+i].simDone = v; }); D.todaySim._init = true; }
    const items = d.items;
    const doneAt = it => it.doneAt || (c.sim ? it.simDone : '');
    const cur = items.findIndex(it => !doneAt(it));
    const nxt = items.findIndex((it, i) => i > cur && !doneAt(it));
    const ci = items[cur], ni = items[nxt];
    const sd = pd(c.date);
    const exp = (t.expenses || []).filter(x => x.date === c.date);
    const cur$ = t.cur || '¥';
    const spent = exp.reduce((n, x) => n + x.amount, 0);
    const covers = b => { const ds = (b.lines || []).join(' ').match(/\d{1,2}\.\d{2}/g) || []; const k = md(c.date); if (!ds.length) return true; if (ds.length === 1) return ds[0] === k; return ds[0] <= k && k <= ds[1]; };
    const bks = [...new Set([...items.filter(it => it.booking != null).map(it => it.booking), ...t.materials.booking.map((b, i) => (STAY.test(b.kind) && covers(b) ? i : null)).filter(i => i != null)])];
    let nowCard;
    if (ci) {
      const s0 = toMin(ci.t), p = ci.place && P[ci.place];
      const label = s0 == null ? '时间待定' : s0 <= now ? `${ci.t} 开始 · 已经 ${span(now - s0)}` : `${ci.t} · 还有 ${span(s0 - now)}`;
      nowCard = `<section class="now-card" aria-label="现在">
        <div class="now-top"><span class="now-tag">${s0 != null && s0 <= now ? '现在' : '接下来'}</span><span class="num">${label}</span></div>
        <div class="now-main">${p ? `<div class="now-stamp">${stamp(p, { size: 'sm', open: true })}</div>` : ''}<div><h2>${esc(ci.title)}</h2>${ci.note ? `<p>${esc(ci.note)}</p>` : ''}${ci.go ? `<p class="go">怎么去：${esc(ci.go)}</p>` : ''}</div></div>
        <div class="now-acts"><button class="btn btn-seal" data-ckitem="${cur}">到了，盖章</button><a class="btn" href="${mapLink(p || { name: ci.title, city: t.title.split(' · ')[0] })}" target="_blank" rel="noopener">导航过去</a>${ci.booking != null ? `<button class="btn" data-show="${t.id}:${ci.booking}">出示预订</button>` : ''}</div>
      </section>`;
    } else {
      nowCard = `<section class="now-card"><div class="now-top"><span class="now-tag">今天</span></div><div class="now-main"><div><h2>今天的安排都走完了</h2><p>趁还记得，给今天去过的地方写两句。</p></div></div><div class="now-acts"><a class="btn btn-seal" href="#memories">去写回忆</a></div></section>`;
    }
    let list = '', lineDone = false;
    items.forEach((it, i) => {
      const s0 = toMin(it.t);
      if (!lineDone && s0 != null && s0 > now) { list += `<li class="now-line"><span>现在 ${c.now}</span></li>`; lineDone = true; }
      const dn = doneAt(it);
      list += `<li class="tl ${dn ? 'done' : ''} ${i === cur ? 'cur' : ''}"><time>${esc(it.t)}</time><span class="tl-dot" aria-hidden="true"></span>
        <div class="tl-b"><b>${esc(it.title)}</b><small>${dn ? `${esc(dn)} 盖章` : esc(it.go || it.note || '')}</small></div>
        ${dn ? '<span class="tl-mark">已盖章</span>' : i !== cur ? `<button class="linklike sm" data-ckitem="${i}">盖章</button>` : ''}</li>`;
    });
    if (!lineDone) list += `<li class="now-line"><span>现在 ${c.now}</span></li>`;
    $('#view-today').innerHTML = `
      ${c.sim ? `<div class="sim-bar"><span>预览：假设今天是 ${sd.getMonth() + 1} 月 ${sd.getDate()} 日（${WD[sd.getDay()]}）${c.now}，「${esc(tripName(t))}」的第 ${di + 1} 天。真正出发那天，这一页会自动换成当天的安排。</span><a href="#trip" data-trip="${t.id}">回到行程</a></div>` : ''}
      <header class="today-h">
        <p class="kicker">${esc(tripName(t))} · Day ${di + 1} / ${t.days.length}${c.weather ? ' · ' + esc(c.weather) : ''}</p>
        <h1>${esc(d.title || `Day ${di + 1}`)}</h1>
        <p class="today-dots" role="img" aria-label="今天 ${items.length} 项，完成 ${items.filter(doneAt).length} 项">${items.map(it => `<i class="${doneAt(it) ? 'on' : ''}"></i>`).join('')}<span>${items.filter(doneAt).length}/${items.length}</span></p>
      </header>
      <div class="today-grid">
        <div class="today-main">
          ${nowCard}
          ${ni ? `<div class="next-line"><span class="lbl">下一项</span><b>${esc(ni.t)} ${esc(ni.title)}</b><span>${toMin(ni.t) != null && now != null ? `还有 ${span(Math.max(0, toMin(ni.t) - now))}` : ''}${ni.go ? ' · ' + esc(ni.go) : ''}</span></div>` : ''}
          <ol class="timeline">${list}</ol>
          <form class="quick-add today-add" data-di="${di}" data-trip-id="${t.id}"><label class="sr-only" for="qa-today">给今天加一项</label><span aria-hidden="true">＋</span><input id="qa-today" placeholder="临时加一项，比如：16:00 哲学之道" autocomplete="off"></form>
        </div>
        <aside class="today-side">
          ${bks.length ? `<section class="sheet panel"><div class="sh"><h2>今天要用的预订</h2></div>
            <ul class="bk-mini">${bks.map(bi => { const b = t.materials.booking[bi]; return b ? `<li><span class="bk-k">${esc(b.kind)}</span><div><b>${esc(b.title)}</b><small>${esc((b.lines || [])[0] || '')}</small></div>${b.ref ? `<button class="btn btn-sm" data-show="${t.id}:${bi}">出示</button>` : ''}</li>` : ''; }).join('')}</ul></section>` : ''}
          <section class="sheet panel">
            <div class="sh"><h2>今天花了</h2><span class="spend-sum"><b class="num">${spent.toLocaleString('en-US')} ${esc(cur$)}</b>${cur$ !== '¥' ? `<small>约 ${yen(spent * (RATE[cur$] || 1))}</small>` : ''}</span></div>
            ${exp.length ? `<ul class="spend-list">${exp.map(x => `<li><time>${esc(x.t)}</time><span class="cat">${esc(x.cat)}</span><span class="w">${esc(x.what || x.cat)}</span><span class="num">${x.amount.toLocaleString('en-US')} ${esc(cur$)}</span></li>`).join('')}</ul>` : '<p class="hint" style="margin-bottom:12px">还没记账。</p>'}
            <form class="spend-form" id="spend-form">
              <div class="spend-in"><label class="sr-only" for="sp-amt">金额</label><input id="sp-amt" inputmode="decimal" placeholder="金额" autocomplete="off"><span>${esc(cur$)}</span>
                <label class="sr-only" for="sp-what">买了什么</label><input id="sp-what" placeholder="买了什么，可不填" autocomplete="off"></div>
              <div class="radio-chips sm">${['吃饭', '交通', '门票', '购物'].map((k, i) => `<label><input type="radio" name="sp-cat" value="${k}" ${i === 0 ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div>
              <button class="btn btn-sm" type="submit">记一笔</button>
            </form>
          </section>
        </aside>
      </div>`;
  }
  function mapLink(p) {
    const cn = p.local || /中国/.test(p.country || '');
    if (p.lat || p.lng) return cn ? `https://uri.amap.com/marker?position=${p.lng},${p.lat}&name=${encodeURIComponent(p.name)}` : `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    return cn ? `https://uri.amap.com/search?keyword=${encodeURIComponent(p.name)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.city].filter(Boolean).join(' '))}`;
  }

  /* ============================== 地图 ============================== */
  let mapMode = 'world', mapSel = null;
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
      if (c.state === 'plan') routes += `<path class="rt ${T[c.trip] && tripStatus(T[c.trip]) === 'draft' ? 'draft' : 'plan'}" d="${arc(home, xy)}"/>`;
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
    const hc = D.home.city, nLocal = alive().filter(p => p.local).length;
    pins += `<g class="pin ${mapSel === hc ? 'sel' : ''}" tabindex="0" role="button" aria-label="${esc(hc)}，家，本地 ${nLocal} 处" data-c="${esc(hc)}">
      <circle class="hit" cx="${home[0]}" cy="${home[1]}" r="14"/>${mapSel === hc ? `<circle class="sel-ring" cx="${home[0]}" cy="${home[1]}" r="12"/>` : ''}
      <rect class="home" x="${home[0] - 6}" y="${home[1] - 6}" width="12" height="12" rx="1.5"/><text x="${home[0]}" y="${home[1] + 3.6}" text-anchor="middle" style="font:400 9px var(--f-display);fill:var(--on-seal)">家</text>
      <text class="pin-label" x="${home[0] + 9}" y="${home[1] + 19}">${esc(hc)} · 家</text></g>`;
    return `<svg class="map-svg" viewBox="0 0 ${WORLD.w} ${WORLD.h}" role="img" aria-label="世界地图：想去、计划中、已去过的地点">
      <path class="ocean" d="${WORLD.outline}"/><path class="grat" d="${WORLD.grat}"/><path class="land" d="${WORLD.land}"/><path class="edge" d="${WORLD.outline}"/>
      ${routes}${pins}</svg>`;
  }
  /* 本地地图：上海画出黄浦江和苏州河；其他城市只画网格，按坐标摆放 */
  const SH_BOX = { lng0: 121.38, lng1: 121.6, lat0: 31.17, lat1: 31.34 };
  function cityBox(ps) {
    if (D.home.city === '上海') return SH_BOX;
    const pts = [...ps.map(p => [p.lng, p.lat]), [D.home.lng, D.home.lat]];
    let lng0 = Math.min(...pts.map(p => p[0])), lng1 = Math.max(...pts.map(p => p[0])), lat0 = Math.min(...pts.map(p => p[1])), lat1 = Math.max(...pts.map(p => p[1]));
    const pl = Math.max(.02, (lng1 - lng0) * .15), pt = Math.max(.015, (lat1 - lat0) * .15);
    return { lng0: lng0 - pl, lng1: lng1 + pl, lat0: lat0 - pt, lat1: lat1 + pt };
  }
  const boxXY = (b, lng, lat) => [n1(clamp((lng - b.lng0) / (b.lng1 - b.lng0), .02, .98) * 1000), n1(435 - clamp((lat - b.lat0) / (b.lat1 - b.lat0), .03, .97) * 435)];
  function citySvg() {
    const ps = alive().filter(p => p.local && (p.lat || p.lng));
    const b = cityBox(ps);
    const home = boxXY(b, D.home.lng, D.home.lat);
    let pins = '';
    ps.forEach(p => {
      const [x, y] = boxXY(b, p.lng, p.lat), sel = mapSel === p.id;
      pins += `<g class="pin ${sel ? 'sel' : ''}" tabindex="0" role="button" aria-label="${esc(p.name)}" data-c="${p.id}"><circle class="hit" cx="${x}" cy="${y}" r="14"/>${sel ? `<circle class="sel-ring" cx="${x}" cy="${y}" r="12"/>` : ''}${pinShape(p.state, x, y)}
        <text class="pin-label ${sel ? 'sel' : ''}" x="${x + 12}" y="${y + 4}">${esc(p.name)}</text></g>`;
    });
    const sh = D.home.city === '上海' ? `<path class="road" d="M0 312C200 298 360 286 520 262S760 226 1000 214"/>
      <path class="road" d="M452 0C448 120 440 220 430 300S410 400 400 435"/>
      <path class="road ring" d="M300 170C380 132 560 140 610 200S600 360 520 380 320 400 280 330 240 200 300 170Z"/>
      <path class="road" d="M120 0L250 435M700 0C690 120 640 200 600 270"/>
      <path class="river" stroke-width="22" d="M560 445C540 360 470 300 500 256C520 225 600 232 650 262C700 290 760 200 800 140C830 90 880 40 910 -10"/>
      <path class="river" stroke-width="8" d="M-5 236C80 210 140 260 220 238C300 216 340 250 400 236C450 225 470 252 500 246"/>
      <text class="city-label" x="612" y="330">黄浦江</text><text class="city-label" x="60" y="214">苏州河</text>`
      : Array.from({ length: 9 }, (_, i) => `<path class="road" d="M${(i + 1) * 100} 0V435" opacity=".35"/>`).join('') + Array.from({ length: 4 }, (_, i) => `<path class="road" d="M0 ${(i + 1) * 87}H1000" opacity=".35"/>`).join('');
    return `<svg class="map-svg" viewBox="0 0 1000 435" role="img" aria-label="${esc(D.home.city)}本地地图">
      <rect class="ocean" width="1000" height="435"/>${sh}
      <g><rect class="home" x="${home[0] - 6}" y="${home[1] - 6}" width="12" height="12" rx="1.5" style="fill:var(--seal)"/><text x="${home[0]}" y="${home[1] + 3.6}" text-anchor="middle" style="font:400 9px var(--f-display);fill:var(--on-seal)">家</text></g>
      ${pins}</svg>`;
  }
  function renderMap() {
    const far = alive().filter(p => !p.local), local = alive().filter(p => p.local);
    if (!mapSel) mapSel = mapMode === 'world' ? ((clusters().find(c => c.state === 'plan') || clusters()[0])?.key || D.home.city) : (local[0]?.id || null);
    const scope = mapMode === 'world' ? far : local;
    const n = s => scope.filter(p => p.state === s).length;
    const noCoord = scope.filter(p => !(p.lat || p.lng)).length;
    const groups = [['want', '想去'], ['plan', '计划中'], ['been', '已去过']];
    $('#view-map').innerHTML = `
      <header class="vh">
        <div><h1>地图</h1><p class="sub">有坐标的地点都在这里 · 远方 <b>${far.length}</b> · 本地 <b>${local.length}</b></p></div>
        <div class="vh-actions"><div class="seg" role="group" aria-label="地图范围">${[['world', '远方'], ['city', `本地 · ${D.home.city}`]].map(([v, l]) => `<button data-map="${v}" aria-pressed="${mapMode === v}">${esc(l)}</button>`).join('')}</div></div>
      </header>
      <div class="map-wrap">
        <section class="sheet map-card">
          <div class="map-bar">
            <div class="legend"><span><i class="swatch want"></i>想去 <span class="num">${n('want')}</span></span><span><i class="swatch plan"></i>计划中 <span class="num">${n('plan')}</span></span><span><i class="swatch been"></i>已去过 <span class="num">${n('been')}</span></span><span><i class="swatch home"></i>家</span></div>
            <span class="map-note">${mapMode === 'world' ? '虚线：计划中的航线　实线：去过的' : D.home.city === '上海' ? '示意图，不按真实比例' : '按坐标摆放的示意图'}${noCoord ? `　${noCoord} 处还没有坐标` : ''}</span>
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
      if (!p) return `<section class="sheet sel-card"><h2>${esc(D.home.city)}</h2><p class="hint">还没有本地的地点。记一家想去的店试试。</p></section>`;
      title = p.name; where = `${D.home.city} · ${p.country} · ${p.city}`; list = [p];
    } else if (mapSel === D.home.city) {
      list = alive().filter(p => p.local); title = D.home.city; where = `家 · 本地 ${list.length} 处，切到「本地」看细节`;
    } else {
      const cs = clusters();
      const c = cs.find(x => x.key === mapSel) || cs[0];
      if (!c) return '<section class="sheet sel-card"><h2>还没有远方的地点</h2><p class="hint">记下的地点有了坐标，就会出现在地图上。</p></section>';
      list = c.places; title = (LBL[c.key] || [c.key])[0]; where = `${[...new Set(list.map(p => p.country).filter(Boolean))].join(' · ')} · ${list.length} 处`;
    }
    return `<section class="sheet sel-card" aria-live="polite"><div><h2>${esc(title)}</h2><div class="where">${esc(where)}</div></div>
      <ul class="sel-list">${list.map(p => `<li>${stamp(p, { size: 'xs', open: true })}<div><button class="linklike" data-place="${p.id}">${esc(p.name)}</button>${stateLine(p)}</div></li>`).join('')}</ul></section>`;
  }

  /* ============================== 回忆 ============================== */
  function renderMemories() {
    const been = alive().filter(p => p.state === 'been');
    const pending = been.filter(p => !memosOf(p.id).length);
    const total = D.memories.reduce((n, m) => n + (m.costCny || 0), 0);
    const memos = D.memories.map((m, i) => ({ m, i })).sort((a, b) => b.m.date.localeCompare(a.m.date));
    const years = [...new Set(memos.map(x => x.m.date.slice(0, 4)))];
    $('#view-memories').innerHTML = `
      <header class="vh">
        <div><h1>回忆</h1><p class="sub"><b>${D.memories.length}</b> 段 · 去过 <b>${been.length}</b> 处${total ? ` · 一共花了 <b>${yen(total)}</b>` : ''}</p></div>
        <div class="vh-actions">${pending.length ? `<button class="btn btn-seal" data-memo="${pending[0].id}">补写回忆</button>` : ''}</div>
      </header>
      ${pending.length ? `<section class="backfill">
        <div class="txt"><b>${pending.length} 处去过，还没写回忆</b>趁还记得，一处花一分钟。</div>
        <ul>${pending.map(p => `<li>${stamp(p, { size: 'xs', open: true })}<span><b>${esc(p.name)}</b><small>${p.been ? dot(p.been) : ''} 去过</small></span><button class="btn btn-sm" data-memo="${p.id}">现在写</button></li>`).join('')}</ul>
      </section>` : ''}
      ${memos.length ? years.map(y => {
        const ms = memos.filter(x => x.m.date.startsWith(y));
        return `<section class="year"><div class="year-h"><h2>${y}</h2><span>${ms.length} 段 · ${[...new Set(ms.map(x => P[x.m.place] ? (P[x.m.place].local ? D.home.city : P[x.m.place].city) : ''))].filter(Boolean).join('、')}</span></div>
          <div class="cards">${ms.map((x, k) => postcard(x.m, x.i, k)).join('')}</div></section>`;
      }).join('') : `<div class="no-days big"><b>去过的地方会在这里变成明信片</b><p>到了一个地方点「盖章」，顺手写一句、打个分、加张照片，就是一张。</p></div>`}`;
  }
  function postcard(m, idx, k) {
    const p = P[m.place];
    if (!p) return '';
    const [y, mo, d] = m.date.split('-');
    const tilt = [-.5, .45, -.3, .6, -.2][k % 5];
    return `<article class="postcard" style="--tilt:${tilt}deg">
      <button class="pc-edit" data-memedit="${idx}" aria-label="改这段回忆">改</button>
      <div>
        <div class="photo-mount"><i></i><i></i><i></i><i></i><div class="photo" style="${cvars(p.c)}">${m.img ? `<img src="${m.img}" alt="${esc(p.name)} 的照片">` : art(p.art, p)}<span class="stamp-date">'${y.slice(2)} ${+mo} ${+d}</span></div></div>
        <div class="photo-count" style="${cvars(p.c)}"><span class="thumbs"><b></b><b></b><b></b></span>${m.photos || 0} 张照片</div>
      </div>
      <div class="pc-back">
        <div class="head"><h3><button class="linklike" data-place="${p.id}">${esc(p.name)}</button></h3><div class="where">${esc(whereOf(p))}</div></div>
        <div class="corner">${stamp(p, { size: 'xs' })}${postmark(pmCity(p), dot(m.date))}</div>
        <p class="hand">${esc(m.note || '只盖了章，还没写。')}</p>
        <div class="facts"><span>评价 <span class="dots" role="img" aria-label="${m.rating || 0} 分，满分 5 分">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= (m.rating || 0) ? 'on' : ''}"></i>`).join('')}</span></span>${m.cost ? `<span>花费 <b>${esc(m.cost)}</b></span>` : ''}<span>${dot(m.date)}</span></div>
      </div>
    </article>`;
  }

  /* ============================== 一键整理（真的调用 AI） ============================== */
  const AI_PROMPT = `你是旅行资料整理助手。用户会贴来一段杂乱的内容（聊天记录、攻略、笔记、分享文字），请把它拆成结构化数据。
只输出一个 JSON 对象，不要任何解释，不要代码块标记。格式：
{
  "trip_patch": { "title": 目的地, "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "budget": 数字(人民币), "people": 同行的人, "reason": "从原文摘一句依据" }，只写原文明确提到要改的字段，没有就给 null,
  "places": [ { "name": 地点名, "city": 城市, "country": 国家, "type": "建筑|餐馆|城市|自然|咖啡" 之一, "want": 1到5的想去程度, "tags": [短标签], "lat": 纬度或null, "lng": 经度或null, "note": 为什么想去（一句话）, "local": 是否在用户所在城市 } ],
  "items": [ { "day": 第几天(从1开始), "time": "HH:MM" 或 null, "title": 安排, "note": 补充, "place": 关联的地点名或null, "replaces": 要更新的原有安排的标题或null } ],
  "materials": [ { "kind": "prep|guide|booking|note" 之一, "title": 标题, "url": 链接或null, "due": "YYYY-MM-DD HH:MM" 或 null, "detail": 补充 } ],
  "memories": [ { "place": 地点名, "date": "YYYY-MM-DD", "rating": 1到5, "cost": 花费文字, "note": 感受 } ]
}
规则：没有的类别给空数组；已经去过、在讲感受的内容才放进 memories；提到上下文里已有的地点或日程时，用和上下文完全相同的名字；不要编造原文没有的信息，坐标除外（知名地点可以给大致坐标）。`;

  const sortState = { text: '', result: null, raw: null, status: 'idle', error: '', meta: '', written: false, trip: null, src: 'text' };
  const activeProvider = () => D.providers.find(p => p.active) || D.providers[0] || null;
  if (D.sample && D.aiDemo && D.aiSample) { sortState.text = D.aiSample; sortState.trip = 'kyoto'; }

  function findPlace(name) {
    const n = norm(name);
    if (!n) return null;
    return alive().find(p => norm(p.name) === n) || alive().find(p => n.length >= 2 && (norm(p.name).includes(n) || n.includes(norm(p.name))) && Math.min(n.length, norm(p.name).length) >= 2) || null;
  }
  function findItem(t, title) {
    const n = norm(title);
    for (const d of t.days) {
      const it = d.items.find(i => norm(i.title) === n) || d.items.find(i => n.length >= 2 && (norm(i.title).includes(n) || n.includes(norm(i.title))));
      if (it) return { d, it };
    }
    return null;
  }
  const normTime = s => { const m = /(\d{1,2})[:：](\d{2})/.exec(s || ''); return m ? `${pad(+m[1])}:${m[2]}` : '待定'; };
  function normalize(raw, t) {
    const r = { trip: [], places: [], items: [], materials: [], memories: [] };
    const tp = raw && raw.trip_patch ? raw.trip_patch : {};
    if (t) {
      [['title', '目的地', v => v], ['start', '出发', dot], ['end', '回来', dot], ['budget', '预算', yen], ['people', '同行', v => v]].forEach(([k, l, fmt]) => {
        const v = tp[k];
        if (v == null || v === '' || String(v) === String(t[k] ?? '')) return;
        if ((k === 'start' || k === 'end') && !isDate(v)) return;
        r.trip.push({ key: k, field: l, from: t[k] ? fmt(t[k]) : '未填', to: fmt(v), value: k === 'budget' ? Number(v) : v, why: tp.reason || '' });
      });
    }
    (raw?.places || []).forEach(x => {
      if (!x || !x.name) return;
      const ex = findPlace(x.name);
      r.places.push({ ...x, type: TYPES.includes(x.type) ? x.type : guess(x.name).type, want: clamp(Math.round(x.want || 3), 1, 5), match: ex ? ex.id : null });
    });
    (raw?.items || []).forEach(x => {
      if (!x || !x.title) return;
      const day = Math.round(+x.day || 0);
      const rep = t && x.replaces ? findItem(t, x.replaces) : null;
      r.items.push({ day, t: normTime(x.time), title: x.title, note: x.note || '', place: x.place || null, replaces: rep ? x.replaces : null, op: rep ? 'upd' : 'new', ok: !!t && day >= 1 && day <= t.days.length });
    });
    (raw?.materials || []).forEach(x => {
      if (!x || !x.title) return;
      const key = ['prep', 'guide', 'booking', 'note'].includes(x.kind) ? x.kind : 'note';
      const ex = key === 'prep' && t ? t.materials.prep.find(v => norm(v.text) === norm(x.title)) : null;
      r.materials.push({ key, cat: { prep: '准备', guide: '攻略', booking: '预订', note: '备注' }[key], title: x.title, url: x.url || '', due: x.due || '', detail: x.detail || '', match: !!ex, ok: !!t });
    });
    (raw?.memories || []).forEach(x => {
      if (!x || !x.place) return;
      const ex = findPlace(x.place);
      r.memories.push({ ...x, match: ex ? ex.id : null });
    });
    return r;
  }

  async function callAI(prov, text, t) {
    const ctx = {
      今天: todayISO(), 我住在: D.home.city,
      行程: t ? { 名称: `${t.title} ${t.subtitle || ''}`.trim(), 日期: isDate(t.start) ? `${t.start} 至 ${t.end}` : (t.start || '未定'), 每天: t.days.map(d => ({ 第几天: d.n, 日期: d.date, 主题: d.title, 安排: d.items.map(i => `${i.t} ${i.title}`) })), 准备事项: t.materials.prep.map(x => x.text) } : null,
      已有地点: alive().map(p => p.name)
    };
    const body = { model: prov.model, temperature: 0.2, messages: [{ role: 'system', content: AI_PROMPT }, { role: 'user', content: `上下文：${JSON.stringify(ctx)}\n\n要整理的内容：\n${text}` }] };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 60000);
    let res;
    try {
      res = await fetch(prov.base.replace(/\/+$/, '') + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prov.key}` }, body: JSON.stringify(body), signal: ctl.signal });
    } finally { clearTimeout(timer); }
    if (!res.ok) { const detail = await res.text().catch(() => ''); throw Object.assign(new Error('http'), { status: res.status, detail: detail.slice(0, 160) }); }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw Object.assign(new Error('parse'), { detail: content.slice(0, 160) });
    try { return JSON.parse(m[0]); } catch { throw Object.assign(new Error('parse'), { detail: content.slice(0, 160) }); }
  }
  function explainErr(e) {
    if (e.name === 'AbortError') return '等了 60 秒还没有回应。换一个服务商，或者过一会儿再试。';
    if (e.status === 401 || e.status === 403) return '服务商拒绝了请求：密钥不对或者没有权限。到设置里检查一下密钥。';
    if (e.status === 404) return '接口地址不对（返回 404）。OpenAI 兼容的地址一般以 /v1 结尾。';
    if (e.status === 429) return '请求太频繁，或者额度用完了（429）。';
    if (e.status) return `服务商返回了错误 ${e.status}。${e.detail ? '原话：' + e.detail : ''}`;
    if (e.message === 'parse') return '模型的回复里没找到能用的 JSON。换一个更强的模型试试。';
    return '连不上服务商。在线预览页不允许访问外部网站，下载到本地打开就能用；如果本地也连不上，可能是服务商不允许浏览器直接调用（跨域），需要经过一个支持跨域的中转地址。';
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function sendToSort(text) {
    const n = norm(text);
    const t = activeTrips().find(x => [x.title, x.area, x.subtitle, ...x.title.split(/[ ·]+/)].filter(v => v && v.length >= 2).some(v => n.includes(norm(v))));
    Object.assign(sortState, { text, result: null, raw: null, status: 'idle', meta: '', trip: t ? t.id : '' });
    renderSort();
    location.hash = 'sort';
    setTimeout(runSort, 60);
  }
  async function runSort(useDemo = false) {
    const ta = $('#sort-text');
    const text = (ta ? ta.value : sortState.text).trim();
    sortState.text = text;
    if (!text && !useDemo) { toast('先把要整理的内容贴进来。'); ta?.focus(); return; }
    const prov = D.providers.find(p => p.id === ($('#sort-prov')?.value)) || activeProvider();
    sortState.trip = $('#sort-trip') ? ($('#sort-trip').value || '') : (sortState.trip ?? '');
    const t = T[sortState.trip] || null;
    sortState.status = 'running'; sortState.error = ''; sortState.written = false;
    renderSort();
    const t0 = Date.now();
    try {
      let raw;
      if (useDemo || (prov && prov.demo && norm(text) === norm(D.aiSample || ''))) { await sleep(900); raw = D.aiDemo || SAMPLE.aiDemo; sortState.meta = '示例结果'; }
      else if (!prov) throw Object.assign(new Error('noprov'), { friendly: '还没有 AI 服务商。到设置里加一个，就能整理任何内容。' });
      else if (prov.demo) throw Object.assign(new Error('demo'), { friendly: `「${prov.name}」是示例服务商，没有真的连上 AI，所以只能整理示例那段聊天。到设置里填上你自己的服务商，就能整理任何内容。` });
      else { raw = await callAI(prov, text, t); sortState.meta = `${prov.name} · ${prov.model} · 用时 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`; }
      sortState.raw = raw;
      sortState.result = normalize(raw, t);
      sortState.status = 'done';
    } catch (e) {
      sortState.status = 'error';
      sortState.error = e.friendly || explainErr(e);
    }
    renderSort();
    if (sortState.status === 'done') $('#trays')?.classList.add('sorting');
  }

  function renderSort() {
    const prov = activeProvider();
    const st = sortState;
    const ts = activeTrips();
    if (st.trip == null) st.trip = D.sample ? 'kyoto' : (nextTrip()?.id || '');
    const t = T[st.trip] || null;
    if (st.status === 'idle' && !st.result && D.sample && st.trip === 'kyoto' && norm(st.text) === norm(D.aiSample || '')) { st.raw = D.aiDemo; st.result = normalize(D.aiDemo, t); st.status = 'done'; st.meta = '示例结果'; }
    $('#view-sort').innerHTML = `
      <header class="vh">
        <div><h1>一键整理</h1><p class="sub">把聊天记录、攻略整段贴进来，拆成行程信息、地点、日程、资料、回忆；已经有的会合并，确认后一次写入。</p></div>
        <div class="vh-actions"><a class="btn btn-quiet" href="#providers">${prov ? `AI 服务商：${esc(prov.name)}${prov.demo ? '（示例）' : ''}` : '还没有 AI 服务商'}</a></div>
      </header>
      <div class="sort-grid">
        <div class="sort-left">
          <div class="sort-opts">
            <div class="sel-field"><label for="sort-trip">整理到</label><select id="sort-trip">${ts.map(x => `<option value="${x.id}" ${x.id === st.trip ? 'selected' : ''}>${esc(x.title)} ${esc(x.subtitle || '')}</option>`).join('')}<option value="" ${!t ? 'selected' : ''}>不放进行程，只整理地点和回忆</option></select></div>
            <div class="sel-field"><label for="sort-prov">使用</label><select id="sort-prov">${D.providers.map(p => `<option value="${p.id}" ${p.active ? 'selected' : ''}>${esc(p.name)} · ${esc(p.model)}${p.demo ? '（示例）' : ''}</option>`).join('') || '<option value="">还没有，去设置里加</option>'}</select></div>
          </div>
          <div class="seg src-seg" role="group" aria-label="内容来源">${[['text', '粘贴文字'], ['shot', '聊天截图'], ['link', '攻略链接']].map(([v, l]) => `<button data-src="${v}" aria-pressed="${st.src === v}">${l}</button>`).join('')}</div>
          ${st.src === 'shot' ? `<div class="src-note"><b>截图先转成文字</b><span>手机相册里长按图片「提取文字」或用微信的「提取文字」，复制后粘贴到下面。浏览器里还认不了图片。</span></div>` : ''}
          ${st.src === 'link' ? `<div class="src-note"><b>链接打不开正文</b><span>网页不让别的站点直接读取，把攻略正文复制下来贴到下面就行；分享文字里的链接会一起保存成攻略。</span></div>` : ''}
          <div class="envelope airmail">
            <div class="env-head"><b>贴进来的内容</b><span id="char-n">${st.text.length} 字</span></div>
            <label class="sr-only" for="sort-text">贴进来的内容</label>
            <textarea id="sort-text" spellcheck="false" placeholder="粘贴一段微信聊天、一篇小红书正文、或者你自己的笔记">${esc(st.text)}</textarea>
          </div>
          <div class="sort-acts">
            <button class="btn btn-seal" id="run-sort" ${st.status === 'running' ? 'disabled' : ''}>${st.status === 'running' ? '正在分拣…' : st.result ? '重新整理' : '拆开整理'}</button>
            <button class="btn btn-quiet" id="clear-sort">清空</button>
            <p>结果先列在右边，勾掉不要的再写入；写入后也能撤销。</p>
          </div>
        </div>
        <section aria-label="整理结果">
          <div class="result-h"><h2>整理结果</h2><span class="meta" id="sort-meta">${st.status === 'running' ? '正在请求…' : esc(st.meta)}</span></div>
          ${st.status === 'error' ? `<div class="sort-err" role="alert"><b>没整理成</b><p>${esc(st.error)}</p><div class="row"><a class="btn btn-sm" href="#providers">去设置</a><button class="btn btn-sm btn-quiet" data-sortdemo>用示例结果看看</button></div></div>` : ''}
          ${st.status === 'running' ? '<div class="sorting-now"><span class="spin" aria-hidden="true"></span>正在拆信、分拣……一般 5 到 20 秒</div>' : ''}
          ${st.result && st.status !== 'running' ? `<div class="trays" id="trays">${traysHtml(st.result, t)}</div>
            <div class="commit"><p id="commit-txt"></p><button class="btn btn-seal" id="commit-btn">全部写入</button></div>`
            : st.status === 'idle' ? '<div class="no-days big"><b>整理结果会出现在这里</b><p>一段聊天里提到的地点、哪天去哪、要抢的票、看过的攻略，会被分到五个格子里，你勾一勾再写入。</p></div>' : ''}
        </section>
      </div>`;
    updateCommit();
  }
  function traysHtml(r, t) {
    let i = 0;
    const ck = (k, idx, inner, ok = true) => `<li class="slip ${ok ? '' : 'off'}" style="--i:${i++}"><label class="check"><input type="checkbox" data-k="${k}" data-idx="${idx}" ${ok ? 'checked' : 'disabled'}><span class="box" aria-hidden="true"></span><span class="txt">${inner}</span></label></li>`;
    const tray = (title, n, body, wide) => `<div class="tray sheet ${wide ? 'wide' : ''}"><div class="tray-h"><h3>${title}</h3><span class="n">${n}</span></div>${body}</div>`;
    const empty = s => `<div class="tray-empty">${s}</div>`;
    return tray('行程信息', r.trip.length, r.trip.length ? `<ul class="slips">${r.trip.map((x, j) => ck('trip', j, `<span class="diff"><span>${esc(x.field)}</span><del>${esc(x.from)}</del><span aria-hidden="true">→</span><ins>${esc(x.to)}</ins><span class="op upd">更新</span>${x.why ? `<span class="why">依据：${esc(x.why)}</span>` : ''}</span>`)).join('')}</ul>` : empty(t ? '没提到要改日期、预算这些。' : '没有选行程，行程信息不会改。'), true)
      + tray('地点', r.places.length, r.places.length ? `<ul class="slips">${r.places.map((x, j) => {
        const ex = x.match && P[x.match];
        const pv = ex || { ...x, art: TYPE_ART[x.type][0], c: TYPE_ART[x.type][1], country: '' };
        return ck('place', j, `<span class="row-art"><span class="mini-art">${stamp(pv, { size: 'xs' })}</span><span><b>${esc(ex ? ex.name : x.name)}</b><span class="s">${ex ? `已在想去里 · ${ex.state === 'plan' ? '已排进行程' : ex.state === 'been' ? '去过' : '还没排'}` : `${esc(x.type)} · ${esc([x.city, x.country].filter(Boolean).join(' · ') || '城市未知')} · 想去 ${x.want} 分`}</span></span><span class="op ${ex ? 'link' : 'new'}">${ex ? '合并' : '新地点'}</span></span>`);
      }).join('')}</ul>` : empty('没提到具体地点。'))
      + tray('日程', r.items.length, r.items.length ? `<ul class="slips">${r.items.map((x, j) => ck('item', j, `<span class="row"><span><span class="w">Day ${x.day}${x.t !== '待定' ? ' · ' + esc(x.t) : ''}</span><br><b>${esc(x.title)}</b><span class="s">${x.ok ? (x.op === 'upd' ? `原有「${esc(x.replaces)}」· ` : '') + esc(x.note) : t ? `这次行程没有第 ${x.day} 天` : '没有选行程'}</span></span><span class="op ${x.op}">${x.op === 'new' ? '新增' : '更新'}</span></span>`, x.ok)).join('')}</ul>` : empty('没提到哪天去哪。'))
      + tray('资料', r.materials.length, r.materials.length ? `<ul class="slips">${r.materials.map((x, j) => ck('mat', j, `<span class="row"><span><b>${esc(x.title)}</b>${x.due || x.detail || x.url ? `<span class="s">${x.match ? '已有这项 · ' : ''}${x.due ? '截止 ' + esc(dueLabel(x.due)) + ' ' : ''}${esc(x.detail || (x.url ? x.url.replace(/^https?:\/\//, '').slice(0, 40) : ''))}</span>` : ''}</span><span class="cat">${esc(x.cat)}${x.match ? ' · 合并' : ''}</span></span>`, x.ok)).join('')}</ul>` : empty('没有要准备的事、攻略或预订。'))
      + tray('回忆', r.memories.length, r.memories.length ? `<ul class="slips">${r.memories.map((x, j) => ck('memo', j, `<span class="row"><span><b>${esc(x.place)}</b><span class="s">${esc(x.date || '')} · ${x.rating || '-'} 分 · ${esc(x.note || '')}</span></span><span class="op ${x.match ? 'link' : 'new'}">${x.match ? '合并' : '新地点'}</span></span>`)).join('')}</ul>` : empty('这段内容讲的都是还没去的安排，没有可以记成回忆的。'));
  }
  function updateCommit() {
    if (!$('#commit-txt')) return;
    const n = $$('#trays input[type=checkbox]:checked').length;
    const t = T[sortState.trip];
    $('#commit-txt').innerHTML = sortState.written ? `已写入${t ? `「${esc(tripName(t))}」` : ''}` : `已选 <b>${n}</b> 条${t ? `，写入「${esc(t.title)} ${esc(t.subtitle || '')}」` : ''}`;
    const b = $('#commit-btn');
    b.disabled = sortState.written || n === 0;
    b.textContent = sortState.written ? '已写入' : `写入 ${n} 条`;
  }
  function commitSort() {
    const r = sortState.result, t = T[sortState.trip] || null;
    const picked = $$('#trays input[type=checkbox]:checked').map(c => [c.dataset.k, +c.dataset.idx]);
    const has = k => picked.some(([kk]) => kk === k);
    act(`已写入 ${picked.length} 条${t ? `到「${tripName(t)}」` : ''}`, () => {
      const byName = {};
      const placeFor = (name, extra = {}) => {
        if (!name) return null;
        const n = norm(name);
        if (byName[n]) return P[byName[n]] || D.places.find(p => p.id === byName[n]);
        const ex = findPlace(name);
        if (ex) return ex;
        const x = r.places.find(v => norm(v.name) === n) || { name, ...guess(name), ...extra };
        const g = guess(x.name);
        const p = draftPlace({ ...g, ...x, type: TYPES.includes(x.type) ? x.type : g.type, area: t && !x.local ? t.area : (x.local ? D.home.city : (CITY[x.city]?.[3] || x.city || g.area)) });
        D.places.unshift(p); P[p.id] = p; byName[n] = p.id;
        return p;
      };
      picked.forEach(([k, i]) => {
        if (k === 'place') {
          const x = r.places[i];
          const ex = x.match && P[x.match];
          if (ex) { if (!(ex.lat || ex.lng) && x.lat) { ex.lat = x.lat; ex.lng = x.lng; } ex.tags = [...new Set([...ex.tags, ...(x.tags || [])])]; if (!ex.note && x.note) ex.note = x.note; byName[norm(x.name)] = ex.id; }
          else { const p = placeFor(x.name); if (p) p.src = { from: '一键整理', title: sortState.text.slice(0, 30) }; }
        }
      });
      if (t) picked.forEach(([k, i]) => {
        if (k === 'trip') { const x = r.trip[i]; t[x.key] = x.value; if (x.key === 'start' || x.key === 'end') { if (!isDate(t.end) || t.end < t.start) t.end = t.start; syncDays(t); } }
      });
      picked.forEach(([k, i]) => {
        if (k === 'item' && t) {
          const x = r.items[i], day = t.days[x.day - 1];
          if (!day) return;
          const p = x.place ? placeFor(x.place) : null;
          const ex = x.replaces ? findItem(t, x.replaces) : null;
          if (ex) {
            const it = ex.it;
            if (x.t !== '待定') it.t = x.t;
            it.title = x.title; if (x.note) it.note = x.note;
            if (p) it.place = p.id;
            if (ex.d !== day) { ex.d.items = ex.d.items.filter(v => v !== it); insertItem(day, it); }
            freshItems.add(it); openDays(t.id).add(x.day - 1);
            if (p && p.state !== 'been') { p.state = 'plan'; p.trip = t.id; p.day = x.day; }
          } else {
            if (p) removeFromDays(p);
            const it = { t: x.t, kind: p ? p.type : guess(x.title).type, title: x.title, note: x.note, place: p ? p.id : undefined };
            insertItem(day, it); freshItems.add(it); openDays(t.id).add(x.day - 1);
            if (p && p.state !== 'been') { p.state = 'plan'; p.trip = t.id; p.day = x.day; }
          }
        }
        if (k === 'mat' && t) {
          const x = r.materials[i], m = t.materials;
          if (x.key === 'prep') { const ex = m.prep.find(v => norm(v.text) === norm(x.title)); if (ex) { if (x.due) ex.due = x.due; } else m.prep.push({ text: x.title, done: false, due: x.due || undefined }); }
          else if (x.key === 'guide') m.guide.unshift({ src: x.url ? srcOf(x.url) : '笔记', title: x.title, url: x.url || '', by: x.detail || '一键整理', saved: md(todayISO()) });
          else if (x.key === 'booking') m.booking.push({ kind: '其他', code: '', title: x.title, lines: x.detail ? [x.detail] : [], ref: '', price: 0 });
          else m.note.push(x.detail ? `${x.title}：${x.detail}` : x.title);
        }
        if (k === 'memo') {
          const x = r.memories[i];
          const p = (x.match && P[x.match]) || placeFor(x.place);
          if (!p) return;
          const date = isDate(x.date) ? x.date : todayISO();
          if (p.state !== 'been') markBeen(p, date);
          const amt = parseFloat(String(x.cost || '').replace(/[^\d.]/g, ''));
          D.memories.push({ place: p.id, date, rating: clamp(Math.round(x.rating || 0), 0, 5), cost: x.cost || '', costCny: /€/.test(x.cost) ? Math.round(amt * 7.8) : /円|日元/.test(x.cost) ? Math.round(amt * .048) : (amt || 0), photos: 0, note: x.note || '' });
        }
      });
    }, { action: t ? { label: '去看行程', fn: () => { curTrip = t.id; location.hash = 'trip'; } } : { label: '去看看', fn: () => { location.hash = 'places'; } }, onUndo: () => { sortState.written = false; } });
    sortState.written = true;
    updateCommit();
  }

  /* ============================== 设置：AI 服务商、家、数据 ============================== */
  let confirmClear = false;
  function renderProviders() {
    const nP = D.places.length, nT = D.trips.length, nM = D.memories.length;
    $('#view-providers').innerHTML = `
      <header class="vh">
        <div><h1>设置</h1><p class="sub">AI 服务商、家在哪个城市、数据备份。</p></div>
        <div class="vh-actions"><a class="btn btn-quiet" href="#sort">回到一键整理</a></div>
      </header>
      <div class="prov-grid">
        <section>
          <div class="sh"><h2>AI 服务商</h2><span class="meta">一键整理时用启用中的那一个</span></div>
          <div class="prov-list">${D.providers.length ? D.providers.map(p => `
            <article class="prov sheet ${p.active ? 'on' : ''}">
              <div class="prov-top"><h3>${esc(p.name)}${p.demo ? '<span class="demo-tag">示例</span>' : ''}</h3><span class="used">${esc(p.used || '')}</span></div>
              <dl><dt>接口地址</dt><dd>${esc(p.base)}</dd><dt>模型</dt><dd>${esc(p.model)}</dd><dt>密钥</dt><dd>${p.demo ? esc(p.key) : esc(maskKey(p.key))}</dd></dl>
              <div class="acts">${p.active ? '' : `<button class="btn btn-sm" data-use="${p.id}">设为启用</button>`}<button class="btn btn-sm btn-quiet" data-provtest="${p.id}">测试连接</button><button class="btn btn-sm btn-quiet" data-provedit="${p.id}">编辑</button><button class="btn btn-sm btn-quiet danger" data-provdel="${p.id}">删除</button></div>
              ${p.active ? '<span class="rubber" aria-label="使用中">使用中</span>' : ''}
            </article>`).join('') : '<div class="no-days"><b>还没有服务商</b><p>DeepSeek、通义千问、Kimi、或者你自己的中转，只要兼容 OpenAI 接口都可以。</p></div>'}
          </div>
        </section>
        <div class="settings-side">
          <form class="sheet prov-form" id="prov-form" novalidate>
            <h2 id="pf-title">${provEditing ? '编辑服务商' : '添加服务商'}</h2>
            <p>填好以后点「测试连接」，通过了再保存。</p>
            <div class="sel-field"><label for="pv-name">名称</label><input id="pv-name" placeholder="比如：Kimi" autocomplete="off"></div>
            <div class="sel-field"><label for="pv-base">接口地址</label><input id="pv-base" placeholder="https://api.moonshot.cn/v1" autocomplete="off"></div>
            <div class="sel-field"><label for="pv-model">模型</label><input id="pv-model" placeholder="moonshot-v1-32k" autocomplete="off"></div>
            <div class="sel-field"><label for="pv-key">密钥</label><input id="pv-key" type="password" placeholder="${provEditing ? '不改就留空' : 'sk-…'}" autocomplete="off"></div>
            <div class="row"><button type="button" class="btn" id="pv-test">测试连接</button><button type="submit" class="btn btn-seal">${provEditing ? '保存修改' : '保存'}</button>${provEditing ? '<button type="button" class="btn btn-quiet" data-provcancel>取消</button>' : ''}</div>
            <p class="hint">密钥只存在这台设备的浏览器里，页面上只显示后四位。浏览器会直接连服务商，所以只在自己的设备上用。</p>
          </form>
          <form class="sheet prov-form" id="home-form">
            <h2>家在哪个城市</h2>
            <p>用来区分「本地」和「远方」，也是地图上「家」的位置。</p>
            <div class="sel-field"><label for="home-city">城市</label><input id="home-city" value="${esc(D.home.city)}" list="home-cities" autocomplete="off"><datalist id="home-cities">${Object.keys(CITY).filter(c => CITY[c][2] === '中国').map(c => `<option value="${c}">`).join('')}</datalist></div>
            <div class="row"><button class="btn btn-sm">保存</button></div>
          </form>
          <section class="sheet prov-form data-card">
            <h2>数据</h2>
            <p>${storageOk ? `存在这台设备的浏览器里：${nP} 处地点、${nT} 次行程、${nM} 段回忆。换设备或清理浏览器前，先导出一份备份。` : '这个浏览器不让存数据（可能是无痕模式），关掉页面改动就没了。先导出一份备份。'}</p>
            <div class="row"><button class="btn btn-sm" data-export>导出备份</button><button class="btn btn-sm btn-quiet" data-copybackup>复制备份内容</button><label class="btn btn-sm btn-quiet" for="import-file">导入备份</label><input type="file" id="import-file" accept="application/json,.json" class="sr-only"></div>
            <div class="row">${D.sample ? '' : '<button class="btn btn-sm btn-quiet" data-sample="restore">载入示例数据</button>'}${confirmClear ? `<span class="confirm">确定清空？会删掉 ${nP} 处地点、${nT} 次行程、${nM} 段回忆。</span><button class="btn btn-sm btn-seal" data-sample="clear-yes">确定清空</button><button class="btn btn-sm btn-quiet" data-sample="clear-no">算了</button>` : '<button class="btn btn-sm btn-quiet danger" data-sample="clear">清空，从零开始</button>'}</div>
          </section>
        </div>
      </div>`;
    if (provEditing) { const p = D.providers.find(x => x.id === provEditing); if (p) { $('#pv-name').value = p.name; $('#pv-base').value = p.base; $('#pv-model').value = p.model; } }
  }
  let provEditing = null;
  const maskKey = k => (k ? 'sk-••••••••' + String(k).slice(-4) : '');
  async function testProvider(p) {
    if (!p) return;
    if (p.demo) { toast(`「${p.name}」是示例服务商，没有真实密钥。`); return; }
    toast(`正在连接 ${p.name}…`);
    try {
      const res = await fetch(p.base.replace(/\/+$/, '') + '/models', { headers: { Authorization: `Bearer ${p.key}` } });
      if (!res.ok) throw Object.assign(new Error('http'), { status: res.status });
      toast(`${p.name} 连接正常。`);
      p.used = `${md(todayISO())} 测试通过`; save(); renderProviders();
    } catch (e) { toast(explainErr(e)); }
  }
  function clearAll() {
    act('已清空。从投递口开始，记下第一个想去的地方。', () => {
      const keep = D.providers.filter(p => !p.demo);
      restore({ version: 3, sample: false, home: D.home, snoozed: {}, prefs: {}, places: [], trips: [], memories: [], providers: keep.length ? keep : [], todaySim: null, aiSample: '', aiDemo: SAMPLE.aiDemo });
      curTrip = null; sortState.text = ''; sortState.result = null; sortState.status = 'idle'; sortState.trip = null;
    });
    confirmClear = false;
  }

  /* ============================== 搜索，或记下一个想去 ============================== */
  const pal = { q: '', sel: 0, detail: false, items: [] };
  const TYPE_KW = [['咖啡', /咖啡|cafe|coffee|面包|甜品|茶室|烘焙|甜点/i], ['餐馆', /面|饭|菜|烧|餐|火锅|生煎|小笼|拉面|小吃|酒家|食堂|烤|串|寿司|鸡|鱼|饺|粉|市场|酒馆|居酒屋/], ['建筑', /寺|宫|塔|堂|教堂|城堡|神社|大社|桥|阁|美术馆|博物馆|大楼|院|庙|城$/], ['自然', /湖|山|海|公园|林|岛|瀑布|峡|谷|草原|沙滩|冰川|之道|湿地|温泉/]];
  const DISTRICT = [[/武康|衡山|安福|复兴|徐家汇|徐汇/, '徐汇'], [/愚园|新华|定西|长宁/, '长宁'], [/思南|进贤|黄河|南京东|外滩|黄浦/, '黄浦'], [/静安|延平|巨鹿/, '静安'], [/杨浦|五角场|军工/, '杨浦'], [/陆家嘴|浦东|前滩/, '浦东']];

  function guess(q) {
    q = String(q || '').trim();
    const type = (TYPE_KW.find(([, re]) => re.test(q)) || ['城市'])[0];
    const city = Object.keys(CITY).filter(c => c !== D.home.city).find(c => q.includes(c));
    const homeHit = q.includes(D.home.city);
    const road = !city ? (q.match(/([一-龥]{1,4}路)/) || [])[1] : '';
    const dist = !city && D.home.city === '上海' && DISTRICT.find(([re]) => re.test(q));
    const local = !city && (!!road || !!dist || homeHit);
    let name = q;
    const strip = s => { const r = name.replace(s, '').replace(/^[\s·,，的]+/, '').trim(); if (r.length >= 2) name = r; };
    if (road) strip(road);
    if (city) strip(city);
    if (homeHit) strip(D.home.city);
    const c = city && CITY[city];
    return { name, type, local, city: city || (local ? (road || D.home.city) : ''), country: c ? c[2] : (local ? (dist ? dist[1] : D.home.city) : ''), area: c ? c[3] : (local ? D.home.city : ''), want: 3, lat: c ? c[0] : null, lng: c ? c[1] : null };
  }
  function draftPlace(x) {
    const type = TYPES.includes(x.type) ? x.type : '城市';
    const [a, c] = TYPE_ART[type];
    const home = CITY[D.home.city];
    let lat = x.lat ?? null, lng = x.lng ?? null;
    if (lat == null && x.city && CITY[x.city]) [lat, lng] = CITY[x.city];
    if (lat == null && x.local && home) [lat, lng] = [home[0] + (Math.random() - .5) * .05, home[1] + (Math.random() - .5) * .06];
    return { id: uid(), name: x.name, city: x.city || '', country: x.country || '', area: x.area || (x.local ? D.home.city : (CITY[x.city]?.[3] || x.city || '未分组')), local: !!x.local, type, want: clamp(x.want || 3, 1, 5), tags: x.tags || [], lat: lat ?? 0, lng: lng ?? 0, approx: x.lat == null, state: 'want', art: a, c, added: todayISO(), season: x.season || [], seasonNote: x.seasonNote || '', note: x.note || '', src: x.src };
  }
  function palItems() {
    const q = pal.q.trim(), out = [];
    if (!q) {
      [...alive()].sort((a, b) => b.added.localeCompare(a.added)).slice(0, 3).forEach(p => out.push({ kind: 'place', p, group: '最近记下' }));
      activeTrips().slice(0, 2).forEach(t => out.push({ kind: 'trip', t, group: '跳到' }));
      if (todayCtx()) out.push({ kind: 'go', href: 'today', label: '今天', meta: todayCtx().sim ? '出发当天的样子（预览）' : '今天的安排', group: '跳到' });
      out.push({ kind: 'go', href: 'sort', label: '一键整理', meta: '把聊天记录、攻略拆成条目', group: '跳到' });
      return out;
    }
    const plan = inboxPlan(q);
    const nq = norm(q);
    const hits = plan.kind === 'create' ? alive().filter(p => norm([p.name, p.city, p.area, ...p.tags].join(' ')).includes(nq) || (nq.length >= 2 && nq.includes(norm(p.name)))).slice(0, 5) : [];
    hits.forEach(p => out.push({ kind: 'place', p, group: '已经在清单里' }));
    if (plan.kind === 'create' || plan.kind === 'link') out.push({ kind: 'create', x: plan.x, group: '记下新的', again: !!plan.dup });
    if (plan.kind === 'ai' || plan.kind === 'link') out.push({ kind: 'ai', group: plan.kind === 'ai' ? '这一段比较长' : '记下新的' });
    if (plan.kind === 'create') {
      D.trips.filter(t => norm(t.title + (t.subtitle || '') + t.area).includes(nq)).forEach(t => out.push({ kind: 'trip', t, group: '行程' }));
      D.memories.filter(m => P[m.place] && norm(P[m.place].name + m.note).includes(nq)).slice(0, 2).forEach(m => out.push({ kind: 'memo', m, group: '回忆' }));
    }
    return out;
  }
  function openPalette(q = '') {
    Object.assign(pal, { q, sel: 0, detail: false });
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
  }
  const SAMPLE_LINK = 'https://www.xiaohongshu.com/explore/66f2a1c0 京都哲学之道｜秋天散步路线';
  function renderPal() {
    const body = $('#pal-body');
    if (!body) return;
    const items = pal.items = palItems();
    if (pal.sel >= items.length) pal.sel = 0;
    const draft = items.find(x => x.kind === 'create');
    $('#pal-stamp').innerHTML = draft ? stamp(draftPlace(draft.x), { size: 'xs' }) : '<span class="blank-stamp"></span>';
    if (pal.detail && draft) { body.innerHTML = palDetail(draft.x); return; }
    let html = '', g = '';
    items.forEach((it, i) => {
      if (it.group !== g) { g = it.group; html += `<div class="pal-g">${esc(g)}</div>`; }
      const sel = `aria-selected="${i === pal.sel}"`;
      if (it.kind === 'create') {
        const x = it.x;
        html += `<button class="pal-row create" role="option" ${sel} data-pal="${i}"><span class="plus" aria-hidden="true">＋</span><span><b>${it.again ? '仍然记下' : '记下'}「${esc(x.name)}」</b><small>${esc(x.type)} · ${esc(x.local ? `本地 · ${x.city}` : (x.city || '城市以后再填'))} · 想去 ${x.want} 分${x.src ? ` · 来自${esc(x.src.from)}` : ''}</small></span><kbd>↵</kbd></button>`;
      }
      if (it.kind === 'ai') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}"><span class="ico ai" aria-hidden="true">拆</span><span><b>交给 AI 分拣</b><small>拆出地点、日程、准备事项，再一起确认</small></span></button>`;
      if (it.kind === 'place') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}">${stamp(it.p, { size: 'xs' })}<span><b>${esc(it.p.name)}</b><small>${esc(whereOf(it.p))}</small></span>${stateLine(it.p)}</button>`;
      if (it.kind === 'trip') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}"><span class="ico plan" aria-hidden="true"></span><span><b>${esc(it.t.title)} ${esc(it.t.subtitle || '')}</b><small>${isDate(it.t.start) ? `${md(it.t.start)} — ${md(it.t.end)}` : '日期待定'}</small></span>${statusPill(tripStatus(it.t))}</button>`;
      if (it.kind === 'memo') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}"><span class="ico memo" aria-hidden="true"></span><span><b>${esc(P[it.m.place].name)}</b><small>${esc((it.m.note || '').slice(0, 28))}</small></span></button>`;
      if (it.kind === 'go') html += `<button class="pal-row" role="option" ${sel} data-pal="${i}"><span class="ico go" aria-hidden="true">→</span><span><b>${esc(it.label)}</b><small>${esc(it.meta)}</small></span></button>`;
    });
    if (!pal.q.trim()) html = `<div class="pal-hints"><span>试试：</span><button class="chip" data-hint="${esc(SAMPLE_LINK)}">一条小红书分享</button><button class="chip" data-hint="武康路 新开的面包店">武康路 新开的面包店</button>${alive().length ? '<button class="chip" data-hint="稻荷">稻荷</button>' : ''}</div>` + html;
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
        <label class="switch"><input type="checkbox" id="pd-local" ${x.local ? 'checked' : ''}> 本地（${esc(D.home.city)}）</label></div>
        <div class="pd-foot"><button type="button" class="btn btn-quiet" data-pdback>返回</button><button type="submit" class="btn btn-seal">收进想去</button></div>
      </div>
    </form>`;
  }
  function readPalDetail(base) {
    const city = $('#pd-city').value.trim().split(/[，,、\s]+/).filter(Boolean);
    const local = $('#pd-local').checked;
    const g = guess(city.join(' '));
    const c = CITY[city[0]];
    return { ...base, name: $('#pd-name').value.trim() || base.name, type: $('input[name=pd-type]:checked').value, want: +$('input[name=pd-want]:checked').value, local,
      city: city[0] || (local ? D.home.city : ''), country: local ? (g.local ? g.country : (base.local ? base.country : D.home.city)) : (city[1] || (c ? c[2] : '') || base.country || ''),
      area: local ? D.home.city : (c ? c[3] : (city[0] === base.city ? base.area : city[0])) || '', lat: c ? c[0] : (city[0] === base.city ? base.lat : null), lng: c ? c[1] : (city[0] === base.city ? base.lng : null),
      note: $('#pd-note').value.trim(), tags: $('#pd-tags').value.trim().split(/\s+/).filter(Boolean) };
  }
  function savePlace(x) {
    const p = draftPlace(x);
    const t = suggestedTrip(p);
    if ($('#palette').open) $('#palette').close();
    act(`已记下「${p.name}」`, () => { D.places.unshift(p); }, {
      action: t && t.days.length ? { label: `加进${tripName(t)}`, fn: () => openDrawer(p.id, { trip: t.id }) } : { label: '补充信息', fn: () => openDrawer(p.id) }
    });
  }
  function runPal(i) {
    const it = pal.items[i];
    if (!it) return;
    if (it.kind === 'create') { savePlace(it.x); return; }
    if (it.kind === 'ai') { const q = pal.q; $('#palette').close(); sendToSort(q); return; }
    $('#palette').close();
    if (it.kind === 'place') openDrawer(it.p.id);
    if (it.kind === 'trip') { curTrip = it.t.id; renderTrip(); location.hash = 'trip'; }
    if (it.kind === 'memo') location.hash = 'memories';
    if (it.kind === 'go') location.hash = it.href;
  }

  /* ============================== 地点抽屉 ============================== */
  const dr = { id: null, trip: null, moving: false, editing: false };
  function openDrawer(id, { trip = null, edit = false } = {}) {
    const p = P[id];
    if (!p) return;
    Object.assign(dr, { id, moving: false, editing: edit, trip: trip || (p.state === 'want' ? suggestedTrip(p)?.id : p.trip) || null });
    renderDrawer();
    showDialog($('#drawer'));
    $('#drawer .dr-x')?.focus();
  }
  function renderDrawer() {
    const dlg = $('#drawer');
    const p = P[dr.id];
    if (!p) { if (dlg.open) dlg.close(); return; }
    if (dr.editing) { dlg.innerHTML = placeEditForm(p); return; }
    const ms = memosOf(p.id);
    const tt = T[p.trip];
    const steps = [
      ['want', '想去', `${dot(p.added)} 记下`, true],
      ['plan', '计划中', tt ? `${tripName(tt)}${p.day ? ' · Day ' + p.day : ''}` : (p.state === 'been' ? '没排行程' : '还没排'), p.state === 'plan' || (p.state === 'been' && !!tt)],
      ['been', '已去过', p.state === 'been' && p.been ? dot(p.been) : '还没去', p.state === 'been'],
      ['memo', '回忆', ms.length ? `${ms.length} 段` : '还没写', ms.length > 0]
    ];
    const curIdx = steps.map(s => s[3]).lastIndexOf(true);
    let main;
    if (p.dropped) {
      main = `<div class="dr-act"><p class="dr-say">已经放下了。如果又想去了，随时拿回来。</p><div class="dr-btns"><button class="btn btn-seal" data-undrop="${p.id}">重新想去</button></div></div>`;
    } else if (p.state === 'want') {
      main = `<div class="dr-act"><h3>加入行程</h3>${planPicker(p)}<div class="dr-btns"><button class="btn btn-sm btn-quiet" data-been="${p.id}">其实已经去过了</button></div></div>`;
    } else if (p.state === 'plan' && tt) {
      main = `<div class="dr-act"><p class="dr-say">排在「${esc(tt.title)} ${esc(tt.subtitle || '')}」${p.day ? ` Day ${p.day} · ${tt.days[p.day - 1]?.date || ''}` : '，还没定哪天'}。</p>
        <div class="dr-btns"><button class="btn btn-seal" data-ckplace="${p.id}">到了，盖章</button>${tt.days.length ? `<button class="btn" data-move="${p.id}" aria-expanded="${dr.moving}">${p.day ? '换一天' : '定一天'}</button>` : ''}<button class="btn btn-quiet" data-unplan="${p.id}">移出行程</button></div>
        ${dr.moving ? dayChips(tt, p.day) : ''}
        ${tripStatus(tt) === 'plan' ? '<p class="dr-tip">出发后，在「今天」页里到一处点一下就能盖章。</p>' : ''}</div>`;
    } else {
      main = `<div class="dr-act"><p class="dr-say">${p.been ? `${dot(p.been)} 去过。` : '去过。'}${ms.length ? `写过 ${ms.length} 段回忆。` : '还没写回忆。'}</p>
        <div class="dr-btns">${ms.length ? '<a class="btn" href="#memories" data-close>看回忆</a>' : `<button class="btn btn-seal" data-memo="${p.id}">写回忆</button>`}<button class="btn ${ms.length ? 'btn-seal' : ''}" data-memo="${p.id}" data-again="1">又去了一次</button></div></div>`;
    }
    dlg.innerHTML = `<div class="drawer-in">
      <header class="dr-head">
        <button class="dr-x" data-close aria-label="关闭">×</button>
        <div class="dr-stamp">${stamp(p, { mark: true, clip: true })}</div>
        <div class="dr-id">
          <p class="dr-where">${p.local ? '<span class="local">本地</span>' : ''}${esc(whereOf(p))} · ${esc(p.type)}</p>
          <h2 id="dr-title">${esc(p.name)}</h2>
          <div class="dr-want" role="radiogroup" aria-label="想去程度">${[1, 2, 3, 4, 5].map(n => `<button role="radio" aria-checked="${n === p.want}" data-want="${n}">${n}<small>分</small></button>`).join('')}</div>
          <div class="dr-links"><button class="linklike sm" data-pedit="${p.id}">改信息</button><a class="linklike sm" href="${mapLink(p)}" target="_blank" rel="noopener">在地图 App 里看</a></div>
        </div>
      </header>
      <ol class="chain" aria-label="这个地方走到了哪一步">${steps.map(([k, l, s, on], i) => `<li class="${on ? 'on' : ''} ${i === curIdx ? 'cur' : ''}"><i class="mk ${k}"></i><b>${l}</b><small>${esc(s)}</small></li>`).join('')}</ol>
      ${main}
      <section class="dr-sec"><h3>什么时候去</h3>${months(p)}<p class="dr-note-s">${esc(p.seasonNote || '没写季节，什么时候都行。')}</p></section>
      <section class="dr-sec"><h3>为什么想去</h3>
        <label class="sr-only" for="dr-note">为什么想去</label><textarea id="dr-note" class="hand-in" rows="2" placeholder="写一句，以后翻到时还记得为什么。">${esc(p.note || '')}</textarea>
        ${p.src ? `<p class="dr-src"><span class="src ${p.src.from === '小红书' ? 'xhs' : ''}">${esc(p.src.from)}</span>${p.src.url ? `<a href="${esc(p.src.url)}" target="_blank" rel="noopener">${esc(p.src.title || p.src.url)}</a>` : esc(p.src.title || '')}</p>` : ''}</section>
      <section class="dr-sec"><h3>标签</h3><div class="dr-tags">${p.tags.map((t, i) => `<span class="tag">${esc(t)}<button class="tag-x" data-untag="${i}" aria-label="删掉标签 ${esc(t)}">×</button></span>`).join('')}<form id="tag-form" class="tag-form"><label class="sr-only" for="tag-in">加一个标签</label><input id="tag-in" placeholder="＋ 标签" autocomplete="off"></form></div></section>
      <footer class="dr-foot"><span>${dot(p.added)} 记下${p.src ? ' · 来自' + esc(p.src.from) : ''}${p.approx ? ' · 位置是城市中心' : ''}</span>${!p.dropped && p.state !== 'been' ? `<button class="btn btn-sm btn-quiet" data-drop="${p.id}">不想去了</button>` : ''}</footer>
    </div>`;
  }
  function placeEditForm(p) {
    const areas = [...new Set(alive().map(areaOf))];
    return `<form class="drawer-in dr-edit" id="pe-form">
      <header class="ck-h"><div><h2 id="dr-title">改地点信息</h2><p>坐标可以从地图 App 里长按复制，粘贴到这里。</p></div><button type="button" class="dr-x" data-close aria-label="关闭">×</button></header>
      <div class="pe-grid">
        <div class="pe-prev">${stamp(p)}</div>
        <div class="pd-fields">
          <div class="sel-field"><label for="pe-name">名称</label><input id="pe-name" value="${esc(p.name)}" autocomplete="off"></div>
          <div class="two"><div class="sel-field"><label for="pe-city">${p.local ? '路名 / 商圈' : '城市'}</label><input id="pe-city" value="${esc(p.city)}" autocomplete="off"></div>
            <div class="sel-field"><label for="pe-country">${p.local ? '区' : '国家'}</label><input id="pe-country" value="${esc(p.country)}" autocomplete="off"></div></div>
          <div class="sel-field"><label for="pe-area">归到哪一片（同一趟能顺路去的放一起）</label><input id="pe-area" list="pe-areas" value="${esc(areaOf(p))}" autocomplete="off"><datalist id="pe-areas">${areas.map(a => `<option value="${esc(a)}">`).join('')}</datalist></div>
          <fieldset><legend>类型</legend><div class="radio-chips">${TYPES.map(t => `<label><input type="radio" name="pe-type" value="${t}" ${t === p.type ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
          <div class="sel-field"><label for="pe-coord">坐标（纬度, 经度）</label><input id="pe-coord" value="${p.lat || p.lng ? `${p.lat}, ${p.lng}` : ''}" placeholder="比如：35.0113, 135.7934" autocomplete="off"></div>
          <label class="switch"><input type="checkbox" id="pe-local" ${p.local ? 'checked' : ''}> 本地（${esc(D.home.city)}）</label>
        </div>
      </div>
      <footer class="ck-foot"><button type="button" class="btn btn-quiet danger" data-pdel="${p.id}">删除这个地点</button><span class="grow"></span><button type="button" class="btn btn-quiet" data-pecancel>取消</button><button class="btn btn-seal" type="submit">保存</button></footer>
    </form>`;
  }
  function planPicker(p) {
    const ts = activeTrips().filter(t => !!t.local === !!p.local).sort((a, b) => (b.area === areaOf(p)) - (a.area === areaOf(p)));
    return `<div class="picker">${ts.map(t => {
      const match = t.area === areaOf(p), on = dr.trip === t.id;
      return `<div class="pick ${on ? 'on' : ''}"><button class="pick-t" data-pick-trip="${t.id}" aria-expanded="${on}"><b>${esc(t.title)} ${esc(t.subtitle || '')}</b><small>${isDate(t.start) ? `${md(t.start)}${t.end !== t.start ? '–' + md(t.end) : ''}` : '日期待定'}${match ? ` · 同在${esc(t.area)}` : ''}</small></button>
        ${on ? (t.days.length ? dayChips(t) : `<div class="day-chips"><button data-pick-day="0" data-trip-id="${t.id}"><b>放进这次行程</b><small>还没排日程</small></button></div>`) : ''}</div>`;
    }).join('')}<button class="pick-new" data-newtrip-area="${esc(areaOf(p))}" data-with="${p.id}">＋ 为${esc(areaOf(p))}新建一次行程</button></div>`;
  }
  function dayChips(t, cur) {
    return `<div class="day-chips" role="group" aria-label="选一天">${t.days.map(d => `<button data-pick-day="${d.n}" data-trip-id="${t.id}" ${cur === d.n ? 'aria-current="true"' : ''}><b>Day ${d.n}</b><small>${esc(d.date || '')} ${esc(d.title || '')}</small></button>`).join('')}<button data-pick-day="0" data-trip-id="${t.id}"><b>不定哪天</b><small>先放进这次行程</small></button></div>`;
  }

  /* ============================== 盖章 / 写回忆 / 改回忆 ============================== */
  const ck = { place: null, item: null, mode: 'checkin', date: '', time: '', rate: 0, cur: '¥', photos: [], sim: false, idx: -1 };
  function openCheckin({ place = null, item = null, mode = 'checkin', date = todayISO(), time = '', sim = false, idx = -1 }) {
    const p = place && P[place];
    const m = mode === 'edit' ? D.memories[idx] : null;
    const curOf = p ? (p.country === '日本' ? '円' : /西班牙|葡萄牙|法国|意大利/.test(p.country) ? '€' : '¥') : '¥';
    Object.assign(ck, { place, item, mode, date: m ? m.date : date, time, sim, idx, rate: m ? m.rating || 0 : 0, photos: m && m.img ? [m.img] : [], cur: m && /円/.test(m.cost) ? '円' : m && /€/.test(m.cost) ? '€' : curOf });
    renderSheet(m);
    showDialog($('#sheet'));
    setTimeout(() => $('#ck-note')?.focus(), 450);
  }
  function renderSheet(m) {
    const p = ck.place && P[ck.place];
    const name = p ? p.name : ck.item?.title;
    const where = p ? whereOf(p) : '';
    const memo = ck.mode !== 'checkin';
    const title = ck.mode === 'edit' ? '改回忆' : memo ? '写回忆' : '盖个章';
    const amt = m && m.cost ? (String(m.cost).match(/[\d,.]+/) || [''])[0].replace(/,/g, '') : '';
    $('#sheet').innerHTML = `<form class="ck" id="ck-form">
      <header class="ck-h"><div><h2>${title}：${esc(name)}</h2><p>${dot(ck.date)}${ck.time ? ' ' + ck.time : ''}${where ? ' · ' + esc(where) : ''}</p></div><button type="button" class="dr-x" data-close aria-label="关闭">×</button></header>
      ${!memo && p ? `<div class="ck-stage">${stamp(p, { size: 'sm' })}${postmark(pmCity(p), dot(ck.date), { cls: 'thunk' })}</div>` : ''}
      ${ck.sim ? '<p class="sim-note">这是预览：真正出发那天，盖章会把这里记成「去过」，写的话会存进回忆。</p>' : ''}
      <div class="ck-f"><label for="ck-note">一句话<span>${memo ? '' : '可以不写'}</span></label><textarea id="ck-note" class="hand-in" rows="3" placeholder="${p && p.type === '咖啡' ? '比如：拿铁一般，但窗外的八坂塔很好看' : '比如：人比想象的少，下次秋天再来'}">${esc(m ? m.note : '')}</textarea></div>
      ${ck.mode === 'edit' ? `<div class="sel-field"><label for="ck-date">日期</label><input type="date" id="ck-date" value="${esc(ck.date)}"></div>` : ''}
      ${p ? `<div class="ck-f"><span class="lbl" id="rate-l">评分</span><div class="rate" role="radiogroup" aria-labelledby="rate-l">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="${n === ck.rate}" aria-label="${n} 分" data-rate="${n}" class="${n <= ck.rate ? 'on' : ''}"></button>`).join('')}</div></div>` : ''}
      <div class="ck-row">
        <div class="sel-field"><label for="ck-cost">花费</label><input id="ck-cost" inputmode="decimal" placeholder="0" value="${esc(amt)}" autocomplete="off"></div>
        <div class="seg sm" role="group" aria-label="币种">${['円', '¥', '€', '$'].map(c => `<button type="button" data-cur="${c}" aria-pressed="${ck.cur === c}">${c}</button>`).join('')}</div>
      </div>
      ${p ? `<div class="ck-f"><span class="lbl">照片</span><div class="ck-photos"><label class="ph-add" for="ck-file" aria-label="添加照片">＋</label><input type="file" id="ck-file" accept="image/*" multiple class="sr-only"><span id="ck-thumbs">${ck.photos.map(src => `<img src="${src}" alt="">`).join('')}</span></div></div>` : ''}
      <footer class="ck-foot">${ck.mode === 'edit' ? `<button type="button" class="btn btn-quiet danger" data-memdel="${ck.idx}">删除这段回忆</button><span class="grow"></span>` : ''}${ck.mode === 'checkin' ? '<button type="button" class="btn btn-quiet" data-ck="stamp-only">只盖章，回头再写</button>' : ''}<button class="btn btn-seal" type="submit">${ck.mode === 'edit' ? '存好了' : memo ? '存进回忆' : '盖章，写进回忆'}</button></footer>
    </form>`;
  }
  function shrink(file) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 900 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', .8));
        };
        img.onerror = () => res(null);
        img.src = r.result;
      };
      r.onerror = () => res(null);
      r.readAsDataURL(file);
    });
  }
  function saveCheckin(stampOnly) {
    const p = ck.place && P[ck.place];
    const note = $('#ck-note').value.trim();
    const amt = parseFloat($('#ck-cost').value);
    const { item, sim, time, cur, mode, idx } = ck;
    const date = mode === 'edit' ? ($('#ck-date')?.value || ck.date) : ck.date;
    const photos = ck.photos.slice(), r = ck.rate;
    const hasMemo = !stampOnly && p && (note || r || amt || photos.length);
    if (mode !== 'checkin' && !hasMemo) { toast('写一句话、打个分或者加张照片，再存。'); $('#ck-note').focus(); return; }
    $('#sheet').close();
    const costStr = amt ? (cur === '円' ? `${amt.toLocaleString('en-US')} 円` : cur + amt.toLocaleString('en-US')) : '';
    const memo = () => ({ place: p.id, date, rating: r, cost: costStr, costCny: amt ? Math.round(amt * (RATE[cur] || 1)) : 0, photos: Math.max(photos.length, mode === 'edit' ? D.memories[idx].photos || 0 : 0), note, img: photos[0] || undefined });
    if (sim) {
      item.simDone = time;
      save(); refresh();
      toast('预览里盖了个章。真正出发那天，这会把地点记成「去过」并写进回忆。');
      return;
    }
    if (mode === 'edit') { act(`已改好：${p.name}`, () => { D.memories[idx] = memo(); }); return; }
    const msg = mode === 'memo' ? `已存进回忆：${p.name}` : `已盖章：${p ? p.name : item.title}${hasMemo ? '，写进回忆了' : ''}`;
    act(msg, () => {
      if (p && mode === 'checkin') markBeen(p, date);
      if (item) item.doneAt = time || nowHM();
      if (hasMemo) D.memories.push(memo());
      if (amt && item) { const t = D.trips.find(x => x.days.some(d => d.items.includes(item))); if (t && cur === (t.cur || '¥')) (t.expenses ||= []).push({ date, t: time || nowHM(), cat: p && /咖啡|餐馆/.test(p.type) ? '吃饭' : '门票', what: p ? p.name : item.title, amount: amt }); }
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
      <footer class="ck-foot"><button class="btn btn-quiet" data-draw="again" ${drw.rolling ? 'disabled' : ''}>换一个</button>${p && !drw.rolling ? `<button class="btn btn-seal" data-draw="go">${localTrip() ? '就去这家，排进' + esc(tripName(localTrip())) : '就去这家，排在这周六'}</button>` : ''}</footer>
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
    $$('[data-n=places]').forEach(e => { e.textContent = alive().length || ''; });
    $$('[data-n=trip]').forEach(e => { e.textContent = D.trips.length || ''; });
    $$('[data-n=memories]').forEach(e => { e.textContent = D.memories.length || ''; });
    const going = D.trips.some(t => tripStatus(t) === 'going');
    $$('.nav-today').forEach(e => { e.hidden = !going; });
  }
  function route() {
    let v = location.hash.slice(1);
    if (!VIEWS.includes(v)) v = 'home';
    VIEWS.forEach(k => { $('#view-' + k).hidden = k !== v; });
    const going = D.trips.some(t => tripStatus(t) === 'going');
    const navV = v === 'today' && !going ? 'trip' : v;
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
    toastTimer = setTimeout(() => el.classList.remove('show'), undo || action ? 6500 : Math.max(2600, msg.length * 90));
  }
  function showDialog(dlg) {
    if (dlg.open) return;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function refresh() {
    reindex();
    renderHome(); renderPlaces(); renderTrip(); renderMap(); renderMemories(); renderProviders(); renderToday(); renderSort(); navCounts();
    if ($('#drawer').open) renderDrawer();
    setTimeout(() => fresh.clear(), 60);
  }
  const goTrip = id => { curTrip = id; renderTrip(); location.hash = 'trip'; };

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

    // 首页
    if (el.id === 'inbox-go') { submitInbox(); return; }
    if (ds.inbox === 'ai') { submitInbox('ai'); return; }
    if (ds.allsteps !== undefined) { showAllSteps = !showAllSteps; renderHome(); return; }
    if (ds.snooze) { const key = ds.snooze; act('这条先放一周', () => { D.snoozed[key] = addDays(todayISO(), 7); }); return; }
    if (ds.prepdone) { const [tid, i] = ds.prepdone.split(':'); const x = T[tid].materials.prep[+i]; act(`做完了：${x.text}`, () => { x.done = true; }); return; }
    if (ds.keep) { const p = P[ds.keep]; act(`「${p.name}」还在想去里`, () => { p.touched = todayISO(); }); return; }
    if (ds.sample === 'hide') { D.prefs.hideSample = true; save(); renderHome(); return; }
    if (ds.sample === 'clear') { if (location.hash !== '#providers') { confirmClear = true; location.hash = 'providers'; renderProviders(); setTimeout(() => $('.data-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80); } else { confirmClear = true; renderProviders(); } return; }
    if (ds.sample === 'clear-no') { confirmClear = false; renderProviders(); return; }
    if (ds.sample === 'clear-yes') { clearAll(); location.hash = 'home'; return; }
    if (ds.sample === 'restore') { act('已载入示例数据', () => { restore(clone(SAMPLE)); curTrip = 'kyoto'; sortState.text = SAMPLE.aiSample; sortState.result = null; sortState.status = 'idle'; sortState.trip = 'kyoto'; }); return; }

    // 搜索框
    if (ds.hint) { const i = $('#pal-q'); i.value = ds.hint; pal.q = ds.hint; pal.sel = 0; renderPal(); i.focus(); return; }
    if (ds.pal) { runPal(+ds.pal); return; }
    if (ds.pdback !== undefined) { pal.detail = false; renderPal(); $('#pal-q').focus(); return; }

    // 地点
    if (ds.plan) { openDrawer(ds.plan, { trip: ds.pre || null }); return; }
    if (ds.place && !el.closest('dialog')) { e.preventDefault(); openDrawer(ds.place); return; }
    if (ds.place && el.closest('#palette, #sheet')) { el.closest('dialog').close(); openDrawer(ds.place); return; }
    if (ds.been) { const p = P[ds.been]; act(`已盖章：${p.name} 记为去过（${dot(todayISO())}）`, () => { unplan(p); markBeen(p, todayISO()); }, { action: { label: '写两句', fn: () => openCheckin({ place: p.id, mode: 'memo' }) } }); return; }
    if (ds.memo) { if ($('#drawer').open) $('#drawer').close(); openCheckin({ place: ds.memo, mode: ds.again ? 'checkin' : 'memo' }); return; }
    if (ds.memedit !== undefined) { const m = D.memories[+ds.memedit]; openCheckin({ place: m.place, mode: 'edit', idx: +ds.memedit }); return; }
    if (ds.memdel !== undefined) { const i = +ds.memdel, p = P[D.memories[i].place]; $('#sheet').close(); act(`已删掉${p ? '「' + p.name + '」的' : '这段'}回忆`, () => { D.memories.splice(i, 1); }); return; }
    if (ds.ckplace) { $('#drawer').close(); openCheckin({ place: ds.ckplace, mode: 'checkin' }); return; }
    if (ds.pickTrip) { dr.trip = dr.trip === ds.pickTrip ? null : ds.pickTrip; renderDrawer(); return; }
    if (ds.pickDay !== undefined) {
      const p = P[dr.id], tid = ds.tripId || dr.trip, t = T[tid], n = +ds.pickDay;
      dr.moving = false;
      act(n ? `已排进「${tripName(t)}」Day ${n}` : `已放进「${tripName(t)}」，还没定哪天`, () => addToTrip(p, tid, n), { action: { label: '看行程', fn: () => { $('#drawer').close(); goTrip(tid); } } });
      return;
    }
    if (ds.move) { dr.moving = !dr.moving; renderDrawer(); return; }
    if (ds.unplan) { const p = P[ds.unplan]; act(`已把「${p.name}」移出行程`, () => unplan(p)); return; }
    if (ds.want) { const p = P[dr.id]; p.want = +ds.want; save(); refresh(); toast(`想去程度改成 ${p.want} 分`); return; }
    if (ds.untag !== undefined) { const p = P[dr.id]; p.tags.splice(+ds.untag, 1); save(); refresh(); return; }
    if (ds.pedit) { dr.editing = true; renderDrawer(); setTimeout(() => $('#pe-name')?.focus(), 30); return; }
    if (ds.pecancel !== undefined) { dr.editing = false; renderDrawer(); return; }
    if (ds.pdel) { const p = P[ds.pdel]; $('#drawer').close(); act(`已删除「${p.name}」`, () => { removeFromDays(p); D.places = D.places.filter(x => x.id !== p.id); D.memories = D.memories.filter(m => m.place !== p.id); }); return; }
    if (ds.drop) { const p = P[ds.drop]; if ($('#drawer').open) $('#drawer').close(); act(`已放下「${p.name}」，在想去里能找回来`, () => { unplan(p); p.dropped = true; }); return; }
    if (ds.undrop) { const p = P[ds.undrop]; act(`「${p.name}」回到想去了`, () => { delete p.dropped; p.touched = todayISO(); }); return; }
    if (ds.newtripArea) {
      const area = ds.newtripArea;
      const ids = ds.with ? [ds.with] : alive().filter(p => areaOf(p) === area && p.state === 'want').map(p => p.id);
      if ($('#drawer').open) $('#drawer').close();
      openTripSheet(null, { area, withIds: ids });
      return;
    }

    // 行程
    if (ds.tripnew !== undefined) { openTripSheet(null); return; }
    if (ds.tripedit) { openTripSheet(ds.tripedit); return; }
    if (ds.tripdel) {
      const t = T[ds.tripdel];
      $('#sheet').close();
      act(`已删除「${tripName(t)}」，里面的地点回到想去`, () => { D.places.forEach(p => { if (p.trip === t.id) unplan(p); }); D.trips = D.trips.filter(x => x.id !== t.id); curTrip = null; });
      return;
    }
    if (ds.ms) { doMilestone(ds.ms, ds.tripId); return; }
    if (ds.editday !== undefined) { editDay = +ds.editday; renderTrip(); setTimeout(() => $(`#dt-${curTrip}-${editDay}`)?.focus(), 30); return; }
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
        if (p && p.state === 'plan' && p.trip === t.id) { p.state = 'want'; delete p.trip; delete p.day; }
      });
      return;
    }
    if (ds.delmat) {
      const [k, i] = ds.delmat.split(':'), t = T[curTrip], list = t.materials[k], x = list[+i];
      act(`已删掉：${typeof x === 'string' ? x.slice(0, 16) : (x.text || x.title)}`, () => { list.splice(+i, 1); });
      return;
    }

    // 今天
    if (ds.ckitem !== undefined) {
      const c = todayCtx(), it = c.t.days[c.di].items[+ds.ckitem];
      openCheckin({ place: it.place || null, item: it, mode: 'checkin', date: c.date, time: c.sim ? c.now : nowHM(), sim: c.sim });
      return;
    }
    if (ds.show) { openShow(ds.show); return; }
    if (ds.copy) {
      const ok = () => toast('确认号已复制');
      const fallback = () => { const r = document.createRange(); r.selectNodeContents($('#show-ref')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('已选中确认号，长按或右键复制'); };
      try { navigator.clipboard.writeText(ds.copy).then(ok, fallback); } catch { fallback(); }
      return;
    }

    // 帮我挑一个
    if (ds.drawCat) { drw.cat = ds.drawCat; drw.pick = null; roll(); return; }
    if (ds.draw === 'again') { roll(); return; }
    if (ds.draw === 'go') {
      const p = drw.pick, lt = localTrip();
      $('#draw').close();
      if (lt) { act(`就去「${p.name}」，已排进${tripName(lt)}`, () => addToTrip(p, lt.id, 1, '待定'), { action: { label: '看行程', fn: () => goTrip(lt.id) } }); return; }
      const sat = nextSaturday(), nid = uid();
      act(`就去「${p.name}」，排在这周六（${md(sat)}）`, () => {
        D.trips.push({ id: nid, title: `${D.home.city} · 周末`, subtitle: `去${p.name}`, area: D.home.city, local: true, start: sat, end: sat, cur: '¥', budget: 0, people: '我', slogan: `去${p.name}`, days: [], materials: { prep: [], guide: [], booking: [], note: [] }, expenses: [] });
        reindex(); syncDays(T[nid]); addToTrip(p, nid, 1, '待定');
      }, { action: { label: '看行程', fn: () => goTrip(nid) } });
      return;
    }

    // 想去
    if (ds.pview) { pf.view = ds.pview; renderPlaces(); return; }
    if (ds.f) {
      const k = ds.f;
      if (k === 'season') pf.season = !pf.season;
      else if (k === 'scope') pf.scope = ds.v;
      else pf[k] = pf[k] === ds.v ? '' : ds.v;
      renderPlaces();
      return;
    }

    // 地图
    if (ds.map) { mapMode = ds.map; mapSel = null; renderMap(); return; }
    if (el.classList.contains('pin')) { mapSel = ds.c; renderMap(); return; }
    if (ds.pick) {
      const p = P[ds.pick];
      if (p.local) { mapMode = 'city'; mapSel = p.id; } else { mapMode = 'world'; mapSel = areaOf(p); }
      renderMap();
      return;
    }

    // 一键整理
    if (ds.src) { sortState.text = $('#sort-text').value; sortState.src = ds.src; renderSort(); return; }
    if (el.id === 'run-sort') { runSort(); return; }
    if (ds.sortdemo !== undefined) { runSort(true); return; }
    if (el.id === 'clear-sort') { sortState.text = ''; sortState.result = null; sortState.status = 'idle'; sortState.meta = ''; renderSort(); $('#sort-text').focus(); return; }
    if (el.id === 'commit-btn') { commitSort(); return; }

    // 设置
    if (ds.use) { D.providers.forEach(p => { p.active = p.id === ds.use; }); save(); refresh(); toast(`已启用 ${D.providers.find(p => p.active).name}，之后的整理都用它。`); return; }
    if (ds.provtest) { testProvider(D.providers.find(p => p.id === ds.provtest)); return; }
    if (ds.provedit) { provEditing = ds.provedit; renderProviders(); $('#prov-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#pv-name').focus({ preventScroll: true }); return; }
    if (ds.provcancel !== undefined) { provEditing = null; renderProviders(); return; }
    if (ds.provdel) {
      const p = D.providers.find(x => x.id === ds.provdel);
      act(`已删除服务商「${p.name}」`, () => { D.providers = D.providers.filter(x => x !== p); if (p.active && D.providers[0]) D.providers[0].active = true; });
      return;
    }
    if (el.id === 'pv-test') {
      const base = $('#pv-base').value.trim(), key = $('#pv-key').value.trim(), model = $('#pv-model').value.trim();
      const old = provEditing && D.providers.find(x => x.id === provEditing);
      if (!base || (!key && !(old && !old.demo))) { toast('先填好接口地址和密钥，再测试连接。'); return; }
      testProvider({ name: $('#pv-name').value.trim() || '这个服务商', base, model, key: key || old.key });
      return;
    }
    if (ds.export !== undefined) {
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' }));
        a.download = `远方清单-备份-${todayISO()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        toast('已导出备份。如果没有开始下载，用「复制备份内容」。');
      } catch { toast('这里不能直接下载，用「复制备份内容」。'); }
      return;
    }
    if (ds.copybackup !== undefined) {
      const txt = JSON.stringify(D);
      try { navigator.clipboard.writeText(txt).then(() => toast(`已复制备份（${Math.round(txt.length / 1024)} KB），粘到备忘录里存好。`), () => toast('复制没成功，换个浏览器试试。')); } catch { toast('复制没成功，换个浏览器试试。'); }
      return;
    }
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
    if (e.target.id === 'inbox' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submitInbox(); return; }
    if (e.target.id === 'pal-q') {
      const n = pal.items.length;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) { e.preventDefault(); pal.sel = (pal.sel + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; renderPal(); }
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); runPal(pal.sel); }
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
    if (t.id === 'inbox') { inboxText = t.value; $('#inbox-hint').innerHTML = inboxHint(inboxPlan(t.value)); return; }
    if (t.id === 'q-places') { pf.q = t.value; renderAlbum(); return; }
    if (t.id === 'sort-text') { sortState.text = t.value; $('#char-n').textContent = t.value.length + ' 字'; return; }
    if (t.id === 'pal-q') { pal.q = t.value; pal.sel = 0; pal.detail = false; renderPal(); return; }
    if (t.closest('#pal-form')) syncDetailStamp();
  });

  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.id === 'sort-places') { pf.sort = t.value; renderAlbum(); return; }
    if (t.dataset.prep) {
      const tr = T[t.dataset.prep], x = tr.materials.prep[+t.dataset.i];
      x.done = t.checked; save();
      renderHome();
      if (curTrip === tr.id) renderTrip();
      return;
    }
    if (t.dataset.cand) {
      if (t.value === '') return;
      const p = P[t.dataset.cand], tr = T[curTrip], n = +t.value;
      act(n ? `已把「${p.name}」排进 Day ${n}` : `已把「${p.name}」放进「${tripName(tr)}」`, () => addToTrip(p, tr.id, n));
      return;
    }
    if (t.classList.contains('dt-in')) { const d = T[curTrip].days[+t.dataset.dt]; d.title = t.value.trim(); editDay = null; save(); renderTrip(); renderHome(); return; }
    if (t.id === 'sort-trip') { sortState.trip = t.value || ''; if (sortState.raw) { sortState.result = normalize(sortState.raw, T[sortState.trip] || null); sortState.written = false; } renderSort(); return; }
    if (t.closest('#trays')) { updateCommit(); return; }
    if (t.id === 'dr-note') { const p = P[dr.id]; p.note = t.value.trim(); save(); toast('记下了'); return; }
    if (t.id === 'ck-file' && t.files.length) {
      for (const file of Array.from(t.files).slice(0, 6)) { const src = await shrink(file); if (src) ck.photos.push(src); }
      $('#ck-thumbs').innerHTML = ck.photos.map(src => `<img src="${src}" alt="">`).join('');
      return;
    }
    if (t.id === 'import-file' && t.files[0]) {
      try {
        const data = JSON.parse(await t.files[0].text());
        if (!Array.isArray(data.places) || !Array.isArray(data.trips)) throw new Error('bad');
        act(`已导入备份：${data.places.length} 处地点、${data.trips.length} 次行程`, () => { restore({ ...clone(SAMPLE), ...data, version: 3 }); curTrip = null; });
      } catch { toast('这个文件不是远方清单的备份，没有导入。'); }
      t.value = '';
      return;
    }
    if (t.closest('#pal-form')) syncDetailStamp();
  });

  /* ---------- 提交 ---------- */
  document.addEventListener('submit', e => {
    e.preventDefault();
    const fm = e.target;
    if (fm.id === 'prov-form') {
      const name = $('#pv-name').value.trim(), base = $('#pv-base').value.trim(), key = $('#pv-key').value.trim(), model = $('#pv-model').value.trim();
      if (provEditing) {
        const p = D.providers.find(x => x.id === provEditing);
        if (!name || !base || !model) { toast('名称、接口地址和模型都要填。'); return; }
        act(`已保存「${name}」`, () => { Object.assign(p, { name, base, model }); if (key) { p.key = key; delete p.demo; } });
        provEditing = null; renderProviders();
        return;
      }
      if (!name || !base || !key || !model) { toast('名称、接口地址、模型和密钥都要填。'); return; }
      act(`已保存「${name}」并设为启用`, () => { D.providers.forEach(p => { p.active = false; }); D.providers.push({ id: uid(), name, base, model, key, active: true, used: '刚刚添加' }); });
      return;
    }
    if (fm.id === 'home-form') {
      const city = $('#home-city').value.trim();
      if (!city) return;
      const c = CITY[city];
      act(`家改成了${city}`, () => { D.home = { city, lat: c ? c[0] : D.home.lat, lng: c ? c[1] : D.home.lng }; });
      return;
    }
    if (fm.id === 'pal-form') {
      const draft = pal.items.find(x => x.kind === 'create');
      if (!$('#pd-name').value.trim()) { $('#pd-name').focus(); return; }
      savePlace(readPalDetail(draft.x));
      return;
    }
    if (fm.id === 'pe-form') {
      const p = P[dr.id];
      const name = $('#pe-name').value.trim();
      if (!name) { $('#pe-name').focus(); return; }
      const m = $('#pe-coord').value.match(/(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)/);
      if ($('#pe-coord').value.trim() && !m) { toast('坐标的格式是「纬度, 经度」，比如 35.0113, 135.7934'); $('#pe-coord').focus(); return; }
      const type = $('input[name=pe-type]:checked').value, local = $('#pe-local').checked, city = $('#pe-city').value.trim();
      act(`已保存「${name}」`, () => {
        const changed = p.type !== type;
        Object.assign(p, { name, city, country: $('#pe-country').value.trim(), area: $('#pe-area').value.trim() || (local ? D.home.city : city), type, local });
        if (m) { p.lat = +m[1]; p.lng = +m[2]; p.approx = false; } else if (CITY[city] && !(p.lat || p.lng)) { [p.lat, p.lng] = CITY[city]; p.approx = true; }
        if (changed) { [p.art, p.c] = TYPE_ART[type]; }
      });
      dr.editing = false; renderDrawer();
      return;
    }
    if (fm.id === 'trip-form') { saveTripForm(); return; }
    if (fm.id === 'ck-form') { saveCheckin(false); return; }
    if (fm.id === 'tag-form') {
      const v = $('#tag-in').value.trim();
      if (!v) return;
      P[dr.id].tags.push(...v.split(/\s+/));
      save(); refresh();
      $('#tag-in')?.focus();
      return;
    }
    if (fm.dataset.add) {
      const t = T[curTrip], k = fm.dataset.add, m = t.materials;
      if (k === 'prep') {
        const v = $('#add-prep').value.trim();
        if (!v) return;
        const x = parseDue(v);
        act(`加上了：${x.text}${x.due ? `（${dueLabel(x.due)}前）` : ''}`, () => { m.prep.push({ text: x.text, done: false, due: x.due }); });
        setTimeout(() => $('#add-prep')?.focus(), 30);
      }
      if (k === 'guide') {
        const raw = fm.url.value.trim(), sh = parseShare(raw);
        const title = fm.title.value.trim() || sh.title || sh.rest || (sh.url ? sh.url.replace(/^https?:\/\//, '').slice(0, 30) : '');
        if (!title) { fm.url.focus(); return; }
        act(`收藏了：${title}`, () => { m.guide.unshift({ src: sh.url ? srcOf(sh.url) : '笔记', title, url: sh.url, by: '', saved: md(todayISO()) }); });
      }
      if (k === 'booking') {
        const title = fm.title.value.trim();
        if (!title) { fm.title.focus(); return; }
        const kind = fm.querySelector('input[name=bk-kind]:checked').value;
        act(`加上了${kind}：${title}`, () => { m.booking.push({ kind, code: '', title, lines: fm.line.value.trim() ? [fm.line.value.trim()] : [], ref: fm.ref.value.trim(), price: parseFloat(fm.price.value) || 0 }); });
      }
      if (k === 'note') {
        const v = $('#an-text').value.trim();
        if (!v) return;
        act('记下了', () => { m.note.push(v); });
      }
      return;
    }
    if (fm.classList.contains('quick-add')) {
      const input = fm.querySelector('input'), v = input.value.trim();
      if (!v) return;
      const di = +fm.dataset.di, t = T[fm.dataset.tripId || curTrip];
      const mm = /^\s*(\d{1,2})[:：](\d{2})\s*(.*)$/.exec(v);
      const time = mm ? `${pad(+mm[1])}:${mm[2]}` : '待定';
      const title = (mm ? mm[3] : v).trim() || v;
      const p = findPlace(title);
      const usable = p && p.state !== 'been' ? p : null;
      const g = guess(title);
      const kind = /车|地铁|巴士|航班|机场|→|电铁/.test(title) ? '交通' : g.type === '城市' ? '景点' : g.type;
      act(`已加到 Day ${t.days[di].n}：${time} ${usable ? usable.name + '（来自想去）' : title}`, () => {
        if (usable) { removeFromDays(usable); usable.state = 'plan'; usable.trip = t.id; usable.day = t.days[di].n; }
        const it = { t: time, kind: usable ? usable.type : kind, title: usable ? usable.name : title, note: usable ? (usable.note || '') : '', place: usable ? usable.id : undefined };
        insertItem(t.days[di], it);
        freshItems.add(it);
        openDays(t.id).add(di);
      });
      setTimeout(() => $(fm.classList.contains('today-add') ? '#qa-today' : `#qa-${t.id}-${di}`)?.focus(), 30);
      return;
    }
    if (fm.id === 'spend-form') {
      const amt = parseFloat($('#sp-amt').value);
      if (!amt) { $('#sp-amt').focus(); toast('先填金额。'); return; }
      const c = todayCtx(), cat = $('input[name=sp-cat]:checked').value, what = $('#sp-what').value.trim();
      act(`记了一笔：${amt.toLocaleString('en-US')} ${c.t.cur || '¥'}`, () => { (c.t.expenses ||= []).push({ date: c.date, t: c.sim ? c.now : nowHM(), cat, what: what || cat, amount: amt }); });
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
  window.addEventListener('storage', e => { if (e.key === STORE_KEY) location.reload(); });

  const CN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const cnDay = n => (n <= 10 ? CN[n] : n < 20 ? '十' + CN[n - 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : ''));
  $('#date-v').textContent = `${CN[TODAY.getMonth() + 1]}月${cnDay(TODAY.getDate())}日　${WD[TODAY.getDay()]}`;

  refresh();
  route();
})();
