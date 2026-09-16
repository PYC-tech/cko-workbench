'use strict';
/**
 * model.js — v3 数据模型工厂 + 校验断言。
 * 关键约束（历史已踩坑）：
 *  - locus.id 不可变；gt 的键就是 locusId，改/删 locus 会让鼠只基因型变孤儿。
 *  - 每个 gt.call 必须落在对应 locus.order 内。
 *  - target.rules[].call 必须落在 locus.order 内，且每个 target 至少命中 1 只鼠。
 */
(function (CKO) {
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ── 工厂 ──
  function makeLocus(p = {}) {
    return {
      id: p.id || uid(),
      name: p.name || '新位点',
      short: p.short || '',
      model: p.model || 'biallelic',          // 'biallelic' | 'transgenic'
      color: p.color || '#8b98a5',
      aliases: p.aliases || [],
      alleles: p.alleles || { none: 'NN', single: 'PN', double: 'PP' },
      labels: p.labels || { none: '无带', single: '1 条带', double: '2 条带' },
      order: p.order || ['double', 'single', 'none'],
      metric: p.metric || 'bands',             // 'bands' | 'binary'
      defaultValue: (p.defaultValue === undefined ? null : p.defaultValue),
      version: p.version || 1,
      archived: !!p.archived,
      note: p.note || ''
    };
  }
  function makeTarget(p = {}) {
    return {
      id: p.id || uid(),
      name: p.name || '新目标',
      color: p.color || '#3fb950',
      rules: p.rules || [],                    // [{locus, call}]
      note: p.note || '',
      archived: !!p.archived
    };
  }
  function makeProject(p = {}) {
    return {
      schemaVersion: 3,
      id: p.id || uid(),
      code: p.code || '',
      title: p.title || '未命名工作台',
      owner: p.owner || '',
      species: p.species || 'rat',             // rat | mouse | other
      speciesLabel: p.speciesLabel || '大鼠',
      strain: p.strain || '',
      meta: p.meta || { goalSpec: '', goal: '', goalNote: '', note: '' },
      loci: p.loci || [],
      targets: p.targets || [],
      settings: p.settings || { defaultLitter: 8, photoMaxSide: 1400, photoQuality: 0.82, backupKeep: 30 },
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    };
  }
  function makeRat(p = {}) {
    return {
      id: p.id || 0,
      tag: p.tag || '',
      sex: p.sex || 'U',                       // M | F | U
      birth: p.birth || null,
      litter: p.litter || null,
      genotypeLine: p.genotypeLine || null,
      status: p.status || 'alive',             // alive | pending | dead | culled
      statusDate: p.statusDate || null,
      sire: (p.sire === undefined ? null : p.sire),
      dam: (p.dam === undefined ? null : p.dam),
      cage: p.cage || '',
      cageSince: p.cageSince || null,
      weaned: p.weaned || null,
      note: p.note || '',
      source: p.source || '',
      gt: p.gt || {},                          // { [locusId]: GtEntry }
      events: p.events || [],                  // RatEvent[]
      batch: p.batch || null,
      batchSeq: p.batchSeq || null,
      slot: p.slot || null,
      batches: p.batches || [],
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    };
  }
  function makeRatEvent(p = {}) {
    return {
      id: p.id || uid(),
      kind: p.kind || 'note',                   // birth|wean|tail|pcr|observe|transfer|cross|dead|culled|note
      date: p.date || null,
      text: p.text || '',
      sessionId: (p.sessionId === undefined ? null : p.sessionId),
      photos: p.photos || [],
      payload: p.payload || {},
      createdAt: p.createdAt || new Date().toISOString()
    };
  }
  function makeSession(p = {}) {
    return {
      id: p.id || 0,
      seq: p.seq || 0,
      date: p.date || new Date().toISOString().slice(0, 10),
      images: p.images || [],                  // SessionImage[]
      lanes: p.lanes || [],
      note: p.note || '',
      targetId: p.targetId || null,
      kind: 'genotyping',
      source: p.source || 'manual',
      rawStmt: p.rawStmt || '',
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    };
  }
  function makeWorkLog(p = {}) {
    return {
      id: p.id || uid(),
      projectId: p.projectId || '',
      date: p.date || new Date().toISOString().slice(0, 10),
      title: p.title || '',
      text: p.text || '',
      tags: p.tags || [],
      photos: p.photos || [],
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    };
  }

  // ── 校验断言 ──
  function assertUnique(arr, label) {
    const seen = new Set();
    for (const x of arr) { if (seen.has(x)) throw mk('E_BAD_ARG', `${label} 重复：${x}`); seen.add(x); }
  }
  function mk(code, message) { const e = new Error(message); e.code = code; return e; }

  function validateProject(proj) {
    assertUnique(proj.loci.map(l => l.id), 'locus.id');
    assertUnique(proj.targets.map(t => t.id), 'target.id');
    // 规则合法性：rule.call 必须落在对应 locus.order 内
    for (const t of proj.targets) {
      if (!t.archived) {
        for (const r of t.rules) {
          const lc = proj.loci.find(l => l.id === r.locus);
          if (!lc) throw mk('E_BAD_ARG', `目标「${t.name}」引用了不存在的位点 ${r.locus}`);
          if (!lc.order.includes(r.call)) throw mk('E_BAD_ARG', `目标「${t.name}」规则 ${r.locus}=${r.call} 不在位点取值集合内`);
        }
      }
    }
  }

  function validateRatsAgainstLoci(rats, loci, proj) {
    const locusIds = new Set(loci.map(l => l.id));
    const orders = {}; loci.forEach(l => orders[l.id] = l.order);
    for (const r of rats) {
      for (const [k, v] of Object.entries(r.gt || {})) {
        if (!locusIds.has(k)) throw mk('E_BAD_ARG', `鼠 ${r.tag} 的基因型键 ${k} 指向不存在的位点`);
        if (v && v.call != null && !orders[k].includes(v.call)) throw mk('E_BAD_ARG', `鼠 ${r.tag} 位点 ${k} 取值 ${v.call} 不在允许集合内`);
      }
    }
  }

  function targetHits(rat, targets, loci) {
    return targets.filter(t => !t.archived && t.rules.length &&
      t.rules.every(r => rat.gt && rat.gt[r.locus] && rat.gt[r.locus].call === r.call));
  }
  function isTarget(rat, targets, loci) { return targetHits(rat, targets, loci).length > 0; }

  // 迁移前 8 条断言
  function assertMigration(proj, rats) {
    assertUnique(proj.loci.map(l => l.id), 'locus.id');
    assertUnique(rats.map(r => r.id), 'rat.id');
    assertUnique(rats.filter(r => r.tag).map(r => r.tag), 'rat.tag');
    validateRatsAgainstLoci(rats, proj.loci, proj);
    validateProject(proj);
    // 父母引用无悬空
    const ids = new Set(rats.map(r => r.id));
    for (const r of rats) {
      if (r.sire != null && !ids.has(r.sire)) throw mk('E_BAD_ARG', `鼠 ${r.tag} 的父亲引用了不存在的 id ${r.sire}`);
      if (r.dam != null && !ids.has(r.dam)) throw mk('E_BAD_ARG', `鼠 ${r.tag} 的母亲引用了不存在的 id ${r.dam}`);
    }
  }

  CKO.model = {
    uid, makeLocus, makeTarget, makeProject, makeRat, makeRatEvent, makeSession, makeWorkLog,
    validateProject, validateRatsAgainstLoci, targetHits, isTarget, assertMigration, mk
  };
})(window.CKO = window.CKO || {});
