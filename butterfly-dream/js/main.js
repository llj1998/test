'use strict';
/* 栩栩 · 主控：分镜表、画幅、播放循环、界面 */
(() => {
const { clamp, lerp, ease, PS } = XU;
const TOTAL = 180;
const C2 = '#77766f', C2b = '#5f5e59', MIX = 'linear-gradient(90deg,#77766f,#19c3b0)';
const SHOTS = [
  ['S01', 0, 8, '序', '黑场', '#2a2a2a', 0, 's01', '一滴雨', '全黑。一滴光落下，溅开一圈圈涟漪；无数光尘聚拢成片名「栩栩」，又被风吹散。', '固定', '雨声由无到有；水滴「嗒」（与 S22 同一个声音）'],
  ['S02', 8, 13, '第一幕「雨」', '2D · 黑白', C2, 1, 's02', '茧', '清晨卧室，窗外雨中楼群。被子裹成茧形，褶线像蛹的环节。05:59 → 06:00，闹钟响，整幅画面跟着震颤，一只手从「茧」里伸出去。', '正面固定中景，对称构图', '闹铃 = 主题旋律的方波电子版', '被子的茧 ↔ S09 蛹'],
  ['S03', 13, 17, '', '', '#6f6e68', 1, 's03', '领带', '镜中的周，脸上只有两道疲惫的短线。领带一点点推上喉咙，最后一下收紧，像被勒住。', '镜中正面特写，缓推', '领带摩擦声，一声干涩的吞咽'],
  ['S04', 17, 24, '', '', C2b, 1, 's04', '伞阵', '俯拍斑马线：黑伞方阵齐步「走格子」，雨是斜向的光丝。只有一把伞慢了半拍，那是周。', '垂直俯拍，极慢推近那把伞', '脚步声被量化成整齐的节拍', '黑伞方阵 ↔ S11 俯拍花海'],
  ['S05', 24, 29, '', '', C2, 1, 's05', '挤出', '地铁门开，长着同一张脸的人塞满车厢；周像挤牙膏一样被挤出车门：压扁、弹出、站定。', '站台正面平视，对称', '车门气阀声，「啵」', '挤出车门 ↔ S10 挤出蛹壳'],
  ['S06', 29, 36, '', '', '#6f6e68', 1, 's06', '格子', '俯拍无尽的格子间，推进其中一格，切到周的工位：墙上钉着一只灰色的碧凤蝶标本；工牌「No.0417 周」和标本标签是同一种格式。', '俯拍急推，硬切正面缓推', '空调低鸣，秒针', '工牌 ↔ 标本标签：人和蝶都被编号、被钉住'],
  ['S07', 36, 44, '', '', C2b, 1, 's07', '重复', '钟、键盘、表格、咖啡、盖章、打印机……粒子在图标之间越飞越快地重组。日光灯一闪：有 2 帧是碧色的鳞片（第 42 秒）。', '正面、居中、扁平的图标式构图', '办公声被剪成越来越急的机械节拍'],
  ['S08', 44, 50, '', '', C2, 1, 's08', '下午三点', '钟指向三点。周盯着标本，头点了一下、又一下，最后砸在键盘上，表格被「jjjj」填满。', '固定正面中景', '节拍在头落下的瞬间骤停，只剩雨声', '趴下睡去 ↔ S17 合翅死去'],
  ['S09', 50, 60, '入梦', '2D → 3D', MIX, 0, 's09', '鳞片', '镜头扎进表格。格子变大、弯曲、层叠，灰色的光点染上翠绿与宝蓝，原来是蝶翅鳞片的微距。拉远：一枚半透明的蛹挂在黎明里。', '一镜到底；前 2.5 秒 12 fps，之后渐变为流畅', '键盘声越敲越慢、混响越来越长，变成古琴泛音', '表格的格子 ↔ 翅膀的鳞片'],
  ['S10', 60, 72, '第二幕「晴」', '3D · 彩色', '#f0b49a', 0, 's10', '破蛹', '黎明。蛹壳裂开一道光缝，蝴蝶挤出、倒挂、展翅。翅膀展开的同时，左右黑边向两侧退开：画幅 4:3 → 2.39:1。一颗露珠坠落，折射出彩虹。', '微距，浅景深，镜头轻微「呼吸」', '蛹裂开像一声吸气；古琴泛音铺开', '挤出蛹壳 ↔ S05 挤出车门'],
  ['S11', 72, 82, '', '', '#4fae5a', 0, 's11', '初飞', '跌跌撞撞地起飞，被风托起，穿过一望无际的光点花海（近处花朵化作焦外光斑）。切俯拍：花朵排得和 S04 的伞阵一模一样，但每一朵都按自己的节奏摇摆。', '跟拍飞行，再切垂直俯拍（与 S04 同机位）', '主题旋律第一次由古琴完整奏出', '花海 ↔ S04 伞阵'],
  ['S12', 82, 91, '', '', '#2f8ee0', 0, 's12', '相遇', '另一只蝴蝶出现。两只蝴蝶绕着彼此螺旋上升，飞进正午的太阳，花瓣与光尘漫天。', '环绕上升，慢动作，镜头光晕', '主题升高八度，笛、箫加入'],
  ['S13', 91, 98, '', '', '#e8a23c', 0, 's13', '午憩', '停在花上合翅，露出灰褐色的翅背面。合翅的一瞬被闪切进 2D：键盘、钟、伞、周的脸，一次比一次长，画幅被夹回 4:3。惊醒，展翅，颜色回来。', '微距；闪切为硬切', '闪切时机械节拍与雨声硬插进来；惊醒时一声振翅', '这是全片第一次问：是周梦见了蝶，还是蝶梦见了周？'],
  ['S14', 98, 108, '', '', '#5fb8e6', 0, 's14', '窗', '花海尽头立着一扇没有墙的窗。玻璃映着天光，里面却是一间灰色的、正在下雨的办公室。蝴蝶被玻璃里的「天空」吸引，然后「咚」。', '跟在蝴蝶身后推进', '风声渐强；撞击后静音半秒'],
  ['S15', 108, 116, '第三幕「交织」', '2D ｜ 3D', 'linear-gradient(90deg,#19c3b0 50%,#77766f 50%)', 0, 's15', '隔着玻璃', '彩色的蝴蝶贴在玻璃上，背后是黑白的、熟睡的周；它滑落，留下一枚蝶形鳞粉印。转到侧面：玻璃是一道光线，左彩右灰，一蝶一人，镜像相对。', '正面，再绕玻璃转 90°', '左声道鸟鸣风声，右声道雨声'],
  ['S16', 116, 128, '', '3D · 彩色', '#e2603a', 0, 's16', '黄昏', '夕阳。在叶片上产下几颗珍珠般的卵。翅缘破损、褪色，最后一次飞向落日。', '低角度逆光，长焦', '音乐只剩一根古琴弦'],
  ['S17', 128, 136, '', '', '#7a2f4a', 0, 's17', '合翅', '翅膀像呼吸一样一下下合拢；黑边随之合拢：2.39:1 → 4:3。蝴蝶化作余烬般的光尘，随最后的光一起升起、熄灭。', '微距正面，固定', '最后一个音的余韵，然后完全安静', '合翅死去 ↔ S08 趴下睡去'],
  ['S18', 136, 140, '', '黑场', '#2a2a2a', 0, 's18', '铃', '全黑。黑暗中，一块手机屏幕的光在闪。', '—', '手机铃声：正是主题旋律的电子版'],
  ['S19', 140, 148, '尾声「觉」', '2D · 黑白 + 一抹碧色', 'linear-gradient(90deg,#77766f 80%,#19c3b0)', 0, 's19', '鳞粉印', '深夜，周从键盘上醒来。窗玻璃外侧有一枚彩色的蝶形鳞粉印，这是 2D 世界里唯一的颜色。粉末被雨水一粒粒冲下来。他从内侧按住它，碰不到。', '中景，再切玻璃特写，手指入画', '雨声；指尖贴玻璃的轻响'],
  ['S20', 148, 155, '', '2D · 黑白', C2b, 1, 's20', '不打伞', '衣架上还挂着他的伞。街上零星几把黑伞经过，只有他淋着雨，走进路灯的光锥里停住，仰脸。', '衣架特写，再切街道平移', '雨落在脸上、肩上，不再是背景噪音'],
  ['S21', 155, 162, '', '2D ＝ 3D', 'linear-gradient(180deg,#77766f 50%,#19c3b0 50%)', 0, 's21', '水洼', '水洼里不是他的倒影，而是晴空与悬停的蝴蝶。以水线为界，上灰下彩，画幅撑到 16:9。整个画面绕水线翻转 180°：哪一边才是倒影？', '俯拍，再切水线对称构图，画面整体旋转 180°', '古琴与电子音第一次合奏主题'],
  ['S22', 162, 165, '', '', 'linear-gradient(90deg,#19c3b0,#fff,#000)', 0, 's22', '涟漪', '一滴雨落进水洼正中，碧色与白色的涟漪扩散。画面变白，再变黑。', '固定', '和 S01 同一个水滴声，余响很长'],
  ['E1', 165, 172, '片尾', '字卡', '#2a2a2a', 0, 'e1', '问', '「不知周之梦为胡蝶与，胡蝶之梦为周与？」光尘逐字聚拢，又被吹散。', '—', '一次振翅'],
  ['E2', 172, 178, '', '', '#222', 0, 'e2', '字幕', '片尾字幕。', '—', '雨声与风声交替'],
  ['E3', 178, 180, '', '2D · 黑白', '#6f6e68', 1, 'e3', '彩蛋', '第二天早上。标本框里只剩一根针和那张标签。', '标本框特写', '一声秒针']
].map(a => ({ id: a[0], t0: a[1], t1: a[2], act: a[3], world: a[4], col: a[5], q: a[6], fn: a[7], title: a[8], pic: a[9], cam: a[10], snd: a[11], rhyme: a[12] }));
{ let act = '', world = ''; for (const s of SHOTS) { act = s.act || act; world = s.world || world; s.act = act; s.world = world; } }
const shotAt = t => { for (const s of SHOTS) if (t < s.t1) return s; return SHOTS[SHOTS.length - 1]; };

/* 画幅：4:3（2D）↔ 2.39:1（3D）↔ 16:9（交汇） */
const R43 = { w: 960, h: 720, n: '4:3' }, RW = { w: 1280, h: 536, n: '2.39:1' }, R169 = { w: 1280, h: 720, n: '16:9' };
const lerpR = (a, b, k) => ({ w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), n: k < .5 ? a.n : b.n });
function maskAt(t) {
  if (t < 64) return R43; if (t < 71) return lerpR(R43, RW, ease((t - 64) / 7));
  if (t < 129) return (t >= 91 && t < 98 && XU.inFlash(t - 91) >= 0) ? R43 : RW;
  if (t < 135) return lerpR(RW, R43, ease((t - 129) / 6)); if (t < 155) return R43;
  if (t < 158) return lerpR(R43, R169, ease((t - 155) / 3)); if (t < 165) return R169; return R43;
}

/* ---------- 每帧 ---------- */
let T = 0, playing = false, last = null, dirty = true, snap = true, lastTick = -1, curShot = null, ready = false;
function step(dt) {
  const sh = shotAt(T); let lt = T - sh.t0, t = T;
  const tick = Math.floor(T * 12); XU.tick = tick;
  if (sh.q) { lt = Math.floor(lt * 12) / 12; t = tick / 12; }
  XU.resetPost(); XU.cam2D(); PS.begin(); XU.LS.n = 0;
  try { XU.SC[sh.fn](lt, t); } catch (e) { console.error(sh.id, e); }
  PS.end();
  const m = maskAt(T); XU.post.mask = [m.w / 1280, m.h / 720];
  if (snap) { PS.update(0, true, T); snap = false; }
  else if (sh.q) { if (tick !== lastTick) PS.update(clamp(tick - lastTick, 1, 3) / 12, false, T); }
  else PS.update(dt, false, T);
  lastTick = tick;
  XU.render(T);
}

/* ---------- 界面 ---------- */
const $ = id => document.getElementById(id);
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
const fmt0 = t => { const m = Math.floor(t / 60), s = Math.round(t - m * 60); return `${m}:${s < 10 ? '0' : ''}${s}`; };
const SHORT = { '第一幕「雨」': '雨', '入梦': '梦', '第二幕「晴」': '晴', '第三幕「交织」': '交织', '尾声「觉」': '觉', '片尾': '尾' };
for (const s of SHOTS) { const d = document.createElement('div'); d.className = 'seg'; d.style.flex = String(s.t1 - s.t0); d.style.background = s.col; d.title = `${s.id} ${s.title}（${fmt0(s.t0)}–${fmt0(s.t1)}）`; s.el = d; $('segs').appendChild(d); }
{ let prev = ''; for (const s of SHOTS) if (s.act !== prev) { prev = s.act; const sp = document.createElement('span'); sp.innerHTML = `<span class="full">${s.act}</span><span class="short">${SHORT[s.act] || s.act}</span>`; sp.style.left = (s.t0 / TOTAL * 100) + '%'; if (['序', '入梦', '片尾'].includes(s.act)) sp.className = 'minor'; $('acts').appendChild(sp); } }
function updateUI() {
  $('tc').textContent = `${fmt(T)} / 3:00`; $('playhead').style.left = (T / TOTAL * 100) + '%';
  const s = shotAt(T);
  if (s !== curShot) {
    if (curShot) curShot.el.classList.remove('on'); s.el.classList.add('on'); curShot = s;
    $('iId').textContent = s.id; $('iTitle').textContent = s.title; $('iTime').textContent = `${fmt0(s.t0)} – ${fmt0(s.t1)}　（${s.t1 - s.t0} 秒）`;
    $('iWorld').textContent = s.world; $('iAct').textContent = s.act; $('iPic').textContent = s.pic; $('iCam').textContent = s.cam || '—'; $('iSnd').textContent = s.snd || '—';
    $('iRhyme').textContent = s.rhyme || ''; $('iRhymeT').style.visibility = s.rhyme ? 'visible' : 'hidden';
  }
  $('iRatio').textContent = '画幅 ' + maskAt(T).n;
}
function setPlaying(p) {
  if (!ready) return;
  playing = p; $('playBtn').textContent = p ? '❚❚' : '▶'; $('bigPlay').style.display = p ? 'none' : '';
  $('bigLabel').textContent = T > 0 && T < TOTAL - .1 ? '▶ 继续' : (T >= TOTAL - .1 ? '↺ 重播' : '▶ 播放');
  if (p) { XU.AU.init(); XU.AU.reset(T); }
  XU.AU.amb(T, playing);
}
function toggle() { if (!playing && T >= TOTAL - .1) seek(0); setPlaying(!playing); }
function seek(t) { T = clamp(t, 0, TOTAL - .001); XU.AU.reset(T); snap = true; dirty = true; updateUI(); }
function frame(ts) {
  const dt = last == null ? 0 : Math.min(.05, (ts - last) / 1000); last = ts;
  if (ready) {
    if (playing) { T += dt; if (T >= TOTAL) { T = TOTAL - .001; setPlaying(false); } XU.AU.run(T); updateUI(); step(dt); }
    else if (dirty) { step(0); dirty = false; }
    XU.AU.amb(T, playing);
  }
  requestAnimationFrame(frame);
}

if (XU.noGL) { $('bigLabel').textContent = '此浏览器不支持 WebGL2'; $('bigSub').textContent = '请用新版 Chrome / Edge / Firefox / Safari 打开'; return; }
window.addEventListener('resize', () => { XU.resize(); dirty = true; });
$('bigPlay').addEventListener('click', toggle); $('playBtn').addEventListener('click', toggle); $('stage').addEventListener('click', toggle);
let muted = false; $('muteBtn').addEventListener('click', () => { muted = !muted; $('muteBtn').textContent = muted ? '♪ 关' : '♪ 开'; XU.AU.mute(muted); });
const tl = $('timeline'); let drag = false;
const tlSeek = e => { const r = tl.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * TOTAL); };
tl.addEventListener('pointerdown', e => { drag = true; tl.setPointerCapture(e.pointerId); tlSeek(e); });
tl.addEventListener('pointermove', e => { if (drag) tlSeek(e); });
tl.addEventListener('pointerup', () => { drag = false; });
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); toggle(); } else if (e.code === 'ArrowRight') seek(T + 5); else if (e.code === 'ArrowLeft') seek(T - 5); else if (e.code === 'Home') seek(0); });
window.__seek = t => { seek(t); step(0); dirty = false; };
window.__ready = () => ready;
updateUI();
requestAnimationFrame(frame);

/* 等字体（最多 2.5 秒），再预先采样全部点云，避免播放中卡顿 */
(async () => {
  $('bigLabel').textContent = '加载中…';
  try { await Promise.race([Promise.all([document.fonts.load('700 150px "Noto Serif SC"', '栩蝶'), document.fonts.load('400 44px "Noto Serif SC"', '不知周之梦为胡蝶与')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* 用系统字体 */ }
  const names = ['title', 'bed', 'mir', 'd0559', 'd0600', 'face', 'umb', 'stripes', 'subway', 'person', 'personDim', 'desk', 'office', 'head', 'clockF', 'keys', 'sheet', 'coffee', 'stamp', 'printer', 'profile', 'wing', 'text1', 'credits', 'frameEmpty'];
  for (const n of names) { XU.SH.get(n); await new Promise(r => setTimeout(r, 0)); }
  ready = true; $('bigLabel').textContent = '▶ 播放'; snap = true; dirty = true;
})();
})();
