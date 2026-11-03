#!/usr/bin/env node
/* 远方清单 · 冒烟测试
   用真实浏览器把主要流程走一遍，每次改完代码跑一下：
     npm install            （第一次，装 playwright）
     npx playwright install chromium   （第一次，装浏览器）
     npm test
   页面里的时间固定在 2026-11-02 10:30，所以示例数据的倒计时、截止日期每次都一样。
   全部通过退出码为 0；有失败会列出来并返回 1。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const NOW = new Date('2026-11-02T10:30:00');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, p === '/' ? 'index.html' : p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
  const browser = await chromium.launch({ proxy });
  const results = [];
  const errors = [];
  const ok = (cond, msg, extra = '') => results.push({ pass: !!cond, msg, extra });

  async function newPage(width = 1440, height = 900) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(NOW);
    page.on('pageerror', e => errors.push(`页面报错：${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`控制台：${m.text()}`); });
    await page.goto(base + '#home', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    return page;
  }
  const store = page => page.evaluate(() => JSON.parse(localStorage.getItem('yuanfang/v3') || 'null'));
  const place = async (page, id) => (await store(page)).places.find(p => p.id === id);
  const trip = async (page, id) => (await store(page)).trips.find(t => t.id === id);
  const go = async (page, h) => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(150); };
  const undo = async page => { await page.click('#toast [data-ta=u]'); await page.waitForTimeout(200); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name, e.message.split('\n')[0]); } };

  const page = await newPage();

  await step('示例数据载入，首页有「下一步」', async () => {
    ok(await page.$$eval('#view-home .step', a => a.length) >= 5, '首页列出至少 5 件下一步');
    ok((await page.textContent('#view-home .hero h1')).includes('天后'), '首页主标题是倒计时');
  });

  await step('投递口记下一个地点，刷新后还在', async () => {
    await page.fill('#inbox', '武康路 新开的面包店');
    ok((await page.textContent('#inbox-hint')).includes('咖啡'), '投递口提示猜出类型「咖啡」');
    await page.press('#inbox', 'Enter');
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'load' });
    const p = (await store(page)).places[0];
    ok(p.name === '新开的面包店' && p.local && p.city === '武康路', '刷新后第一条是「新开的面包店」，本地、武康路', JSON.stringify([p.name, p.local, p.city]));
  });

  await step('搜索框能认出已经记过的地点', async () => {
    await page.keyboard.press('/');
    await page.keyboard.type('稻荷');
    await page.waitForTimeout(150);
    const rows = await page.$$eval('#palette .pal-row b', a => a.map(x => x.textContent));
    ok(rows[0] === '伏见稻荷大社' && rows.some(r => r.startsWith('仍然记下')), '先列出伏见稻荷大社，再给「仍然记下」', rows.join(' | '));
    await page.keyboard.press('Escape');
  });

  await step('地点抽屉：排进行程的某一天，可以撤销', async () => {
    await go(page, 'places');
    await page.click('#album .slot[data-id=nanzenji] .linklike');
    await page.click('#drawer [data-pick-day="3"]');
    await page.waitForTimeout(200);
    const p = await place(page, 'nanzenji');
    ok(p.state === 'plan' && p.trip === 'kyoto' && p.day === 3, '南禅寺排进红叶七日 Day 3');
    await undo(page);
    ok((await place(page, 'nanzenji')).state === 'want', '撤销后回到想去');
    await page.keyboard.press('Escape');
  });

  await step('一键整理：示例结果写入后可以撤销', async () => {
    await go(page, 'sort');
    ok(await page.$$eval('#trays .op', a => a.length) === 7, '示例结果有 7 条带标记的条目');
    await page.click('#commit-btn');
    await page.waitForTimeout(200);
    const k = await trip(page, 'kyoto');
    ok(k.budget === 16000, '预算更新成 16000');
    ok(k.days[2].items.some(i => i.title === '南禅寺 · 水路阁'), 'Day 3 多了南禅寺');
    ok(k.days[1].items.some(i => i.title === '先斗町 · 鸟贵族'), 'Day 2 的晚饭被更新成鸟贵族');
    await undo(page);
    ok((await trip(page, 'kyoto')).budget === 14000, '撤销后预算回到 14000');
  });

  await step('一键整理：示例服务商不能整理别的内容，会说明原因', async () => {
    await page.fill('#sort-text', '五一想去成都，宽窄巷子、大熊猫基地');
    await page.click('#run-sort');
    await page.waitForSelector('.sort-err', { timeout: 5000 });
    ok((await page.textContent('.sort-err p')).includes('示例服务商'), '出错提示说明是示例服务商');
  });

  await step('按地方：攒够两处的地方一键建行程', async () => {
    await go(page, 'places');
    await page.click('[data-pview=area]');
    await page.click('#view-places [data-newtrip-area="里斯本"]');
    await page.fill('#tf-sub', '葡萄牙春天');
    await page.fill('#tf-start', '2027-04-10');
    await page.fill('#tf-end', '2027-04-16');
    await page.click('#trip-form button[type=submit]');
    await page.waitForTimeout(200);
    const s = await store(page);
    const t = s.trips[s.trips.length - 1];
    ok(t.subtitle === '葡萄牙春天' && t.days.length === 7, '新行程有 7 天');
    ok(s.places.filter(p => p.trip === t.id).length === 2, '里斯本的 2 处地点放进了新行程');
    await page.click('[data-pview=album]');
  });

  await step('里程碑：给冰岛定日期、加机票', async () => {
    await go(page, 'trip');
    await page.click('.trip-tab[data-trip=iceland]');
    await page.click('#view-trip .pass.lg [data-ms=date]');
    await page.fill('#tf-start', '2027-02-08');
    await page.fill('#tf-end', '2027-02-17');
    await page.click('#trip-form button[type=submit]');
    await page.waitForTimeout(200);
    ok((await trip(page, 'iceland')).days.length === 10, '定了日期自动生成 10 天');
    ok((await page.textContent('#view-trip .ladder li.next b')) === '订交通', '下一个里程碑变成「订交通」');
    await page.click('#view-trip .pass.lg [data-ms=go]');
    await page.waitForTimeout(150);
    await page.fill('#ab-title', 'AY 上海 → 赫尔辛基 → 雷克雅未克');
    await page.fill('#ab-price', '7800');
    await page.click('.mat-form[data-add=booking] button');
    await page.waitForTimeout(150);
    const done = await page.$$eval('#view-trip .ladder li.done b', a => a.map(x => x.textContent));
    ok(done.includes('订交通'), '加了机票以后「订交通」打勾', done.join(','));
  });

  await step('准备事项：写在开头的日期会变成截止时间', async () => {
    await page.click('[data-tab=prep]');
    await page.fill('#add-prep', '1.20 前办好签证');
    await page.press('#add-prep', 'Enter');
    await page.waitForTimeout(150);
    const x = (await trip(page, 'iceland')).materials.prep.slice(-1)[0];
    ok(x.text === '办好签证' && x.due === '2027-01-20', '截止时间是 2027-01-20', JSON.stringify(x));
  });

  await step('今天（预览）：盖章不改真实数据', async () => {
    await go(page, 'today');
    await page.click('.now-card [data-ckitem]');
    await page.waitForTimeout(400);
    await page.click('#ck-form button[type=submit]');
    await page.waitForTimeout(200);
    ok((await page.textContent('#toast span')).includes('预览'), '提示这是预览');
    ok((await place(page, 'sakamichi')).state === 'plan', '坂道咖啡仍然是计划中');
  });

  await step('回忆：改一段回忆', async () => {
    await go(page, 'memories');
    await page.hover('#view-memories .postcard');
    await page.click('#view-memories .postcard .pc-edit');
    await page.fill('#ck-note', '改过的一句话');
    await page.click('#ck-form button[type=submit]');
    await page.waitForTimeout(200);
    ok((await store(page)).memories.some(m => m.note === '改过的一句话'), '回忆被改了');
  });

  await step('清空以后每一页都能打开，再载入示例', async () => {
    await go(page, 'home');
    await page.click('#view-home [data-sample=clear]');
    await page.waitForTimeout(200);
    await page.click('[data-sample=clear-yes]');
    await page.waitForTimeout(300);
    const s = await store(page);
    ok(s.places.length === 0 && s.trips.length === 0 && s.memories.length === 0, '清空后没有地点、行程、回忆');
    for (const v of ['home', 'places', 'trip', 'today', 'map', 'memories', 'sort', 'providers']) await go(page, v);
    await page.click('[data-sample=restore]');
    await page.waitForTimeout(300);
    ok((await store(page)).places.length >= 24, '载入示例后有 24 处地点');
  });

  await step('手机宽度：每一页都没有横向滚动', async () => {
    const m = await newPage(400, 820);
    for (const v of ['home', 'places', 'trip', 'today', 'map', 'memories', 'sort', 'providers']) {
      await go(m, v);
      const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(over <= 0, `手机宽度 #${v} 没有横向滚动`, over > 0 ? `多出 ${over}px` : '');
    }
  });

  ok(errors.length === 0, '整个过程没有脚本报错', errors.slice(0, 5).join('\n'));

  await browser.close();
  srv.close();
  const failed = results.filter(r => !r.pass);
  results.forEach(r => console.log(`${r.pass ? '✓' : '✗'} ${r.msg}${!r.pass && r.extra ? `\n    ${r.extra}` : ''}`));
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  process.exit(failed.length ? 1 : 0);
})();
