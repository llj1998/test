// Renders the character / visual-system sheet using the animation's own drawing functions.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../src/index.html'));
  await p.waitForFunction(() => window.READY === true);
  const url = await p.evaluate(() => {
    BOIL = 3; FR = 9;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(BG, 0, 0);
    ctx.drawImage(PAPERSH, PAPER.cx - PAPER.w / 2 - PPAD + 8, PAPER.cy - PAPER.h / 2 - PPAD + 12);
    ctx.drawImage(PAPERC, PAPER.cx - PAPER.w / 2 - PPAD, PAPER.cy - PAPER.h / 2 - PPAD);
    ctx.font = '28px JB'; ctx.fillStyle = COL.teal; ctx.fillText('pixi@grid:~$ ', 84, 124); ctx.fillStyle = COL.term; ctx.fillText('cat character_sheet', 84 + ctx.measureText('pixi@grid:~$ ').width, 124);
    txt('Pixi · 角色设定', 300, 215, { font: 'ZK', size: 46 });
    txt('8×8 像素 · 64px · 珊瑚红水粉 · 炭黑描边 · 全片不缩放、不挤压', 760, 218, { font: 'ZK', size: 26, col: '#5a534b', align: 'left' });
    const poses = [
      ['中性', { lx: 0, ly: 0 }], ['看左', { lx: -1 }], ['看右', { lx: 1 }], ['看上', { ly: -1 }], ['看下', { ly: 1 }],
      ['眨眼', { blink: .85 }], ['惊讶 / 困惑', { mouth: 1, ly: -1 }], ['跳跃中', { tilt: .16, walk: 1.6 }], ['坡上滑行', { tilt: -.6, mouth: 1 }], ['光标形态', { feet: 0, eyes: 0 }]];
    poses.forEach(([name, o], i) => {
      const col = i % 5, row = Math.floor(i / 5); const x = 260 + col * 340, y = 420 + row * 260;
      stroke([[x - 90, y + 2], [x + 90, y + 2]], COL.char, 4, { id: 900 + i });
      drawPixi(Object.assign({ x, y: y + (o.feet === 0 ? 0 : 0), feet: 1, lx: 0, ly: 0, blink: 0, tilt: 0, walk: 0, mouth: 0, alpha: 1, eyes: 1 }, o));
      txt(name, x, y + 48, { font: 'ZK', size: 30 });
    });
    // palette
    const pal = [['珊瑚红 · x / Pixi', COL.coral], ['青绿 · y', COL.teal], ['芥末黄 · 发现', COL.mustard], ['奶油白 · 纸', COL.creamL], ['炭黑 · 线与字', COL.char]];
    pal.forEach(([n, c], i) => { const x = 250 + i * 340, y = 880; ctx.save(); ctx.translate(x, y); cutout('sw' + i, rectBase(150, 70), c, { rough: 2 }); ctx.restore(); txt(n, x, y + 66, { font: 'ZK', size: 26 }); });
    star(1640, 215, { scale: 1 });
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64'));
  await b.close();
})();
