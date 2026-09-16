'use strict';
const { app, BrowserWindow, protocol, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { register } = require('./ipc');
const vault = require('./vault');

const RENDERER = path.join(__dirname, '..', 'renderer', 'index.html');
let mainWin = null;

// 单实例锁：第二个实例只聚焦已有窗口
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1366, height: 850, minWidth: 1024, minHeight: 680,
    title: 'cKO 工作台',
    backgroundColor: '#0b0f13',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });
  mainWin.loadFile(RENDERER);
  mainWin.on('closed', () => { mainWin = null; });
}

// 自定义协议 cko://media/<relPath> —— 让 <img src="cko://media/..."> 直接从 vault 读图
function registerProtocol() {
  protocol.handle('cko', (req) => {
    try {
      const url = new URL(req.url);
      if (url.host !== 'media') return new Response('Not found', { status: 404 });
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const abs = vault.resolve(rel);
      const ext = path.extname(abs).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      const buf = fs.readFileSync(abs);
      return new Response(buf, { headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' } });
    } catch (e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  });
}

function buildMenu() {
  const tpl = [
    { label: '文件', submenu: [{ role: 'reload' }, { role: 'quit' }] },
    {
      label: '编辑', submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    { label: '视图', submenu: [{ role: 'togglefullscreen' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }] },
    { role: 'help', submenu: [{ label: '关于 cKO 工作台', click: () => shell.openExternal('https://github.com/') }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

app.whenReady().then(async () => {
  registerProtocol();
  register();
  buildMenu();
  createWindow();
  app.on('second-instance', () => { if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); } });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
