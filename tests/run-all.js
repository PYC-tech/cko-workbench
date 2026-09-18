'use strict';
/**
 * run-all.js — `npm test` 入口。
 * 1) 纯逻辑回归（Node 直接跑，不依赖 Electron）：tests/smoke.js
 * 1b) 文档回归：docs/口述录入示例.md 里每段演示口述都能解析（tests/verify-demo-dictation.js）
 * 1c) 口述 v2 容忍写法与安全边界（tests/verify-dictation-v2.js）
 * 2) Electron 端到端冒烟（需依赖真实 Electron 运行时，且必须 unset ELECTRON_RUN_AS_NODE）：tests/electron-smoke.js
 *    若环境无法启动 Electron（如缺少显示/GPU），第二项会被跳过并给出提示，不视为失败。
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(label, cmd, args, env) {
  console.log('\n=== ' + label + ' ===');
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: env || process.env, cwd: path.join(__dirname, '..') });
  return res.status === 0;
}

let okAll = true;

// 1) 纯逻辑回归
okAll = run('Node 纯逻辑回归 (tests/smoke.js)', process.execPath, [path.join(__dirname, 'smoke.js')]) && okAll;

// 1b) 文档里的演示口述必须一直能解析（发出去就是给用户照抄的）
okAll = run('演示口述文档回归 (tests/verify-demo-dictation.js)', process.execPath, [path.join(__dirname, 'verify-demo-dictation.js')]) && okAll;

// 1c) 口述 v2：容忍写法 + 安全边界
okAll = run('口述 v2 容忍写法与边界 (tests/verify-dictation-v2.js)', process.execPath, [path.join(__dirname, 'verify-dictation-v2.js')]) && okAll;

// 2) Electron 冒烟：必须去掉 ELECTRON_RUN_AS_NODE（否则 electron 二进制退化为普通 node）
const electronBin = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
if (fs.existsSync(electronBin)) {
  const env = Object.assign({}, process.env);
  delete env.ELECTRON_RUN_AS_NODE; // 关键：完全 unset，而非置空
  okAll = run('Electron 端到端冒烟 (tests/electron-smoke.js)', electronBin,
    ['--headless', '--disable-gpu', '--in-process-gpu', path.join(__dirname, 'electron-smoke.js')], env) && okAll;
} else {
  console.log('\n[skip] 未找到 electron 二进制，跳过 Electron 冒烟测试');
}

console.log('\n' + (okAll ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'));
process.exit(okAll ? 0 : 1);
