'use strict';
/**
 * verify-dictation-v2.js — 「口述录入 v2」的容忍写法与安全边界回归。
 *
 * 这份测试盯的是**别改坏**的那几条底线：
 *   · 写法变体能认（全角竖线/等号/中文冒号/中文逗号、缺分隔符、等号后空格、
 *     取值内部空格、`=~v` / `X~v` / `X=?` / `X?`、别名与简写、乘号写法）
 *   · 「未提及」≠「阴性」：`?` 走 omitted，不落进 cells，也不会被当成无带
 *   · 认不出来就报错并给出可选项（未知位点/未知取值/归档位点）
 *   · 危险动作宁可拦：重复耳号 = 整段 fatal；谱系自引/父=母/找不到/成环 = 硬错
 *   · 整批默认与行内取值分清 src（batch-stated vs stated）
 *
 * 运行：node tests/verify-dictation-v2.js
 */
const fs = require('fs');
const path = require('path');
global.window = {};
function load(f) { (0, eval)(fs.readFileSync(f, 'utf8')); }
const ROOT = path.join(__dirname, '..');
const CORE = path.join(ROOT, 'src', 'renderer', 'core') + '/';
['genetics.js', 'model.js', 'templates.js', 'migrate.js', 'parse.js'].forEach(f => load(CORE + f));
load(path.join(ROOT, 'src', 'renderer', 'seed', 'demo.js'));

const CKO = global.window.CKO;
const P = CKO.parse, M = CKO.model;
const base = CKO.seedDemo.project;
const clean = o => JSON.parse(JSON.stringify(o));

// 玩具项目：在示例项目上加一个归档位点、一个与保留键重名的位点
const toy = clean(base);
toy.loci.push({
  id: 'old_locus', name: '旧位点', short: 'OLD', type: 'target', model: 'biallelic',
  metric: 'bands', order: ['none', 'single', 'double'], labels: {}, archived: true
});
toy.loci.push({
  id: 'clash', name: '笼位', short: '', type: 'other', model: 'biallelic',
  metric: 'bands', order: ['none', 'single', 'double'], labels: {}
});

let pass = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else fails.push(msg); }
function eq(a, b, msg) { JSON.stringify(a) === JSON.stringify(b) ? pass++ : fails.push(msg + '（实际 ' + JSON.stringify(a) + '，期望 ' + JSON.stringify(b) + '）'); }
function has(hay, needle, msg) { String(hay || '').indexOf(needle) >= 0 ? pass++ : fails.push(msg + '（没找到「' + needle + '」，实际："' + String(hay || '').slice(0, 160) + '"）'); }
function P1(text, proj) { return P.parseEntries(text, proj || base); }
const lane = (d, tag) => d.lanes.find(l => l.tag === tag);
const cell = (d, tag, id) => (lane(d, tag) || { cells: {} }).cells[id];
const errs = d => d.lanes.map(l => l.errors.join('；')).join('；');
const warn = d => d.lanes.map(l => l.warnings.join('；')).concat(d.warnings).join('；');
const notes = d => d.notes.join('；');

console.log('口述录入 v2 回归\n');

// ───────────────────────── A 容忍写法 ─────────────────────────
console.log('A 容忍写法');
{
  // `=~v` 与 `X~v`：v1 只认 `X~v`，v2 两种都认，且都算「整批陈述」
  let d = P1('@日期 2026-09-18\n307 | M | 目标基因-KO=~有带');
  eq(cell(d, '307', 'target_ko'), { call: 'pos', src: 'batch-stated', bands: null, raw: '目标基因-KO=~有带' }, 'A1 `X=~v` 认得出，来源 batch-stated');

  d = P1('@日期 2026-09-18\n307 | M | 目标基因-KO~有带');
  eq(cell(d, '307', 'target_ko').call, 'pos', 'A2 `X~v` 认得出');
  eq(cell(d, '307', 'target_ko').src, 'batch-stated', 'A2 `X~v` 来源 batch-stated');

  d = P1('@日期 2026-09-18\n307 | M | 目标基因-KO ~ 有带');
  eq(cell(d, '307', 'target_ko').call, 'pos', 'A3 波浪线两边带空格也认');

  // ? = 未提及，不是阴性
  d = P1('@日期 2026-09-18\n307 | M | 目标基因-KO=?');
  ok(!cell(d, '307', 'target_ko'), 'A4 `X=?` 不落进鉴定格（不是阴性）');
  ok(lane(d, '307').omitted.includes('target_ko'), 'A4 `X=?` 记进 omitted（未提及清单）');
  eq(errs(d), '', 'A4 `X=?` 不算错');

  d = P1('@日期 2026-09-18\n307 | M | 目标基因-KO?');
  ok(lane(d, '307').omitted.includes('target_ko'), 'A5 `X?` 也认作未提及');

  d = P1('@日期 2026-09-18\n307 | M | 目标基因-KO=阴性');
  eq(cell(d, '307', 'target_ko').call, 'neg', 'A5b 「阴性」是明确的阴性，和 `?` 不同');
  eq(errs(d), '', 'A5b 「阴性」解析无报错');

  // 取值内部空格 + 别名/简写
  d = P1('@日期 2026-09-18\n307 | M | 目标基因-Flox=2 条带');
  eq(cell(d, '307', 'target_flox').call, 'double', 'A6 取值里的空格不拆坏（2 条带）');
  d = P1('@日期 2026-09-18\n307 | M | KO=有带 | Flox=双带');
  eq(cell(d, '307', 'target_ko').call, 'pos', 'A7 用简称 KO 认得出');
  eq(cell(d, '307', 'target_flox').call, 'double', 'A7 用简称 Flox + 别名「双带」');
  d = P1('@日期 2026-09-18\n307 | M | ko=有带');
  eq(cell(d, '307', 'target_ko').call, 'pos', 'A7b 简称大小写不敏感');

  // 全角/中文标点
  d = P1('@日期 2026-09-18\n301｜M｜目标基因-Flox：无带');
  eq(lane(d, '301').sex, 'M', 'A8 全角竖线 + 中文冒号切得开');
  eq(cell(d, '301', 'target_flox').call, 'none', 'A8 中文冒号当等号用');
  has(notes(d), '全角竖线', 'A8 备注里记下「全角竖线」');
  has(notes(d), '中文冒号', 'A8 备注里记下「中文冒号」');

  d = P1('@日期 2026-09-18\n@清空笼位 301，302、303');
  eq(d.session.clears, ['301', '302', '303'], 'A9 @清空笼位 支持中文逗号/顿号');

  d = P1('@日期 2026-09-18\n301 M');
  eq(lane(d, '301').sex, 'M', 'A10 缺竖线时按空白切（第二格像性别）');
  has(notes(d), '缺分隔符', 'A10 备注里记下「缺分隔符」');

  d = P1('@日期 2026-09-18\n307 | M | 目标基因-KO＝有带 | 目标基因-KO= 有带'.replace('｜', '|'));
  eq(cell(d, '307', 'target_ko').call, 'pos', 'A11 全角等号 / 等号后空格都认（取最后写的那个）');

  d = P1('@日期 2026年9月18日\n307 | M | KO=有带');
  eq(d.session.date, '2026-09-18', 'A12 中文年月日格式的日期');

  d = P1('@日期 2026-09-18\n307 | M | 父=209 母=214');
  eq(lane(d, '307').sire, { tag: '209', src: 'stated' }, 'A13 一格塞两个保留键字段：父');
  eq(lane(d, '307').dam, { tag: '214', src: 'stated' }, 'A13 一格塞两个保留键字段：母');

  d = P1('@日期 2026-09-18\n@配种 209 ✕ 214');
  eq(d.session.crosses[0], { sire: '209', dam: '214', cage: '' }, 'A14 ✕ 当乘号用');
  d = P1('@日期 2026-09-18\n@配种 209 * 214 B4');
  eq(d.session.crosses[0], { sire: '209', dam: '214', cage: 'B4' }, 'A14b * 当乘号用，尾巴是笼位');

  d = P1('@日期 2026-09-18\n@本批默认 目标基因-KO=~阳性\n307 | M | 目标基因-Flox=无带');
  eq(cell(d, '307', 'target_ko').call, 'pos', 'A15 @本批默认 里的 ~ 前缀不影响取值');
}

// ───────────────────────── B 认不出来就说清楚 ─────────────────────────
console.log('B 报错与提示');
{
  let d = P1('@日期 2026-09-18\n307 | M | 目标基因-XXL=有带');
  has(errs(d), '未知位点', 'B1 未知位点报错');
  has(errs(d), '本项目现有位点', 'B1 报错里带上现有位点');

  d = P1('@日期 2026-09-18\n307 | M | 目标基因-Flox=3条带');
  has(errs(d), '取值认不出', 'B2 未知取值报错');
  has(errs(d), '允许的取值', 'B2 报错里列出允许的取值');

  d = P1('@日期 2026-09-18\n307 | M | 旧位点=1条带', toy);
  has(errs(d), '已归档', 'B3 归档位点不再接受录入');
  eq(lane(d, '307').cells.old_locus, undefined, 'B3 归档位点不写进 cells');

  d = P1('@日期 2026-09-18\n307 | M | KO=有带\n307 | F | KO=无带');
  has(d.fatal.join('；'), '出现 2 次', 'B4 同一耳号两行 = fatal（改判请整行重写）');
  eq(d.fatal.length, 1, 'B4 一次重复只报一条 fatal');

  d = P1('@日期 2026-09-18\n@乱写的指令 xyz\n307 | M | KO=有带');
  has(d.warnings.join('；'), '未识别的指令', 'B5 未识别的 @ 指令给提示');
  eq(lane(d, '307').cells.target_ko.call, 'pos', 'B5 一条坏指令不影响后面的数据行');

  d = P1('@日期 2026-09-18\n这是一行完全看不懂的东西');
  has(d.warnings.join('；'), '缺少 | 分隔符', 'B6 认不出的行给提示而不是静默丢掉');

  d = P1('@日期 2026-09-18\n307 | M | 笼位=C5', toy);
  has(warn(d), '冲突', 'B7 位点名和保留键重名时给提示');
  eq(lane(d, '307').cage, { value: 'C5', src: 'stated' }, 'B7 冲突时按保留键处理（笼位）');

  d = P1('@日期 2026-09-18\n@本批默认 目标基因-XXL=有带\n307 | M | 目标基因-KO=有带');
  has(d.warnings.join('；'), '未知位点', 'B8 @本批默认 里的未知位点给提示');

  d = P1('@日期 2026-09-18\n@本批默认 目标基因-KO\n307 | M | 目标基因-KO=有带');
  has(d.warnings.join('；'), '格式应为', 'B9 @本批默认 格式错给提示');

  d = P1('307 | M | 目标基因-KO=有带');
  has(d.warnings.join('；'), '缺少 @日期', 'B10 没写 @日期 提醒（批次归不了档）');

  d = P1('@日期 2026-09-18\n@新生 窝=L5');
  has(d.warnings.join('；'), '没给出耳号', 'B11 @新生 没给仔= 给提示');
  has(d.warnings.join('；'), '未提供父本', 'B11 @新生 缺父本给提示');
  eq(d.newborns.length, 0, 'B11 没耳号的 @新生 不落库');

  d = P1('@日期 2026-09-18\n@配种 209');
  has(d.warnings.join('；'), '没认出一对耳号', 'B12 @配种 只给一只给提示');
  eq(d.session.crosses.length, 0, 'B12 认不出的配种不落库');

  d = P1('');
  eq([d.lanes.length, d.fatal.length], [0, 0], 'B13 空文本不产数据也不报 fatal');
  eq(d.warnings.length, 1, 'B13 空文本只剩「缺少 @日期」一条提示');
}

// ───────────────────────── C 语义安全：未提及 ≠ 阴性 ─────────────────────────
console.log('C 语义安全');
{
  const d = P1('@日期 2026-09-18\n307 | M | 目标基因-Flox=无带');
  eq(Object.keys(lane(d, '307').cells), ['target_flox'], 'C1 没写的位点不会自动补成阴性（cells 里只有写过的）');
  eq(lane(d, '307').omitted.sort(), ['cre', 'target_ko'], 'C1 没写的一律进「未提及」清单，供人工确认');

  const d2 = P1('@日期 2026-09-18\n@本批默认 目标基因-KO=有带\n307 | M | 目标基因-Flox=无带\n309 | F | 目标基因-KO=?');
  eq(cell(d2, '307', 'target_ko').src, 'batch-stated', 'C2 整批默认来的值标 batch-stated');
  eq(cell(d2, '309', 'target_ko'), undefined, 'C2 行内 `?` 能盖掉整批默认');
  ok(lane(d2, '309').omitted.includes('target_ko'), 'C2 行内 `?` → omitted');

  const d3 = P1('@日期 2026-09-18\n@本批默认 目标基因-KO=?\n307 | M | 目标基因-Flox=无带');
  ok(lane(d3, '307').omitted.includes('target_ko'), 'C3 @本批默认 也能整体标未提及');
  ok(!cell(d3, '307', 'target_ko'), 'C3 整批未提及不写进 cells');
}

// ───────────────────────── D 谱系安全阀（model.checkPedigree） ─────────────────────────
console.log('D 谱系安全阀');
{
  const rats = [
    { id: 'r1', tag: 'A', sex: 'M', sire: null, dam: null },
    { id: 'r2', tag: 'B', sex: 'F', sire: null, dam: null }
  ];
  let r = M.checkPedigree(rats.concat([{ id: 'r3', tag: 'C', sex: 'M', sire: 'r1', dam: 'r1' }]), {});
  has(r.errors.map(e => e.text).join('；'), '父与母不能是同一只鼠', 'D1 父=母 被拦下');

  r = M.checkPedigree(rats.concat([{ id: 'r4', tag: 'D', sex: 'M', sire: 'r4', dam: null }]), {});
  has(r.errors.map(e => e.text).join('；'), '父不能是它自己', 'D2 自己当自己的父被拦下');

  r = M.checkPedigree(rats.concat([{ id: 'r5', tag: 'E', sex: 'M', sire: 'nope', dam: null }]), {});
  has(r.errors.map(e => e.text).join('；'), '在项目里找不到', 'D3 父耳号不存在被拦下');

  const cyc = [
    { id: 'a', tag: 'A', sex: 'M', sire: 'b', dam: null },
    { id: 'b', tag: 'B', sex: 'M', sire: 'a', dam: null }
  ];
  r = M.checkPedigree(cyc, {});
  has(r.errors.map(e => e.text).join('；'), '谱系成环', 'D4 成环被拦下');

  r = M.checkPedigree(rats.concat([{ id: 'c', tag: 'C', sex: 'M', sire: 'r1', dam: 'r2' }]), {});
  eq(r.errors.length, 0, 'D5 正常谱系无硬错');
  r = M.checkPedigree(rats.concat([{ id: 'c', tag: 'C', sex: 'M', sire: 'r2', dam: 'r1' }]), {});
  eq(r.errors.length, 0, 'D5b 性别错位不算硬错（只告警）');
  has(r.warnings.map(w => w.text).join('；'), '记录为雌性', 'D5b 拿雌鼠当父本给告警');
  has(r.warnings.map(w => w.text).join('；'), '记录为雄性', 'D5b 拿雄鼠当母本给告警');

  // 预览期就能拦：pending 覆盖了某只鼠的父本
  r = M.checkPedigree([{ id: 'p', tag: 'P', sex: 'M', sire: null, dam: null }], { p: { sire: 'p' , dam: null } });
  has(r.errors.map(e => e.text).join('；'), '父不能是它自己', 'D6 预览里的改动同样走安全阀');
}

// ───────────────────────── E 指令落点 ─────────────────────────
console.log('E 指令落点');
{
  let d = P1('@日期 2026-09-18\n@笼位 C5\n301 | M | 笼=C1\n302 | F');
  eq(lane(d, '301').cage, { value: 'C1', src: 'stated' }, 'E1 行内笼位压过整批笼位');
  eq(lane(d, '302').cage, { value: 'C5', src: 'batch-stated' }, 'E1 没写的走整批笼位');

  d = P1('@日期 2026-09-18\n@笼位 C5\n301 | M | 笼=');
  eq(lane(d, '301').cage, { clear: true, src: 'stated' }, 'E2 行内 `笼=` 表示移出笼位');

  d = P1('@日期 2026-09-18\n@新生 出生=2026-09-10 窝=L5 父=209 母=214 笼=B4 仔=311 312♀ 313');
  eq(d.newborns[0].tags, [{ tag: '311', sex: '' }, { tag: '312', sex: 'F' }, { tag: '313', sex: '' }], 'E3 一窝多仔，能带性别');

  d = P1('@日期 2026-09-18\n@泳道顺序 302 301\n1 | M | 目标基因-KO=有带\n2 | F | 目标基因-KO=无带');
  eq(d.lanes.map(l => l.tag), ['302', '301'], 'E4 @泳道顺序 把「1 2」映射成真实耳号');

  d = P1('@日期 2026-09-18\n@项目 口述演示\n@目标 ' + (base.targets[0] ? base.targets[0].name : 'x') + '\n307 | M | 目标基因-KO=有带');
  eq(d.session.project, '口述演示', 'E5 @项目 落到 session.project');
  ok(d.session.targetId != null, 'E5 @目标 按名字能匹配到目标定义');
}

// ── 汇报 ──
console.log('\n断言 ' + (pass + fails.length) + ' 条，通过 ' + pass + '，失败 ' + fails.length);
if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('DICTATION V2 OK');
