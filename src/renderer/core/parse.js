'use strict';
/**
 * parse.js — 口述/DSL 解析引擎（v2）。
 *
 * 交换格式（DeepSeek 按程序生成的提示词卡片输出）：
 *   @日期 2026-09-18
 *   @泳道顺序 307 308
 *   @本批默认 目标基因-KO=有带
 *   307 | M | 目标基因-Flox=无带 | 目标基因-KO=~有带 | Cre=? | 笼=B4 | 父=209 | 母=214
 *   308 | F | 目标基因-Flox=2条带 | 目标基因-KO=~有带 | 笼=B4
 *   @新生 出生=2026-09-10 窝=L5 父=209 母=214 笼=B4 仔=311 312♀ 313
 *   @配种 209 × 214 B4
 *   @清空笼位 301 302
 *   @备注 第五只 flox 是阳性的
 *
 * 关键纪律（全案最易错处）：
 *   - `?` 显式 = 未提及（omitted），绝对不写进 gt；未提及**绝不等于阴性/无带**。
 *   - 笼位/父母「未提及」= 不改动（keep），与位点缺失不是一回事，预览要分开显示。
 *   - 位点/取值匹配一律由 project.loci[].aliases + .short 派生，不在代码里写死正则。
 *   - 容错层只认「写法变体」，**不猜语义**：认不准就警告或硬报错，交人确认。
 *
 * v2 相对 v1 的修正：
 *   1. `位点=~取值` 现在可解析（v1 的取值段字符类不含 `~`，而提示词卡片教的正是 `=~`）。
 *   2. 位点索引纳入 `short`（简称），并**只收未归档位点**（v1 用 proj.loci，
 *      命中归档位点会让 loci.find 返回 undefined 并崩在 resolveCall）。
 *   3. 新增保留键格：笼 父 母 出 窝 性 态 注。
 *   4. 新增指令：@笼位 @清空笼位 @配种 @新生。
 *   5. 未识别的 @ 指令不再静默丢弃，改为警告。
 *   6. 报错文案带上「本项目现有位点」，可直接照着改。
 */
(function (CKO) {
  const M = CKO.model;

  // 归一化：小写、去空白与连字符、去 '2a'
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s\-]/g, '').replace(/2a/g, ''); }
  // 耳号归一：只去空白（**不剥前导零** —— 001 与 1 可能是不同耳号，交给上层判断）
  function normTag(s) { return String(s == null ? '' : s).replace(/\s+/g, ''); }

  // 性别归一：接受中文与符号
  function normalizeSex(tok) {
    const t = String(tok || '').trim();
    if (['M', 'm', '公', '雄', '♂', 'male', 'Male', '男'].includes(t)) return 'M';
    if (['F', 'f', '母', '雌', '♀', 'female', 'Female', '女'].includes(t)) return 'F';
    if (['?', '？', '待定', '未定', '未知', '不详', 'U', 'u'].includes(t)) return '?';
    return null;
  }

  // ── 保留键（数据行里的 `键=值` 字段，优先于位点匹配）──
  const KEY_SYN = {
    笼: 'cage', 笼位: 'cage', 笼号: 'cage',
    父: 'sire', 父本: 'sire', 父亲: 'sire', 雄: 'sire', '♂': 'sire',
    母: 'dam', 母本: 'dam', 母亲: 'dam', 雌: 'dam', '♀': 'dam',
    出: 'birth', 出生: 'birth', 生日: 'birth', 生于: 'birth',
    窝: 'litter', 窝号: 'litter',
    性: 'sex', 性别: 'sex',
    态: 'status', 状态: 'status',
    注: 'note', 备注: 'note', 说明: 'note'
  };
  const KEY_LABEL = { cage: '笼位', sire: '父', dam: '母', birth: '出生', litter: '窝号', sex: '性别', status: '状态', note: '备注' };

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
    if (!locus) return { call: null, src: 'unknown', raw: token };
    const t = norm(token);
    if (t === '?') return { call: null, src: 'omitted' };
    for (const c of locus.order) {
      if (norm(c) === t) return { call: c, src: 'stated' };
      if ((locus.labels[c] && norm(locus.labels[c]) === t)) return { call: c, src: 'stated' };
    }
    for (const c of locus.order) {
      if ((CALL_SYN[c] || []).some(s => norm(s) === t)) return { call: c, src: 'stated' };
    }
    if (['none', 'neg'].includes(t)) return { call: locus.metric === 'binary' ? 'neg' : 'none', src: 'stated' };
    if (t === 'pos') return { call: 'pos', src: 'stated' };
    return { call: null, src: 'unknown', raw: token };
  }

  // 位点token → locusId。用 name / aliases / short / id（v1 漏了 short）
  function buildLocusIndex(loci) {
    const idx = {};
    (loci || []).forEach(l => {
      [l.name, l.short, ...(l.aliases || [])].forEach(t => { const k = norm(t); if (k) idx[k] = l.id; });
      idx[norm(l.id)] = l.id;
    });
    return idx;
  }

  function locusHelp(loci) {
    if (!loci || !loci.length) return '（本项目还没有位点，请先到设置里添加）';
    return loci.map(l => l.name + (l.short ? '（简称 ' + l.short + '）' : '')).join(' / ');
  }

  // ── 文本级容错归一（只认写法变体，不改语义）──
  function normalizeText(line) {
    const notes = [];
    let s = String(line);
    if (/[｜∣]/.test(s)) { s = s.replace(/[｜∣]/g, '|'); notes.push('全角竖线'); }
    if (/[＝]/.test(s)) { s = s.replace(/＝/g, '='); notes.push('全角等号'); }
    // 中文冒号当分隔符：仅当冒号前那一段还没有 '='（避免破坏备注正文）
    if (/[：]/.test(s)) { s = s.replace(/([^\s=|]{1,16})：/g, (m0, p1) => p1.includes('=') ? m0 : p1 + '='); notes.push('中文冒号'); }
    if (/=\s+/.test(s)) { s = s.replace(/=\s+/g, '='); }   // `父= 209` → `父=209`
    if (/[✕*]/.test(s)) { s = s.replace(/[✕*]/g, '×'); notes.push('乘号写法'); }
    return { text: s, notes };
  }

  // 一个格子里塞了多个保留键字段：`父=209 母=214` → ['父=209','母=214']。
  // 只在**第一个词就是保留键**时才拆，避免把 `目标基因-Flox=2 条带` 这类值误拆。
  function splitFieldCell(cell) {
    const s = String(cell);
    const i0 = s.indexOf('=');
    if (i0 < 0) return [s];
    if (!KEY_SYN[norm(s.slice(0, i0))]) return [s];
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return [s];
    const out = [];
    for (const p of parts) {
      const i = p.indexOf('=');
      if (i >= 0 && KEY_SYN[norm(p.slice(0, i))]) out.push(p);   // 新的保留键 → 起新格
      else if (out.length) out[out.length - 1] += ' ' + p;       // 否则续到上一格的值里
      else return [s];
    }
    return out;
  }

  // 解析单格：先判保留键，再当位点格
  function classifyCell(cell, locusIdx, loci, archivedIdx) {
    const raw = String(cell || '').trim();
    if (!raw) return null;
    const eq = raw.search(/[=]/);
    if (eq >= 0) {
      const head = raw.slice(0, eq).trim();
      let val = raw.slice(eq + 1).trim();
      const k = KEY_SYN[norm(head)];
      if (k) {
        if (val.startsWith('~')) val = val.slice(1).trim();   // `笼=~B4` 之类的容忍写法
        const conflict = locusIdx[norm(head)];
        return { kind: 'field', key: k, value: val, warn: conflict ? '保留键「' + head + '」与位点名冲突，已按' + KEY_LABEL[k] + '处理' : null };
      }
    }
    const r = parseCell(raw, locusIdx, loci, archivedIdx);
    return r.error ? { kind: 'error', error: r.error } : { kind: 'locus', locusId: r.locusId, call: r.call, src: r.src, bands: r.bands, raw };
  }

  // 解析单格 "locusToken[=~?]callToken"
  // 取值位允许 `~` 前缀与 `?`：`X=~v`、`X~v`、`X=?`、`X?` 都能认（v1 只认后两种）。
  function parseCell(cell, locusIdx, loci, archivedIdx) {
    // 取值位允许：`~` 前缀、`?`、以及**内部空格**（很多人会写「2 条带」）
    const m = String(cell).match(/^\s*([^=~?]+?)\s*([=~?])\s*(~?[\w\u4e00-\u9fa5\-+?][\w\u4e00-\u9fa5\-+? ]*)?\s*$/);
    if (!m) return { error: '无法解析单元：' + cell };
    const locTok = m[1], op = m[2];
    let valTok = m[3] || '';
    let tilde = op === '~';
    if (valTok.startsWith('~')) { tilde = true; valTok = valTok.slice(1); }
    const locusId = locusIdx[norm(locTok)];
    if (!locusId) {
      if (archivedIdx && archivedIdx[norm(locTok)]) return { error: '位点「' + locTok + '」已归档，不再接受录入。本项目现有位点：' + locusHelp(loci) };
      return { error: '未知位点「' + locTok + '」。本项目现有位点：' + locusHelp(loci) + '。请改名或用简称重试' };
    }
    const locus = (loci || []).find(l => l.id === locusId);
    if (!locus) return { error: '位点「' + locTok + '」已归档，不再接受录入。本项目现有位点：' + locusHelp(loci) };
    if (op === '?' || valTok === '?') return { locusId, call: null, src: 'omitted' };
    const r = resolveCall(locus, valTok);
    if (!r || r.call == null) {
      if (r && r.src === 'omitted') return { locusId, call: null, src: 'omitted' };
      return { error: '取值认不出：「' + locus.name + '=' + (valTok || '') + '」。该位点允许的取值：' + locus.order.map(c => c + '（' + (locus.labels[c] || c) + '）').join(' / ') };
    }
    return { locusId, call: r.call, src: tilde ? 'batch-stated' : r.src, bands: callToBands(locus, r.call) };
  }

  function callToBands(locus, call) {
    if (locus.metric !== 'bands') return null;
    if (call === 'none') return 0;
    if (call === 'single') return 1;
    if (call === 'double') return 2;
    return null;
  }

  // `@新生` 的参数：键=值 若干 + 仔=耳号列表
  function parseNewborn(raw, warnings) {
    const ALIAS = { 出生: 'birth', 生日: 'birth', 生于: 'birth', 窝: 'litter', 窝号: 'litter', 父: 'sire', 父本: 'sire', '♂': 'sire', 母: 'dam', 母本: 'dam', '♀': 'dam', 笼: 'cage', 笼位: 'cage' };
    let rest = String(raw || '').trim();
    let kidPart = '';
    const km = rest.match(/仔(?:鼠)?\s*[=]\s*([\s\S]*)$/);
    if (km) { kidPart = km[1]; rest = rest.slice(0, km.index); }
    const out = { birth: '', litter: '', sire: '', dam: '', cage: '', tags: [] };
    rest.split(/[\s,，、]+/).filter(Boolean).forEach(tok => {
      const i = tok.indexOf('=');
      if (i < 0) return;
      const k = ALIAS[norm(tok.slice(0, i))];
      if (!k) { warnings.push('@新生 里没认出的参数：' + tok + '（已忽略）'); return; }
      out[k] = tok.slice(i + 1).trim();
    });
    kidPart.split(/[\s,，、]+/).filter(Boolean).forEach(t => {
      const m = t.match(/^(.+?)([♂♀?？])?$/);
      out.tags.push({ tag: normTag(m[1]), sex: m[2] ? (m[2] === '♂' ? 'M' : m[2] === '♀' ? 'F' : '?') : '' });
    });
    if (!out.tags.length) warnings.push('@新生 没给出耳号（仔=…）。若尚未编号，请先给临时号（如 L5-1）。该指令已忽略');
    if (!out.sire) warnings.push('@新生 未提供父本（父=…），将留空');
    if (!out.dam) warnings.push('@新生 未提供母本（母=…），将留空');
    return out;
  }

  // `@配种 209 × 214 [B4]` / `@配种 209 214`
  function parseCross(raw, warnings) {
    const s = String(raw || '').replace(/[xX]\s/g, '×').trim();
    let parts = s.split('×').map(x => x.trim()).filter(Boolean);
    if (parts.length < 2) parts = s.split(/[\s,，、]+/).filter(Boolean);
    if (parts.length < 2) { warnings.push('@配种 没认出一对耳号，请写「@配种 父耳号 × 母耳号 [笼位]」。该指令已忽略'); return null; }
    const a = normTag(parts[0].split(/[\s,，、]+/)[0]);
    const tail = parts[1].split(/[\s,，、]+/).filter(Boolean);
    return { sire: a, dam: normTag(tail[0] || ''), cage: tail[1] || '' };
  }

  // 主解析
  function parseEntries(text, proj) {
    const all = (proj.loci || []);
    const loci = all.filter(l => !l.archived);
    const locusIdx = buildLocusIndex(loci);          // ★ 只收活跃位点（v1 传 proj.loci，归档位点会崩）
    const archivedIdx = buildLocusIndex(all.filter(l => l.archived));
    const targets = proj.targets || [];
    const lines = String(text || '').split(/\r?\n/);
    const session = { date: null, note: '', targetId: null, project: null, batchCage: '', clears: [], crosses: [], newborns: [] };
    let laneOrder = [];
    const batchDefaults = {};      // locusId → 取值串
    const batchOmitted = new Set();// 该批整体「未提及」的位点
    const lanes = [];
    const warnings = [];
    const notes = [];
    const fatal = [];
    const seenTags = {};

    for (let rawLine of lines) {
      const raw = rawLine.trim();
      if (!raw) continue;

      if (raw.startsWith('@')) {
        const norm2 = normalizeText(raw);
        const line = norm2.text;
        const sp = line.indexOf(' ');
        const key = (sp < 0 ? line.slice(1) : line.slice(1, sp)).trim();
        const val = sp < 0 ? '' : line.slice(sp + 1).trim();
        if (key === '日期') {
          let d = val;
          let m2 = d.match(/^(\d{4})[年\-\/.](\d{1,2})[月\-\/.](\d{1,2})/);
          if (m2) d = m2[1] + '-' + String(m2[2]).padStart(2, '0') + '-' + String(m2[3]).padStart(2, '0');
          else if (/^(\d{1,2})[月\-\/.](\d{1,2})/.test(d)) { d = new Date().getFullYear() + '-' + d; warnings.push('@日期 没写年份，已按今年处理：' + val + '，请核对'); }
          session.date = d;
        }
        else if (key === '泳道顺序') laneOrder = val.split(/\s+/).filter(Boolean);
        else if (key === '本批默认') {
          const mm = val.match(/^(.+?)\s*=\s*(.+)$/);
          if (mm) {
            const lid = locusIdx[norm(mm[1])];
            let v = mm[2].trim();
            if (v.startsWith('~')) v = v.slice(1).trim();      // `X=~pos` 与 `X=pos` 等价（语义已是整批陈述）
            if (!lid) warnings.push('@本批默认 未知位点：' + mm[1]);
            else if (v === '?') batchOmitted.add(lid);          // v1 会静默丢格
            else batchDefaults[lid] = v;
          } else warnings.push('@本批默认 格式应为「@本批默认 位点名=取值」');
        }
        else if (key === '备注') session.note = val;            // 原样保留，不归一
        else if (key === '项目') session.project = val;
        else if (key === '目标') session.targetId = (targets.find(t => t.name === val || t.id === val) || {}).id || null;
        else if (key === '笼位') session.batchCage = val;
        else if (key === '清空笼位') session.clears = val.split(/[\s,，、]+/).filter(Boolean).map(normTag);
        else if (key === '配种') { const c = parseCross(val, warnings); if (c) session.crosses.push(c); }
        else if (key === '新生') {
          const nb = parseNewborn(val, warnings);
          if (nb.tags.length) session.newborns.push(nb);
        }
        else warnings.push('未识别的指令：@' + key + '（已忽略）');
        continue;
      }

      // 数据行
      const nz = normalizeText(raw);
      nz.notes.forEach(n => notes.push(n));
      let line = nz.text;
      if (!line.includes('|')) {
        // 容忍写法：没用竖线，但第二格像性别才按空白切；否则跳过并提示
        const toks = line.split(/[\s,，、]+/).filter(Boolean);
        if (toks.length >= 2 && normalizeSex(toks[1]) != null) { line = toks.join(' | '); notes.push('缺分隔符'); }
        else { warnings.push('这一行没认出来（缺少 | 分隔符）：' + raw.slice(0, 40)); continue; }
      }
      const cells = line.split('|').map(s => s.trim()).filter(s => s !== '');
      if (!cells.length) continue;

      let tag = cells[0];
      if (/^\d+$/.test(tag) && laneOrder.length) {
        const n = parseInt(tag, 10);
        if (laneOrder[n - 1]) tag = laneOrder[n - 1];
      }
      tag = normTag(tag);

      // 段内耳号查重（同一只鼠出现两次 → 整段拒绝，避免后写覆盖先写）
      if (seenTags[tag] != null) fatal.push('耳号 ' + tag + ' 在本段出现 2 次（第 ' + seenTags[tag] + ' 行、本行）；请合并为一行后重试');
      else seenTags[tag] = lanes.length + 1;

      const sexTok = cells[1] ? normalizeSex(cells[1]) : null;
      const hasSexCell = sexTok != null;
      const lane = {
        laneNo: lanes.length + 1, tag, sex: sexTok || '?', cells: {}, omitted: [], errors: [], warnings: [],
        cage: null, sire: null, dam: null, birth: null, litter: null, status: null, note: null, newborn: false
      };
      const rest = cells.slice(hasSexCell ? 2 : 1);
      const seenLoci = new Set();
      for (const c of rest) for (const cc of splitFieldCell(c)) {
        const r = classifyCell(cc, locusIdx, loci, archivedIdx);
        if (!r) continue;
        if (r.kind === 'error') { lane.errors.push(r.error); continue; }
        if (r.warn) lane.warnings.push(r.warn);
        if (r.kind === 'field') {
          if (r.key === 'cage') lane.cage = r.value ? { value: r.value, src: 'stated' } : { clear: true, src: 'stated' };
          else if (r.key === 'sire') lane.sire = r.value ? { tag: normTag(r.value), src: 'stated' } : { clear: true, src: 'stated' };
          else if (r.key === 'dam') lane.dam = r.value ? { tag: normTag(r.value), src: 'stated' } : { clear: true, src: 'stated' };
          else if (r.key === 'birth') lane.birth = { value: r.value, src: 'stated' };
          else if (r.key === 'litter') lane.litter = { value: r.value, src: 'stated' };
          else if (r.key === 'sex') { const s2 = normalizeSex(r.value); if (s2) lane.sex = s2; else lane.warnings.push('性别认不出：' + r.value); }
          else if (r.key === 'status') lane.status = { value: r.value, src: 'stated' };
          else if (r.key === 'note') lane.note = { value: r.value, src: 'stated' };
          continue;
        }
        if (r.src === 'omitted') { lane.omitted.push(r.locusId); continue; }
        lane.cells[r.locusId] = { call: r.call, src: r.src, bands: r.bands, raw: c };
        seenLoci.add(r.locusId);
      }

      // @笼位 整批兜底（行内 `笼=` 优先）
      if (!lane.cage && session.batchCage) lane.cage = { value: session.batchCage, src: 'batch-stated' };
      // @清空笼位 列表
      if (!lane.cage && session.clears.includes(lane.tag)) lane.cage = { clear: true, src: 'stated' };

      // 未出现的位点：显式 ? 优先 → 本批「未提及」→ @本批默认 → 项目默认 → omitted
      // ★ 只有当这一行**确实涉及鉴定**时才补齐其余位点。否则纯笼位/谱系的口述
      //   会被补出一堆「未提及」，既污染确认表，也会凭空建出一个空鉴定批次。
      const genotypingLine = seenLoci.size > 0 || lane.omitted.length > 0 || Object.keys(batchDefaults).length > 0;
      if (genotypingLine) for (const l of loci) {
        if (seenLoci.has(l.id)) continue;
        if (lane.omitted.includes(l.id)) continue;
        if (batchOmitted.has(l.id)) { lane.omitted.push(l.id); continue; }
        if (batchDefaults[l.id]) {
          const rc = resolveCall(l, batchDefaults[l.id]);
          lane.cells[l.id] = { call: rc && rc.call, src: 'batch-stated', bands: rc && rc.call ? callToBands(l, rc.call) : null, raw: '@本批默认' };
          if (!rc || !rc.call) lane.errors.push('@本批默认 的取值认不出：' + l.name + '=' + batchDefaults[l.id]);
        }
        else if (l.defaultValue != null && l.defaultValue !== '') { lane.cells[l.id] = { call: l.defaultValue, src: 'default', bands: callToBands(l, l.defaultValue), raw: '项目默认' }; }
        else { lane.omitted.push(l.id); }
      }
      lanes.push(lane);
    }

    if (!session.date) warnings.push('缺少 @日期，将无法归入具体批次');
    session.newborns.forEach(nb => nb.tags.forEach(t => {
      if (seenTags[t.tag] != null) fatal.push('@新生 的耳号 ' + t.tag + ' 在数据行里也出现了；请二选一');
    }));
    return { ok: true, session, lanes, warnings, notes, fatal, newborns: session.newborns };
  }

  CKO.parse = { parseEntries, resolveCall, buildLocusIndex, normalizeText, classifyCell, normalizeSex, norm, normTag, KEY_SYN };
})(window.CKO = window.CKO || {});
