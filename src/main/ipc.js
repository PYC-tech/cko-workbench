'use strict';
/**
 * ipc.js — 所有渲染层与主进程的通信都走这里。
 * 约定：handler 返回 { ok:true, data } 或 { ok:false, code, message, detail }。
 * 渲染层只通过相对路径访问文件（路径白名单在 vault.resolve 内强制）。
 */
const { ipcMain, dialog, clipboard, shell, app } = require('electron');
const fs = require('fs');
const path = require('path');
const vault = require('./vault');

function ok(data) { return { ok: true, data }; }
function fail(code, message, detail) { return { ok: false, code, message, detail }; }
function wrap(fn) {
  return async (event, arg) => {
    try { return ok(await fn(arg || {}, event)); }
    catch (e) {
      const code = e.code || 'E_UNKNOWN';
      return fail(code, e.message || String(e), e.detail);
    }
  };
}

/**
 * 超时保护：慢介质（网络盘/可移动盘，如 E: 外置盘）上的 fs 操作可能挂起很久，
 * 用 Promise.race 兜住，超时返回 fallback，避免冻结主进程事件循环导致界面完全无响应。
 */
function withTimeout(p, ms, fallback) {
  return Promise.race([
    Promise.resolve(p),
    new Promise(res => setTimeout(() => res(fallback), ms))
  ]);
}

function register() {
  // ── vault ──
  ipcMain.handle('cko:vault:get', wrap(async () => ({ path: vault.getVault() })));

  ipcMain.handle('cko:vault:choose', wrap(async () => {
    const res = await dialog.showOpenDialog({ title: '选择数据目录（cKO 工作台）', properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths.length) return { path: null };
    return { path: res.filePaths[0] };
  }));

  ipcMain.handle('cko:vault:validate', wrap(async ({ dir }) => {
    if (!dir) return { isVault: false };
    // 关键修复：原先 fs.readdirSync 是同步阻塞，E: 等慢介质会冻结主进程事件循环，
    // 导致整个窗口“点不动/进不去”。改为异步 + 超时。
    const isV = !!(await withTimeout(vault.isVault(dir), 3000, false));
    let nonEmpty = false;
    try { const files = await withTimeout(fs.promises.readdir(dir), 3000, null); nonEmpty = !!(files && files.length > 0); } catch {}
    return { isVault: isV, nonEmpty, path: dir };
  }));

  ipcMain.handle('cko:vault:create', wrap(async ({ dir }) => {
    if (!dir) throw Object.assign(new Error('未提供目录'), { code: 'E_BAD_ARG' });
    vault.setVault(dir);
    await vault.ensureSkeleton();
    return { path: dir };
  }));

  ipcMain.handle('cko:vault:set', wrap(async ({ dir }) => {
    vault.setVault(dir);
    return { path: dir };
  }));
  ipcMain.handle('cko:vault:defaultPath', wrap(async () => {
    // 打包后：默认数据目录 = 安装目录的父级下的「cKO数据」（即 E:\KORAT\cKO数据 这类），
    // 让装完即用、数据独立于程序目录，又不必再手选文件夹。
    // 开发模式（npm start）下回退到 文档\cKO工作台，避免测试数据污染项目目录。
    if (app.isPackaged) {
      const exeDir = path.dirname(process.execPath);
      return { path: path.join(path.dirname(exeDir), 'cKO数据') };
    }
    return { path: path.join(app.getPath('documents'), 'cKO工作台') };
  }));

  // 一键自动就位：按候选顺序尝试建好数据目录骨架，成功即返回实际路径。
  // 首次启动直接调用它，用户无需任何选择/确认。
  ipcMain.handle('cko:vault:bootstrap', wrap(async ({ dir } = {}) => {
    const cands = [];
    if (dir) cands.push(dir);            // 显式指定（测试/高级用法）
    else {
      if (app.isPackaged) {
        const exeDir = path.dirname(process.execPath);
        cands.push(path.join(path.dirname(exeDir), 'cKO数据'));
      }
      cands.push(path.join(app.getPath('documents'), 'cKO工作台'));
    }
    let lastErr;
    for (const dir of cands) {
      try {
        vault.setVault(dir);
        await Promise.race([
          vault.ensureSkeleton(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('目录访问超时')), 6000))
        ]);
        return { path: dir };
      } catch (e) { lastErr = e; }
    }
    throw Object.assign(new Error('无法初始化数据目录：' + (lastErr && lastErr.message ? lastErr.message : '未知错误')), { code: 'E_BOOTSTRAP' });
  }));

  // ── fs ──
  ipcMain.handle('cko:fs:readJson', wrap(async ({ rel }) => await vault.readJson(rel)));
  ipcMain.handle('cko:fs:writeJson', wrap(async ({ rel, obj, opts }) => {
    const r = await vault.writeJson(rel, obj, opts);
    return { bytes: r.bytes };
  }));
  ipcMain.handle('cko:fs:listJson', wrap(async ({ relDir }) => await vault.listJson(relDir)));
  ipcMain.handle('cko:fs:delete', wrap(async ({ rel, toTrash }) => { await vault.deleteFile(rel, { toTrash }); return { ok: true }; }));
  ipcMain.handle('cko:fs:exists', wrap(async ({ rel }) => await vault.exists(rel)));
  ipcMain.handle('cko:fs:readText', wrap(async ({ filePath }) => {
    if (!filePath) throw Object.assign(new Error('未提供路径'), { code: 'E_BAD_ARG' });
    return { text: fs.readFileSync(filePath, 'utf8') };
  }));
  // 导出：把文本写到用户通过「保存」对话框选定的路径（vault 之外，仅用于导出/另存）
  ipcMain.handle('cko:fs:exportText', wrap(async ({ filePath, text }) => {
    if (!filePath) throw Object.assign(new Error('未提供保存路径'), { code: 'E_BAD_ARG' });
    const s = text == null ? '' : String(text);
    await fs.promises.writeFile(filePath, s, 'utf8');
    return { path: filePath, bytes: Buffer.byteLength(s, 'utf8') };
  }));

  // ── 收件箱：智能体把 .txt / .md / .json 丢进 <数据目录>/_inbox/，程序读入后由用户确认入账 ──
  function inboxDir() {
    const v = vault.getVault();
    if (!v) throw Object.assign(new Error('尚未选择数据目录'), { code: 'E_NO_VAULT' });
    return path.join(v, '_inbox');
  }
  ipcMain.handle('cko:inbox:list', wrap(async () => {
    const v = vault.getVault();
    if (!v) return { files: [] };
    const dir = path.join(v, '_inbox');
    let names = [];
    try { names = await fs.promises.readdir(dir); } catch { return { files: [] }; }
    const files = [];
    for (const n of names) {
      const full = path.join(dir, n);
      let st; try { st = await fs.promises.stat(full); } catch { continue; }
      if (!st.isFile() || !/\.(txt|md|json)$/i.test(n)) continue;
      let text = ''; try { text = await fs.promises.readFile(full, 'utf8'); } catch { continue; }
      files.push({ name: n, text, bytes: st.size, mtime: st.mtimeMs });
    }
    files.sort((a, b) => a.mtime - b.mtime);
    return { files };
  }));
  ipcMain.handle('cko:inbox:done', wrap(async ({ name }) => {
    if (!name) throw Object.assign(new Error('未提供文件名'), { code: 'E_BAD_ARG' });
    const dir = inboxDir();
    const doneDir = path.join(dir, '_done');
    await fs.promises.mkdir(doneDir, { recursive: true });
    await fs.promises.rename(path.join(dir, name), path.join(doneDir, Date.now() + '__' + name));
    return { ok: true };
  }));
  ipcMain.handle('cko:inbox:open', wrap(async () => {
    const dir = inboxDir();
    await fs.promises.mkdir(dir, { recursive: true });
    await shell.openPath(dir);
    return { ok: true, path: dir };
  }));

  // ── images ──
  ipcMain.handle('cko:img:save', wrap(async ({ bytes, meta }) => {
    // 传输过来的可能是 {type:'Buffer',data:[...]}
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.data || bytes);
    return await vault.saveImage(buf, meta);
  }));
  ipcMain.handle('cko:img:read', wrap(async ({ ref }) => {
    const buf = await vault.readImage(ref);
    return { data: Array.from(buf), ext: ref.endsWith('.png') ? 'png' : 'jpg' };
  }));
  ipcMain.handle('cko:img:delete', wrap(async ({ ref, toTrash }) => { await vault.deleteImage(ref, { toTrash }); return { ok: true }; }));
  ipcMain.handle('cko:img:verify', wrap(async ({ refs }) => await vault.verifyImages(refs)));

  // ── backup ──
  ipcMain.handle('cko:backup:create', wrap(async ({ label, rels }) => {
    const r = await vault.snapshot(rels || ['工作台.json', 'archive/loci-archive.json']);
    return r;
  }));
  ipcMain.handle('cko:backup:list', wrap(async () => {
    const root = path.join(vault.getVault(), 'backups');
    try { await fs.promises.access(root); } catch { return []; }
    const out = [];
    const dirs = fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory());
    for (const d of dirs.sort().reverse()) {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(root, d, 'manifest.json'), 'utf8'));
        out.push({ id: d, at: m.at, label: m.label, files: (m.files || []).length });
      } catch { out.push({ id: d, at: '', label: 'auto', files: 0 }); }
    }
    return out;
  }));
  ipcMain.handle('cko:backup:restore', wrap(async ({ id, dryRun, rels }) => {
    const bdir = path.join(vault.getVault(), 'backups', id);
    const files = (JSON.parse(fs.readFileSync(path.join(bdir, 'manifest.json'), 'utf8')).files || []).map(f => f.relPath);
    const targets = rels || files;
    const plan = [];
    for (const rel of targets) {
      const src = path.join(bdir, rel);
      let exists2 = true;
      try { await fs.promises.access(src); } catch { exists2 = false; }
      if (!exists2) continue;
      plan.push({ file: rel, from: src, action: (await vault.exists(rel)) ? 'overwrite' : 'create' });
    }
    if (!dryRun) {
      for (const p of plan) {
        const dst = vault.resolve(p.file);
        await fs.promises.mkdir(path.dirname(dst), { recursive: true });
        await fs.promises.copyFile(p.from, dst);
      }
    }
    return { plan };
  }));
  ipcMain.handle('cko:backup:prune', wrap(async ({ keep }) => {
    const r = await vault.pruneBackups(keep || 30);
    return r || { removed: [] };
  }));

  // ── misc ──
  ipcMain.handle('cko:dialog:openFile', wrap(async ({ filters } = {}) => {
    const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: filters || [] });
    if (res.canceled || !res.filePaths.length) return { path: null };
    return { path: res.filePaths[0] };
  }));
  ipcMain.handle('cko:dialog:saveFile', wrap(async ({ defaultPath, filters } = {}) => {
    const res = await dialog.showSaveDialog({ defaultPath, filters: filters || [] });
    if (res.canceled || !res.filePath) return { path: null };
    return { path: res.filePath };
  }));
  ipcMain.handle('cko:shell:openPath', wrap(async ({ p }) => { await shell.openPath(p); return { ok: true }; }));
  ipcMain.handle('cko:clipboard:writeText', wrap(async ({ text }) => { clipboard.writeText(text || ''); return { ok: true }; }));
  ipcMain.handle('cko:app:info', wrap(async () => ({ version: app.getVersion(), platform: process.platform })));
}

module.exports = { register };
