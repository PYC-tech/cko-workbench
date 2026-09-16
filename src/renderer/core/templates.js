'use strict';
/**
 * templates.js — 位点档案种子 + 新建项目模板。
 * 提供一组**通用**的条件性敲除位点模板（floxed 等位 / 敲除等位 / Cre 驱动系），
 * 不含任何具体基因或实验室信息；新建项目时可自由改名、增删、改取值。
 *
 * 单位点模型说明：
 *   biallelic   — 二倍体等位，取值按凝胶条带数（无带 / 1 条带 / 2 条带）
 *   binary      — 二分判定（有带 / 无带）
 *   transgenic  — 转基因品系。务必用此模型：双带×双带 = 纯合携带，仍判双带，
 *                 否则杂交概率与判读都会算错。
 */
(function (CKO) {
  const M = CKO.model;

  function seedArchive() {
    const loci = [
      M.makeLocus({
        id: 'target_flox', name: '目标基因-Flox', short: 'Flox', model: 'biallelic', color: '#f0883e',
        aliases: ['flox', 'floxed', 'fl', 'f'],
        alleles: { none: 'DD', single: 'FF', double: 'FD' },
        labels: { none: '无带', single: '1 条带', double: '2 条带' },
        order: ['double', 'single', 'none'], metric: 'bands',
        defaultValue: null,
        note: '条件性敲除的 floxed 等位。目标（敲除成立）时两个 flox 等位应被 Cre 切除 → 无带。',
        version: 1
      }),
      M.makeLocus({
        id: 'target_ko', name: '目标基因-KO', short: 'KO', model: 'biallelic', color: '#db6dc4',
        aliases: ['ko', 'knockout', '敲除'],
        alleles: { pos: 'KK', neg: 'WW' },
        labels: { pos: '有带', neg: '无带' },
        order: ['pos', 'neg'], metric: 'binary',
        defaultValue: null,
        note: '敲除等位 PCR。目标鼠应有带（KO 特异条带）。',
        version: 1
      }),
      M.makeLocus({
        id: 'cre', name: 'Cre 驱动系', short: 'Cre', model: 'transgenic', color: '#3fb950',
        aliases: ['cre', 'cre-driver'],
        alleles: { double: 'PN', single: 'NN', none: 'XX' },
        labels: { double: '2 条带', single: '1 条带', none: '无带' },
        order: ['double', 'single', 'none'], metric: 'bands',
        defaultValue: null,
        note: '组织特异 Cre 驱动系。目标鼠应「2 条带」（Cre 阳性）。务必选 transgenic：双带×双带=纯合携带，仍判双带。',
        version: 1
      })
    ];
    return { version: 1, loci, updatedAt: new Date().toISOString() };
  }

  function defaultTargets() {
    return [
      M.makeTarget({
        id: 'cko', name: 'cKO 目标鼠', color: '#3fb950',
        rules: [{ locus: 'target_ko', call: 'pos' }, { locus: 'cre', call: 'double' }, { locus: 'target_flox', call: 'none' }],
        note: 'KO 有带 + Cre 双带 + Flox 无带（三条件同时满足即判为目标鼠）'
      })
    ];
  }

  // 一个"空白可编辑"的位点模板：新建项目时用户自行改名/改取值（换基因场景）。
  function blankLocus(n) {
    return M.makeLocus({
      id: 'locus_' + (n || 1) + '_' + Math.random().toString(36).slice(2, 6),
      name: '新指标 ' + (n || 1), short: 'M' + (n || 1), model: 'biallelic', color: '#58a6ff',
      aliases: [], alleles: { none: 'NN', single: 'PN', double: 'PP' },
      labels: { none: '无带', single: '1 条带', double: '2 条带' },
      order: ['double', 'single', 'none'], metric: 'bands', defaultValue: null,
      note: '', version: 1
    });
  }

  // 新建项目时从档案里挑位点的便捷构造
  function lociByIds(archive, ids) {
    return ids.map(id => {
      const src = archive.loci.find(l => l.id === id);
      if (!src) throw M.mk('E_BAD_ARG', '档案中找不到位点 ' + id);
      return M.makeLocus(src); // 复制一份进项目（可独立编辑）
    });
  }

  CKO.templates = { seedArchive, defaultTargets, lociByIds, blankLocus };
})(window.CKO = window.CKO || {});
