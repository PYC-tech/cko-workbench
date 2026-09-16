'use strict';
/**
 * electron-smoke.js — 用无头（show:false）BrowserWindow 真实加载 renderer/index.html，
 * 捕获控制台错误 / 加载失败 / 崩溃，并校验桥接层与核心模块是否就绪。
 * 运行：node tests/electron-smoke.js（通过 electron 启动）
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

// 无头/CI 环境无 GPU，禁用硬件加速避免 GPU process 崩溃
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// 注册与主进程完全相同的 IPC handlers，使桥接层在冒烟测试里真实可用
const ipc = require('../src/main/ipc');
const vault = require('../src/main/vault');
const fsx = require('fs');
// 预置一个真实 vault，避免 boot 走“自动就位”去写用户文档目录
const SMOKE_VAULT = path.join(app.getPath('temp'), 'cko-smoke-vault');
try {
  fsx.mkdirSync(path.join(SMOKE_VAULT, '.cko'), { recursive: true });
  fsx.writeFileSync(path.join(SMOKE_VAULT, '.cko', 'lock.json'), '{}');
  fsx.writeFileSync(path.join(SMOKE_VAULT, '工作台.json'), JSON.stringify({ schemaVersion: 3, projects: [], currentProjectId: null, settings: {} }));
} catch (e) {}
vault.setVault(SMOKE_VAULT);
ipc.register();

app.whenReady().then(async () => {
  const errors = [];
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload', 'index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false, webSecurity: true
    }
  });
  win.webContents.on('console-message', (e, level, message) => { if (level === 2 || level === 3) errors.push('CONSOLE[' + level + ']: ' + message); });
  win.webContents.on('did-fail-load', (e, code, desc) => errors.push('FAIL_LOAD: ' + desc + ' (' + code + ')'));
  win.webContents.on('crashed', () => errors.push('CRASHED'));
  win.webContents.on('page-error', (err) => errors.push('PAGE_ERROR: ' + err.message));

  const RENDERER = path.join(__dirname, '..', 'src', 'renderer', 'index.html');
  await win.loadFile(RENDERER);
  await new Promise(r => setTimeout(r, 2000));

  const state = await win.webContents.executeJavaScript('(function(){try{return {cko:!!window.CKO, genetics:!!(window.CKO&&window.CKO.genetics), model:!!(window.CKO&&window.CKO.model), migrate:!!(window.CKO&&window.CKO.migrate), templates:!!(window.CKO&&window.CKO.templates), parse:!!(window.CKO&&window.CKO.parse), store:!!(window.CKO&&window.CKO.Store), app:!!(window.CKO&&window.CKO.App), views:!!(window.CKO&&window.CKO.views), fs:!!(window.CKO&&window.CKO.FS), bridge:!!(window.CKO&&window.CKO.Store&&window.CKO.Store.bridge), nav:!!(window.CKO&&window.CKO.nav)};}catch(e){return {err:e.message}}})()');
  console.log('STATE:', JSON.stringify(state));
  console.log('ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none');

  // 试着跑一次 migrate 逻辑（不依赖磁盘）—— html 用 JSON.stringify 注入，避免 executeJavaScript 参数歧义
  try {
    const html = require('fs').readFileSync(path.join(__dirname, 'fixtures', 'ledger-sample.html'), 'utf8');
    const code = '(function(html){var d=window.CKO.migrate.extractLedgerData(html);var o=window.CKO.migrate.transform(d);return {rats:o.rats.length, sessions:o.sessions.length, loci:o.project.loci.length, targets:o.project.targets.length, firstRatTag:o.rats[0]&&o.rats[0].tag};})(' + JSON.stringify(html) + ')';
    const r = await win.webContents.executeJavaScript(code);
    console.log('MIGRATE_IN_BROWSER:', JSON.stringify(r));
  } catch (e) { console.log('MIGRATE_ERR:', e.message); }

  // 磁盘往返 + 删除 + vault 创建（验证 preload 别名无冲突）
  try {
    const rt = await win.webContents.executeJavaScript('(async function(){' +
      'var w = await window.CKO.Store.writeJson("test/rt.json", {hello:"world", n:42});' +
      'var r = await window.CKO.Store.readJson("test/rt.json");' +
      'var existed = await window.CKO.Store.exists("test/rt.json");' +
      'await window.CKO.Store.delete("test/rt.json", false);' +
      'var after = await window.CKO.Store.exists("test/rt.json");' +
      'var fnTypes = {vaultCreate: typeof window.CKO.Store.bridge.vaultCreate, backupCreate: typeof window.CKO.Store.bridge.backupCreate, fsDelete: typeof window.CKO.Store.bridge.fsDelete, imgDelete: typeof window.CKO.Store.bridge.imgDelete};' +
      'return {wroteBytes: w && w.bytes, read: r, existedBeforeDelete: existed, existedAfterDelete: after, fnTypes: fnTypes};' +
    '})()');
    console.log('DISK_RT:', JSON.stringify(rt));
  } catch (e) { console.log('DISK_RT_ERR:', e.message); }

  // 验证 createVault 真正创建 vault 骨架（.cko/lock.json），而非误走 backup:create
  try {
    const v2 = path.join(app.getPath('temp'), 'cko-smoke-vault-v2');
    const cvCode = '(async function(dir){ var p = await window.CKO.Store.createVault(dir); var lock = await window.CKO.Store.exists(".cko/lock.json"); return {path: p, lockExists: lock}; })(' + JSON.stringify(v2) + ')';
    const cv = await win.webContents.executeJavaScript(cvCode);
    console.log('CREATE_VAULT:', JSON.stringify(cv));
  } catch (e) { console.log('CREATE_VAULT_ERR:', e.message); }

  // 验证 defaultPath 通道，以及 validateVault 已改为异步（不应阻塞主进程）
  try {
    const dp = await win.webContents.executeJavaScript('(async function(){ return await CKO.defaultVaultPath(); })()');
    console.log('DEFAULT_PATH:', JSON.stringify(dp));
    const tv = await win.webContents.executeJavaScript('(async function(){ var t0=Date.now(); var v = await window.CKO.Store.validateVault("C:\\\\Windows"); return { isVault: v.isVault, nonEmpty: v.nonEmpty, ms: Date.now()-t0 }; })()');
    console.log('VALIDATE_ASYNC:', JSON.stringify(tv));
  } catch (e) { console.log('DEFAULT_VALIDATE_ERR:', e.message); }

  // 验证内置示例数据（上传版自带的那份）能载入，且谱系/笼位/表格三视图都有内容
  try {
    const ds = await win.webContents.executeJavaScript('(async function(){' +
      'var A=window.CKO.App, M=window.CKO.model, seed=window.CKO.seedDemo; if(!seed) return {err:"no seedDemo"};' +
      'var p=await A.importSeedProject(seed);' +
      'var out={seedRats:seed.rats.length, seedSessions:seed.sessions.length,' +
      'cages:[...new Set(seed.rats.map(function(r){return r.cage}).filter(Boolean))].length,' +
      'founders:seed.rats.filter(function(r){return r.sire==null}).length,' +
      'hits:seed.rats.filter(function(r){return M.targetHits(r,p.targets,p.loci).length>0}).length,' +
      'activeLoci:p.loci.filter(function(l){return !l.archived}).map(function(l){return l.name})};' +
      'var root=document.getElementById("content");' +
      'try{CKO.views.cages(root); out.cageItems=root.querySelectorAll(".cage-item").length;}catch(e){out.cagesErr=String(e.message||e)}' +
      'try{CKO.views.pedigree(root); out.pedNodes=root.querySelectorAll(".ped-node").length;' +
      'out.rootTag=(root.querySelector(".ped-node.is-root .pn-tag")||{}).textContent;' +
      'out.pedTags=[...root.querySelectorAll(".ped-node .pn-tag")].map(function(e){return e.textContent}).join(",");' +
      'out.cageFrames=root.querySelectorAll(".cage-frame").length;' +
      'out.genLabels=[...root.querySelectorAll(".gen-label")].map(function(e){return e.textContent}).join(",");' +
      '}catch(e){out.pedErr=String(e.message||e)}' +
      'try{CKO.views.rats(root); out.ratRows=root.querySelectorAll("table.grid tbody tr").length;}catch(e){out.ratsErr=String(e.message||e)}' +
      'return out;' +
    '})()');
    console.log('DEMO_SEED:', JSON.stringify(ds));
  } catch (e) { console.log('DEMO_SEED_ERR:', e.message); }

  // 验证「改本项目指标名 → 口述提示词卡片同步跟着变」，以及有数据的位点删不掉
  try {
    const rc = await win.webContents.executeJavaScript('(async function(){' +
      'var A=window.CKO.App, p=A.state.project; if(!p) return {err:"no project"};' +
      'var before=A.buildPromptCard(p);' +
      'var loci=p.loci.filter(function(l){return !l.archived}).map(function(l){return Object.assign({},l)});' +
      'var oldName=loci[0].name;' +
      'loci[0].name="ABC 基因-Flox"; loci[0].aliases=["abcflox"];' +
      'await A.updateProjectLoci(loci);' +
      'var after=A.buildPromptCard(A.state.project);' +
      'var out={oldName:oldName, beforeHasOld:before.indexOf(oldName)>=0,' +
      'afterHasNew:after.indexOf("ABC 基因-Flox")>=0, afterHasNewAlias:after.indexOf("abcflox")>=0,' +
      'afterLostOld:after.indexOf(oldName)<0,' +
      'headerInRats:false};' +
      'var root=document.getElementById("content");' +
      'CKO.views.rats(root);' +
      'out.headerInRats=root.textContent.indexOf("ABC 基因-Flox")>=0;' +
      'try{ await A.updateProjectLoci([]); out.deleteBlocked=false; }catch(e){ out.deleteBlocked=true; out.guardMsg=e.message; }' +
      'return out;' +
    '})()');
    console.log('RENAME_LOCI:', JSON.stringify(rc));
  } catch (e) { console.log('RENAME_LOCI_ERR:', e.message); }

  // 用样例台账迁移结果建项目，验证谱系/笼位/表格视图渲染不报错
  try {
    const fixtureHtml = require('fs').readFileSync(path.join(__dirname, 'fixtures', 'ledger-sample.html'), 'utf8');
    await win.webContents.executeJavaScript('window.__FIXTURE_HTML__ = ' + JSON.stringify(fixtureHtml) + ';');
    const vr = await win.webContents.executeJavaScript('(async function(){' +
      'var S=window.CKO.Store, A=window.CKO.App, T=window.CKO.templates, M=window.CKO.model;' +
      'var dg=window.CKO.migrate.transform(window.CKO.migrate.extractLedgerData(window.__FIXTURE_HTML__));' +
      'var p=Object.assign({},dg.project,{id:M.uid()});' +
      'await S.saveProject(p); await S.saveRats(p.id,dg.rats); for(const s of dg.sessions) await S.saveSession(p.id,s);' +
      'A.state.project=p; A.state.archive=T.seedArchive(); A.state.rats=dg.rats; A.state.sessions=dg.sessions;' +
      'var out={seedRats:dg.rats.length, activeLoci:p.loci.filter(function(l){return !l.archived}).map(function(l){return l.name})};' +
      'var root=document.getElementById("content");' +
      'try{CKO.views.pedigree(root); out.pedNodes=root.querySelectorAll(".ped-node").length;}catch(e){out.pedErr=String(e.message||e)}' +
      'try{CKO.views.cages(root); out.cageItems=root.querySelectorAll(".cage-item").length;}catch(e){out.cagesErr=String(e.message||e)}' +
      'try{CKO.views.rats(root); out.ratRows=root.querySelectorAll("table.grid tbody tr").length; out.chips=root.querySelectorAll(".chip").length;}catch(e){out.ratsErr=String(e.message||e)}' +
      'return out;' +
    '})()');
    console.log('VIEWS:', JSON.stringify(vr));
  } catch (e) { console.log('VIEWS_ERR:', e.message); }

  // 验证胶图保存（一个批次多张）真实落盘 + 校验 + 取 URL
  try {
    const gr = await win.webContents.executeJavaScript('(async function(){' +
      'var S=window.CKO.Store, A=window.CKO.App;' +
      'if(!A.state.project) A.state.project={id:"imgtest"};' +
      'var png=[137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130];' +
      'var refs=[];' +
      'for(var i=0;i<2;i++){ var r=await S.saveImage(new Uint8Array(png),{projectId:"imgtest",subdir:"gels/test",baseName:"gel"+i,ext:"png"}); var d=r&&r.data?r.data:r; refs.push(d&&d.ref); }' +
      'var v=await S.verifyImages(refs);' +
      'return { refs:refs, verified:v.filter(function(x){return x.ok}).length, url:S.imageUrl(refs[0]) };' +
    '})()');
    console.log('GEL_SAVE:', JSON.stringify(gr));
  } catch (e) { console.log('GEL_SAVE_ERR:', e.message); }

  // 验证「一键自动就位」bootstrap 能建好骨架（首次启动零交互就靠它）
  try {
    const btDir = path.join(app.getPath('temp'), 'cko-smoke-bootstrap');
    const bt = await win.webContents.executeJavaScript('(async function(dir){ var r = await window.CKO.Store.bootstrap(dir); var lock = await window.CKO.Store.exists(".cko/lock.json"); return { path: r.path, lockExists: lock }; })(' + JSON.stringify(btDir) + ')');
    console.log('BOOTSTRAP:', JSON.stringify(bt));
  } catch (e) { console.log('BOOTSTRAP_ERR:', e.message); }

  app.quit();
});
