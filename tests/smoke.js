'use strict';
// 纯逻辑回归：加载 core 模块（无 Electron 依赖），用样例台账跑迁移与口述解析。
const fs = require('fs');
const path = require('path');
global.window = {};
function load(f) { const code = fs.readFileSync(f, 'utf8'); (0, eval)(code); }
const D = path.join(__dirname, '..', 'src', 'renderer', 'core') + '/';
load(D + 'genetics.js'); load(D + 'model.js'); load(D + 'templates.js'); load(D + 'migrate.js'); load(D + 'parse.js');
const CKO = global.window.CKO;
console.log('modules:', Object.keys(CKO).join(', '));

// 1) migrate（样例台账，数据均为虚构）
const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'ledger-sample.html'), 'utf8');
const data = CKO.migrate.extractLedgerData(html);
const out = CKO.migrate.transform(data);
console.log('迁移 rats=', out.rats.length, 'sessions=', out.sessions.length, 'loci=', out.project.loci.length, 'targets=', out.project.targets.length);
const hits = out.rats.filter(r => CKO.model.isTarget(r, out.project.targets, out.project.loci)).map(r => r.tag);
console.log('目标鼠命中:', hits.join(','), '（应为 001,005）');

// 2) parse：未提及 ≠ 阴性（用通用位点名 flox / ko / cre）
const proj = out.project;
const dsl = ['@日期 2026-01-10', '@泳道顺序 001 002',
  '001 | F | flox=none | ko=pos | cre=?',
  '002 | M | flox=none | ko=pos | cre=double'].join('\n');
const draft = CKO.parse.parseEntries(dsl, proj);
const l1 = draft.lanes[0];
console.log('\n解析 lanes=', draft.lanes.length);
console.log('001 cre 单元格:', JSON.stringify(l1.cells['cre'] || null), 'omitted中cre?', l1.omitted.includes('cre'));
console.log('断言 001 cre omitted 且无 call:', l1.omitted.includes('cre') && !(l1.cells['cre']));
console.log('002 cre 单元格:', JSON.stringify(draft.lanes[1].cells['cre']));

// 3) 未提及且模板无默认值 → omitted（不臆造）
const d2 = CKO.parse.parseEntries('001 | F | flox=none | ko=pos', proj);
console.log('\n未提及 cre（模板无默认值）→', JSON.stringify(d2.lanes[0].cells['cre'] || null), 'inOmitted:', d2.lanes[0].omitted.includes('cre'));

// 4) 批次级默认 ~
const d3 = CKO.parse.parseEntries('@本批默认 ko=pos\n001 | F | flox=none | cre=double', proj);
console.log('批次默认 001 ko:', JSON.stringify(d3.lanes[0].cells['target_ko']));

// 5) 遗传学：跨位点杂交概率（transgenic 双带×双带 仍判携带）
const creLocus = proj.loci.find(l => l.id === 'cre');
const cross = CKO.genetics.crossLocus('double', 'double', creLocus);
console.log('\nCre 双带×双带 交配概率:', JSON.stringify(cross), '（double 为 0.75：纯合携带仍按转基因品系判为携带）');

console.log('\nSMOKE OK');
