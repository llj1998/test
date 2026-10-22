// usage: node snap.js outdir t1 t2 ...  -> renders frames at given seconds to PNG
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [out, ...ts] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../src/index.html'));
  await p.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  for (const t of ts) {
    const t0 = Date.now();
    const url = await p.evaluate(t => { render(+t); return document.getElementById('c').toDataURL('image/jpeg', .9); }, t);
    fs.writeFileSync(path.join(out, `t${String(t).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    console.log(t, Date.now() - t0, 'ms');
  }
  await b.close();
})();
