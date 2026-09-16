'use strict';
/**
 * vault.js — 数据目录（vault）后端。
 * 所有对磁盘的读写都汇聚到这里；渲染层永远只通过 IPC 走相对路径，
 * 拿不到任意文件系统权限（路径白名单见 ipc.js 的 assertRelPath）。
 *
 * 目录布局：
 *   <vault>/
 *   ├─ 工作台.json                       # schemaVersion / 项目索引 / 当前项目 / 全局设置
 *   ├─ archive/loci-archive.json         # ★ 全局位点档案（带版本历史）
 *   ├─ projects/<id>/
 *   │  ├─ project.json                   # loci / targets / meta / species / strain
 *   │  ├─ rats.json                      # 全部鼠只（含 events[]）
 *   │  ├─ sessions/<seq>-<date>.json     # 一批次一文件
 *   │  ├─ logs/<year>-<month>.json       # 工作台日志按月分片
 *   │  ├─ photos/{gels,rats,logs}/...
 *   │  └─ exports/
 *   ├─ backups/<ts>/                     # 写入前自动快照
 *   │  ├─ manifest.json
 *   │  └─ projects/...
 *   └─ .cko/{lock.json, journal.ndjson}
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const CKO_DIR = '.cko';
const BACKUP_KEEP = 30;

let VAULT = null; // 当前已打开的 vault 绝对路径

function setVault(p) { VAULT = p; }
function getVault() { return VAULT; }
function hasVault() { return !!VAULT; }

function assertVault() {
  if (!VAULT) { const e = new Error('未选择数据目录'); e.code = 'E_NO_VAULT'; throw e; }
}

/** 把相对路径解析为 vault 内的绝对路径，并防御路径逃逸。 */
function resolve(rel) {
  assertVault();
  const clean = String(rel).replace(/\\/g, '/').replace(/^\/+/, '');
  if (clean.includes('..') || /^[a-zA-Z]:/.test(clean) || clean.startsWith('/')) {
    const e = new Error('非法路径'); e.code = 'E_BAD_ARG'; throw e;
  }
  const abs = path.resolve(VAULT, clean);
  const root = path.resolve(VAULT);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    const e = new Error('路径越界'); e.code = 'E_PERMISSION'; throw e;
  }
  return abs;
}

async function exists(rel) {
  try { await fsp.access(resolve(rel)); return true; } catch { return false; }
}

async function mkdirp(rel) {
  const abs = resolve(rel);
  await fsp.mkdir(abs, { recursive: true });
  return abs;
}

/** 读取 JSON；不存在返回 null；损坏抛出 E_BADJSON。 */
async function readJson(rel) {
  const abs = resolve(rel);
  let raw;
  try { raw = await fsp.readFile(abs, 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  try { return JSON.parse(raw); }
  catch (e) { const err = new Error('JSON 解析失败：' + rel); err.code = 'E_BADJSON'; err.detail = String(e.message); throw err; }
}

/** 原子写：写 .tmp → fsync → rename。写入前可选自动备份。 */
async function writeJson(rel, obj, opts = {}) {
  const backup = opts.backup !== false;
  const abs = resolve(rel);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  const tmp = abs + '.tmp';
  const data = JSON.stringify(obj, null, 2);
  if (backup) {
    try { await snapshot([rel]); } catch (e) { /* 备份失败不阻断主写入，但记入 journal */ }
  }
  await fsp.writeFile(tmp, data, 'utf8');
  // fsync via file handle
  const fh = await fsp.open(tmp, 'r+');
  try { await fh.sync(); } finally { await fh.close(); }
  // Windows 上 rename 覆盖偶发 EPERM/EBUSY，退避重试
  let lastErr;
  for (const wait of [0, 50, 150, 400]) {
    try { await fsp.rename(tmp, abs); lastErr = null; break; }
    catch (e) { lastErr = e; if (wait) await new Promise(r => setTimeout(r, wait)); }
  }
  if (lastErr) {
    const err = new Error('写入失败（重命名被占用）：' + rel); err.code = 'E_UNKNOWN'; err.detail = lastErr.message; throw err;
  }
  // 记 journal
  try {
    const sha = crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
    const bytes = Buffer.byteLength(data);
    await appendJournal({ op: 'write', rel, sha256: sha, bytes });
  } catch {}
  return { bytes: Buffer.byteLength(data), mtime: (await fsp.stat(abs)).mtimeMs };
}

/** 写前快照：把将被覆盖的文件复制进 backups/<ts>/。 */
async function snapshot(rels) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const bdir = path.join(VAULT, 'backups', ts);
  const manifest = { at: new Date().toISOString(), label: 'auto', files: [] };
  let n = 0;
  for (const rel of rels) {
    const src = resolve(rel);
    try { await fsp.access(src); } catch { continue; }
    const dst = path.join(bdir, rel);
    await fsp.mkdir(path.dirname(dst), { recursive: true });
    await fsp.copyFile(src, dst);
    const st = await fsp.stat(dst);
    manifest.files.push({ relPath: rel, bytes: st.size });
    n++;
  }
  if (n > 0) {
    await fsp.mkdir(bdir, { recursive: true });
    await fsp.writeFile(path.join(bdir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  }
  await pruneBackups(BACKUP_KEEP);
  return { id: ts, path: bdir, files: n };
}

async function pruneBackups(keep) {
  const broot = path.join(VAULT, 'backups');
  try { await fsp.access(broot); } catch { return; }
  const dirs = (await fsp.readdir(broot)).map(d => path.join(broot, d))
    .filter(async p => (await fsp.stat(p)).isDirectory());
  dirs.sort((a, b) => b.localeCompare(a));
  for (const d of dirs.slice(keep)) {
    try { await fsp.rm(d, { recursive: true, force: true }); } catch {}
  }
}

async function listJson(relDir) {
  const abs = resolve(relDir);
  try { await fsp.access(abs); } catch { return []; }
  const out = [];
  for (const f of await fsp.readdir(abs)) {
    if (f.endsWith('.json')) out.push(f.replace(/\.json$/, ''));
  }
  return out;
}

async function deleteFile(rel, opts = {}) {
  const abs = resolve(rel);
  try {
    if (opts.toTrash) {
      const trash = path.join(VAULT, '.cko', 'trash', path.basename(abs) + '.' + Date.now().toString(36));
      await fsp.mkdir(path.dirname(trash), { recursive: true });
      await fsp.rename(abs, trash);
    } else {
      await fsp.rm(abs, { force: true });
    }
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

/** journal.ndjson：每次写入追加一行，用于幂等校验与审计。 */
async function appendJournal(entry) {
  const dir = path.join(VAULT, CKO_DIR);
  await fsp.mkdir(dir, { recursive: true });
  const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, entry)) + '\n';
  await fsp.appendFile(path.join(dir, 'journal.ndjson'), line, 'utf8');
}

/** 图片落盘。meta.subdir 形如 'gels/2026-09-11'。返回 PhotoRef。 */
async function saveImage(bytes, meta) {
  assertVault();
  const dir = path.join(VAULT, 'projects', meta.projectId || '_', 'photos', meta.subdir || 'misc');
  await fsp.mkdir(dir, { recursive: true });
  const sha = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 6);
  const epoch = Date.now();
  const base = (meta.baseName || 'img').replace(/[^\w\u4e00-\u9fa5-]/g, '_');
  const ext = meta.ext || (isPng(bytes) ? 'png' : 'jpg');
  const name = `${epoch}_${base}_${sha}.${ext}`;
  const abs = path.join(dir, name);
  await fsp.writeFile(abs, bytes);
  const rel = `projects/${meta.projectId || '_'}/photos/${meta.subdir || 'misc'}/${name}`;
  return { ref: rel, sha256: sha, bytes: bytes.length, addedAt: new Date().toISOString() };
}

function isPng(buf) {
  return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

/** 读取图片字节。 */
async function readImage(ref) {
  const abs = resolve(ref);
  return await fsp.readFile(abs);
}

/** 删除图片（可选进回收站）。 */
async function deleteImage(ref, opts = {}) {
  await deleteFile(ref, opts);
}

async function verifyImages(refs) {
  const out = [];
  for (const ref of refs) {
    try {
      const abs = resolve(ref);
      const buf = await fsp.readFile(abs);
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      out.push({ ref, ok: true, bytes: buf.length, sha256: sha });
    } catch (e) {
      out.push({ ref, ok: false, bytes: 0, sha256: '', decodable: false, error: e.message });
    }
  }
  return out;
}

/** 校验/创建 vault 骨架。 */
async function ensureSkeleton() {
  assertVault();
  await fsp.mkdir(path.join(VAULT, CKO_DIR), { recursive: true });
  await fsp.mkdir(path.join(VAULT, 'archive'), { recursive: true });
  await fsp.mkdir(path.join(VAULT, 'backups'), { recursive: true });
  await fsp.mkdir(path.join(VAULT, 'projects'), { recursive: true });
  await fsp.mkdir(path.join(VAULT, '_inbox'), { recursive: true });   // 智能体投递区
  // 单实例锁
  const lockPath = path.join(VAULT, CKO_DIR, 'lock.json');
  const lock = { pid: process.pid, at: new Date().toISOString() };
  try { await fsp.writeFile(lockPath, JSON.stringify(lock), 'utf8'); }
  catch {}
}

/** 判定一个目录是不是现成的 vault。 */
async function isVault(dir) {
  try { return await fsp.stat(path.join(dir, CKO_DIR)); }
  catch { return false; }
}

/** 列出所有项目索引。 */
async function listProjects() {
  const idx = await readJson('工作台.json');
  return (idx && idx.projects) || [];
}

module.exports = {
  setVault, getVault, hasVault, resolve, exists, mkdirp,
  readJson, writeJson, listJson, deleteFile, appendJournal,
  saveImage, readImage, deleteImage, verifyImages,
  ensureSkeleton, isVault, listProjects, snapshot, pruneBackups
};
