'use strict';
/**
 * main.js — 渲染层启动器。构建导航、项目切换器，并引导首次启动向导。
 */
(function (CKO) {
  const U = CKO.ui, App = CKO.App;
  const el = U.el;
  let current = 'overview';

  const NAV = [
    { id: 'overview', label: '总览' },
    { id: 'rats', label: '鼠只档案' },
    { id: 'pedigree', label: '谱系' },
    { id: 'cages', label: '笼位' },
    { id: 'assays', label: '鉴定批次' },
    { id: 'dictation', label: '口述录入' },
    { id: 'worklog', label: '工作台日志' },
    { id: 'settings', label: '设置' }
  ];

  async function defaultVaultPath() {
    // bridge 方法统一返回 { ok, data }，这里取 r.data.path（不是 r.path）
    try { const r = await CKO.Store.bridge.defaultPath(); return r && r.data && r.data.path; } catch { return null; }
  }
  CKO.defaultVaultPath = defaultVaultPath;

  async function bridgeReadText(p) {
    try { const r = await CKO.Store.bridge.readText({ filePath: p }); return r; } catch (e) { U.toast('读取失败：' + (e.message || e), 'err'); return null; }
  }
  CKO.__bridgeReadText = bridgeReadText;

  function renderNav() {
    const nav = document.getElementById('nav');
    U.clear(nav);
    NAV.forEach(n => {
      const a = el('a', { class: 'nav-item' + (n.id === current ? ' active' : ''), text: n.label, href: '#', onclick: (e) => { e.preventDefault(); CKO.nav(n.id); } });
      nav.appendChild(a);
    });
  }

  function renderProjectSwitch() {
    const sw = document.getElementById('projSwitch');
    U.clear(sw);
    const idx = App.state.index;
    if (!idx || !idx.projects || !idx.projects.length) { sw.appendChild(el('span', { class: 'muted', text: '（无项目）' })); return; }
    const sel = el('select', { class: 'proj-select', onchange: async (e) => { await App.loadProject(e.target.value); CKO.refresh(); } });
    idx.projects.forEach(p => { const o = el('option', { value: p.id, text: p.title }); if (p.id === idx.currentProjectId) o.selected = true; sel.appendChild(o); });
    sw.appendChild(sel);
    sw.appendChild(el('button', { class: 'btn btn-sm', text: '+ 新项目', onclick: () => newProjectDialog() }));
  }

  async function newProjectDialog() {
    const arc = App.state.archive; if (!arc) return;
    const m = U.modal({ title: '新建项目', size: 'lg' });
    const loci = arc.loci.filter(l => !l.archived).map(l => Object.assign({}, l));
    m.body.appendChild(el('div', { class: 'form' }, [
      field('项目号', el('input', { id: 'np-code', class: 'inp', value: 'NEW' })),
      field('标题', el('input', { id: 'np-title', class: 'inp' })),
      field('物种', select(['rat', 'mouse', 'other'], 'rat', ['大鼠', '小鼠', '其他'])),
      field('品系', el('input', { id: 'np-strain', class: 'inp' }))
    ]));
    m.body.appendChild(el('div', { class: 'sec', text: '指标（位点）— 换别的敲除基因时，直接把名字改掉' }));
    const listBox = el('div', { class: 'locus-edit-list' });
    function renderRows() {
      U.clear(listBox);
      loci.forEach((l, i) => {
        listBox.appendChild(el('div', { class: 'locus-edit-row' }, [
          el('span', { class: 'muted', style: 'width:18px', text: String(i + 1) }),
          el('input', { class: 'inp', value: l.name, title: '指标名称', oninput: (e) => { l.name = e.target.value; } }),
          el('input', { class: 'inp', style: 'max-width:110px', value: l.short || '', title: '简称', oninput: (e) => { l.short = e.target.value; } }),
          el('button', { class: 'btn btn-sm btn-ghost', text: '×', title: '删除该指标', onclick: () => { loci.splice(i, 1); renderRows(); } })
        ]));
      });
      listBox.appendChild(el('button', { class: 'btn btn-sm', text: '+ 加一个指标', onclick: () => { loci.push(CKO.templates.blankLocus(loci.length + 1)); renderRows(); } }));
    }
    renderRows();
    m.body.appendChild(listBox);
    m.body.appendChild(el('p', { class: 'muted', style: 'font-size:12px', text: '默认带 Flox / KO / Cre 三个通用指标；做别的基因时，把名字改成你的基因名即可。' }));
    m.addActions([{ label: '取消', cls: 'btn-ghost', onClick: c => c() }, { label: '创建', cls: 'btn-primary', onClick: async (c) => {
      try {
        const sp = document.getElementById('select-1').value;
        await App.createProject({
          code: document.getElementById('np-code').value, title: document.getElementById('np-title').value,
          species: sp, speciesLabel: sp === 'mouse' ? '小鼠' : sp === 'rat' ? '大鼠' : '其他',
          strain: document.getElementById('np-strain').value, loci
        });
        c(); CKO.refresh();
      } catch (e) { U.toast('创建失败：' + (e.message || e), 'err'); }
    } }]);
  }
  function field(label, control) { return el('label', { class: 'field' }, [el('span', { class: 'field-label', text: label }), control]); }
  function select(values, def, labels) {
    const s = el('select', { class: 'inp', id: 'select-1' });
    values.forEach((v, i) => { const o = el('option', { value: v, text: labels ? labels[i] : v }); if (v === def) o.selected = true; s.appendChild(o); });
    return s;
  }

  async function nav(view, arg) {
    current = view;
    renderNav();
    const root = document.getElementById('content');
    if (!App.state.project && view !== 'overview') {
      // 没有项目时大多数视图不可用
    }
    try {
      if (view === 'overview') CKO.views.overview(root);
      else if (view === 'rats') CKO.views.rats(root, arg);
      else if (view === 'pedigree') CKO.views.pedigree(root);
      else if (view === 'cages') CKO.views.cages(root);
      else if (view === 'assays') CKO.views.assays(root, arg);
      else if (view === 'dictation') CKO.views.dictation(root);
      else if (view === 'worklog') await CKO.views.worklog(root, arg);
      else if (view === 'settings') await CKO.views.settings(root);
    } catch (e) { U.toast('渲染出错：' + (e.message || e), 'err'); console.error(e); }
    const title = document.getElementById('viewTitle'); if (title) title.textContent = (NAV.find(n => n.id === view) || {}).label || '';
  }
  CKO.nav = nav;
  CKO.newProjectDialog = newProjectDialog;

  async function refresh() { renderProjectSwitch(); await nav(current); }
  CKO.refresh = refresh;

  function hideSplash() { const s = document.getElementById('bootSplash'); if (s) s.remove(); }

  async function boot() {
    let r;
    try { r = await App.boot(); } catch (e) { r = { needsSetup: true, error: (e && e.message) || String(e) }; }
    hideSplash();
    if (r.needsSetup) {
      // 仅当自动就位失败（磁盘只读/权限等罕见情况）才弹向导手动兜底
      await CKO.views.wizard({ onDone: () => { CKO.refresh(); } });
    } else {
      renderProjectSwitch(); await nav('overview');
    }
    if (!CKO.FS) {
      const banner = el('div', { class: 'debug-banner', text: '⚠ 当前为浏览器调试模式，数据不会真正落盘。请通过桌面程序运行。' });
      document.body.insertBefore(banner, document.body.firstChild);
    }
    // 启动时看一眼收件箱，有智能体投递就提示
    if (CKO.FS && CKO.Store.inboxList) {
      try {
        const files = await CKO.Store.inboxList();
        if (files && files.length) U.toast('收件箱有 ' + files.length + ' 个待处理文件（去「口述录入」处理）', 'info');
      } catch (e) { /* 忽略 */ }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.CKO = window.CKO || {});
