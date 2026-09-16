'use strict';
/**
 * make-demo-seed.js — 生成内置示例数据（虚构），写入 src/renderer/seed/demo.js。
 *
 * 为什么用生成器而不是手写 JSON：
 *  1. 数据用 model.js 的真实工厂构造，字段不会与 schema 漂移；
 *  2. 生成前跑 M.assertMigration（父母不悬空、耳号不重号、gt 取值合法），
 *     断言不过直接报错，绝不把坏数据塞进程序；
 *  3. 30 只鼠的手工表格可读性远高于 JSON，日后加一代人只需改表。
 *
 * 运行：node build/make-demo-seed.js
 *
 * ⚠️ 本文件里的全部数据均为虚构示例（耳号、笼位、日期、家系），
 *    不含任何真实实验数据；位点用通用名（目标基因-Flox / 目标基因-KO / Cre 驱动系）。
 */
const fs = require('fs');
const path = require('path');

// 让 renderer 的 IIFE 模块能挂载到 window.CKO
global.window = {};
require('../src/renderer/core/model.js');
require('../src/renderer/core/templates.js');
const CKO = global.window.CKO;
const M = CKO.model;
const T = CKO.templates;

const loci = T.seedArchive().loci;          // target_flox / target_ko / cre
const targets = T.defaultTargets();          // cko：KO 有带 + Cre 2 条带 + Flox 无带
const LX = { flox: 'target_flox', ko: 'target_ko', cre: 'cre' };

// 条带数（仅用于展示，二倍体模型下与取值一一对应）
const BANDS = {
  target_flox: { double: 2, single: 1, none: 0 },
  target_ko: { pos: 1, neg: 0 },
  cre: { double: 2, single: 1, none: 0 }
};

function gtOf(flox, ko, cre, opt = {}) {
  const out = {};
  if (flox) out[LX.flox] = entry(LX.flox, flox, opt);
  if (ko) out[LX.ko] = entry(LX.ko, ko, opt);
  if (cre) out[LX.cre] = entry(LX.cre, cre, opt);
  return out;
}
function entry(locusId, call, opt) {
  return {
    call,
    bands: BANDS[locusId][call],
    date: opt.date || null,
    raw: opt.raw || null,
    prev: opt.prev || null,
    src: 'stated',
    locusVersion: 1
  };
}

// ── 家系表 ───────────────────────────────────────────────────────────
// [耳号, 性别, 出生, 笼位, 父, 母, flox, ko, cre, 破壳/状态]
const F0 = [
  [101, 'M', '2025-11-05', 'B1', null, null, 'double', 'neg', 'none', 'alive', '外部引进种鼠'],
  [102, 'F', '2025-11-08', 'B1', null, null, 'double', 'neg', 'double', 'alive', '外部引进种鼠，Cre 阳性'],
  [103, 'M', '2025-11-20', 'B2', null, null, 'single', 'neg', 'double', 'alive', '外部引进种鼠'],
  [104, 'F', '2025-11-22', 'B2', null, null, 'double', 'neg', 'none', 'alive', '外部引进种鼠']
];

// F1：L1 = 101 × 102，L2 = 103 × 104
const F1 = [
  [201, 'M', '2026-02-14', 'B3', 101, 102, 'none', 'pos', 'double', 'alive', 'L1，留种与 203 配种'],
  [202, 'M', '2026-02-14', 'C1', 101, 102, 'none', 'pos', 'double', 'alive', 'L1，2026-06 复检改判'],
  [203, 'F', '2026-02-14', 'B3', 101, 102, 'none', 'pos', 'double', 'alive', 'L1，留种与 201 配种'],
  [204, 'F', '2026-02-14', 'C3', 101, 102, 'single', 'neg', 'double', 'alive', 'L1'],
  [205, 'M', '2026-02-14', 'C2', 101, 102, 'single', 'neg', 'none', 'culled', 'L1，基因型不符，2026-04-02 淘汰'],
  [226, 'F', '2026-02-14', 'C3', 101, 102, 'double', 'neg', 'single', 'alive', 'L1，原耳号 206，耳标脱落后重编'],
  [207, 'M', '2026-02-14', 'C1', 101, 102, 'none', 'pos', 'single', 'alive', 'L1'],
  [208, 'F', '2026-02-14', 'C3', 101, 102, 'double', 'neg', 'double', 'alive', 'L1'],
  [209, 'M', '2026-02-16', 'B4', 103, 104, 'none', 'pos', 'double', 'alive', 'L2，留种与 214 配种'],
  [210, 'F', '2026-02-16', 'C4', 103, 104, 'none', 'pos', 'double', 'alive', 'L2'],
  [211, 'M', '2026-02-16', 'C2', 103, 104, 'single', 'neg', 'double', 'alive', 'L2'],
  [212, 'M', '2026-02-16', 'C2', 103, 104, 'double', 'neg', 'none', 'alive', 'L2'],
  [213, 'F', '2026-02-16', 'C4', 103, 104, 'single', 'neg', 'single', 'alive', 'L2'],
  [214, 'F', '2026-02-16', 'B4', 103, 104, 'none', 'pos', 'double', 'alive', 'L2，留种与 209 配种'],
  [215, 'F', '2026-02-16', 'C4', 103, 104, 'double', 'neg', 'double', 'alive', 'L2'],
  [216, 'M', '2026-02-16', 'C2', 103, 104, 'none', 'neg', 'none', 'alive', 'L2']
];

// F2：L3 = 201 × 203（已断奶）；L4 = 209 × 214（未断奶，尚未剪尾鉴定）
const F2 = [
  [301, 'M', '2026-07-20', 'C5', 201, 203, 'none', 'pos', 'double', 'alive', 'L3，已断奶'],
  [302, 'F', '2026-07-20', 'C6', 201, 203, 'none', 'pos', 'double', 'alive', 'L3，已断奶'],
  [303, 'M', '2026-07-20', 'C5', 201, 203, 'none', 'pos', 'single', 'alive', 'L3，已断奶'],
  [304, 'F', '2026-07-20', 'C6', 201, 203, 'single', 'neg', 'double', 'alive', 'L3，已断奶'],
  [305, 'M', '2026-07-20', 'C5', 201, 203, 'double', 'neg', 'none', 'alive', 'L3，已断奶'],
  [306, 'F', '2026-07-20', 'C6', 201, 203, 'none', 'pos', 'double', 'alive', 'L3，已断奶'],
  [307, 'M', '2026-07-22', 'B4', 209, 214, null, null, null, 'alive', 'L4，未断奶、尚未剪尾鉴定'],
  [308, 'F', '2026-07-22', 'B4', 209, 214, null, null, null, 'alive', 'L4，未断奶、尚未剪尾鉴定'],
  [309, 'M', '2026-07-22', 'B4', 209, 214, null, null, null, 'alive', 'L4，未断奶、尚未剪尾鉴定'],
  [310, 'F', '2026-07-22', 'B4', 209, 214, null, null, null, 'alive', 'L4，未断奶、尚未剪尾鉴定']
];

const LITTER = {};
['201', '202', '203', '204', '205', '226', '207', '208'].forEach(t => LITTER[t] = 'L1');
['209', '210', '211', '212', '213', '214', '215', '216'].forEach(t => LITTER[t] = 'L2');
['301', '302', '303', '304', '305', '306'].forEach(t => LITTER[t] = 'L3');
['307', '308', '309', '310'].forEach(t => LITTER[t] = 'L4');

const WEANED = {
  '201': '2026-03-16', '202': '2026-03-16', '203': '2026-03-16', '204': '2026-03-16',
  '205': '2026-03-16', '226': '2026-03-16', '207': '2026-03-16', '208': '2026-03-16',
  '209': '2026-03-18', '210': '2026-03-18', '211': '2026-03-18', '212': '2026-03-18',
  '213': '2026-03-18', '214': '2026-03-18', '215': '2026-03-18', '216': '2026-03-18',
  '301': '2026-08-17', '302': '2026-08-17', '303': '2026-08-17',
  '304': '2026-08-17', '305': '2026-08-17', '306': '2026-08-17'
};

const rows = [].concat(F0, F1, F2);
const idOf = {};
rows.forEach((r, i) => idOf[String(r[0])] = i + 1);

const rats = rows.map(r => {
  const [tag, sex, birth, cage, sire, dam, flox, ko, cre, status, note] = r;
  const t = String(tag);
  const gt = gtOf(flox, ko, cre);
  // 202 演示「复检改判」：旧值留在 prev 里，可追溯
  if (t === '202') {
    gt[LX.ko] = entry(LX.ko, 'pos', { prev: 'neg', date: '2026-06-18', raw: '复检：有带（原判无带）' });
    gt[LX.ko].src = 'recheck';
  }
  if (flox) { gt[LX.flox].date = LITTER[t] === 'L3' ? '2026-08-14' : (LITTER[t] === 'L1' || LITTER[t] === 'L2') ? '2026-03-12' : '2026-01-08'; }
  const events = [];
  if (sire == null) events.push(M.makeRatEvent({ kind: 'note', date: '2025-11-28', text: '种鼠引进并建档' }));
  if (t === '226') events.push(M.makeRatEvent({ kind: 'note', date: '2026-05-08', text: '耳标脱落，原耳号 206 注销，重编为 226' }));
  if (status === 'culled') events.push(M.makeRatEvent({ kind: 'culled', date: '2026-04-02', text: '淘汰：目标基因-KO 无带、Flox 非无带，不符合留种要求' }));
  if (WEANED[t]) events.push(M.makeRatEvent({ kind: 'wean', date: WEANED[t], text: '断奶并转入 ' + cage + ' 笼' }));
  if (LITTER[t]) events.push(M.makeRatEvent({ kind: 'birth', date: birth, text: '出生（' + LITTER[t] + '）' }));
  return M.makeRat({
    id: idOf[t], tag: t, sex, birth, litter: LITTER[t] || null,
    status, statusDate: status === 'culled' ? '2026-04-02' : null,
    sire: sire == null ? null : idOf[String(sire)],
    dam: dam == null ? null : idOf[String(dam)],
    cage, cageSince: WEANED[t] || birth, weaned: WEANED[t] || null,
    note, source: sire == null ? '外部引进' : '自繁', gt, events,
    batch: null, batches: [], createdAt: birth, updatedAt: birth
  });
});

// ── 配种事件（写在母鼠与父鼠时间线上）───────────────────────────────
function addEvent(tag, kind, date, text) {
  const r = rats.find(x => x.tag === tag);
  if (r) r.events.push(M.makeRatEvent({ kind, date, text }));
}
addEvent('102', 'cross', '2025-12-01', '与 101 同笼配种（B1 繁殖笼）');
addEvent('101', 'cross', '2025-12-01', '与 102 同笼配种（B1 繁殖笼）');
addEvent('104', 'cross', '2025-12-05', '与 103 同笼配种（B2 繁殖笼）');
addEvent('103', 'cross', '2025-12-05', '与 104 同笼配种（B2 繁殖笼）');
addEvent('203', 'cross', '2026-06-10', '与 201 同笼配种（B3 繁殖笼）');
addEvent('201', 'cross', '2026-06-10', '与 203 同笼配种（B3 繁殖笼）');
addEvent('214', 'cross', '2026-06-12', '与 209 同笼配种（B4 繁殖笼）');
addEvent('209', 'cross', '2026-06-12', '与 214 同笼配种（B4 繁殖笼）');
addEvent('202', 'note', '2026-06-18', '复检改判：目标基因-KO 由无带改判为有带');
addEvent('301', 'note', '2026-08-17', '判为目标鼠，留养待用');
addEvent('302', 'note', '2026-08-17', '判为目标鼠，留养待用');
addEvent('306', 'note', '2026-08-17', '判为目标鼠，留养待用');

// ── 鉴定批次 ─────────────────────────────────────────────────────────
function lane(i, tag) {
  const r = rats.find(x => x.tag === tag);
  const gts = Object.entries(r.gt).map(([locus, v]) => ({
    locus, call: v.call, sure: true, bands: v.bands, raw: v.raw, src: v.src
  }));
  return { idx: i, tag, type: 'sample', sex: r.sex === 'M' ? '雄' : '雌', warn: [], gts, raw: tag, ratId: r.id };
}
function mkSession(seq, date, note, tags) {
  return M.makeSession({
    id: seq, seq, date, note, lanes: tags.map((t, i) => lane(i + 1, t)),
    images: [], kind: 'genotyping', source: 'manual', rawStmt: note,
    targetId: 'cko'
  });
}

const sessions = [
  mkSession(1, '2026-01-08', '种鼠引进后复检（4 只）', ['101', '102', '103', '104']),
  mkSession(2, '2026-03-12', 'F1 断奶前剪尾鉴定（L1 / L2 共 16 只）',
    ['201', '202', '203', '204', '205', '226', '207', '208', '209', '210', '211', '212', '213', '214', '215', '216']),
  mkSession(3, '2026-06-18', 'F1 复检与选种（其中 202 一例改判）', ['202', '207', '209', '210', '214']),
  mkSession(4, '2026-08-14', 'F2 剪尾鉴定（L3 共 6 只）', ['301', '302', '303', '304', '305', '306'])
];

// ── 项目 ─────────────────────────────────────────────────────────────
const project = M.makeProject({
  id: 'demo-project',
  code: 'DEMO-01',
  title: '示例项目 · 三代繁育与笼位',
  owner: '',
  species: 'rat', speciesLabel: '大鼠',
  strain: '目标基因-Flox × Cre 驱动系（SD 大鼠）',
  meta: {
    goalSpec: '示例：展示父本母本溯源、世代分层、笼位分组与鉴定批次的组织方式。',
    goal: '目标鼠 = 目标基因-KO 有带 + Cre 2 条带 + Flox 无带。',
    goalNote: '本示例数据全部虚构，仅用于演示界面与流程，可直接删除。',
    note: ''
  },
  loci, targets
});

// 生成前断言：父母不悬空 / 耳号不重号 / gt 取值合法 / 目标规则可解析
M.assertMigration(project, rats);
const hits = rats.filter(r => M.targetHits(r, targets, loci).length > 0);
if (!hits.length) throw new Error('示例数据没有任何鼠命中目标，示例失去意义');

// ── 输出 ─────────────────────────────────────────────────────────────
const cages = [...new Set(rats.map(r => r.cage).filter(Boolean))];
const seed = { version: 1, generatedAt: new Date().toISOString(), project, rats, sessions };
const out = path.join(__dirname, '..', 'src', 'renderer', 'seed', 'demo.js');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out,
  '// 由 build/make-demo-seed.js 生成，请勿手改（改数据请改生成器再重跑）。\n' +
  '// 全部内容为虚构示例，不含真实实验数据。\n' +
  'window.CKO = window.CKO || {};\n' +
  'window.CKO.seedDemo = ' + JSON.stringify(seed, null, 1) + ';\n');

console.log('OK 写入 ' + path.relative(path.join(__dirname, '..'), out));
console.log('   鼠只 ' + rats.length + ' 只 / 笼位 ' + cages.length + ' 个（' + cages.join(' ') + '）');
console.log('   批次 ' + sessions.length + ' 个 / 命中目标 ' + hits.length + ' 只');
console.log('   世代：F0 ' + F0.length + ' / F1 ' + F1.length + ' / F2 ' + F2.length);
