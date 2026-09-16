'use strict';
/**
 * migrate.js — 从本工具早期版本导出的「单文件 HTML 台账」抽取数据并转换为 v3。
 * 早期版本把数据内嵌为 `const LEDGER_DATA = {...}`，位点/目标定义在
 * `const LOCI = [...]` 与 `const TARGETS = [...]` 里；迁移会**原样带上这些定义**，
 * 因此不依赖任何内置模板，任何人的台账都能导入。
 * 纪律：迁移前跑断言，任一不过则抛错，绝不静默塞数。
 */
(function (CKO) {
  const M = CKO.model;

  // 从源码文本里按标记定位并抽取一个配平的对象/数组字面量（正确跳过字符串与转义）
  function extractBalanced(html, marker, open, close) {
    const i = html.indexOf(marker);
    if (i < 0) return null;
    let p = i + marker.length;
    while (p < html.length && html[p] !== open) p++;
    let depth = 0, j = p, quote = null, esc = false;
    for (; j < html.length; j++) {
      const c = html[j];
      if (quote) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      else if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) break; }
    }
    return parseJsLiteral(html.slice(p, j + 1));
  }

  // 不依赖 eval 的 JS 对象/数组字面量解析器。
  // 不用 JSON.parse：历史台账里 LOCI/TARGETS 是 JS 字面量（单引号 + 注释 + 尾逗号）；
  // 不用 new Function：渲染层 CSP 禁止 eval。这里手写一个够用的 tokenizer。
  function parseJsLiteral(src) {
    let i = 0;
    function skipWs() {
      for (;;) {
        while (i < src.length && /\s/.test(src[i])) i++;
        if (src[i] === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (src[i] === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
        break;
      }
    }
    function parseString() {
      const q = src[i++]; let out = '';
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') { const n = src[i + 1]; out += (n === 'n' ? '\n' : n === 't' ? '\t' : n); i += 2; }
        else out += src[i++];
      }
      i++; return out;
    }
    function parseValue() {
      skipWs();
      const c = src[i];
      if (c === '{') {
        i++; const o = {}; skipWs(); if (src[i] === '}') { i++; return o; }
        for (;;) {
          skipWs(); let k;
          if (src[i] === '"' || src[i] === "'") k = parseString();
          else { let s = ''; while (i < src.length && /[A-Za-z0-9_$]/.test(src[i])) s += src[i++]; k = s; }
          skipWs(); if (src[i] === ':') i++;
          o[k] = parseValue(); skipWs();
          if (src[i] === ',') { i++; continue; }
          if (src[i] === '}') { i++; return o; }
          throw new Error('bad object literal');
        }
      }
      if (c === '[') {
        i++; const a = []; skipWs(); if (src[i] === ']') { i++; return a; }
        for (;;) {
          a.push(parseValue()); skipWs();
          if (src[i] === ',') { i++; continue; }
          if (src[i] === ']') { i++; return a; }
          throw new Error('bad array literal');
        }
      }
      if (c === '"' || c === "'") return parseString();
      if (src.startsWith('true', i)) { i += 4; return true; }
      if (src.startsWith('false', i)) { i += 5; return false; }
      if (src.startsWith('null', i)) { i += 4; return null; }
      let n = ''; while (i < src.length && /[-+0-9.eE]/.test(src[i])) n += src[i++];
      if (n) return Number(n);
      throw new Error('unexpected token at ' + i);
    }
    return parseValue();
  }

  function extractLedgerData(html) {
    const ledger = extractBalanced(html, 'const LEDGER_DATA = ', '{', '}');
    if (!ledger) throw M.mk('E_BAD_ARG', 'HTML 中找不到 LEDGER_DATA');
    const loci = extractBalanced(html, 'const LOCI = ', '[', ']') || [];
    const targets = extractBalanced(html, 'const TARGETS = ', '[', ']') || [];
    return { ledger, loci, targets };
  }

  function transform(extracted, opts) {
    const data = (extracted && extracted.ledger) ? extracted.ledger : (extracted || {});
    const srcLoci = (extracted && extracted.loci) || [];
    const srcTargets = (extracted && extracted.targets) || [];
    const loci = srcLoci.map(l => M.makeLocus(l));
    const targets = srcTargets.map(t => M.makeTarget(t));
    const meta = data.meta || {};
    const project = M.makeProject({
      code: meta.project || 'P1',
      title: (meta.project || '导入项目') + ' · cKO 工作台',
      species: 'rat', speciesLabel: '大鼠',
      strain: (meta.strain || ''),
      meta: {
        goalSpec: meta.goalSpec || '', goal: meta.goal || '',
        goalNote: meta.goalNote || '', note: meta.note || ''
      },
      loci, targets
    });

    const rats = (data.rats || []).map(r => {
      const gt = {};
      for (const [k, v] of Object.entries(r.gt || {})) {
        gt[k] = {
          call: v.call,
          bands: (v.bands === undefined ? null : v.bands),
          date: v.date || null,
          raw: v.raw || null,
          prev: (v.prev === undefined ? null : v.prev),
          src: 'stated',
          locusVersion: 1
        };
      }
      return M.makeRat({
        id: r.id, tag: r.tag, sex: r.sex || 'U', birth: r.birth || null,
        status: r.status || 'alive', statusDate: r.statusDate || null,
        sire: (r.sire === undefined ? null : r.sire), dam: (r.dam === undefined ? null : r.dam),
        weaned: r.weaned || null, note: r.note || '', source: r.source || '',
        gt, events: [],
        batch: r.batch || null, batchSeq: r.batchSeq || null, slot: r.slot || null,
        batches: r.batches || [], cage: r.cage || '', cageSince: r.cageSince || null,
        createdAt: r.birth || new Date().toISOString(), updatedAt: new Date().toISOString()
      });
    });

    const sessions = (data.sessions || []).map(s => M.makeSession({
      id: s.id, seq: s.seq, date: s.date,
      images: (s.images || []).map(im => ({
        ref: '', name: im.name || '胶图', locus: im.locus || '', addedAt: im.addedAt || s.date,
        sha256: '', bytes: 0
      })),
      lanes: (s.lanes || []).map(l => ({
        idx: l.idx, tag: l.tag, type: l.type || 'sample', sex: l.sex || '', warn: l.warn || [],
        gts: (l.gts || []).map(g => ({
          locus: g.locus, call: g.call, sure: g.sure !== false,
          bands: (g.bands === undefined ? null : g.bands), raw: g.raw || null, src: 'stated'
        })),
        raw: l.raw || '', ratId: null
      })),
      note: s.note || '', targetId: s.targetId || null,
      source: 'manual', rawStmt: s.note || ''
    }));

    // 迁移前断言：位点/目标/鼠只三者一致性
    M.assertMigration(project, rats);
    return { project, rats, sessions, nextRatId: data.nextRatId || rats.length + 1, nextSessionId: data.nextSessionId || sessions.length + 1 };
  }

  CKO.migrate = { extractLedgerData, transform };
})(window.CKO = window.CKO || {});
