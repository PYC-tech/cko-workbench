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

    // 改本项目的指标名 / 简称 / 别名。
    // 安全边界：locus.id 不可变（鼠只的 gt 以 id 为键），所以这里只改显示层的名字，
    // 已录入的基因型一条不动；已被鼠只引用的位点禁止删除，否则基因型会变孤儿。
    async updateProjectLoci(loci) {
      const proj = this.state.project;
      if (!proj) throw M.mk('E_BAD_ARG', '没有打开的项目');
      const keep = new Set(loci.map(l => l.id));
      for (const old of (proj.loci || [])) {
        if (keep.has(old.id) || old.archived) continue;
        const used = (this.state.rats || []).filter(r => r.gt && r.gt[old.id] != null).length;
        if (used) throw M.mk('E_BAD_ARG', `位点「${old.name}」已有 ${used} 只鼠的鉴定数据，不能删除；暂时不用请留着或改名。`);
      }
      const archived = (proj.loci || []).filter(l => l.archived);
      proj.loci = loci.map(l => M.makeLocus(l)).concat(archived);
      proj.updatedAt = new Date().toISOString();
      M.validateProject(proj);
      await Store.saveProject(proj);
      return proj;
    },

    // 改全局位点档案：只影响**以后新建**的项目，已建成的项目持有自己的副本，不受牵连。
    async saveArchiveLoci(loci) {
      const arc = this.state.archive || T.seedArchive();
      const archived = (arc.loci || []).filter(l => l.archived);
      arc.loci = loci.map(l => M.makeLocus(l)).concat(archived);
      arc.updatedAt = new Date().toISOString();
      this.state.archive = arc;
      await Store.saveArchive(arc);
      return arc;
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
      const date = draft.session.date || new Date().toISOString().slice(0, 10);
      const plan = {
        rows: [], created: [], newSession: null, newborns: [], crosses: draft.session.crosses || [],
        notes: draft.notes || [], fatal: draft.fatal || [], errors: [], warnings: [],
        stats: {
          newRats: 0, updateRats: 0, stated: 0, batchStated: 0, defaulted: 0, omitted: 0, overwrites: [],
          newborns: 0, cageChanges: 0, cageKeep: 0, pedChanges: 0, pedKeep: 0
        }
      };
      // 工作副本：byTag 内含已存在的鼠 + 本段将新建的鼠（分配 id 后立即登记，供同段互相引用）
      const byTag = {}; this.state.rats.forEach(r => { byTag[r.tag] = r; });
      const created = plan.created;
      const alloc = (tag, init) => {
        if (byTag[tag]) return byTag[tag];
        const r = M.makeRat(Object.assign({ id: M.uid(), tag, sex: 'U' }, init || {}));
        byTag[tag] = r; created.push(r); return r;
      };

      // ① @新生：先批量建档，并挂上出生/窝号/笼位（父母在第三趟统一解析）
      (draft.newborns || []).forEach(nb => {
        const birth = nb.birth || date, cage = nb.cage || '';
        const group = { birth, litter: nb.litter || '', sireTag: nb.sire || '', damTag: nb.dam || '', cage, tags: [], dupes: [] };
        nb.tags.forEach(t => {
          if (byTag[t.tag]) { group.dupes.push(t.tag); return; }
          const r = alloc(t.tag, { sex: t.sex || 'U', birth, litter: group.litter || null, cage, cageSince: cage ? birth : null, source: '自繁' });
          r.events.push(M.makeRatEvent({ kind: 'birth', date: birth, text: '出生' + (group.litter ? '（' + group.litter + '）' : '') }));
          if (cage) r.events.push(M.makeRatEvent({ kind: 'transfer', date: birth, text: '入 ' + cage + ' 笼' }));
          group.tags.push(t.tag);
          plan.stats.newRats++; plan.stats.newborns++;
          plan.rows.push({
            tag: t.tag, isNew: true, ratId: r.id, sex: r.sex, updates: [], omitted: [], warnings: [],
            newborn: true, cage: null, applyCage: !!cage, cageAfter: cage, cageSrc: cage ? 'stated' : 'keep',
            sireTag: group.sireTag || undefined, damTag: group.damTag || undefined, changes: [],
            changesText: ['新生儿建档' + (group.litter ? '（' + group.litter + '）' : '') + (cage ? '，入 ' + cage + ' 笼' : '')]
          });
        });
        if (group.dupes.length) plan.errors.push('@新生 的耳号已存在：' + group.dupes.join('、') + '（要给已有鼠补资料，请直接用数据行）');
        plan.newborns.push(group);
      });

      // ② 数据行：基因型 + 笼位/父母/出生/窝号/性别/状态/备注
      draft.lanes.forEach(lane => {
        if (lane.errors && lane.errors.length) { plan.rows.push({ tag: lane.tag, error: lane.errors.join('；') }); return; }
        let rat = byTag[lane.tag];
        const isNew = !rat;
        if (isNew) { rat = alloc(lane.tag, { sex: lane.sex === 'M' ? 'M' : lane.sex === 'F' ? 'F' : 'U' }); plan.stats.newRats++; }
        else plan.stats.updateRats++;
        const row = {
          tag: lane.tag, isNew, ratId: rat.id, sex: lane.sex, updates: [], omitted: [], warnings: lane.warnings || [],
          cage: lane.cage, applyCage: !!lane.cage, changes: [], changesText: []
        };
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
        // 笼位
        if (lane.cage) {
          const before = rat.cage || '';
          const after = lane.cage.clear ? '' : lane.cage.value;
          row.cageAfter = after;
          row.cageSrc = lane.cage.clear ? 'clear' : lane.cage.src;
          if (before !== after) { row.changesText.push('笼位 ' + (before || '—') + ' → ' + (after || '清空')); plan.stats.cageChanges++; }
        } else { row.cageAfter = rat.cage || ''; row.cageSrc = 'keep'; plan.stats.cageKeep++; }
        // 父母：这里只留耳号，第三趟统一解析成 id
        row.sireTag = lane.sire ? (lane.sire.clear ? '' : lane.sire.tag) : undefined;
        row.damTag = lane.dam ? (lane.dam.clear ? '' : lane.dam.tag) : undefined;
        if (row.sireTag === undefined && row.damTag === undefined) plan.stats.pedKeep++;
        row.birth = lane.birth ? lane.birth.value : undefined;
        row.litter = lane.litter ? lane.litter.value : undefined;
        row.status = lane.status ? lane.status.value : undefined;
        row.note = lane.note ? lane.note.value : undefined;
        plan.rows.push(row);
      });

      // ②b @清空笼位 里列到、但没有对应数据行的耳号（单独一条指令也要生效）
      (draft.session.clears || []).forEach(tag => {
        if (plan.rows.some(r => r.tag === tag)) return;      // 该行已按「笼=」处理
        const rat = byTag[tag];
        if (!rat) { plan.errors.push('@清空笼位 的耳号 ' + tag + ' 在项目里找不到'); return; }
        plan.rows.push({
          tag, isNew: false, ratId: rat.id, sex: '?', updates: [], omitted: [], warnings: [],
          cage: { clear: true, src: 'stated' }, applyCage: true, cageAfter: '', cageSrc: 'clear',
          changesText: rat.cage ? ['笼位 ' + rat.cage + ' → 清空'] : []
        });
        if (rat.cage) plan.stats.cageChanges++;
      });

      // ③ 解析父母耳号 → id，再整体体检（含成环/自引/父=母/找不到）
      const idOf = t => (byTag[t] ? byTag[t].id : undefined);
      const pending = {};
      plan.rows.forEach(row => {
        if (row.error) return;
        if (row.sireTag === undefined && row.damTag === undefined) return;
        const cur = byTag[row.tag]; if (!cur) return;
        const sire = row.sireTag === undefined ? (cur.sire == null ? null : cur.sire) : (row.sireTag === '' ? null : idOf(row.sireTag));
        const dam = row.damTag === undefined ? (cur.dam == null ? null : cur.dam) : (row.damTag === '' ? null : idOf(row.damTag));
        const bad = [];
        if (row.sireTag !== undefined && row.sireTag !== '' && sire === undefined) bad.push('父「' + row.sireTag + '」在项目里找不到');
        if (row.damTag !== undefined && row.damTag !== '' && dam === undefined) bad.push('母「' + row.damTag + '」在项目里找不到');
        if (bad.length) { row.error = bad.join('；'); plan.errors.push(row.tag + '：' + row.error); return; }
        row.sireId = sire; row.damId = dam; row.applyPed = true;
        pending[cur.id] = { sire, dam };
        const tagOf = id => { const r = Object.keys(byTag).map(k => byTag[k]).find(x => x.id === id); return r ? r.tag : ('id ' + id); };
        const beforeSire = cur.sire == null ? null : cur.sire, beforeDam = cur.dam == null ? null : cur.dam;
        if (row.sireTag !== undefined && beforeSire !== sire) { row.changesText.push('父 ' + (beforeSire == null ? '—' : tagOf(beforeSire)) + ' → ' + (sire == null ? '—' : row.sireTag)); plan.stats.pedChanges++; }
        if (row.damTag !== undefined && beforeDam !== dam) { row.changesText.push('母 ' + (beforeDam == null ? '—' : tagOf(beforeDam)) + ' → ' + (dam == null ? '—' : row.damTag)); plan.stats.pedChanges++; }
      });
      const allRats = this.state.rats.concat(created);
      const ped = M.checkPedigree(allRats, pending);
      ped.errors.forEach(e => {
        const row = plan.rows.find(r => r.ratId === e.id && !r.error);
        const text = (e.tag || '?') + '：' + e.text;
        plan.errors.push(text);
        if (row) row.error = e.text; else plan.warnings.push(text);
      });
      ped.warnings.forEach(w => plan.warnings.push((w.tag || '?') + '：' + w.text));

      // ④ 批次：只有当本段确实涉及鉴定时才建（否则纯笼位/谱系会凭空多一个空批次）
      const hasGt = draft.lanes.some(l => Object.keys(l.cells || {}).length > 0 || (l.omitted || []).length > 0);
      if (hasGt) {
        const seq = (this.state.sessions || []).length ? Math.max(...this.state.sessions.map(s => s.seq)) + 1 : 1;
        const lanes = draft.lanes.map((lane, i) => ({
          idx: i + 1, tag: lane.tag, type: 'sample', sex: lane.sex === 'M' ? '雄' : lane.sex === 'F' ? '雌' : '',
          warn: lane.errors || [],
          gts: loci.filter(l => lane.cells[l.id] && lane.cells[l.id].call != null).map(l => ({ locus: l.id, call: lane.cells[l.id].call, sure: true, bands: lane.cells[l.id].bands, raw: lane.cells[l.id].raw, src: lane.cells[l.id].src })),
          raw: lane.tag
        }));
        plan.newSession = { id: seq, seq, date, images: [], lanes, note: draft.session.note || '', targetId: draft.session.targetId || null, kind: 'genotyping', source: 'dictation', rawStmt: draft.session.note || '' };
      }
      plan.date = date;
      return plan;
    },

    // 提交计划（写盘）
    async commitPlan(plan) {
      const proj = this.state.project;
      const date = (plan.newSession && plan.newSession.date) || plan.date || new Date().toISOString().slice(0, 10);
      const tagName = id => { const r = this.state.rats.find(x => x.id === id); return r ? r.tag : '—'; };
      // ① 落新鼠：沿用 materialize 分配的 id，保证父母引用与预览一致
      const byTag = {}; this.state.rats.forEach(r => { byTag[r.tag] = r; });
      for (const r of (plan.created || [])) { if (!byTag[r.tag]) { this.state.rats.push(r); byTag[r.tag] = r; } }
      // ② 逐行写（有 error 的行整行跳过）
      let saved = 0;
      for (const row of plan.rows) {
        if (row.error) continue;
        const rat = byTag[row.tag]; if (!rat) continue;
        if (row.sex && row.sex !== '?') rat.sex = row.sex;
        rat.gt = rat.gt || {};
        for (const u of (row.updates || [])) {
          const prev = rat.gt[u.locusId] ? rat.gt[u.locusId].call : null;
          rat.gt[u.locusId] = {
            call: u.call, bands: u.bands === undefined ? null : u.bands, date,
            raw: u.src === 'default' ? '项目默认' : u.src === 'batch-stated' ? '@本批默认' : null,
            prev, src: u.src, locusVersion: 1
          };
        }
        rat.events = rat.events || [];
        if (row.birth !== undefined) rat.birth = row.birth || null;
        if (row.litter !== undefined) rat.litter = row.litter || null;
        if (row.note) rat.note = row.note;
        if (row.status) {
          rat.status = row.status; rat.statusDate = date;
          rat.events.push(M.makeRatEvent({ kind: row.status === 'dead' ? 'dead' : row.status === 'culled' ? 'culled' : 'note', date, text: '状态改为 ' + row.status }));
        }
        if (row.applyCage) {
          const before = rat.cage || '';
          const after = row.cageAfter || '';
          if (before !== after) {
            rat.cage = after;
            rat.cageSince = after ? date : null;   // 清空笼位 → cageSince 置 null（不是今天）
            rat.events.push(M.makeRatEvent({ kind: 'transfer', date, text: after ? '转入 ' + after + ' 笼' : '移出笼位（原 ' + before + '）' }));
          }
        }
        if (row.applyPed) {
          const bs = rat.sire == null ? null : rat.sire, bd = rat.dam == null ? null : rat.dam;
          const s = row.sireTag === undefined ? bs : (row.sireId == null ? null : row.sireId);
          const d = row.damTag === undefined ? bd : (row.damId == null ? null : row.damId);
          if (bs !== s || bd !== d) {
            rat.sire = s; rat.dam = d;
            const parts = [];
            if (bs !== s) parts.push('父 ' + (bs == null ? '—' : tagName(bs)) + ' → ' + (s == null ? '—' : tagName(s)));
            if (bd !== d) parts.push('母 ' + (bd == null ? '—' : tagName(bd)) + ' → ' + (d == null ? '—' : tagName(d)));
            rat.events.push(M.makeRatEvent({ kind: 'note', date, text: '谱系修改：' + parts.join('；') }));
          }
        }
        if ((row.updates || []).length && plan.newSession) {
          rat.events.push(M.makeRatEvent({
            kind: 'pcr', date, text: '鉴定（批次 #' + plan.newSession.seq + '）', sessionId: plan.newSession.id,
            payload: { gt: row.updates.map(u => u.locusName + '=' + u.call) }
          }));
        }
        rat.updatedAt = new Date().toISOString();
        saved++;
      }
      // ③ @配种：只记 cross 事件（可同时改笼），绝不写 sire/dam
      for (const c of (plan.crosses || [])) {
        const a = byTag[c.sire], b = byTag[c.dam];
        if (!a || !b) continue;
        const tail = c.cage ? '（' + c.cage + ' 繁殖笼）' : '';
        a.events = a.events || []; b.events = b.events || [];
        a.events.push(M.makeRatEvent({ kind: 'cross', date, text: '与 ' + b.tag + ' 同笼配种' + tail }));
        b.events.push(M.makeRatEvent({ kind: 'cross', date, text: '与 ' + a.tag + ' 同笼配种' + tail }));
        if (c.cage) [a, b].forEach(r => {
          if ((r.cage || '') !== c.cage) {
            r.cage = c.cage; r.cageSince = date;
            r.events.push(M.makeRatEvent({ kind: 'transfer', date, text: '转入 ' + c.cage + ' 笼（配种）' }));
          }
        });
      }
      // ④ 最后防线：写盘前对最终状态再体检一次
      const ped = M.checkPedigree(this.state.rats);
      if (ped.errors.length) throw M.mk('E_BAD_ARG', '谱系校验未通过：' + ped.errors.map(e => (e.tag || '?') + ' ' + e.text).join('；'));
      await Store.saveRats(proj.id, this.state.rats);
      if (plan.newSession) await this.saveSession(plan.newSession);
      return { savedRats: saved, session: plan.newSession ? plan.newSession.seq : null };
    },

    // ── 提示词卡片（由当前项目 loci 自动生成）──
    buildPromptCard(proj) {
      proj = proj || this.state.project;
      const active = proj.loci.filter(l => !l.archived);
      const lociRows = active.map(l =>
        `| ${l.name} | ${l.short || ''} | ${(l.aliases || []).join(', ')} | ${l.order.map(c => `${c}=${l.labels[c] || c}`).join(' / ')} |`
      ).join('\n');
      const required = active.map(l => l.name).join(' | ');
      const defaults = active.filter(l => l.defaultValue != null && l.defaultValue !== '').map(l =>
        `- ${l.name}：未提及时默认「${l.defaultValue}」= ${l.labels[l.defaultValue] || l.defaultValue}`
      ).join('\n');
      // 示例一律用当前项目第一个指标名，不写死（改名后提示词里不会残留旧名字）
      const exName = (active[0] || {}).name || '位点名';
      const lociShort = active.map(l => l.name + (l.short ? '（' + l.short + '）' : '')).join(' / ');
      return `你是实验数据录入助手。请把我下面口述的鉴定结果整理成【固定格式】的行式文本。
你只做格式整理，禁止任何推断、补全、换算或"合理猜测"。

═══ 一、本项目位点定义（必须使用"位点名"列的原词） ═══
| 位点名 | 简称 | 可接受的别名（我可能这么说） | 取值（只能从这里选） |
|---|---|---|---|
${lociRows}

═══ 二、每个位点都必须出现（没听到就写 ?，不许省略该列） ═══
${required}
（位点可以用简称写：${lociShort}）

═══ 三、输出格式（严格遵守，不要加任何解释文字） ═══
第 1 行：@日期 YYYY-MM-DD
第 2 行：@泳道顺序 耳号1 耳号2 …            ← 按我口述的先后顺序原样排列
之后每只鼠一行，字段用竖线 | 分隔：
耳号 | 性别 | 位点名=取值 | 位点名=取值 | … | 笼=笼号 | 父=耳号 | 母=耳号
- 笼 / 父 / 母 这三格是"额外信息"，我**没提到就整格不要写**（不是写 ?）。
- 我只说笼位、没说鉴定结果时，就只输出「耳号 | 性别 | 笼=B4」这样一行，不要补位点列。
末尾可加：@备注 我额外说的任何话（原样保留）

═══ 四、取值前缀（关键，不许混用） ═══
- 不加前缀   我逐只明确念到的取值        例：${exName}=double
- 加 ~ 前缀  我在"整批统一陈述"里说的    例：${exName}=~single 或 ${exName}~single
             （如"这批鼠所有的 KO 都是阳性的"这类一句话覆盖多只的表述）
- 写 ?       我在任何地方都没提到该位点  例：${exName}=?
★ 严禁把 ? 写成阴性/无带，严禁用上一只鼠的取值补下一只，严禁根据常识推断。

═══ 五、我可能会单独给你批次级信息（没有就忽略） ═══
@本批默认 位点名=取值

═══ 六、笼位（我说到才用） ═══
- 整批同笼：单独一行 @笼位 B4
- 逐只转笼：在该行加一格 笼=B4
- 移出笼位：那一格写成 笼= （等号后面空着）
- 也可以：@清空笼位 耳号1 耳号2

═══ 七、谱系（我说到才用） ═══
- 给已有鼠补/改父母：在该行加两格 父=耳号 母=耳号（只说了一个就只写一个）
- 新生一窝：单独一行
  @新生 出生=YYYY-MM-DD 窝=L5 父=耳号 母=耳号 笼=B4 仔=耳号1 耳号2 耳号3
  仔鼠性别没听清就不写性别；听清了写成 耳号♂ / 耳号♀
- 只记配种、不要改父母：单独一行 @配种 父耳号 × 母耳号 笼位
  ★ 配种只记事件，不要顺手写 父= / 母=

═══ 八、@ 指令总表（只允许用这些） ═══
@日期 / @泳道顺序 / @本批默认 / @备注 / @笼位 / @清空笼位 / @配种 / @新生
不要发明新指令；用不上的就不要输出。

═══ 九、输出前自查（逐条核对再输出） ═══
1. 每位点每只鼠都有一格；没听到的写 =?，不要留空、不要替我填阴性。
2. 前缀只有三种：无、~、?；不要发明第四种写法。
3. 我**没说**笼位就整格不写 笼=；没说父母就整格不写 父= / 母=。
4. 父母写我念的耳号原文，不要换成位点名、不要补零。
5. 新生一窝用一条 @新生，不要拆成散行。
6. 不认识的位点名**原样保留**并加（?），不要替换成别的位点名。

═══ 十、其他纪律 ═══
1. 耳号原样保留我念的数字串（包括可能是听写错字的形式，如"1197"），不要擅自改号、不要补零。
2. 性别只写 M 或 F，没提到写 ?，不要默认。
3. 取值必须用英文代号（double/single/none/pos/neg 等），不要写中文。
4. 如果某个取值你听不清或你有疑问，在后面加（?）由我核对，不要猜。
5. 输出中不要出现表格线、不要出现 Markdown 标题、不要出现解释段落。

═══ 十一、我现在开始口述 ═══
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
