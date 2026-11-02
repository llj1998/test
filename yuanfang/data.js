/* 远方清单 · 演示数据
   全部为示例内容，用来展示界面；对应后端表：places / trips → trip_days → trip_items / materials / memories / ai_configs。
   演示用"今天"固定为 2026-11-02，保证倒计时等文字前后一致。 */

window.DATA = {
  today: '2026-11-02',
  home: { city: '上海', code: '沪', lat: 31.2304, lng: 121.4737 },

  /* 想去地点库 · places
     state: want 想去 / plan 计划中 / been 已去过
     art: 邮票图案；c1 底色 c2 主墨 c3 辅色 */
  places: [
    { id: 'fushimi', name: '伏见稻荷大社', city: '京都', country: '日本', type: '建筑', want: 5, tags: ['千本鸟居', '早起'], lat: 34.9671, lng: 135.7727, state: 'plan', trip: 'kyoto', day: 3, art: 'torii', c: ['#F3D3C3', '#962E1E', '#E07C55'], added: '2026-03-14' },
    { id: 'arashiyama', name: '岚山竹林', city: '京都', country: '日本', type: '自然', want: 4, tags: ['竹林小径', '嵯峨野'], lat: 35.017, lng: 135.6713, state: 'plan', trip: 'kyoto', day: 4, art: 'bamboo', c: ['#D6E4D3', '#22503A', '#82AC8C'], added: '2026-03-14' },
    { id: 'dotonbori', name: '道顿堀', city: '大阪', country: '日本', type: '城市', want: 3, tags: ['夜景', '章鱼烧'], lat: 34.6687, lng: 135.5013, state: 'plan', trip: 'kyoto', day: 1, art: 'lanterns', c: ['#25305A', '#F3C553', '#E2603F'], added: '2026-05-02' },
    { id: 'sakamichi', name: '坂道咖啡', city: '京都 · 东山', country: '日本', type: '咖啡', want: 3, tags: ['拿铁', '八坂塔'], lat: 34.9986, lng: 135.7808, state: 'plan', trip: 'kyoto', day: 3, art: 'cup', c: ['#EBDDCB', '#56331E', '#BA875D'], added: '2026-09-21' },
    { id: 'jokulsarlon', name: '杰古沙龙冰河湖', city: '冰岛南岸', country: '冰岛', type: '自然', want: 5, tags: ['冰川', '极光', '自驾'], lat: 64.0784, lng: -16.2306, state: 'plan', trip: 'iceland', art: 'glacier', c: ['#D7E9EC', '#1D4A5B', '#86BAC6'], added: '2025-12-30' },
    { id: 'lisbon', name: '里斯本', city: '里斯本', country: '葡萄牙', type: '城市', want: 4, tags: ['28 路电车', '蛋挞'], lat: 38.7223, lng: -9.1393, state: 'want', art: 'hillcity', c: ['#F4D8D5', '#7B2A37', '#E3A35A'], added: '2026-10-09' },
    { id: 'angkor', name: '吴哥窟', city: '暹粒', country: '柬埔寨', type: '建筑', want: 4, tags: ['日出', '倒影'], lat: 13.4125, lng: 103.867, state: 'want', art: 'towers', c: ['#E8D6E6', '#4F2650', '#B784AE'], added: '2026-02-11' },
    { id: 'tekapo', name: '特卡波湖', city: '南岛', country: '新西兰', type: '自然', want: 5, tags: ['星空', '鲁冰花'], lat: -44.0046, lng: 170.4775, state: 'want', art: 'mountains', stars: true, c: ['#CDD7EE', '#20366E', '#6E87C6'], added: '2026-10-29' },
    { id: 'istanbul', name: '伊斯坦布尔', city: '伊斯坦布尔', country: '土耳其', type: '城市', want: 4, tags: ['清真寺', '渡轮'], lat: 41.0082, lng: 28.9784, state: 'want', art: 'domes', c: ['#D5E6EA', '#1F4656', '#7FB1BE'], added: '2026-07-01' },
    { id: 'sagrada', name: '圣家堂', city: '巴塞罗那', country: '西班牙', type: '建筑', want: 5, tags: ['高迪', '彩窗'], lat: 41.4036, lng: 2.1744, state: 'been', been: '2024-05-03', trip: 'barcelona', art: 'spires', c: ['#F2E0B9', '#774711', '#D9A44C'], added: '2023-11-20' },
    { id: 'boqueria', name: '波盖利亚市场', city: '巴塞罗那', country: '西班牙', type: '餐馆', want: 4, tags: ['火腿', '果汁'], lat: 41.3817, lng: 2.1716, state: 'been', been: '2024-05-02', trip: 'barcelona', art: 'fruits', c: ['#F3D3C3', '#8F2C1D', '#E59B49'], added: '2023-11-20' },
    { id: 'chiangmai', name: '清迈古城', city: '清迈', country: '泰国', type: '城市', want: 3, tags: ['寺庙', '夜市'], lat: 18.7883, lng: 98.9853, state: 'been', been: '2025-01-18', art: 'stupa', c: ['#F2E2BE', '#6F3F12', '#D59A3E'], added: '2024-10-02' },
    { id: 'doisuthep', name: '素贴山双龙寺', city: '清迈', country: '泰国', type: '建筑', want: 3, tags: ['金塔', '俯瞰'], lat: 18.8048, lng: 98.9216, state: 'been', been: '2025-01-20', art: 'stupa', c: ['#E7D8EA', '#542B5A', '#C99A4E'], added: '2024-10-02' },
    { id: 'erhai', name: '洱海', city: '大理', country: '中国', type: '自然', want: 3, tags: ['骑行', '环湖'], lat: 25.6065, lng: 100.2676, state: 'been', been: '2025-08-09', art: 'mountains', c: ['#D5E7EB', '#1C4B5A', '#7DB4C1'], added: '2025-04-15' },

    /* 本地 · 上海 */
    { id: 'banceng', name: '半层咖啡', city: '衡山路', country: '徐汇', local: true, type: '咖啡', want: 4, tags: ['手冲', '二楼窗边'], lat: 31.2045, lng: 121.4426, state: 'plan', trip: 'weekend', day: 1, art: 'cup', c: ['#E2E7D2', '#3D4A1F', '#9FAE6A'], added: '2026-10-20' },
    { id: 'nongtang', name: '弄堂本帮菜', city: '进贤路', country: '黄浦', local: true, type: '餐馆', want: 5, tags: ['红烧肉', '要排队'], lat: 31.2187, lng: 121.4603, state: 'want', art: 'bowl', c: ['#F4D6CF', '#8A2618', '#DD7B5E'], added: '2026-09-02' },
    { id: 'huanghe', name: '黄河路生煎', city: '黄河路', country: '黄浦', local: true, type: '餐馆', want: 4, tags: ['生煎', '宵夜'], lat: 31.2361, lng: 121.4706, state: 'want', art: 'bowl', c: ['#F2E1C0', '#6E4410', '#D19A44'], added: '2026-10-27' },
    { id: 'gongqing', name: '共青森林公园', city: '军工路', country: '杨浦', local: true, type: '自然', want: 3, tags: ['露营', '秋天'], lat: 31.3204, lng: 121.5579, state: 'want', art: 'trees', c: ['#DBE6CF', '#2E4F24', '#93B375'], added: '2026-10-05' },
    { id: 'baiqiang', name: '白墙面包房', city: '愚园路', country: '长宁', local: true, type: '咖啡', want: 3, tags: ['肉桂卷'], lat: 31.2229, lng: 121.4338, state: 'been', been: '2026-10-12', art: 'cup', c: ['#EDE3DC', '#5B3A2E', '#C7A08A'], added: '2026-09-30' }
  ],

  /* 旅行计划 · trips → trip_days → trip_items，资料库 materials 挂在旅行下面 */
  trips: [
    {
      id: 'kyoto', title: '京都 · 大阪', subtitle: '红叶七日', start: '2026-11-20', end: '2026-11-26', status: 'plan',
      progress: 68, budget: 14000, spent: 8460, people: '我、小林',
      leg: { from: ['PVG', '上海浦东', '11.20 09:40'], to: ['KIX', '大阪关西', '13:05'], via: 'MU729 · 2 小时 25 分' },
      days: [
        { n: 1, date: '11.20', wd: '周五', title: '飞大阪', items: [
          { t: '09:40', kind: '交通', title: 'MU729 浦东 → 关西', note: '落地 13:05（当地时间），浦东 T1', tag: ['ok', '已订'] },
          { t: '14:10', kind: '交通', title: '南海电铁 Rapi:t → 难波', note: '约 40 分钟，刷 ICOCA' },
          { t: '15:30', kind: '住宿', title: '难波 · 酒店入住', note: '1 晚，离道顿堀步行 6 分钟', tag: ['ok', '已订'] },
          { t: '18:30', kind: '城市', title: '道顿堀', note: '夜逛，章鱼烧，看格力高跑跑人', place: 'dotonbori' }
        ] },
        { n: 2, date: '11.21', wd: '周六', title: '大阪城，傍晚去京都', items: [
          { t: '09:30', kind: '景点', title: '大阪城公园', note: '西之丸庭园的银杏这时候应该黄了' },
          { t: '13:20', kind: '交通', title: 'JR 新快速 → 京都', note: '约 30 分钟' },
          { t: '15:00', kind: '住宿', title: '祇园 · 町家民宿', note: '连住 5 晚', tag: ['ok', '已订'] },
          { t: '19:00', kind: '吃饭', title: '先斗町 · 晚饭', note: '沿鸭川找一家能看到河的', tag: ['wait', '待定'] }
        ] },
        { n: 3, date: '11.22', wd: '周日', title: '东山，早起看稻荷', items: [
          { t: '06:30', kind: '景点', title: '伏见稻荷大社', note: '赶在人潮前上山，走到四之辻', place: 'fushimi' },
          { t: '10:30', kind: '咖啡', title: '坂道咖啡', note: '拿铁，窗外是八坂塔', place: 'sakamichi' },
          { t: '13:00', kind: '景点', title: '清水寺 · 二年坂三年坂', note: '如果还在修缮，换成南禅寺' },
          { t: '17:30', kind: '景点', title: '永观堂 · 夜枫', note: '入场 17:30，2 张', tag: ['ok', '已订'] }
        ] },
        { n: 4, date: '11.23', wd: '周一', title: '岚山', items: [
          { t: '08:00', kind: '自然', title: '岚山竹林', note: '8 点前人少，走竹林小径', place: 'arashiyama' },
          { t: '10:30', kind: '景点', title: '天龙寺 · 曹源池庭园', note: '' },
          { t: '14:02', kind: '交通', title: '嵯峨野小火车', note: '4 号车厢是露天的', tag: ['todo', '11.03 开抢'] }
        ] },
        { n: 5, date: '11.24', wd: '周二', title: '奈良一日', items: [
          { t: '09:00', kind: '交通', title: '近铁 → 奈良', note: '约 45 分钟' },
          { t: '10:00', kind: '景点', title: '东大寺 · 奈良公园', note: '鹿仙贝在公园门口买' }
        ] },
        { n: 6, date: '11.25', wd: '周三', title: '自由活动', items: [
          { t: '全天', kind: '购物', title: '锦市场', note: '给妈妈买御守，顺便吃玉子烧' }
        ] },
        { n: 7, date: '11.26', wd: '周四', title: '回上海', items: [
          { t: '10:00', kind: '交通', title: 'Haruka → 关西机场', note: '京都站 8 号站台' },
          { t: '14:20', kind: '交通', title: 'MU730 关西 → 浦东', note: '16:05 到上海', tag: ['ok', '已订'] }
        ] }
      ],
      materials: {
        prep: [
          { text: '日本单次旅游签证', done: true },
          { text: '兑换 30,000 日元现金', done: true },
          { text: '永观堂夜枫预约', done: true, meta: '11.01 已抢到 2 张' },
          { text: '买旅行保险', done: true },
          { text: 'iPhone 钱包添加 ICOCA', done: true },
          { text: '抢嵯峨野小火车 14:02 那班', done: false, due: '明天 10:00' },
          { text: '下载关西离线地图', done: false },
          { text: '定先斗町的晚饭', done: false },
          { text: '列给妈妈带的御守清单', done: false }
        ],
        guide: [
          { src: '小红书', title: '京都红叶最全路线｜避开人潮的 5 个早起点', by: '@阿树在京都', saved: '10.08' },
          { src: '小红书', title: '关西周游卡到底值不值？我算了一笔账', by: '@小鹿的旅行账本', saved: '10.11' },
          { src: '官网', title: '永观堂秋季夜间特别参拜 · 预约说明', by: 'eikando.or.jp', saved: '10.24' },
          { src: 'B站', title: '嵯峨野小火车全程第一视角 4K', by: '23 分钟', saved: '10.30' }
        ],
        booking: [
          { kind: '机票', code: 'MU729 / MU730', title: 'PVG ⇄ KIX 往返 · 2 人', lines: ['去 11.20 09:40 → 13:05', '回 11.26 14:20 → 16:05'], ref: 'KX7Q2M', price: 3860 },
          { kind: '民宿', code: 'Airbnb', title: '祇园 · 町家民宿', lines: ['11.21 – 11.26 · 5 晚', '自助入住，密码出发前 3 天发'], ref: 'HM4P8Z', price: 3520 },
          { kind: '酒店', code: '难波', title: '难波站前酒店 · 双床', lines: ['11.20 · 1 晚'], ref: '20261120-0417', price: 680 },
          { kind: '门票', code: '永观堂', title: '秋季夜间特别参拜', lines: ['11.22 17:30 入场 · 2 张'], ref: 'E-2611-0932', price: 400 }
        ],
        note: [
          '清水寺如果还在修缮，下午就换成南禅寺 + 哲学之道。',
          '妈妈要两个御守：学业的给表妹，健康的给外婆。'
        ]
      }
    },
    {
      id: 'weekend', title: '西区咖啡散步', subtitle: '本周六', start: '2026-11-07', end: '2026-11-07', status: 'plan', local: true,
      progress: 40, budget: 300, spent: 0, people: '我',
      leg: { from: ['衡山', '衡山路站', '10:00'], to: ['安福', '安福路', '16:00'], via: '步行 · 约 6 公里' },
      days: [
        { n: 1, date: '11.07', wd: '周六', title: '衡山路 → 武康路 → 安福路', items: [
          { t: '10:00', kind: '咖啡', title: '半层咖啡', note: '手冲，抢二楼窗边的位置', place: 'banceng' },
          { t: '11:30', kind: '城市', title: '武康路 · 武康大楼', note: '梧桐叶这周最好看' },
          { t: '13:00', kind: '吃饭', title: '安福路找一家吃午饭', note: '', tag: ['wait', '待定'] }
        ] }
      ],
      materials: {
        prep: [{ text: '带胶片相机，装好一卷 Portra 400', done: true }, { text: '查一下周六会不会下雨', done: false }],
        guide: [{ src: '小红书', title: '2026 秋 · 武康路咖啡地图（实测 14 家）', by: '@梧桐区', saved: '10.20' }],
        booking: [],
        note: ['半层咖啡周六 9:30 开门，10 点前到。']
      }
    },
    {
      id: 'iceland', title: '冰岛 · 一号公路', subtitle: '环岛十日', start: '2027-02', end: '', status: 'draft',
      progress: 12, budget: 36000, spent: 0, people: '我、小林',
      leg: { from: ['PVG', '上海浦东', '日期待定'], to: ['KEF', '雷克雅未克', ''], via: '经赫尔辛基转机' },
      days: [],
      materials: {
        prep: [{ text: '查 2 月一号公路路况', done: false }, { text: '对比四驱车租车价格', done: false }],
        guide: [
          { src: '小红书', title: '冬季冰岛自驾，这些路千万别走', by: '@北纬64度', saved: '2025.12.30' },
          { src: '官网', title: 'road.is · 冰岛实时路况', by: 'road.is', saved: '2026.01.04' }
        ],
        booking: [],
        note: ['极光看 KP 指数，冰河湖那晚住近一点。']
      }
    },
    {
      id: 'barcelona', title: '巴塞罗那', subtitle: '五月的六天', start: '2024-05-01', end: '2024-05-06', status: 'done',
      progress: 100, budget: 9800, spent: 10420, people: '我',
      leg: { from: ['PVG', '上海浦东', '05.01 00:20'], to: ['BCN', '巴塞罗那', '08:45'], via: '经伊斯坦布尔转机' },
      days: [
        { n: 2, date: '05.02', wd: '周四', title: '老城', items: [
          { t: '11:00', kind: '吃饭', title: '波盖利亚市场', note: '火腿和鲜榨果汁', place: 'boqueria', tag: ['ok', '去过'] },
          { t: '15:00', kind: '城市', title: '哥特区', note: '', tag: ['ok', '去过'] }
        ] },
        { n: 3, date: '05.03', wd: '周五', title: '高迪', items: [
          { t: '16:00', kind: '景点', title: '圣家堂', note: '下午场，光从西边进来', place: 'sagrada', tag: ['ok', '去过'] }
        ] }
      ],
      materials: { prep: [], guide: [], booking: [], note: ['预算超了 620，主要是多吃了两顿海鲜饭。'] }
    }
  ],

  /* 回忆 · memories：去过之后回填评价、花费、照片 */
  memories: [
    { place: 'baiqiang', date: '2026-10-12', rating: 4, cost: '¥68', costCny: 68, photos: 3, note: '可颂普通，肉桂卷很好。十点前去，不用排队。' },
    { place: 'erhai', date: '2025-08-09', rating: 3, cost: '¥1,860', costCny: 1860, photos: 22, note: '骑车环湖，晒脱了一层皮。双廊那段风最大，也最好看。' },
    { place: 'chiangmai', date: '2025-01-18', rating: 4, cost: '¥3,200 · 5 天', costCny: 3200, photos: 31, note: '古城门口早上那份芒果糯米饭，比哪座寺都记得清楚。' },
    { place: 'sagrada', date: '2024-05-03', rating: 5, cost: '€26 门票', costCny: 205, photos: 14, note: '下午四点，光从西边的彩窗落进来，整个殿堂都是橘红色。站了很久不想走。' },
    { place: 'boqueria', date: '2024-05-02', rating: 4, cost: '€18', costCny: 142, photos: 9, note: '火腿切片配一杯百香果汁，边走边吃。下次空着肚子来。' }
  ],

  /* AI 一键整理：示例输入与解析结果 */
  aiSample: `小林 10:12
京都那几天我又查了下，南禅寺的水路阁很出片，清水寺看完可以顺路过去

小林 10:13
嵯峨野小火车 11月3号早上10点开放预约，记得抢 14:02 那班，4号车厢是露天的

我 10:20
好 我定个闹钟
酒店那边涨价了，预算估计要多两千

小林 10:21
https://www.xiaohongshu.com/explore/6528f1… 这篇说伏见稻荷 6 点半去人最少

我 10:24
第二天晚上先斗町吃什么？鸟贵族？

小林 10:25
可以，记得提前去排队。还有锦市场那家玉子烧一定要吃！`,

  aiResult: {
    trip: [
      { field: '预算', from: '¥14,000', to: '¥16,000', why: '"酒店那边涨价了，预算估计要多两千"' }
    ],
    places: [
      { name: '南禅寺 · 水路阁', meta: '建筑 · 京都 · 想去 4 分', art: 'spires', c: ['#E2E6D2', '#3B4A20', '#9DAE6C'] },
      { name: '鸟贵族 · 先斗町店', meta: '餐馆 · 京都 · 想去 3 分', art: 'bowl', c: ['#F4D6CF', '#8A2618', '#DD7B5E'] },
      { name: '锦市场 · 玉子烧', meta: '餐馆 · 京都 · 想去 4 分', art: 'fruits', c: ['#F2E1C0', '#6E4410', '#D19A44'] }
    ],
    items: [
      { when: 'Day 3 · 15:30', title: '南禅寺 · 水路阁', note: '清水寺之后顺路', op: 'new' },
      { when: 'Day 4 · 14:02', title: '嵯峨野小火车', note: '补充：4 号车厢，露天', op: 'upd' },
      { when: 'Day 2 · 19:00', title: '先斗町 · 鸟贵族', note: '原为"先斗町 · 晚饭"，提前排队', op: 'upd' }
    ],
    materials: [
      { cat: '准备', title: '11.03 10:00 抢嵯峨野小火车票', note: '14:02 那班，4 号车厢' },
      { cat: '攻略', title: '伏见稻荷 6 点半去人最少', note: 'xiaohongshu.com/explore/6528f1…' },
      { cat: '备注', title: '鸟贵族要提前排队', note: '' }
    ],
    memories: []
  },

  /* AI 服务商 · ai_configs（OpenAI 兼容接口） */
  providers: [
    { id: 'ds', name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', key: 'sk-••••••••••••a3f2', active: true, used: '今天 10:31 · 整理了 1 次' },
    { id: 'qw', name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', key: 'sk-••••••••••••91bc', active: false, used: '10.24 用过' },
    { id: 'home', name: '家里的中转', base: 'http://192.168.1.20:3000/v1', model: 'gpt-4o-mini', key: 'sk-••••••••••••0d7e', active: false, used: '还没用过' }
  ]
};
