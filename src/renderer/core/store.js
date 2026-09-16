'use strict';
/**
 * store.js — 业务层唯一的数据出入口。
 * 有 window.__CKO_BRIDGE__（Electron）→ 走磁盘；否则降级到 localStorage（调试用，会显示横幅）。
 * 约定：bridge 返回 { ok:true, data } 或 { ok:false, code, message }。
 */
(function (CKO) {
  const B = window.__CKO_BRIDGE__ || null;
  const FS = !!(B && B.capabilities && B.capabilities.realFiles);

  // ── localStorage 降级：整库塞一个 key，仅供浏览器调试，不保证原子性 ──
  const LS_KEY = 'cko:debug-vault';
  let mem = null;
  function lsLoad() { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { mem = {}; } return mem; }
  function lsSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(mem)); } catch {} }

  async function call(ch, arg) {
    if (FS) { const r = await B[ch](arg); if (r && r.ok === false) { const e = new Error(r.message || '操作失败'); e.code = r.code; e.detail = r.detail; throw e; } return r.data; }
    throw new Error('当前为浏览器调试模式，未连接本机存储。请通过桌面程序运行。');
  }

  // 浏览器降级版（仅调试）
  async function lsCall(kind, arg) {
    const v = lsLoad();
    const pid = (arg && arg.projectId) || (CKO._curProj && CKO._curProj.id) || '_';
    switch (kind) {
      case 'readJson': {
        const node = v;
        let cur = node; const parts = arg.rel.split('/'); for (const p of parts) cur = cur && cur[p];
        return cur || null;
      }
      case 'writeJson': {
        const parts = arg.rel.split('/'); let cur = v; for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] = cur[parts[i]] || {}; cur = cur[parts[i]]; }
        cur[parts[parts.length - 1]] = arg.obj; lsSave(); return { bytes: JSON.stringify(arg.obj).length };
      }
      case 'listJson': {
        const parts = arg.relDir.split('/'); let cur = v; for (const p of parts) cur = cur && cur[p];
        if (!cur) return []; return Object.keys(cur).filter(k => !k.endsWith('.json')).map(k => k.replace(/\.json$/, ''));
      }
      case 'exists': { const parts = arg.rel.split('/'); let cur = v; for (const p of parts) cur = cur && cur[p]; return !!cur; }
      default: return null;
    }
  }

  const Store = {
    isRealFs: FS,
    bridge: B,
    // ── vault ──
    async getVault() { return FS ? (await call('get')).path : null; },
    async chooseVault() { return FS ? (await call('choose')).path : null; },
    async validateVault(dir) { return FS ? await call('validate', { dir }) : { isVault: false, nonEmpty: false }; },
    async createVault(dir) { return FS ? (await call('vaultCreate', { dir })).path : null; },
    async setVault(dir) { return FS ? (await call('set', { dir })).path : null; },
    async bootstrap(dir) { return FS ? await call('bootstrap', dir ? { dir } : {}) : null; },

    // ── 通用 JSON ──
    async readJson(rel, opts) {
      if (FS) return await call('readJson', Object.assign({ rel }, opts));
      return await lsCall('readJson', { rel });
    },
    async writeJson(rel, obj, opts) {
      if (FS) return await call('writeJson', Object.assign({ rel, obj }, opts));
      return await lsCall('writeJson', { rel, obj });
    },
    async listJson(relDir) {
      if (FS) return await call('listJson', { relDir });
      return await lsCall('listJson', { relDir });
    },
    async exists(rel) {
      if (FS) return await call('exists', { rel });
      return await lsCall('exists', { rel });
    },
    async delete(rel, toTrash) {
      if (FS) return await call('fsDelete', { rel, toTrash });
    },

    // ── 导出（写到用户选定路径，vault 之外）──
    async exportText(filePath, text) { return FS ? await call('exportText', { filePath, text }) : null; },

    // ── 收件箱（智能体投递区）──
    async inboxList() { return FS ? (await call('inboxList', {})).files : []; },
    async inboxDone(name) { return FS ? await call('inboxDone', { name }) : null; },
    async inboxOpen() { return FS ? await call('inboxOpen', {}) : null; },

    // ── 图片 ──
    async saveImage(bytes, meta) {
      if (FS) {
        // bytes 可能是 Uint8Array → 转 {data:[...]} 给主进程
        const arr = (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) ? Array.from(new Uint8Array(bytes)) : bytes;
        return await B.save({ bytes: { data: arr }, meta });
      }
      return null;
    },
    async readImage(ref) {
      if (FS) { const r = await B.read({ ref }); return new Uint8Array(r.data); }
      return new Uint8Array(0);
    },
    async deleteImage(ref, toTrash) { if (FS) return await B.imgDelete({ ref, toTrash }); },
    async verifyImages(refs) { if (FS) return await call('verify', { refs }); return []; },
    imageUrl(ref) { return FS ? `cko://media/${encodeURIComponent(ref)}` : ''; },

    // ── 备份 ──
    async createBackup(label, rels) { if (FS) return await call('backupCreate', { label, rels }); return null; },
    async listBackups() { if (FS) return await call('list'); return []; },
    async restoreBackup(id, dryRun, rels) { if (FS) return await call('restore', { id, dryRun, rels }); return { plan: [] }; },
    async pruneBackups(keep) { if (FS) return await call('prune', { keep }); },

    // ── 工作台索引 / 位点档案 ──
    async loadIndex() { return (await this.readJson('工作台.json')) || null; },
    async saveIndex(idx) { return await this.writeJson('工作台.json', idx); },
    async loadArchive() { return (await this.readJson('archive/loci-archive.json')) || null; },
    async saveArchive(arc) { return await this.writeJson('archive/loci-archive.json', arc, { backup: true }); },

    // ── 项目级 ──
    projDir(id) { return `projects/${id}`; },
    async loadProject(id) { return await this.readJson(`projects/${id}/project.json`); },
    async saveProject(proj) { proj.updatedAt = new Date().toISOString(); return await this.writeJson(`projects/${id2(proj)}/project.json`, proj, { backup: true }); },
    async loadRats(id) { return (await this.readJson(`projects/${id}/rats.json`)) || []; },
    async saveRats(id, rats) { return await this.writeJson(`projects/${id}/rats.json`, rats, { backup: true }); },
    async listSessions(id) { return await this.listJson(`projects/${id}/sessions`); },
    async loadSession(id, name) { return await this.readJson(`projects/${id}/sessions/${name}.json`); },
    async saveSession(id, s) {
      const name = `${String(s.seq).padStart(3, '0')}-${s.date}`;
      return await this.writeJson(`projects/${id}/sessions/${name}.json`, s, { backup: true });
    },
    async deleteSession(id, name) { return await this.delete(`projects/${id}/sessions/${name}.json`, true); },
    async loadLogs(id, ym) { return (await this.readJson(`projects/${id}/logs/${ym}.json`)) || []; },
    async saveLogs(id, ym, logs) { return await this.writeJson(`projects/${id}/logs/${ym}.json`, logs, { backup: true }); },

    // ── 杂项 ──
    async openFile(filters) { if (FS) return (await call('openFile', { filters })).path; return null; },
    async saveFileDialog(defaultPath, filters) { if (FS) return (await call('saveFile', { defaultPath, filters })).path; return null; },
    async openPath(p) { if (FS) return await call('openPath', { p }); },
    async writeClipboard(text) { if (FS && B.writeText) return await B.writeText({ text }); },
    async appInfo() { if (FS) return await call('info'); return { version: 'debug', platform: 'browser' }; }
  };
  function id2(proj) { return proj.id; }

  CKO.Store = Store;
  CKO.FS = FS;
})(window.CKO = window.CKO || {});
