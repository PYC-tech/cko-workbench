'use strict';
/**
 * ui.js — 渲染层通用工具：DOM 构造、转义（防 XSS）、toast、modal、确认框、图片灯箱。
 * 渲染用户输入（耳号、备注、日志、口述）一律走 textContent 或 escapeHtml，禁止直接 innerHTML 拼接。
 */
(function (CKO) {
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null) return;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  // toast
  let toastBox = null;
  function toast(msg, type) {
    if (!toastBox) { toastBox = el('div', { class: 'toast-box' }); document.body.appendChild(toastBox); }
    const t = el('div', { class: 'toast toast-' + (type || 'info'), text: msg });
    toastBox.appendChild(t);
    setTimeout(() => { t.classList.add('show'); }, 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  // modal：返回 {close, body}
  function modal(opts) {
    const overlay = el('div', { class: 'modal-overlay' });
    const box = el('div', { class: 'modal-box ' + (opts.size || '') });
    const head = el('div', { class: 'modal-head' }, [el('span', { text: opts.title || '' })]);
    const closeBtn = el('button', { class: 'modal-x', text: '×', onclick: () => close() });
    head.appendChild(closeBtn);
    const body = el('div', { class: 'modal-body' });
    const foot = el('div', { class: 'modal-foot' });
    box.appendChild(head); box.appendChild(body); if (opts.foot !== false) box.appendChild(foot);
    overlay.appendChild(box); document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay && opts.dismissable !== false) close(); });
    function close() { overlay.remove(); if (opts.onClose) opts.onClose(); }
    function addActions(actions) {
      clear(foot);
      (actions || []).forEach(a => foot.appendChild(el('button', { class: 'btn ' + (a.cls || ''), text: a.label, onclick: () => a.onClick && a.onClick(close) })));
    }
    if (opts.actions) addActions(opts.actions);
    setTimeout(() => overlay.classList.add('show'), 10);
    return { close, body, foot, addActions, overlay };
  }

  function confirmDialog(opts) {
    return new Promise(resolve => {
      const m = modal({
        title: opts.title || '确认', size: opts.size,
        actions: [
          { label: opts.cancelText || '取消', cls: 'btn-ghost', onClick: (c) => { c(); resolve(false); } },
          { label: opts.okText || '确定', cls: 'btn-primary', onClick: (c) => { c(); resolve(true); } }
        ]
      });
      if (opts.render) opts.render(m.body, m); else m.body.appendChild(el('p', { text: opts.message || '' }));
    });
  }

  // 图片灯箱
  function lightbox(url, caption) {
    const m = modal({
      title: caption || '图片', size: 'lg', dismissable: true,
      actions: [{ label: '关闭', cls: 'btn-ghost', onClick: (c) => c() }]
    });
    m.body.appendChild(el('img', { src: url, class: 'lightbox-img' }));
  }

  CKO.ui = { escapeHtml, el, clear, toast, modal, confirmDialog, lightbox };
})(window.CKO = window.CKO || {});
