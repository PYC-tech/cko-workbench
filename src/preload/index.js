'use strict';
/**
 * preload — 通过 contextBridge 把主进程能力安全暴露给渲染层。
 * 渲染层只调用 window.__CKO_BRIDGE__.*，绝不直接碰 fs / electron。
 */
const { contextBridge, ipcRenderer } = require('electron');

const CHANNELS = [
  'cko:vault:get', 'cko:vault:choose', 'cko:vault:validate', 'cko:vault:create', 'cko:vault:set', 'cko:vault:defaultPath', 'cko:vault:bootstrap',
  'cko:fs:readJson', 'cko:fs:writeJson', 'cko:fs:listJson', 'cko:fs:delete', 'cko:fs:exists', 'cko:fs:readText', 'cko:fs:exportText',
  'cko:inbox:list', 'cko:inbox:done', 'cko:inbox:open',
  'cko:img:save', 'cko:img:read', 'cko:img:delete', 'cko:img:verify',
  'cko:backup:create', 'cko:backup:list', 'cko:backup:restore', 'cko:backup:prune',
  'cko:dialog:openFile', 'cko:dialog:saveFile', 'cko:shell:openPath',
  'cko:clipboard:writeText', 'cko:app:info'
];

// 注意：`split(':').pop()` 会产生命名冲突（vault:create 与 backup:create 都叫 create；
// fs:delete 与 img:delete 都叫 delete）。这里用显式别名表消除歧义，桥接层方法名必须与
// renderer/core/store.js 中 call('xxx') / B.xxx 的命名严格对应。
const ALIAS = {
  'cko:vault:get': 'get',
  'cko:vault:choose': 'choose',
  'cko:vault:validate': 'validate',
  'cko:vault:create': 'vaultCreate',
  'cko:vault:set': 'set',
  'cko:vault:defaultPath': 'defaultPath',
  'cko:vault:bootstrap': 'bootstrap',
  'cko:fs:readJson': 'readJson',
  'cko:fs:writeJson': 'writeJson',
  'cko:fs:listJson': 'listJson',
  'cko:fs:delete': 'fsDelete',
  'cko:fs:exists': 'exists',
  'cko:fs:readText': 'readText',
  'cko:fs:exportText': 'exportText',
  'cko:inbox:list': 'inboxList',
  'cko:inbox:done': 'inboxDone',
  'cko:inbox:open': 'inboxOpen',
  'cko:img:save': 'save',
  'cko:img:read': 'read',
  'cko:img:delete': 'imgDelete',
  'cko:img:verify': 'verify',
  'cko:backup:create': 'backupCreate',
  'cko:backup:list': 'list',
  'cko:backup:restore': 'restore',
  'cko:backup:prune': 'prune',
  'cko:dialog:openFile': 'openFile',
  'cko:dialog:saveFile': 'saveFile',
  'cko:shell:openPath': 'openPath',
  'cko:clipboard:writeText': 'writeText',
  'cko:app:info': 'info'
};

const api = {};
for (const ch of CHANNELS) {
  const name = ALIAS[ch] || ch.split(':').pop();
  api[name] = (arg) => ipcRenderer.invoke(ch, arg);
}

contextBridge.exposeInMainWorld('__CKO_BRIDGE__', {
  capabilities: { kind: 'fs', realFiles: true, atomicWrite: true, maxImageBytes: null },
  ...api,
  // 便捷：把图片 bytes 转成 cko:// URL
  async imageUrl(ref) { return `cko://media/${encodeURIComponent(ref)}`; }
});
