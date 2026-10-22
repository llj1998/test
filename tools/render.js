// Renders all frames with N parallel headless pages and pipes them (in order) into ffmpeg.
// usage: node render.js out.mp4 [workers] ; also writes cues.json next to the video
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const FPS = 24, DUR = 88, N = FPS * DUR;
(async () => {
  const out = process.argv[2], workers = +(process.argv[3] || 4);
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const pages = [];
  for (let i = 0; i < workers; i++) {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto('file://' + path.resolve(__dirname, '../src/index.html'));
    await p.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
    pages.push(p);
  }
  const cues = await pages[0].evaluate(() => window.CUES);
  fs.writeFileSync(path.join(path.dirname(out), 'cues.json'), JSON.stringify(cues, null, 1));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Map(); let next = 0, issued = 0; const t0 = Date.now();
  const flush = async () => {
    while (done.has(next)) { const buf = done.get(next); done.delete(next); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); next++;
      if (next % 120 === 0) console.log(`frame ${next}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  };
  let flushing = Promise.resolve();
  await Promise.all(pages.map(async p => {
    while (true) {
      const i = issued++; if (i >= N) break;
      // backpressure: don't run too far ahead of the writer
      while (i - next > 200) await new Promise(r => setTimeout(r, 20));
      const url = await p.evaluate(i => { renderFrame(i); return document.getElementById('c').toDataURL('image/jpeg', .96); }, i);
      done.set(i, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
      flushing = flushing.then(flush);
    }
  }));
  await flushing; ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
  console.log('done', ((Date.now() - t0) / 1000).toFixed(0), 's');
})();
