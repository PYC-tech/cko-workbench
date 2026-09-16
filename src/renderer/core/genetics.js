'use strict';
/**
 * genetics.js — 基因型判读、配种概率推演、卡方分离比检验。
 * 纯函数实现，位点定义通过参数传入（genotypeToCall / crossLocus / crossAll / targetProbability / chi2sf）。
 */
(function (CKO) {
  // 把一段实测带型字母串映射到名义基因型（alleles 取值键）。
  function genotypeToCall(gt, locus) {
    const exact = Object.keys(locus.alleles).find(k => locus.alleles[k].split('').sort().join('') === gt);
    if (exact) return exact;
    if (locus.model === 'transgenic') {
      const keys = Object.keys(locus.alleles);
      const pk = keys.find(k => k === 'pos') || keys[0], nk = keys.find(k => k === 'neg') || keys[keys.length - 1];
      const carrier = [...(locus.alleles[pk] || '')].find(c => (locus.alleles[nk] || '').indexOf(c) < 0);
      return (carrier && gt.indexOf(carrier) >= 0) ? pk : nk;
    }
    return gt;
  }

  function crossLocus(sg, dg, locus) {
    const s = locus.alleles[sg], d = locus.alleles[dg];
    if (!s || !d) return null;
    const c = {};
    for (const a1 of s) for (const a2 of d) { const k = [a1, a2].sort().join(''); c[k] = (c[k] || 0) + 1; }
    const tot = Object.values(c).reduce((x, y) => x + y, 0), out = {};
    for (const [k, n] of Object.entries(c)) { const cl = genotypeToCall(k, locus); out[cl] = (out[cl] || 0) + n / tot; }
    return out;
  }

  function crossAll(sire, dam, loci) {
    let combos = [{ calls: {}, p: 1 }];
    loci.forEach(locus => {
      const sg = sire.gt && sire.gt[locus.id] && sire.gt[locus.id].call;
      const dg = dam.gt && dam.gt[locus.id] && dam.gt[locus.id].call;
      const dist = (sg && dg) ? crossLocus(sg, dg, locus) : null;
      if (!dist) return;
      const next = [];
      combos.forEach(b => Object.entries(dist).forEach(([cl, p]) =>
        next.push({ calls: Object.assign({}, b.calls, { [locus.id]: cl }), p: b.p * p })));
      combos = next;
    });
    return combos.sort((a, b) => b.p - a.p);
  }

  function targetProbability(sire, dam, target, loci) {
    const combos = crossAll(sire, dam, loci);
    if (!combos.length) return null;
    let p = 0;
    combos.forEach(c => { if (target.rules.every(r => c.calls[r.locus] === r.call)) p += c.p; });
    return p;
  }

  function canCross(sire, dam, loci) {
    return loci.some(l => sire.gt && sire.gt[l.id] && dam.gt && dam.gt[l.id]);
  }

  // ── 卡方（Lanczos 近似）──
  const LANCZOS = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7];
  function gammaln(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - gammaln(1 - x);
    x -= 1;
    let a = 0.99999999999980993;
    const t = x + 7.5;
    for (let i = 0; i < 8; i++) a += LANCZOS[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function gammaP(a, x) {
    if (x < 0 || a <= 0) return 0;
    if (x === 0) return 0;
    if (x < a + 1) {
      let ap = a, sum = 1 / a, del = sum;
      for (let n = 1; n <= 800; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
      return sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i <= 800; i++) {
      const an = -i * (i - a);
      b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gammaln(a)) * h;
  }
  function chi2sf(x, df) { return (df <= 0 || x < 0) ? 1 : 1 - gammaP(df / 2, x / 2); }
  function pText(p) { return (p === null || p === undefined || isNaN(p)) ? '—' : (p < 0.001 ? '< 0.001' : p.toFixed(3)); }

  // 实测带型字母串 → 名义基因型（用于从 raw 文本重建；保留以防万一）
  function bandsToCall(bands, locus) {
    if (bands === 0 || bands === '0' || bands === null || bands === undefined) return 'none';
    if (bands === 1 || bands === '1') return 'single';
    if (bands === 2 || bands === '2') return 'double';
    return genotypeToCall(String(bands), locus);
  }

  CKO.genetics = { genotypeToCall, crossLocus, crossAll, targetProbability, canCross, chi2sf, pText, bandsToCall };
})(window.CKO = window.CKO || {});
