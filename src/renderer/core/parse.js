'use strict';
/**
 * parse.js — 口述/DSL 解析引擎。
 *
 * 交换格式（DeepSeek 按程序生成的提示词卡片输出）：
 *   @日期 2026-09-11
 *   @泳道顺序 001 002 003 004
 *   @本批默认 目标基因-KO=pos
 *   001 | F | 目标基因-Flox=none | 目标基因-KO=pos | Cre=double
 *   002 | M | 目标基因-Flox=none | 目标基因-KO=~pos | Cre=single
 *   003 | F | 目标基因-Flox=single | 目标基因-KO=~pos | Cre=?
 *   @备注 第五只 flox 是阳性的
 *
 * 关键纪律（全案最易错处）：
 *   - `?` 显式 = 未提及（omitted），绝对不写进 gt。
 *   - 某位点某行完全没有 → 若有项目默认值则落 default；否则 omitted（确认表灰虚线框）。
 *   - omitted 与任何阴性取值（none/neg）永远不是一回事。
 *   - 位点/取值匹配一律由 project.loci[].aliases 派生，不在代码里写死正则。
 */
(function (CKO) {
  const M = CKO.model;

  // 归一化：小写、去空白与连字符、去 '2a'
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s\-]/g, '').replace(/2a/g, ''); }

  // 构建 位点token → locusId 查找表
  function buildLocusIndex(loci) {
    const idx = {};
    loci.forEach(l => {
      [l.name, ...(l.aliases || [])].forEach(t => { const k = norm(t); if (k) idx[k] = l.id; });
      idx[norm(l.id)] = l.id;
    });
    return idx;
  }

  // 取值 token → locus.order 中的标准 call。按 locus.metric 消解 none/neg 歧义。
  const CALL_SYN = {
    none: ['none', '无带', '阴性', 'nn', 'xx'],
    single: ['single', '1条带', '单带', '1带', 'het', '杂合', 'ff'],
    double: ['double', '2条带', '双带', '2带', 'hom', '纯合', 'pp', 'pn'],
    pos: ['pos', '有带', '阳性', '+', 'kk'],
    neg: ['neg', '无带', '阴性', 'ww'],
    ho_ko: ['ho_ko', '敲除纯合', '纯合敲除'],
    he_ko: ['he_ko', '敲除杂合'],
    ho_flox: ['ho_flox', 'flox纯合'],
    he_flox: ['he_flox', 'flox杂合'],
    wt: ['wt', '野生型', '野生']
  };
  function resolveCall(locus, token) {
    if (!token) return null;
    const t = norm(token);
    if (t === '?') return { call: null, src: 'omitted' };
    // 先按 order 精确匹配（允许英文代号或中文 label 任一）
    for (const c of locus.order) {
      if (norm(c) === t) return { call: c, src: 'stated' };
      if ((locus.labels[c] && norm(locus.labels[c]) === t)) return { call: c, src: 'stated' };
    }
    // 再按同义词表
    for (const c of locus.order) {
      if ((CALL_SYN[c] || []).some(s => norm(s) === t)) return { call: c, src: 'stated' };
    }
    // 仍无 → 尝试用 metric 消解 none/neg 与 '阴性/无带'
    if (['none', 'neg'].includes(t)) {
      return { call: locus.metric === 'binary' ? 'neg' : 'none', src: 'stated' };
    }
    if (t === 'pos') return { call: 'pos', src: 'stated' };
    return { call: null, src: 'unknown', raw: token };
  }

  // 解析单格 "locusToken[=~?]callToken"
  function parseCell(cell, locusIdx, loci) {
    const m = cell.match(/^\s*([^=~?]+?)\s*([=~?])\s*([\w\u4e00-\u9fa5\-+]+)?\s*$/);
    if (!m) return { error: '无法解析单元：' + cell };
    const locTok = m[1], op = m[2], valTok = m[3];
    const locusId = locusIdx[norm(locTok)];
    if (!locusId) return { error: '未知位点：' + locTok };
    const locus = loci.find(l => l.id === locusId);
    if (op === '?') return { locusId, call: null, src: 'omitted' };
    const r = resolveCall(locus, valTok);
    if (!r || r.call == null) {
      if (r && r.src === 'unknown') return { locusId, error: '点位 ' + locus.name + ' 无法识别取值：' + (r.raw || valTok) };
      return { locusId, error: '点位 ' + locus.name + ' 无法识别取值：' + (valTok || '') };
    }
    if (op === '~') r.src = 'batch-stated';
    return { locusId, call: r.call, src: r.src, bands: callToBands(locus, r.call) };
  }

  function callToBands(locus, call) {
    if (locus.metric !== 'bands') return null;
    if (call === 'none') return 0;
    if (call === 'single') return 1;
    if (call === 'double') return 2;
    return null;
  }

  // 主解析
  function parseEntries(text, proj) {
    const loci = (proj.loci || []).filter(l => !l.archived);
    const locusIdx = buildLocusIndex(proj.loci);
    const lines = String(text || '').split(/\r?\n/);
    const session = { date: null, note: '', targetId: null, project: null };
    let laneOrder = [];          // @泳道顺序 提供的 tag 列表
    const batchDefaults = {};     // locusId → call（来自 @本批默认）
    const lanes = [];
    const warnings = [];

    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('@')) {
        const sp = line.indexOf(' ');
        const key = line.slice(1, sp).trim();
        const val = line.slice(sp + 1).trim();
        if (key === '日期') session.date = val;
        else if (key === '泳道顺序') laneOrder = val.split(/\s+/).filter(Boolean);
        else if (key === '本批默认') {
          const mm = val.match(/^(.+?)\s*=\s*(.+)$/);
          if (mm) { const lid = locusIdx[norm(mm[1])]; if (lid) batchDefaults[lid] = mm[2]; else warnings.push('@本批默认 未知位点：' + mm[1]); }
        }
        else if (key === '备注') session.note = val;
        else if (key === '项目') session.project = val;
        else if (key === '目标') session.targetId = (proj.targets || []).find(t => t.name === val || t.id === val)?.id || null;
        continue;
      }
      // 数据行
      const cells = line.split('|').map(s => s.trim()).filter(s => s !== '');
      if (!cells.length) continue;
      // 首格可能是泳道号 → 映射到 laneOrder
      let tag = cells[0];
      if (/^\d+$/.test(tag) && laneOrder.length) {
        const n = parseInt(tag, 10);
        if (laneOrder[n - 1]) tag = laneOrder[n - 1];
      }
      const sex = (cells[1] && ['M', 'F', '?'].includes(cells[1].toUpperCase())) ? cells[1].toUpperCase() : '?';
      const lane = { laneNo: lanes.length + 1, tag, sex, cells: {}, omitted: [], errors: [] };
      const rest = cells.slice(cells[1] && ['M', 'F', '?'].includes(cells[1].toUpperCase()) ? 2 : 1);
      const seenLoci = new Set();
      for (const c of rest) {
        const r = parseCell(c, locusIdx, loci);
        if (r.error) { lane.errors.push(r.error); continue; }
        if (r.src === 'omitted') { lane.omitted.push(r.locusId); continue; }
        lane.cells[r.locusId] = { call: r.call, src: r.src, bands: r.bands, raw: c };
        seenLoci.add(r.locusId);
      }
      // 未出现的位点：显式 ? 优先于一切（已在 lane.omitted）→ 批次默认 / 项目默认 / omitted
      for (const l of loci) {
        if (seenLoci.has(l.id)) continue;
        if (lane.omitted.includes(l.id)) continue;   // 显式 ? 不能被默认值覆盖
        if (batchDefaults[l.id]) { lane.cells[l.id] = { call: resolveCall(l, batchDefaults[l.id]).call, src: 'batch-stated', bands: callToBands(l, resolveCall(l, batchDefaults[l.id]).call), raw: '@本批默认' }; }
        else if (l.defaultValue != null && l.defaultValue !== '') { lane.cells[l.id] = { call: l.defaultValue, src: 'default', bands: callToBands(l, l.defaultValue), raw: '项目默认' }; }
        else { lane.omitted.push(l.id); }
      }
      lanes.push(lane);
    }

    if (!session.date) warnings.push('缺少 @日期，将无法归入具体批次');
    return { ok: true, session, lanes, warnings };
  }

  CKO.parse = { parseEntries, resolveCall, buildLocusIndex, norm };
})(window.CKO = window.CKO || {});
