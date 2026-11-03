# 远方清单 · 项目说明（给 Claude Code 和接手的人）

一个人自己用的旅行心愿单 + 行程规划网站。定位：**把零散的「想去」逐步变成真的发生过的旅行**。

核心心智模型是一条状态链，所有设计都围绕它：

```
想去（灵感）──加入行程──▶ 计划中（排进某次行程的某天）──到了，盖章──▶ 已去过 ──回填──▶ 回忆
   ○                         ◆                                    ◉              ■
```

产品的重点不是「存」，而是「推」：首页的「下一步」告诉用户现在做哪件事能把某个地方往前推一格。

面向用户的功能说明在 `docs/使用指南.md`，安装和使用方式在 `README.md`。

---

## 现状

- 纯前端，没有构建步骤，没有框架。双击 `index.html` 就能用。
- 数据存在浏览器 localStorage（键名 `yuanfang/v3`），可以导出和导入 JSON 备份。
- 「一键整理」在浏览器里直接请求用户配置的 OpenAI 兼容接口（`{base}/chat/completions`）。
- 地图页的「细看」用 Leaflet（放在 `vendor/`，不走 CDN）加在线瓦片：国内高德，国外 CARTO。瓦片要联网，其他功能都不用。
- 第一次打开载入 `data.js` 里的示例数据（京都红叶七日、上海的店等），日期是 2026 年 11 月的真实日期。
- 界面文字全部是简体中文。

## 常用命令（在 `yuanfang/` 下）

```bash
python3 -m http.server 8000      # 本地预览，打开 http://localhost:8000
npm install                      # 第一次：装 playwright
npx playwright install chromium  # 第一次：装浏览器
npm test                         # 冒烟测试：tests/smoke.js，41 项
npm run build                    # 打包成单文件 dist/远方清单.html
```

`tests/smoke.js` 自带一个静态服务器，并把页面时间固定在 `2026-11-02 10:30`，所以示例数据的倒计时、截止日期每次都一样。

## 改完以后的检查清单

1. `node -e "new Function(require('fs').readFileSync('app.js','utf8'))"`：先确认语法没坏。
2. `npm test`：41 项全过，并且没有脚本报错。
3. 改了界面的话，在 1440px 和 400px 宽、浅色和深色下各看一眼。深色可以用 `page.emulateMedia({ colorScheme: 'dark' })` 截图看。
4. 改了数据结构的话，看下面「改存储结构」那一节。
5. 行为变了的话，同步改 `docs/使用指南.md` 和 `README.md`。
6. 用户要单文件版时运行 `npm run build`。

---

## 目录

```
yuanfang/
├── index.html        页面骨架：侧栏 / 手机顶栏和底栏、8 个视图容器、5 个 <dialog>、SVG 滤镜（#rough 印章毛边、#ink 邮戳墨色）
├── styles.css        全部样式。开头是设计令牌（含两套深色定义），后面按区块排列，第二版和第三版新增的样式各有一个大标题
├── data.js           window.DATA：示例数据，也是数据结构的参考
├── world.js          window.WORLD：世界陆地轮廓（已投影的 SVG path），由 tools/build_world.py 生成，不要手改
├── app.js            全部逻辑，一个 IIFE，约 2600 行
├── vendor/           Leaflet 1.9.4 的 leaflet.js / leaflet.css 和许可证，原样从 npm 拷来，不要改
├── tests/smoke.js    Playwright 冒烟测试（瓦片请求被拦下来回一张 1×1 的图，不连外网）
├── tools/build_single.py   打包单文件
├── tools/build_world.py    重新生成 world.js
├── docs/使用指南.md  给用户看的功能介绍、场景和示例
└── README.md         安装、打开、注意事项
```

四个脚本按顺序加载：`vendor/leaflet.js` → `data.js` → `world.js` → `app.js`。样式是 `vendor/leaflet.css` 在前、`styles.css` 在后，方便覆盖。

---

## 架构

### 数据流

```
用户操作 ──▶ 点击/提交委托（按 data-* 分发）──▶ act(提示语, fn)
                                                   │ 1. structuredClone(D) 做快照（给撤销用）
                                                   │ 2. fn() 直接改 D
                                                   │ 3. save()  150ms 防抖写 localStorage
                                                   │ 4. refresh() 重画所有视图 + 开着的抽屉
                                                   └ 5. toast(提示语, { undo, action })
```

- `D`：唯一的数据对象。启动时从 localStorage 读；读不到或 `version !== 3` 就用 `clone(window.DATA)`。
- `P` / `T`：按 id 索引的地点、行程，由 `reindex()` 重建。`refresh()` 和 `restore()` 都会调用它。
- 渲染：每个视图一个 `renderXxx()`，用模板字符串整块重写 `innerHTML`。没有虚拟 DOM，也不做局部更新，唯一例外是想去页的 `renderAlbum()`（搜索时只重画邮票册）。
- 视图状态（当前行程 `curTrip`、筛选 `pf`、地图 `mapMode/mapSel`、细看地图 `LM`、整理 `sortState`、抽屉 `dr`、盖章 `ck` 等）放在模块变量里，不存进 `D`。唯一存进 `D` 的界面偏好是 `D.prefs.mapBase`（底图选择）。

### 路由

`location.hash` 对应 `VIEWS = ['home','places','trip','map','memories','sort','providers','today']`。每个视图是 `section#view-xxx`，用 `hidden` 切换。`#providers` 就是设置页，因为 `settings` 这个 hash 在 claude.ai 预览里被占用了。

### 事件

所有监听都挂在 `document` 上：`click`、`keydown`、`input`、`change`（async，处理文件读取）、`submit`、拖动（`dragstart/dragover/drop/dragend`），另外有 `toggle`（捕获阶段，记住每天的展开状态）、`close`（捕获阶段，把提示条移出关闭的弹窗）、`hashchange`、`storage`（别的标签页改了数据就刷新）。

点击处理是一长串 `if (ds.xxx) { ...; return; }`，`ds = el.dataset`，`el = e.target.closest('button, a, .pin, [data-place]')`。**分支顺序有意义**：

- `ds.ta`（提示条按钮）、`ds.toast`、`ds.close` 排在最前面。
- `ds.plan` 要在 `ds.place` 前面。
- `ds.place` 只在弹窗外直接打开抽屉。

新加交互时：给元素加 `data-动作名`，在点击委托里合适的位置加分支。

### 浮层

五个 `<dialog>`，都用 `showModal()` 打开：

| id | 用途 | 渲染函数 |
| --- | --- | --- |
| `#palette` | 搜索，或记下一个想去（`/` 打开） | `openPalette` / `renderPal` / `palDetail` |
| `#drawer` | 地点抽屉（详情、状态链、加入行程、编辑） | `openDrawer` / `renderDrawer` / `placeEditForm` |
| `#sheet` | 盖章、写回忆、改回忆、行程信息表单 | `openCheckin` / `renderSheet`；`openTripSheet` |
| `#draw` | 帮我挑一个（本地抽签） | `openDraw` / `roll` / `renderDraw` |
| `#showbk` | 出示预订（大字确认号） | `openShow` |

- 点遮罩关闭：点击目标是 `DIALOG` 元素本身时调用 `close()`，所以弹窗本体的 padding 必须为 0，内容都放在内层容器里。
- 模态弹窗打开时，弹窗外的元素都点不了。`toast()` 会把提示条（模块变量 `TOAST`）移到最上层的弹窗里；弹窗关闭时，`close` 监听再把它移出来。弹窗内容整块重画时提示条可能被一起移出页面，下次调用 `toast()` 会自动放回去。

### app.js 分区

用分区标题搜索定位（行号会变）：

| 分区标题 | 内容 |
| --- | --- |
| 文件开头 | 读写 localStorage：`D`、`save()`、`reindex()` |
| `日期与小工具` | `todayISO` `isDate` `pd` `addDays` `daysUntil` `daysSince` `dot` `md` `yen` `toMin` `span` `uid` `norm` `clamp` `RATE` `dueLabel` `dueDays` `alive` `areaOf` `memosOf` `whereOf`；`CITY`（常见城市坐标、国家、归组） |
| `行程：状态、里程碑、进度都由数据推算` | `tripStatus` `tripLen` `booked` `spentOf` `activeTrips` `milestones` `nextMilestone` `progress` `nextTrip` `syncDays` |
| `邮票图案` | `ART`（15 种两色 SVG 图案，viewBox 100×125）、`TYPES`、`TYPE_ART`（类型的默认图案和配色）、`art()`、`cvars()` |
| `邮戳` | `postmark(城市, 日期)`、`pmCity` |
| `邮票` | `stampFace` `stamp(p, {size, mark, clip, open})` `stateLine` `months`（12 格季节条） `slot`（邮票册里的一格） `STATUS` `statusPill` |
| `车票（行程卡）与里程碑` | `ladder`（检票孔里程碑）、`pass`（行程车票）、`checkItem` |
| `改数据：统一入口` | `act` `restore` `markBeen` `addToTrip` `unplan` `removeFromDays` `insertItem` `suggestedTrip` `localTrip` `nextSaturday` |
| `总览：投递口 + 下一步` | `msWhy` `nextSteps` `stepRow` `parseShare` `srcOf` `inboxPlan` `inboxHint` `submitInbox` `renderHome` |
| `想去` | `pf`（筛选状态） `renderPlaces` `renderAlbum` `areaCards`（按地方看） |
| `行程` | `renderTrip` `dayBlock` `itemRow` `folderBody`（资料夹四个标签页及其增删表单） `openTripSheet` `saveTripForm` `doMilestone` `parseDue` |
| `今天` | `todayCtx`（进行中的行程，否则用 `D.todaySim` 预览） `renderToday` `mapLink`（高德 / Google 地图链接） |
| `地图` | `proj`（Natural Earth I 投影，和 world.js 一致） `clusters`（按 area 聚合） `worldSvg` `citySvg`（本地地图，上海画江河，其他城市画网格） |
| `细看：Leaflet 瓦片地图` | `TILES`（高德、CARTO 两种底图） `LM`（地图实例和状态） `outOfChina` `wgs2gcj` `gcj2wgs` `ll` `km` `fmtKm` `routeOptions` `routeData` `pickBase` `setBase` `checkTiles` `drawMarkers` `drawRoute` `applyFocus` `mountLmap` `detailSide`；三种看法共用的 `renderMap` `selCard` `openDetail` |
| `回忆` | `renderMemories` `postcard` |
| `一键整理` | `AI_PROMPT` `sortState` `activeProvider` `findPlace` `findItem` `normalize` `callAI` `explainErr` `sendToSort` `runSort` `renderSort` `traysHtml` `updateCommit` `commitSort` |
| `设置` | `renderProviders`（服务商、家、数据三块） `testProvider` `clearAll` |
| `搜索，或记下一个想去` | `guess`（从文字猜类型、城市、是否本地） `draftPlace`（生成新地点，自动补坐标） `palItems` `openPalette` `renderPal` `palDetail` `readPalDetail` `savePlace` `runPal` |
| `地点抽屉` | `openDrawer` `renderDrawer` `placeEditForm` `planPicker` `dayChips` |
| `盖章 / 写回忆 / 改回忆` | `openCheckin` `renderSheet` `shrink`（照片压缩到长边 900px） `saveCheckin` |
| `帮我挑一个` / `出示预订` | 本地地点按想去程度的平方加权抽签；大字确认号 |
| `路由、导航、提示条` | `VIEWS` `navCounts` `route` `toast` `showDialog` `refresh` `goTrip` |
| `点击` / `键盘` / `输入` / `提交` / `拖动调整日程` | 事件委托 |

---

## 数据模型

`D` 的顶层：

```js
{
  version: 3,              // 存储结构版本，和 STORE_KEY 一起用
  sample: true,            // 是否还是示例数据（首页顶部提示条）
  home: { city, lat, lng },// 家：区分本地/远方，地图上的「家」
  snoozed: { [key]: 'YYYY-MM-DD' },  // 「稍后」藏起来的下一步，到这天之前不显示
  prefs: { hideSample },
  places: [], trips: [], memories: [], providers: [],
  todaySim: { date, now, trip, day, weather, done: { 序号: 'HH:MM' } },  // 「今天」页的预览
  aiSample: '...',         // 一键整理的示例输入
  aiDemo: { ... }          // 模型输出格式的示例（示例服务商直接用它）
}
```

**地点 place**

| 字段 | 说明 |
| --- | --- |
| `id` `name` | |
| `type` | `建筑` / `餐馆` / `城市` / `自然` / `咖啡` 之一 |
| `local` | 是否本地（在家所在城市）。本地地点的 `city` 存路名/商圈，`country` 存区名 |
| `city` `country` | 远方地点的城市、国家 |
| `area` | 归组：同一趟能顺路去的放一起（如「关西」包含京都、大阪、宇治）。`areaOf(p)` 有兜底 |
| `want` | 想去程度 1–5，邮票上的「面值」 |
| `tags` | 字符串数组 |
| `lat` `lng` | 坐标；0,0 表示没有。`approx: true` 表示用的是城市中心 |
| `state` | `want` / `plan` / `been` |
| `trip` `day` | 计划中时所在的行程 id 和第几天（`day` 可以为空，表示「先放进来，不定哪天」） |
| `been` | 去过的日期 `YYYY-MM-DD` |
| `dropped` | 不想去了（归档，不删除） |
| `added` `touched` | 记下的日期；最近一次确认「还想去」的日期 |
| `season` `seasonNote` | 最适合去的月份数组，以及一句说明 |
| `note` | 为什么想去 |
| `src` | `{ from: '小红书', title, url }`：从哪里看到的 |
| `art` `c` `stars` | 邮票图案名、`[底色, 主墨, 辅色]`、图案参数 |

**行程 trip**

| 字段 | 说明 |
| --- | --- |
| `id` `title` `subtitle` `slogan` | 目的地、名字（如「红叶七日」）、首页标题用的一句话（如「去京都看红叶」） |
| `area` | 和地点的 `area` 对应，用来找「还没排进来的候选」 |
| `local` | 本地一日游（不要求订交通和住宿） |
| `start` `end` | `YYYY-MM-DD`。`start` 只写到 `YYYY-MM` 表示只定了大概月份（草拟） |
| `cur` | 当地货币符号（`円` `€` `¥` `kr`…），记账用，换算见 `RATE` |
| `budget` | 预算（元） |
| `spent` | 只有已完成的旅行才填实际花费；其他时候「已订」由预订金额加总 |
| `people` | 同行的人 |
| `leg` | 可选：`{ from: [代码, 名称, 时间], to: [...], via }`，车票上的出发和到达 |
| `days` | `[{ n, date: 'MM.DD', wd: '周五', title, items: [...] }]`，由 `syncDays()` 按日期维护 |
| `days[].items[]` | `{ t: 'HH:MM' 或 '待定', kind, title, note, place, tag: [样式, 文字], booking: 预订下标, go: 怎么去, doneAt, simDone }` |
| `materials` | `{ prep: [{ text, done, due, meta }], guide: [{ src, title, url, by, saved }], booking: [{ kind, code, title, lines: [], ref, price }], note: [字符串] }` |
| `expenses` | `[{ date, t, cat, what, amount }]`，金额用当地货币 |

**不要存的派生值**：行程状态 `tripStatus()`（draft/plan/going/done）、进度 `progress()`、里程碑 `milestones()`、已订金额 `booked()`。它们每次从日期和内容现算。

**回忆 memory**：`{ place, date, rating 0–5, cost: '1,350 円', costCny, photos: 张数, note, img: 第一张照片的 dataURL }`

**AI 服务商 provider**：`{ id, name, base, model, key, active, demo, used }`。`demo: true` 是示例，没有真实密钥。示例服务商只能整理示例那段聊天，换别的内容会提示去设置。

### 一键整理的数据格式

模型被要求只输出这个 JSON（完整要求见 `AI_PROMPT`）：

```js
{
  trip_patch: { title, start, end, budget, people, reason } | null,
  places:    [{ name, city, country, type, want, tags, lat, lng, note, local }],
  items:     [{ day, time, title, note, place, replaces }],   // replaces：要更新的原有安排标题
  materials: [{ kind: 'prep'|'guide'|'booking'|'note', title, url, due, detail }],
  memories:  [{ place, date, rating, cost, note }]
}
```

流程：`callAI()` 拿到原始结果 → `normalize(raw, 行程)` 标出哪些和现有数据重复（`match`）、哪些天不存在（`ok:false`）→ `traysHtml()` 画成五个格子 → 用户勾选 → `commitSort()` 合并写入。`sortState.raw` 留着原始结果，换「整理到」的行程时会重新 `normalize`，不重新请求模型。

---

## 必须遵守的约定

1. **改数据走 `act(提示语, fn, { action, onUndo })`**，这样才有撤销、保存和重画。只有很小的改动可以直接改 `D` 再调用 `save()`，然后局部重画：想去程度、备注、标签、勾选准备事项、每天的主题。
2. **不存派生值**，见上面的数据模型。
3. **用户内容插进 HTML 前一律过 `esc()`**，属性值也一样。
4. **日期用本地时间**：`TODAY` 是今天零点。字符串格式是 `YYYY-MM-DD`，截止时间是 `YYYY-MM-DD HH:MM`。比较和换算用 `pd` `isDate` `addDays` `daysUntil`，不要直接 `new Date(字符串)`，那样会按 UTC 解析。
5. **比较名字用 `norm()`**（会去掉空格和「·」，并转小写），查地点用 `findPlace()`，查日程用 `findItem()`。
6. **新地点一律经过 `draftPlace()`**：它会补类型对应的邮票图案、坐标（`CITY` 表或家附近的随机点）、`added`。
7. **处理中文输入法**：回车提交前检查 `!e.isComposing`。
8. **CSS 只用令牌**。新增颜色令牌要写三处：`:root`、`@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`、`:root[data-theme="dark"]`。邮票、明信片这些「实物」用 `--obj-*` 和 `--art-paper`，在深色模式下也保持纸色。
9. **颜色各管各的**：状态色只表示状态（航空蓝 = 想去，车票赭 = 计划中，邮政绿 = 已去过，相纸褐 = 回忆）。朱砂红只给印章、主操作和要紧的提醒。一屏里只有最要紧的那个按钮用 `btn-seal`。
10. **形状也表示状态**，各处保持一致：○ 想去、◆ 计划中、◉ 已去过、■ 回忆。对应 `.st-*`（带底色的签）、`.mk.*`（只有形状）、`.swatch.*`（地图图例）、`.ti.*`（手机底栏）。
11. **文案**：简体中文，具体、直接、主动语态。按钮写清楚会发生什么，提示条用同一个词（按钮「收进想去」，提示「已记下……」）。出错时说清原因和怎么办，不道歉。空状态告诉用户第一步做什么。
12. **视图之间跳转**：先改模块状态（如 `curTrip`），再改 `location.hash`。`goTrip(id)` 已经封装好。
13. **示例数据和代码分开**：不要在 app.js 里写死示例 id（`kyoto` 等），除非是给示例用的兜底（如 `sortState.trip` 的默认值）。

---

## 常见改动怎么做

**加一个页面**
1. 在 `index.html` 的 `<main>` 里加 `<section class="view" id="view-xxx" hidden>`，再在侧栏 `.nav`（竖排，两个字）和需要的地方加 `<a href="#xxx" data-nav="xxx">`。
2. 在 app.js 写 `renderXxx()`，加进 `VIEWS`、`VIEW_NAME` 和 `refresh()`。
3. 在 `tests/smoke.js` 里加一步。

**给地点加字段**
1. 在 `data.js` 的示例里给几个地点填上值。
2. 在 `draftPlace()` 里给默认值。
3. 编辑入口：抽屉的 `renderDrawer()` 或 `placeEditForm()`，以及对应的 `submit` 分支（`pe-form`）。
4. 如果 AI 也应该识别这个字段：改 `AI_PROMPT` 里的 places 格式和 `commitSort()` 里的合并逻辑。
5. 旧数据里没有这个字段，读的时候要有兜底（`p.xxx || ...`）。

**加一种「下一步」**
在 `nextSteps()` 里调用 `add(唯一key, { rank, from, to, stage, title, why, place | stamps, btn })`：
- `rank` 越小越靠前：负数是今天必须做的，1–2 是重要的，4 以后是可以等的。
- `from` / `to` 是状态链上的格子（`want` `plan` `been` `memo`），只在同一格里推进时不写 `to`。
- `key` 要稳定（同一件事每次生成的 key 一样），「稍后」才能生效。
- `btn` 是 HTML 字符串，用已有的 `data-*` 动作，没有合适的就新加一个点击分支。

**加一个行程里程碑**
在 `milestones()` 里 push `{ k, l, done, hint }`，在 `doMilestone(k, tripId)` 里写点击后带用户去哪里完成它，在 `msWhy()` 里写首页上的那句说明。`progress()` 会自动按格子数计算。

**加一种邮票图案**
在 `ART` 里加一个函数，返回 viewBox `0 0 100 125` 里的 SVG 片段。只用四种填充：`f.d`（主墨 `--c2`）、`f.m`（辅色 `--c3`）、`f.p`（纸白）、`f.b`（底色 `--c1`），这样任何配色都能用。线条用 `line('--c2', 宽度)`。然后在地点数据里设 `art: '名字'`；想让某个类型默认用它，就改 `TYPE_ART`。

**改 AI 输出格式**
要一起改这六处：`AI_PROMPT`、`normalize()`、`traysHtml()`、`commitSort()`、`data.js` 里的 `aiDemo`，以及 `tests/smoke.js` 里「示例结果有 7 条」那一项。

**改存储结构**
不兼容的改动要把 `STORE_KEY` 和 `version` 一起升级（比如 `yuanfang/v4` 和 `version: 4`），并在 app.js 开头的读取函数里写迁移：读旧键、转换、存新键。否则老用户打开会被当成没有数据，退回示例。导入备份时（`import-file` 分支）也要走同样的迁移。

**改配色或字体**
只改 `styles.css` 开头的令牌，三处定义都要改。字体在 `index.html` 的 Google Fonts 链接里。

---

## 设计系统

- **视觉方向**：邮政和旅行票据。想去 = 两色套印的邮票（面值 = 想去程度「5分」），计划中 = 夹在邮票上的车票签 / 登机牌式的行程卡，已去过 = 圆形日期邮戳，回忆 = 贴着照片（带相角和胶片日期）的明信片，投递口 = 航空信封边框。
- **底色**：航空信纸的淡蓝灰 `--ground`。文字是蓝黑墨水 `--ink`。刻意避开米黄底配衬线字和赭红强调色这种常见的 AI 风格。
- **字体**
  - `--f-display`：站酷小薇，用于标题和竖排导航。它的「回」字轮廓有问题，所以前面放了只含「回」字的 Noto Serif SC 子集。
  - `--f-body`：思源黑体，正文。
  - `--f-type`：Courier Prime，日期、代码、金额，像打字机打的票据。
  - `--f-hand`：龙藏体，手写感，只用在回忆、备注和「为什么想去」。
- **标志性细节**（改的时候别弄丢）
  - 竖排侧栏，当前页用古籍里的「圈点」标出：CSS 的 `text-emphasis`。
  - 侧栏右边缘是一排打孔线。
  - 邮票的齿孔边用 `mask` 做，所以阴影要加在外层 `.stamp-wrap` 上，用 `filter: drop-shadow`。
  - 邮戳有着墨不均的效果（`#ink` 滤镜），刚盖上时有一个「盖章」动画（`.pm.thunk`）。
  - 行程卡上的里程碑是检票孔，完成的是打穿的孔。
- **克制**：动效只用在盖章、抽签洗牌、弹窗进出这几处，并且尊重 `prefers-reduced-motion`。
- **布局**：桌面端是竖排侧栏加内容区；820px 以下侧栏变成顶栏，底部出现 5 格底栏（中间是「记一个」）。弹窗在手机上变成从底部升起的面板。

---

## 已知的坑

- **字体缺字**：站酷小薇的「回」字会显示成实心方块，已经用 Noto Serif SC 子集补上了（`index.html` 里第二个字体链接）。如果换标题字体，先检查常用字的覆盖。
- **地图跨 180° 经线**：斐济、楚科奇的多边形跨过了 180° 经线，直接投影会画出横贯全图的直线。`tools/build_world.py` 里已经把它们收拢到同一侧。`proj()` 和 world.js 的常数（`k`、`y0`）必须一致。
- **AI 请求**
  - 浏览器直接调用服务商，有些服务商不允许跨域，`explainErr()` 会说明原因。
  - claude.ai 的在线预览页不允许任何外部请求，只能用示例结果。
  - 真要彻底解决，需要加一个后端代理。
- **存储上限**：localStorage 大约 5MB。照片已经压缩成长边 900px 的 JPEG，每段回忆只存第一张。写入失败时 `storageOk` 会变成 false，设置页会提示。
- **file:// 下的数据**：双击打开时，数据跟着浏览器走。换浏览器就看不到。Safari 对 file:// 的 localStorage 可能更严格。
- **示例数据会过期**：示例日期固定在 2026 年 11 月。过了这个时间，京都那次会显示成已完成，「今天」页也只能看预览。测试不受影响，因为测试固定了时间。以后可以考虑把示例日期改成相对今天计算。
- **`[hidden]` 必须加 `!important`**，否则 `.nav a { display:flex }` 之类的规则会让隐藏元素露出来。
- **不要在 `<summary>` 里放输入框**：点击输入框会触发展开或收起。每天的主题输入框因此放在展开后的内容里。
- **细看地图（Leaflet）**
  - **地图只建一次**：`LM.el` 是一个常驻的 div，`renderMap()` 每次整块重写 `#view-map` 时，`mountLmap()` 把它塞回 `#lmap-slot`，再重画标记和路线，不会重新建地图，所以缩放和位置不会丢。从别的页切回地图时，`route()` 会调用 `invalidateSize()`。
  - **视角只在需要时跳**：要让地图飞到某处，设 `LM.focus = { type: 'all' | 'home' | 'area' | 'place' | 'route' | 'pick', key }`，`applyFocus()` 用完就清掉。从别的页过来用 `openDetail(focus, { routeKey, pickFor })`。
  - **高德是 GCJ-02 坐标**：数据里存的都是 WGS-84（GPS）。用高德底图时，`ll(p)` 把要画的点转成 GCJ-02；在地图上点选位置时，`gcj2wgs()` 再转回来存。国外和台湾不转换。不转换的话，国内的点会偏几百米。
  - **国内国外怎么判断**：`outOfChina()` 用几个矩形拼出大陆范围，再挖掉台湾、越北、俄远东。常见的单个外接框（经度 72–137.8）会把日本、韩国也包进去，京都就会错用高德。
  - **瓦片地址**：高德用的是网页版公开的瓦片地址，CARTO 用的是它的免费底图，都适合个人使用；如果要做成给很多人用的网站，需要换成正式申请了密钥的服务。瓦片接连失败（`LM.tileErr >= 4` 且一张都没成功）时显示 `#lmap-note`。
  - **深色模式**：瓦片本身是浅色的，靠令牌 `--tile-filter`（深色下反相再转色相）压暗。
  - **z-index**：Leaflet 的控件 z-index 是 800–1000，`.lmap` 加了 `isolation: isolate` 把它们关在地图里面，否则会盖住手机底栏。
  - **类名**：首页的四个阶段用了 `.route`，图例里的路线样例因此叫 `.swatch.path`。新加类名前先搜一下。
- **上海本地地图**：黄浦江和苏州河是按固定的经纬度框画的（`SH_BOX`）。家改成别的城市时，本地地图会自动换成按坐标摆放的网格。
- **竖排和圈点**：`writing-mode: vertical-rl` 加 `text-emphasis`，需要较新的浏览器。数字用 `text-combine-upright` 横排在竖排里。

---

## 在线预览（claude.ai）

之前在 claude.ai 上发布过一个在线预览，那是单独的一份拷贝，不会随仓库自动更新。发布时去掉了 `index.html` 的文档骨架，并去掉了「导出备份」按钮，因为预览页不允许下载。预览页也不允许外部请求，所以细看地图在那里只有地点和路线，没有街道底图。本地开发不用管它。

---

## 接下来可以做的

- 加一个很薄的后端（比如 Cloudflare Workers + D1，或一个小 Node 服务）：代理 AI 请求（不在浏览器里放密钥，也不受跨域限制）、存数据库、多设备同步。表结构可以直接照着上面的数据模型。
- 细看地图：瓦片缓存到本地（Service Worker），没网也能看去过的街区；路线按步行或公交的真实距离算（需要地图服务的路径规划接口）。
- 截图识别文字（OCR）、读取链接正文：都需要后端。
- 示例数据改成相对今天的日期。
- 和同行的人共享一次行程（只读链接）。
- 年度回顾：一年去了哪些地方、花了多少、哪些想去变成了去过。
