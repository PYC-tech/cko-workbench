'use strict';
/**
 * verify-demo-dictation.js — 演示口述文本回归。
 *
 * 做两件事：
 *   1) 把 docs/口述录入示例.md 里**每一段** ```dictation 代码块取出来，
 *      在内置示例项目（src/renderer/seed/demo.js）下解析，要求 **零 fatal、零行内 error**
 *      ——这份文档是发给用户照抄的，任何一段解析不动就是文档坏了。
 *   2) 抽查关键场景的语义是否仍然是文档承诺的那几条：
 *      「本批默认」写成 batch-stated、? = omitted（未提及≠阴性）、
 *      笼位不写就不动、@清空笼位 / @配种 / @新生 的落点、目标鼠判定。
 *
 * 运行：node tests/verify-demo-dictation.js
 */
const fs = require('fs');
const path = require('path');
global.window = {};
function load(f) { (0, eval)(fs.readFileSync(f, 'utf8')); }
const ROOT = path.join(__dirname, '..');
const CORE = path.join(ROOT, 'src', 'renderer', 'core') + '/';
load(CORE + 'genetics.js');
load(CORE + 'model.js');
load(CORE + 'templates.js');
load(CORE + 'migrate.js');
load(CORE + 'parse.js');
load(path.join(ROOT, 'src', 'renderer', 'seed', 'demo.js'));

const CKO = global.window.CKO;
const demo = CKO.seedDemo;
const proj = demo.project;
const DOC = path.join(ROOT, 'docs', '口述录入示例.md');

let pass = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else fails.push(msg); }
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) pass++; else fails.push(msg + '（实际 ' + a + '，期望 ' + e + '）');
}

// ── 取出文档里的 dictation 代码块 ──
const doc = fs.readFileSync(DOC, 'utf8');
const blocks = [];
const re = /```dictation\s+([A-Za-z0-9_.-]+)\n([\s\S]*?)```/g;
let m;
while ((m = re.exec(doc)) !== null) blocks.push({ name: m[1], body: m[2] });

ok(blocks.length >= 10, '文档里的 dictation 代码块至少 10 段（实际 ' + blocks.length + '）');
if (!blocks.length) { console.error('没取到任何 dictation 代码块：' + DOC); process.exit(1); }

function parseBlock(name) {
  const b = blocks.find(x => x.name === name);
  if (!b) { fails.push('文档里找不到代码块 ' + name); return null; }
  return { block: b, draft: CKO.parse.parseEntries(b.body, proj) };
}
// 把某个泳道的鉴定结果拼成 rat.gt，用来判目标鼠
function laneGt(lane) {
  const gt = {};
  Object.keys(lane.cells || {}).forEach(id => {
    const c = lane.cells[id];
    if (c && c.call != null) gt[id] = { call: c.call };
  });
  return gt;
}
function laneOf(draft, tag) { return draft.lanes.find(l => l.tag === tag); }
function targetTags(draft) {
  return draft.lanes.filter(l => CKO.model.isTarget({ gt: laneGt(l) }, proj.targets, proj.loci)).map(l => l.tag);
}

// ── 第一轮：每段都必须干净解析 ──
console.log('内置示例项目 loci: ' + proj.loci.map(l => l.name).join(' / '));
console.log('文档: docs/口述录入示例.md（' + blocks.length + ' 段）\n');
blocks.forEach(b => {
  const d = CKO.parse.parseEntries(b.body, proj);
  const lineErrs = d.lanes.filter(l => (l.errors || []).length).map(l => l.tag + ':' + l.errors.join('；'));
  ok(d.fatal.length === 0, b.name + ' 无 fatal（' + d.fatal.join('；') + '）');
  ok(lineErrs.length === 0, b.name + ' 无行内错误（' + lineErrs.join(' / ') + '）');
  ok(d.lanes.length + d.newborns.length + (d.session.crosses || []).length + (d.session.clears || []).length > 0,
    b.name + ' 至少解析出一样东西（泳道/新生/配种/清空笼位）');
  console.log('  ' + (d.fatal.length || lineErrs.length ? '✗' : '✓') + ' ' + b.name +
    '  lanes=' + d.lanes.length +
    '  newborns=' + d.newborns.length +
    '  crosses=' + (d.session.crosses || []).length +
    '  clears=' + (d.session.clears || []).length +
    (d.warnings.length ? '  警告:' + d.warnings.join('；') : ''));
});

// ── 第二轮：关键语义抽查 ──
const s1 = parseBlock('demo_l4_genotyping');
if (s1) {
  const d = s1.draft;
  eq(d.lanes.length, 4, '场景一：4 个泳道');
  const l307 = laneOf(d, '307'), l309 = laneOf(d, '309');
  ok(l307 && l307.cells.target_ko && l307.cells.target_ko.call === 'pos', '场景一：307 的 KO 来自本批默认 = pos');
  eq(l307 && l307.cells.target_ko && l307.cells.target_ko.src, 'batch-stated', '场景一：307 KO 的来源标记 batch-stated');
  ok(l309 && l309.omitted.includes('cre') && !l309.cells.cre, '场景一：309 的 Cre 是「未提及」而不是阴性');
  eq(d.lanes.filter(l => l.omitted.includes('cre')).map(l => l.tag), ['309'], '场景一：只有 309 的 Cre 未提及');
  eq(targetTags(d).sort(), ['307', '310'], '场景一：目标鼠应为 307 与 310');
  ok(d.session.note.indexOf('未提及') >= 0, '场景一：@备注 原样保留');
  eq(d.session.date, '2026-09-18', '场景一：@日期 解析为 2026-09-18');
}

const s2 = parseBlock('demo_recheck');
if (s2) {
  const d = s2.draft;
  ok(laneOf(d, '207').cells.target_ko.call === 'neg', '场景二：207 KO = 阴性（复检改判，该位点是二值判读）');
  ok(laneOf(d, '216').cells.target_ko.call === 'pos', '场景二：216 KO = pos（复检改判）');
}

const s4a = parseBlock('cage_per_rat');
if (s4a) {
  const d = s4a.draft;
  eq(laneOf(d, '301').cage, { value: 'C5', src: 'stated' }, '场景四①：301 笼位 C5');
  eq(laneOf(d, '302').cage, { value: 'C6', src: 'stated' }, '场景四①：302 笼位 C6');
  eq(Object.keys(laneOf(d, '301').cells).length, 0, '场景四①：纯笼位行不该补出鉴定格');
  eq(laneOf(d, '301').omitted.length, 0, '场景四①：纯笼位行不该补出「未提及」');
}

const s4b = parseBlock('cage_batch');
if (s4b) {
  const d = s4b.draft;
  eq(laneOf(d, '301').cage, { value: 'C5', src: 'batch-stated' }, '场景四②：@笼位 整批兜底 C5');
  eq(laneOf(d, '302').cage, { value: 'C5', src: 'batch-stated' }, '场景四②：302 走整批笼位');
  eq(laneOf(d, '303').cage, { value: 'C1', src: 'stated' }, '场景四②：行内 笼= 优先于 @笼位');
}

const s4c = parseBlock('cage_cross');
if (s4c) {
  const d = s4c.draft;
  eq(d.session.crosses.length, 1, '场景四③：@配种 记一条配种事件');
  eq(d.session.crosses[0], { sire: '209', dam: '214', cage: 'B4' }, '场景四③：配种父母与笼位');
  eq(d.lanes.length, 0, '场景四③：@配种 只有事件，不该产出泳道');
}

const s4d = parseBlock('cage_clear');
if (s4d) {
  const d = s4d.draft;
  eq(d.session.clears, ['301', '302'], '场景四④：@清空笼位 记下 301 302');
  eq(laneOf(d, '303').cage, { clear: true, src: 'stated' }, '场景四④：行内 笼= 表示移出笼位');
  ok(!laneOf(d, '301') && !laneOf(d, '302'), '场景四④：被 @清空笼位 提到的鼠不该另起泳道');
}

const s5a = parseBlock('pedigree_fix');
if (s5a) {
  const d = s5a.draft;
  eq(laneOf(d, '307').sire, { tag: '209', src: 'stated' }, '场景五①：307 父=209');
  eq(laneOf(d, '307').dam, { tag: '210', src: 'stated' }, '场景五①：307 母=210');
  ok(laneOf(d, '308').sire === null, '场景五①：308 没提父本 → 不改动（null，而非清空）');
  eq(laneOf(d, '308').dam, { tag: '212', src: 'stated' }, '场景五①：308 母=212');
}

const s5b = parseBlock('pedigree_newborn');
if (s5b) {
  const d = s5b.draft;
  eq(d.newborns.length, 1, '场景五②：一条 @新生');
  const nb = d.newborns[0];
  eq(nb.tags.map(t => t.tag), ['311', '312', '313'], '场景五②：仔= 三只耳号');
  eq(nb.tags.map(t => t.sex), ['', 'F', ''], '场景五②：312♀ 记性别，其余留空待定');
  eq([nb.birth, nb.litter, nb.sire, nb.dam, nb.cage], ['2026-09-10', 'L5', '209', '214', 'B4'], '场景五②：出生/窝/父/母/笼');
}

const s5c = parseBlock('pedigree_cross_only');
if (s5c) {
  const d = s5c.draft;
  eq(d.session.crosses.length, 1, '场景五③：@配种 无笼位也认');
  eq(d.session.crosses[0].cage, '', '场景五③：没写笼位则留空');
}

const s6 = parseBlock('mixed');
if (s6) {
  const d = s6.draft;
  const l307 = laneOf(d, '307');
  eq(l307.cage, { value: 'B4', src: 'stated' }, '场景六：307 笼位与鉴定同段');
  eq(l307.sire, { tag: '209', src: 'stated' }, '场景六：307 父=209');
  eq(l307.dam, { tag: '214', src: 'stated' }, '场景六：307 母=214');
  ok(laneOf(d, '309').omitted.includes('cre'), '场景六：309 Cre 仍未提及');
  eq(targetTags(d).sort(), ['307', '310'], '场景六：目标鼠仍为 307 与 310');
}

// ── 汇报 ──
console.log('\n断言 ' + (pass + fails.length) + ' 条，通过 ' + pass + '，失败 ' + fails.length);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('DEMO DICTATION OK');
