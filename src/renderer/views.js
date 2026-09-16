'use strict';
/**
 * views.js — 全部界面渲染。每个函数把内容渲染进传入的 root 节点。
 * 依赖：CKO.App / CKO.ui / CKO.model / CKO.genetics / CKO.parse。导航由 main.js 的 CKO.nav 提供。
 */
(function (CKO) {
  const U = CKO.ui, M = CKO.model, gtx = CKO.genetics, App = CKO.App;
  const el = U.el, esc = U.escapeHtml;

  // 通用：基因型 chip
  function gtChip(locus, call) {
    if (call == null) return el('span', { class: 'chip chip-unk', text: '—' });
    const cls = 'chip ' + (call === 'double' || call === 'ho_ko' ? 'chip-hom'
      : call === 'single' || call === 'he_ko' || call === 'he_flox' ? 'chip-het'
      : call === 'none' || call === 'neg' || call === 'wt' ? 'chip-wt'
      : call === 'pos' ? 'chip-pos' : 'chip-unk');
    const label = (locus && locus.labels && locus.labels[call]) || call;
    return el('span', { class: cls, text: label });
  }
  // 通用：目标命中徽标
  function targetBadges(rat) {
    const proj = App.state.project; if (!proj) return el('span');
    const hits = M.targetHits(rat, proj.targets, proj.loci);
    return el('span', { class: 'badges' }, hits.map(t => el('span', { class: 'badge', style: `background:${t.color}22;color:${t.color};border:1px solid ${t.color}66`, text: t.name })));
  }
  // 通用：照片缩略图（ref → cko://）
  function photoThumb(ref, caption, onClick) {
    const url = App.state.project ? CKO.Store.imageUrl(ref) : '';
    return el('img', { src: url, class: 'thumb', title: caption || '', onclick: () => onClick && onClick(url, caption) });
  }
  function fmtDate(d) { return d ? String(d).slice(0, 10) : '—'; }

  // ── 视觉辅助（移植自 2026-09 台账）──
  const CAGE_COLORS = ['#58a6ff', '#3fb950', '#f0883e', '#db6dc4', '#d29922', '#79c0ff', '#56d364', '#ffa657', '#a371f7', '#39c5cf'];
  const STATUS_LABEL = { alive: '存活', pending: '待鉴定', dead: '死亡', culled: '已处死' };
  const STATUS_CLASS = { alive: 'b-alive', pending: 'b-pending', dead: 'b-dead', culled: 'b-culled' };
  function sexGlyph(s) { return s === 'M' ? '♂' : s === 'F' ? '♀' : '?'; }
  function sexBadge(s) { return el('span', { class: 'badge b-' + (s === 'M' ? 'm' : s === 'F' ? 'f' : 'u'), text: sexGlyph(s) }); }
  function statusBadge(s) { return el('span', { class: 'badge ' + (STATUS_CLASS[s] || 'b-alive'), text: (STATUS_LABEL[s] || s) }); }
  function daysBetween(a, b) { if (!a) return null; const d1 = new Date(a), d2 = b ? new Date(b) : new Date(); if (isNaN(d1)) return null; return Math.floor((d2 - d1) / 86400000); }
  function ageText(birth) { const d = daysBetween(birth); return (d == null || d < 0) ? '—' : Math.floor(d / 7) + ' 周'; }
  function cageGroups() {
    const map = new Map();
    App.state.rats.filter(r => r.cage).forEach(r => { if (!map.has(r.cage)) map.set(r.cage, []); map.get(r.cage).push(r); });
    const arr = [...map.entries()].map(([id, members]) => {
      const males = members.filter(r => r.sex === 'M'), females = members.filter(r => r.sex === 'F');
      return { id, members, males, females, breeding: males.length > 0 && females.length > 0 };
    });
    arr.sort((a, b) => a.id.localeCompare(b.id, 'zh', { numeric: true }));
    arr.forEach((c, i) => c.color = CAGE_COLORS[i % CAGE_COLORS.length]);
    return arr;
  }
  function cageColor(id) { if (!id) return null; const g = cageGroups().find(c => c.id === id); return g ? g.color : null; }
  function cagePill(id) {
    if (!id) return el('span', { class: 'muted', text: '—' });
    const col = cageColor(id) || '#58a6ff';
    return el('span', { class: 'cage-pill', style: `border-color:${col}66;background:${col}1a` }, [
      el('span', { class: 'cage-dot', style: `background:${col}` }), id
    ]);
  }

  // ── 导出 CSV（Excel 可直接打开；加 BOM 防中文乱码）──
  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function ratsToCsv() {
    const proj = App.state.project;
    const loci = proj.loci.filter(l => !l.archived);
    const tagOf = id => { const x = App.state.rats.find(r => r.id === id); return x ? x.tag : ''; };
    const head = ['耳号', '性别', '出生日期', '周龄', '状态', '笼位', '来源批次',
      ...loci.map(l => l.name), '目标', '父本', '母本', '备注'];
    const rows = App.state.rats.slice()
      .sort((a, b) => String(a.tag).localeCompare(String(b.tag), 'zh', { numeric: true }))
      .map(r => {
        const hit = M.targetHits(r, proj.targets, proj.loci).map(t => t.name).join('/');
        return [r.tag, r.sex === 'M' ? '♂' : r.sex === 'F' ? '♀' : '', r.birth || '', ageText(r.birth),
          STATUS_LABEL[r.status] || r.status, r.cage || '', (r.batchSeq || r.batch || ''),
          ...loci.map(l => { const g = r.gt[l.id]; return g ? (l.labels[g.call] || g.call) : ''; }),
          hit, r.sire != null ? tagOf(r.sire) : '', r.dam != null ? tagOf(r.dam) : '', r.note || ''];
      });
    return '\uFEFF' + [head].concat(rows).map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  async function exportRatsCsv() {
    const proj = App.state.project;
    if (!proj) return U.toast('请先选择项目', 'warn');
    if (!CKO.FS) return U.toast('浏览器调试模式不支持导出', 'warn');
    const name = (proj.code || 'cko') + '-鼠只-' + new Date().toISOString().slice(0, 10) + '.csv';
    const p = await CKO.Store.saveFileDialog(name, [{ name: 'CSV', extensions: ['csv'] }]);
    if (!p) return;
    try { await CKO.Store.exportText(p, ratsToCsv()); U.toast('已导出：' + p, 'ok'); }
    catch (e) { U.toast('导出失败：' + (e.message || e), 'err'); }
  }

  // ───────────────────────── 总览 ─────────────────────────
  function renderOverview(root) {
    const proj = App.state.project;
    if (!proj) { renderNoProject(root); return; }
    const s = App.stats();
    U.clear(root);
    const head = el('div', { class: 'view-head' }, [
      el('h2', { text: proj.title }),
      el('div', { class: 'sub', text: `${esc(proj.speciesLabel)} · ${esc(proj.strain || '品系未填')} · 项目号 ${esc(proj.code || '—')}` })
    ]);
    const cards = el('div', { class: 'stat-cards' }, [
      statCard('鼠只总数', s.total, '#8b98a5'),
      statCard('存活', s.alive, '#3fb950'),
      statCard('目标鼠', s.target, '#f0883e'),
      statCard('位点', s.loci, '#58a6ff'),
      statCard('鉴定批次', s.sessions, '#db6dc4')
    ]);
    root.appendChild(head); root.appendChild(cards);

    // 目标鼠清单
    const tgtWrap = el('div', { class: 'panel' }, [el('h3', { text: '目标鼠清单' })]);
    const targets = proj.targets.filter(t => !t.archived);
    targets.forEach(t => {
      const rats = App.state.rats.filter(r => M.targetHits(r, [t], proj.loci).length > 0);
      const sub = el('div', { class: 'tgt-sub' }, [el('b', { text: t.name }), el('span', { text: `（${rats.length} 只）· ` + t.rules.map(r => { const l = proj.loci.find(x => x.id === r.locus); return (l ? l.name : r.locus) + '=' + (l && l.labels[r.call] || r.call); }).join(' · ') })]);
      const list = el('div', { class: 'rat-chips' }, rats.length ? rats.map(r => el('span', { class: 'rat-pill', text: r.tag, onclick: () => CKO.nav('rats', r.id) })) : [el('span', { class: 'muted', text: '暂无' })]);
      tgtWrap.appendChild(sub); tgtWrap.appendChild(list);
    });
    root.appendChild(tgtWrap);

    // 近期批次
    const sessWrap = el('div', { class: 'panel' }, [el('h3', { text: '近期鉴定批次' })]);
    const sess = (App.state.sessions || []).slice(-5).reverse();
    if (!sess.length) sessWrap.appendChild(el('p', { class: 'muted', text: '还没有鉴定批次' }));
    sess.forEach(sn => {
      sessWrap.appendChild(el('div', { class: 'sess-row', onclick: () => CKO.nav('assays', sn.id) }, [
        el('b', { text: '#' + sn.seq + ' · ' + fmtDate(sn.date) }),
        el('span', { text: `${sn.lanes.length} 道 · ${sn.images.length} 张胶图` }),
        sn.note ? el('span', { class: 'muted', text: sn.note.slice(0, 40) }) : el('span')
      ]));
    });
    root.appendChild(sessWrap);

    // 快捷操作
    const actions = el('div', { class: 'panel' }, [el('h3', { text: '快捷操作' })]);
    const bar = el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn btn-primary', text: '+ 口述录入批次', onclick: () => CKO.nav('dictation') }),
      el('button', { class: 'btn', text: '+ 手写批次', onclick: () => CKO.nav('assays', 'new') }),
      el('button', { class: 'btn', text: '+ 工作台日志', onclick: () => CKO.nav('worklog', 'new') }),
      el('button', { class: 'btn', text: '+ 新建鼠只', onclick: () => addRatDialog() })
    ]);
    actions.appendChild(bar); root.appendChild(actions);
  }
  function renderNoProject(root) {
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: '还没有项目' })]));
    root.appendChild(el('div', { class: 'panel' }, [
      el('p', { class: 'muted', text: '当前数据目录里还没有项目。新建一个即可开始——全局位点档案已自动就绪。' }),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn btn-primary', text: '+ 新建项目', onclick: () => { if (CKO.newProjectDialog) CKO.newProjectDialog(); } })
      ])
    ]));
  }
  function statCard(label, val, color) {
    return el('div', { class: 'stat-card', style: `border-top:3px solid ${color}` }, [
      el('div', { class: 'stat-val', style: `color:${color}`, text: String(val) }),
      el('div', { class: 'stat-label', text: label })
    ]);
  }

  // ───────────────────────── 鼠只 ─────────────────────────
  let ratSort = { key: 'tag', dir: 1 };
  function renderRats(root, focusId) {
    const proj = App.state.project;
    if (!proj) { renderNoProject(root); return; }
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [
      el('h2', { text: '鼠只档案' }),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn', text: '导出 CSV', onclick: () => exportRatsCsv() }),
        el('button', { class: 'btn btn-primary', text: '+ 新建鼠只', onclick: () => addRatDialog() })
      ])
    ]));
    const loci = proj.loci.filter(l => !l.archived);
    const list = App.state.rats.slice();
    const tagOf = id => { const x = App.state.rats.find(r => r.id === id); return x ? x.tag : '—'; };
    list.sort((a, b) => {
      let x, y;
      if (ratSort.key === 'age') { x = daysBetween(a.birth); y = daysBetween(b.birth); x = x == null ? 9e9 : x; y = y == null ? 9e9 : y; }
      else if (ratSort.key === 'cage') { x = (a.cage || '\uffff') + a.tag; y = (b.cage || '\uffff') + b.tag; }
      else { x = a[ratSort.key] || ''; y = b[ratSort.key] || ''; }
      const c = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'zh', { numeric: true });
      return c * ratSort.dir;
    });
    const sortTh = (k, label) => el('th', {
      class: 'sortable',
      text: label + (ratSort.key === k ? (ratSort.dir > 0 ? ' ▲' : ' ▼') : ''),
      onclick: () => { if (ratSort.key === k) ratSort.dir *= -1; else { ratSort.key = k; ratSort.dir = 1; } renderRats(root, focusId); }
    });
    const ths = [sortTh('tag', '耳号'), sortTh('sex', '性别'), sortTh('age', '周龄'), sortTh('status', '状态'), sortTh('cage', '笼位'),
      el('th', { text: '来源批次' }), ...loci.map(l => el('th', { text: l.name })), el('th', { text: '目标' }), el('th', { text: '父本' }), el('th', { text: '母本' })];
    const table = el('table', { class: 'grid' }, [el('thead', {}, [el('tr', {}, ths)])]);
    const tb = el('tbody', {});
    if (!list.length) {
      tb.appendChild(el('tr', {}, [el('td', { colspan: String(10 + loci.length) }, [el('div', { class: 'empty' }, [el('div', { class: 'big', text: '🐭' }), '还没有鼠只'])])]));
    }
    list.forEach(r => {
      const hit = M.targetHits(r, proj.targets, proj.loci);
      const tgtCell = el('td', {});
      if (hit.length) hit.forEach(t => tgtCell.appendChild(el('span', { class: 'badge b-target', text: t.name })));
      else tgtCell.appendChild(el('span', { class: 'muted', text: '—' }));
      const batchCell = el('td', {});
      if (r.batchSeq || r.batch) batchCell.appendChild(el('span', { class: 'batch-tag', text: '#' + (r.batchSeq || r.batch) }));
      else batchCell.appendChild(el('span', { class: 'muted', text: '—' }));
      const tds = [
        el('td', {}, [el('b', { class: 'mono', text: r.tag })]),
        el('td', {}, [sexBadge(r.sex)]),
        el('td', { class: 'mono', text: ageText(r.birth) }),
        el('td', {}, [statusBadge(r.status)]),
        el('td', {}, [cagePill(r.cage)]),
        batchCell,
        ...loci.map(l => el('td', {}, [gtChip(l, r.gt[l.id] && r.gt[l.id].call)])),
        tgtCell,
        el('td', { class: 'mono', text: r.sire != null ? tagOf(r.sire) : '—' }),
        el('td', { class: 'mono', text: r.dam != null ? tagOf(r.dam) : '—' })
      ];
      tb.appendChild(el('tr', { class: hit.length ? 'row-target' : '', onclick: () => CKO.nav('rats', r.id) }, tds));
    });
    table.appendChild(tb);
    root.appendChild(table);
    if (focusId) renderRatDetail(root, focusId);
  }

  function renderRatDetail(root, ratId) {
    const proj = App.state.project; const rat = App.state.rats.find(r => r.id === ratId); if (!rat) return;
    const loci = proj.loci.filter(l => !l.archived);
    const m = U.modal({ title: `鼠只 ${rat.tag}`, size: 'lg' });
    const top = el('div', { class: 'rat-detail-head' }, [
      el('div', {}, [el('b', { text: rat.tag }), el('span', { text: '  ' + (rat.sex === 'M' ? '♂' : rat.sex === 'F' ? '♀' : '') + '  ·  ' + (rat.status === 'alive' ? '存活' : rat.status) }) ]),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn', text: '编辑鼠只资料', onclick: () => editRatDialog(rat, () => { m.close(); renderRatDetail(root, ratId); }) }),
        el('button', { class: 'btn', text: '+ 加事件', onclick: () => addEventDialog(rat, m) })
      ])
    ]);
    m.body.appendChild(top);
    // 基因型
    const gtWrap = el('div', { class: 'panel' }, [el('h4', { text: '基因型' })]);
    loci.forEach(l => {
      const g = rat.gt[l.id];
      gtWrap.appendChild(el('div', { class: 'gt-line' }, [el('span', { class: 'gt-name', text: l.name }), gtChip(l, g && g.call), g && g.src === 'default' ? el('span', { class: 'tag tag-default', text: '默认' }) : g && g.src === 'batch-stated' ? el('span', { class: 'tag tag-batch', text: '批次' }) : el('span'), g && g.date ? el('span', { class: 'muted', text: ' ' + fmtDate(g.date) }) : el('span')]));
    });
    m.body.appendChild(gtWrap);
    // 事件时间线
    const evWrap = el('div', { class: 'panel' }, [el('h4', { text: '事件时间线' })]);
    const evs = (rat.events || []).slice().reverse();
    if (!evs.length) evWrap.appendChild(el('p', { class: 'muted', text: '暂无事件' }));
    evs.forEach(e => {
      evWrap.appendChild(el('div', { class: 'ev-row' }, [
        el('span', { class: 'ev-date', text: fmtDate(e.date) }), el('b', { text: evKind(e.kind) }), el('span', { text: e.text || '' }),
        e.photos && e.photos.length ? el('span', { class: 'muted', text: ` · ${e.photos.length} 图` }) : el('span')
      ]));
    });
    m.body.appendChild(evWrap);
    // 谱系
    if (rat.sire || rat.dam) {
      const ped = el('div', { class: 'panel' }, [el('h4', { text: '谱系' })]);
      const tagOf = id => (App.state.rats.find(r => r.id === id) || {}).tag || '?';
      ped.appendChild(el('p', { text: `父：${rat.sire ? tagOf(rat.sire) : '—'}　母：${rat.dam ? tagOf(rat.dam) : '—'}` }));
      m.body.appendChild(ped);
    }
  }
  function evKind(k) {
    return ({ birth: '出生', wean: '断奶', tail: '剪尾', pcr: '鉴定', observe: '观察', transfer: '转移', cross: '配种', dead: '死亡', culled: '淘汰', note: '备注' })[k] || k;
  }

  // ───────────────────────── 谱系（父母溯源） ─────────────────────────
  let pedRootId = null;
  let pedDir = 'both';
  function computeGenerations() {
    const gen = {};
    App.state.rats.forEach(r => gen[r.id] = 0);
    for (let it = 0; it < 40; it++) {
      let ch = false;
      App.state.rats.forEach(r => {
        let g = 0;
        if (r.sire != null && gen[r.sire] !== undefined) g = Math.max(g, gen[r.sire] + 1);
        if (r.dam != null && gen[r.dam] !== undefined) g = Math.max(g, gen[r.dam] + 1);
        if (g > gen[r.id]) { gen[r.id] = g; ch = true; }
      });
      if (!ch) break;
    }
    return gen;
  }
  function renderPedView(root) {
    const proj = App.state.project;
    if (!proj) { renderNoProject(root); return; }
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: '谱系（父母溯源）' })]));
    const rats = App.state.rats;
    if (!rats.length) { root.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'big', text: '🌳' }), '还没有鼠只'])); return; }
    const sorted = rats.slice().sort((a, b) => String(a.tag).localeCompare(String(b.tag), 'zh', { numeric: true }));
    if (pedRootId == null || !rats.some(r => r.id === pedRootId)) {
      // 默认落在「有后代的始祖鼠」上：这样一进谱系页看到的就是完整家系，
      // 而不是某只鼠的两代短链（无始祖时退回有父母的鼠，再退回第一只）。
      const hasKids = r => rats.some(x => x.sire === r.id || x.dam === r.id);
      const t = rats.find(r => r.sire == null && r.dam == null && hasKids(r))
        || rats.find(r => r.sire != null || r.dam != null)
        || rats[0];
      pedRootId = t.id;
    }
    const sel = el('select', { class: 'inp', onchange: (e) => { pedRootId = Number(e.target.value); renderPedView(root); } });
    sorted.forEach(r => {
      const o = el('option', { value: String(r.id), text: r.tag + '（' + sexGlyph(r.sex) + (r.cage ? ' · ' + r.cage : '') + '）' });
      if (r.id === pedRootId) o.selected = true;
      sel.appendChild(o);
    });
    root.appendChild(el('div', { class: 'ped-toolbar' }, [
      el('span', { class: 'muted', text: '以谁为中心：' }), sel,
      el('button', { class: 'btn btn-sm' + (pedDir === 'up' ? ' btn-primary' : ''), text: '只溯源（祖先）', onclick: () => { pedDir = 'up'; renderPedView(root); } }),
      el('button', { class: 'btn btn-sm' + (pedDir === 'both' ? ' btn-primary' : ''), text: '上下都看（含后代）', onclick: () => { pedDir = 'both'; renderPedView(root); } })
    ]));
    const layout = el('div', { class: 'ped-layout' });
    const canvas = el('div', { class: 'ped-canvas' });
    const side = el('div', { class: 'ped-side' });
    layout.appendChild(el('div', { class: 'ped-main' }, [canvas]));
    layout.appendChild(side);
    root.appendChild(layout);
    drawPed(canvas, side, root);
  }
  function drawPed(canvas, side, root) {
    const proj = App.state.project;
    const byId = id => App.state.rats.find(r => r.id === id);
    const rootRat = byId(pedRootId);
    if (!rootRat) { canvas.appendChild(el('div', { class: 'empty' }, ['无谱系数据'])); renderCageList(side); return; }
    const gen = computeGenerations();
    const show = new Set([pedRootId]);
    (function up(id, d) { if (d > 8) return; const r = byId(id); if (!r) return;[r.sire, r.dam].forEach(p => { if (p != null && !show.has(p)) { show.add(p); up(p, d + 1); } }); })(pedRootId, 0);
    if (pedDir === 'both') { (function down(id, d) { if (d > 6) return; App.state.rats.filter(x => x.sire === id || x.dam === id).forEach(c => { if (!show.has(c.id)) { show.add(c.id); down(c.id, d + 1); } }); })(pedRootId, 0); }
    // 配偶补全：树内任何一只鼠，其子代的「另一位亲本」也一并纳入（只补一层，不递归）。
    // 不做这一步，以父本为中心往下看时母本会整支缺席，繁殖对就散了。
    {
      const kidsOf = id => App.state.rats.filter(x => x.sire === id || x.dam === id);
      [...show].forEach(id => {
        kidsOf(id).forEach(k => {
          if (k.sire != null) show.add(k.sire);
          if (k.dam != null) show.add(k.dam);
        });
      });
    }
    const nodes = [...show].map(byId).filter(Boolean);
    const byGen = new Map();
    nodes.forEach(n => { const g = gen[n.id] == null ? 0 : gen[n.id]; if (!byGen.has(g)) byGen.set(g, []); byGen.get(g).push(n); });
    const gens = [...byGen.keys()].sort((a, b) => a - b);
    const cageOrder = {}; cageGroups().forEach((c, i) => cageOrder[c.id] = String(i).padStart(3, '0'));
    gens.forEach(g => byGen.get(g).sort((a, b) => {
      const ka = (a.cage ? cageOrder[a.cage] || a.cage : 'zzz') + '|' + String(a.sire == null ? 0 : a.sire) + '|' + String(a.dam == null ? 0 : a.dam) + '|' + a.tag;
      const kb = (b.cage ? cageOrder[b.cage] || b.cage : 'zzz') + '|' + String(b.sire == null ? 0 : b.sire) + '|' + String(b.dam == null ? 0 : b.dam) + '|' + b.tag;
      return ka.localeCompare(kb);
    }));
    const NW = 138, NH = 86, GX = 64, GY = 26, PX = 58, PY = 46;
    const colX = {}; gens.forEach((g, i) => colX[g] = PX + i * (NW + GX));
    const maxRows = Math.max(1, ...gens.map(g => byGen.get(g).length));
    const W = PX * 2 + gens.length * NW + (gens.length - 1) * GX;
    const H = PY * 2 + maxRows * (NH + GY) - GY;
    const pos = {};
    gens.forEach(g => byGen.get(g).forEach((n, i) => { pos[n.id] = { x: colX[g], y: PY + i * (NH + GY), gen: g }; }));
    U.clear(canvas);
    const inner = el('div', { style: `position:relative;width:${W}px;height:${H}px` });
    canvas.appendChild(inner);
    const SVGNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ped-svg'); svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H));
    const pairs = new Map();
    nodes.forEach(c => { if (c.sire == null || c.dam == null) return; if (!show.has(c.sire) || !show.has(c.dam)) return; pairs.set(c.sire + '-' + c.dam, { s: c.sire, d: c.dam }); });
    pairs.forEach(p => {
      const a = pos[p.s], b = pos[p.d]; if (!a || !b) return;
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', String(a.x + NW / 2)); ln.setAttribute('y1', String(a.y + NH / 2));
      ln.setAttribute('x2', String(b.x + NW / 2)); ln.setAttribute('y2', String(b.y + NH / 2));
      ln.setAttribute('stroke', '#5a4a6a'); ln.setAttribute('stroke-width', '2'); ln.setAttribute('stroke-dasharray', '2 3');
      svg.appendChild(ln);
    });
    nodes.forEach(n => {
      [n.sire, n.dam].forEach((pid, k) => {
        if (pid == null || !pos[pid] || !pos[n.id]) return;
        const a = pos[pid], b = pos[n.id];
        if (a.gen >= b.gen) return;
        const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y, mx = (x1 + x2) / 2;
        const pth = document.createElementNS(SVGNS, 'path');
        pth.setAttribute('d', `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
        pth.setAttribute('fill', 'none'); pth.setAttribute('stroke', k === 0 ? '#3b6ea8' : '#8a4a78'); pth.setAttribute('stroke-width', '1.7');
        if (k === 1) pth.setAttribute('stroke-dasharray', '5 3');
        svg.appendChild(pth);
      });
    });
    inner.appendChild(svg);
    // 笼位分组框（同层连续段）
    gens.forEach(g => {
      const arr = byGen.get(g); let i = 0;
      while (i < arr.length) {
        const c = arr[i].cage; if (!c) { i++; continue; }
        let j = i; while (j + 1 < arr.length && arr[j + 1].cage === c) j++;
        if (j > i) {
          const color = cageColor(c) || '#58a6ff'; const TOP = 15; const pad = 11; const y0 = pos[arr[i].id].y;
          inner.appendChild(el('div', { class: 'cage-frame', title: '笼位 ' + c + '（' + (j - i + 1) + ' 只）', style: `left:${pos[arr[i].id].x - pad}px;top:${y0 - pad - TOP}px;width:${NW + pad * 2}px;height:${(j - i) * (NH + GY) + NH + pad * 2 + TOP}px;background:${color}0f;border:1.5px dashed ${color}66` }));
          inner.appendChild(el('div', { class: 'gen-label', text: '笼 ' + c, style: `left:${pos[arr[i].id].x - pad + 8}px;top:${y0 - pad - TOP + 1}px;color:${color}` }));
        }
        i = j + 1;
      }
    });
    gens.forEach(g => inner.appendChild(el('div', { class: 'gen-label', text: 'F' + g, style: `left:${colX[g] + 4}px;top:16px` })));
    nodes.forEach(n => {
      const p = pos[n.id], hit = M.targetHits(n, proj.targets, proj.loci).length > 0;
      const col = n.cage ? (cageColor(n.cage) || 'var(--line)') : 'var(--line)';
      const node = el('div', { class: 'ped-node' + ((n.status === 'dead' || n.status === 'culled') ? ' dead' : '') + (n.id === pedRootId ? ' is-root' : '') + (hit ? ' is-target' : ''), style: `left:${p.x}px;top:${p.y}px;border-left:4px solid ${col}` });
      if (n.cage) node.appendChild(el('div', { class: 'pn-cage', text: n.cage, style: `border-color:${col}88` }));
      node.appendChild(el('div', { class: 'pn-tag', text: n.tag + ' ' + sexGlyph(n.sex) + (hit ? ' 🎯' : '') }));
      node.appendChild(el('div', { class: 'pn-info', text: (n.birth || '出生未知') + ' · ' + ageText(n.birth) }));
      node.appendChild(el('div', { class: 'pn-info', text: STATUS_LABEL[n.status] || '存活' }));
      const gtw = el('div', { class: 'pn-gt' });
      proj.loci.filter(l => !l.archived).forEach(l => { const g = n.gt[l.id]; if (g) gtw.appendChild(gtChip(l, g.call)); });
      node.appendChild(gtw);
      node.onclick = () => { pedRootId = n.id; renderPedView(root); };
      inner.appendChild(node);
    });
    renderCageList(side);
  }
  function renderCageList(box) {
    U.clear(box);
    box.appendChild(el('div', { class: 'sec', text: '笼位' }));
    const groups = cageGroups();
    if (!groups.length) { box.appendChild(el('div', { class: 'muted', text: '暂无笼位信息。可在鼠只档案页录入笼位。' })); return; }
    groups.forEach(g => {
      const left = el('div', { style: 'flex:1;min-width:0' });
      const head = el('div', {}, [el('span', { class: 'cage-dot', style: `background:${g.color}` }), el('span', { class: 'cid', text: g.id })]);
      head.appendChild(el('span', { class: 'muted', style: 'font-size:10.5px;margin-left:7px', text: (g.breeding ? '繁殖笼' : '饲养笼') + ' · ' + g.members.length + ' 只' }));
      left.appendChild(head);
      const mem = el('div', { class: 'cage-members' });
      g.members.forEach(m => mem.appendChild(el('span', { class: 'chip ' + (m.sex === 'M' ? 'chip-het' : m.sex === 'F' ? 'chip-hom' : 'chip-wt'), text: m.tag + ' ' + sexGlyph(m.sex) })));
      left.appendChild(mem);
      box.appendChild(el('div', { class: 'cage-item', onclick: () => { CKO.nav('rats'); } }, [left]));
    });
  }
  function renderCages(root) {
    const proj = App.state.project;
    if (!proj) { renderNoProject(root); return; }
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: '笼位' })]));
    const groups = cageGroups();
    root.appendChild(el('p', { class: 'sub', text: `共 ${groups.length} 个笼位 · ${App.state.rats.filter(r => r.cage).length} 只有笼位记录` }));
    const box = el('div', { class: 'panel' });
    root.appendChild(box);
    renderCageList(box);
  }

  function addRatDialog() {
    const proj = App.state.project; if (!proj) return;
    const m = U.modal({ title: '新建鼠只' });
    const f = el('div', { class: 'form' }, [
      field('耳号', el('input', { id: 'f-tag', class: 'inp', placeholder: '如 091' })),
      field('性别', select(['U', 'M', 'F'], 'U', ['未知', '♂ 公', '♀ 母'])),
      field('出生日期', el('input', { id: 'f-birth', class: 'inp', type: 'date' })),
      field('状态', select(['alive', 'pending', 'dead', 'culled'], 'alive', ['存活', '待定', '死亡', '淘汰'])),
      field('笼位', el('input', { id: 'f-cage', class: 'inp' })),
      field('备注', el('textarea', { id: 'f-note', class: 'inp', rows: '2' }))
    ]);
    m.body.appendChild(f);
    m.addActions([{ label: '取消', cls: 'btn-ghost', onClick: c => c() }, { label: '创建', cls: 'btn-primary', onClick: async (c) => {
      const tag = document.getElementById('f-tag').value.trim();
      if (!tag) return U.toast('耳号必填', 'warn');
      const r = M.makeRat({ id: M.uid(), tag, sex: document.getElementById('select-1') ? document.getElementById('select-1').value : 'U', birth: document.getElementById('f-birth').value || null, status: document.getElementById('select-2').value, cage: document.getElementById('f-cage').value, note: document.getElementById('f-note').value });
      App.state.rats.push(r); await App.saveRats(); c(); CKO.refresh();
    } }]);
  }
  // 编辑鼠只本体资料（换耳号 / 更正性别、出生、状态、笼位、备注）——改动记进事件时间线
  function editRatDialog(rat, onDone) {
    const m = U.modal({ title: '编辑鼠只资料 ' + rat.tag, size: 'md' });
    m.body.appendChild(el('div', { class: 'form' }, [
      field('耳号', el('input', { id: 'er-tag', class: 'inp', value: rat.tag })),
      field('性别', select(['U', 'M', 'F'], rat.sex, ['未知', '♂ 公', '♀ 母'])),
      field('出生日期', el('input', { id: 'er-birth', class: 'inp', type: 'date', value: rat.birth || '' })),
      field('状态', select(['alive', 'pending', 'dead', 'culled'], rat.status, ['存活', '待鉴定', '死亡', '已处死'])),
      field('笼位', el('input', { id: 'er-cage', class: 'inp', value: rat.cage || '' })),
      field('备注', el('textarea', { id: 'er-note', class: 'inp', rows: '2', text: rat.note || '' }))
    ]));
    m.body.appendChild(el('p', { class: 'muted', style: 'font-size:12px', text: '改动会记进该鼠的事件时间线，可追溯；耳号变更会额外记一条。' }));
    m.addActions([{ label: '取消', cls: 'btn-ghost', onClick: c => c() }, { label: '保存', cls: 'btn-primary', onClick: async (c) => {
      const today = new Date().toISOString().slice(0, 10);
      const newTag = (document.getElementById('er-tag').value || '').trim();
      if (!newTag) return U.toast('耳号必填', 'warn');
      const changes = [];
      if (newTag !== rat.tag) {
        if (App.state.rats.some(r => r.id !== rat.id && String(r.tag) === newTag)) return U.toast('耳号 ' + newTag + ' 已被其他鼠占用', 'err');
        changes.push('耳号 ' + rat.tag + ' → ' + newTag); rat.tag = newTag;
      }
      const sex = document.getElementById('select-1').value;
      if (sex !== rat.sex) { changes.push('性别 ' + sexGlyph(rat.sex) + ' → ' + sexGlyph(sex)); rat.sex = sex; }
      const birth = document.getElementById('er-birth').value || null;
      if (birth !== (rat.birth || null)) { changes.push('出生 ' + (rat.birth || '—') + ' → ' + (birth || '—')); rat.birth = birth; }
      const status = document.getElementById('select-2').value;
      if (status !== rat.status) { changes.push('状态 ' + (STATUS_LABEL[rat.status] || rat.status) + ' → ' + (STATUS_LABEL[status] || status)); rat.status = status; rat.statusDate = today; }
      const cage = (document.getElementById('er-cage').value || '').trim();
      if (cage !== rat.cage) { changes.push('笼位 ' + (rat.cage || '—') + ' → ' + (cage || '—')); rat.cage = cage; rat.cageSince = today; }
      const note = document.getElementById('er-note').value || '';
      if (note !== (rat.note || '')) { rat.note = note; changes.push('备注已更新'); }
      if (changes.length) {
        rat.events = rat.events || [];
        rat.events.push(M.makeRatEvent({ kind: 'note', date: today, text: '资料修改：' + changes.join('；') }));
        rat.updatedAt = new Date().toISOString();
      }
      try { await App.saveRats(); } catch (e) { return U.toast('保存失败：' + (e.message || e), 'err'); }
      c(); U.toast(changes.length ? ('已保存（' + changes.length + ' 项改动）') : '没有改动', changes.length ? 'ok' : 'info');
      if (onDone) onDone(); else CKO.refresh();
    } }]);
  }
  function addEventDialog(rat, parentModal) {
    const m = U.modal({ title: `为 ${rat.tag} 加事件` });
    const f = el('div', { class: 'form' }, [
      field('类型', select(['birth', 'wean', 'tail', 'pcr', 'observe', 'transfer', 'cross', 'dead', 'culled', 'note'], 'note', ['出生', '断奶', '剪尾', '鉴定', '观察', '转移', '配种', '死亡', '淘汰', '备注'])),
      field('日期', el('input', { id: 'e-date', class: 'inp', type: 'date', value: new Date().toISOString().slice(0, 10) })),
      field('内容', el('textarea', { id: 'e-text', class: 'inp', rows: '2' }))
    ]);
    m.body.appendChild(f);
    m.addActions([{ label: '取消', cls: 'btn-ghost', onClick: c => c() }, { label: '保存', cls: 'btn-primary', onClick: async (c) => {
      rat.events = rat.events || [];
      rat.events.push(M.makeRatEvent({ kind: document.getElementById('select-1').value, date: document.getElementById('e-date').value, text: document.getElementById('e-text').value }));
      await App.saveRats(); c(); if (parentModal) { U.clear(parentModal.body); renderRatDetail(parentModal.body.parentElement.parentElement, rat.id); } CKO.refresh();
    } }]);
  }
  function field(label, control) { return el('label', { class: 'field' }, [el('span', { class: 'field-label', text: label }), control]); }
  function select(values, def, labels) {
    const s = el('select', { class: 'inp', id: 'select-' + (select._n = (select._n || 0) + 1) });
    values.forEach((v, i) => { const o = el('option', { value: v, text: labels ? labels[i] : v }); if (v === def) o.selected = true; s.appendChild(o); });
    return s;
  }

  // ───────────────────────── 鉴定批次 ─────────────────────────
  function renderAssays(root, focus) {
    const proj = App.state.project; if (!proj) return;
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [
      el('h2', { text: '鉴定批次' }),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn btn-primary', text: '+ 口述录入', onclick: () => CKO.nav('dictation') }),
        el('button', { class: 'btn', text: '+ 手写批次', onclick: () => newBatchDialog() })
      ])
    ]));
    if (focus === 'new') { newBatchDialog(); }
    const list = el('div', { class: 'panel' }, [el('h3', { text: '批次列表' })]);
    const sess = (App.state.sessions || []).slice().reverse();
    if (!sess.length) list.appendChild(el('p', { class: 'muted', text: '还没有批次' }));
    sess.forEach(sn => {
      list.appendChild(el('div', { class: 'sess-card', onclick: () => renderSessionDetail(root, sn.id) }, [
        el('div', { class: 'sess-title', text: `#${sn.seq} · ${fmtDate(sn.date)} · ${sn.lanes.length} 道` }),
        el('div', { class: 'muted', text: (sn.source === 'dictation' ? '口述' : '手写') + (sn.note ? ' · ' + sn.note.slice(0, 50) : '') })
      ]));
    });
    root.appendChild(list);
  }
  function renderSessionDetail(root, sid) {
    const proj = App.state.project; const sn = App.state.sessions.find(s => s.id === sid); if (!sn) return;
    const loci = proj.loci.filter(l => !l.archived);
    const m = U.modal({ title: `批次 #${sn.seq} · ${fmtDate(sn.date)}`, size: 'lg' });
    m.body.appendChild(el('p', { class: 'muted', text: sn.note || '' }));

    // 胶图：一个批次可挂多张（上传 / 删除 / 点开放大）
    const imgs = sn.images || [];
    const gelPanel = el('div', { class: 'panel' }, [el('h4', { text: '胶图（' + imgs.length + ' 张）' })]);
    const g = el('div', { class: 'photo-row' });
    imgs.forEach((im, idx) => {
      if (!im.ref) return;
      const wrap = el('div', { class: 'thumb-wrap' });
      wrap.appendChild(photoThumb(im.ref, im.name, (u, c) => U.lightbox(u, c)));
      wrap.appendChild(el('button', {
        class: 'thumb-del', text: '×', title: '删除这张胶图', onclick: async (ev) => {
          ev.stopPropagation();
          if (!window.confirm('删除这张胶图？文件会移入回收站。')) return;
          try { await CKO.Store.deleteImage(im.ref, true); } catch (e) { /* 文件可能已不在，忽略 */ }
          sn.images.splice(idx, 1);
          try { await CKO.Store.saveSession(proj.id, sn); } catch (e) { }
          m.close(); renderSessionDetail(root, sid);
        }
      }));
      g.appendChild(wrap);
    });
    if (!imgs.length) g.appendChild(el('span', { class: 'muted', text: '暂无胶图' }));
    gelPanel.appendChild(g);
    gelPanel.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn btn-primary', text: '+ 添加胶图（可多选）', onclick: () => addGelDialog(sn, () => { m.close(); renderSessionDetail(root, sid); }) })
    ]));
    m.body.appendChild(gelPanel);
    // 泳道表
    const table = el('table', { class: 'grid' });
    table.appendChild(el('thead', {}, el('tr', {}, [el('th', { text: '耳号' }), el('th', { text: '性别' }), ...loci.map(l => el('th', { text: l.name }))])) );
    const tb = el('tbody', {});
    (sn.lanes || []).forEach(lane => {
      const tds = [el('td', { text: lane.tag }), el('td', { text: lane.sex || '—' })];
      loci.forEach(l => { const g = (lane.gts || []).find(x => x.locus === l.id); tds.push(el('td', {}, [gtChip(l, g && g.call)])); });
      tb.appendChild(el('tr', {}, tds));
    });
    table.appendChild(tb); m.body.appendChild(table);
  }

  // 为一个批次添加胶图（支持一次多选）
  function addGelDialog(session, onDone) {
    const proj = App.state.project;
    const m = U.modal({ title: '添加胶图（可多选）', size: 'md' });
    m.body.appendChild(el('p', { class: 'muted', text: '选择该批次的胶图照片，可一次选多张（如一次鉴定跑的多张胶）。图片会真实保存到数据目录，随数据一起备份。' }));
    const input = el('input', { type: 'file', accept: 'image/*', multiple: 'multiple', class: 'inp' });
    m.body.appendChild(input);
    const info = el('p', { class: 'muted', text: '' });
    m.body.appendChild(info);
    input.addEventListener('change', () => { info.textContent = (input.files && input.files.length) ? ('已选 ' + input.files.length + ' 张') : ''; });
    m.addActions([
      { label: '取消', cls: 'btn-ghost', onClick: c => c() },
      { label: '保存', cls: 'btn-primary', onClick: async (c) => {
        const files = input.files;
        if (!files || !files.length) return U.toast('请先选择图片', 'warn');
        let n = 0, failed = 0;
        for (const f of files) {
          try {
            const buf = new Uint8Array(await f.arrayBuffer());
            let ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!ext) ext = 'jpg';
            const res = await CKO.Store.saveImage(buf, { projectId: proj.id, subdir: 'gels/' + (session.date || 'undated'), baseName: 'gel' + session.seq, ext });
            const d = res && res.data ? res.data : res;
            if (!d || !d.ref) { failed++; continue; }
            session.images = session.images || [];
            session.images.push({ ref: d.ref, name: f.name, addedAt: d.addedAt || new Date().toISOString(), sha256: d.sha256 || '', bytes: d.bytes || 0 });
            n++;
          } catch (e) { failed++; }
        }
        try { await CKO.Store.saveSession(proj.id, session); } catch (e) { }
        c();
        U.toast('已添加 ' + n + ' 张胶图' + (failed ? '（失败 ' + failed + ' 张）' : ''), n ? 'ok' : 'err');
        if (onDone) onDone();
      } }
    ]);
  }

  function newBatchDialog() {
    const proj = App.state.project; const loci = proj.loci.filter(l => !l.archived);
    const m = U.modal({ title: '手写批次', size: 'lg' });
    m.body.appendChild(el('p', { class: 'muted', text: '按「耳号 | 性别 | 位点=取值 ...」每行一只，取值用英文代号。' }));
    const ta = el('textarea', { id: 'batch-ta', class: 'inp', rows: '12', placeholder: '001 | F | 目标基因-Flox=none | 目标基因-KO=pos | Cre=double\n002 | M | 目标基因-Flox=none | 目标基因-KO=pos | Cre=single' });
    m.body.appendChild(ta);
    m.addActions([{ label: '取消', cls: 'btn-ghost', onClick: c => c() }, { label: '解析并预览', cls: 'btn-primary', onClick: (c) => {
      const draft = CKO.parse.parseEntries(ta.value, proj);
      showDictationConfirm(m.body, draft, proj);
    } }]);
  }

  // ───────────────────────── 口述录入 ─────────────────────────
  function renderDictation(root) {
    const proj = App.state.project;
    if (!proj) { renderNoProject(root); return; }
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [
      el('h2', { text: '口述录入' }),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn', text: '检查收件箱', onclick: () => refreshInbox() }),
        el('button', { class: 'btn', text: '打开收件箱文件夹', onclick: () => CKO.Store.inboxOpen() }),
        el('button', { class: 'btn', text: '复制提示词卡片', onclick: async () => { await CKO.Store.writeClipboard(App.buildPromptCard(proj)); U.toast('提示词已复制到剪贴板', 'ok'); } })
      ])
    ]));

    // 收件箱：智能体投递区
    const inboxPanel = el('div', { class: 'panel' }, [el('h3', { text: '收件箱（智能体投递）' })]);
    inboxPanel.appendChild(el('p', { class: 'muted', text: '把智能体生成的规范文本（.txt / .md，或含 text 字段的 .json）丢进数据目录下的 _inbox 文件夹，点「检查收件箱」→ 载入并解析 → 在下面核对确认表 → 确认写入。处理过的文件自动归档到 _inbox/_done。' }));
    inboxPanel.appendChild(el('div', { id: 'inbox-list', class: 'inbox-list' }));
    root.appendChild(inboxPanel);

    root.appendChild(el('p', { class: 'muted', text: '或者：把语音转成的文字交给大模型（用上方提示词卡片），把返回的规范文本粘贴到下面，再解析确认。' }));
    const ta = el('textarea', { id: 'dict-ta', class: 'inp', rows: '14', placeholder: '@日期 2026-09-11\n@泳道顺序 001 002 003 004\n001 | F | 目标基因-Flox=none | 目标基因-KO=pos | Cre=double\n...' });
    root.appendChild(ta);
    root.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn btn-primary', text: '解析', onclick: () => {
        const draft = CKO.parse.parseEntries(ta.value, proj);
        const holder = document.getElementById('dict-confirm'); U.clear(holder); showDictationConfirm(holder, draft, proj);
      } }),
      el('button', { class: 'btn', text: '清空', onclick: () => { ta.value = ''; document.getElementById('dict-confirm') && U.clear(document.getElementById('dict-confirm')); } })
    ]));
    root.appendChild(el('div', { id: 'dict-confirm', class: 'confirm-holder' }));
    refreshInbox();
  }

  // 收件箱：列出待处理文件
  async function refreshInbox() {
    const box = document.getElementById('inbox-list');
    if (!box) return;
    U.clear(box);
    let files = [];
    try { files = await CKO.Store.inboxList(); } catch (e) { files = []; }
    if (!files.length) { box.appendChild(el('div', { class: 'muted', text: '（暂无待处理文件）' })); return; }
    files.forEach(f => {
      box.appendChild(el('div', { class: 'inbox-row' }, [
        el('span', { class: 'mono', text: f.name }),
        el('span', { class: 'muted', text: f.bytes + ' B' }),
        el('button', { class: 'btn btn-sm btn-primary', text: '载入并解析', onclick: () => loadInboxFile(f) }),
        el('button', { class: 'btn btn-sm', text: '归档', onclick: async () => { try { await CKO.Store.inboxDone(f.name); U.toast('已归档', 'ok'); refreshInbox(); } catch (e) { U.toast('归档失败：' + (e.message || e), 'err'); } } })
      ]));
    });
  }
  function loadInboxFile(f) {
    const proj = App.state.project;
    let text = f.text || '';
    if (/\.json$/i.test(f.name)) {
      try { const o = JSON.parse(text); text = o.text || o.dsl || o.content || text; } catch (e) { /* 保留原文 */ }
    }
    const ta = document.getElementById('dict-ta');
    if (ta) ta.value = text;
    const holder = document.getElementById('dict-confirm');
    if (holder) {
      try {
        const draft = CKO.parse.parseEntries(text, proj);
        U.clear(holder); showDictationConfirm(holder, draft, proj);
        U.toast('已载入 ' + f.name + '，请核对确认表', 'ok');
      } catch (e) { U.toast('解析失败：' + (e.message || e), 'err'); }
    }
  }

  // 确认表（粘贴框解析后）
  function showDictationConfirm(holder, draft, proj) {
    U.clear(holder);
    if (draft.warnings && draft.warnings.length) holder.appendChild(el('div', { class: 'warn-box', text: '⚠ ' + draft.warnings.join('；') }));
    if (draft.lanes.some(l => l.errors && l.errors.length)) {
      const ew = el('div', { class: 'err-box' });
      draft.lanes.filter(l => l.errors && l.errors.length).forEach(l => ew.appendChild(el('div', { text: `行 ${l.laneNo}（${l.tag}）：${l.errors.join('；')}` })));
      holder.appendChild(ew);
    }
    const loci = proj.loci.filter(l => !l.archived);
    // 确认表
    const table = el('table', { class: 'grid confirm-grid' });
    const thead = el('tr', {}, [el('th', { text: '耳号' }), el('th', { text: '性别' }), ...loci.map(l => el('th', { text: l.name })), el('th', { text: '状态' })]);
    table.appendChild(el('thead', {}, thead));
    const tb = el('tbody', {});
    draft.lanes.forEach(lane => {
      const tds = [el('td', { text: lane.tag }), el('td', { text: lane.sex === 'M' ? '♂' : lane.sex === 'F' ? '♀' : '?' })];
      loci.forEach(l => {
        const cell = lane.cells[l.id];
        if (cell && cell.call != null) {
          const cls = 'cell cell-' + (cell.src === 'stated' ? 'stated' : cell.src === 'batch-stated' ? 'batch' : cell.src === 'default' ? 'default' : 'unknown');
          tds.push(el('td', { class: cls }, [gtChip(l, cell.call), el('span', { class: 'cell-src', text: srcTag(cell.src) }) ]));
        } else if (lane.omitted.includes(l.id)) {
          tds.push(el('td', { class: 'cell cell-omitted', text: '未提及' }));
        } else tds.push(el('td', { text: '—' }));
      });
      const existing = App.state.rats.find(r => r.tag === lane.tag);
      const status = lane.errors && lane.errors.length ? el('span', { class: 'badge badge-err', text: '错误' })
        : existing ? el('span', { class: 'badge badge-upd', text: '更新' }) : el('span', { class: 'badge badge-new', text: '新鼠' });
      tds.push(el('td', {}, [status]));
      tb.appendChild(el('tr', {}, tds));
    });
    table.appendChild(tb); holder.appendChild(table);

    // dry-run 预览 + 落库
    holder.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn btn-primary', text: '生成变更预览', onclick: () => showDryRun(holder, draft) }),
      el('button', { class: 'btn', text: '重新解析', onclick: () => { U.clear(holder); } })
    ]));
  }
  function srcTag(src) { return src === 'stated' ? '' : src === 'batch-stated' ? '批次' : src === 'default' ? '默认' : src === 'omitted' ? '未提及' : ''; }

  function showDryRun(holder, draft) {
    const plan = App.materialize(draft);
    App._lastPlan = plan;
    const box = el('div', { class: 'dryrun-box' });
    box.appendChild(el('h4', { text: '变更预览（落库前核对）' }));
    box.appendChild(el('div', { class: 'dryrun-stat', text: `解析：${plan.rows.length} 道 · 新增鼠 ${plan.stats.newRats} · 更新鼠 ${plan.stats.updateRats}` }));
    box.appendChild(el('div', { class: 'dryrun-stat', text: `明确 ${plan.stats.stated} · 批次推得 ${plan.stats.batchStated} · 默认 ${plan.stats.defaulted} · 未提及 ${plan.stats.omitted}` }));
    if (plan.stats.overwrites.length) {
      const ow = el('div', { class: 'dryrun-ow' }, [el('div', { text: '⚠ 将覆盖旧值：' })]);
      plan.stats.overwrites.forEach(o => ow.appendChild(el('div', { text: `  ${o.tag} · ${o.locus}：${o.from} → ${o.to}` })));
      box.appendChild(ow);
    }
    box.appendChild(el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn btn-primary', text: '确认写入', onclick: async () => {
        try { const r = await App.commitPlan(plan); U.toast(`已写入 ${r.savedRats} 只鼠 · 批次 #${r.session}`, 'ok'); U.clear(holder); CKO.refresh(); }
        catch (e) { U.toast('写入失败：' + (e.message || e), 'err'); }
      } }),
      el('button', { class: 'btn', text: '取消', onclick: () => U.clear(holder) })
    ]));
    holder.appendChild(box);
  }

  // ───────────────────────── 工作台日志 ─────────────────────────
  async function renderWorklog(root, focus) {
    const proj = App.state.project; if (!proj) return;
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: '工作台日志' }), el('button', { class: 'btn btn-primary', text: '+ 写日志', onclick: () => newLogDialog() })]));
    const logs = await loadLogs(proj.id);
    if (!logs.length) { root.appendChild(el('p', { class: 'muted', text: '还没有日志' })); return; }
    const wrap = el('div', { class: 'panel' });
    logs.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    logs.forEach(l => {
      wrap.appendChild(el('div', { class: 'log-card' }, [
        el('div', { class: 'log-head' }, [el('b', { text: l.date }), l.title ? el('span', { text: ' · ' + l.title }) : el('span')]),
        el('div', { class: 'log-text', text: l.text }),
        l.photos && l.photos.length ? el('div', { class: 'photo-row' }, l.photos.filter(p => p.ref).map(p => photoThumb(p.ref, p.caption, (u, c) => U.lightbox(u, c)))) : el('span')
      ]));
    });
    root.appendChild(wrap);
    if (focus === 'new') newLogDialog();
  }
  async function loadLogs(pid) {
    const months = new Set();
    (App.state.sessions || []); // noop
    // 尝试按当前月份与最近几个月加载
    const now = new Date(); const arr = [];
    for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; const ls = await CKO.Store.loadLogs(pid, ym); ls.forEach(l => arr.push(l)); }
    return arr;
  }
  function newLogDialog() {
    const proj = App.state.project; const m = U.modal({ title: '写工作台日志' });
    const f = el('div', { class: 'form' }, [
      field('日期', el('input', { id: 'lg-date', class: 'inp', type: 'date', value: new Date().toISOString().slice(0, 10) })),
      field('标题', el('input', { id: 'lg-title', class: 'inp' })),
      field('内容', el('textarea', { id: 'lg-text', class: 'inp', rows: '5' }))
    ]);
    m.body.appendChild(f);
    m.addActions([{ label: '取消', cls: 'btn-ghost', onClick: c => c() }, { label: '保存', cls: 'btn-primary', onClick: async (c) => {
      const ym = document.getElementById('lg-date').value.slice(0, 7);
      const logs = await CKO.Store.loadLogs(proj.id, ym);
      logs.push(M.makeWorkLog({ projectId: proj.id, date: document.getElementById('lg-date').value, title: document.getElementById('lg-title').value, text: document.getElementById('lg-text').value }));
      await CKO.Store.saveLogs(proj.id, ym, logs); c(); CKO.refresh();
    } }]);
  }

  // ───────────────────────── 设置 ─────────────────────────
  async function renderSettings(root) {
    const proj = App.state.project;
    U.clear(root);
    root.appendChild(el('div', { class: 'view-head' }, [el('h2', { text: '设置' })]));
    const vaultPanel = el('div', { class: 'panel' }, [
      el('h3', { text: '数据目录' }),
      el('p', { text: '当前目录：' }), el('code', { text: App.state.vault || '（未选择）' }),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn', text: '在资源管理器打开', onclick: async () => { if (App.state.vault) await CKO.Store.openPath(App.state.vault); } }),
        el('button', { class: 'btn', text: '更改数据目录…', onclick: () => changeVaultDialog() }),
        el('button', { class: 'btn', text: '从台账导入…', onclick: () => importLedgerDialog() })
      ])
    ]);
    root.appendChild(vaultPanel);

    // 内置示例数据（虚构，用于体验谱系/笼位；可随时删除）
    if (CKO.seedDemo && CKO.seedDemo.project) {
      const sd = CKO.seedDemo;
      const cages = [...new Set((sd.rats || []).map(r => r.cage).filter(Boolean))];
      const seedPanel = el('div', { class: 'panel' }, [
        el('h3', { text: '内置示例数据' }),
        el('p', { class: 'muted', text: '在数据目录里新建一个示例项目（' + (sd.rats || []).length + ' 只鼠 · ' + cages.length + ' 个笼位 · ' + (sd.sessions || []).length + ' 个鉴定批次 · 三代家系），用来体验「谱系」与「笼位」视图。数据全部虚构，看完可直接删掉。' }),
        el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn btn-primary', text: '载入示例项目', onclick: async () => {
            try {
              const p = await App.importSeedProject(CKO.seedDemo);
              U.toast('已载入：' + p.title, 'ok');
              CKO.refresh();
            } catch (e) { U.toast('载入失败：' + (e.message || e), 'err'); }
          } })
        ])
      ]);
      root.appendChild(seedPanel);
    }

    // 位点档案（全局，只显示活动位点）
    const arc = App.state.archive;
    if (arc) {
      const arcPanel = el('div', { class: 'panel' }, [el('h3', { text: '位点档案（全局）' })]);
      arc.loci.filter(l => !l.archived).forEach(l => arcPanel.appendChild(el('div', { class: 'locus-row' }, [
        el('b', { text: l.name }), el('span', { class: 'muted', text: ' · ' + l.model + ' · v' + l.version }),
        el('span', { text: ' · 取值：' + l.order.map(c => l.labels[c] || c).join('/') }),
        l.defaultValue != null && l.defaultValue !== '' ? el('span', { class: 'tag tag-default', text: '默认 ' + (l.labels[l.defaultValue] || l.defaultValue) }) : el('span')
      ])));
      root.appendChild(arcPanel);
    }

    // 当前项目元信息
    if (proj) {
      const metaPanel = el('div', { class: 'panel' }, [el('h3', { text: '本项目的鉴定标准（meta）' }), el('pre', { class: 'meta-pre', text: '客户诉求：' + (proj.meta.goalSpec || '—') + '\n鉴定标准：' + (proj.meta.goal || '—') + '\n落差说明：' + (proj.meta.goalNote || '—') })]);
      root.appendChild(metaPanel);
    }

    // 备份
    const bkPanel = el('div', { class: 'panel' }, [el('h3', { text: '备份与恢复' }), el('div', { class: 'btn-row' }, [
      el('button', { class: 'btn', text: '立即备份', onclick: async () => { await CKO.Store.createBackup('手动', ['工作台.json', 'archive/loci-archive.json']); U.toast('已备份', 'ok'); CKO.refresh(); } })
    ])]);
    const bks = await CKO.Store.listBackups();
    if (bks.length) {
      const bl = el('div', { class: 'backup-list' });
      bks.slice(0, 10).forEach(b => bl.appendChild(el('div', { class: 'backup-row' }, [
        el('span', { text: b.id + ' · ' + (b.label || '') + ' · ' + b.files + ' 文件' }),
        el('button', { class: 'btn btn-sm', text: '预览恢复', onclick: () => previewRestore(b.id) })
      ])));
      bkPanel.appendChild(bl);
    }
    root.appendChild(bkPanel);

    // 完整性检查
    const chk = el('div', { class: 'panel' }, [el('h3', { text: '数据完整性检查' }), el('button', { class: 'btn', text: '运行检查', onclick: () => runIntegrity() })]);
    root.appendChild(chk);
  }
  async function previewRestore(id) {
    const r = await CKO.Store.restoreBackup(id, true);
    const m = U.modal({ title: '恢复预览', size: 'md' });
    m.body.appendChild(el('p', { text: `将恢复 ${r.plan.length} 个文件：` }));
    r.plan.forEach(p => m.body.appendChild(el('div', { text: `${p.action === 'overwrite' ? '覆盖' : '新建'} · ${p.file}` })));
    m.addActions([{ label: '取消', cls: 'btn-ghost', onClick: c => c() }, { label: '确认真实恢复', cls: 'btn-primary', onClick: async (c) => { await CKO.Store.restoreBackup(id, false); c(); U.toast('已恢复', 'ok'); } }]);
  }
  async function runIntegrity() {
    const proj = App.state.project;
    if (!proj) return U.toast('请先选择或新建项目', 'warn');
    const refs = [];
    (App.state.sessions || []).forEach(s => (s.images || []).forEach(im => im.ref && refs.push(im.ref)));
    let report = `鼠只：${App.state.rats.length}\n位点：${proj.loci.filter(l => !l.archived).length}\n批次：${(App.state.sessions || []).length}\n`;
    if (refs.length) { const v = await CKO.Store.verifyImages(refs); const bad = v.filter(x => !x.ok); report += `图片：${v.length} 张，损坏 ${bad.length} 张`; }
    else report += '图片：无';
    U.modal({ title: '完整性检查', size: 'md' }).body.appendChild(el('pre', { text: report }));
  }

  // 更改数据目录（设置页入口）
  async function changeVaultDialog() {
    const p = await CKO.Store.chooseVault();
    if (!p) return;
    try {
      const info = await CKO.Store.validateVault(p);
      if (info.isVault) { await App.loadVault(p); U.toast('已切换数据目录', 'ok'); CKO.refresh(); return; }
      if (!window.confirm('该文件夹不是 cKO 工作台目录，是否在此初始化并切换？')) return;
      await App.ensureSetup(p);
      U.toast('已在新目录初始化', 'ok'); CKO.refresh();
    } catch (e) { U.toast('切换失败：' + (e.message || e), 'err'); }
  }

  // 从旧台账 HTML 导入到当前项目（设置页入口）
  async function importLedgerDialog() {
    const proj = App.state.project;
    if (!proj) return U.toast('请先新建项目', 'warn');
    const p = await CKO.Store.openFile([{ name: 'HTML', extensions: ['html', 'htm'] }]);
    if (!p) return;
    const r = await CKO.__bridgeReadText(p);
    if (!r || !r.text) return U.toast('读取失败', 'err');
    try {
      const out = CKO.migrate.transform(CKO.migrate.extractLedgerData(r.text), { archive: App.state.archive || CKO.templates.seedArchive() });
      const byTag = {}; App.state.rats.forEach(x => { byTag[x.tag] = x; });
      let added = 0;
      out.rats.forEach(x => { if (!byTag[x.tag]) { App.state.rats.push(x); byTag[x.tag] = x; added++; } });
      await App.saveRats();
      for (const s of out.sessions) { s.id = s.id || M.uid(); await CKO.Store.saveSession(proj.id, s); }
      await App.loadProject(proj.id);
      U.toast(`已导入 ${added} 只鼠 / ${out.sessions.length} 批次`, 'ok');
      CKO.refresh();
    } catch (e) { U.toast('导入失败：' + (e.message || e), 'err'); }
  }

  // ───────────────────────── 首次向导（仅当自动就位失败时的兜底） ─────────────────────────
  async function renderWizard(opts) {
    const onDone = opts && opts.onDone;
    const overlay = el('div', { class: 'wizard-overlay show' });
    const box = el('div', { class: 'wizard-box' });
    overlay.appendChild(box); document.body.appendChild(overlay);

    // 提前拿默认数据目录（安装目录同级下的 cKO数据），首屏直接预填，省去手动选择。
    const defPath = await CKO.defaultVaultPath();

    function step1() {
      U.clear(box);
      box.appendChild(el('h2', { text: '欢迎使用 cKO 工作台' }));
      box.appendChild(el('p', { class: 'muted', text: '这是一个安装在电脑上的条件性敲除鼠管理程序。数据会真实保存在下面的文件夹（可整体拷贝、备份），已为你自动选好，确认即可。' }));
      box.appendChild(el('div', { class: 'form' }, [
        field('默认数据目录', el('input', { id: 'w-vault-default', class: 'inp', value: defPath || '（无法获取默认位置）', readonly: true }))
      ]));
      if (/OneDrive|坚果云|Dropbox|百度网盘|iCloud/i.test(defPath || '')) {
        box.appendChild(el('p', { class: 'warn', text: '⚠ 默认位置位于网盘同步范围，文件锁可能冲突，建议点“更改位置”改用本地文件夹。' }));
      }
      box.appendChild(el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn-ghost btn', text: '更改位置…', onclick: async () => { const p = await CKO.Store.chooseVault(); if (p) chooseDir(p); } }),
        el('button', { class: 'btn btn-primary', text: '在此创建工作台', onclick: async () => { const d = defPath || (await CKO.defaultVaultPath()); if (d) chooseDir(d); } })
      ]));
    }
    async function chooseDir(dir) {
      const info = await CKO.Store.validateVault(dir);
      if (info.isVault) { await CKO.App.loadVault(dir); finish(); return; }
      U.clear(box);
      box.appendChild(el('h3', { text: '确认数据目录' }));
      box.appendChild(el('p', { text: dir }));
      if (info.nonEmpty) box.appendChild(el('p', { class: 'warn', text: '⚠ 该文件夹非空。若它不是 cKO 工作台目录，请勿在此初始化。' }));
      if (/OneDrive|坚果云|Dropbox|百度网盘|iCloud/i.test(dir)) box.appendChild(el('p', { class: 'warn', text: '⚠ 该目录位于网盘同步范围，文件锁可能冲突，建议改用本地文件夹。' }));
      box.appendChild(el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn-ghost btn', text: '返回', onclick: step1 }),
        el('button', { class: 'btn btn-primary', text: '在此创建工作台', onclick: async () => { await CKO.App.ensureSetup(dir); step2(); } })
      ]));
    }
    function step2() {
      U.clear(box);
      box.appendChild(el('h3', { text: '建立位点档案' }));
      box.appendChild(el('p', { class: 'muted', text: '推荐从现有台账导入——自动带上位点与判定标准，一个字都不用重打。' }));
      box.appendChild(el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn btn-primary', text: '从现有台账导入', onclick: () => importStep() }),
        el('button', { class: 'btn', text: '仅用默认模板', onclick: () => { App.state.archive = CKO.templates.seedArchive(); step3(); } })
      ]));
    }
    function importStep() {
      const m = U.modal({ title: '选择台账 HTML', size: 'md' });
      m.body.appendChild(el('p', { class: 'muted', text: '选择旧版导出的台账 HTML 文件。' }));
      m.body.appendChild(el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn btn-primary', text: '选择文件', onclick: async () => {
          const p = await CKO.Store.openFile([{ name: 'HTML', extensions: ['html', 'htm'] }]);
          if (!p) return;
          const r = await CKO.__bridgeReadText(p);
          if (!r) return U.toast('读取失败', 'err');
          try {
            const out = CKO.migrate.transform(CKO.migrate.extractLedgerData(r.text), { archive: CKO.templates.seedArchive() });
            App.state.archive = CKO.templates.seedArchive();
            // 用迁移得到的项目 lizards 作为第一个项目
            importedProject = out;
            m.close(); step3(true);
          } catch (e) { U.toast('解析失败：' + (e.message || e), 'err'); }
        } })
      ]));
    }
    let importedProject = null;
    async function step3(fromImport) {
      U.clear(box);
      box.appendChild(el('h3', { text: '新建第一个项目' }));
      const arc = App.state.archive;
      const f = el('div', { class: 'form' }, [
        field('项目号', el('input', { id: 'w-code', class: 'inp', value: 'P1' })),
        field('标题', el('input', { id: 'w-title', class: 'inp', value: '我的 cKO 项目' })),
        field('物种', select(['rat', 'mouse', 'other'], 'rat', ['大鼠', '小鼠', '其他'])),
        field('品系', el('input', { id: 'w-strain', class: 'inp', value: '' }))
      ]);
      box.appendChild(f);
      box.appendChild(el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn-ghost btn', text: '上一步', onclick: step2 }),
        el('button', { class: 'btn btn-primary', text: '完成创建', onclick: async () => {
          let proj;
          if (fromImport && importedProject) {
            proj = importedProject.project; proj.id = M.uid();
            await CKO.Store.saveProject(proj);
          } else {
            proj = await App.createProject({
              code: document.getElementById('w-code').value, title: document.getElementById('w-title').value,
              species: document.getElementById('select-1').value, speciesLabel: document.getElementById('select-1').value === 'mouse' ? '小鼠' : '大鼠',
              strain: document.getElementById('w-strain').value,
              locusIds: arc.loci.map(l => l.id)
            });
          }
          App.state.index.projects = App.state.index.projects || [];
          if (!App.state.index.projects.find(p => p.id === proj.id)) App.state.index.projects.push({ id: proj.id, code: proj.code, title: proj.title });
          App.state.index.currentProjectId = proj.id;
          await CKO.Store.saveIndex(App.state.index);
          if (fromImport && importedProject) {
            await CKO.Store.saveRats(proj.id, importedProject.rats);
            for (const s of importedProject.sessions) await CKO.Store.saveSession(proj.id, s);
            App.state.rats = importedProject.rats; App.state.sessions = importedProject.sessions;
            U.toast(`已导入 ${importedProject.rats.length} 只鼠 / ${importedProject.sessions.length} 批次`, 'ok');
          }
          App.state.project = proj;
          finish();
        } })
      ]));
    }
    function finish() { overlay.remove(); if (onDone) onDone(); else CKO.refresh(); }
    step1();
  }

  // 暴露
  CKO.views = {
    overview: renderOverview, rats: renderRats, assays: renderAssays, dictation: renderDictation,
    worklog: renderWorklog, settings: renderSettings, wizard: renderWizard,
    pedigree: renderPedView, cages: renderCages
  };
  CKO.__views = { statCard, ratDetail: renderRatDetail, sessionDetail: renderSessionDetail };
})(window.CKO = window.CKO || {});
