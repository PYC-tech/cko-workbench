'use strict';
/**
 * app.js — 中枢控制器。持有当前状态（vault / 档案 / 项目 / 鼠只 / 批次 / 日志），
 * 提供建库、建项目、导入、口述落库与提示词卡片生成。视图层只调这里与 Store。
 */
(function (CKO) {
  const M = CKO.model, T = CKO.templates, Store = CKO.Store, gtx = CKO.genetics;

  const App = {
    state: { vault: null, archive: null, index: null, project: null, rats: [], sessions: [], logs: {} },
    lastUsedVaultKey: 'cko:last-vault',

    async boot() {
      const v = await Store.getVault();
      if (v) { const ok = await this.loadVault(v); if (ok) { await this.ensureSeed(); return { needsSetup: false }; } }
      // 尝试读取上次目录
      try { const last = localStorage.getItem(this.lastUsedVaultKey); if (last) { const ok = await this.loadVault(last); if (ok) { await this.ensureSeed(); return { needsSetup: false }; } } } catch {}
      // 首次启动：全自动就位，不弹任何向导、不要求选择目录
      try { const p = await this.autoInit(); return { needsSetup: false, auto: p }; }
      catch (e) { return { needsSetup: true, error: (e && e.message) || String(e) }; }
    },

    // 数据目录里一个项目都没有时，自动载入内置示例（虚构数据），保证「打开即见」。
    async ensureSeed() {
      const idx = this.state.index;
      if (!idx || (idx.projects && idx.projects.length)) return;
      await this.importSeedProject(CKO.seedDemo);
    },

    // 把一份示例数据（项目 + 鼠只 + 批次）写入当前数据目录。
    async importSeedProject(seed) {
      if (!seed || !seed.project) throw M.mk('E_BAD_ARG', '程序未内置示例数据');
      const p = Object.assign({}, seed.project, { id: M.uid() });
      await Store.saveProject(p);
      const rats = (seed.rats || []).map(r => M.makeRat(r));
      await Store.saveRats(p.id, rats);
      for (const s of (seed.sessions || [])) await Store.saveSession(p.id, M.makeSession(s));
      this.state.index = this.state.index || { schemaVersion: 3, projects: [], currentProjectId: null, settings: {} };
      this.state.index.projects = this.state.index.projects || [];
      this.state.index.projects.push({ id: p.id, code: p.code, title: p.title });
      this.state.index.currentProjectId = p.id;
      await Store.saveIndex(this.state.index);
      this.state.project = p;
      this.state.rats = rats;
      this.state.sessions = (seed.sessions || []).map(s => M.makeSession(s)).sort((a, b) => a.seq - b.seq);
      return p;
    },

    // 全自动初始化：建数据目录骨架 → 落盘全局位点档案 → 载入内置示例项目，直接可用。
    async autoInit() {
      const r = await Store.bootstrap();
      if (!r || !r.path) throw new Error('无法初始化数据目录');
      await Store.setVault(r.path);
      this.state.vault = r.path;
      try { localStorage.setItem(this.lastUsedVaultKey, r.path); } catch {}
      this.state.archive = T.seedArchive();
      await Store.saveArchive(this.state.archive);
      this.state.index = { schemaVersion: 3, projects: [], currentProjectId: null, settings: {} };

      // 内置示例（虚构数据）。示例不可用时退回一个空项目，保证程序仍能开。
      try { await this.importSeedProject(CKO.seedDemo); }
      catch (e) {
        await this.createProject({
          code: 'P1', title: '我的 cKO 项目', species: 'rat', speciesLabel: '大鼠',
          strain: '', locusIds: this.state.archive.loci.filter(l => !l.archived).map(l => l.id)
        });
      }
      return r.path;
    },

    async loadVault(dir) {
      const info = await Store.validateVault(dir);
      if (!info.isVault) return false;
      await Store.setVault(dir);
      this.state.vault = dir;
      try { localStorage.setItem(this.lastUsedVaultKey, dir); } catch {}
      this.state.index = await Store.loadIndex() || { schemaVersion: 3, projects: [], currentProjectId: null, settings: {} };
      this.state.archive = await Store.loadArchive() || T.seedArchive();
      if (!this.state.index.projects || !this.state.index.projects.length) return true;
      const cur = this.state.index.currentProjectId || this.state.index.projects[0].id;
      await this.loadProject(cur);
      return true;
    },

    async ensureSetup(dir) {
      await Store.createVault(dir);
      this.state.vault = dir;
      try { localStorage.setItem(this.lastUsedVaultKey, dir); } catch {}
      this.state.archive = T.seedArchive();
      await Store.saveArchive(this.state.archive);
      this.state.index = { schemaVersion: 3, projects: [], currentProjectId: null, settings: {} };
      await Store.saveIndex(this.state.index);
      return true;
    },

    async createProject(opts) {
      const lociFinal = opts.loci || T.lociByIds(this.state.archive, opts.locusIds);
      const idset = new Set(lociFinal.map(l => l.id));
      const targetsFinal = opts.targets || (['target_ko', 'cre', 'target_flox'].every(x => idset.has(x)) ? T.defaultTargets() : []);
      const proj = M.makeProject({
        code: opts.code || '', title: opts.title || (opts.code + ' · cKO 工作台'),
        species: opts.species || 'rat', speciesLabel: opts.speciesLabel || (opts.species === 'mouse' ? '小鼠' : '大鼠'),
        strain: opts.strain || '', meta: opts.meta || { goalSpec: '', goal: '', goalNote: '', note: '' },
        loci: lociFinal,
        targets: targetsFinal
      });
      // 校验
      M.validateProject(proj);
      await Store.saveProject(proj);
      this.state.index.projects = this.state.index.projects || [];
      this.state.index.projects.push({ id: proj.id, code: proj.code, title: proj.title });
      this.state.index.currentProjectId = proj.id;
      await Store.saveIndex(this.state.index);
      this.state.project = proj;
      this.state.rats = []; this.state.sessions = []; this.state.logs = {};
      return proj;
    },

    async loadProject(id) {
      const proj = await Store.loadProject(id);
      if (!proj) throw M.mk('E_NOT_FOUND', '项目不存在：' + id);
      this.state.project = proj;
      this.state.rats = await Store.loadRats(id) || [];
      const names = await Store.listSessions(id) || [];
      this.state.sessions = [];
      for (const n of names) { const s = await Store.loadSession(id, n); if (s) this.state.sessions.push(s); }
      this.state.sessions.sort((a, b) => a.seq - b.seq);
      this.state.index.currentProjectId = id;
      await Store.saveIndex(this.state.index);
      return proj;
    },

    async saveProject() { await Store.saveProject(this.state.project); },
    async saveRats() { await Store.saveRats(this.state.project.id, this.state.rats); },
    async saveSession(s) { await Store.saveSession(this.state.project.id, s); this.state.sessions = (this.state.sessions || []).filter(x => x.id !== s.id); this.state.sessions.push(s); this.state.sessions.sort((a, b) => a.seq - b.seq); },

    // 导入 HTML 台账（权威源 = LEDGER_DATA）
    async importFromHTML(htmlText) {
      const data = CKO.migrate.extractLedgerData(htmlText);
      const out = CKO.migrate.transform(data, { archive: this.state.archive });
      M.assertMigration(out.project, out.rats);
      // 建项目
      out.project.id = M.uid();
      await Store.saveProject(out.project);
      this.state.index.projects = this.state.index.projects || [];
      this.state.index.projects.push({ id: out.project.id, code: out.project.code, title: out.project.title });
      this.state.index.currentProjectId = out.project.id;
      await Store.saveIndex(this.state.index);
      // 存鼠只
      await Store.saveRats(out.project.id, out.rats);
      // 存批次
      for (const s of out.sessions) await Store.saveSession(out.project.id, s);
      this.state.project = out.project; this.state.rats = out.rats; this.state.sessions = out.sessions;
      return { rats: out.rats.length, sessions: out.sessions.length };
    },

    // ── 口述落库 ──
    // 把解析草稿物化为变更计划（不写盘）。供确认表与 dry-run 共用。
    materialize(draft) {
      const proj = this.state.project;
      const loci = proj.loci.filter(l => !l.archived);
      const ratByTag = {}; this.state.rats.forEach(r => { ratByTag[r.tag] = r; });
      const plan = { rows: [], newSession: null, stats: { newRats: 0, updateRats: 0, stated: 0, batchStated: 0, defaulted: 0, omitted: 0, overwrites: [] } };
      const date = draft.session.date || new Date().toISOString().slice(0, 10);
      draft.lanes.forEach(lane => {
        if (lane.errors && lane.errors.length) { plan.rows.push({ tag: lane.tag, error: lane.errors.join('；') }); return; }
        let rat = ratByTag[lane.tag];
        const isNew = !rat;
        if (isNew) { rat = M.makeRat({ id: M.uid(), tag: lane.tag, sex: lane.sex === 'M' ? 'M' : lane.sex === 'F' ? 'F' : 'U' }); plan.stats.newRats++; }
        else plan.stats.updateRats++;
        const row = { tag: lane.tag, isNew, ratId: rat.id, sex: lane.sex, updates: [], omitted: [] };
        loci.forEach(l => {
          const cell = lane.cells[l.id];
          if (cell && cell.call != null) {
            const prev = rat.gt[l.id] ? rat.gt[l.id].call : null;
            if (prev != null && prev !== cell.call) plan.stats.overwrites.push({ tag: lane.tag, locus: l.name, from: prev, to: cell.call });
            row.updates.push({ locusId: l.id, locusName: l.name, call: cell.call, bands: cell.bands, src: cell.src, from: prev, to: cell.call });
            if (cell.src === 'stated') plan.stats.stated++;
            else if (cell.src === 'batch-stated') plan.stats.batchStated++;
            else plan.stats.defaulted++;
          } else if (lane.omitted.includes(l.id)) {
            row.omitted.push(l.name); plan.stats.omitted++;
          }
        });
        plan.rows.push(row);
      });
      // 组装批次
      const seq = (this.state.sessions || []).length ? Math.max(...this.state.sessions.map(s => s.seq)) + 1 : 1;
      const lanes = draft.lanes.map((lane, i) => ({
        idx: i + 1, tag: lane.tag, type: 'sample', sex: lane.sex === 'M' ? '雄' : lane.sex === 'F' ? '雌' : '',
        warn: lane.errors || [],
        gts: loci.filter(l => lane.cells[l.id] && lane.cells[l.id].call != null).map(l => ({ locus: l.id, call: lane.cells[l.id].call, sure: true, bands: lane.cells[l.id].bands, raw: lane.cells[l.id].raw, src: lane.cells[l.id].src })),
        raw: lane.tag
      }));
      plan.newSession = { id: seq, seq, date, images: [], lanes, note: draft.session.note || '', targetId: draft.session.targetId || null, kind: 'genotyping', source: 'dictation', rawStmt: draft.session.note || '' };
      return plan;
    },

    // 提交计划（写盘）
    async commitPlan(plan) {
      const proj = this.state.project;
      const ratByTag = {}; this.state.rats.forEach(r => ratByTag[r.tag] = r);
      for (const row of plan.rows) {
        if (row.error) continue;
        let rat = ratByTag[row.tag];
        const isNew = !rat;
        if (isNew) { rat = M.makeRat({ id: M.uid(), tag: row.tag }); this.state.rats.push(rat); }
        if (row.sex && row.sex !== '?') rat.sex = row.sex;
        rat.gt = rat.gt || {};
        for (const u of row.updates) {
          const prev = rat.gt[u.locusId] ? rat.gt[u.locusId].call : null;
          rat.gt[u.locusId] = { call: u.call, bands: u.bands === undefined ? null : u.bands, date: plan.newSession.date, raw: u.src === 'default' ? '项目默认' : u.src === 'batch-stated' ? '@本批默认' : null, prev, src: u.src, locusVersion: 1 };
        }
        rat.updatedAt = new Date().toISOString();
        // 记录到事件时间线
        rat.events = rat.events || [];
        rat.events.push(M.makeRatEvent({ kind: 'pcr', date: plan.newSession.date, text: '鉴定（批次 #' + plan.newSession.seq + '）', sessionId: plan.newSession.id, payload: { gt: row.updates.map(u => u.locusName + '=' + u.call) } }));
      }
      await Store.saveRats(proj.id, this.state.rats);
      await this.saveSession(plan.newSession);
      return { savedRats: plan.rows.filter(r => !r.error).length, session: plan.newSession.seq };
    },

    // ── 提示词卡片（由当前项目 loci 自动生成）──
    buildPromptCard(proj) {
      proj = proj || this.state.project;
      const lociRows = proj.loci.filter(l => !l.archived).map(l =>
        `| ${l.name} | ${(l.aliases || []).join(', ')} | ${l.order.map(c => `${c}=${l.labels[c] || c}`).join(' / ')} |`
      ).join('\n');
      const required = proj.loci.filter(l => !l.archived).map(l => l.name).join(' | ');
      const defaults = proj.loci.filter(l => !l.archived && l.defaultValue != null && l.defaultValue !== '').map(l =>
        `- ${l.name}：未提及时默认「${l.defaultValue}」= ${l.labels[l.defaultValue] || l.defaultValue}`
      ).join('\n');
      return `你是实验数据录入助手。请把我下面口述的鉴定结果整理成【固定格式】的行式文本。
你只做格式整理，禁止任何推断、补全、换算或"合理猜测"。

═══ 一、本项目位点定义（必须使用"位点名"列的原词） ═══
| 位点名 | 可接受的别名（我可能这么说） | 取值（只能从这里选） |
|---|---|---|
${lociRows}

═══ 二、每个位点都必须出现（没听到就写 ?，不许省略该列） ═══
${required}

═══ 三、输出格式（严格遵守，不要加任何解释文字） ═══
第 1 行：@日期 YYYY-MM-DD
第 2 行：@泳道顺序 耳号1 耳号2 …            ← 按我口述的先后顺序原样排列
之后每只鼠一行，字段用竖线 | 分隔：
耳号 | 性别 | 位点名=取值 | 位点名=取值 | …
末尾可加：@备注 我额外说的任何话（原样保留）

═══ 四、取值前缀（关键，不许混用） ═══
- 不加前缀   我逐只明确念到的取值        例：目标基因-Flox=double
- 加 ~ 前缀  我在"整批统一陈述"里说的    例：目标基因-Flox=~single
             （如"这批鼠所有的 KO 都是阳性的"这类一句话覆盖多只的表述）
- 写 ?       我在任何地方都没提到该位点  例：目标基因-Flox=?
★ 严禁把 ? 写成阴性/无带，严禁用上一只鼠的取值补下一只，严禁根据常识推断。

═══ 五、我可能会单独给你批次级信息（没有就忽略） ═══
@本批默认 位点名=取值

═══ 六、其他纪律 ═══
1. 耳号原样保留我念的数字串（包括可能是听写错字的形式，如"1197"），不要擅自改号、不要补零。
2. 性别只写 M 或 F，没提到写 ?，不要默认。
3. 取值必须用英文代号（double/single/none/pos/neg 等），不要写中文。
4. 如果某个取值你听不清或你有疑问，在后面加（?）由我核对，不要猜。
5. 输出中不要出现表格线、不要出现 Markdown 标题、不要出现解释段落。

═══ 七、我现在开始口述 ═══
${defaults ? '\n（本批默认值提示，仅供参考，不要替我加 ? 列）\n' + defaults + '\n' : ''}`;
    },

    // 统计
    stats() {
      const proj = this.state.project; if (!proj) return null;
      const rats = this.state.rats;
      const alive = rats.filter(r => r.status === 'alive').length;
      const hits = rats.filter(r => M.isTarget(r, proj.targets, proj.loci).length > 0).length;
      return { total: rats.length, alive, target: hits, loci: proj.loci.filter(l => !l.archived).length, sessions: (this.state.sessions || []).length };
    }
  };

  CKO.App = App;
})(window.CKO = window.CKO || {});
