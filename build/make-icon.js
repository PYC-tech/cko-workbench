'use strict';
/**
 * make-icon.js — 生成品牌色 .ico（256x256，32 位 BGRA 带 alpha）。
 * 纯 Node 实现，不依赖任何第三方库。运行：node build/make-icon.js
 */
const fs = require('fs');
const path = require('path');

const OUTER = [0x0C, 0x44, 0x7C]; // 雾霾蓝（主轴）
const INNER = [0x85, 0xB7, 0xEB]; // 浅蓝（中心分子）

function makeBMP(size) {
  const w = size, h = size;
  const pixels = Buffer.alloc(w * h * 4);
  const margin = Math.floor(size * 0.20);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inInner = x >= margin && x < w - margin && y >= margin && y < h - margin;
      const c = inInner ? INNER : OUTER;
      // 圆角近似：四角用外层同色留白即可，此处保持方形（缩放后视觉可接受）
      pixels[i] = c[2];     // B
      pixels[i + 1] = c[1]; // G
      pixels[i + 2] = c[0]; // R
      pixels[i + 3] = 255;  // A
    }
  }
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0);       // header size
  bih.writeInt32LE(w, 4);         // width
  bih.writeInt32LE(h * 2, 8);     // height*2 for ICO (XOR+AND)
  bih.writeUInt16LE(1, 12);       // planes
  bih.writeUInt16LE(32, 14);      // bit count
  bih.writeUInt32LE(0, 16);       // BI_RGB
  bih.writeUInt32LE(w * h * 4, 20); // image size
  const andMask = Buffer.alloc(Math.ceil(w / 32) * 4 * h, 0);
  return Buffer.concat([bih, pixels, andMask]);
}

function makeICO(size) {
  const bmp = makeBMP(size);
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);      // reserved
  dir.writeUInt16LE(1, 2);      // type = icon
  dir.writeUInt16LE(1, 4);      // count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2);       // colors
  entry.writeUInt8(0, 3);       // reserved
  entry.writeUInt16LE(1, 4);    // planes
  entry.writeUInt16LE(32, 6);   // bit count
  entry.writeUInt32LE(bmp.length, 8); // bytes in res
  entry.writeUInt32LE(22, 12);  // image offset
  return Buffer.concat([dir, entry, bmp]);
}

const ico = makeICO(256);
const out = path.join(__dirname, 'icon.ico');
fs.writeFileSync(out, ico);
console.log('wrote', out, ico.length, 'bytes');
